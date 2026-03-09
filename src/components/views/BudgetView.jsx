// src/components/views/BudgetView.jsx
import React, { useState } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, PieChart, Pie, Cell,
    BarChart, Bar, Legend // 🟢 NEW: Added for ROI Bar Chart
} from 'recharts';
import { 
    Plus, ArrowUpCircle, ArrowDownCircle, Search, Edit2, Trash2, Calendar, 
    TrendingUp, DollarSign, PieChart as PieChartIcon, Activity,
    Users, Target, Zap, Filter // 🟢 NEW: Added for ROI Dashboard
} from 'lucide-react';

const BudgetView = ({ transactions, onAdd, onUpdate, onDelete }) => {
    const [activeTab, setActiveTab] = useState('OVERVIEW');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);

    // --- 🟢 NEW: INFLUENCER ROI STATE & MOCK DATA ---
    const [roiSheetFilter, setRoiSheetFilter] = useState('ALL');
    const [roiInfluencerFilter, setRoiInfluencerFilter] = useState('ALL');

    // This mimics the data structure from your .xlsx template
    const mockROIData = [
        { id: 1, sheetName: "Q1_Tech_Launch", influencer: "ZackTech", reach: 1200000, mediaValue: 45000, spend: 15000, savings: 30000, efficiency: 3.0 },
        { id: 2, sheetName: "Q1_Tech_Launch", influencer: "ExtremeIT", reach: 2500000, mediaValue: 80000, spend: 20000, savings: 60000, efficiency: 4.0 },
        { id: 3, sheetName: "Summer_Promo", influencer: "ZackTech", reach: 950000, mediaValue: 32000, spend: 12000, savings: 20000, efficiency: 2.66 },
        { id: 4, sheetName: "Summer_Promo", influencer: "GamerGirl", reach: 1800000, mediaValue: 65000, spend: 18000, savings: 47000, efficiency: 3.61 },
        { id: 5, sheetName: "Black_Friday", influencer: "ExtremeIT", reach: 3000000, mediaValue: 120000, spend: 30000, savings: 90000, efficiency: 4.0 },
        { id: 6, sheetName: "Black_Friday", influencer: "PCBuilderTH", reach: 850000, mediaValue: 28000, spend: 10000, savings: 18000, efficiency: 2.8 }
    ];

    // Filter Dropdown Options
    const uniqueSheets = ["ALL", ...new Set(mockROIData.map(d => d.sheetName))];
    const uniqueInfluencers = ["ALL", ...new Set(mockROIData.map(d => d.influencer))];

    // Computed Filtered Data
    const filteredROI = mockROIData.filter(item => {
        const matchSheet = roiSheetFilter === 'ALL' || item.sheetName === roiSheetFilter;
        const matchInfluencer = roiInfluencerFilter === 'ALL' || item.influencer === roiInfluencerFilter;
        return matchSheet && matchInfluencer;
    });

    // KPI Totals
    const roiTotalReach = filteredROI.reduce((sum, item) => sum + item.reach, 0);
    const roiTotalMediaValue = filteredROI.reduce((sum, item) => sum + item.mediaValue, 0);
    const roiTotalSpend = filteredROI.reduce((sum, item) => sum + item.spend, 0);
    const roiTotalSavings = filteredROI.reduce((sum, item) => sum + item.savings, 0);
    const roiAvgEfficiency = roiTotalSpend > 0 ? (roiTotalMediaValue / roiTotalSpend).toFixed(2) : 0;
    // ------------------------------------------------

    // Format currency Helper
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    };

    // Calculate KPI Totals
    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalSpending = transactions.filter(t => t.type === 'SPENDING').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalSpending;
    const totalBudget = 500000; // Simulated total budget

    // Prepare Chart Data (Monthly Trend)
    const monthlyData = [
        { name: 'Jan', income: 45000, spending: 30000 },
        { name: 'Feb', income: 52000, spending: 38000 },
        { name: 'Mar', income: totalIncome, spending: totalSpending }, // Injecting current real data for demo
    ];

    // Prepare Category Donut Data
    const incomeCategories = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});
    const pieIncomeData = Object.keys(incomeCategories).map(key => ({ name: key, value: incomeCategories[key] }));

    const spendingCategories = transactions.filter(t => t.type === 'SPENDING').reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});
    const pieSpendingData = Object.keys(spendingCategories).map(key => ({ name: key, value: spendingCategories[key] }));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Filtered Transactions for Tables
    const filteredTransactions = transactions.filter(t => 
        (activeTab === 'ALL' || t.type === activeTab) &&
        (t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans relative overflow-hidden">
            
            {/* --- HEADER --- */}
            <header className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl shadow-sm z-20 flex justify-between items-center sticky top-0 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl shadow-inner bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Financial Dashboard</h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Track budgets, ROI, and expenses</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-xl border border-gray-200/50">
                    {/* 🟢 NEW: Added INFLUENCER_ROI to the tabs array */}
                    {['OVERVIEW', 'INCOME', 'SPENDING', 'INFLUENCER_ROI'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === tab ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </header>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto space-y-8">

                    {/* --- OVERVIEW TAB --- */}
                    {activeTab === 'OVERVIEW' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* 1. KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition"></div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><DollarSign size={20}/></div>
                                    </div>
                                    <p className="text-sm text-gray-500 font-bold mb-1 relative z-10">Total Budget</p>
                                    <h3 className="text-3xl font-black text-gray-800 relative z-10">{formatMoney(totalBudget)}</h3>
                                </div>

                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition"></div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><ArrowUpCircle size={20}/></div>
                                    </div>
                                    <p className="text-sm text-gray-500 font-bold mb-1 relative z-10">Total Income</p>
                                    <h3 className="text-3xl font-black text-emerald-600 relative z-10">{formatMoney(totalIncome)}</h3>
                                </div>

                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition"></div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ArrowDownCircle size={20}/></div>
                                    </div>
                                    <p className="text-sm text-gray-500 font-bold mb-1 relative z-10">Total Spending</p>
                                    <h3 className="text-3xl font-black text-red-600 relative z-10">{formatMoney(totalSpending)}</h3>
                                </div>

                                <div className="bg-gray-900 rounded-3xl p-6 shadow-lg border border-gray-800 flex flex-col relative overflow-hidden group hover:shadow-xl transition">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition"></div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="p-3 bg-gray-800 text-white rounded-2xl border border-gray-700"><TrendingUp size={20}/></div>
                                    </div>
                                    <p className="text-sm text-gray-400 font-bold mb-1 relative z-10">Net Balance</p>
                                    <h3 className="text-3xl font-black text-white relative z-10">{formatMoney(netBalance)}</h3>
                                </div>
                            </div>

                            {/* 2. Main Area Chart */}
                            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                    <Activity className="text-blue-500"/> Cash Flow Trend
                                </h3>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10}/>
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10}/>
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                itemStyle={{ fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                            <Area type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSpending)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 3. Category Donuts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Income Donut */}
                                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center relative overflow-hidden">
                                    <div className="w-full flex justify-between items-center mb-6 absolute top-8 left-8 right-8">
                                        <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                            <PieChartIcon className="text-emerald-500"/> Income Sources
                                        </h3>
                                    </div>
                                    <div className="h-[250px] w-full mt-10">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieIncomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                                    {pieIncomeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Spending Donut */}
                                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center relative overflow-hidden">
                                    <div className="w-full flex justify-between items-center mb-6 absolute top-8 left-8 right-8">
                                        <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                            <PieChartIcon className="text-red-500"/> Spending Distribution
                                        </h3>
                                    </div>
                                    <div className="h-[250px] w-full mt-10">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieSpendingData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                                    {pieSpendingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* --- INCOME / SPENDING DATA TABLES --- */}
                    {(activeTab === 'INCOME' || activeTab === 'SPENDING') && (
                        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search transactions..." 
                                        className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition w-full shadow-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={() => onAdd({ type: activeTab, date: new Date().toISOString().split('T')[0], amount: 0, description: 'New Transaction', category: 'General' })}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition shadow-lg hover:-translate-y-0.5
                                        ${activeTab === 'INCOME' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'}
                                    `}
                                >
                                    <Plus size={16} /> Add {activeTab === 'INCOME' ? 'Income' : 'Expense'}
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                                            <th className="p-4 font-black">Date</th>
                                            <th className="p-4 font-black">Description</th>
                                            <th className="p-4 font-black">Category</th>
                                            <th className="p-4 font-black text-right">Amount</th>
                                            <th className="p-4 font-black text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {filteredTransactions.map(t => (
                                            <tr key={t.id} className="hover:bg-blue-50/30 transition group">
                                                <td className="p-4 text-gray-600 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400"/> {t.date}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-gray-800">{t.description}</td>
                                                <td className="p-4">
                                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold border border-gray-200">
                                                        {t.category}
                                                    </span>
                                                </td>
                                                <td className={`p-4 text-right font-black ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {t.type === 'INCOME' ? '+' : '-'}{formatMoney(t.amount)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={16}/></button>
                                                        <button onClick={() => onDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredTransactions.length === 0 && (
                                    <div className="p-12 text-center text-gray-400 font-medium">
                                        No transactions found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- 🟢 NEW: INFLUENCER ROI TAB --- */}
                    {activeTab === 'INFLUENCER_ROI' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* Filters Section */}
                            <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Campaign ROAS Dashboard</h3>
                                        <p className="text-xs text-gray-500">Filter by sheet or influencer to recalculate metrics</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                        <Filter size={14} className="text-gray-400 ml-2" />
                                        <select 
                                            className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none pr-4"
                                            value={roiSheetFilter}
                                            onChange={(e) => setRoiSheetFilter(e.target.value)}
                                        >
                                            {uniqueSheets.map(sheet => (
                                                <option key={sheet} value={sheet}>{sheet === 'ALL' ? 'All Sheets (Campaigns)' : sheet}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                        <Users size={14} className="text-gray-400 ml-2" />
                                        <select 
                                            className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none pr-4"
                                            value={roiInfluencerFilter}
                                            onChange={(e) => setRoiInfluencerFilter(e.target.value)}
                                        >
                                            {uniqueInfluencers.map(inf => (
                                                <option key={inf} value={inf}>{inf === 'ALL' ? 'All Influencers' : inf}</option>
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
                                        ${roiTotalMediaValue.toLocaleString()}
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
                                        +${roiTotalSavings.toLocaleString()}
                                    </h3>
                                </div>
                            </div>

                            {/* Visualizer Chart */}
                            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                    <PieChartIcon className="text-indigo-500"/> Media Value vs Spend by Influencer
                                </h3>
                                <div className="h-[400px] w-full">
                                    {filteredROI.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={filteredROI} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                <XAxis dataKey="influencer" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10}/>
                                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `$${val/1000}k`}/>
                                                <RechartsTooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', color: '#64748b' }}/>
                                                <Bar dataKey="mediaValue" name="Earned Media Value ($)" fill="#8b5cf6" radius={[6,6,0,0]} />
                                                <Bar dataKey="spend" name="Actual Spend ($)" fill="#cbd5e1" radius={[6,6,0,0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                            No data available for these filters.
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default BudgetView;