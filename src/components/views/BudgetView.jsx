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
  Copy
} from 'lucide-react';

import { BUDGET_CATEGORIES } from '../../utils/constants';
import { analyzeFinancials } from '../../utils/aiService';
import aiAvatar from '../../assets/bot/avatar.png'

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
    const spendingCategories = getCategoryData('spending');
    const topIncome = getTopTransactions('income');
    const topSpending = getTopTransactions('spending');

    const uniqueMonths = useMemo(() => {
        const months = new Set();
        transactions.filter(t => t.type === 'income').forEach(t => {
            if (t.date) {
                const d = new Date(t.date);
                months.add(`${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`);
            }
        });
        return Array.from(months);
    }, [transactions]);

    const uniqueBrands = useMemo(() => {
        const brands = new Set();
        transactions.filter(t => t.type === 'income').forEach(t => {
            if (t.brand) brands.add(t.brand);
        });
        return Array.from(brands).sort();
    }, [transactions]);

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

    // --- HANDLERS (Omitted for brevity, using existing functionality) ---
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
                    {activeTab !== 'overview' && (
                        <div className="text-right pr-4 border-r border-gray-200">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total {activeTab}</p>
                            <p className={`text-2xl font-black tracking-tighter ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>฿{formatAmount(tabTotal)}</p>
                        </div>
                    )}
                    <button onClick={() => setIsAddOpen(true)} className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-gray-900/20 flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl"><Plus size={18} /> Add Record</button>
                </div>
            </header>

            {/* AI Modal, Add Modal, Edit Modal, Preview Modal omitted for brevity (keep your exact code) */}
            
            {/* --- TABS --- */}
            <div className="flex-1 overflow-hidden flex flex-col relative z-10">
                <div className="px-8 pt-8 pb-0 flex gap-2 border-b border-gray-200 bg-transparent">
                    {['overview', 'income', 'spending'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3.5 font-bold text-sm rounded-t-2xl transition-all duration-300 capitalize relative overflow-hidden ${activeTab === tab ? 'bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)] border border-b-0 border-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-800'}`}>
                            <span className="relative z-10">{tab}</span>
                            {activeTab === tab && (
                                <div className={`absolute bottom-0 left-0 w-full h-1 rounded-t-xl ${tab === 'income' ? 'bg-green-500' : tab === 'spending' ? 'bg-red-500' : 'bg-indigo-600'}`}></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                    {activeTab === 'overview' ? (
                        
                        /* 🟢 NEW PREMIUM INTERACTIVE DASHBOARD */
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12 max-w-[1600px] mx-auto">
                            
                            {/* --- KPI ROW --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                
                                {/* Total Budget (Dark Theme) */}
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

                            {/* --- MAIN CHARTS ROW --- */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Interactive Area Chart */}
                                <div className="lg:col-span-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col relative overflow-hidden">
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
                                    <div className="flex-1 min-h-[320px] w-full relative z-10">
                                        <InteractiveCombinedChart data={combinedData} />
                                    </div>
                                </div>

                                {/* Spending Breakdown */}
                                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col">
                                    <div className="mb-8 text-center">
                                        <h3 className="text-xl font-black text-gray-900">Spending Distribution</h3>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Where your budget is going</p>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <InteractivePieChart data={spendingCategories} />
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

                    ) : (
                        /* KEEP EXISTING TABLE FOR INCOME/SPENDING TABS */
                        <div>...</div>
                    )}
                </div>
            </div>
            {/* Modals omitted for brevity */}
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
                        left: `${(hoverIndex / (data.length - 1 || 1)) * 100 * (1 - (80/1000)) + 4}%`, // Rough % calculation based on SVG width
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

const InteractivePieChart = ({ data }) => {
    const [hoverIndex, setHoverIndex] = useState(null);

    if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400 font-medium">No data to display</div>;
    
    const total = data.reduce((acc, cur) => acc + cur.value, 0);
    let currentAngle = 0;
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

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

export default BudgetView;