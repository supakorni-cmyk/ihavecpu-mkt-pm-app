// netlify/functions/api.js
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
let CACHED_PAGE_ID = null;

const fetchWithTimeout = async (url, options = {}, timeout = 3500) => {
    if (typeof fetch !== 'function') {
        throw new Error("Runtime container node version mismatch. Ensure NODE_VERSION is 20 in Netlify.");
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

const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

const getPostInsights = async (targetId) => {
    try {
        const [mediaRes, legacyRes, vidRes, clkRes] = await Promise.all([
            fetchWithTimeout(`https://graph.facebook.com/v19.0/${targetId}/insights?metric=post_total_media_view_unique,post_media_view&access_token=${FB_ACCESS_TOKEN}`, {}, 2000).catch(() => null),
            fetchWithTimeout(`https://graph.facebook.com/v19.0/${targetId}/insights?metric=post_impressions_unique,post_impressions&access_token=${FB_ACCESS_TOKEN}`, {}, 2000).catch(() => null),
            fetchWithTimeout(`https://graph.facebook.com/v19.0/${targetId}/insights?metric=post_video_views&access_token=${FB_ACCESS_TOKEN}`, {}, 2000).catch(() => null),
            fetchWithTimeout(`https://graph.facebook.com/v19.0/${targetId}/insights?metric=post_clicks_unique,post_clicks&access_token=${FB_ACCESS_TOKEN}`, {}, 2000).catch(() => null)
        ]);

        let reach = 0, impressions = 0, clicks = 0;
        let hasData = false;

        if (mediaRes) {
            const d = await mediaRes.json().catch(() => ({}));
            if (d.data && d.data.length > 0) {
                const getM = (m) => d.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                impressions = getM('post_media_view');
                reach = getM('post_total_media_view_unique') || impressions;
                if (impressions > 0) hasData = true;
            }
        }

        if (legacyRes && !hasData) {
            const d = await legacyRes.json().catch(() => ({}));
            if (d.data && d.data.length > 0) {
                const getM = (m) => d.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                impressions = getM('post_impressions');
                reach = getM('post_impressions_unique') || impressions;
            }
        }
        
        if (vidRes) {
            const d = await vidRes.json().catch(() => ({}));
            if (d.data && d.data.length > 0) {
                const getM = (m) => d.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                const videoViews = getM('post_video_views');
                if (videoViews > 0) {
                    impressions = impressions || videoViews;
                    reach = reach || impressions;
                }
            }
        }

        if (clkRes) {
            const d = await clkRes.json().catch(() => ({}));
            if (d.data && d.data.length > 0) {
                const getM = (m) => d.data.find(x => x.name === m)?.values?.[0]?.value || 0;
                clicks = getM('post_clicks_unique') || getM('post_clicks') || 0;
            }
        }

        return { reach, impressions, clicks };
    } catch (e) {
        return { reach: 0, impressions: 0, clicks: 0 };
    }
};

// 🟢 ROUTE A: GET Protocol - Automated Page Feed Extraction (4-Month History & Comments)
app.get('*', async (req, res) => {
    try {
        if (!FB_ACCESS_TOKEN) return res.status(401).json({ error: "Missing token config." });

        // Calculate Unix timestamp for 4 months ago (approx 120 days)
        const fourMonthsAgoSec = Math.floor((Date.now() - (120 * 24 * 60 * 60 * 1000)) / 1000);

        // Fields request expanded comments data (id, message, created_time, from)
        const feedUrl = `https://graph.facebook.com/v19.0/me/feed?fields=id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true).limit(25){id,message,created_time,from}&since=${fourMonthsAgoSec}&limit=100&access_token=${FB_ACCESS_TOKEN}`;
        const feedResponse = await fetchWithTimeout(feedUrl, {}, 3500);
        const feedData = await feedResponse.json();

        if (feedData.error) return res.status(500).json({ error: feedData.error.message });
        if (!feedData.data || feedData.data.length === 0) return res.json([]);

        const fetchPromises = feedData.data.map(async (post) => {
            const totalReactions = post.reactions?.summary?.total_count || 0;
            const totalComments = post.comments?.summary?.total_count || 0;
            const totalShares = post.shares?.count || 0;
            const baseEngagement = totalReactions + totalComments + totalShares;

            // Format comments list
            const rawComments = post.comments?.data || [];
            const commentsList = rawComments.map(c => ({
                id: c.id,
                text: c.message || '',
                user: c.from?.name || 'Facebook User',
                date: c.created_time
            }));

            const insights = await getPostInsights(post.id);

            return {
                id: post.id,
                message: post.message || 'Photo / Media Layout Update',
                postedAt: post.created_time,
                permalink: post.permalink_url,
                comments: commentsList,
                metrics: {
                    reach: insights.reach,
                    impressions: insights.impressions,
                    engagement: baseEngagement + insights.clicks,
                    clicks: insights.clicks,
                    reactions: totalReactions,
                    comments: totalComments,
                    shares: totalShares
                }
            };
        });

        const finalResults = await Promise.all(fetchPromises);
        res.json(finalResults);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🟢 ROUTE B: POST Protocol - Custom Pasted Links Processing (with Comments Extraction)
app.post('*', async (req, res) => {
    const { links } = req.body;
    if (!links || !Array.isArray(links)) return res.status(400).json({ error: "Provide links array." });

    try {
        if (!CACHED_PAGE_ID && FB_ACCESS_TOKEN) {
            try {
                const meRes = await fetchWithTimeout(`https://graph.facebook.com/v19.0/me?access_token=${FB_ACCESS_TOKEN}`, {}, 2000);
                const meData = await meRes.json();
                if (meData.id) CACHED_PAGE_ID = meData.id;
            } catch (err) {}
        }

        const linkChunks = chunkArray(links, 15);
        let finalResults = [];

        for (const chunk of linkChunks) {
            const chunkPromises = chunk.map(async (url) => {
                try {
                    let extractedId = await resolveAndExtractId(url);
                    if (!extractedId) return { url, error: "Unmask failed.", metrics: null };

                    let graphApiId = extractedId;
                    if (CACHED_PAGE_ID && !extractedId.startsWith(`${CACHED_PAGE_ID}_`)) {
                        graphApiId = `${CACHED_PAGE_ID}_${extractedId}`; 
                    }

                    const commentFields = `fields=id,message,created_time,shares,reactions.summary(true),comments.summary(true).limit(25){id,message,created_time,from}`;
                    let basicDataUrl = `https://graph.facebook.com/v19.0/${graphApiId}?${commentFields}&access_token=${FB_ACCESS_TOKEN}`;
                    let basicRes = await fetchWithTimeout(basicDataUrl, {}, 2500);
                    let basicData = await basicRes.json();

                    if (basicData.error) {
                        basicDataUrl = `https://graph.facebook.com/v19.0/${extractedId}?${commentFields}&access_token=${FB_ACCESS_TOKEN}`;
                        basicRes = await fetchWithTimeout(basicDataUrl, {}, 2500);
                        basicData = await basicRes.json();
                    }

                    if (basicData.error) return { url, error: basicData.error.message, metrics: null };

                    const canonicalId = basicData.id;
                    const totalReactions = basicData.reactions?.summary?.total_count || 0;
                    const totalComments = basicData.comments?.summary?.total_count || 0;
                    const totalShares = basicData.shares?.count || 0;
                    const fallbackEngagement = totalReactions + totalComments + totalShares;

                    const rawComments = basicData.comments?.data || [];
                    const commentsList = rawComments.map(c => ({
                        id: c.id,
                        text: c.message || '',
                        user: c.from?.name || 'Facebook User',
                        date: c.created_time
                    }));

                    const insights = await getPostInsights(canonicalId);

                    return {
                        id: canonicalId, 
                        message: basicData.message || 'Video / Photo Post',
                        postedAt: basicData.created_time,
                        permalink: url,
                        comments: commentsList,
                        metrics: {
                            reach: insights.reach,
                            impressions: insights.impressions,
                            engagement: fallbackEngagement + insights.clicks,
                            clicks: insights.clicks,
                            reactions: totalReactions,
                            comments: totalComments,
                            shares: totalShares
                        }
                    };
                } catch (postError) {
                    return { url, error: postError.message, metrics: null };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);
            finalResults = finalResults.concat(chunkResults);
        }
        res.json(finalResults);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports.handler = serverless(app);