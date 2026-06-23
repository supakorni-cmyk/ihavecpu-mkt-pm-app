// src/components/views/FacebookPostTrackerView.jsx
import React, { useState, useMemo } from 'react';

export default function FacebookPostTrackerView() {
    const [pastedLinks, setPastedLinks] = useState('');
    const [posts, setPosts] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 5;

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
            alert(`Sync Failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const content = (post.message || '').toLowerCase();
            const url = (post.permalink || '').toLowerCase();
            return content.includes(searchTerm.toLowerCase()) || url.includes(searchTerm.toLowerCase());
        });
    }, [posts, searchTerm]);

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

    const handleExportToSheets = () => {
        if (filteredPosts.length === 0) return alert("No data available to export!");
        const headers = ["Post Content", "Link", "Posted At", "Reach", "Impressions", "Engagement", "Link Clicks", "Reactions", "Comments", "Shares"];
        const csvRows = filteredPosts.map(post => {
            const safeMessage = (post.message || 'Video / Photo Post').replace(/"/g, '""');
            return [
                `"${safeMessage}"`, `"${post.permalink || ''}"`, `"${post.postedAt ? new Date(post.postedAt).toLocaleDateString() : 'N/A'}"`,
                post.metrics?.reach || 0, post.metrics?.impressions || 0, post.metrics?.engagement || 0,
                post.metrics?.clicks || 0, post.metrics?.reactions || 0, post.metrics?.comments || 0, post.metrics?.shares || 0
            ].join(',');
        });
        const csvContent = "\uFEFF" + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `FB_Analytics_Export.csv`);
        link.click();
    };

    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;

    return (
        <div className="p-6 bg-slate-50 min-h-screen overflow-y-auto w-full text-slate-800">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">📊 Custom Post Link Tracker</h1>
                <p className="text-slate-500 text-sm mt-0.5">Paste specific Facebook post links to evaluate custom batch outputs manually.</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 mb-6 flex flex-col sm:flex-row gap-4 items-stretch shadow-sm">
                <div className="flex-1">
                    <textarea
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 font-mono bg-slate-50/50"
                        placeholder="Paste Facebook URLs here (one per line)..."
                        value={pastedLinks}
                        onChange={(e) => setPastedLinks(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleSyncLinks} disabled={isSyncing}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-xl text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[160px]"
                >
                    {isSyncing ? 'Syncing API...' : 'Fetch Analytics'}
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Reach</span>
                    <span className="text-2xl font-black text-slate-800">{totals.reach.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Impressions</span>
                    <span className="text-2xl font-black text-slate-800">{totals.impressions.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Interactions</span>
                    <span className="text-2xl font-black text-slate-800">{totals.engagement.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Link Clicks</span>
                    <span className="text-2xl font-black text-slate-800">{totals.clicks.toLocaleString()}</span>
                </div>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-t-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Showing {filteredPosts.length > 0 ? indexOfFirstPost + 1 : 0}-{Math.min(indexOfLastPost, filteredPosts.length)} of {filteredPosts.length} Records</span>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input
                        type="text" placeholder="Search..."
                        className="border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500 bg-slate-50/50 w-full md:w-56"
                        value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <button onClick={handleExportToSheets} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap shadow-sm">📊 Open in Sheets</button>
                </div>
            </div>
            <div className="bg-white border-x border-slate-200/80 overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)]">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/80 text-slate-400 font-bold text-xs uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3.5 text-left">Post Details</th>
                            <th className="px-6 py-3.5 text-center">Reach</th>
                            <th className="px-6 py-3.5 text-center">Impressions</th>
                            <th className="px-6 py-3.5 text-center">Engagement</th>
                            <th className="px-6 py-3.5 text-center">Clicks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {currentPosts.map((post, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition">
                                <td className="px-6 py-4 max-w-md">
                                    <div className="font-bold text-slate-800 line-clamp-2 mb-1">{post.message}</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2">
                                        <span>{post.postedAt ? new Date(post.postedAt).toLocaleDateString() : 'Date N/A'}</span>
                                        <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold">Open Post ↗</a>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-black">{(post.metrics?.reach || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center font-black">{(post.metrics?.impressions || 0).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold">
                                        <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100">👍 {post.metrics?.reactions || 0}</span>
                                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">💬 {post.metrics?.comments || 0}</span>
                                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">🔄 {post.metrics?.shares || 0}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-black text-amber-600">{(post.metrics?.clicks || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-b-2xl px-5 py-3 flex items-center justify-between shadow-sm">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="border border-slate-200 rounded-xl px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                <span className="text-xs font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="border border-slate-200 rounded-xl px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
        </div>
    );
}