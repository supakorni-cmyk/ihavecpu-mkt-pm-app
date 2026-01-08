// src/components/views/BudgetView.jsx
import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Plus, 
  Wallet, 
  Activity, 
  Trash2, 
  X 
} from 'lucide-react';

// Import shared constants
import { BUDGET_CATEGORIES, formatDate } from '../../utils/constants';

// Local Constant for this view
const TOTAL_BUDGET_CONST = 33000000;
const BUDGET_STATUSES = ['Pending', 'Follow-up', 'Complete'];

const BudgetView = ({ transactions, onAdd, onDelete }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isAddOpen, setIsAddOpen] = useState(false);
    
    // Form State
    const [newTransaction, setNewTransaction] = useState({
        type: 'income', 
        date: new Date().toISOString().split('T')[0],
        brand: '', 
        category: BUDGET_CATEGORIES[0], 
        description: '', 
        amount: '',
        company: '', 
        invoice: '', 
        paymentDate: '', 
        status: 'Pending', 
        remark: ''
    });

    // --- Calculations ---
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    
    const totalSpending = transactions
        .filter(t => t.type === 'spending')
        .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    
    const netSpending = totalSpending - totalIncome;
    const budgetBalance = TOTAL_BUDGET_CONST - totalSpending;

    // Data preparation for Chart
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = TOTAL_BUDGET_CONST;
    const balanceData = [{ date: 'Start', value: TOTAL_BUDGET_CONST }];
    
    sortedTransactions.forEach(t => {
        if(t.type === 'spending') runningBalance -= (parseFloat(t.amount) || 0);
        balanceData.push({ date: t.date, value: runningBalance });
    });

    // Filtering for Table Views
    const filteredTransactions = transactions.filter(t => t.type === activeTab);
    const tabTotal = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // --- Handlers ---
    const handleAddTransaction = (e) => {
        e.preventDefault();
        onAdd({ 
            ...newTransaction, 
            type: activeTab === 'overview' ? 'income' : activeTab, 
            createdAt: new Date(), 
            id: Date.now().toString() 
        });
        setIsAddOpen(false);
        // Reset form but keep logical defaults
        setNewTransaction({ 
            type: activeTab === 'overview' ? 'income' : activeTab, 
            date: new Date().toISOString().split('T')[0], 
            brand: '', 
            category: BUDGET_CATEGORIES[0], 
            description: '', 
            amount: '', 
            company: '', 
            invoice: '', 
            paymentDate: '', 
            status: 'Pending', 
            remark: '' 
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans">
            {/* Header */}
            <header className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeTab === 'income' ? 'bg-green-100 text-green-600' : activeTab === 'spending' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {activeTab === 'income' ? <TrendingUp size={24} /> : activeTab === 'spending' ? <TrendingDown size={24} /> : <BarChart3 size={24} />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Budget Recorder</h2>
                        <p className="text-sm text-gray-500 font-medium">Track your project finances</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    {activeTab !== 'overview' && (
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total {activeTab}</p>
                            <p className={`text-2xl font-black ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                ฿{tabTotal.toLocaleString()}
                            </p>
                        </div>
                    )}
                    <button 
                        onClick={() => setIsAddOpen(true)} 
                        className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                        <Plus size={18} /> Add Record
                    </button>
                </div>
            </header>

            {/* Tabs & Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-8 pt-6 pb-0 flex gap-1 border-b border-gray-200 bg-gray-50">
                    {['overview', 'income', 'spending'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)} 
                            className={`px-8 py-3 font-bold text-sm rounded-t-xl transition-all capitalize relative 
                                ${activeTab === tab ? 'bg-white shadow-sm border border-b-0 border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'} 
                                ${activeTab === tab && tab === 'income' ? 'text-green-600' : activeTab === tab && tab === 'spending' ? 'text-red-600' : activeTab === tab ? 'text-blue-600' : ''}`
                            }
                        >
                            {tab}
                            {activeTab === tab && <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl ${tab === 'income' ? 'bg-green-500' : tab === 'spending' ? 'bg-red-500' : 'bg-blue-500'}`}></div>}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-auto p-8">
                    {activeTab === 'overview' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-300">
                                    <div className="flex justify-between items-start"><span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Total Budget</span><Wallet size={20} className="text-blue-200"/></div>
                                    <div className="text-3xl font-black tracking-tight">฿{TOTAL_BUDGET_CONST.toLocaleString()}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32">
                                    <div className="flex justify-between items-start"><span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Income</span><div className="p-1.5 bg-green-50 rounded text-green-600"><TrendingUp size={16}/></div></div>
                                    <div className="text-2xl font-bold text-gray-800">฿{totalIncome.toLocaleString()}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32">
                                    <div className="flex justify-between items-start"><span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Spending</span><div className="p-1.5 bg-red-50 rounded text-red-600"><TrendingDown size={16}/></div></div>
                                    <div className="text-2xl font-bold text-gray-800">฿{totalSpending.toLocaleString()}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32">
                                    <div className="flex justify-between items-start"><span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Net (Spending - Income)</span><Activity size={20} className="text-gray-300"/></div>
                                    <div className={`text-2xl font-bold ${netSpending > 0 ? 'text-red-600' : 'text-green-600'}`}>฿{netSpending.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-80">
                                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Budget Balance History</h3>
                                        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">Realtime</span>
                                    </div>
                                    <div className="flex-1 w-full bg-gray-50 rounded-xl overflow-hidden relative border border-gray-100 p-4">
                                        <SimpleLineChart data={balanceData} color="#3b82f6" />
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center items-center text-center">
                                    <div className="w-40 h-40 rounded-full border-[6px] border-blue-500 flex items-center justify-center mb-4 shadow-inner">
                                        <div className="text-center">
                                            <span className="block text-xs font-bold text-gray-400 uppercase">Remaining</span>
                                            <span className="block text-xl font-black text-gray-800">{((budgetBalance / TOTAL_BUDGET_CONST) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">Budget Balance</h3>
                                    <p className={`text-2xl font-black mt-2 ${budgetBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>฿{budgetBalance.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 mt-2">Target: ฿{TOTAL_BUDGET_CONST.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Data Table */
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-bold border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Brand</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4 w-64">Description</th>
                                        <th className="px-6 py-4 text-right">Amount (THB)</th>
                                        <th className="px-6 py-4">Company</th>
                                        <th className="px-6 py-4">Invoice</th>
                                        <th className="px-6 py-4">Payment Date</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 w-48">Remark</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredTransactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{formatDate(t.date)}</td>
                                            <td className="px-6 py-4 font-bold text-gray-700">{t.brand}</td>
                                            <td className="px-6 py-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">{t.category}</span></td>
                                            <td className="px-6 py-4 text-gray-600 truncate max-w-xs" title={t.description}>{t.description}</td>
                                            <td className={`px-6 py-4 text-right font-mono font-bold ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>{parseFloat(t.amount).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-gray-600">{t.company}</td>
                                            <td className="px-6 py-4 text-gray-600 font-mono text-xs">{t.invoice || '-'}</td>
                                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{t.paymentDate ? formatDate(t.paymentDate) : '-'}</td>
                                            <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${t.status === 'Complete' ? 'bg-green-50 text-green-700 border-green-200' : t.status === 'Follow-up' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{t.status}</span></td>
                                            <td className="px-6 py-4 text-gray-500 italic text-xs truncate max-w-[150px]" title={t.remark}>{t.remark || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-400 font-medium">No records found for this view.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD TRANSACTION MODAL */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                            <div><h3 className="text-2xl font-bold text-gray-900">Add Record</h3><p className="text-sm text-gray-500 mt-1">Select type and fill details.</p></div>
                            <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white transition" value={newTransaction.type} onChange={e => setNewTransaction({...newTransaction, type: e.target.value})}><option value="income">Income</option><option value="spending">Spending</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label><input required type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brand</label><input required type="text" placeholder="e.g. Intel, AMD" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" value={newTransaction.brand} onChange={e => setNewTransaction({...newTransaction, brand: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white transition" value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}>{BUDGET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount</label><input required type="number" placeholder="0.00" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg font-bold transition" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})} /></div>
                            </div>
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company</label><input type="text" placeholder="Company Name" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" value={newTransaction.company} onChange={e => setNewTransaction({...newTransaction, company: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Invoice No.</label><input type="text" placeholder="INV-001" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono transition" value={newTransaction.invoice} onChange={e => setNewTransaction({...newTransaction, invoice: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Date</label><input type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" value={newTransaction.paymentDate} onChange={e => setNewTransaction({...newTransaction, paymentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white transition" value={newTransaction.status} onChange={e => setNewTransaction({...newTransaction, status: e.target.value})}>{BUDGET_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Remark</label><textarea placeholder="Additional notes..." className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition" value={newTransaction.remark} onChange={e => setNewTransaction({...newTransaction, remark: e.target.value})} /></div>
                            </div>
                            <div className="md:col-span-2 pt-6 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddOpen(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition">Cancel</button>
                                <button type="submit" className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition transform hover:scale-105 ${activeTab === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-Component: Simple Line Chart ---
const SimpleLineChart = ({ data, color = "#C81E23" }) => {
    if (!data || data.length < 2) return <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">Not enough data for chart</div>;
    
    const height = 150;
    const width = 1000; 
    const padding = 10;

    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - ((d.value - minVal) / range) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    const fillPath = `${points} ${width - padding},${height} ${padding},${height}`;

    return (
        <div className="w-full h-full relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={`M ${points.split(' ')[0]} L ${fillPath} Z`} fill="url(#chartGradient)" stroke="none" />
                <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="absolute top-0 right-0 bg-white/80 px-2 py-1 text-xs font-bold rounded text-gray-500">Max: {maxVal.toLocaleString()}</div>
            <div className="absolute bottom-0 right-0 bg-white/80 px-2 py-1 text-xs font-bold rounded text-gray-500">Min: {minVal.toLocaleString()}</div>
        </div>
    );
};

export default BudgetView;