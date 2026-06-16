// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 1. The Ultimate URL-Decoding Scraper
const resolveAndExtractId = async (inputUrl) => {
    try {
        // Attempt 1: The Fast Redirect Header Grabber
        const manualRes = await fetch(inputUrl, {
            redirect: 'manual', 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        if (manualRes.status >= 300 && manualRes.status < 400) {
            const locationHeader = manualRes.headers.get('location');
            if (locationHeader) {
                // 🟢 CRITICAL: Decode the URL so '%2Fposts%2F' converts back to '/posts/'
                const decodedLocation = decodeURIComponent(locationHeader);
                const match = decodedLocation.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
                if (match && match[1]) return match[1];
            }
        }

        // Attempt 2: The Command-Line Follower (Bypasses JS walls)
        const curlRes = await fetch(inputUrl, {
            redirect: 'follow',
            headers: { 'User-Agent': 'curl/7.68.0' }
        });
        
        // Decode the final destination URL
        const decodedFinalUrl = decodeURIComponent(curlRes.url);
        let match = decodedFinalUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
        if (match && match[1]) return match[1];

        // Attempt 3: Scrape the decoded HTML string as a last resort
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
            
            if (!extractedId) return { url, error: "Could not unmask the true Post ID. Check if link is public.", metrics: null };

            let graphApiId = extractedId;
            if (CACHED_PAGE_ID && !extractedId.startsWith(`${CACHED_PAGE_ID}_`)) {
                graphApiId = `${CACHED_PAGE_ID}_${extractedId}`; 
            }

            // 🟢 STEP 1: Fetch Basic Data (Interactions) independently so it never fails
            let basicDataUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
            let basicRes = await fetch(basicDataUrl);
            let basicData = await basicRes.json();

            // If the PAGEID_POSTID format fails, try the pure extracted ID (Required for some Reels)
            if (basicData.error) {
                basicDataUrl = `https://graph.facebook.com/v19.0/${extractedId}?fields=message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
                basicRes = await fetch(basicDataUrl);
                basicData = await basicRes.json();
            }

            if (basicData.error) return { url, error: basicData.error.message, metrics: null };

            const totalReactions = basicData.reactions?.summary?.total_count || 0;
            const totalComments = basicData.comments?.summary?.total_count || 0;
            const totalShares = basicData.shares?.count || 0;
            const fallbackEngagement = totalReactions + totalComments + totalShares;

            // 🟢 STEP 2: Fetch Insights Decoupled
            let reach = 0, impressions = 0, engagement = fallbackEngagement, clicks = 0;

            // ATTEMPT A: Ask for Standard Post Insights
            const postInsightsUrl = `https://graph.facebook.com/v19.0/${graphApiId}/insights?metric=post_impressions_unique,post_impressions,post_engagements,post_clicks_unique&access_token=${FB_ACCESS_TOKEN}`;
            const postInsightsRes = await fetch(postInsightsUrl);
            const postInsightsData = await postInsightsRes.json();

            if (!postInsightsData.error && postInsightsData.data) {
                const getM = (m) => postInsightsData.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                reach = getM('post_impressions_unique');
                impressions = getM('post_impressions');
                engagement = getM('post_engagements') || fallbackEngagement;
                clicks = getM('post_clicks_unique');
            } else {
                // ATTEMPT B: If it's a Reel/Video, pivot and ask specifically for Video Insights
                const videoInsightsUrl = `https://graph.facebook.com/v19.0/${extractedId}/insights?metric=post_video_views&access_token=${FB_ACCESS_TOKEN}`;
                const videoInsightsRes = await fetch(videoInsightsUrl);
                const videoInsightsData = await videoInsightsRes.json();

                if (!videoInsightsData.error && videoInsightsData.data) {
                    const getM = (m) => videoInsightsData.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                    impressions = getM('post_video_views');
                    // Note: Facebook API rarely provides unique reach for third-party videos, so we mirror impressions to prevent zeros
                    reach = impressions; 
                }
            }

            return {
                id: basicData.id,
                message: basicData.message || 'Video / Photo Post',
                postedAt: basicData.created_time,
                permalink: url,
                metrics: {
                    reach,
                    impressions,
                    engagement,
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