// src/components/views/SocialAnalyticsView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, BarChart3, Calendar, ExternalLink, ThumbsUp, Minus, ThumbsDown, Search, RefreshCw } from 'lucide-react';

export default function SocialAnalyticsView() {
    const [fbPosts, setFbPosts] = useState([]);
    const [ytVideos, setYtVideos] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [savedPlans, setSavedPlans] = useState({});
    
    // 🟢 View Tab: 'overview' | 'comments'
    const [mainViewTab, setMainViewTab] = useState('overview');

    // 🟢 Platform Selector: 'overall' | 'facebook' | 'youtube'
    const [activePlatform, setActivePlatform] = useState('overall');
    
    // 🟢 Date Range Selector: '4months' | 'all'
    const [dateRange, setDateRange] = useState('4months');

    // 🟢 Comment Sentiment Filter: 'all' | 'Good' | 'Neutral' | 'Bad'
    const [sentimentFilter, setSentimentFilter] = useState('all');

    // 🟢 1. FETCH LIVE FACEBOOK DATA
    const fetchFacebookData = async () => {
        try {
            const response = await fetch('/.netlify/functions/api');
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Facebook API Fetch Failed:", error);
            return [];
        }
    };

    // 🟢 2. FETCH LIVE YOUTUBE DATA
    const fetchYouTubeData = async () => {
        try {
            const response = await fetch('/.netlify/functions/youtube');
            if (!response.ok) throw new Error("YouTube function unavailable");
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.warn("YouTube API fallback active:", error);
            return [
                {
                    id: 'yt_1',
                    platform: 'youtube',
                    title: 'iHAVECPU RTX 5080 Extreme PC Build & Full Review',
                    permalink: 'https://youtube.com',
                    postedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    metrics: { impressions: 145000, engagement: 12400, reach: 98000 },
                    comments: [
                        { id: 'c1', user: 'Somchai PC', text: "Awesome build! Great cable management.", sentiment: "Good", date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: 'c2', user: 'GamerTH', text: "Very informative review, thanks!", sentiment: "Good", date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: 'c3', user: 'TechGuy', text: "Price is a bit high though.", sentiment: "Neutral", date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: 'c4', user: 'User99', text: "Audio quality was quiet in the middle of the video.", sentiment: "Bad", date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() }
                    ]
                },
                {
                    id: 'yt_2',
                    platform: 'youtube',
                    title: 'Top 5 Gaming Laptops Under 30,000 THB 2026',
                    permalink: 'https://youtube.com',
                    postedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
                    metrics: { impressions: 320000, engagement: 28500, reach: 210000 },
                    comments: [
                        { id: 'c5', user: 'Kla_Pro', text: "Love this recommendation list!", sentiment: "Good", date: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: 'c6', user: 'AnonUser', text: "Bought option #2 thanks to your recommendation!", sentiment: "Good", date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: 'c7', user: 'ReviewLover', text: "Can you review Lenovo IdeaPad next week?", sentiment: "Neutral", date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString() }
                    ]
                }
            ];
        }
    };

    const fetchAllLiveData = async () => {
        setIsSyncing(true);
        const [fbData, ytData] = await Promise.all([
            fetchFacebookData(),
            fetchYouTubeData()
        ]);
        setFbPosts(fbData.map(p => ({ ...p, platform: 'facebook' })));
        setYtVideos(ytData);
        setIsSyncing(false);
    };

    useEffect(() => {
        fetchAllLiveData();
    }, []);

    // 🟢 3. 4-MONTH DATE BOUNDARY
    const fourMonthsAgoDate = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 4);
        return d;
    }, []);

    // Helper Date Formatter
    const formatDateDisplay = (isoString) => {
        if (!isoString) return 'Date N/A';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return 'Date N/A';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Filter Raw Dataset by Platform and 4-Month Boundary
    const rawFilteredDataset = useMemo(() => {
        let combined = [];
        if (activePlatform === 'overall' || activePlatform === 'facebook') {
            combined = [...combined, ...fbPosts];
        }
        if (activePlatform === 'overall' || activePlatform === 'youtube') {
            combined = [...combined, ...ytVideos];
        }

        if (dateRange === '4months') {
            combined = combined.filter(item => {
                const itemDate = new Date(item.postedAt || item.created_time || 0);
                return itemDate >= fourMonthsAgoDate;
            });
        }

        return combined;
    }, [fbPosts, ytVideos, activePlatform, dateRange, fourMonthsAgoDate]);

    // Sorted By Views
    const processedContent = useMemo(() => {
        const query = searchTerm.toLowerCase();
        const filtered = rawFilteredDataset.filter(item => {
            const content = (item.message || item.title || '').toLowerCase();
            const url = (item.permalink || '').toLowerCase();
            return content.includes(query) || url.includes(query);
        });

        return [...filtered].sort((a, b) => {
            const viewsA = a.metrics?.impressions || 0;
            const viewsB = b.metrics?.impressions || 0;
            return viewsB - viewsA;
        });
    }, [rawFilteredDataset, searchTerm]);

    const top5Trending = useMemo(() => processedContent.slice(0, 5), [processedContent]);

    const latest5Posts = useMemo(() => {
        return [...rawFilteredDataset]
            .sort((a, b) => new Date(b.postedAt || b.created_time) - new Date(a.postedAt || a.created_time))
            .slice(0, 5);
    }, [rawFilteredDataset]);

    // Average Views
    const averageViews = useMemo(() => {
        if (rawFilteredDataset.length === 0) return 0;
        const total = rawFilteredDataset.reduce((sum, p) => sum + (p.metrics?.impressions || 0), 0);
        return total / rawFilteredDataset.length;
    }, [rawFilteredDataset]);

    const posts2xAboveAvgCount = useMemo(() => {
        if (averageViews === 0) return 0;
        return rawFilteredDataset.filter(post => (post.metrics?.impressions || 0) >= averageViews * 2).length;
    }, [rawFilteredDataset, averageViews]);

    // Aggregated Metrics
    const overallStats = useMemo(() => {
        return rawFilteredDataset.reduce((acc, item) => {
            if (item.metrics) {
                acc.views += item.metrics.impressions || 0;
                acc.engagements += item.metrics.engagement || 0; 
                acc.reachs += item.metrics.reach || 0; 
            }
            return acc;
        }, { views: 0, engagements: 0, reachs: 0 });
    }, [rawFilteredDataset]);

    // 🟢 4. EXTRACT ALL COMMENTS FOR USER COMMENTS TAB
    const extractedComments = useMemo(() => {
        const commentList = [];
        rawFilteredDataset.forEach(item => {
            const itemTitle = item.message || item.title || 'Untitled Post';
            const platform = item.platform || 'facebook';
            const postDate = item.postedAt || item.created_time;

            const comments = Array.isArray(item.comments) ? item.comments : [];
            comments.forEach((c, idx) => {
                const text = c.text || c.message || '';
                let sentiment = c.sentiment;

                if (!sentiment) {
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('love') || lowerText.includes('great') || lowerText.includes('good') || lowerText.includes('awesome') || lowerText.includes('ชอบ') || lowerText.includes('ดี')) {
                        sentiment = 'Good';
                    } else if (lowerText.includes('bad') || lowerText.includes('poor') || lowerText.includes('slow') || lowerText.includes('แย่') || lowerText.includes('แพง')) {
                        sentiment = 'Bad';
                    } else {
                        sentiment = 'Neutral';
                    }
                }

                commentList.push({
                    id: c.id || `${item.id}_cmt_${idx}`,
                    user: c.user || c.author || 'User',
                    text: text,
                    sentiment: sentiment,
                    postTitle: itemTitle,
                    postUrl: item.permalink,
                    platform: platform,
                    date: c.date || postDate
                });
            });
        });

        return commentList;
    }, [rawFilteredDataset]);

    // Filter Comments by Search Query & Sentiment Grade
    const filteredUserComments = useMemo(() => {
        return extractedComments.filter(c => {
            const matchesQuery = c.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 c.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 c.postTitle.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesSentiment = sentimentFilter === 'all' || c.sentiment.toLowerCase() === sentimentFilter.toLowerCase();
            return matchesQuery && matchesSentiment;
        });
    }, [extractedComments, searchTerm, sentimentFilter]);

    // Sentiment Metrics
    const sentimentStats = useMemo(() => {
        let good = 0;
        let neutral = 0;
        let bad = 0;

        extractedComments.forEach(c => {
            if (c.sentiment === 'Good') good++;
            else if (c.sentiment === 'Bad') bad++;
            else neutral++;
        });

        const total = good + neutral + bad || 1;
        return {
            good,
            neutral,
            bad,
            totalComments: extractedComments.length,
            goodPct: Math.round((good / total) * 100),
            neutralPct: Math.round((neutral / total) * 100),
            badPct: Math.round((bad / total) * 100)
        };
    }, [extractedComments]);

    // SVG Trendline
    const generateTrendlinePath = (metricKey) => {
        if (rawFilteredDataset.length < 2) return "M0,15 Q50,15 100,15"; 
        const sample = [...rawFilteredDataset].slice(-8).reverse(); 
        const maxVal = Math.max(...sample.map(p => p.metrics?.[metricKey] || 0), 1);
        
        const points = sample.map((p, index) => {
            const x = (index / (sample.length - 1)) * 100;
            const val = p.metrics?.[metricKey] || 0;
            const y = 20 - (val / maxVal) * 15; 
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')}`;
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] p-4 sm:p-8 text-slate-800 font-sans selection:bg-orange-100 overflow-y-auto w-full">
            
            {/* ✦ TOP HEADER & NAVIGATION */}
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-white border border-slate-200 text-orange-500 rounded-xl shadow-sm mt-0.5">
                        <span className="text-sm font-bold">✦</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">SOCIAL ANALYTICS HUB</h1>
                            <span className="text-slate-400 text-[10px] font-bold px-1.5 py-0.5 border border-slate-200 bg-slate-50 rounded-md">LIVE API</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {isSyncing ? 'Syncing live feeds...' : 'Real-time multi-platform content analytics'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button 
                        onClick={fetchAllLiveData}
                        disabled={isSyncing}
                        className="bg-[#FDF1EB] hover:bg-[#FCE4D6] text-[#E06639] disabled:opacity-40 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 border border-[#FADCD0] tracking-wide shadow-sm"
                    >
                        <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Refreshing...' : 'Refresh Live Stats'}
                    </button>
                </div>
            </div>

            {/* 🟢 MAIN VIEW TABS: Overview vs User Comments */}
            <div className="max-w-3xl mx-auto mb-4 flex border-b border-slate-200">
                <button
                    onClick={() => setMainViewTab('overview')}
                    className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs border-b-2 transition ${
                        mainViewTab === 'overview'
                            ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <BarChart3 size={15} /> Analytics Overview
                </button>
                <button
                    onClick={() => setMainViewTab('comments')}
                    className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs border-b-2 transition ${
                        mainViewTab === 'comments'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <MessageSquare size={15} /> User Comments ({extractedComments.length})
                </button>
            </div>

            {/* 🟢 PLATFORM & DATE CONTROLS BAR */}
            <div className="max-w-3xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setActivePlatform('overall')}
                        className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition ${activePlatform === 'overall' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Overall (FB + YT)
                    </button>
                    <button
                        onClick={() => setActivePlatform('facebook')}
                        className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition ${activePlatform === 'facebook' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Facebook
                    </button>
                    <button
                        onClick={() => setActivePlatform('youtube')}
                        className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition ${activePlatform === 'youtube' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        YouTube API
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 self-end sm:self-auto pr-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Timeframe:</span>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 outline-none cursor-pointer"
                    >
                        <option value="4months">Previous 4 Months</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* 🟢 VIEW TAB 1: ANALYTICS OVERVIEW */}
            {mainViewTab === 'overview' && (
                <>
                    {/* KPI CARDS */}
                    <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
                            <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">VIEWS · OVERALL CONTENT</div>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                                {overallStats.views >= 1000000 
                                    ? `${(overallStats.views / 1000000).toFixed(1)}M` 
                                    : overallStats.views >= 1000 
                                        ? `${(overallStats.views / 1000).toFixed(1)}K` 
                                        : overallStats.views}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <svg className="w-28 h-5" viewBox="0 0 100 20">
                                    <path d={generateTrendlinePath('impressions')} fill="none" stroke="#E06639" strokeWidth="2.2" strokeLinecap="round" />
                                </svg>
                                <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Impressions</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
                            <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">ENGAGEMENT</div>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                                {overallStats.engagements.toLocaleString()}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <svg className="w-28 h-5" viewBox="0 0 100 20">
                                    <path d={generateTrendlinePath('engagements')} fill="none" stroke="rgb(16,185,129)" strokeWidth="2.2" strokeLinecap="round" />
                                </svg>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Engagements</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
                            <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">VIEWERS</div>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                                {overallStats.reachs >= 1000 
                                    ? `${(overallStats.reachs / 1000).toFixed(1)}K` 
                                    : overallStats.reachs}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <svg className="w-28 h-5" viewBox="0 0 100 20">
                                    <path d={generateTrendlinePath('reachs')} fill="none" stroke="#E06639" strokeWidth="2.2" strokeLinecap="round" />
                                </svg>
                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Viewer</span>
                            </div>
                        </div>
                    </div>

                    {/* COMMENT SENTIMENT OVERVIEW BAR */}
                    <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div>
                                <h2 className="text-sm font-black text-slate-900 tracking-tight">User Comment Sentiment Analysis</h2>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">✦ Audience mood across previous 4 months ({sentimentStats.totalComments} comments)</p>
                            </div>
                            <button 
                                onClick={() => setMainViewTab('comments')}
                                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                View Comments List <ExternalLink size={12} />
                            </button>
                        </div>

                        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex mb-3">
                            <div style={{ width: `${sentimentStats.goodPct}%` }} className="bg-emerald-500 h-full transition-all duration-500"></div>
                            <div style={{ width: `${sentimentStats.neutralPct}%` }} className="bg-amber-400 h-full transition-all duration-500"></div>
                            <div style={{ width: `${sentimentStats.badPct}%` }} className="bg-rose-500 h-full transition-all duration-500"></div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Good: {sentimentStats.good} ({sentimentStats.goodPct}%)</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Neutral: {sentimentStats.neutral} ({sentimentStats.neutralPct}%)</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Bad: {sentimentStats.bad} ({sentimentStats.badPct}%)</span>
                        </div>
                    </div>

                    {/* SEARCH INPUT */}
                    <div className="max-w-3xl mx-auto mb-4 flex items-center justify-end">
                        <div className="relative w-full sm:w-60">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by keywords..."
                                className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-400 w-full bg-white shadow-sm font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* TOP 5 TRENDING BOARD WITH PUBLISH DATES */}
                    <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                            <div>
                                <h2 className="text-sm font-black text-slate-900 tracking-tight">Top 5 Trending Content · Previous 4 Months</h2>
                            </div>
                            <div className="bg-[#FEF4EF] text-[#D85C2E] text-[10px] font-black px-2.5 py-1 rounded-xl border border-[#FCE1D4] tracking-wider uppercase">
                                {posts2xAboveAvgCount} Posts ≥ 2x Avg
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {top5Trending.map((post, index) => {
                                const viewsRaw = post.metrics?.impressions || 0;
                                const formattedViews = viewsRaw >= 1000000 ? `${(viewsRaw / 1000000).toFixed(1)}M` : viewsRaw >= 1000 ? `${(viewsRaw / 1000).toFixed(1)}K` : viewsRaw;
                                const isPlanned = savedPlans[post.id] || false;
                                const platformName = post.platform === 'youtube' ? 'YouTube' : 'Facebook';
                                
                                // 🟢 POST / VIDEO PUBLISH DATE
                                const publishDate = formatDateDisplay(post.postedAt || post.created_time);

                                return (
                                    <div key={index} className="flex items-center justify-between py-4 first:pt-1 last:pb-1 group hover:bg-slate-50/50 px-2 -mx-2 rounded-xl transition duration-150">
                                        <div className="pr-4 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${post.platform === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {platformName}
                                                </span>
                                                <span className="font-bold text-slate-800 text-[13px] leading-snug line-clamp-1">
                                                    {post.message || post.title || '"Multimedia Content Update"'}
                                                </span>
                                            </div>
                                            
                                            {/* 🟢 DATES & METRICS DISPLAY */}
                                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 flex-wrap">
                                                <span className="text-[#D85C2E] font-extrabold">{formattedViews} Views</span>
                                                <span className="text-slate-300 font-normal">·</span>
                                                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                                    📅 {post.platform === 'youtube' ? 'Video Publish Date' : 'Post Date'}: <strong>{publishDate}</strong>
                                                </span>
                                                <span className="text-slate-200">|</span>
                                                <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-semibold flex items-center gap-0.5">
                                                    View Original <ExternalLink size={10} />
                                                </a>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => setSavedPlans(p => ({...p, [post.id]: !isPlanned}))} 
                                            className={`text-[11px] font-black px-4 py-2 rounded-xl transition border shrink-0 tracking-wide ${isPlanned ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'}`}
                                        >
                                            {isPlanned ? '✓ Plan Saved' : 'More Like This'}
                                        </button>
                                    </div>
                                );
                            })}

                            {rawFilteredDataset.length === 0 && !isSyncing && (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold">No content found within the selected 4-month timeframe.</div>
                            )}
                        </div>
                    </div>

                    {/* 5 LATEST POSTS / VIDEOS TIMELINE */}
                    <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                            <div>
                                <h2 className="text-sm font-black text-slate-900 tracking-tight">5 Latest Updates Timeline</h2>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">✦ Chronological order of recently published posts and videos</p>
                            </div>
                            <div className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-xl border border-slate-200 tracking-wider uppercase">
                                Timeline Order
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {latest5Posts.map((post, index) => {
                                const viewsRaw = post.metrics?.impressions || 0;
                                const formattedViews = viewsRaw >= 1000000 ? `${(viewsRaw / 1000000).toFixed(1)}M` : viewsRaw >= 1000 ? `${(viewsRaw / 1000).toFixed(1)}K` : viewsRaw;
                                const isPlanned = savedPlans[`latest_${post.id}`] || false;
                                const platformName = post.platform === 'youtube' ? 'YouTube' : 'Facebook';
                                const publishDate = formatDateDisplay(post.postedAt || post.created_time);

                                return (
                                    <div key={index} className="flex items-center justify-between py-4 first:pt-1 last:pb-1 group hover:bg-slate-50/50 px-2 -mx-2 rounded-xl transition duration-150">
                                        <div className="pr-4 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${post.platform === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {platformName}
                                                </span>
                                                <span className="font-bold text-slate-800 text-[13px] leading-snug line-clamp-1">
                                                    {post.message || post.title || '"Multimedia Content Update"'}
                                                </span>
                                            </div>
                                            
                                            {/* 🟢 PUBLISH DATE DISPLAY */}
                                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 flex-wrap">
                                                <span className="text-[#D85C2E] font-extrabold">{formattedViews} Views</span>
                                                <span className="text-slate-300 font-normal">·</span>
                                                <span className="text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                                    📅 {post.platform === 'youtube' ? 'Video Publish Date' : 'Post Date'}: <strong>{publishDate}</strong>
                                                </span>
                                                <span className="text-slate-200">|</span>
                                                <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-semibold flex items-center gap-0.5">
                                                    View Content <ExternalLink size={10} />
                                                </a>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => setSavedPlans(p => ({...p, [`latest_${post.id}`]: !isPlanned}))} 
                                            className={`text-[11px] font-black px-4 py-2 rounded-xl transition border shrink-0 tracking-wide ${isPlanned ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'}`}
                                        >
                                            {isPlanned ? '✓ Saved' : 'Track Plan'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* 🟢 VIEW TAB 2: USER COMMENTS TAB */}
            {mainViewTab === 'comments' && (
                <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                        <div>
                            <h2 className="text-base font-black text-slate-900 tracking-tight">Audience Comments & Sentiment Grades</h2>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">Showing comments from posts/videos within the previous 4 months</p>
                        </div>

                        {/* SENTIMENT GRADE FILTER BUTTONS */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setSentimentFilter('all')}
                                className={`px-3 py-1 text-xs font-black rounded-lg transition ${sentimentFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                            >
                                All ({sentimentStats.totalComments})
                            </button>
                            <button
                                onClick={() => setSentimentFilter('good')}
                                className={`px-3 py-1 text-xs font-black rounded-lg transition ${sentimentFilter === 'good' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-600'}`}
                            >
                                Good ({sentimentStats.good})
                            </button>
                            <button
                                onClick={() => setSentimentFilter('neutral')}
                                className={`px-3 py-1 text-xs font-black rounded-lg transition ${sentimentFilter === 'neutral' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-amber-600'}`}
                            >
                                Neutral ({sentimentStats.neutral})
                            </button>
                            <button
                                onClick={() => setSentimentFilter('bad')}
                                className={`px-3 py-1 text-xs font-black rounded-lg transition ${sentimentFilter === 'bad' ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-600'}`}
                            >
                                Bad ({sentimentStats.bad})
                            </button>
                        </div>
                    </div>

                    {/* SEARCH INPUT */}
                    <div className="mb-4">
                        <div className="relative w-full">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search comments by user, text, or post title..."
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 w-full bg-slate-50/50 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* COMMENTS LIST */}
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                        {filteredUserComments.map((comment, index) => {
                            const sentimentUpper = (comment.sentiment || 'Neutral').toUpperCase();
                            
                            let badgeStyle = 'bg-slate-100 text-slate-700';
                            let IconComponent = Minus;
                            if (sentimentUpper === 'GOOD') {
                                badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                                IconComponent = ThumbsUp;
                            } else if (sentimentUpper === 'BAD') {
                                badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
                                IconComponent = ThumbsDown;
                            } else {
                                badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
                            }

                            return (
                                <div key={comment.id || index} className="py-4 first:pt-1 last:pb-1">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-xs text-slate-900">{comment.user}</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${comment.platform === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {comment.platform === 'youtube' ? 'YouTube' : 'Facebook'}
                                            </span>
                                        </div>

                                        {/* SENTIMENT GRADE BADGE */}
                                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 uppercase ${badgeStyle}`}>
                                            <IconComponent size={10} /> {comment.sentiment}
                                        </span>
                                    </div>

                                    {/* COMMENT TEXT */}
                                    <p className="text-xs text-slate-700 leading-relaxed font-medium mb-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                                        "{comment.text}"
                                    </p>

                                    {/* PARENT POST REF */}
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                        <span className="truncate max-w-[350px]">
                                            On: <strong className="text-slate-600">{comment.postTitle}</strong>
                                        </span>
                                        <span>📅 {formatDateDisplay(comment.date)}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredUserComments.length === 0 && (
                            <div className="py-16 text-center text-slate-400 text-xs font-bold">
                                No comments found matching the current search query or sentiment filter.
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}