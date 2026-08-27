// netlify/functions/youtube.js
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

const fetchWithTimeout = async (url, options = {}, timeout = 4000) => {
    if (typeof fetch !== 'function') {
        throw new Error("Runtime Node version mismatch. Ensure NODE_VERSION is set to 20 in Netlify.");
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

app.get('*', async (req, res) => {
    try {
        if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
            return res.status(401).json({ 
                error: "Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID in environment variables." 
            });
        }

        // 1. Calculate Unix timestamp for 4 months ago
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
        const publishedAfter = fourMonthsAgo.toISOString();

        // 2. Search for channel videos published within the previous 4 months
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&type=video&order=date&maxResults=50&publishedAfter=${publishedAfter}&key=${YOUTUBE_API_KEY}`;
        const searchRes = await fetchWithTimeout(searchUrl, {}, 3500);
        const searchData = await searchRes.json();

        if (searchData.error) {
            return res.status(500).json({ error: searchData.error.message });
        }

        const items = searchData.items || [];
        if (items.length === 0) return res.json([]);

        const videoIds = items.map(item => item.id?.videoId).filter(Boolean);

        // 3. Batch fetch video statistics (views, likes, comments)
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
        const statsRes = await fetchWithTimeout(statsUrl, {}, 3500);
        const statsData = await statsRes.json();

        const videoDetails = statsData.items || [];

        // 4. Concurrent fetch for top comment threads per video
        const fetchPromises = videoDetails.map(async (video) => {
            const videoId = video.id;
            let comments = [];

            try {
                const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${YOUTUBE_API_KEY}`;
                const commentsRes = await fetchWithTimeout(commentsUrl, {}, 2500);
                const commentsData = await commentsRes.json();

                if (commentsData.items) {
                    comments = commentsData.items.map(ct => {
                        const snippet = ct.snippet?.topLevelComment?.snippet;
                        return {
                            id: ct.id,
                            user: snippet?.authorDisplayName || 'YouTube User',
                            text: snippet?.textDisplay || '',
                            date: snippet?.publishedAt
                        };
                    });
                }
            } catch (e) {
                console.warn(`Comments disabled or fetch failed for video ${videoId}:`, e.message);
            }

            const stats = video.statistics || {};
            const snippet = video.snippet || {};

            return {
                id: videoId,
                platform: 'youtube',
                title: snippet.title || 'YouTube Video',
                permalink: `https://www.youtube.com/watch?v=${videoId}`,
                postedAt: snippet.publishedAt,
                metrics: {
                    impressions: Number(stats.viewCount || 0),
                    engagement: Number(stats.likeCount || 0) + Number(stats.commentCount || 0),
                    reach: Number(stats.viewCount || 0),
                    likes: Number(stats.likeCount || 0),
                    commentCount: Number(stats.commentCount || 0)
                },
                comments: comments
            };
        });

        const finalResults = await Promise.all(fetchPromises);
        res.json(finalResults);

    } catch (error) {
        console.error("YouTube Function Handler Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports.handler = serverless(app);