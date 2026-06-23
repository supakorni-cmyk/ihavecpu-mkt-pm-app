// src/components/views/SocialAnalyticsView.jsx
import React, { useState, useMemo } from 'react';

export default function SocialAnalyticsView() {
    const [pastedLinks, setPastedLinks] = useState('');
    const [posts, setPosts] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Search & Pagination Controls
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 5;

    // 🟢 REAL DATA ENGINE: Connects straight to your Netlify serverless backend
    const handleSyncLinks = async () => {
        if (!pastedLinks.trim()) return alert("Please paste at least one Facebook link!");
        
        const linkArray = pastedLinks.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        setIsSyncing(true);
        try {
            const response = await fetch('/.netlify/functions/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: linkArray })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server responded with status ${response.status}`);
            }
            
            const data = await response.json();
            setPosts(data);
            setCurrentPage(1); // Reset to page 1 on new data pull
        } catch (error) {
            console.error("Failed to sync Facebook data:", error);
            alert(`Sync Failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    // 🟢 REAL-TIME SEARCH FILTER
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const content = (post.message || '').toLowerCase();
            const url = (post.permalink || '').toLowerCase();
            const query = searchTerm.toLowerCase();
            return content.includes(query) || url.includes(query);
        });
    }, [posts, searchTerm]);

    // 🟢 LIVE METRIC AGGREGATIONS
    const totals = useMemo(() => {
        return filteredPosts.reduce((acc, post) => {
            if (post.metrics) {
                acc.reach += post.metrics.reach || 0;
                acc.impressions += post.metrics.impressions || 0;
                acc.engagement += post.metrics.engagement || 0;
                acc.clicks += post.metrics.clicks || 0;
            }
            return acc;
        }, { reach: 0, impressions: 0, engagement: 0, clicks: 0 });
    }, [filteredPosts]);

    // 🟢 GOOGLE SHEETS CLEAN CSV EXPORT UTILITY
    const handleExportToSheets = () => {
        if (filteredPosts.length === 0) return alert("No data available to export!");

        const headers = ["Post Content", "Link", "Posted At", "Reach", "Impressions", "Engagement", "Link Clicks", "Reactions", "Comments", "Shares"];
        
        const csvRows = filteredPosts.map(post => {
            const safeMessage = (post.message || 'Video / Photo Post').replace(/"/g, '""');
            const safeUrl = (post.permalink || '').replace(/"/g, '""');
            const date = post.postedAt ? new Date(post.postedAt).toLocaleDateString() : 'N/A';
            
            return [
                `"${safeMessage}"`,
                `"${safeUrl}"`,
                `"${date}"`,
                post.metrics?.reach || 0,
                post.metrics?.impressions || 0,
                post.metrics?.engagement || 0,
                post.metrics?.clicks || 0,
                post.metrics?.reactions || 0,
                post.metrics?.comments || 0,
                post.metrics?.shares || 0
            ].join(',');
        });

        // Prepend UTF-8 BOM (\uFEFF) so Excel/Google Sheets reads Thai characters correctly
        const csvContent = "\uFEFF" + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Facebook_Metrics_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 🟢 PAGINATION HEIGHT BOUNDING CALCULATIONS
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;

    return (
        <div className="p-6 bg-slate-50 min-h-screen overflow-y-auto">
            
            {/* Header Content Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                        📊 Social Media Analytics Engine
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Track real performance indicators, media views, and insights directly via the Graph API.</p>
                </div>
            </div>

            {/* Input Data Control Panel */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 mb-6 flex flex-col md:flex-row gap-4 items-stretch">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        📥 Paste Facebook URLs (One Link Per Line)
                    </label>
                    <textarea
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 font-mono bg-slate-50/50"
                        placeholder="https://www.facebook.com/permalink.php?story_fbid=..."
                        value={pastedLinks}
                        onChange={(e) => setPastedLinks(e.target.value)}
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleSyncLinks}
                        disabled={isSyncing}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl text-sm transition shadow-sm disabled:opacity-40 h-[76px] flex items-center justify-center min-w-[160px]"
                    >
                        {isSyncing ? 'Processing API...' : 'Fetch Live Metrics'}
                    </button>
                </div>
            </div>

            {/* Live Numerical Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Reach</span>
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{totals.reach.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cumulative Impressions</span>
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{totals.impressions.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Interactions</span>
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{totals.engagement.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Link Clicks</span>
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{totals.clicks.toLocaleString()}</span>
                </div>
            </div>

            {/* Filter Strip Wrapper */}
            <div className="bg-white border border-slate-200/80 rounded-t-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-bold text-slate-800">Synced Data Log</h2>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {filteredPosts.length} Records Found
                    </span>
                </div>
                
                {/* Search and Sheets Export Elements */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search post content or URLs..."
                        className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64 bg-slate-50/50"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <button
                        onClick={handleExportToSheets}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                    >
                        📊 Open in Google Sheets
                    </button>
                </div>
            </div>

            {/* Scroll-Protected Dynamic Data Table */}
            <div className="bg-white border-x border-slate-200/80 overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)]">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/70 text-slate-400 font-bold text-xs uppercase tracking-wider sticky top-0 CambrianZone z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-3.5 text-left">Post Details</th>
                            <th className="px-6 py-3.5 text-center">Reach</th>
                            <th className="px-6 py-3.5 text-center">Impressions</th>
                            <th className="px-6 py-3.5 text-center">Public Engagement</th>
                            <th className="px-6 py-3.5 text-center">Link Clicks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {currentPosts.map((post, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition duration-150">
                                <td className="px-6 py-4 max-w-md">
                                    <div className="font-bold text-slate-800 line-clamp-2 mb-1 leading-snug">
                                        {post.message || 'Video / Photo Post'}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2.5">
                                        <span>{post.postedAt ? new Date(post.postedAt).toLocaleDateString() : 'Date N/A'}</span>
                                        <span className="text-slate-200">|</span>
                                        <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5">
                                            Open Facebook ↗
                                        </a>
                                    </div>
                                    {post.error && (
                                        <div className="text-xs text-rose-500 font-semibold bg-rose-50/50 px-2 py-1 rounded-md border border-rose-100 mt-2 inline-block">
                                            ⚠️ Error: {post.error}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center font-black text-slate-800">
                                    {(post.metrics?.reach || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center font-black text-slate-800">
                                    {(post.metrics?.impressions || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2 text-[11px] font-bold">
                                        <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-lg border border-rose-100">👍 {(post.metrics?.reactions || 0).toLocaleString()}</span>
                                        <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100">💬 {(post.metrics?.comments || 0).toLocaleString()}</span>
                                        <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100">🔄 {(post.metrics?.shares || 0).toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-black text-amber-600">
                                    {(post.metrics?.clicks || 0).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {filteredPosts.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium">
                                    No tracked post metrics found matching your current parameters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Anchored Pagination Control Block */}
            <div className="bg-white border border-slate-200/80 rounded-b-2xl px-5 py-3.5 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:hover:bg-transparent shadow-sm"
                >
                    ❮ Previous
                </button>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Page <span className="text-blue-600 font-black">{currentPage}</span> of {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:hover:bg-transparent shadow-sm"
                >
                    Next ❯
                </button>
            </div>
        </div>
    );
}