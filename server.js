// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 UPGRADED: Fetches the Facebook HTML and scrapes the hidden numeric ID
const resolveAndExtractId = async (inputUrl) => {
    try {
        // Fetch the raw HTML of the Facebook page
        const response = await fetch(inputUrl, {
            headers: {
                // Mimic a real browser so Facebook doesn't block the request
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        const html = await response.text();

        // Scrape the true numeric ID from Facebook's internal script/meta tags
        const idMatch = html.match(/"top_level_post_id":"([0-9]+)"/) ||
                        html.match(/"story_fbid":"([0-9]+)"/) ||
                        html.match(/fb:\/\/post\/([0-9]+)/) ||
                        html.match(/fb:\/\/photo\/([0-9]+)/) ||
                        html.match(/fb:\/\/video\/([0-9]+)/) ||
                        html.match(/"post_id":"([0-9]+)"/);

        if (idMatch && idMatch[1]) {
            return idMatch[1]; // Found the pure numeric ID!
        }

        // Fallback: If it's already a clean numeric ID in the URL
        const urlMatch = inputUrl.match(/(?:posts\/|videos\/|reel\/|fbid=|story_fbid=)([0-9]+)/);
        if (urlMatch) return urlMatch[1];

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
        // 1. Fetch Page ID dynamically if we don't have it yet
        if (!CACHED_PAGE_ID) {
            const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${FB_ACCESS_TOKEN}`);
            const meData = await meRes.json();
            if (meData.id) CACHED_PAGE_ID = meData.id;
        }

        // 2. Fetch all requested posts simultaneously
        const fetchPromises = links.map(async (url) => {
            let numericId = await resolveAndExtractId(url);
            
            if (!numericId) return { url, error: "Could not scrape the numeric Post ID from the link.", metrics: null };

            // 🟢 CRITICAL: Format as PAGEID_POSTID (Strict API Requirement)
            const graphApiId = CACHED_PAGE_ID ? `${CACHED_PAGE_ID}_${numericId}` : numericId;

            // Securely query the Graph API Insights
            const fbUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,insights.metric(post_impressions_unique,post_engagements,post_clicks_unique)&access_token=${FB_ACCESS_TOKEN}`;
            
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