// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

// We will cache your Page ID here so we don't have to fetch it every single time
let CACHED_PAGE_ID = null;

// 🟢 UPGRADED: Resolves shortened links with a User-Agent, and parses Reels/Videos
const resolveAndExtractId = async (inputUrl) => {
    try {
        let urlToParse = inputUrl;

        // If it's a shortened share link, follow the redirect like a real browser
        if (inputUrl.includes('/share/')) {
            const response = await fetch(inputUrl, { 
                redirect: 'follow',
                headers: {
                    // Facebook blocks bots. This header tricks Facebook into giving us the real URL.
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            urlToParse = response.url; 
        }

        // Expanded Regex to catch posts, Reels (/reel/), Watch (/watch/?v=), and photos (/p/)
        const match = urlToParse.match(/(?:posts\/|videos\/|reel\/|watch\/\?v=|fbid=|story_fbid=|\/p\/)([a-zA-Z0-9_\-]+)/);
        return match ? match[1] : null;
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
        // 1. Fetch Page ID dynamically if we don't have it yet
        if (!CACHED_PAGE_ID) {
            const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${FB_ACCESS_TOKEN}`);
            const meData = await meRes.json();
            if (meData.id) CACHED_PAGE_ID = meData.id;
        }

        // 2. Fetch all requested posts simultaneously
        const fetchPromises = links.map(async (url) => {
            let postId = await resolveAndExtractId(url);
            
            if (!postId) return { url, error: "Could not extract ID (Regex failed or link is private).", metrics: null };

            // 🟢 CRITICAL FIX: If the ID is purely numbers, Facebook requires PAGEID_POSTID
            if (/^\d+$/.test(postId) && CACHED_PAGE_ID) {
                postId = `${CACHED_PAGE_ID}_${postId}`;
            }

            // Securely query the Graph API
            const fbUrl = `https://graph.facebook.com/v19.0/${postId}?fields=message,created_time,insights.metric(post_impressions_unique,post_engagements,post_clicks_unique)&access_token=${FB_ACCESS_TOKEN}`;
            
            const response = await fetch(fbUrl);
            const fbData = await response.json();

            if (fbData.error) return { url, error: fbData.error.message, metrics: null };

            const insights = fbData.insights?.data || [];
            
            const getMetric = (metricName) => {
                const metric = insights.find(m => m.name === metricName);
                return metric?.values[0]?.value || 0;
            };

            return {
                id: fbData.id,
                message: fbData.message || 'No text content',
                postedAt: fbData.created_time,
                permalink: url,
                metrics: {
                    reach: getMetric('post_impressions_unique'),
                    impressions: getMetric('post_impressions_unique'),
                    engagement: getMetric('post_engagements'),
                    clicks: getMetric('post_clicks_unique'),
                    reactions: 0, 
                    comments: 0,  
                    shares: 0     
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