// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 1. The Invincible Mobile Scraper
const resolveAndExtractId = async (inputUrl) => {
    try {
        // Pretend to be an iPhone to force Facebook to serve clean, indexable HTML
        const response = await fetch(inputUrl, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        const html = await response.text();
        let realUrl = response.url;

        // Extract the canonical URL Facebook hides in the header
        const ogUrlMatch = html.match(/<meta property="og:url" content="([^"]+)"/i);
        if (ogUrlMatch && ogUrlMatch[1]) {
            realUrl = ogUrlMatch[1].replace(/&amp;/g, '&');
        }

        // STRICT MATCH: Only accept 'pfbid...' or numbers that are at least 10 digits long
        const urlMatch = realUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
        if (urlMatch && urlMatch[1]) return urlMatch[1];

        // Backup: Scrape the raw JSON variables inside the page
        const jsonMatch = html.match(/(?:top_level_post_id|story_fbid|post_id|video_id)":"?(pfbid[a-zA-Z0-9]+|\d{10,})"?/i);
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
            
            if (!extractedId) return { url, error: "Could not unmask the true Post ID. Check if link is public.", metrics: null };

            let graphApiId = extractedId;
            if (/^\d+$/.test(extractedId) && CACHED_PAGE_ID) {
                graphApiId = `${CACHED_PAGE_ID}_${extractedId}`; // Required PAGEID_POSTID format for numeric IDs
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
                        reach: getMetric('post_impressions_unique') || getMetric('post_video_views') || 0,
                        impressions: getMetric('post_impressions_unique') || getMetric('post_video_views') || 0,
                        engagement: getMetric('post_engagements') || 0,
                        clicks: getMetric('post_clicks_unique') || 0,
                        reactions: data.likes?.summary?.total_count || 0,
                        comments: data.comments?.summary?.total_count || 0,
                        shares: data.shares?.count || 0
                    }
                };
            };

            // 🟢 2. The Smart API Query Pivot
            // ATTEMPT 1: Treat it as a standard Post
            const postUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,shares,likes.summary(true),comments.summary(true),insights.metric(post_impressions_unique,post_engagements,post_clicks_unique)&access_token=${FB_ACCESS_TOKEN}`;
            const postRes = await fetch(postUrl);
            const postData = await postRes.json();

            if (!postData.error) {
                return formatResult(postData, postData.insights?.data);
            }

            // ATTEMPT 2: If it throws a #10 or #12 Error, it is a Reel/Video. Pivot to Video Metrics.
            if (postData.error) {
                // Videos usually only accept the raw numeric ID, not the PAGEID_ prefix
                const videoUrl = `https://graph.facebook.com/v19.0/${extractedId}?fields=message,created_time,shares,likes.summary(true),comments.summary(true),insights.metric(post_video_views)&access_token=${FB_ACCESS_TOKEN}`;
                const videoRes = await fetch(videoUrl);
                const videoData = await videoRes.json();

                if (!videoData.error) {
                    return formatResult(videoData, videoData.insights?.data);
                }

                // ATTEMPT 3: Ultimate Fallback (Grab basic data and Likes/Comments, ignore insights so it doesn't crash)
                const plainUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=message,created_time,shares,likes.summary(true),comments.summary(true)&access_token=${FB_ACCESS_TOKEN}`;
                const plainRes = await fetch(plainUrl);
                const plainData = await plainRes.json();

                if (!plainData.error) {
                    return formatResult(plainData, null);
                }

                // If all 3 attempts fail, return the specific Facebook error string
                return { url, error: postData.error.message, metrics: null };
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