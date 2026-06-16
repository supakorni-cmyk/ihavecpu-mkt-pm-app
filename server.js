// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

// Helper to extract the hidden Post ID from typical Facebook URLs
const extractPostId = (url) => {
    // Matches patterns like /posts/12345, /videos/12345, or fbid=12345
    const match = url.match(/(?:posts\/|videos\/|fbid=)([0-9]+)/);
    return match ? match[1] : null;
};

app.post('/api/facebook-custom-links', async (req, res) => {
    const { links } = req.body;
    
    if (!links || !Array.isArray(links)) {
        return res.status(400).json({ error: "Please provide an array of links." });
    }

    try {
        // Fetch all requested posts simultaneously
        const fetchPromises = links.map(async (url) => {
            const postId = extractPostId(url);
            if (!postId) return { url, error: "Could not extract Post ID from URL", metrics: null };

            // Securely query the Graph API
            const fbUrl = `https://graph.facebook.com/v19.0/${postId}?fields=message,created_time,insights.metric(post_impressions_unique,post_engagements,post_clicks_unique)&access_token=${FB_ACCESS_TOKEN}`;
            
            const response = await fetch(fbUrl);
            const fbData = await response.json();

            if (fbData.error) return { url, error: fbData.error.message, metrics: null };

            const insights = fbData.insights?.data || [];
            
            // Helper to safely extract metric values
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
                    // Basic reactions/comments are placeholders unless queried via separate edge endpoints
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