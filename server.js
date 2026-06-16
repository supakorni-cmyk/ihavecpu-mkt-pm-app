// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 1. The URL-Decoding Scraper
const resolveAndExtractId = async (inputUrl) => {
    try {
        const manualRes = await fetch(inputUrl, {
            redirect: 'manual', 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        if (manualRes.status >= 300 && manualRes.status < 400) {
            const locationHeader = manualRes.headers.get('location');
            if (locationHeader) {
                const decodedLocation = decodeURIComponent(locationHeader);
                const match = decodedLocation.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
                if (match && match[1]) return match[1];
            }
        }

        const curlRes = await fetch(inputUrl, {
            redirect: 'follow',
            headers: { 'User-Agent': 'curl/7.68.0' }
        });
        
        const decodedFinalUrl = decodeURIComponent(curlRes.url);
        let match = decodedFinalUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
        if (match && match[1]) return match[1];

        const html = await curlRes.text();
        const decodedHtml = decodeURIComponent(html);
        match = decodedHtml.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i) ||
                html.match(/(?:top_level_post_id|story_fbid|post_id|video_id)":"?(pfbid[a-zA-Z0-9]+|\d{10,})"?/i);
                
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

            // 🟢 STEP 1: Fetch Basic Interactions (ADDED 'post_id' to fields)
            let basicDataUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=id,post_id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
            let basicRes = await fetch(basicDataUrl);
            let basicData = await basicRes.json();

            if (basicData.error) {
                basicDataUrl = `https://graph.facebook.com/v19.0/${extractedId}?fields=id,post_id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
                basicRes = await fetch(basicDataUrl);
                basicData = await basicRes.json();
            }

            if (basicData.error) return { url, error: basicData.error.message, metrics: null };

            // 🟢 THE MAGIC KEY: Create a prioritized list of IDs to check.
            // basicData.post_id is the holy grail for Photo links!
            const idsToTry = [...new Set([
                basicData.post_id, 
                basicData.id,      
                graphApiId,        
                extractedId        
            ].filter(Boolean))]; // Removes any null/undefined IDs

            const totalReactions = basicData.reactions?.summary?.total_count || 0;
            const totalComments = basicData.comments?.summary?.total_count || 0;
            const totalShares = basicData.shares?.count || 0;
            const fallbackEngagement = totalReactions + totalComments + totalShares;

            // 🟢 STEP 2: Fetch Insights using the ID Waterfall
            let reach = 0, impressions = 0, clicks = 0;

            // --- ATTEMPT A: Fetch Impressions/Views ---
            for (const id of idsToTry) {
                if (impressions > 0) break; // Stop looping if we found our impressions!

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

            // --- ATTEMPT B: Fetch Clicks ISOLATED ---
            for (const id of idsToTry) {
                if (clicks > 0) break; // Stop looping if we found our clicks!

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
                // Send back the most accurate ID available
                id: basicData.post_id || basicData.id || canonicalId, 
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