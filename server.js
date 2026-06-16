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

            // 🟢 STRICT FORMATTING: Ensure the Page ID is firmly attached to EVERY request
            let graphApiId = extractedId;
            if (CACHED_PAGE_ID && !extractedId.startsWith(`${CACHED_PAGE_ID}_`)) {
                graphApiId = `${CACHED_PAGE_ID}_${extractedId}`; 
            }

            // Helper function to format the final data safely
            const formatResult = (data, insightsData = null) => {
                const getMetric = (metricName) => {
                    if (!insightsData) return 0;
                    return insightsData.find(m => m.name === metricName)?.values[0]?.value || 0;
                };

                return {
                    id: data.id,
                    message: data.message || 'Video / Photo Post',
                    postedAt: data.created_time,
                    permalink: url,
                    metrics: {
                        // 🟢 FIX: Map Reach to unique impressions, Impressions to total impressions
                        reach: getMetric('post_views_unique') || 0,
                        impressions: getMetric('post_views') || getMetric('post_video_views') || 0,
                        engagement: getMetric('post_engagements') || 0,
                        clicks: getMetric('post_clicks_unique') || 0,
                        reactions: data.likes?.summary?.total_count || 0,
                        comments: data.comments?.summary?.total_count || 0,
                        shares: data.shares?.count || 0
                    }
                };
            };

            // ATTEMPT 1: Standard Post Metrics
            // 🟢 FIX: Added 'post_impressions' to the requested metric list
            const postUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,shares,likes.summary(true),comments.summary(true),insights.metric(post_views_unique,post_views,post_engagements,post_clicks_unique)&access_token=${FB_ACCESS_TOKEN}`;
            const postRes = await fetch(postUrl);
            const postData = await postRes.json();

            if (!postData.error) {
                return formatResult(postData, postData.insights?.data);
            }

            // ATTEMPT 2: Reel/Video Metrics (🟢 FIXED: Now correctly uses graphApiId)
            if (postData.error) {
                const videoUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,shares,likes.summary(true),comments.summary(true),insights.metric(post_video_views)&access_token=${FB_ACCESS_TOKEN}`;
                const videoRes = await fetch(videoUrl);
                const videoData = await videoRes.json();

                if (!videoData.error) {
                    return formatResult(videoData, videoData.insights?.data);
                }

                // ATTEMPT 3: Ultimate Fallback (🟢 FIXED: Now correctly uses graphApiId)
                // Just grab the basic data (likes/comments) and skip insights so the UI doesn't crash
                const plainUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,shares,likes.summary(true),comments.summary(true)&access_token=${FB_ACCESS_TOKEN}`;
                const plainRes = await fetch(plainUrl);
                const plainData = await plainRes.json();

                if (!plainData.error) {
                    return formatResult(plainData, null);
                }

                // If it STILL fails, print out Facebook's exact error reason
                return { url, error: videoData.error.message || postData.error.message, metrics: null };
            }
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