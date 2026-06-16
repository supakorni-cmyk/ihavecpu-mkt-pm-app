// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Keeps Render network pipelines stable

const app = express();
app.use(cors());
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// Helper function to handle fetch timeouts gracefully
const fetchWithTimeout = async (url, options = {}, timeout = 7000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// 🟢 1. The URL-Decoding Scraper (Upgraded to Official Graph API Link Resolver)
const resolveAndExtractId = async (inputUrl) => {
    try {
        // 🧱 THE CLOUD BYPASS: Ask the Facebook Graph API to inspect the shortlink for us.
        // Since this request executes entirely inside Facebook's network framework,
        // it completely circumvents data-center IP blocks and login walls!
        const encodedUrl = encodeURIComponent(inputUrl);
        const apiResolverUrl = `https://graph.facebook.com/v19.0/?id=${encodedUrl}&fields=og_object&access_token=${FB_ACCESS_TOKEN}`;
        
        const apiRes = await fetchWithTimeout(apiResolverUrl, {}, 5000);
        const apiData = await apiRes.json();
        
        // If the Graph API successfully resolved its own shortlink, return the true internal ID
        if (apiData.og_object && apiData.og_object.id) {
            return apiData.og_object.id;
        }

        // 🔍 Fallback 1: Extract directly from the text if it's already a regular unmasked URL
        let match = inputUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
        if (match && match[1]) return match[1];

        // 🔍 Fallback 2: Standard desktop redirect tracking header lookup
        const manualRes = await fetchWithTimeout(inputUrl, {
            redirect: 'manual', 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
        }, 5000);
        
        if (manualRes.status >= 300 && manualRes.status < 400) {
            const locationHeader = manualRes.headers.get('location');
            if (locationHeader) {
                const decodedLocation = decodeURIComponent(locationHeader);
                const match = decodedLocation.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
                if (match && match[1]) return match[1];
            }
        }

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
            const meRes = await fetchWithTimeout(`https://graph.facebook.com/v19.0/me?access_token=${FB_ACCESS_TOKEN}`, {}, 5000);
            const meData = await meRes.json();
            if (meData.id) CACHED_PAGE_ID = meData.id;
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
                let basicRes = await fetchWithTimeout(basicDataUrl, {}, 5000);
                let basicData = await basicRes.json();

                if (basicData.error) {
                    basicDataUrl = `https://graph.facebook.com/v19.0/${extractedId}?fields=id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
                    basicRes = await fetchWithTimeout(basicDataUrl, {}, 5000);
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
                        const res = await fetchWithTimeout(endpoint, {}, 4000);
                        const data = await res.json();
                        
                        if (!data.error && data.data && data.data.length > 0) {
                            const getM = (m) => data.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                            impressions = getM('post_impressions') || getM('post_video_views') || 0;
                            reach = getM('post_impressions_unique') || impressions; 
                            break; 
                        }
                    } catch (e) {
                        console.warn(`Skipping slow impression endpoint: ${endpoint}`);
                    }
                }

                const clickEndpoints = [
                    `https://graph.facebook.com/v19.0/${canonicalId}/insights?metric=post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`,
                    `https://graph.facebook.com/v19.0/${graphApiId}/insights?metric=post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`
                ];

                for (const endpoint of clickEndpoints) {
                    try {
                        const res = await fetchWithTimeout(endpoint, {}, 4000);
                        const data = await res.json();
                        
                        if (!data.error && data.data && data.data.length > 0) {
                            clicks = data.data.find(x => x.name === 'post_clicks_unique')?.values?.[0]?.value || 
                                     data.data.find(x => x.name === 'post_clicks')?.values?.[0]?.value || 0;
                            break; 
                        }
                    } catch (e) {
                        console.warn(`Skipping slow click endpoint: ${endpoint}`);
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
                return { url, error: `Connection problem: ${postError.message}`, metrics: null };
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