// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 UPGRADED: Uses a CLI User-Agent to bypass JS walls and explicitly extracts 'pfbid' strings.
const resolveAndExtractId = async (inputUrl) => {
    try {
        // 1. Trick Facebook into serving basic HTML by pretending to be a basic 'curl' client
        const response = await fetch(inputUrl, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'curl/7.68.0',
                'Accept': '*/*'
            }
        });
        
        const html = await response.text();
        let realUrl = response.url; // If Facebook did a 302 Redirect, we get the new URL here

        // 2. If Facebook did a meta refresh instead of a 302, extract it from the HTML
        if (realUrl.includes('/share/')) {
            const metaRefresh = html.match(/content="0;\s*url=([^"]+)"/i);
            if (metaRefresh && metaRefresh[1]) {
                realUrl = metaRefresh[1].replace(/&amp;/g, '&');
            } else {
                const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i);
                if (canonical && canonical[1]) realUrl = canonical[1];
            }
        }

        // 3. Extract the ID. 
        // CRITICAL: We now explicitly match Facebook's modern alphanumeric 'pfbid' format OR the legacy numeric format.
        const urlMatch = realUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=)(pfbid[a-zA-Z0-9]+|\d+)/i);
        
        if (urlMatch && urlMatch[1]) {
            return urlMatch[1];
        }

        // 4. Ultimate Fallback: Check deep inside the JSON data of the page
        const jsonMatch = html.match(/(?:top_level_post_id|story_fbid|post_id|video_id)":"(pfbid[a-zA-Z0-9]+|\d+)"/i);
        if (jsonMatch && jsonMatch[1]) return jsonMatch[1];

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
            
            if (!extractedId) return { url, error: "Facebook blocked the request or the link is private.", metrics: null };

            // 🟢 CRITICAL: We only prepend the Page ID if the post uses the old pure-number format. 
            // The new 'pfbid' strings must be passed to the API exactly as they are.
            let graphApiId = extractedId;
            if (/^\d+$/.test(extractedId) && CACHED_PAGE_ID) {
                graphApiId = `${CACHED_PAGE_ID}_${extractedId}`;
            }

            // Securely query the Graph API
            const fbUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,insights.metric(post_impressions_unique,post_engagements,post_clicks_unique)&access_token=${FB_ACCESS_TOKEN}`;
            
            const response = await fetch(fbUrl);
            const fbData = await response.json();

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