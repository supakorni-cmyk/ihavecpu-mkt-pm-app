// src/components/views/SocialAnalyticsView.jsx
import React, { useState } from 'react';
import { 
  Facebook, BarChart3, Users, Eye, 
  ThumbsUp, MessageCircle, Share2, MousePointerClick, RefreshCw, ExternalLink,
  Link as LinkIcon, AlertCircle, Heart, ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatDate } from '../../utils/constants';

const SocialAnalyticsView = () => {
    const [posts, setPosts] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // State to hold the pasted links
    const [pastedLinks, setPastedLinks] = useState("");

    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 5;

    // --- AGGREGATED STATS (Calculated from ALL posts) ---
    const validPosts = posts.filter(p => p.metrics !== null && !p.error);
    const totalReach = validPosts.reduce((sum, p) => sum + p.metrics.reach, 0);
    const totalImpressions = validPosts.reduce((sum, p) => sum + p.metrics.impressions, 0);
    const totalEngagement = validPosts.reduce((sum, p) => sum + p.metrics.engagement, 0);
    const totalClicks = validPosts.reduce((sum, p) => sum + p.metrics.clicks, 0);

    // --- PAGINATION LOGIC ---
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    // This slices the main array to only show the 5 posts for the current page
    const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost);
    const totalPages = Math.ceil(posts.length / postsPerPage);

    const handleSyncLinks = async () => {
        if (!pastedLinks.trim()) return alert("Please paste at least one Facebook link!");
        
        const linkArray = pastedLinks.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        setIsSyncing(true);
        try {
            const response = await fetch('/api/facebook-custom-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: linkArray })
            });
            
            if (!response.ok) throw new Error("Network response was not ok");
            
            const data = await response.json();
            setPosts(data);
            setCurrentPage(1); // 🟢 Reset to page 1 every time we fetch new data
        } catch (error) {
            console.error("Failed to sync Facebook data:", error);
            alert("Could not pull data. Ensure your Node.js backend is running and the URL is correct!");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-gray-50 p-8 font-sans relative">
            {/* HEADER */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-200">
                            <Facebook size={32} />
                        </div>
                        Custom Post Tracker
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium text-base">Paste specific Facebook post links to track their performance.</p>
                </div>
            </div>

            {/* LINK INPUT COMMAND CENTER */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                    <LinkIcon size={18} className="text-blue-500"/> Paste Facebook Links (One per line)
                </label>
                <div className="flex flex-col md:flex-row gap-5">
                    <textarea 
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none custom-scrollbar"
                        placeholder="https://www.facebook.com/YourPage/posts/123456789&#10;https://www.facebook.com/YourPage/posts/987654321"
                        rows={4}
                        value={pastedLinks}
                        onChange={(e) => setPastedLinks(e.target.value)}
                    />
                    <button 
                        onClick={handleSyncLinks}
                        disabled={isSyncing || !pastedLinks.trim()}
                        className="flex flex-col items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-full md:w-56 text-lg"
                    >
                        <RefreshCw size={28} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Pulling Data..." : "Fetch Analytics"}
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            {validPosts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Users size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Reach</p>
                            <p className="text-4xl font-black text-gray-800">{totalReach.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                            <Eye size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Impressions</p>
                            <p className="text-4xl font-black text-gray-800">{totalImpressions.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                            <Heart size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Engagement</p>
                            <p className="text-4xl font-black text-gray-800">{totalEngagement.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <MousePointerClick size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Link Clicks</p>
                            <p className="text-4xl font-black text-gray-800">{totalClicks.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* POSTS DATA TABLE */}
            {posts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            <BarChart3 className="text-blue-600" size={24}/> Synced Posts Performance
                        </h3>
                        <span className="text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                            Showing {indexOfFirstPost + 1}-{Math.min(indexOfLastPost, posts.length)} of {posts.length}
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-base text-left">
                            <thead className="text-sm text-gray-400 uppercase bg-white border-b border-gray-100 font-bold">
                                <tr>
                                    <th className="px-8 py-5 w-1/3">Post Content</th>
                                    <th className="px-6 py-5 text-right">Reach</th>
                                    <th className="px-6 py-5 text-right">Impressions</th>
                                    <th className="px-6 py-5 text-center">Interactions</th>
                                    <th className="px-6 py-5 text-center">Clicks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {currentPosts.map((post, idx) => (
                                    <tr key={post.id || idx} className="hover:bg-blue-50/30 transition-colors group">
                                        {post.error ? (
                                            <td colSpan="5" className="px-8 py-6">
                                                <div className="flex items-center gap-3 text-red-500 font-medium">
                                                    <AlertCircle size={20} />
                                                    <div className="flex flex-col">
                                                        <span>Error loading URL: <a href={post.url} target="_blank" rel="noreferrer" className="underline break-all">{post.url}</a></span>
                                                        <span className="text-xs text-red-400">{post.error}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        ) : (
                                            <>
                                                <td className="px-8 py-6">
                                                    <p className="text-base font-bold text-gray-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                                                        {post.message || 'Facebook Post / Video'}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm font-semibold text-gray-400">
                                                        <span>{post.postedAt ? formatDate(post.postedAt) : 'Recent Post'}</span>
                                                        <a href={post.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                                                            View Post <ExternalLink size={14} />
                                                        </a>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right font-black text-gray-700 text-lg">
                                                    {(post.metrics?.reach ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-6 text-right font-black text-gray-700 text-lg">
                                                    {(post.metrics?.impressions ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center justify-center gap-4 text-sm font-bold text-gray-500">
                                                        <span className="flex items-center gap-1.5 text-pink-600 bg-pink-50 px-2.5 py-1.5 rounded-md"><ThumbsUp size={16}/> {post.metrics?.reactions ?? 0}</span>
                                                        <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-md"><MessageCircle size={16}/> {post.metrics?.comments ?? 0}</span>
                                                        <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-md"><Share2 size={16}/> {post.metrics?.shares ?? 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center font-black text-amber-600 text-lg">
                                                    {(post.metrics?.clicks ?? 0).toLocaleString()}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION CONTROLS */}
                    {totalPages > 1 && (
                        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                            
                            <span className="text-sm font-bold text-gray-500">
                                Page <span className="text-blue-600">{currentPage}</span> of {totalPages}
                            </span>
                            
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SocialAnalyticsView;