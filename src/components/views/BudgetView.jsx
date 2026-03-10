// src/components/views/BudgetView.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Plus, 
  Wallet, 
  Activity, 
  Trash2, 
  Edit2, 
  X,
  FileText,
  Upload,
  Paperclip,
  Eye,
  PieChart as PieChartIcon,
  Filter,
  Calendar,
  Tag,
  Sparkles,
  Send,
  MessageSquare,
  Copy,
  Users,      
  Target,     
  Zap,        
  DollarSign  
} from 'lucide-react';

import { BarChart, Bar, Legend, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

import { BUDGET_CATEGORIES } from '../../utils/constants';
import { analyzeFinancials } from '../../utils/aiService';
import aiAvatar from '../../assets/bot/avatar.png';

const TOTAL_BUDGET_CONST = 33000000;
const BUDGET_STATUSES = ['Pending', 'Follow-up', 'Complete'];

const AI_AVATAR = aiAvatar;

// --- HELPER: NUMBER FORMATTING ---
const formatAmount = (num) => {
    return new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(num || 0);
};

const formatCompactNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
};

const BudgetView = ({ transactions, onAdd, onDelete, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    
    // --- AI STATE ---
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [lastQuestion, setLastQuestion] = useState(''); 
    const [aiResponse, setAiResponse] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const aiInputRef = useRef(null);

    // --- ADD/EDIT/PREVIEW STATE ---
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        type: 'income', date: new Date().toISOString().split('T')[0],
        brand: '', category: BUDGET_CATEGORIES[0], description: '', amount: '',
        company: '', emailSubject: '', quotation: '', qtFile: null,
        invoice: '', invoiceFile: null, paymentDate: '', status: 'Pending', slip: '', slipFile: null, remark: ''
    });
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editFormData, setEditFormData] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);

    // --- FILTER STATE ---
    const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('All');
    const [incomeMonthFilter, setIncomeMonthFilter] = useState('All');
    const [incomeBrandFilter, setIncomeBrandFilter] = useState('All');

    // --- GOOGLE SHEETS ROI STATE ---
    const [roiData, setRoiData] = useState([]);
    const [m2n5Data, setM2n5Data] = useState([]); 
    const [isRoiLoading, setIsRoiLoading] = useState(false);
    const [roiError, setRoiError] = useState('');
    
    // ROI FILTERS
    const [roiInfluencerFilter, setRoiInfluencerFilter] = useState('ALL');
    const [roiMonthFilter, setRoiMonthFilter] = useState('ALL');

    useEffect(() => {
        if (activeTab === 'influencer_roi' && roiData.length === 0) {
            fetchSheetData();
        }
    }, [activeTab]);

    const fetchSheetData = async () => {
        setIsRoiLoading(true);
        setRoiError('');
        try {
            const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Missing API Key in .env file.");

            // ⚠️ YOUR GOOGLE SHEET ID GOES HERE ⚠️
            const SPREADSHEET_ID = "1JwM6_EILqUNC6C0hJEgrIFsfE-xB3kTK1PVIwR-BsZM"; 
            
            const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title&key=${apiKey}`);
            if (!metaResponse.ok) {
                const errData = await metaResponse.json();
                throw new Error(`Google Meta Error: ${errData.error?.message || "Failed to read sheets"}`);
            }
            const metaData = await metaResponse.json();
            const sheetNames = metaData.sheets.map(s => s.properties.title);

            const rangesQuery = sheetNames.map(name => `ranges=${encodeURIComponent(name)}!A:Z`).join('&');

            const dataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${rangesQuery}&key=${apiKey}`);
            if (!dataResponse.ok) {
                const errData = await dataResponse.json();
                throw new Error(`Google Data Error: ${errData.error?.message || "Failed to fetch data"}`);
            }
            const batchData = await dataResponse.json();
            
            let combinedData = [];
            let extractedM2N5 = [];

            batchData.valueRanges.forEach((rangeData, sheetIndex) => {
                const currentSheetName = sheetNames[sheetIndex];
                const rows = rangeData.values;
                
                if (!rows || rows.length === 0) return;

                // 🟢 EXTRACTION: Target exactly M2:N5 (With fallback and M/K multiplier support)
                if (extractedM2N5.length === 0 && rows.length > 1) {
                    for(let i = 1; i <= 4; i++) {
                        if (rows[i]) {
                            // Check M (index 12) and N (index 13). Fallback to L (11) and M (12) if empty.
                            let nameCell = rows[i][11] ? String(rows[i][11]).trim() : "";
                            let valCell = rows[i][12] ? String(rows[i][12]).trim() : "";
                        

                            // Handle 'M' for millions and 'K' for thousands
                            let multiplier = 1;
                            if (valCell.toLowerCase().includes('m')) multiplier = 1000000;
                            else if (valCell.toLowerCase().includes('k')) multiplier = 1000;

                            let numericValue = parseFloat(valCell.replace(/[^0-9.-]+/g, "")) || 0;
                            
                            extractedM2N5.push({
                                name: nameCell, 
                                value: numericValue * multiplier 
                            });
                        }
                    }
                }

                // Parse standard rows
                rows.forEach((row, rowIdx) => {
                    if (rowIdx === 0) return; // Skip Header

                    const cleanNum = (str) => parseFloat((str || "0").toString().replace(/[^0-9.-]+/g,""));
                    
                    // 🟢 ULTIMATE DATE PARSER (Safely inside the loop)
                    let rawDate = row[0] ? String(row[0]).trim() : "";
                    let monthStr = "Unknown Date";

                    if (rawDate) {
                        const match = rawDate.match(/(\d+)[/-](\d+)[/-](\d+)/);
                        if (match) {
                            let part1 = parseInt(match[1], 10);
                            let part2 = parseInt(match[2], 10);
                            
                            let monthNum = part2; 
                            if (part1 > 1000) monthNum = part2; 
                            else if (part1 > 12) monthNum = part2; 
                            else if (part2 > 12) monthNum = part1; 

                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            if (monthNum >= 1 && monthNum <= 12) {
                                monthStr = monthNames[monthNum - 1]; 
                            } else {
                                monthStr = rawDate; 
                            }
                        } else {
                            const dateObj = new Date(rawDate);
                            if (!isNaN(dateObj.getTime())) {
                                monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
                            } else {
                                monthStr = rawDate; 
                            }
                        }
                    }
                    
                    // B = Index 1 (Platform)
                    const platform = row[1] || "Unknown";
                    
                    // D = Index 3 (Views/Reach)
                    const views = cleanNum(row[3]) || 0;
                    
                    // F = Index 5 (Cost/Spend)
                    const cost = cleanNum(row[5]) || 0;
                    
                    // I = Index 8 (EMV/Media Value)
                    const emv = cleanNum(row[8]) || 0;
                    
                    const influencer = currentSheetName; 
                    
                    // Only push rows that actually have some numeric cost or EMV
                    if (emv > 0 || cost > 0 || views > 0) {
                        combinedData.push({
                            id: `${currentSheetName}-${rowIdx}`,
                            month: monthStr,
                            influencer: influencer,
                            platform: platform, 
                            reach: views,
                            mediaValue: emv,
                            spend: cost,
                            savings: emv - cost,
                            efficiency: cost > 0 ? parseFloat((emv / cost).toFixed(2)) : 0
                        });
                    }
                });
            });

            if (combinedData.length === 0) {
                throw new Error("No data found across any sheets. Please check your data formatting.");
            }

            setRoiData(combinedData);
            setM2n5Data(extractedM2N5);
        } catch (err) {
            console.error("Sheet Fetch Error:", err);
            setRoiError(err.message);
        } finally {
            setIsRoiLoading(false);
        }
    };

    // Filter Dropdown Options
    const uniqueInfluencers = ["ALL", ...new Set(roiData.map(d => d.influencer))];
    const uniqueMonths = ["ALL", ...new Set(roiData.map(d => d.month))];

    // Computed Filtered Data
    const filteredROI = roiData.filter(item => {
        const matchInfluencer = roiInfluencerFilter === 'ALL' || item.influencer === roiInfluencerFilter;
        const matchMonth = roiMonthFilter === 'ALL' || item.month === roiMonthFilter;
        return matchInfluencer && matchMonth;
    });

    // KPI Totals
    const roiTotalReach = filteredROI.reduce((sum, item) => sum + item.reach, 0);
    const roiTotalMediaValue = filteredROI.reduce((sum, item) => sum + item.mediaValue, 0);
    const roiTotalSpend = filteredROI.reduce((sum, item) => sum + item.spend, 0);
    const roiTotalSavings = filteredROI.reduce((sum, item) => sum + item.savings, 0);
    const roiAvgEfficiency = roiTotalSpend > 0 ? (roiTotalMediaValue / roiTotalSpend).toFixed(2) : 0;

    // Calculate Monthly Breakdown for the new chart
    const monthlyRoiMap = {};
    filteredROI.forEach(item => {
        if (!monthlyRoiMap[item.month]) {
            monthlyRoiMap[item.month] = { month: item.month, mediaValue: 0, spend: 0 };
        }
        monthlyRoiMap[item.month].mediaValue += item.mediaValue;
        monthlyRoiMap[item.month].spend += item.spend;
    });

    // Sort the months in chronological order
    const monthOrder = { "Jan":1, "Feb":2, "Mar":3, "Apr":4, "May":5, "Jun":6, "Jul":7, "Aug":8, "Sep":9, "Oct":10, "Nov":11, "Dec":12 };
    const monthlyROIBreakdown = Object.values(monthlyRoiMap).sort((a,b) => (monthOrder[a.month] || 99) - (monthOrder[b.month] || 99));

    // --- DATA PROCESSING ---
    const getMonthlyData = (type) => {
        const data = {};
        transactions.filter(t => t.type === type).forEach(t => {
            const date = new Date(t.date);
            const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`; 
            if (!data[key]) data[key] = { amount: 0, dateObj: date }; 
            data[key].amount += parseFloat(t.amount) || 0;
        });
        return Object.entries(data)
            .map(([label, val]) => ({ date: label, value: val.amount, dateObj: val.dateObj }))
            .sort((a, b) => a.dateObj - b.dateObj);
    };

    const getCategoryData = (type) => {
        const data = {};
        transactions.filter(t => t.type === type).forEach(t => {
            const cat = t.category || 'Uncategorized';
            if (!data[cat]) data[cat] = 0;
            data[cat] += parseFloat(t.amount) || 0;
        });
        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    const getTopTransactions = (type) => {
        return [...transactions]
            .filter(t => t.type === type)
            .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))
            .slice(0, 10);
    };

    // --- AGGREGATED DATA ---
    const incomeTrend = getMonthlyData('income');
    const spendingTrend = getMonthlyData('spending');
    
    const incomeCategories = getCategoryData('income');
    const spendingCategories = getCategoryData('spending');
    
    const topIncome = getTopTransactions('income');
    const topSpending = getTopTransactions('spending');

    const filteredIncomeTransactions = useMemo(() => {
        return transactions
            .filter(t => t.type === 'income')
            .filter(t => {
                if (incomeCategoryFilter !== 'All' && t.category !== incomeCategoryFilter) return false;
                if (incomeBrandFilter !== 'All' && t.brand !== incomeBrandFilter) return false;
                if (incomeMonthFilter !== 'All') {
                    const d = new Date(t.date);
                    const monthStr = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
                    if (monthStr !== incomeMonthFilter) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, incomeCategoryFilter, incomeBrandFilter, incomeMonthFilter]);

    const allMonths = Array.from(new Set([...incomeTrend.map(d => d.date), ...spendingTrend.map(d => d.date)]))
        .sort((a, b) => new Date(a) - new Date(b));
    
    const combinedData = allMonths.map(month => {
        const inc = incomeTrend.find(d => d.date === month)?.value || 0;
        const spd = spendingTrend.find(d => d.date === month)?.value || 0;
        return { date: month, income: inc, spending: spd };
    });

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const totalSpending = transactions.filter(t => t.type === 'spending').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const netBalance = totalIncome - totalSpending;
    const budgetUsedPct = Math.min((totalSpending / TOTAL_BUDGET_CONST) * 100, 100).toFixed(1);

    const filteredTransactions = transactions.filter(t => t.type === activeTab);
    const tabTotal = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // --- HANDLERS ---
    const handleAiSubmit = async (e) => { e.preventDefault(); if (!aiQuery.trim()) return; const questionToSend = aiQuery; setLastQuestion(questionToSend); setAiQuery(''); setAiResponse(''); setIsAiLoading(true); try { const result = await analyzeFinancials(questionToSend, transactions); setAiResponse(result || "Sorry, I couldn't analyze the data."); } catch (error) { setAiResponse("An error occurred while connecting to AI."); } finally { setIsAiLoading(false); } };
    const handleFileUpload = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setNewTransaction(prev => ({ ...prev, invoiceFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveFile = () => { setNewTransaction(prev => ({ ...prev, invoiceFile: null })); const input = document.getElementById('addFile'); if(input) input.value = ''; };
    const handleQtUpload = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setNewTransaction(prev => ({ ...prev, qtFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveQt = () => { setNewTransaction(prev => ({ ...prev, qtFile: null })); const input = document.getElementById('addQt'); if(input) input.value = ''; };
    const handleSlipUpload = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setNewTransaction(prev => ({ ...prev, slipFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveSlip = () => { setNewTransaction(prev => ({ ...prev, slipFile: null })); const input = document.getElementById('addSlip'); if(input) input.value = ''; };
    const handleEditFileUpload = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setEditFormData(prev => ({ ...prev, invoiceFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveEditFile = () => { setEditFormData(prev => ({ ...prev, invoiceFile: null })); const input = document.getElementById('editFile'); if(input) input.value = ''; };
    const handleEditQt = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setEditFormData(prev => ({ ...prev, qtFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveEditQt = () => { setEditFormData(prev => ({ ...prev, qtFile: null })); const input = document.getElementById('editQt'); if(input) input.value = ''; };
    const handleEditSlip = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setEditFormData(prev => ({ ...prev, slipFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveEditSlip = () => { setEditFormData(prev => ({ ...prev, slipFile: null })); const input = document.getElementById('slipQt'); if(input) input.value = ''; };
    const handleAddTransaction = (e) => { e.preventDefault(); onAdd({ ...newTransaction, type: activeTab === 'overview' ? 'income' : activeTab, createdAt: new Date(), id: Date.now().toString() }); setIsAddOpen(false); setNewTransaction({ type: 'income', date: new Date().toISOString().split('T')[0], brand: '', category: BUDGET_CATEGORIES[0], description: '', amount: '', company: '', emailSubject: '', invoice: '', invoiceFile: null, quotation: '', qtFile: null, paymentDate: '', status: 'Pending', slip: '', slipFile: null, remark: '' }); };
    const handleEditClick = (t) => { setEditFormData({ ...t }); setIsEditOpen(true); };
    const handleEditSubmit = (e) => { e.preventDefault(); onUpdate(editFormData.id, editFormData); setIsEditOpen(false); setEditFormData(null); };
    const handleDuplicate = (transaction) => { setNewTransaction({ ...transaction, date: new Date().toISOString().split('T')[0], id: undefined, type: transaction.type }); setIsAddOpen(true); };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans relative selection:bg-indigo-100 selection:text-indigo-900">
            {/* --- HEADER --- */}
            <header className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl shadow-sm z-20 flex justify-between items-center sticky top-0">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl shadow-inner ${activeTab === 'income' ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' : activeTab === 'spending' ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white'}`}>
                        {activeTab === 'income' ? <TrendingUp size={24} /> : activeTab === 'spending' ? <TrendingDown size={24} /> : <BarChart3 size={24} />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Budget Overview</h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Track your project finances dynamically</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => setIsAiOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100/50 px-5 py-2.5 rounded-xl font-bold hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-sm group">
                        <Sparkles size={16} className="text-indigo-500 group-hover:animate-pulse" /> Ask AI
                    </button>
                    {(activeTab === 'income' || activeTab === 'spending') && (
                        <div className="text-right pr-4 border-r border-gray-200">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total {activeTab}</p>
                            <p className={`text-2xl font-black tracking-tighter ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>฿{formatAmount(tabTotal)}</p>
                        </div>
                    )}
                    <button onClick={() => setIsAddOpen(true)} className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-gray-900/20 flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl"><Plus size={18} /> Add Record</button>
                </div>
            </header>

            {/* --- AI MODAL --- */}
            {isAiOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsAiOpen(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md"><Sparkles size={24} className="animate-pulse"/></div>
                                <div><h3 className="font-bold text-lg">Cat AI Analyst</h3><p className="text-indigo-200 text-xs">Ask questions about your budget data</p></div>
                            </div>
                            <button onClick={() => setIsAiOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto custom-scrollbar space-y-4">
                             <div className="flex gap-3">
                                <img src={AI_AVATAR} alt="AI" className="w-8 h-8 rounded-full object-cover border border-indigo-100 bg-white"/>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-700 max-w-[85%]">
                                    <p>Hello! I have analyzed your {transactions.length} transaction records.</p>
                                    <p className="mt-2 font-medium text-gray-500 text-xs">Try asking:</p>
                                    <ul className="list-disc pl-4 mt-1 text-xs text-gray-500 space-y-1">
                                        <li>"What is my highest spending category?"</li>
                                        <li>"How much total income this month?"</li>
                                        <li>"List top 5 expenses."</li>
                                    </ul>
                                </div>
                             </div>
                             {lastQuestion && (
                                 <div className="flex gap-3 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">You</div>
                                    <div className="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md text-sm max-w-[85%]">{lastQuestion}</div>
                                 </div>
                             )}
                             {isAiLoading && (
                                <div className="flex gap-3">
                                    <img src={AI_AVATAR} alt="AI" className="w-8 h-8 rounded-full object-cover border border-indigo-100 bg-white"/>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm flex items-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                             )}
                             {aiResponse && !isAiLoading && (
                                <div className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                                    <img src={AI_AVATAR} alt="AI" className="w-8 h-8 rounded-full object-cover border border-indigo-100 bg-white"/>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-w-[90%]">{aiResponse}</div>
                                </div>
                             )}
                        </div>
                        <form onSubmit={handleAiSubmit} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                            <input ref={aiInputRef} type="text" placeholder="Ask a question..." className="flex-1 bg-gray-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-xl px-4 py-3 outline-none transition text-sm" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} />
                            <button type="submit" disabled={isAiLoading || !aiQuery.trim()} className={`p-3 rounded-xl transition shadow-lg flex items-center justify-center ${isAiLoading || !aiQuery.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95'}`}><Send size={20} /></button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- TABS NAVIGATION --- */}
            <div className="flex-1 overflow-hidden flex flex-col relative z-10">
                <div className="px-8 pt-8 pb-0 flex gap-2 border-b border-gray-200 bg-transparent overflow-x-auto custom-scrollbar">
                    {['overview', 'income', 'spending', 'influencer_roi'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3.5 font-bold text-sm rounded-t-2xl transition-all duration-300 capitalize relative overflow-hidden whitespace-nowrap ${activeTab === tab ? 'bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)] border border-b-0 border-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-800'}`}>
                            <span className="relative z-10">{tab === 'influencer_roi' ? 'Influencer ROI' : tab}</span>
                            {activeTab === tab && (
                                <div className={`absolute bottom-0 left-0 w-full h-1 rounded-t-xl ${tab === 'income' ? 'bg-green-500' : tab === 'spending' ? 'bg-red-500' : tab === 'influencer_roi' ? 'bg-orange-500' : 'bg-indigo-600'}`}></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                    
                    {/* --- OVERVIEW TAB --- */}
                    {activeTab === 'overview' && (
                        
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12 max-w-[1600px] mx-auto">
                            
                            {/* --- KPI ROW --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Total Budget */}
                                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border border-slate-800">
                                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors duration-500"></div>
                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Budget</span>
                                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md shadow-inner border border-white/5"><Wallet size={20} className="text-blue-300"/></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-4xl font-black tracking-tighter mb-2 drop-shadow-sm" title={`฿${formatAmount(TOTAL_BUDGET_CONST)}`}>
                                            ฿{formatCompactNumber(TOTAL_BUDGET_CONST)}
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2 mt-4 mb-2 overflow-hidden shadow-inner">
                                            <div className={`h-2 rounded-full transition-all duration-1000 ease-out ${budgetUsedPct > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-400'}`} style={{width: `${budgetUsedPct}%`}}></div>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                            <span>{budgetUsedPct}% Used</span>
                                            <span className="text-blue-300">฿{formatCompactNumber(TOTAL_BUDGET_CONST - totalSpending)} Left</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Income */}
                                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-900/5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Income</span>
                                        <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl text-green-600 group-hover:scale-110 group-hover:bg-green-100 transition-all duration-300"><TrendingUp size={20}/></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-4xl font-black text-gray-900 tracking-tighter" title={`฿${formatAmount(totalIncome)}`}>
                                            ฿{formatCompactNumber(totalIncome)}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-3 font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Across {transactions.filter(t=>t.type==='income').length} transactions</p>
                                    </div>
                                </div>

                                {/* Total Spending */}
                                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-900/5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Spending</span>
                                        <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 group-hover:scale-110 group-hover:bg-red-100 transition-all duration-300"><TrendingDown size={20}/></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-4xl font-black text-gray-900 tracking-tighter" title={`฿${formatAmount(totalSpending)}`}>
                                            ฿{formatCompactNumber(totalSpending)}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-3 font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Across {transactions.filter(t=>t.type==='spending').length} transactions</p>
                                    </div>
                                </div>

                                {/* Net Balance */}
                                <div className={`p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden ${netBalance >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-50 border border-green-200' : 'bg-gradient-to-br from-rose-50 to-red-50 border border-red-200'}`}>
                                    <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl transition-opacity duration-700 ${netBalance >= 0 ? 'bg-green-400/20' : 'bg-red-400/20'}`}></div>
                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <span className={`text-xs font-bold uppercase tracking-widest ${netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>Net Balance</span>
                                        <div className={`p-2.5 rounded-xl border bg-white/50 backdrop-blur-sm shadow-sm ${netBalance >= 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}><Activity size={20}/></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className={`text-4xl font-black tracking-tighter drop-shadow-sm ${netBalance >= 0 ? 'text-green-800' : 'text-red-800'}`} title={`฿${formatAmount(Math.abs(netBalance))}`}>
                                            {netBalance >= 0 ? '+' : '-'}฿{formatCompactNumber(Math.abs(netBalance))}
                                        </div>
                                        <p className={`text-xs mt-3 font-bold uppercase tracking-wider ${netBalance >= 0 ? 'text-green-600/70' : 'text-red-600/70'}`}>Income vs Spending</p>
                                    </div>
                                </div>
                            </div>

                            {/* --- LINE CHART (FULL WIDTH) --- */}
                            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col relative overflow-hidden w-full">
                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">Cash Flow Dynamics</h3>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Monthly trajectory of income and expenses</p>
                                    </div>
                                    <div className="flex gap-4 text-xs font-bold bg-gray-50/80 backdrop-blur-md border border-gray-100 px-4 py-2 rounded-xl">
                                        <span className="text-green-600 flex items-center gap-2"><div className="w-3 h-3 rounded bg-gradient-to-br from-green-400 to-green-600 shadow-sm"></div> Income</span>
                                        <span className="text-red-600 flex items-center gap-2"><div className="w-3 h-3 rounded bg-gradient-to-br from-red-400 to-red-600 shadow-sm"></div> Spending</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[360px] w-full relative z-10">
                                    <InteractiveCombinedChart data={combinedData} />
                                </div>
                            </div>

                            {/* --- PIE CHARTS (SIDE BY SIDE) --- */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Income Breakdown */}
                                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col">
                                    <div className="mb-8 text-center">
                                        <h3 className="text-xl font-black text-gray-900">Income Distribution</h3>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Where your revenue comes from</p>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <InteractivePieChart data={incomeCategories} type="income" />
                                    </div>
                                </div>

                                {/* Spending Breakdown */}
                                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col">
                                    <div className="mb-8 text-center">
                                        <h3 className="text-xl font-black text-gray-900">Spending Distribution</h3>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Where your budget is going</p>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <InteractivePieChart data={spendingCategories} type="spending" />
                                    </div>
                                </div>
                            </div>

                            {/* --- DEEP DIVE ROW (Top Lists) --- */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Top Income Sources */}
                                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
                                    <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                        <h3 className="font-black text-gray-900 text-lg flex items-center gap-2"><TrendingUp size={20} className="text-green-500"/> Top Income Sources</h3>
                                        <span className="text-[10px] font-black text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm">Top 5</span>
                                    </div>
                                    <div className="p-4 flex-1 bg-gray-50/30">
                                        {topIncome.slice(0, 5).map((t, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-white hover:shadow-md rounded-2xl transition-all duration-300 group cursor-default border border-transparent hover:border-gray-100 mb-2 last:mb-0" style={{ animationDelay: `${idx * 0.1}s` }}>
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200/50 flex items-center justify-center text-green-600 font-bold shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                                        {t.brand ? t.brand.charAt(0).toUpperCase() : <TrendingUp size={20}/>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 text-base truncate group-hover:text-green-700 transition-colors">{t.brand || t.description || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{t.category}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-4">
                                                    <p className="font-black text-green-600 text-base tracking-tight drop-shadow-sm">฿{formatCompactNumber(t.amount)}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{new Date(t.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {topIncome.length === 0 && <div className="p-12 text-center text-gray-400 font-medium">No income recorded yet</div>}
                                    </div>
                                </div>

                                {/* Top Expenses */}
                                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
                                    <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                        <h3 className="font-black text-gray-900 text-lg flex items-center gap-2"><TrendingDown size={20} className="text-red-500"/> Top Expenses</h3>
                                        <span className="text-[10px] font-black text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm">Top 5</span>
                                    </div>
                                    <div className="p-4 flex-1 bg-gray-50/30">
                                        {topSpending.slice(0, 5).map((t, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-white hover:shadow-md rounded-2xl transition-all duration-300 group cursor-default border border-transparent hover:border-gray-100 mb-2 last:mb-0" style={{ animationDelay: `${idx * 0.1}s` }}>
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200/50 flex items-center justify-center text-red-600 font-bold shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                                        {t.brand ? t.brand.charAt(0).toUpperCase() : <TrendingDown size={20}/>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 text-base truncate group-hover:text-red-700 transition-colors">{t.brand || t.description || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{t.category}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-4">
                                                    <p className="font-black text-red-600 text-base tracking-tight drop-shadow-sm">฿{formatCompactNumber(t.amount)}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{new Date(t.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {topSpending.length === 0 && <div className="p-12 text-center text-gray-400 font-medium">No expenses recorded yet</div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                    )}

                    {/* --- INFLUENCER ROI TAB --- */}
                    {activeTab === 'influencer_roi' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-12">
                            
                            {isRoiLoading ? (
                                <div className="flex flex-col items-center justify-center py-32 text-indigo-500">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                    <p className="font-bold">Fetching Live Data from Google Sheets...</p>
                                </div>
                            ) : roiError ? (
                                <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex items-start gap-4">
                                    <Activity size={24} className="mt-1 shrink-0"/> 
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Connection Error</h4>
                                        <p className="text-sm">{roiError}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Filters Section */}
                                    <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                                <Target size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">Campaign ROAS Dashboard</h3>
                                                <p className="text-xs text-gray-500">Filter by Influencer or Month to recalculate metrics</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                            {/* Influencer Filter */}
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                                <Users size={14} className="text-gray-400 ml-2" />
                                                <select 
                                                    className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none pr-4 cursor-pointer"
                                                    value={roiInfluencerFilter}
                                                    onChange={(e) => setRoiInfluencerFilter(e.target.value)}
                                                >
                                                    {uniqueInfluencers.map(inf => (
                                                        <option key={inf} value={inf}>{inf === 'ALL' ? 'All Influencers' : inf}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* Date/Month Filter */}
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                                <Calendar size={14} className="text-gray-400 ml-2" />
                                                <select 
                                                    className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none pr-4 cursor-pointer"
                                                    value={roiMonthFilter}
                                                    onChange={(e) => setRoiMonthFilter(e.target.value)}
                                                >
                                                    {uniqueMonths.map(month => (
                                                        <option key={month} value={month}>{month === 'ALL' ? 'All Months' : month}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KPI Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Users size={20}/></div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-bold mb-1">Total Reach</p>
                                            <h3 className="text-3xl font-black text-gray-800">
                                                {(roiTotalReach / 1000000).toFixed(2)}<span className="text-lg text-gray-400">M</span>
                                            </h3>
                                        </div>

                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Activity size={20}/></div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-bold mb-1">Total Media Value</p>
                                            <h3 className="text-3xl font-black text-gray-800">
                                                ฿{formatCompactNumber(roiTotalMediaValue)}
                                            </h3>
                                        </div>

                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Zap size={20}/></div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-bold mb-1 relative z-10">Campaign Efficiency</p>
                                            <h3 className="text-3xl font-black text-gray-800 relative z-10">
                                                {roiAvgEfficiency}<span className="text-lg text-gray-400">x</span>
                                            </h3>
                                        </div>

                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><DollarSign size={20}/></div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-bold mb-1 relative z-10">Net Savings</p>
                                            <h3 className="text-3xl font-black text-green-600 relative z-10">
                                                +฿{formatCompactNumber(roiTotalSavings)}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Main Visualizer Chart */}
                                        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[450px]">
                                            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                                <PieChartIcon className="text-orange-500"/> Media Value vs Spend
                                            </h3>
                                            <div className="flex-1 w-full">
                                                {filteredROI.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={filteredROI} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                            <XAxis dataKey="influencer" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10}/>
                                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `฿${val/1000}k`}/>
                                                            <RechartsTooltip 
                                                                cursor={{fill: '#f8fafc'}}
                                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                            />
                                                            <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', color: '#64748b' }}/>
                                                            <Bar dataKey="mediaValue" name="Earned Media Value (฿)" fill="#f97316" radius={[6,6,0,0]} />
                                                            <Bar dataKey="spend" name="Actual Spend (฿)" fill="#cbd5e1" radius={[6,6,0,0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                                        No data available for these filters.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Extra Visualizer from M2:N5 */}
                                        {m2n5Data.length > 0 ? (
                                            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[450px]">
                                                <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                                    <BarChart3 className="text-indigo-500"/> Breakdown
                                                </h3>
                                                <div className="flex-1 w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={m2n5Data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `฿${val/1000}k`}/>
                                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} width={120}/>
                                                            <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 'bold' }}/>
                                                            <Bar dataKey="value" name="Value" fill="#8b5cf6" radius={[0,6,6,0]} barSize={24} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white p-8 rounded-3xl border border-gray-100 border-dashed flex flex-col items-center justify-center text-gray-400 font-bold h-[450px]">
                                                <PieChartIcon size={48} className="mb-4 text-gray-200" />
                                                No breakdown data found
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Monthly Breakdown Chart */}
                                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[450px] mt-8">
                                        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                            <Calendar className="text-blue-500"/> Monthly Trend: Media Value vs Spend
                                        </h3>
                                        <div className="flex-1 w-full">
                                            {monthlyROIBreakdown.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={monthlyROIBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10}/>
                                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `฿${val/1000}k`}/>
                                                        <RechartsTooltip 
                                                            cursor={{fill: '#f8fafc'}}
                                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                        />
                                                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', color: '#64748b' }}/>
                                                        <Bar dataKey="mediaValue" name="Earned Media Value (฿)" fill="#3b82f6" radius={[6,6,0,0]} />
                                                        <Bar dataKey="spend" name="Actual Spend (฿)" fill="#cbd5e1" radius={[6,6,0,0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                                    No data available for these filters.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* --- INCOME / SPENDING DATA TABLES --- */}
                    {(activeTab === 'income' || activeTab === 'spending') && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-bold border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                                    <tr className="whitespace-nowrap">
                                        <th className="px-6 py-4">Date</th><th className="px-6 py-4">Brand</th><th className="px-6 py-4">Category</th><th className="px-6 py-4 w-64">Description</th><th className="px-6 py-4 text-right">Amount (THB)</th><th className="px-6 py-4">Company</th><th className="px-6 py-4 w-48">Email Subject</th><th className="px-6 py-4">Quotation</th><th className="px-6 py-4">Invoice</th><th className="px-6 py-4">Payment Date</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4">Slip</th><th className="px-6 py-4 w-48">Remark</th><th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredTransactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group whitespace-nowrap">
                                            <td className="px-4 py-4"><EditableCell type="date" value={t.date} onSave={(val) => onUpdate(t.id, { date: val })} /></td>
                                            <td className="px-4 py-4"><EditableCell value={t.brand} className="font-bold text-gray-700" onSave={(val) => onUpdate(t.id, { brand: val })} /></td>
                                            <td className="px-4 py-4"><EditableCell type="select" options={BUDGET_CATEGORIES} value={t.category} onSave={(val) => onUpdate(t.id, { category: val })} /></td>
                                            <td className="px-4 py-4"><EditableCell value={t.description} onSave={(val) => onUpdate(t.id, { description: val })} /></td>
                                            <td className="px-4 py-4 text-right"><EditableCell type="number" value={t.amount} className={`font-mono font-bold text-right ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`} onSave={(val) => onUpdate(t.id, { amount: val })} /></td>
                                            <td className="px-4 py-4"><EditableCell value={t.company} onSave={(val) => onUpdate(t.id, { company: val })} /></td>
                                            <td className="px-4 py-4"><EditableCell value={t.emailSubject} className="text-gray-600 truncate text-xs" onSave={(val) => onUpdate(t.id, { emailSubject: val })} /></td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <EditableCell value={t.quotation} className="font-mono text-xs w-20" onSave={(val) => onUpdate(t.id, { quotation: val })} />
                                                    {t.qtFile && (<button onClick={() => setPreviewFile(t.qtFile)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="Preview"><Eye size={16} /></button>)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <EditableCell value={t.invoice} className="font-mono text-xs w-20" onSave={(val) => onUpdate(t.id, { invoice: val })} />
                                                    {t.invoiceFile && (<button onClick={() => setPreviewFile(t.invoiceFile)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="Preview"><Eye size={16} /></button>)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4"><EditableCell type="date" value={t.paymentDate} onSave={(val) => onUpdate(t.id, { paymentDate: val })} /></td>
                                            <td className="px-4 py-4 text-center"><EditableCell type="select" options={BUDGET_STATUSES} value={t.status} className={`rounded-full text-xs font-bold border px-2 py-1 ${t.status === 'Complete' ? 'bg-green-50 text-green-700 border-green-200' : t.status === 'Follow-up' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`} onSave={(val) => onUpdate(t.id, { status: val })} /></td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <EditableCell value={t.slip} className="font-mono text-xs w-20" onSave={(val) => onUpdate(t.id, { slip: val })} />
                                                    {t.slipFile && (<button onClick={() => setPreviewFile(t.slipFile)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="Preview"><Eye size={16} /></button>)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4"><EditableCell value={t.remark} className="italic text-gray-500 text-xs" onSave={(val) => onUpdate(t.id, { remark: val })} /></td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={() => handleEditClick(t)} className="text-blue-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50" title="Edit"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDuplicate(t)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50" title="Duplicate"><Copy size={16} /></button>
                                                    <button onClick={() => onDelete(t.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && <tr><td colSpan="14" className="px-6 py-12 text-center text-gray-400 font-medium bg-gray-50/50">No records found. Click "Add Record" to start tracking.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ADD TRANSACTION MODAL --- */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                            <div><h3 className="text-2xl font-bold text-gray-900">Add Record</h3><p className="text-sm text-gray-500 mt-1">Select type and fill details.</p></div>
                            <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                           <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={newTransaction.type} onChange={e => setNewTransaction({...newTransaction, type: e.target.value})}><option value="income">Income</option><option value="spending">Spending</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label><input required type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brand</label><input required type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.brand} onChange={e => setNewTransaction({...newTransaction, brand: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}>{BUDGET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount</label><input required type="number" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})} /></div>
                            </div>
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.company} onChange={e => setNewTransaction({...newTransaction, company: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Subject</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.emailSubject} onChange={e => setNewTransaction({...newTransaction, emailSubject: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quotation No.</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.quotation} onChange={e => setNewTransaction({...newTransaction, quotation: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload Quotation</label>
                                        {newTransaction.qtFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold"><Paperclip size={16}/> Attached</span>
                                                <button type="button" onClick={handleRemoveQt} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleQtUpload} className="hidden" id="addQt"/>
                                                <label htmlFor="addQt" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select File</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Invoice No.</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.invoice} onChange={e => setNewTransaction({...newTransaction, invoice: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload</label>
                                        {newTransaction.invoiceFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold"><Paperclip size={16}/> Attached</span>
                                                <button type="button" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleFileUpload} className="hidden" id="addFile"/>
                                                <label htmlFor="addFile" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select File</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Date</label><input type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.paymentDate} onChange={e => setNewTransaction({...newTransaction, paymentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.status} onChange={e => setNewTransaction({...newTransaction, status: e.target.value})}>{BUDGET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Slip</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.slip} onChange={e => setNewTransaction({...newTransaction, slip: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload</label>
                                        {newTransaction.slipFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold"><Paperclip size={16}/> Attached</span>
                                                <button type="button" onClick={handleRemoveSlip} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleSlipUpload} className="hidden" id="addSlip"/>
                                                <label htmlFor="addSlip" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select File</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Remark</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={newTransaction.remark} onChange={e => setNewTransaction({...newTransaction, remark: e.target.value})} /></div>
                            </div>
                            <div className="md:col-span-2 pt-6 border-t flex justify-end gap-3"><button type="button" onClick={() => setIsAddOpen(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Cancel</button><button type="submit" className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700">Save Record</button></div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* --- EDIT TRANSACTION MODAL --- */}
            {isEditOpen && editFormData && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                            <div><h3 className="text-2xl font-bold text-gray-900">Edit Record</h3><p className="text-sm text-gray-500 mt-1">Modify transaction details.</p></div>
                            <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                             <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={editFormData.type} onChange={e => setEditFormData({...editFormData, type: e.target.value})}><option value="income">Income</option><option value="spending">Spending</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label><input required type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.date} onChange={e => setEditFormData({...editFormData, date: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brand</label><input required type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.brand} onChange={e => setEditFormData({...editFormData, brand: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})}>{BUDGET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount</label><input required type="number" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} /></div>
                            </div>
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.company} onChange={e => setEditFormData({...editFormData, company: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Subject</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.emailSubject} onChange={e => setEditFormData({...editFormData, emailSubject: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quotation No.</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.quotation} onChange={e => setEditFormData({...editFormData, quotation: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update File</label>
                                        {editFormData.qtFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold truncate max-w-[150px]"><Paperclip size={16}/> File Attached</span>
                                                <button type="button" onClick={handleRemoveEditQt} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleEditQt} className="hidden" id="editQt"/>
                                                <label htmlFor="editQt" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select New</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Invoice No.</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.invoice} onChange={e => setEditFormData({...editFormData, invoice: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update File</label>
                                        {editFormData.invoiceFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold truncate max-w-[150px]"><Paperclip size={16}/> File Attached</span>
                                                <button type="button" onClick={handleRemoveEditFile} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleEditFileUpload} className="hidden" id="editFile"/>
                                                <label htmlFor="editFile" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select New</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Date</label><input type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.paymentDate} onChange={e => setEditFormData({...editFormData, paymentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>{BUDGET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Slip</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.invoice} onChange={e => setEditFormData({...editFormData, invoice: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update File</label>
                                        {editFormData.slipFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold truncate max-w-[150px]"><Paperclip size={16}/> File Attached</span>
                                                <button type="button" onClick={handleRemoveEditSlip} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleEditSlip} className="hidden" id="editSlip"/>
                                                <label htmlFor="editSlip" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select New</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Remark</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={editFormData.remark} onChange={e => setEditFormData({...editFormData, remark: e.target.value})} /></div>
                            </div>
                            <div className="md:col-span-2 pt-6 border-t flex justify-end gap-3"><button type="button" onClick={() => setIsEditOpen(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Cancel</button><button type="submit" className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700">Save Changes</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- PREVIEW MODAL --- */}
            {previewFile && (
                <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setPreviewFile(null)}>
                    <div className="relative w-full h-full max-w-5xl max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><FileText size={20}/> Document Preview</h3>
                            <button onClick={() => setPreviewFile(null)} className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-500 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-4">
                            {previewFile.startsWith('data:image') ? (
                                <img src={previewFile} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
                            ) : (
                                <iframe src={previewFile} title="Document Preview" className="w-full h-full border-none shadow-lg bg-white rounded" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ✨ PREMIUM INTERACTIVE CHARTS ✨ ---

const InteractiveCombinedChart = ({ data }) => {
    const [hoverIndex, setHoverIndex] = useState(null);

    if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400 font-medium">No data available to chart</div>;
    
    const height = 300; 
    const width = 1000;
    const paddingX = 40;
    const paddingY = 40;
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.spending))) * 1.1 || 100;
    
    const getCoordinates = (key) => data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * (width - 2 * paddingX) + paddingX;
        const y = height - paddingY - ((d[key] / maxVal) * (height - 2 * paddingY));
        return { x, y, value: d[key] };
    });

    const incomeCoords = getCoordinates('income');
    const spendingCoords = getCoordinates('spending');
    
    const incomePoints = incomeCoords.map(c => `${c.x},${c.y}`).join(' ');
    const spendingPoints = spendingCoords.map(c => `${c.x},${c.y}`).join(' ');

    return (
        <div className="w-full h-full relative group">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#16a34a" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#dc2626" stopOpacity="0"/>
                    </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.33, 0.66, 1].map(ratio => {
                     const y = height - paddingY - (ratio * (height - 2 * paddingY));
                     return <line key={ratio} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={ratio === 0 ? "0" : "4 4"}/>
                })}

                {/* Area Polygons */}
                <polygon points={`${incomePoints} ${width-paddingX},${height-paddingY} ${paddingX},${height-paddingY}`} fill="url(#incomeGrad)" className="transition-all duration-700"/>
                <polygon points={`${spendingPoints} ${width-paddingX},${height-paddingY} ${paddingX},${height-paddingY}`} fill="url(#spendingGrad)" className="transition-all duration-700"/>

                {/* Lines */}
                <polyline fill="none" stroke="#16a34a" strokeWidth="3" points={incomePoints} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm"/>
                <polyline fill="none" stroke="#dc2626" strokeWidth="3" points={spendingPoints} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm"/>

                {/* X-Axis Labels & Hover Catchers */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1 || 1)) * (width - 2 * paddingX) + paddingX;
                    const isHovered = hoverIndex === i;
                    return (
                        <g key={i}>
                             <text x={x} y={height - 10} textAnchor="middle" fontSize="12" fill={isHovered ? "#111827" : "#94a3b8"} fontWeight={isHovered ? "bold" : "500"} className="transition-colors">{d.date.split(' ')[0]}</text>
                             
                             {/* Tracking Line */}
                             {isHovered && (
                                <line x1={x} y1={paddingY} x2={x} y2={height - paddingY} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />
                             )}

                             {/* Data Points */}
                             <circle cx={x} cy={incomeCoords[i].y} r={isHovered ? "6" : "3"} fill="#16a34a" stroke="white" strokeWidth={isHovered ? "2" : "0"} className="transition-all duration-200 shadow-xl"/>
                             <circle cx={x} cy={spendingCoords[i].y} r={isHovered ? "6" : "3"} fill="#dc2626" stroke="white" strokeWidth={isHovered ? "2" : "0"} className="transition-all duration-200 shadow-xl"/>
                             
                             {/* Invisible Hover Area */}
                             <rect 
                                x={x - ((width - 2*paddingX)/(data.length-1))/2} 
                                y={0} 
                                width={(width - 2*paddingX)/(data.length-1)} 
                                height={height} 
                                fill="transparent" 
                                onMouseEnter={() => setHoverIndex(i)}
                                onMouseLeave={() => setHoverIndex(null)}
                                className="cursor-crosshair"
                             />
                        </g>
                    );
                })}
            </svg>

            {/* Interactive HTML Tooltip */}
            {hoverIndex !== null && (
                <div 
                    className="absolute bg-white/90 backdrop-blur-md shadow-2xl border border-gray-100 p-4 rounded-2xl pointer-events-none transform -translate-x-1/2 -translate-y-[110%] transition-all duration-100 ease-out z-20 min-w-[160px]"
                    style={{ 
                        left: `${(hoverIndex / (data.length - 1 || 1)) * 100 * (1 - (80/1000)) + 4}%`,
                        top: `${Math.min(incomeCoords[hoverIndex].y, spendingCoords[hoverIndex].y) / height * 100}%` 
                    }}
                >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">{data[hoverIndex].date}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Income</span>
                            <span className="text-sm font-black text-green-600">฿{formatCompactNumber(data[hoverIndex].income)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Spending</span>
                            <span className="text-sm font-black text-red-600">฿{formatCompactNumber(data[hoverIndex].spending)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InteractivePieChart = ({ data, type = "spending" }) => {
    const [hoverIndex, setHoverIndex] = useState(null);

    if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400 font-medium">No data to display</div>;
    
    const total = data.reduce((acc, cur) => acc + cur.value, 0);
    let currentAngle = 0;
    
    // Dynamic color palettes
    const spendingColors = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#d946ef', '#f97316'];
    const incomeColors = ['#10b981', '#3b82f6', '#0ea5e9', '#14b8a6', '#06b6d4', '#34d399', '#2dd4bf'];
    const colors = type === 'income' ? incomeColors : spendingColors;

    return (
        <div className="flex flex-col items-center w-full">
            <div className="w-48 h-48 relative mb-8">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-xl overflow-visible">
                    {data.map((d, i) => {
                        const sliceAngle = (d.value / total) * 360;
                        const isHovered = hoverIndex === i;
                        // Math to scale out the hovered slice slightly
                        const scale = isHovered ? 1.05 : 1;
                        const translateOffset = isHovered ? 2 : 0;
                        const midAngle = currentAngle + (sliceAngle / 2);
                        const tx = translateOffset * Math.cos(Math.PI * midAngle / 180);
                        const ty = translateOffset * Math.sin(Math.PI * midAngle / 180);

                        const x1 = 50 + 50 * Math.cos(Math.PI * currentAngle / 180);
                        const y1 = 50 + 50 * Math.sin(Math.PI * currentAngle / 180);
                        const x2 = 50 + 50 * Math.cos(Math.PI * (currentAngle + sliceAngle) / 180);
                        const y2 = 50 + 50 * Math.sin(Math.PI * (currentAngle + sliceAngle) / 180);
                        const largeArc = sliceAngle > 180 ? 1 : 0;
                        const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
                        
                        currentAngle += sliceAngle;
                        return (
                            <path 
                                key={i} 
                                d={pathData} 
                                fill={colors[i % colors.length]} 
                                stroke="white" 
                                strokeWidth={isHovered ? "2" : "1"}
                                className="transition-all duration-300 cursor-pointer origin-center"
                                style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
                                onMouseEnter={() => setHoverIndex(i)}
                                onMouseLeave={() => setHoverIndex(null)}
                            />
                        );
                    })}
                    {/* Inner cutout for donut chart effect */}
                    <circle cx="50" cy="50" r="25" fill="white" className="drop-shadow-inner" />
                </svg>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {hoverIndex !== null ? (
                        <>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{((data[hoverIndex].value / total) * 100).toFixed(0)}%</span>
                            <span className="text-sm font-black text-gray-800 tracking-tighter">฿{formatCompactNumber(data[hoverIndex].value)}</span>
                        </>
                    ) : (
                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Hover</span>
                    )}
                </div>
            </div>

            <div className="w-full space-y-2 overflow-y-auto max-h-48 pr-2 custom-scrollbar">
                {data.map((d, i) => (
                    <div 
                        key={i} 
                        className={`flex justify-between items-center p-2 rounded-lg transition-all cursor-default ${hoverIndex === i ? 'bg-gray-50 scale-105' : 'hover:bg-gray-50/50'}`}
                        onMouseEnter={() => setHoverIndex(i)}
                        onMouseLeave={() => setHoverIndex(null)}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded shadow-sm transition-transform ${hoverIndex === i ? 'scale-125' : ''}`} style={{backgroundColor: colors[i % colors.length]}}></span>
                            <span className={`text-sm truncate max-w-[150px] transition-colors ${hoverIndex === i ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`} title={d.name}>{d.name}</span>
                        </div>
                        <span className={`text-sm transition-colors ${hoverIndex === i ? 'font-black text-gray-900' : 'font-bold text-gray-400'}`}>฿{formatCompactNumber(d.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- TABLE CELL COMPONENT ---

const EditableCell = ({ value, onSave, type = "text", options = null, className = "" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value || "");

    useEffect(() => { setLocalValue(value || ""); }, [value]);

    const handleBlur = () => { setIsEditing(false); if (localValue !== value) { onSave(localValue); } };
    const handleKeyDown = (e) => { if (e.key === 'Enter') e.target.blur(); };

    if (type === 'select' && options) { 
        return ( 
            <select value={localValue} onChange={(e) => { setLocalValue(e.target.value); onSave(e.target.value); }} className={`w-full bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 rounded px-1 transition-all cursor-pointer appearance-none ${className}`}>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        ); 
    }
    
    if (isEditing) { 
        return (
            <input type={type} value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} autoFocus className={`w-full bg-white outline-none ring-2 ring-blue-200 rounded px-1 ${className}`} placeholder="-" />
        ); 
    }
    
    let displayValue = localValue;
    if (type === 'number' && localValue) { displayValue = formatAmount(localValue); }
    
    return (
        <div onClick={() => setIsEditing(true)} className={`w-full cursor-text rounded px-1 hover:bg-gray-100 min-h-[24px] flex items-center ${className}`} title="Click to edit">
            {displayValue || "-"}
        </div>
    );
};

export default BudgetView;