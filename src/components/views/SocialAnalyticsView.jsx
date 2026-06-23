// src/components/views/SocialAnalyticsView.jsx
import React, { useState } from 'react';

export default function SocialAnalyticsView() {
    // Current time fixed context (June 2026 reference synchronization)
    const formattedDateString = "วันนี้ 6:00 น.";

    // Mock dataset representing high-impact content metrics from the design view
    const [topContent, setTopContent] = useState([
        { id: 1, hook: "คุณต้องมี content dashboard...", views: "187K", growth: "+312%", actionTaken: false },
        { id: 2, hook: "เลิกใช้แอป Notes ทำ content ได้แล้ว", views: "94K", growth: "+201%", actionTaken: false },
        { id: 3, hook: "สร้างคำสั่ง /script ยังไง", views: "52K", growth: "+148%", actionTaken: false },
        { id: 4, hook: "creators ส่วนใหญ่คิด content ไม่ออก", views: "38K", growth: "+92%", actionTaken: false }
    ]);

    const handleActionClick = (id) => {
        setTopContent(prev => prev.map(item => 
            item.id === id ? { ...item, actionTaken: !item.actionTaken } : item
        ));
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] p-8 text-slate-800 font-sans selection:bg-orange-100">
            
            {/* ✦ TOP NAVIGATION BAR COMPONENT */}
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <div className="flex items-start gap-3">
                    <button className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/70 rounded-xl transition shadow-sm mt-0.5">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-orange-500 font-bold text-lg">✦</span>
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Content OS</h1>
                            <span className="text-slate-400 text-xs font-medium px-1.5 py-0.5 border border-slate-200 bg-slate-50/50 rounded-md">by Claude COWORK</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            อัปเดตล่าสุดโดย Claude · {formattedDateString}
                        </p>
                    </div>
                </div>

                <button className="self-start md:self-auto bg-[#FDF1EB] hover:bg-[#FCE4D6] text-[#E06639] font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 border border-[#FADCD0] tracking-wide">
                    <span className="text-base font-medium leading-none">+</span> สร้าง REEL
                </button>
            </div>

            {/* SUBTITLE */}
            <div className="max-w-5xl mx-auto mb-8">
                <p className="text-sm font-semibold text-slate-500 pl-12">ดูว่าคอนเทนต์ไหนเวิร์ค ไม่เวิร์ค แล้วรู้ว่าควรทำอะไรต่อ</p>
            </div>

            {/* ✦ REVENUE & PERFORMANCE INDICATORS GRID (3 CARDS) */}
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                
                {/* CARD 1: VIEWS */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md/50 transition">
                    <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1.5">VIEWS · 7D</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight mb-2">287.4K</div>
                    <div className="flex items-center justify-between mt-3">
                        {/* Native Vector Sparkline Rendering */}
                        <svg className="w-32 h-6" viewBox="0 0 100 20">
                            <path d="M0,18 Q15,16 30,15 T60,11 T90,5 L100,2" fill="none" stroke="#E06639" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-xs font-bold text-orange-500 bg-orange-50/70 px-2 py-0.5 rounded-lg">+162%</span>
                    </div>
                </div>

                {/* CARD 2: SAVES */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md/50 transition">
                    <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1.5">SAVES · 7D</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight mb-2">4,812</div>
                    <div className="flex items-center justify-between mt-3">
                        <svg className="w-32 h-6" viewBox="0 0 100 20">
                            <path d="M0,18 Q20,17 40,14 T70,11 T90,6 L100,3" fill="none" stroke="rgb(16,185,129)" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">+71%</span>
                    </div>
                </div>

                {/* CARD 3: PROFILE VISITS */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md/50 transition">
                    <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1.5">เข้าชม PROFILE</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight mb-2">12.6K</div>
                    <div className="flex items-center justify-between mt-3">
                        <svg className="w-32 h-6" viewBox="0 0 100 20">
                            <path d="M0,18 Q25,17 50,15 T75,12 T90,8 L100,5" fill="none" stroke="#E06639" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-xs font-bold text-orange-500 bg-orange-50/70 px-2 py-0.5 rounded-lg">+44%</span>
                    </div>
                </div>
            </div>

            {/* ✦ MAIN ANALYTICAL REEL BOARD */}
            <div className="max-w-5xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                
                {/* Header Information Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                    <div>
                        <h2 className="text-base font-black text-slate-900 tracking-tight">Top 5 คอนเทนต์มาแรง · 7 วันล่าสุด</h2>
                        <p className="text-xs font-bold text-orange-400 mt-1 flex items-center gap-1">
                            <span className="text-sm">✦</span> Claude หา reel ที่ทะลุค่ามัธยฐาน 30 วันเกิน 2 เท่า แล้วบอกว่าอะไรทำให้มันปัง
                        </p>
                    </div>
                    <div className="self-start sm:self-auto bg-[#FEF4EF] text-[#D85C2E] text-[11px] font-extrabold px-3 py-1.5 rounded-xl border border-[#FCE1D4] tracking-wide">
                        ชนะค่าเฉลี่ย 2 เท่าขึ้นไป
                    </div>
                </div>

                {/* Content Evaluation List Rows */}
                <div className="divide-y divide-slate-100/80">
                    {topContent.map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between py-4 first:pt-1 last:pb-1 group hover:bg-slate-50/40 px-2 -mx-2 rounded-xl transition">
                            <div className="pr-4">
                                <div className="font-bold text-slate-800 text-[14px] leading-snug mb-1 group-hover:text-slate-900 transition">
                                    "{item.hook}"
                                </div>
                                <div className="text-xs font-bold text-[#D85C2E] flex items-center gap-1">
                                    <span>{item.views} วิว</span>
                                    <span className="text-slate-300 font-normal">·</span>
                                    <span className="bg-orange-50 px-1.5 py-0.5 rounded text-[10px]">{item.growth}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleActionClick(item.id)}
                                className={`text-xs font-bold px-4 py-2 rounded-xl transition border shrink-0 tracking-wide ${
                                    item.actionTaken 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
                                }`}
                            >
                                {item.actionTaken ? '✓ บันทึกแผนแล้ว' : 'ทำแนวนี้อีก'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}