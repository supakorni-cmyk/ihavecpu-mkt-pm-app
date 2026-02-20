// src/components/views/VideoSummarizeView.jsx
import React, { useState } from 'react';
import { 
    Search, Calendar, MonitorPlay, PlayCircle, Eye, 
    Link as LinkIcon, Sparkles, Loader2, AlertCircle, User
} from 'lucide-react';

const VideoSummarizeView = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [videoDetail, setVideoDetail] = useState('');
    
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false); // 🟢 Track if a search was attempted
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');

    // --- HELPER: Extract YouTube Thumbnail ---
    const getYoutubeThumbnail = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) 
            ? `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg` 
            : null;
    };

// --- AI SEARCH HANDLER ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!videoDetail.trim()) {
            setError("Please enter the video details you are looking for.");
            return;
        }

        setIsSearching(true);
        setError('');
        setResults([]);
        setHasSearched(true); 

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Missing Gemini API Key in .env file.");

            const dateContext = (startDate && endDate) 
                ? `Limit your search to videos published between ${startDate} and ${endDate}.` 
                : "Find the most recent and relevant videos available.";

            // 🟢 UPDATED PROMPT: Restructured for better success rates
            const prompt = `You are a YouTube Video Finder. Your ONLY job is to find YouTube videos from the specific channel "iHAVECPU".
            
            Search for videos from iHAVECPU that mention, discuss, or relate to this topic: "${videoDetail}".
            ${dateContext}
            
            Instructions:
            1. Search the web specifically for YouTube links belonging to the iHAVECPU channel (youtube.com/@iHAVECPU_).
            2. Even if the topic is a partial match, include it.
            3. You must provide real, working YouTube video URLs. Do not guess.
            
            Return a raw JSON array of objects. If you absolutely cannot find any videos from iHAVECPU related to this topic, return an empty array: []
            
            If you find videos, each object MUST have exactly these keys:
            - "title": "The exact Video Title"
            - "channel": "iHAVECPU"
            - "views": "Estimated view count (e.g., 50K views, 1M views)"
            - "link": "A valid YouTube video URL (e.g., https://www.youtube.com/watch?v=...)"
            - "summary": "A brief 1-2 sentence explanation of what the video is about"
            
            Output ONLY the raw JSON array. No markdown, no backticks.`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: prompt }] }],
                    // Use Google Search tool to allow real-time lookups
                    tools: [{ googleSearch: {} }] 
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Failed to fetch from Gemini API");
            }

            const data = await response.json();
            
            // Check if Gemini completely blocked the request or failed
            if (!data.candidates || data.candidates.length === 0) {
                 throw new Error("Gemini returned no response. Try adjusting your keywords.");
            }

            const rawText = data.candidates[0].content?.parts?.[0]?.text;
            
            if (!rawText) {
                throw new Error("No text content returned from AI.");
            }

            // Extract JSON array robustly
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.error("AI Output:", rawText);
                throw new Error("AI did not return a valid format. Try adjusting your search keywords.");
            }

            const parsedResults = JSON.parse(jsonMatch[0]);
            setResults(parsedResults);

        } catch (err) {
            console.error("Search Error:", err);
            setError(err.message);
        } finally {
            setIsSearching(false);
        }
    };
   

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans relative overflow-hidden">
            
            {/* --- HEADER --- */}
            <header className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl shadow-sm z-20 flex justify-between items-center sticky top-0 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl shadow-inner bg-gradient-to-br from-red-500 to-rose-600 text-white">
                        <MonitorPlay size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">AI Video Summarizer</h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Find, filter, and summarize YouTube videos instantly</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto space-y-8">
                    
                    {/* --- SEARCH FORM (GLASSMORPHISM CARD) --- */}
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <form onSubmit={handleSearch} className="relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                
                                {/* Video Detail Input */}
                                <div className="md:col-span-6 lg:col-span-7">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Search size={14} className="text-red-500"/> Search Query or Topic
                                    </label>
                                    <textarea 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm outline-none focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all resize-none h-[116px] custom-scrollbar"
                                        placeholder="e.g. 'Review of the latest Intel Core Ultra processors' or 'Motherboard recommendations'"
                                        value={videoDetail}
                                        onChange={(e) => setVideoDetail(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Date Range & Submit Button */}
                                <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-between space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Calendar size={14} className="text-blue-500"/> Start Date
                                            </label>
                                            <input 
                                                type="date" 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all text-gray-700 font-medium"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                                End Date
                                            </label>
                                            <input 
                                                type="date" 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all text-gray-700 font-medium"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isSearching}
                                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2
                                            ${isSearching 
                                                ? 'bg-gray-400 cursor-not-allowed shadow-none' 
                                                : 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 hover:-translate-y-0.5 hover:shadow-red-500/30'
                                            }
                                        `}
                                    >
                                        {isSearching ? (
                                            <><Loader2 size={18} className="animate-spin" /> Browsing Web & Summarizing...</>
                                        ) : (
                                            <><Sparkles size={18} className="animate-pulse"/> Generate Summary</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                        
                        {/* Error Message */}
                        {error && (
                            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3 animate-in fade-in">
                                <AlertCircle size={18} className="shrink-0 mt-0.5"/>
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* --- RESULTS SECTION --- */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <PlayCircle className="text-gray-400"/> Search Results
                            </h3>
                            {results.length > 0 && (
                                <span className="text-sm font-bold text-gray-500 bg-gray-200/50 px-3 py-1 rounded-lg">
                                    Found {results.length} Videos
                                </span>
                            )}
                        </div>

                        {/* 1. Loading Skeletons */}
                        {isSearching && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm h-80 flex flex-col">
                                        <div className="w-full h-40 bg-gray-200 rounded-2xl mb-4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                                        <div className="h-10 bg-gray-100 rounded-xl mt-auto"></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 2. Initial Empty State (Before searching) */}
                        {!isSearching && results.length === 0 && !error && !hasSearched && (
                            <div className="bg-white rounded-3xl border border-gray-100 border-dashed p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MonitorPlay size={32} className="text-gray-300"/>
                                </div>
                                <h4 className="text-lg font-bold text-gray-700 mb-1">No videos yet</h4>
                                <p className="text-gray-400 text-sm">Enter a topic above and let Gemini find the best videos for you.</p>
                            </div>
                        )}

                        {/* 3. 🟢 FIXED: "No Results Found" State */}
                        {!isSearching && results.length === 0 && !error && hasSearched && (
                            <div className="bg-white rounded-3xl border border-rose-100 p-16 text-center shadow-sm bg-gradient-to-b from-white to-rose-50/30">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search size={32} className="text-red-400"/>
                                </div>
                                <h4 className="text-xl font-bold text-gray-800 mb-2">No matching videos found</h4>
                                <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                                    Gemini couldn't find any recent videos from the <b>iHAVECPU</b> channel that match your exact description. Try broadening your keywords or clearing the Date Range.
                                </p>
                            </div>
                        )}

                        {/* 4. Video Cards Grid */}
                        {!isSearching && results.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                                {results.map((video, idx) => {
                                    const thumbUrl = getYoutubeThumbnail(video.link);
                                    
                                    return (
                                        <div key={idx} className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                                            
                                            {/* Thumbnail Section */}
                                            <div className="relative h-48 bg-gray-100 overflow-hidden shrink-0">
                                                {thumbUrl ? (
                                                    <img 
                                                        src={thumbUrl} 
                                                        alt={video.title} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        onError={(e) => { e.target.style.display = 'none'; }} 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                                                        <PlayCircle size={40} />
                                                    </div>
                                                )}
                                                
                                                {/* Views Badge */}
                                                <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
                                                    <Eye size={14} className="text-red-400"/> {video.views || "N/A"}
                                                </div>
                                            </div>

                                            {/* Content Section */}
                                            <div className="p-6 flex flex-col flex-1">
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-3 truncate">
                                                    <User size={14} className="text-blue-500 shrink-0"/> 
                                                    <span className="truncate">{video.channel || "iHAVECPU"}</span>
                                                </div>
                                                
                                                <h4 className="font-black text-gray-900 text-lg leading-tight mb-3 line-clamp-2 group-hover:text-red-600 transition-colors" title={video.title}>
                                                    {video.title}
                                                </h4>
                                                
                                                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-6 flex-1">
                                                    {video.summary}
                                                </p>

                                                {/* Action Button */}
                                                <a 
                                                    href={video.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="w-full mt-auto bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-600 font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-gray-100 hover:border-red-200"
                                                >
                                                    Watch Video <LinkIcon size={16}/>
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default VideoSummarizeView;