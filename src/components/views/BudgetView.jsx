// src/components/views/BudgetView.jsx
import React, { useState, useEffect } from 'react';
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
  Filter // <--- Added Filter Icon
} from 'lucide-react';

import { BUDGET_CATEGORIES } from '../../utils/constants';

const TOTAL_BUDGET_CONST = 33000000;
const BUDGET_STATUSES = ['Pending', 'Follow-up', 'Complete'];

// --- HELPER: NUMBER FORMATTING ---
const formatAmount = (num) => {
    return new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(num || 0);
};

// --- HELPER: COMPACT NUMBER FORMAT (For Charts) ---
const formatCompactNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
};

const BudgetView = ({ transactions, onAdd, onDelete, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    
    // --- ADD STATE ---
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        type: 'income', date: new Date().toISOString().split('T')[0],
        brand: '', category: BUDGET_CATEGORIES[0], description: '', amount: '',
        company: '', emailSubject: '', quotation: '', qtFile: null,
        invoice: '', invoiceFile: null, paymentDate: '', status: 'Pending', slip: '', slipFile: null, remark: ''
    });

    // --- EDIT STATE ---
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editFormData, setEditFormData] = useState(null);

    // --- PREVIEW STATE ---
    const [previewFile, setPreviewFile] = useState(null);

    // --- NEW: FILTER STATE FOR INCOME TABLE ---
    const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('All');

    // --- DATA PROCESSING FOR CHARTS ---
    const getMonthlyData = (type) => {
        const data = {};
        transactions
            .filter(t => t.type === type)
            .forEach(t => {
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
        transactions
            .filter(t => t.type === type)
            .forEach(t => {
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

    // --- NEW: FILTERED INCOME TRANSACTIONS ---
    const filteredIncomeTransactions = transactions
        .filter(t => t.type === 'income')
        .filter(t => incomeCategoryFilter === 'All' || t.category === incomeCategoryFilter)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Combined Data for Comparison Chart
    const allMonths = Array.from(new Set([...incomeTrend.map(d => d.date), ...spendingTrend.map(d => d.date)]))
        .sort((a, b) => new Date(a) - new Date(b));
    
    const combinedData = allMonths.map(month => {
        const inc = incomeTrend.find(d => d.date === month)?.value || 0;
        const spd = spendingTrend.find(d => d.date === month)?.value || 0;
        return { date: month, income: inc, spending: spd };
    });

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const totalSpending = transactions.filter(t => t.type === 'spending').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const netSpending = totalSpending - totalIncome;
    const filteredTransactions = transactions.filter(t => t.type === activeTab);
    const tabTotal = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // --- Handlers ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 1024 * 1024) {
            const reader = new FileReader();
            reader.onloadend = () => setNewTransaction(prev => ({ ...prev, invoiceFile: reader.result }));
            reader.readAsDataURL(file);
        } else if(file) { alert("File too large (>1MB)"); }
    };
    const handleRemoveFile = () => { setNewTransaction(prev => ({ ...prev, invoiceFile: null })); const input = document.getElementById('addFile'); if(input) input.value = ''; };
    
    const handleQtUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 1024 * 1024) {
            const reader = new FileReader();
            reader.onloadend = () => setNewTransaction(prev => ({ ...prev, qtFile: reader.result }));
            reader.readAsDataURL(file);
        } else if(file) { alert("File too large (>1MB)"); }
    };
    const handleRemoveQt = () => { setNewTransaction(prev => ({ ...prev, qtFile: null })); const input = document.getElementById('addQt'); if(input) input.value = ''; };
    
    const handleSlipUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 1024 * 1024) {
            const reader = new FileReader();
            reader.onloadend = () => setNewTransaction(prev => ({ ...prev, slipFile: reader.result }));
            reader.readAsDataURL(file);
        } else if(file) { alert("File too large (>1MB)"); }
    };
    const handleRemoveSlip = () => { setNewTransaction(prev => ({ ...prev, slipFile: null })); const input = document.getElementById('addSlip'); if(input) input.value = ''; };

    // Edit Handlers
    const handleEditFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 1024 * 1024) {
            const reader = new FileReader();
            reader.onloadend = () => setEditFormData(prev => ({ ...prev, invoiceFile: reader.result }));
            reader.readAsDataURL(file);
        } else if(file) { alert("File too large (>1MB)"); }
    };
    const handleRemoveEditFile = () => { setEditFormData(prev => ({ ...prev, invoiceFile: null })); const input = document.getElementById('editFile'); if(input) input.value = ''; };
    const handleEditQt = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 1024 * 1024) {
            const reader = new FileReader();
            reader.onloadend = () => setEditFormData(prev => ({ ...prev, qtFile: reader.result }));
            reader.readAsDataURL(file);
        } else if(file) { alert("File too large (>1MB)"); }
    };
    const handleRemoveEditQt = () => { setEditFormData(prev => ({ ...prev, qtFile: null })); const input = document.getElementById('editQt'); if(input) input.value = ''; };

    const handleEditSlip = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 1024 * 1024) {
            const reader = new FileReader();
            reader.onloadend = () => setEditFormData(prev => ({ ...prev, slipFile: reader.result }));
            reader.readAsDataURL(file);
        } else if(file) { alert("File too large (>1MB)"); }
    };
    const handleRemoveEditSlip = () => { setEditFormData(prev => ({ ...prev, slipFile: null })); const input = document.getElementById('slipQt'); if(input) input.value = ''; };


    const handleAddTransaction = (e) => {
        e.preventDefault();
        onAdd({ 
            ...newTransaction, 
            type: activeTab === 'overview' ? 'income' : activeTab, 
            createdAt: new Date(), 
            id: Date.now().toString() 
        });
        setIsAddOpen(false);
        setNewTransaction({ 
            type: 'income', date: new Date().toISOString().split('T')[0], 
            brand: '', category: BUDGET_CATEGORIES[0], description: '', amount: '', 
            company: '', emailSubject: '', invoice: '', invoiceFile: null, quotation: '', qtFile: null,
            paymentDate: '', status: 'Pending', slip: '', slipFile: null, remark: '' 
        });
    };
    const handleEditClick = (t) => { setEditFormData({ ...t }); setIsEditOpen(true); };
    const handleEditSubmit = (e) => { e.preventDefault(); onUpdate(editFormData.id, editFormData); setIsEditOpen(false); setEditFormData(null); };

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans">
            {/* Header */}
            <header className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeTab === 'income' ? 'bg-green-100 text-green-600' : activeTab === 'spending' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {activeTab === 'income' ? <TrendingUp size={24} /> : activeTab === 'spending' ? <TrendingDown size={24} /> : <BarChart3 size={24} />}
                    </div>
                    <div><h2 className="text-2xl font-bold text-gray-800">Budget Overview</h2><p className="text-sm text-gray-500 font-medium">Track your project finances</p></div>
                </div>
                <div className="flex items-center gap-6">
                    {activeTab !== 'overview' && (
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total {activeTab}</p>
                            <p className={`text-2xl font-black ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>฿{formatAmount(tabTotal)}</p>
                        </div>
                    )}
                    <button onClick={() => setIsAddOpen(true)} className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"><Plus size={18} /> Add Record</button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-8 pt-6 pb-0 flex gap-1 border-b border-gray-200 bg-gray-50">
                    {['overview', 'income', 'spending'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3 font-bold text-sm rounded-t-xl transition-all capitalize relative ${activeTab === tab ? 'bg-white shadow-sm border border-b-0 border-gray-200 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'} ${activeTab === tab && tab === 'income' ? 'text-green-600' : activeTab === tab && tab === 'spending' ? 'text-red-600' : ''}`}>{tab}{activeTab === tab && <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl ${tab === 'income' ? 'bg-green-500' : tab === 'spending' ? 'bg-red-500' : 'bg-blue-500'}`}></div>}</button>
                    ))}
                </div>

                <div className="flex-1 overflow-auto p-8">
                    {activeTab === 'overview' ? (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                            {/* 1. Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between h-32"><div className="flex justify-between items-start"><span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Total Budget</span><Wallet size={20} className="text-blue-200"/></div><div className="text-3xl font-black tracking-tight">฿{formatAmount(TOTAL_BUDGET_CONST)}</div></div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32"><div className="flex justify-between items-start"><span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Income</span><div className="p-1.5 bg-green-50 rounded text-green-600"><TrendingUp size={16}/></div></div><div className="text-2xl font-bold text-gray-800">฿{formatAmount(totalIncome)}</div></div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32"><div className="flex justify-between items-start"><span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Spending</span><div className="p-1.5 bg-red-50 rounded text-red-600"><TrendingDown size={16}/></div></div><div className="text-2xl font-bold text-gray-800">฿{formatAmount(totalSpending)}</div></div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32"><div className="flex justify-between items-start"><span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Net (Spending - Income)</span><Activity size={20} className="text-gray-300"/></div><div className={`text-2xl font-bold ${netSpending > 0 ? 'text-red-600' : 'text-green-600'}`}>฿{formatAmount(netSpending)}</div></div>
                            </div>

                            {/* 2. Charts */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Activity size={20} className="text-blue-500"/> Monthly Overview (Income vs Spending)</h3>
                                </div>
                                <div className="h-72 w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <CombinedLineChart data={combinedData} />
                                </div>
                            </div>

                            {/* 3. INCOME SECTION */}
                            <div>
                                <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2 border-b pb-2"><TrendingUp className="text-green-600"/> Income Analysis</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Monthly Income Trend</h4>
                                        <div className="h-64"><SimpleLineChart data={incomeTrend} color="#16a34a" /></div>
                                    </div>
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><PieChartIcon size={16}/> By Category</h4>
                                        <div className="flex-1 min-h-[200px]"><SimplePieChart data={incomeCategories} /></div>
                                    </div>
                                </div>
                                
                                {/* Income Table */}
                                <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-green-50 border-b border-green-100"><h4 className="font-bold text-green-800 text-sm uppercase">Top 10 Income Sources</h4></div>
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-bold border-b border-gray-200">
                                            <tr><th className="px-6 py-3">Brand</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Month</th><th className="px-6 py-3 text-right">Amount</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {topIncome.map((t, idx) => (
                                                <tr key={idx} className="hover:bg-green-50/20">
                                                    <td className="px-6 py-3 font-medium text-gray-700">{t.brand || '-'}</td>
                                                    <td className="px-6 py-3 text-gray-500">{t.category}</td>
                                                    <td className="px-6 py-3 text-gray-500 truncate max-w-xs">{t.description}</td>
                                                    <td className="px-6 py-3 text-gray-500">{new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' })}</td>
                                                    <td className="px-6 py-3 text-right font-bold text-green-600">฿{formatAmount(t.amount)}</td>
                                                </tr>
                                            ))}
                                            {topIncome.length === 0 && <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">No data available</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                {/* --- NEW: CATEGORY FILTER TABLE --- */}
                                <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <h4 className="font-bold text-gray-800 text-sm uppercase flex items-center gap-2">
                                            <Filter size={16} className="text-blue-500" /> Income by Category
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500">Filter:</span>
                                            <select 
                                                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white font-medium text-gray-700 cursor-pointer hover:border-gray-400 transition-colors"
                                                value={incomeCategoryFilter}
                                                onChange={(e) => setIncomeCategoryFilter(e.target.value)}
                                            >
                                                <option value="All">All Categories</option>
                                                {BUDGET_CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 uppercase bg-white font-bold border-b border-gray-200 sticky top-0 shadow-sm z-10">
                                                <tr>
                                                    <th className="px-6 py-3 w-32">Date</th>
                                                    <th className="px-6 py-3 w-48">Brand</th>
                                                    <th className="px-6 py-3">Description</th>
                                                    <th className="px-6 py-3 text-right w-40">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredIncomeTransactions.length > 0 ? (
                                                    filteredIncomeTransactions.map((t) => (
                                                        <tr key={t.id} className="hover:bg-blue-50/10 transition-colors">
                                                            <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                                            <td className="px-6 py-3 font-medium text-gray-700">{t.brand}</td>
                                                            <td className="px-6 py-3 text-gray-500 truncate max-w-lg">{t.description}</td>
                                                            <td className="px-6 py-3 text-right font-bold text-green-600 whitespace-nowrap">฿{formatAmount(t.amount)}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                                            <p className="mb-1">No income records found for this category.</p>
                                                            <p className="text-xs opacity-60">Try selecting a different filter.</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-gray-50 px-6 py-2 border-t border-gray-200 text-xs text-gray-400 text-right">
                                        Showing {filteredIncomeTransactions.length} records
                                    </div>
                                </div>
                            </div>

                            {/* 4. SPENDING SECTION */}
                            <div>
                                <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2 border-b pb-2"><TrendingDown className="text-red-600"/> Spending Analysis</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Monthly Spending Trend</h4>
                                        <div className="h-64"><SimpleLineChart data={spendingTrend} color="#dc2626" /></div>
                                    </div>
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><PieChartIcon size={16}/> By Category</h4>
                                        <div className="flex-1 min-h-[200px]"><SimplePieChart data={spendingCategories} /></div>
                                    </div>
                                </div>
                                {/* Spending Table ... */}
                                <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-red-50 border-b border-red-100"><h4 className="font-bold text-red-800 text-sm uppercase">Top 10 Expenses</h4></div>
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-bold border-b border-gray-200">
                                            <tr><th className="px-6 py-3">Brand</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Month</th><th className="px-6 py-3 text-right">Amount</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {topSpending.map((t, idx) => (
                                                <tr key={idx} className="hover:bg-red-50/20">
                                                    <td className="px-6 py-3 font-medium text-gray-700">{t.brand || '-'}</td>
                                                    <td className="px-6 py-3 text-gray-500">{t.category}</td>
                                                    <td className="px-6 py-3 text-gray-500 truncate max-w-xs">{t.description}</td>
                                                    <td className="px-6 py-3 text-gray-500">{new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' })}</td>
                                                    <td className="px-6 py-3 text-right font-bold text-red-600">฿{formatAmount(t.amount)}</td>
                                                </tr>
                                            ))}
                                            {topSpending.length === 0 && <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">No data available</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* DATA TABLE (Scrollable) */
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-bold border-b border-gray-200 sticky top-0 z-10">
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
                                                    <button onClick={() => handleEditClick(t)} className="text-blue-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50"><Edit2 size={16} /></button>
                                                    <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && <tr><td colSpan="12" className="px-6 py-12 text-center text-gray-400 font-medium">No records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals remain mostly unchanged */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    {/* Add Transaction Modal Content (Same as previous) */}
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                            <div><h3 className="text-2xl font-bold text-gray-900">Add Record</h3><p className="text-sm text-gray-500 mt-1">Select type and fill details.</p></div>
                            <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                           {/* ... Form fields ... (Use same fields as provided in previous full code) */}
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
            
            {/* EDIT TRANSACTION MODAL */}
            {isEditOpen && editFormData && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    {/* ... (Same Edit Modal content as before) ... */}
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                            <div><h3 className="text-2xl font-bold text-gray-900">Edit Record</h3><p className="text-sm text-gray-500 mt-1">Modify transaction details.</p></div>
                            <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* ... Use same fields as edit form in previous full code ... */}
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
                                        {editFormData.invoiceFile ? (
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

            {/* PREVIEW MODAL */}
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

// --- UPDATED CHART COMPONENTS FOR BETTER VISIBILITY ---

const SimpleLineChart = ({ data, color = "#C81E23" }) => {
    if (!data || data.length < 2) return <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">Not enough data</div>;
    const height = 200; // Increased fixed height to prevent cutting
    const width = 1000;
    const paddingX = 40;
    const paddingY = 40; 
    
    // Add 10% buffer to max value so the highest point isn't touching the top
    const maxVal = Math.max(...data.map(d => d.value)) * 1.1 || 100;
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * paddingX) + paddingX;
        const y = height - paddingY - ((d.value / maxVal) * (height - 2 * paddingY));
        return `${x},${y}`;
    }).join(' ');
    
    return (
        <div className="w-full h-full relative group">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Horizontal Grid Lines */}
                {[0.25, 0.5, 0.75].map(ratio => {
                     const y = height - paddingY - (ratio * (height - 2 * paddingY));
                     return <line key={ratio} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4"/>
                })}

                <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
                
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * paddingX) + paddingX;
                    const y = height - paddingY - ((d.value / maxVal) * (height - 2 * paddingY));
                    return (
                        <g key={i} className="group-hover:opacity-100 opacity-0 transition-opacity">
                            <circle cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="2" />
                            {/* Adjusted Text: Smaller font, positioned higher with buffer */}
                            <text x={x} y={y - 12} textAnchor="middle" fontSize="12" fill="#333" fontWeight="bold">฿{formatCompactNumber(d.value)}</text>
                            {/* Month Label: Positioned at bottom, always visible */}
                            <text x={x} y={height - 10} textAnchor="middle" fontSize="11" fill="#9ca3af">{d.date.split(' ')[0]}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const CombinedLineChart = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">No data</div>;
    const height = 240; // Taller for combined view
    const width = 1000;
    const paddingX = 40;
    const paddingY = 40;
    
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.spending))) * 1.1 || 100;
    
    const getPoints = (key) => data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * (width - 2 * paddingX) + paddingX;
        const y = height - paddingY - ((d[key] / maxVal) * (height - 2 * paddingY));
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full h-full relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                     const y = height - paddingY - (ratio * (height - 2 * paddingY));
                     return <line key={ratio} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f3f4f6" strokeWidth="1"/>
                })}

                <polyline fill="none" stroke="#16a34a" strokeWidth="3" points={getPoints('income')} strokeLinecap="round" strokeLinejoin="round"/>
                <polyline fill="none" stroke="#dc2626" strokeWidth="3" points={getPoints('spending')} strokeLinecap="round" strokeLinejoin="round"/>
                
                {data.map((d, i) => {
                    const x = (i / (data.length - 1 || 1)) * (width - 2 * paddingX) + paddingX;
                    // Always show month labels
                    return (
                        <g key={i}>
                             <text x={x} y={height - 10} textAnchor="middle" fontSize="11" fill="#6b7280" fontWeight="500">
                                {d.date.split(' ')[0]}
                             </text>
                             {/* Hover Circles */}
                             <circle cx={x} cy={height - paddingY - ((d.income / maxVal) * (height - 2 * paddingY))} r="3" fill="#16a34a" opacity="0.5"/>
                             <circle cx={x} cy={height - paddingY - ((d.spending / maxVal) * (height - 2 * paddingY))} r="3" fill="#dc2626" opacity="0.5"/>
                        </g>
                    );
                })}
            </svg>
            <div className="absolute top-0 right-0 flex gap-4 text-xs font-bold bg-white/80 p-1 rounded backdrop-blur-sm">
                <span className="text-green-600 flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-600 rounded-full"></span> Income</span>
                <span className="text-red-600 flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span> Spending</span>
            </div>
        </div>
    );
};

const SimplePieChart = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">No data</div>;
    const total = data.reduce((acc, cur) => acc + cur.value, 0);
    let currentAngle = 0;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    return (
        <div className="flex items-center gap-6 h-full">
            <div className="w-32 h-32 relative shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {data.map((d, i) => {
                        const sliceAngle = (d.value / total) * 360;
                        const x1 = 50 + 50 * Math.cos(Math.PI * currentAngle / 180);
                        const y1 = 50 + 50 * Math.sin(Math.PI * currentAngle / 180);
                        const x2 = 50 + 50 * Math.cos(Math.PI * (currentAngle + sliceAngle) / 180);
                        const y2 = 50 + 50 * Math.sin(Math.PI * (currentAngle + sliceAngle) / 180);
                        const largeArc = sliceAngle > 180 ? 1 : 0;
                        const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
                        currentAngle += sliceAngle;
                        return <path key={i} d={pathData} fill={colors[i % colors.length]} stroke="white" strokeWidth="1"/>;
                    })}
                </svg>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto max-h-40 text-xs custom-scrollbar">
                {data.map((d, i) => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor: colors[i % colors.length]}}></span><span className="text-gray-600 truncate max-w-[100px]" title={d.name}>{d.name}</span></div>
                        <span className="font-bold text-gray-800">{((d.value / total) * 100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- UPDATED: REFACTORED EDITABLE CELL ---
const EditableCell = ({ value, onSave, type = "text", options = null, className = "" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value || "");

    useEffect(() => { setLocalValue(value || ""); }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue !== value) { onSave(localValue); }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.target.blur();
    };

    // 1. SELECT INPUT
    if (type === 'select' && options) {
        return ( 
            <select 
                value={localValue} 
                onChange={(e) => { setLocalValue(e.target.value); onSave(e.target.value); }} 
                className={`w-full bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 rounded px-1 transition-all cursor-pointer appearance-none ${className}`}
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        );
    }

    // 2. EDIT MODE (Show Input)
    if (isEditing) {
        return (
            <input 
                type={type} 
                value={localValue} 
                onChange={(e) => setLocalValue(e.target.value)} 
                onBlur={handleBlur} 
                onKeyDown={handleKeyDown} 
                autoFocus
                className={`w-full bg-white outline-none ring-2 ring-blue-200 rounded px-1 ${className}`} 
                placeholder="-" 
            />
        );
    }

    // 3. VIEW MODE (Show Formatted Text)
    let displayValue = localValue;
    if (type === 'number' && localValue) {
        // Format if it's a number type
        displayValue = formatAmount(localValue);
    }

    return (
        <div 
            onClick={() => setIsEditing(true)} 
            className={`w-full cursor-text rounded px-1 hover:bg-gray-100 min-h-[24px] flex items-center ${className}`}
            title="Click to edit"
        >
            {displayValue || "-"}
        </div>
    );
};

export default BudgetView;