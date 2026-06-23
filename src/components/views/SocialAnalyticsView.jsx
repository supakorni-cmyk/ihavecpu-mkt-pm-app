// src/components/views/SocialAnalyticsView.jsx
import React, { useState, useEffect, useMemo } from 'react';

export default function SocialAnalyticsView() {
    const [posts, setPosts] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [savedPlans, setSavedPlans] = useState({});

    // 🟢 1. AUTOMATED AUTO-FETCHING SYSTEM
    const fetchLiveContentData = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/.netlify/functions/api');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error status: ${response.status}`);
            }
            const data = await response.json();
            setPosts(data);
        } catch (error) {
            console.error("Auto fetch analytics mapping failed:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchLiveContentData();
    }, []);

    // 🟢 2. FILTER & PERFORMANCE SORTING ENGINE (Highest Views First)
    const processedPosts = useMemo(() => {
        const filtered = posts.filter(post => {
            const content = (post.message || '').toLowerCase();
            const url = (post.permalink || '').toLowerCase();
            const query = searchTerm.toLowerCase();
            return content.includes(query) || url.includes(query);
        });

        return [...filtered].sort((a, b) => {
            const viewsA = a.metrics?.impressions || 0;
            const viewsB = b.metrics?.impressions || 0;
            return viewsB - viewsA;
        });
    }, [posts, searchTerm]);

    // Slice to get top 5 trending content profiles
    const top5Posts = useMemo(() => {
        return processedPosts.slice(0, 5);
    }, [processedPosts]);

    // Calculate baseline average views of the entire dataset
    const averageViews = useMemo(() => {
        if (posts.length === 0) return 0;
        const total = posts.reduce((sum, p) => sum + (p.metrics?.impressions || 0), 0);
        return total / posts.length;
    }, [posts]);

    // 🟢 REAL DYNAMIC CALCULATION: Count posts performing 2x or more above page baseline average
    const posts2xAboveAvgCount = useMemo(() => {
        if (averageViews === 0) return 0;
        return posts.filter(post => (post.metrics?.impressions || 0) >= averageViews * 2).length;
    }, [posts, averageViews]);

    // 🟢 3. REAL OVERALL PERFORMANCE AGGREGATIONS
    const overallStats = useMemo(() => {
        return posts.reduce((acc, post) => {
            if (post.metrics) {
                acc.views += post.metrics.impressions || 0;
                acc.engagements += post.metrics.engagement || 0; 
                acc.reachs += post.metrics.reach || 0; 
            }
            return acc;
        }, { views: 0, engagements: 0, reachs: 0 });
    }, [posts]);

    // 🟢 4. DYNAMIC VECTOR TRENDLINE SVG GENERATOR
    const generateTrendlinePath = (metricKey) => {
        if (posts.length < 2) return "M0,15 Q50,15 100,15"; 
        const samplePosts = [...posts].slice(-8).reverse(); 
        const maxVal = Math.max(...samplePosts.map(p => p.metrics?.[metricKey] || 0), 1);
        
        const points = samplePosts.map((p, index) => {
            const x = (index / (samplePosts.length - 1)) * 100;
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
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">FACEBOOK ANALYTICS</h1>
                            <span className="text-slate-400 text-[10px] font-bold px-1.5 py-0.5 border border-slate-200 bg-slate-50 rounded-md">AUTOMATED API</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {isSyncing ? 'Syncing live feed...' : 'Latest stats updated automatically from page feed'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button 
                        onClick={fetchLiveContentData}
                        disabled={isSyncing}
                        className="bg-[#FDF1EB] hover:bg-[#FCE4D6] text-[#E06639] disabled:opacity-40 font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 border border-[#FADCD0] tracking-wide shadow-sm"
                    >
                        <svg className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        {isSyncing ? 'Refreshing...' : 'Refresh Live Stats'}
                    </button>
                </div>
            </div>

            {/* SUBTITLE */}
            <div className="max-w-3xl mx-auto mb-6">
                <p className="text-xs font-bold text-slate-400 pl-11">See which content works, which doesn't, and know what to do next from your page.</p>
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
            <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">Top 5 Trending Content · Last 7 Days</h2>
                    </div>
                    
                    {/* 🟢 FIXED: REAL LIVE CALCULATED INDICATOR REPLACED HARCODED TEXT */}
                    <div className="bg-[#FEF4EF] text-[#D85C2E] text-[10px] font-black px-2.5 py-1 rounded-xl border border-[#FCE1D4] tracking-wider whitespace-nowrap align-middle self-start sm:self-auto uppercase">
                        {posts2xAboveAvgCount} Posts ≥ 2x Avg
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {top5Posts.map((post, index) => {
                        const viewsRaw = post.metrics?.impressions || 0;
                        const formattedViews = viewsRaw >= 1000000 ? `${(viewsRaw / 1000000).toFixed(1)}M` : viewsRaw >= 1000 ? `${(viewsRaw / 1000).toFixed(1)}K` : viewsRaw;
                        
                        let growthPercent = "+0%";
                        if (averageViews > 0 && viewsRaw > 0) {
                            growthPercent = `+${Math.round((viewsRaw / averageViews) * 100)}%`;
                        }
                        const isPlanned = savedPlans[post.id] || false;

                        return (
                            <div key={index} className="flex items-center justify-between py-4 first:pt-1 last:pb-1 group hover:bg-slate-50/50 px-2 -mx-2 rounded-xl transition duration-150">
                                <div className="pr-4 min-w-0 flex-1">
                                    <div className="font-bold text-slate-800 text-[13px] leading-snug mb-1.5 line-clamp-2">
                                        {post.message ? `"${post.message}"` : '"Image or Video Multimedia Post from Page"'}
                                    </div>
                                    
                                    <div className="text-[11px] font-bold text-[#D85C2E] flex items-center gap-2 flex-wrap">
                                        <span>{formattedViews} Views</span>
                                        <span className="text-slate-300 font-normal">·</span>
                                        <span className="bg-orange-50 px-1.5 py-0.5 rounded text-[10px]">{growthPercent}</span>
                                        <span className="text-slate-200">|</span>
                                        <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-semibold">View Original Post ↗</a>
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
                    
                    {posts.length === 0 && isSyncing && (
                        <div className="py-16 text-center text-slate-400 text-xs font-bold animate-pulse">🌀 Downloading your page feed data...</div>
                    )}
                    {posts.length === 0 && !isSyncing && (
                        <div className="py-16 text-center text-slate-400 text-xs font-bold">No data in the ranking system yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}