// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');

// 🟢 SAFE REBOOT OVERRIDE: Only apply IPv4 sorting if the running Node version supports it.
// This prevents fatal startup crashes (502 errors) on older cloud containers.
if (dns && typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

const app = express();

// 🟢 PERMISSIVE CORS: Open headers up completely for production cloud validation
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 HEALTH CHECK ROUTE: Tells Render your app is alive and functional
app.get('/', (req, res) => {
    res.status(200).send('Facebook Analytics Bridge is Online and Healthy!');
});

// 🔎 1. The URL-Decoding Scraper (Your working local backup engine)
const resolveAndExtractId = async (inputUrl) => {
    try {
        try {
            const encodedUrl = encodeURIComponent(inputUrl);
            const apiRes = await fetch(`https://graph.facebook.com/v19.0/?id=${encodedUrl}&access_token=${FB_ACCESS_TOKEN}`);
            const apiData = await apiRes.json();
            if (apiData.og_object && apiData.og_object.id) return apiData.og_object.id;
            if (apiData.id && /^\d+$/.test(apiData.id)) return apiData.id;
        } catch (e) {
            console.warn("Graph API link parsing skipped, activating local scraper engines.");
        }

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
            try {
                const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${FB_ACCESS_TOKEN}`);
                const meData = await meRes.json();
                if (meData.id) CACHED_PAGE_ID = meData.id;
            } catch (err) {
                console.warn("Token profile lookup deferred directly to processing tasks.");
            }
        }

        const fetchPromises = links.map(async (url) => {
            try {
                let extractedId = await resolveAndExtractId(url);
                
                if (!extractedId) return { url, error: "Could not unmask Post ID.", metrics: null };

                let graphApiId = extractedId;
                if (CACHED_PAGE_ID && !extractedId.startsWith(`${CACHED_PAGE_ID}_`)) {
                    graphApiId = `${CACHED_PAGE_ID}_${extractedId}`; 
                }

                // STEP 1: Fetch Basic Interactions
                let basicDataUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
                let basicRes = await fetch(basicDataUrl);
                let basicData = await basicRes.json();

                if (basicData.error) {
                    basicDataUrl = `https://graph.facebook.com/v19.0/${extractedId}?fields=id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
                    basicRes = await fetch(basicDataUrl);
                    basicData = await basicRes.json();
                }

                if (basicData.error) return { url, error: basicData.error.message, metrics: null };

                const canonicalId = basicData.id;

                const totalReactions = basicData.reactions?.summary?.total_count || 0;
                const totalComments = basicData.comments?.summary?.total_count || 0;
                const totalShares = basicData.shares?.count || 0;
                const fallbackEngagement = totalReactions + totalComments + totalShares;

                // STEP 2: Fetch Insights using the Canonical ID
                let reach = 0, impressions = 0, clicks = 0;

                const impressionEndpoints = [
                    `https://graph.facebook.com/v19.0/${canonicalId}/insights?metric=post_impressions_unique,post_impressions&access_token=${FB_ACCESS_TOKEN}`,
                    `https://graph.facebook.com/v19.0/${canonicalId}/insights?metric=post_video_views&access_token=${FB_ACCESS_TOKEN}`,
                    `https://graph.facebook.com/v19.0/${graphApiId}/insights?metric=post_impressions_unique,post_impressions&access_token=${FB_ACCESS_TOKEN}`,
                    `https://graph.facebook.com/v19.0/${extractedId}/insights?metric=post_video_views&access_token=${FB_ACCESS_TOKEN}`
                ];

                for (const endpoint of impressionEndpoints) {
                    try {
                        const res = await fetch(endpoint);
                        const data = await res.json();
                        
                        if (!data.error && data.data && data.data.length > 0) {
                            const getM = (m) => data.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                            impressions = getM('post_impressions') || getM('post_video_views') || 0;
                            reach = getM('post_impressions_unique') || impressions; 
                            break; 
                        }
                    } catch (e) {
                        console.warn(`Insights block bypassed for endpoint row target: ${endpoint}`);
                    }
                }

                const clickEndpoints = [
                    `https://graph.facebook.com/v19.0/${canonicalId}/insights?metric=post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`,
                    `https://graph.facebook.com/v19.0/${graphApiId}/insights?metric=post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`
                ];

                for (const endpoint of clickEndpoints) {
                    try {
                        const res = await fetch(endpoint);
                        const data = await res.json();
                        
                        if (!data.error && data.data && data.data.length > 0) {
                            clicks = data.data.find(x => x.name === 'post_clicks_unique')?.values?.[0]?.value || 
                                     data.data.find(x => x.name === 'post_clicks')?.values?.[0]?.value || 0;
                            break; 
                        }
                    } catch (e) {
                        console.warn(`Click block bypassed for endpoint row target: ${endpoint}`);
                    }
                }

                return {
                    id: canonicalId, 
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
            } catch (postError) {
                return { url, error: `Process tracking issue: ${postError.message}`, metrics: null };
            }
        });

        const results = await Promise.all(fetchPromises);
        res.json(results);

    } catch (error) {
        console.error("Global Endpoint Crash:", error);
        res.status(500).json({ error: error.message || "Internal server tracking issue." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Facebook Analytics Bridge running on port ${PORT}`));