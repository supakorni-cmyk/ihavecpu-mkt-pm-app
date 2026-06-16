// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 1. The Mobile "Mask-Stripping" Scraper
const resolveAndExtractId = async (inputUrl) => {
    try {
        // Pretend to be an iPhone. Facebook's mobile site (m.facebook) is much simpler
        // and exposes the true numeric ID in the HTML, bypassing the pfbid mask!
        const response = await fetch(inputUrl, {
            redirect: 'follow',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        const html = await response.text();
        const decodedFinalUrl = decodeURIComponent(response.url);

        // 1. If the URL redirected to a clean numeric ID, grab it!
        let match = decodedFinalUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(\d{10,})/i);
        if (match && match[1]) return match[1];

        // 2. THE PFBID STRIPPER: Aggressively scrape the mobile HTML for the true numeric ID.
        // This regex hunts for the raw numeric data embedded in the page's meta tags.
        match = html.match(/(?:top_level_post_id|share_fbid|post_id|video_id|story_fbid|page_post_id|fbid[=:])"?[=:]?(\d{10,})"?/i) ||
                html.match(/fb:\/\/(?:post|photo|video|page)\/(?:[^\/]+\/)?(\d{10,})/i) ||
                html.match(/content="fb:\/\/[^\/]+\/(\d{10,})"/i) ||
                html.match(/id="pagelet_og_article_(\d{10,})"/i) ||
                html.match(/[&\?]fbid=(\d{10,})/i) ||
                html.match(/[&\?]story_fbid=(\d{10,})/i);
                
        if (match && match[1]) return match[1];

        // 3. Absolute fallback (if the post is fully locked/private)
        match = decodedFinalUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+)/i);
        if (match && match[1]) return match[1];

        return null;
    } catch (error) {
        console.error("URL Resolution Error:", error);
        return null;
    }
};

app.post('/api/facebook-custom-links', async (req, res) => {
    const { links } = req.body;
    
    if (!links || !Array.isArray(links)) {
        return res.status(400).json({ error: "Please provide an array of links." });
    }

    try {
        if (!CACHED_PAGE_ID) {
            const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${FB_ACCESS_TOKEN}`);
            const meData = await meRes.json();
            if (meData.id) CACHED_PAGE_ID = meData.id;
        }

        const fetchPromises = links.map(async (url) => {
            let extractedId = await resolveAndExtractId(url);
            
            if (!extractedId) return { url, error: "Could not unmask Post ID.", metrics: null };

            let graphApiId = extractedId;
            if (CACHED_PAGE_ID && !extractedId.startsWith(`${CACHED_PAGE_ID}_`)) {
                graphApiId = `${CACHED_PAGE_ID}_${extractedId}`; 
            }

            // 🟢 STEP 1: Fetch Basic Interactions
            // We now explicitly ask for 'post_id' in case Facebook provides a translated ID
            let basicDataUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=id,post_id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
            let basicRes = await fetch(basicDataUrl);
            let basicData = await basicRes.json();

            if (basicData.error) {
                basicDataUrl = `https://graph.facebook.com/v19.0/${extractedId}?fields=id,post_id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
                basicRes = await fetch(basicDataUrl);
                basicData = await basicRes.json();
            }

            if (basicData.error) return { url, error: basicData.error.message, metrics: null };

            // Compile a list of verified numeric IDs to hunt for insights
            const idsToTry = [...new Set([
                basicData.post_id, 
                basicData.id,      
                graphApiId,        
                extractedId        
            ].filter(Boolean))];

            const totalReactions = basicData.reactions?.summary?.total_count || 0;
            const totalComments = basicData.comments?.summary?.total_count || 0;
            const totalShares = basicData.shares?.count || 0;
            const fallbackEngagement = totalReactions + totalComments + totalShares;

            // 🟢 STEP 2: Fetch Insights Waterfall
            let reach = 0, impressions = 0, clicks = 0;

            // Feed the true numeric IDs into the Insights endpoint
            for (const id of idsToTry) {
                if (impressions > 0) break; 

                const impressionEndpoints = [
                    `https://graph.facebook.com/v19.0/${id}/insights?metric=post_impressions_unique,post_impressions&access_token=${FB_ACCESS_TOKEN}`,
                    `https://graph.facebook.com/v19.0/${id}/insights?metric=post_video_views&access_token=${FB_ACCESS_TOKEN}`
                ];

                for (const endpoint of impressionEndpoints) {
                    const res = await fetch(endpoint);
                    const data = await res.json();
                    
                    if (!data.error && data.data && data.data.length > 0) {
                        const getM = (m) => data.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                        const imp = getM('post_impressions') || getM('post_video_views') || 0;
                        
                        if (imp > 0) {
                            impressions = imp;
                            reach = getM('post_impressions_unique') || impressions; 
                            break; 
                        }
                    }
                }
            }

            for (const id of idsToTry) {
                if (clicks > 0) break; 

                const clickEndpoints = [
                    `https://graph.facebook.com/v19.0/${id}/insights?metric=post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`
                ];

                for (const endpoint of clickEndpoints) {
                    const res = await fetch(endpoint);
                    const data = await res.json();
                    
                    if (!data.error && data.data && data.data.length > 0) {
                        const c = data.data.find(x => x.name === 'post_clicks_unique')?.values?.[0]?.value || 
                                  data.data.find(x => x.name === 'post_clicks')?.values?.[0]?.value || 0;
                        if (c > 0) {
                            clicks = c;
                            break;
                        }
                    }
                }
            }

            return {
                id: basicData.post_id || basicData.id, 
                message: basicData.message || 'Video / Photo Post',
                postedAt: basicData.created_time,
                permalink: url,
                metrics: {
                    reach,
                    impressions,
                    engagement: fallbackEngagement + clicks,
                    clicks,
                    reactions: totalReactions,
                    comments: totalComments,
                    shares: totalShares
                }
            };
        });

        const results = await Promise.all(fetchPromises);
        res.json(results);

    } catch (error) {
        console.error("Graph API Error:", error);
        res.status(500).json({ error: "Failed to fetch Facebook data" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Facebook Analytics Bridge running on port ${PORT}`));