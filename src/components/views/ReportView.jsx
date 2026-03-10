// src/components/views/ReportView.jsx
import React, { useState, useRef } from 'react';
import { 
    Sparkles, 
    FileText, 
    Building2, 
    Loader2, 
    Download, 
    Copy, 
    CheckCircle2, 
    LayoutTemplate,
    Wand2,
    Paperclip,
    Trash2,
    Printer,
    Upload
} from 'lucide-react';

import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Hardcode a stable CDN version so Vite doesn't crash trying to find the local worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const ReportView = () => {
    // --- STATE ---
    const [brandDomain, setBrandDomain] = useState('ihavecpu.com');
    const [reportTitle, setReportTitle] = useState('Monthly Campaign ROAS & Audience Analysis');
    const [prompt, setPrompt] = useState('Analyze the performance of our recent PC component sales campaign. Highlight key ROI metrics, audience engagement on YouTube, and suggest 3 strategic moves for next month.');
    
    // File Upload State
    const [referenceFile, setReferenceFile] = useState(null);
    const [referenceText, setReferenceText] = useState('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportContent, setReportContent] = useState('');
    const [activeLogo, setActiveLogo] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- LOGO FETCHING (BRANDFETCH) ---
    const getBrandfetchLogo = (domain) => {
        if (!domain) return '';
        const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];
        return `https://asset.brandfetch.io/${cleanDomain}/logo?c=1iddfSj8aQZ`;
    };

    // --- FILE UPLOAD HANDLER ---
    // --- ADVANCED FILE UPLOAD HANDLER ---
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setReferenceFile(file.name);
        setReferenceText('Extracting data... please wait.'); // Temporary loading text

        try {
            // 1. Handle Excel Files (.xlsx, .xls)
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
                let allText = '';
                
                // Loop through all sheets and convert their tables to CSV-style text
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);
                    if (csv) allText += `\n--- Sheet: ${sheetName} ---\n${csv}`;
                });
                
                setReferenceText(allText || 'No data found in Excel file.');
            } 
            // 2. Handle PDF Files (.pdf)
            else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                
                // Loop through all pages and scrape the text
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += `\n--- Page ${i} ---\n${pageText}`;
                }
                
                setReferenceText(fullText || 'No text found in PDF.');
            } 
            // 3. Handle standard Text/CSV/JSON files
            else {
                const reader = new FileReader();
                reader.onload = (event) => setReferenceText(event.target.result);
                reader.onerror = () => {
                    alert("Failed to read text file.");
                    removeFile();
                };
                reader.readAsText(file);
            }
        } catch (error) {
            console.error("File parsing error:", error);
            alert("Error extracting text from file. Please ensure it is not password protected.");
            removeFile();
        }
    };

    const removeFile = () => {
        setReferenceFile(null);
        setReferenceText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- AI GENERATION ---
    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!prompt.trim() || !brandDomain.trim()) return;

        setIsGenerating(true);
        setActiveLogo(getBrandfetchLogo(brandDomain));
        
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Missing Gemini API Key in .env file.");

            // 🟢 Inject reference text if a file was uploaded!
            const fileContext = referenceText 
                ? `\n\n--- REFERENCE DATA PROVIDED BY USER ---\nPlease analyze and incorporate the following data into the report:\n${referenceText}\n---------------------------------------\n` 
                : '';

            const aiPrompt = `
                You are an elite business analyst and marketing expert. 
                Please write a professional business report for the brand: ${brandDomain}.
                
                Report Title: ${reportTitle}
                User Instructions: ${prompt}
                ${fileContext}

                FORMATTING RULES:
                - Output the report strictly in Markdown.
                - Use ## for main section headers.
                - Use ### for sub-headers.
                - Use bullet points for metrics and lists.
                - Keep the tone highly professional, concise, and data-driven.
                - Do not include an introductory greeting (e.g., "Here is the report"), just start directly with the report content.
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: aiPrompt }] }]
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Failed to generate report");
            }

            const data = await response.json();
            const text = data.candidates[0]?.content?.parts[0]?.text;
            
            if (text) {
                setReportContent(text);
            }

        } catch (err) {
            console.error("AI Generation Error:", err);
            setReportContent(`**Error generating report:** ${err.message}\n\nPlease try again or check your API key.`);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- UTILS ---
    const handleCopy = () => {
        if (!reportContent) return;
        navigator.clipboard.writeText(reportContent);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Trigger Native Browser Print (which allows Saving to PDF)
    const handleExportPDF = () => {
        window.print();
    };

    // Simple Markdown to HTML parser for the Canvas
    const renderMarkdown = (text) => {
        if (!text) return { __html: '<div class="text-gray-400 italic text-center mt-20">Your AI-generated report will appear here...</div>' };
        
        let html = text
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-black text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-100">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black text-gray-900 mt-4 mb-6">$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
            .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1 list-disc">$1</li>')
            .replace(/<\/li>\n/g, '</li>') // Fix spacing between lists
            .replace(/\n\n/g, '</p><p class="mb-4 text-gray-600 leading-relaxed">')
            .replace(/\n/g, '<br/>');

        return { __html: `<p class="mb-4 text-gray-600 leading-relaxed">${html}</p>` };
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans relative overflow-hidden print:bg-white print:h-auto">
            
            {/* --- HEADER (Hidden when printing) --- */}
            <header className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl shadow-sm z-20 flex justify-between items-center shrink-0 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl shadow-inner bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                        <Wand2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">AI Report Canvas</h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Generate branded documents instantly with Gemini</p>
                    </div>
                </div>
            </header>

            {/* --- SPLIT WORKSPACE --- */}
            <div className="flex-1 flex overflow-hidden print:overflow-visible">
                
                {/* LEFT PANEL: Builder Form (Hidden when printing) */}
                <div className="w-full lg:w-1/3 xl:w-[400px] bg-white border-r border-gray-200 overflow-y-auto custom-scrollbar flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] print:hidden">
                    <form onSubmit={handleGenerate} className="p-6 space-y-6 flex-1 flex flex-col">
                        
                        {/* Brandfetch Setup */}
                        <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Building2 size={16} className="text-blue-500"/> Brand Details
                            </h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Brand Domain (For Logo)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm"
                                    placeholder="e.g. apple.com"
                                    value={brandDomain}
                                    onChange={(e) => setBrandDomain(e.target.value)}
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                                    <Sparkles size={10}/> Fetches official logo via brandfetch.com
                                </p>
                            </div>
                        </div>

                        {/* Report Config */}
                        <div className="space-y-4 flex-1 flex flex-col">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Report Title</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                    value={reportTitle}
                                    onChange={(e) => setReportTitle(e.target.value)}
                                    required
                                />
                            </div>
                            
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                                    <span>AI Instructions / Prompt</span>
                                </label>
                                <textarea 
                                    className="w-full flex-1 min-h-[150px] bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none custom-scrollbar leading-relaxed"
                                    placeholder="Tell Gemini what this report should cover..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    required
                                />
                            </div>

                            {/* 🟢 NEW: File Context Upload */}
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 border-dashed">
                                <label className="block text-xs font-bold text-indigo-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Paperclip size={14}/> Attach Data for AI Context
                                </label>
                                
                                {referenceFile ? (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                                            <FileText size={16} className="text-indigo-500 shrink-0"/>
                                            <span className="text-sm font-bold text-gray-700 truncate">{referenceFile}</span>
                                        </div>
                                        <button type="button" onClick={removeFile} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition shrink-0">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                       <input 
                                            type="file" 
                                            accept=".txt,.csv,.json,.md,.xlsx,.xls,.pdf" 
                                            onChange={handleFileChange}
                                            className="hidden"
                                            ref={fileInputRef}
                                            id="context-upload"
                                        />
                                        <label 
                                            htmlFor="context-upload" 
                                            className="flex flex-col items-center justify-center p-4 bg-white border border-indigo-100 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition group text-center"
                                        >
                                            <Upload size={20} className="text-indigo-400 mb-2 group-hover:-translate-y-1 transition-transform" />
                                            <span className="text-sm font-bold text-indigo-600">Click to upload file</span>
                                            {/* Update the hint text below too! */}
                                            <span className="text-[10px] text-gray-500 font-medium mt-1">Supports .pdf, .xlsx, .csv, .txt</span>
                                        </label>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="pt-4 border-t border-gray-100 mt-auto">
                            <button 
                                type="submit"
                                disabled={isGenerating}
                                className={`w-full py-4 rounded-xl font-black text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2
                                    ${isGenerating 
                                        ? 'bg-gray-400 cursor-not-allowed shadow-none' 
                                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 hover:shadow-indigo-500/30'
                                    }
                                `}
                            >
                                {isGenerating ? (
                                    <><Loader2 size={18} className="animate-spin" /> Analyzing Data & Generating...</>
                                ) : (
                                    <><Wand2 size={18} /> Generate Report</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* RIGHT PANEL: The Canvas */}
                <div className="flex-1 bg-[#e2e8f0] overflow-y-auto custom-scrollbar p-8 lg:p-12 relative flex justify-center print:p-0 print:bg-white print:overflow-visible">
                    
                    {/* Canvas Toolbar (Hidden when printing) */}
                    <div className="absolute top-6 right-12 flex gap-3 z-20 print:hidden">
                        <button 
                            onClick={handleCopy}
                            disabled={!reportContent}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${isCopied ? 'bg-green-500 text-white border-transparent' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isCopied ? <CheckCircle2 size={16}/> : <Copy size={16}/>}
                            {isCopied ? 'Copied Markdown!' : 'Copy'}
                        </button>
                        
                        {/* 🟢 NEW: Export PDF Button */}
                        <button 
                            onClick={handleExportPDF}
                            disabled={!reportContent}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm bg-gray-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Printer size={16}/> Save as PDF
                        </button>
                    </div>

                    {/* A4 Document Paper (Removes shadows and margins when printing) */}
                    <div 
                        ref={canvasRef}
                        className="bg-white w-full max-w-[850px] min-h-[1100px] shadow-2xl rounded-sm ring-1 ring-gray-900/5 p-12 sm:p-16 flex flex-col relative transition-all duration-500 print:shadow-none print:ring-0 print:p-0 print:max-w-none print:w-full"
                    >
                        {isGenerating && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-indigo-600 rounded-sm print:hidden">
                                <Loader2 size={48} className="animate-spin mb-4" />
                                <p className="font-bold text-lg animate-pulse">Gemini is analyzing data and writing...</p>
                            </div>
                        )}

                        {/* Document Header (Brandfetch Logo) */}
                        <div className="border-b-2 border-gray-900 pb-8 mb-8 flex justify-between items-end">
                            <div className="flex-1 pr-8">
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight mb-2">
                                    {reportTitle || 'Untitled Report'}
                                </h1>
                                <p className="text-gray-500 font-medium uppercase tracking-widest text-sm">
                                    Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            
                            {/* Brandfetch Logo Area */}
                            <div className="w-48 h-16 flex items-center justify-end shrink-0">
                                {activeLogo ? (
                                    <img 
                                        src={activeLogo} 
                                        alt={`${brandDomain} Logo`} 
                                        className="max-w-full max-h-full object-contain"
                                        onError={(e) => {
                                            // Fallback if Brandfetch fails to find the logo
                                            e.target.onerror = null; 
                                            e.target.src = `https://logo.clearbit.com/${brandDomain}`;
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-50 border border-gray-100 border-dashed rounded flex items-center justify-center text-gray-300 print:hidden">
                                        <LayoutTemplate size={24} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Document Body (Rendered Markdown) */}
                        <div 
                            className="flex-1 report-prose print:text-black"
                            dangerouslySetInnerHTML={renderMarkdown(reportContent)}
                        />

                        {/* Document Footer */}
                        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                            <Sparkles size={12} /> Generated by AI Report Canvas
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ReportView;