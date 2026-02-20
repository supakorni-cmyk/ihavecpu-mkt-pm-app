// src/components/views/MyEmailView.jsx
import React, { useState, useEffect } from 'react';
import { 
    Mail, Sparkles, AlertCircle, CheckCircle2, 
    Clock, Inbox, ChevronRight, Loader2, User
} from 'lucide-react';

const MyEmailView = ({ currentUser }) => {
    // Fallback if no user is passed from the main app
    const userEmail = currentUser?.email || "marketing-manager@ihavecpu.com";

    const [emails, setEmails] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [error, setError] = useState('');

// --- 1. FETCH REAL EMAILS VIA GMAIL API ---
    const fetchDailyEmails = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            // Retrieve the token we saved during login
            const token = localStorage.getItem('gmail_token');
            if (!token) {
                throw new Error("No Gmail access token found. Please log out and log back in with Google.");
            }

            // Fetch the last 10 email IDs from the user's inbox
            const listResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in:inbox', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!listResponse.ok) throw new Error("Failed to fetch inbox. Token may be expired.");
            const listData = await listResponse.json();
            
            if (!listData.messages) {
                setEmails([]);
                setIsLoading(false);
                return;
            }

            // Fetch the actual details (Subject, Sender, Snippet) for each email ID
            const emailPromises = listData.messages.map(async (msg) => {
                const msgResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const msgData = await msgResponse.json();
                
                // Extract headers
                const subjectHeader = msgData.payload.headers.find(h => h.name === 'Subject');
                const fromHeader = msgData.payload.headers.find(h => h.name === 'From');
                
                return {
                    id: msgData.id,
                    sender: fromHeader ? fromHeader.value : "Unknown Sender",
                    subject: subjectHeader ? subjectHeader.value : "No Subject",
                    snippet: msgData.snippet, // Gmail provides a handy plain-text snippet!
                    isRead: !msgData.labelIds.includes("UNREAD")
                };
            });

            const realEmails = await Promise.all(emailPromises);
            setEmails(realEmails);

        } catch (err) {
            console.error("Gmail API Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Load emails on component mount
    useEffect(() => {
        fetchDailyEmails();
    }, []);

    // --- 2. AI SUMMARIZATION HANDLER ---
    const handleSummarize = async () => {
        if (emails.length === 0) return;
        setIsSummarizing(true);
        setError('');
        
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Missing Gemini API Key in .env file.");

            // Prepare emails for the AI
            const emailTextContext = emails.map(e => `From: ${e.sender} | Subject: ${e.subject} | Snippet: ${e.snippet}`).join('\n\n');

            const prompt = `You are a highly efficient Executive Assistant. Summarize the following daily emails for the user (${userEmail}).
            
            Here are the emails:
            ${emailTextContext}
            
            Return ONLY a raw JSON object with exactly these keys:
            - "tldr": "A catchy, one-sentence summary of the day's inbox."
            - "urgent": [Array of strings detailing urgent matters that need immediate attention]
            - "actionItems": [Array of strings detailing tasks the user needs to do]
            - "general": [Array of strings detailing general FYI information]
            
            Do not wrap the response in markdown or backticks.`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                if (response.status === 429) throw new Error("API Rate Limit exceeded. Please wait a moment.");
                const errData = await response.json();
                throw new Error(errData.error?.message || "Failed to fetch from Gemini");
            }

            const data = await response.json();
            const rawText = data.candidates[0].content?.parts?.[0]?.text;
            
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI returned invalid format.");

            setSummary(JSON.parse(jsonMatch[0]));

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsSummarizing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans relative overflow-hidden">
            
            {/* --- HEADER --- */}
            <header className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl shadow-sm z-20 flex justify-between items-center sticky top-0 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl shadow-inner bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Daily Inbox Briefing</h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
                            <User size={14}/> {userEmail}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleSummarize}
                    disabled={isSummarizing || isLoading || emails.length === 0}
                    className={`px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center gap-2
                        ${isSummarizing || isLoading || emails.length === 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                            : 'bg-gray-900 text-white hover:bg-black hover:-translate-y-0.5 hover:shadow-xl'
                        }
                    `}
                >
                    {isSummarizing ? <><Loader2 size={18} className="animate-spin"/> Reading Inbox...</> : <><Sparkles size={18} className="text-indigo-400"/> Summarize Day</>}
                </button>
            </header>

            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* --- LEFT COL: AI SUMMARY DASHBOARD --- */}
                    <div className="lg:col-span-7 space-y-6">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <Sparkles className="text-indigo-500"/> Executive Summary
                        </h3>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex gap-3 text-sm font-medium">
                                <AlertCircle size={18} className="shrink-0"/> {error}
                            </div>
                        )}

                        {!summary && !isSummarizing && !error && (
                            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center shadow-sm flex flex-col items-center justify-center h-[400px]">
                                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                    <Sparkles size={24} className="text-indigo-500"/>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-2">No summary generated yet</h4>
                                <p className="text-gray-500 text-sm max-w-sm">Click the "Summarize Day" button in the top right to have Gemini read your inbox and prioritize your tasks.</p>
                            </div>
                        )}

                        {isSummarizing && (
                            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm h-[400px] flex flex-col items-center justify-center space-y-4 animate-pulse">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="font-bold text-indigo-900">Gemini is analyzing your inbox...</p>
                            </div>
                        )}

                        {summary && !isSummarizing && (
                            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* TLDR Banner */}
                                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                                    <p className="text-indigo-200 font-bold text-xs uppercase tracking-widest mb-2">Today's TL;DR</p>
                                    <h2 className="text-2xl font-black leading-tight relative z-10">{summary.tldr}</h2>
                                </div>

                                <div className="p-8 space-y-8">
                                    {/* URGENT */}
                                    {summary.urgent && summary.urgent.length > 0 && (
                                        <div>
                                            <h4 className="flex items-center gap-2 font-black text-red-600 mb-4 uppercase tracking-wider text-sm">
                                                <AlertCircle size={16}/> Needs Immediate Attention
                                            </h4>
                                            <ul className="space-y-3">
                                                {summary.urgent.map((item, idx) => (
                                                    <li key={idx} className="flex gap-3 text-gray-800 font-medium bg-red-50/50 p-4 rounded-xl border border-red-100">
                                                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0"></div>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* ACTION ITEMS */}
                                    {summary.actionItems && summary.actionItems.length > 0 && (
                                        <div>
                                            <h4 className="flex items-center gap-2 font-black text-orange-500 mb-4 uppercase tracking-wider text-sm">
                                                <CheckCircle2 size={16}/> Action Items
                                            </h4>
                                            <ul className="space-y-3">
                                                {summary.actionItems.map((item, idx) => (
                                                    <li key={idx} className="flex gap-3 text-gray-700 bg-orange-50/30 p-3 rounded-xl border border-orange-100">
                                                        <input type="checkbox" className="mt-1 w-4 h-4 accent-orange-500 rounded cursor-pointer" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* GENERAL FYI */}
                                    {summary.general && summary.general.length > 0 && (
                                        <div>
                                            <h4 className="flex items-center gap-2 font-black text-blue-500 mb-4 uppercase tracking-wider text-sm">
                                                <Inbox size={16}/> General FYI
                                            </h4>
                                            <ul className="space-y-2">
                                                {summary.general.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                        <ChevronRight size={16} className="text-blue-300 shrink-0 mt-0.5"/>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- RIGHT COL: RAW INBOX --- */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <Clock className="text-gray-400"/> Recent Emails
                            </h3>
                            <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">{emails.length} Messages</span>
                        </div>

                        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 p-2 overflow-hidden flex flex-col">
                            {isLoading ? (
                                <div className="p-12 text-center text-gray-400 font-medium flex flex-col items-center">
                                    <Loader2 size={24} className="animate-spin mb-2" /> Loading inbox...
                                </div>
                            ) : (
                                <div className="overflow-y-auto max-h-[600px] custom-scrollbar p-2 space-y-2">
                                    {emails.map(email => (
                                        <div key={email.id} className={`p-4 rounded-2xl transition-all cursor-pointer border ${email.isRead ? 'bg-white border-transparent hover:bg-gray-50' : 'bg-blue-50/30 border-blue-100 shadow-sm'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <p className={`text-sm truncate pr-4 ${email.isRead ? 'text-gray-600 font-medium' : 'text-blue-900 font-bold'}`}>
                                                    {email.sender.split('@')[0]}
                                                </p>
                                                {/* Simulated Time */}
                                                <span className="text-[10px] text-gray-400 font-bold shrink-0">10:30 AM</span>
                                            </div>
                                            <h4 className={`text-sm mb-1 line-clamp-1 ${email.isRead ? 'text-gray-800' : 'text-gray-900 font-black'}`}>
                                                {email.subject}
                                            </h4>
                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                {email.snippet}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MyEmailView;