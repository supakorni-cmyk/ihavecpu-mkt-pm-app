// src/components/views/SocialAnalyticsView.jsx
import React, { useState, useMemo } from 'react';

export default function SocialAnalyticsView() {
    const [pastedLinks, setPastedLinks] = useState('');
    const [posts, setPosts] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInputDrawer, setShowInputDrawer] = useState(true);
    
    // Interactive state tracking for the content action buttons
    const [savedPlans, setSavedPlans] = useState({});

    // 🟢 1. REAL DATA GRAPH API CONNECTION
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
            setShowInputDrawer(false); // Cleanly hide input frame after loading data
        } catch (error) {
            console.error("Failed to sync Facebook data:", error);
            alert(`Sync Failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    // 🟢 2. REAL-TIME FILTER & SORT ALGORITHM
    // Filters content by search queries, then ranks them by raw impressions (Views) descending
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

    // 🟢 3. REAL METRIC AGGREGATIONS FOR THE CUMULATIVE CARDS
    const totals = useMemo(() => {
        return processedPosts.reduce((acc, post) => {
            if (post.metrics) {
                acc.views += post.metrics.impressions || 0;
                acc.reactions += post.metrics.reactions || 0;
                acc.reach += post.metrics.reach || 0;
                acc.clicks += post.metrics.clicks || 0;
            }
            return acc;
        }, { views: 0, reactions: 0, reach: 0, clicks: 0 });
    }, [processedPosts]);

    // 🟢 4. GOOGLE SHEETS DYNAMIC CSV EXPORT
    const handleExportToSheets = () => {
        if (processedPosts.length === 0) return alert("No data available to export!");
        const headers = ["Post Content", "Link", "Reach", "Impressions", "Reactions", "Comments", "Shares", "Link Clicks"];
        const csvRows = processedPosts.map(post => {
            const safeMessage = (post.message || 'Video / Photo Post').replace(/"/g, '""');
            return [
                `"${safeMessage}"`, `"${post.permalink || ''}"`,
                post.metrics?.reach || 0, post.metrics?.impressions || 0,
                post.metrics?.reactions || 0, post.metrics?.comments || 0,
                post.metrics?.shares || 0, post.metrics?.clicks || 0
            ].join(',');
        });
        const csvContent = "\uFEFF" + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `FB_ContentOS_Export.csv`);
        link.click();
    };

    const togglePlan = (id) => {
        setSavedPlans(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] p-4 sm:p-8 text-slate-800 font-sans selection:bg-orange-100 overflow-y-auto">
            
            {/* ✦ TOP HEADER BAR SECTION */}
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                <div className="flex items-start gap-3">
                    <button 
                        onClick={() => setShowInputDrawer(!showInputDrawer)}
                        className={`p-2.5 border rounded-xl transition shadow-sm mt-0.5 ${showInputDrawer ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-slate-200/70 text-slate-600'}`}
                        title="Toggle Data Link Manager Drawer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-orange-500 font-bold text-lg">✦</span>
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Content OS</h1>
                            <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 border border-slate-200 bg-slate-50 rounded-md">Real Tracker</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            เชื่อมต่อระบบ Facebook API เรียบร้อยแล้ว
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleExportToSheets}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition border border-slate-200 shadow-sm"
                    >
                        📊 Export CSV
                    </button>
                    <button 
                        onClick={() => setShowInputDrawer(!showInputDrawer)}
                        className="bg-[#FDF1EB] hover:bg-[#FCE4D6] text-[#E06639] font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 border border-[#FADCD0] tracking-wide shadow-sm"
                    >
                        {showInputDrawer ? '✕ ปิดกล่องลิงก์' : '+ ซิงค์ข้อมูลลิงก์'}
                    </button>
                </div>
            </div>

            {/* SUBTITLE FRAME */}
            <div className="max-w-4xl mx-auto mb-6">
                <p className="text-xs font-bold text-slate-400 pl-11">ดูว่าคอนเทนต์ไหนเวิร์ค ไม่เวิร์ค แล้วรู้ว่าควรทำอะไรต่อ จากเพจจริงของคุณ</p>
            </div>

            {/* ✦ DATA INPUT LINK DRAWER */}
            {showInputDrawer && (
                <div className="max-w-4xl mx-auto bg-white p-5 rounded-2xl border border-orange-100 shadow-sm mb-6 animate-fadeIn">
                    <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">
                        📥 วางลิงก์โพสต์ Facebook ของคุณ (หนึ่งลิงก์ต่อหนึ่งบรรทัด)
                    </label>
                    <textarea
                        rows={4}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-400 font-mono bg-slate-50/40 text-slate-700 placeholder-slate-300"
                        placeholder="https://www.facebook.com/permalink.php?story_fbid=..."
                        value={pastedLinks}
                        onChange={(e) => setPastedLinks(e.target.value)}
                    />
                    <div className="flex justify-end mt-3">
                        <button
                            onClick={handleSyncLinks}
                            disabled={isSyncing}
                            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-sm"
                        >
                            {isSyncing ? 'กำลังดึงข้อมูล API...' : '⚡ ประมวลผลและดึงข้อมูลสรุป'}
                        </button>
                    </div>
                </div>
            )}

            {/* ✦ PREMIUM ANALYTICAL INDICATOR BLOCKS (3 CARDS MATCHING DESIGN) */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                
                {/* BLOC 1: CUMULATIVE IMPRESSIONS / VIEWS */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">VIEWS · REAL TOTAL</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                        {totals.views >= 1000 ? `${(totals.views / 1000).toFixed(1)}K` : totals.views}
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                        <svg className="w-28 h-5" viewBox="0 0 100 20">
                            <path d="M0,17 Q20,15 40,13 T70,8 T90,4 L100,2" fill="none" stroke="#E06639" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">Live</span>
                    </div>
                </div>

                {/* BLOC 2: PUBLIC REACTIONS CONTROLLER */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">REACTIONS · TOTAL</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                        {totals.reactions.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                        <svg className="w-28 h-5" viewBox="0 0 100 20">
                            <path d="M0,18 Q25,16 50,12 T75,9 T90,5 L100,2" fill="none" stroke="rgb(16,185,129)" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Active</span>
                    </div>
                </div>

                {/* BLOC 3: TARGET ACCOUNT REACH */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">TOTAL REACH</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                        {totals.reach >= 1000 ? `${(totals.reach / 1000).toFixed(1)}K` : totals.reach}
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                        <svg className="w-28 h-5" viewBox="0 0 100 20">
                            <path d="M0,16 Q20,15 40,14 T65,11 T85,7 L100,4" fill="none" stroke="#E06639" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">Synced</span>
                    </div>
                </div>
            </div>

            {/* SEARCH AND CONTROL INTERCEPTOR BAR */}
            <div className="max-w-4xl mx-auto mb-4 flex items-center justify-end">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาหัวข้อคอนเทนต์ หรือ ลิงก์โพสต์..."
                    className="border border-slate-200/80 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-400 w-full sm:w-64 bg-white/80 shadow-sm text-slate-700 font-medium placeholder-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* ✦ MAIN CONTENT EVALUATION LIST BOARD (MATCHING MOCKUP IMAGE) */}
            <div className="max-w-4xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-5 sm:p-6">
                
                {/* Panel Header Title Frame */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">คอนเทนต์จัดอันดับตามความแรง · เรียงจากยอดวิวสูงสุด</h2>
                        <p className="text-[11px] font-bold text-orange-500 mt-0.5 flex items-center gap-1">
                            <span>✦</span> อ้างอิงสถิติจาก API Insights เพื่อวิเคราะห์ว่าเนื้อหาประเภทใดสามารถสร้างการดึงดูดได้ดีที่สุด
                        </p>
                    </div>
                    {posts.length > 0 && (
                        <div className="self-start sm:self-auto bg-[#FEF4EF] text-[#D85C2E] text-[10px] font-black px-2.5 py-1.5 rounded-xl border border-[#FCE1D4] tracking-wider uppercase">
                            พบ {processedPosts.length} รายการ
                        </div>
                    )}
                </div>

                {/* Rebuilt High-End Custom Content List Feed */}
                <div className="divide-y divide-slate-100">
                    {currentPosts.map((post, index) => {
                        const viewsValue = post.metrics?.impressions || 0;
                        const formattedViews = viewsValue >= 1000 ? `${(viewsValue / 1000).toFixed(1)}K` : viewsValue;
                        
                        // Calculate an engagement weight modifier for the secondary field badge
                        const engagementWeight = post.metrics?.engagement || 0;
                        
                        const isPlanned = savedPlans[post.id] || false;

                        return (
                            <div key={index} className="flex items-center justify-between py-4 first:pt-1 last:pb-1 group hover:bg-slate-50/40 px-2 -mx-2 rounded-xl transition duration-150">
                                <div className="pr-4 min-w-0 flex-1">
                                    {/* Real Post Main Text Title Message Hook */}
                                    <div className="font-bold text-slate-800 text-[13px] leading-snug mb-1.5 group-hover:text-slate-900 transition break-words line-clamp-2">
                                        {post.message ? `"${post.message}"` : '"โพสต์รูปภาพ / วิดีโอสื่อประสมจากเพจ"'}
                                    </div>
                                    
                                    {/* Real Interaction Metrics Footer Subline */}
                                    <div className="text-[11px] font-bold text-[#D85C2E] flex items-center gap-2 flex-wrap">
                                        <span className="bg-orange-50 px-1.5 py-0.5 rounded text-[10px]">{formattedViews} วิว</span>
                                        <span className="text-slate-300 font-normal">·</span>
                                        <span className="text-slate-400">👍 Likes: {post.metrics?.reactions || 0}</span>
                                        <span className="text-slate-300 font-normal">·</span>
                                        <span className="text-slate-400">💬 Comments: {post.metrics?.comments || 0}</span>
                                        <span className="text-slate-300 font-normal">|</span>
                                        <a 
                                            href={post.permalink} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="text-blue-500 hover:underline font-semibold flex items-center gap-0.5"
                                        >
                                            ดูลิงก์โพสต์จริง ↗
                                        </a>
                                    </div>
                                    
                                    {/* Exception reporting block injected within list rows for clean tracking */}
                                    {post.error && (
                                        <div className="text-[10px] text-red-500 font-bold bg-red-50/40 px-2 py-0.5 rounded border border-red-100/50 mt-1.5 inline-block">
                                            ⚠️ ลิงก์ย่อ: ดึงสถิติตัวเลขเชิงลึกไม่ได้ แนะนำให้ใช้ลิงก์เต็ม
                                        </div>
                                    )}
                                </div>

                                {/* Rebuilt Interactive Action Button */}
                                <button
                                    onClick={() => togglePlan(post.id)}
                                    className={`text-[11px] font-black px-3.5 py-2 rounded-xl transition border shrink-0 tracking-wide ${
                                        isPlanned 
                                        ? 'bg-slate-900 text-white border-slate-900' 
                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80 shadow-sm'
                                    }`}
                                >
                                    {isPlanned ? '✓ บันทึกแผนแล้ว' : 'ทำแนวนี้อีก'}
                                </button>
                            </div>
                        );
                    })}

                    {/* Empty State Fallback layout if no links are synced */}
                    {processedPosts.length === 0 && (
                        <div className="py-16 text-center">
                            <span className="text-2xl block mb-2">📁</span>
                            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">ยังไม่มีข้อมูลในระบบจัดอันดับ</div>
                            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">กดปุ่มสีส้ม "+ ซิงค์ข้อมูลลิงก์" ด้านบนเพื่อวางลิงก์โพสต์และดึงข้อมูลสรุปสถิติจริงจากเพจของคุณ</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}