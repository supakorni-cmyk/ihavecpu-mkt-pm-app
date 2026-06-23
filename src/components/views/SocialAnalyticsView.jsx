// src/components/views/SocialAnalyticsView.jsx
import React, { useState, useMemo } from 'react';

export default function SocialAnalyticsView() {
    const [pastedLinks, setPastedLinks] = useState('');
    const [posts, setPosts] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Search & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 5;

    // 🟢 CORE API SYNC CONNECTION
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
            setCurrentPage(1); 
        } catch (error) {
            console.error("Failed to sync Facebook data:", error);
            alert(`Sync Failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    // 🟢 DYNAMIC SEARCH FILTER
    // Filters posts locally in real-time by message content or link text
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const content = (post.message || '').toLowerCase();
            const url = (post.permalink || '').toLowerCase();
            const query = searchTerm.toLowerCase();
            return content.includes(query) || url.includes(query);
        });
    }, [posts, searchTerm]);

    // 🟢 LIVE METRIC AGGREGATIONS
    // Recalculates summary blocks on the fly based on filtered results
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

    // 🟢 GOOGLE SHEETS COMPATIBLE EXPORT ENGINE
    const handleExportToSheets = () => {
        if (filteredPosts.length === 0) return alert("No data available to export!");

        // Define clean tabular column headers
        const headers = ["Post Content", "Link", "Posted At", "Reach", "Impressions", "Engagement", "Link Clicks", "Reactions", "Comments", "Shares"];
        
        // Format rows and escape quote characters safely
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

        // Combine arrays with a UTF-8 Byte Order Mark (BOM) to support regional text characters natively
        const csvContent = "\uFEFF" + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `FB_Analytics_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 🟢 PAGINATION SPLITTING CALCULATOR
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;

    return (
        <div className="p-6 bg-gray-50 min-h-screen overflow-y-auto">
            {/* Header Layout Component */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    🔵 Custom Post Tracker
                </h1>
                <p className="text-gray-500 text-sm">Paste specific Facebook post links to track their performance metrics natively.</p>
            </div>

            {/* Link Input Dashboard Card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4 items-start">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-600 mb-2 tracking-wider uppercase">
                        🔗 Paste Facebook Links (One Per Line)
                    </label>
                    <textarea
                        rows={4}
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="https://www.facebook.com/yourpage/posts/..."
                        value={pastedLinks}
                        onChange={(e) => setPastedLinks(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleSyncLinks}
                    disabled={isSyncing}
                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-sm flex flex-col items-center justify-center gap-1 transition shadow-sm disabled:opacity-50 min-w-[140px]"
                >
                    <span>{isSyncing ? 'Pulling Data...' : 'Fetch Analytics'}</span>
                </button>
            </div>

            {/* Upper Performance Aggregate Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Reach</span>
                    <span className="text-2xl font-black text-gray-800">{totals.reach.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Impressions</span>
                    <span className="text-2xl font-black text-gray-800">{totals.impressions.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Engagement</span>
                    <span className="text-2xl font-black text-gray-800">{totals.engagement.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Link Clicks</span>
                    <span className="text-2xl font-black text-gray-800">{totals.clicks.toLocaleString()}</span>
                </div>
            </div>

            {/* Interactive Data Control Strip */}
            <div className="bg-white border border-gray-100 rounded-t-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-800">Synced Posts Performance</h2>
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Showing {filteredPosts.length > 0 ? indexOfFirstPost + 1 : 0}-{Math.min(indexOfLastPost, filteredPosts.length)} of {filteredPosts.length}
                    </span>
                </div>
                
                {/* 🟢 SEARCH BOX & EXPORT UTILITIES COMPONENT LAYOUT */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search text or links..."
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <button
                        onClick={handleExportToSheets}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
                    >
                        📊 Export to Sheets / CSV
                    </button>
                </div>
            </div>

            {/* Bounded Scroll Container to Prevent Pagination Clipping */}
            <div className="bg-white border-x border-gray-100 overflow-x-auto overflow-y-auto max-h-[calc(100vh-380px)]">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left">Post Content</th>
                            <th className="px-6 py-3 text-center">Reach</th>
                            <th className="px-6 py-3 text-center">Impressions</th>
                            <th className="px-6 py-3 text-center">Interactions</th>
                            <th className="px-6 py-3 text-center">Clicks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                        {currentPosts.map((post, i) => (
                            <tr key={i} className="hover:bg-gray-50/50 transition">
                                <td className="px-6 py-4 max-w-md">
                                    <div className="font-semibold text-gray-900 line-clamp-2 mb-1">{post.message || 'Video / Photo Post'}</div>
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                        <span>{post.postedAt ? new Date(post.postedAt).toLocaleDateString() : 'Date N/A'}</span>
                                        <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-medium">View Post ↗</a>
                                    </div>
                                    {post.error && <div className="text-xs text-red-500 font-medium mt-1">⚠️ {post.error}</div>}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-gray-900">{(post.metrics?.reach || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center font-bold text-gray-900">{(post.metrics?.impressions || 0).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                                        <span className="bg-pink-50 text-pink-600 px-2 py-1 rounded-md">👍 {post.metrics?.reactions || 0}</span>
                                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md">💬 {post.metrics?.comments || 0}</span>
                                        <span className="bg-green-50 text-green-600 px-2 py-1 rounded-md">🔄 {post.metrics?.shares || 0}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-amber-600">{(post.metrics?.clicks || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                        {filteredPosts.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">No synced record tracking profiles match your criteria.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Anchored Persistent Pagination Panel */}
            <div className="bg-white border border-gray-100 rounded-b-xl px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
                >
                    ❮ Previous
                </button>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Page <span className="text-blue-600">{currentPage}</span> of {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
                >
                    Next ❯
                </button>
            </div>
        </div>
    );
}