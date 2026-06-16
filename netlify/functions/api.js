// netlify/functions/api.js
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

// 🟢 FAIL-FAST TIMEOUT HELPER: Prevents individual requests from hanging and triggering a 502 timeout
const fetchWithTimeout = async (url, options = {}, timeout = 2000) => {
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

// 🔎 URL-Decoding Scraper (Optimized with strict network budgets)
const resolveAndExtractId = async (inputUrl) => {
    try {
        // Step 1: Check if it's already an unmasked direct URL structure
        let match = inputUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
        if (match && match[1]) return match[1];

        // Step 2: Try a lightning-fast Graph API lookup
        try {
            const encodedUrl = encodeURIComponent(inputUrl);
            const apiRes = await fetchWithTimeout(`https://graph.facebook.com/v19.0/?id=${encodedUrl}&access_token=${FB_ACCESS_TOKEN}`, {}, 2000);
            const apiData = await apiRes.json();
            if (apiData.og_object && apiData.og_object.id) return apiData.og_object.id;
            if (apiData.id && /^\d+$/.test(apiData.id)) return apiData.id;
        } catch (e) {
            console.warn("API pre-check skipped or timed out.");
        }

        // Step 3: Manual redirect trace with a strict 2-second cutoff window
        const manualRes = await fetchWithTimeout(inputUrl, {
            redirect: 'manual', 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        }, 2000);
        
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
        console.error("URL Resolution Error:", error.message);
        return null;
    }
};

// Catch-all route to process requests safely
app.post('*', async (req, res) => {
    const { links } = req.body;
    
    if (!links || !Array.isArray(links)) {
        return res.status(400).json({ error: "Please provide an array of links." });
    }

    try {
        if (!CACHED_PAGE_ID) {
            try {
                const meRes = await fetchWithTimeout(`https://graph.facebook.com/v19.0/me?access_token=${FB_ACCESS_TOKEN}`, {}, 2000);
                const meData = await meRes.json();
                if (meData.id) CACHED_PAGE_ID = meData.id;
            } catch (err) {
                console.warn("Profile check skipped.");
            }
        }

        const fetchPromises = links.map(async (url) => {
            try {
                let extractedId = await resolveAndExtractId(url);
                
                if (!extractedId) return { url, error: "Could not unmask Post ID inside cloud network parameters.", metrics: null };

                let graphApiId = extractedId;
                if (CACHED_PAGE_ID && !extractedId.startsWith(`${CACHED_PAGE_ID}_`)) {
                    graphApiId = `${CACHED_PAGE_ID}_${extractedId}`; 
                }

                let basicDataUrl = `https://graph.facebook.com/v19.0/${graphApiId}?fields=id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
                let basicRes = await fetchWithTimeout(basicDataUrl, {}, 2000);
                let basicData = await basicRes.json();

                if (basicData.error) {
                    basicDataUrl = `https://graph.facebook.com/v19.0/${extractedId}?fields=id,message,created_time,shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${FB_ACCESS_TOKEN}`;
                    basicRes = await fetchWithTimeout(basicDataUrl, {}, 2000);
                    basicData = await basicRes.json();
                }

                if (basicData.error) return { url, error: basicData.error.message, metrics: null };

                const canonicalId = basicData.id;
                const totalReactions = basicData.reactions?.summary?.total_count || 0;
                const totalComments = basicData.comments?.summary?.total_count || 0;
                const totalShares = basicData.shares?.count || 0;
                const fallbackEngagement = totalReactions + totalComments + totalShares;

                let reach = 0, impressions = 0, clicks = 0;

                const impressionEndpoints = [
                    `https://graph.facebook.com/v19.0/${canonicalId}/insights?metric=post_impressions_unique,post_impressions&access_token=${FB_ACCESS_TOKEN}`,
                    `https://graph.facebook.com/v19.0/${canonicalId}/insights?metric=post_video_views&access_token=${FB_ACCESS_TOKEN}`
                ];

                for (const endpoint of impressionEndpoints) {
                    try {
                        const res = await fetchWithTimeout(endpoint, {}, 1500);
                        const data = await res.json();
                        if (!data.error && data.data && data.data.length > 0) {
                            const getM = (m) => data.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                            impressions = getM('post_impressions') || getM('post_video_views') || 0;
                            reach = getM('post_impressions_unique') || impressions; 
                            break; 
                        }
                    } catch (e) {}
                }

                const clickEndpoints = [
                    `https://graph.facebook.com/v19.0/${canonicalId}/insights?metric=post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`
                ];

                for (const endpoint of clickEndpoints) {
                    try {
                        const res = await fetchWithTimeout(endpoint, {}, 1500);
                        const data = await res.json();
                        if (!data.error && data.data && data.data.length > 0) {
                            clicks = data.data.find(x => x.name === 'post_clicks_unique')?.values?.[0]?.value || 
                                     data.data.find(x => x.name === 'post_clicks')?.values?.[0]?.value || 0;
                            break; 
                        }
                    } catch (e) {}
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
                return { url, error: `Link processing took too long: ${postError.message}`, metrics: null };
            }
        });

        const results = await Promise.all(fetchPromises);
        res.json(results);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports.handler = serverless(app);