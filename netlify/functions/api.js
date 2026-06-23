// netlify/functions/api.js
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

const fetchWithTimeout = async (url, options = {}, timeout = 2500) => {
    if (typeof fetch !== 'function') {
        throw new Error("Runtime runtime container mismatch. Please ensure NODE_VERSION is configured as 20 inside Netlify.");
    }
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

const resolveAndExtractId = async (inputUrl) => {
    try {
        let match = inputUrl.match(/(?:posts\/|videos\/|reel\/|watch\/?\?v=|fbid=|story_fbid=|\/p\/)(pfbid[a-zA-Z0-9]+|\d{10,})/i);
        if (match && match[1]) return match[1];

        try {
            const encodedUrl = encodeURIComponent(inputUrl);
            const apiRes = await fetchWithTimeout(`https://graph.facebook.com/v19.0/?id=${encodedUrl}&access_token=${FB_ACCESS_TOKEN}`, {}, 2000);
            const apiData = await apiRes.json();
            if (apiData.og_object && apiData.og_object.id) return apiData.og_object.id;
            if (apiData.id && /^\d+$/.test(apiData.id)) return apiData.id;
        } catch (e) {}

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
        return null;
    }
};

app.post('*', async (req, res) => {
    const { links } = req.body;
    if (!links || !Array.isArray(links)) {
        return res.status(400).json({ error: "Please provide an array of links." });
    }

    try {
        if (!CACHED_PAGE_ID && FB_ACCESS_TOKEN) {
            try {
                const meRes = await fetchWithTimeout(`https://graph.facebook.com/v19.0/me?access_token=${FB_ACCESS_TOKEN}`, {}, 2000);
                const meData = await meRes.json();
                if (meData.id) CACHED_PAGE_ID = meData.id;
            } catch (err) {}
        }

        const fetchPromises = links.map(async (url) => {
            try {
                let extractedId = await resolveAndExtractId(url);
                if (!extractedId) return { url, error: "Could not unmask Post ID.", metrics: null };

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

                // 🟢 UNIFIED REQUEST BULK INSIGHTS: Fetch all possible metrics at once!
                let insightsUrl = `https://graph.facebook.com/v19.0/${canonicalId}/insights?metric=post_impressions_unique,post_impressions,post_video_views,post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`;
                let insightsRes = await fetchWithTimeout(insightsUrl, {}, 2000);
                let insightsData = await insightsRes.json();

                // Secondary fallback attempt if the primary canonical mapping returns empty
                if ((insightsData.error || !insightsData.data || insightsData.data.length === 0) && graphApiId !== canonicalId) {
                    insightsUrl = `https://graph.facebook.com/v19.0/${graphApiId}/insights?metric=post_impressions_unique,post_impressions,post_video_views,post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`;
                    insightsRes = await fetchWithTimeout(insightsUrl, {}, 2000);
                    insightsData = await insightsRes.json();
                }

                if (!insightsData.error && insightsData.data) {
                    const getM = (m) => insightsData.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                    
                    const postImpressions = getM('post_impressions');
                    const videoViews = getM('post_video_views');
                    
                    // Handle fallback rules: if post_impressions is 0, substitute video views
                    impressions = postImpressions || videoViews || 0;
                    reach = getM('post_impressions_unique') || impressions;
                    clicks = getM('post_clicks_unique') || getM('post_clicks') || 0;
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
                return { url, error: `Processing error: ${postError.message}`, metrics: null };
            }
        });

        const results = await Promise.all(fetchPromises);
        res.json(results);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports.handler = serverless(app);