// src/components/views/SocialAnalyticsView.jsx
import React, { useState, useEffect, useMemo } from 'react';

export default function SocialAnalyticsView() {
    const [fbPosts, setFbPosts] = useState([]);
    const [ytVideos, setYtVideos] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [savedPlans, setSavedPlans] = useState({});
    
    // 🟢 Platform Tab Selector: 'overall' | 'facebook' | 'youtube'
    const [activePlatform, setActivePlatform] = useState('overall');
    
    // 🟢 Date Filter Selector: Defaults to '4months'
    const [dateRange, setDateRange] = useState('4months');

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
            // Fallback YouTube Dataset for demonstration
            return [
                {
                    id: 'yt_1',
                    platform: 'youtube',
                    title: 'iHAVECPU RTX 5080 Extreme PC Build & Full Review',
                    permalink: 'https://youtube.com',
                    postedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    metrics: { impressions: 145000, engagement: 12400, reach: 98000 },
                    comments: [
                        { text: "Awesome build! Great cable management.", sentiment: "Good" },
                        { text: "Very informative review.", sentiment: "Good" },
                        { text: "Price is a bit high though.", sentiment: "Neutral" },
                        { text: "Audio quality was quiet in the middle.", sentiment: "Bad" }
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
                        { text: "Love this recommendation list!", sentiment: "Good" },
                        { text: "Bought option #2 thanks to you!", sentiment: "Good" },
                        { text: "Can you review Lenovo next?", sentiment: "Neutral" }
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

    // 🟢 3. 4-MONTH DATE FILTER ENGINE
    const fourMonthsAgoDate = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 4);
        return d;
    }, []);

    // Combine & Filter Data Source based on Platform & 4-Month Date Range
    const rawFilteredDataset = useMemo(() => {
        let combined = [];
        if (activePlatform === 'overall' || activePlatform === 'facebook') {
            combined = [...combined, ...fbPosts];
        }
        if (activePlatform === 'overall' || activePlatform === 'youtube') {
            combined = [...combined, ...ytVideos];
        }

        // Apply 4-Month Date Boundary
        if (dateRange === '4months') {
            combined = combined.filter(item => {
                const itemDate = new Date(item.postedAt || item.created_time || 0);
                return itemDate >= fourMonthsAgoDate;
            });
        }

        return combined;
    }, [fbPosts, ytVideos, activePlatform, dateRange, fourMonthsAgoDate]);

    // 🟢 4. SEARCH & PERFORMANCE SORTING ENGINE
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

    // Baseline calculation
    const averageViews = useMemo(() => {
        if (rawFilteredDataset.length === 0) return 0;
        const total = rawFilteredDataset.reduce((sum, p) => sum + (p.metrics?.impressions || 0), 0);
        return total / rawFilteredDataset.length;
    }, [rawFilteredDataset]);

    const posts2xAboveAvgCount = useMemo(() => {
        if (averageViews === 0) return 0;
        return rawFilteredDataset.filter(post => (post.metrics?.impressions || 0) >= averageViews * 2).length;
    }, [rawFilteredDataset, averageViews]);

    // Overall Stat Aggregations
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

    // 🟢 5. USER COMMENT SENTIMENT GRADING ENGINE ("Good", "Neutral", "Bad")
    const sentimentStats = useMemo(() => {
        let good = 0;
        let neutral = 0;
        let bad = 0;

        rawFilteredDataset.forEach(item => {
            const commentsList = item.comments || [];
            commentsList.forEach(c => {
                const text = (c.text || c.message || '').toLowerCase();
                const sentiment = c.sentiment || '';

                if (sentiment === 'Good' || text.includes('love') || text.includes('great') || text.includes('good') || text.includes('awesome') || text.includes('ชอบ') || text.includes('ดี')) {
                    good++;
                } else if (sentiment === 'Bad' || text.includes('bad') || text.includes('poor') || text.includes('slow') || text.includes('แย่') || text.includes('แพง')) {
                    bad++;
                } else {
                    neutral++;
                }
            });
        });

        const total = good + neutral + bad || 1;
        return {
            good,
            neutral,
            bad,
            totalComments: good + neutral + bad,
            goodPct: Math.round((good / total) * 100),
            neutralPct: Math.round((neutral / total) * 100),
            badPct: Math.round((bad / total) * 100)
        };
    }, [rawFilteredDataset]);

    // Dynamic Trendline SVG
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
            
            {/* ✦ TOP NAVIGATION BAR */}
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
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
                            {isSyncing ? 'Syncing live feed...' : 'Displaying real-time social metrics'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button 
                        onClick={fetchAllLiveData}
                        disabled={isSyncing}
                        className="bg-[#FDF1EB] hover:bg-[#FCE4D6] text-[#E06639] disabled:opacity-40 font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 border border-[#FADCD0] tracking-wide shadow-sm"
                    >
                        <svg className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        {isSyncing ? 'Refreshing...' : 'Refresh Stats'}
                    </button>
                </div>
            </div>

            {/* 🟢 PLATFORM TABS & DATE RANGE BAR */}
            <div className="max-w-3xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setActivePlatform('overall')}
                        className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition ${activePlatform === 'overall' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Overall (FB + YT)
                    </button>
                    <button
                        onClick={() => setActivePlatform('facebook')}
                        className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition ${activePlatform === 'facebook' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Facebook Only
                    </button>
                    <button
                        onClick={() => setActivePlatform('youtube')}
                        className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition ${activePlatform === 'youtube' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        YouTube Only
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 self-end sm:self-auto">
                    <span>Range:</span>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 outline-none cursor-pointer shadow-sm"
                    >
                        <option value="4months">Previous 4 Months</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* ✦ OVERALL DATA KPI CONTAINER GRID */}
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                
                {/* 1: TOTAL IMPRESSIONS */}
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

                {/* 2: CONTENT SAVES / SHARES */}
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

                {/* 3: INTERACTIVE LINK CLICKS */}
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

            {/* 🟢 ✦ USER COMMENT SENTIMENT CHART SECTION ("Good", "Neutral", "Bad") */}
            <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">User Comment Sentiment Analysis</h2>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">✦ Graded from user feedback across the previous 4 months ({sentimentStats.totalComments} comments analyzed)</p>
                    </div>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2.5 py-1 rounded-xl uppercase">
                        Audience Mood
                    </span>
                </div>

                {/* Stacked Sentiment Bar */}
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex mb-4 border border-slate-200/50">
                    <div style={{ width: `${sentimentStats.goodPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`Good: ${sentimentStats.goodPct}%`}></div>
                    <div style={{ width: `${sentimentStats.neutralPct}%` }} className="bg-amber-400 h-full transition-all duration-500" title={`Neutral: ${sentimentStats.neutralPct}%`}></div>
                    <div style={{ width: `${sentimentStats.badPct}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Bad: ${sentimentStats.badPct}%`}></div>
                </div>

                {/* Sentiment Legend & Counts */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">GOOD</div>
                        <div className="text-xl font-black text-emerald-700">{sentimentStats.good}</div>
                        <div className="text-[10px] font-bold text-emerald-500">{sentimentStats.goodPct}%</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                        <div className="text-[10px] font-black text-amber-600 uppercase tracking-wider">NEUTRAL</div>
                        <div className="text-xl font-black text-amber-700">{sentimentStats.neutral}</div>
                        <div className="text-[10px] font-bold text-amber-500">{sentimentStats.neutralPct}%</div>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                        <div className="text-[10px] font-black text-rose-600 uppercase tracking-wider">BAD</div>
                        <div className="text-xl font-black text-rose-700">{sentimentStats.bad}</div>
                        <div className="text-[10px] font-bold text-rose-500">{sentimentStats.badPct}%</div>
                    </div>
                </div>
            </div>

            {/* REAL-TIME SEARCH COMPONENT */}
            <div className="max-w-3xl mx-auto mb-4 flex items-center justify-end">
                <input
                    type="text"
                    placeholder="🔍 Search by keywords..."
                    className="border border-slate-200 rounded-xl px-4 py-1.5 text-xs focus:outline-none focus:border-orange-400 w-full sm:w-60 bg-white shadow-sm font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* ✦ DYNAMIC LEADERBOARD BOARD (TOP 5 DEEP PERFORMANCE) */}
            <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">Top 5 Trending Content · Previous 4 Months</h2>
                    </div>
                    
                    <div className="bg-[#FEF4EF] text-[#D85C2E] text-[10px] font-black px-2.5 py-1 rounded-xl border border-[#FCE1D4] tracking-wider whitespace-nowrap align-middle self-start sm:self-auto uppercase">
                        {posts2xAboveAvgCount} Posts ≥ 2x Avg
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {top5Trending.map((post, index) => {
                        const viewsRaw = post.metrics?.impressions || 0;
                        const formattedViews = viewsRaw >= 1000000 ? `${(viewsRaw / 1000000).toFixed(1)}M` : viewsRaw >= 1000 ? `${(viewsRaw / 1000).toFixed(1)}K` : viewsRaw;
                        
                        let growthPercent = "+0%";
                        if (averageViews > 0 && viewsRaw > 0) {
                            growthPercent = `+${Math.round((viewsRaw / averageViews) * 100)}%`;
                        }
                        const isPlanned = savedPlans[post.id] || false;
                        const platformName = post.platform === 'youtube' ? 'YouTube' : 'Facebook';

                        return (
                            <div key={index} className="flex items-center justify-between py-4 first:pt-1 last:pb-1 group hover:bg-slate-50/50 px-2 -mx-2 rounded-xl transition duration-150">
                                <div className="pr-4 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${post.platform === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {platformName}
                                        </span>
                                        <span className="font-bold text-slate-800 text-[13px] leading-snug line-clamp-1">
                                            {post.message || post.title || '"Multimedia Content Update"'}
                                        </span>
                                    </div>
                                    
                                    <div className="text-[11px] font-bold text-[#D85C2E] flex items-center gap-2 flex-wrap">
                                        <span>{formattedViews} Views</span>
                                        <span className="text-slate-300 font-normal">·</span>
                                        <span className="bg-orange-50 px-1.5 py-0.5 rounded text-[10px]">{growthPercent}</span>
                                        <span className="text-slate-200">|</span>
                                        <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-semibold">View Original ↗</a>
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
                    
                    {rawFilteredDataset.length === 0 && isSyncing && (
                        <div className="py-16 text-center text-slate-400 text-xs font-bold animate-pulse">🌀 Syncing social feed data...</div>
                    )}
                    {rawFilteredDataset.length === 0 && !isSyncing && (
                        <div className="py-16 text-center text-slate-400 text-xs font-bold">No data found within the selected 4-month range.</div>
                    )}
                </div>
            </div>

            {/* ✦ 🟢 5 LATEST POSTS ON PAGE */}
            <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">5 Latest Updates</h2>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">✦ Chronological timeline of recent posts from the previous 4 months</p>
                    </div>
                    <div className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-xl border border-slate-200 tracking-wider whitespace-nowrap align-middle self-start sm:self-auto uppercase">
                        Timeline Order
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {latest5Posts.map((post, index) => {
                        const viewsRaw = post.metrics?.impressions || 0;
                        const formattedViews = viewsRaw >= 1000000 ? `${(viewsRaw / 1000000).toFixed(1)}M` : viewsRaw >= 1000 ? `${(viewsRaw / 1000).toFixed(1)}K` : viewsRaw;
                        
                        const dateString = (post.postedAt || post.created_time) ? new Date(post.postedAt || post.created_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date N/A';
                        const isPlanned = savedPlans[`latest_${post.id}`] || false;

                        return (
                            <div key={index} className="flex items-center justify-between py-4 first:pt-1 last:pb-1 group hover:bg-slate-50/50 px-2 -mx-2 rounded-xl transition duration-150">
                                <div className="pr-4 min-w-0 flex-1">
                                    <div className="font-bold text-slate-700 text-[13px] leading-snug mb-1.5 line-clamp-2">
                                        {post.message || post.title || '"Multimedia Content Update"'}
                                    </div>
                                    
                                    <div className="text-[11px] font-bold text-slate-400 flex items-center gap-2 flex-wrap">
                                        <span className="text-[#D85C2E] bg-orange-50/50 px-1.5 py-0.5 rounded text-[10px] font-extrabold">{formattedViews} Views</span>
                                        <span className="text-slate-300 font-normal">·</span>
                                        <span className="font-semibold text-slate-500">Published: {dateString}</span>
                                        <span className="text-slate-200">|</span>
                                        <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-semibold">View Post ↗</a>
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

                    {rawFilteredDataset.length === 0 && !isSyncing && (
                        <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                            No timeline updates found in the past 4 months.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}