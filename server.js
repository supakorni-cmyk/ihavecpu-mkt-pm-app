// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 UPGRADED: Aggressively hunts for server-rendered Deep Link Meta Tags
const resolveAndExtractId = async (inputUrl) => {
    try {
        const response = await fetch(inputUrl, {
            redirect: 'follow',
            headers: {
                // Mimic a standard desktop browser
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        
        const html = await response.text();
        const finalUrl = response.url;

        // 1. First, check if following the redirect exposed a clean numeric ID in the URL
        const urlMatch = finalUrl.match(/(?:posts\/|videos\/|reel\/|fbid=|story_fbid=)(\d+)/);
        if (urlMatch && urlMatch[1]) return urlMatch[1];

        // 2. The "Deep Link" Scraper (Highly reliable for shared links)
        // Looks for tags like: <meta property="al:android:url" content="fb://post/123456789" />
        const metaMatch = 
            html.match(/content="fb:\/\/(?:post|video|photo|page)\/(?:\?id=\d+&amp;post_id=)?(\d+)"/i) ||
            html.match(/<meta property="al:android:url" content="fb:\/\/[^\/]+\/(\d+)"/i) ||
            html.match(/<meta property="al:ios:url" content="fb:\/\/[^\/]+\/(\d+)"/i);
            
        if (metaMatch && metaMatch[1]) return metaMatch[1];

        // 3. The "Internal JSON" Scraper (Aggressive fallback)
        const jsonMatch = 
            html.match(/"top_level_post_id":"(\d+)"/i) ||
            html.match(/"story_fbid":"(\d+)"/i) ||
            html.match(/"post_id":"(\d+)"/i) ||
            html.match(/"video_id":"(\d+)"/i) ||
            html.match(/"entity_id":"(\d+)"/i);

        if (jsonMatch && jsonMatch[1]) return jsonMatch[1];

        return null; // Facebook completely obfuscated the ID
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
            let numericId = await resolveAndExtractId(url);
            
            if (!numericId) return { url, error: "Could not scrape the numeric Post ID. Facebook may be blocking the request.", metrics: null };

            // STRICT API REQUIREMENT: Format as PAGEID_POSTID
            const graphApiId = CACHED_PAGE_ID ? `${CACHED_PAGE_ID}_${numericId}` : numericId;

            // Securely query the Graph API
            const fbUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,insights.metric(post_impressions_unique,post_engagements,post_clicks_unique)&access_token=${FB_ACCESS_TOKEN}`;
            
            const response = await fetch(fbUrl);
            const fbData = await response.json();

            // Handle API rejections (e.g., if the ID belongs to a video, not a post)
            if (fbData.error) return { url, error: fbData.error.message, metrics: null };

            const insights = fbData.insights?.data || [];
            const getMetric = (metricName) => insights.find(m => m.name === metricName)?.values[0]?.value || 0;

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
                    reactions: 0, comments: 0, shares: 0     
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