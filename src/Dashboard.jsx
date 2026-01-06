import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy 
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser'; 
import { 
  MoreHorizontal, Plus, Calendar as CalendarIcon, Trash2, LogOut, Layout, ArrowRight, ArrowLeft,
  Paperclip, Link as LinkIcon, FileText, Clock, AlignLeft, CheckSquare, ExternalLink, X, Edit2,
  Save, Heart, ChevronLeft, ChevronRight, RefreshCw, Video, Home, PieChart, Activity, CheckCircle2,
  ListTodo, Presentation, Printer, Upload, Image as ImageIcon, GripVertical, LayoutTemplate, Camera,
  Loader2, Folder, Mail, Table, Download, Minus, Play, Info, MessageCircle, Share2, Search, Bot, 
  Youtube, Facebook, User, AtSign, Zap, Settings, DollarSign, TrendingUp, TrendingDown
} from 'lucide-react';

// --- CONSTANTS & HELPERS ---
const TAG_COLORS = { 
  'Planning': 'bg-pink-100 text-pink-600', 
  'Project': 'bg-purple-100 text-purple-600', 
  'Product Review': 'bg-blue-100 text-blue-600', 
  'Event': 'bg-yellow-100 text-yellow-600', 
  'Guest Speaker': 'bg-green-100 text-green-600' 
};

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'review', title: 'Review', color: 'bg-purple-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' }
];

const BUDGET_CATEGORIES = [
  'Video Content', 'Website Banner', 'Boost/Ads', 'Etc.', 'Event Support', 
  'FB Photo Album', 'Guest Speaker', 'Project / MDF', 'Sponsor'
];

const BUDGET_STATUSES = ['Pending', 'Follow-up', 'Complete'];

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'No Date';

const getSafeRequirements = (task) => {
    if (!task || !task.requirements) return [];
    if (Array.isArray(task.requirements)) return task.requirements;
    if (typeof task.requirements === 'string') {
        return task.requirements.split('\n').filter(r => r.trim()).map((text, idx) => ({
            id: `legacy-${idx}`, text: text.replace(/^- /, ''), isDone: false, tableData: []
        }));
    }
    return [];
};

// --- SUB-COMPONENTS ---

const BudgetRecorderView = () => {
    const [activeTab, setActiveTab] = useState('income'); // 'income' or 'spending'
    const [transactions, setTransactions] = useState([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        type: 'income', // default to income
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

    useEffect(() => {
        const q = query(collection(db, 'budget'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return unsubscribe;
    }, []);

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'budget'), { 
                ...newTransaction, 
                type: activeTab,
                createdAt: new Date() 
            });
            setIsAddOpen(false);
            setNewTransaction({
                type: activeTab,
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
        } catch (error) {
            console.error("Error saving transaction:", error);
            alert("Failed to save record.");
        }
    };

    const handleDeleteTransaction = async (id) => {
        if(confirm('Delete this record?')) await deleteDoc(doc(db, 'budget', id));
    }

    const filteredTransactions = transactions.filter(t => t.type === activeTab);
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans">
            <header className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeTab === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {activeTab === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Budget Recorder</h2>
                        <p className="text-sm text-gray-500 font-medium">Track your project finances</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total {activeTab}</p>
                        <p className={`text-2xl font-black ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            ฿{totalAmount.toLocaleString()}
                        </p>
                    </div>
                    <button onClick={() => setIsAddOpen(true)} className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105">
                        <Plus size={18} /> Add Record
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Tabs */}
                <div className="px-8 pt-6 pb-0 flex gap-1 border-b border-gray-200 bg-gray-50">
                    <button 
                        onClick={() => setActiveTab('income')}
                        className={`px-8 py-3 font-bold text-sm rounded-t-xl transition-all relative ${activeTab === 'income' ? 'bg-white text-green-600 shadow-sm border border-b-0 border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                    >
                        Income
                        {activeTab === 'income' && <div className="absolute top-0 left-0 w-full h-1 bg-green-500 rounded-t-xl"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('spending')}
                        className={`px-8 py-3 font-bold text-sm rounded-t-xl transition-all relative ${activeTab === 'spending' ? 'bg-white text-red-600 shadow-sm border border-b-0 border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                    >
                        Spending
                        {activeTab === 'spending' && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 rounded-t-xl"></div>}
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-8">
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
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">{t.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 truncate max-w-xs" title={t.description}>{t.description}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {parseFloat(t.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{t.company}</td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{t.invoice || '-'}</td>
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{t.paymentDate ? formatDate(t.paymentDate) : '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                t.status === 'Complete' ? 'bg-green-50 text-green-700 border-green-200' :
                                                t.status === 'Follow-up' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-gray-50 text-gray-500 border-gray-200'
                                            }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 italic text-xs truncate max-w-[150px]" title={t.remark}>{t.remark || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleDeleteTransaction(t.id)} className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan="11" className="px-6 py-12 text-center text-gray-400 font-medium">No records found for this view.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Record Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Add {activeTab === 'income' ? 'Income' : 'Spending'} Record</h3>
                                <p className="text-sm text-gray-500 mt-1">Fill in the details for the new financial record.</p>
                            </div>
                            <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Left Column */}
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label><input required type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brand</label><input required type="text" placeholder="e.g. Intel, AMD" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" value={newTransaction.brand} onChange={e => setNewTransaction({...newTransaction, brand: e.target.value})} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                                    <select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white transition" value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}>
                                        {BUDGET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label><textarea placeholder="Details about the transaction..." className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount (THB)</label><input required type="number" placeholder="0.00" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg font-bold transition" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})} /></div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company</label><input type="text" placeholder="Company Name" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" value={newTransaction.company} onChange={e => setNewTransaction({...newTransaction, company: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Invoice No.</label><input type="text" placeholder="INV-001" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono transition" value={newTransaction.invoice} onChange={e => setNewTransaction({...newTransaction, invoice: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Date</label><input type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" value={newTransaction.paymentDate} onChange={e => setNewTransaction({...newTransaction, paymentDate: e.target.value})} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                                    <select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white transition" value={newTransaction.status} onChange={e => setNewTransaction({...newTransaction, status: e.target.value})}>
                                        {BUDGET_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                                    </select>
                                </div>
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

const RequirementSheetModal = ({ task, requirement, onClose }) => {
    // ... RequirementSheetModal implementation ...
    const [newRow, setNewRow] = useState({ col1: '', col2: '', col3: '', notes: '' });
    // Default columns if none exist
    const [columns, setColumns] = useState(requirement.columns || [
        { id: 'col1', name: 'Item / Name' },
        { id: 'col2', name: 'Description' },
        { id: 'col3', name: 'Status' },
        { id: 'notes', name: 'Notes' }
    ]);

    useEffect(() => {
        if (requirement.columns) setColumns(requirement.columns);
    }, [requirement.columns]);

    const updateRequirement = (updates) => {
        const updatedReqs = task.requirements.map(r => {
            if (r.id === requirement.id) return { ...r, ...updates };
            return r;
        });
        updateDoc(doc(db, 'tasks', task.id), { requirements: updatedReqs });
    };

    const handleColumnNameChange = (colId, newName) => {
        const updatedCols = columns.map(c => c.id === colId ? { ...c, name: newName } : c);
        setColumns(updatedCols);
    };

    const saveColumns = () => updateRequirement({ columns });

    const addColumn = () => {
        const newCols = [...columns, { id: `col-${Date.now()}`, name: 'New Column' }];
        setColumns(newCols);
        updateRequirement({ columns: newCols });
    };

    const deleteColumn = (colId) => {
        if (confirm('Delete column?')) {
            const newCols = columns.filter(c => c.id !== colId);
            setColumns(newCols);
            updateRequirement({ columns: newCols });
        }
    };

    const handleAddRow = () => {
        if (Object.keys(newRow).length === 0) return;
        const updatedTableData = [...(requirement.tableData || []), { id: Date.now(), ...newRow }];
        updateRequirement({ tableData: updatedTableData });
        setNewRow({});
    };

    const handleDeleteRow = (rowId) => {
        const updatedTableData = (requirement.tableData || []).filter(row => row.id !== rowId);
        updateRequirement({ tableData: updatedTableData });
    };

    const handleRowChange = (colId, value) => {
        setNewRow(prev => ({ ...prev, [colId]: value }));
    };

    const exportToCSV = () => {
        if (!requirement.tableData || requirement.tableData.length === 0) return alert("No data to export.");
        const headers = columns.map(c => c.name);
        const rows = requirement.tableData.map(row => 
            columns.map(col => `"${(row[col.id] || '').replace(/"/g, '""')}"`)
        );
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${requirement.text}_table.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-7xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
                <div className="bg-green-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded"><Table size={24} /></div><div><h3 className="font-bold text-lg leading-tight">{requirement.text}</h3><p className="text-xs opacity-80 font-mono tracking-wide uppercase">Table for Task: {task.title}</p></div></div>
                    <div className="flex gap-3"><button onClick={exportToCSV} className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50 transition flex items-center gap-2"><Download size={16} /> Export CSV</button><button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white"><X size={24} /></button></div>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    <div className="bg-white border border-gray-300 shadow-sm min-w-max">
                        <div className="flex border-b border-gray-300 bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                            <div className="w-12 p-3 text-center border-r border-gray-300 bg-gray-100 sticky left-0 z-20">#</div>
                            {columns.map(col => (
                                <div key={col.id} className="w-48 min-w-[180px] p-2 border-r border-gray-300 relative group bg-gray-100">
                                    <input type="text" value={col.name} onChange={(e) => handleColumnNameChange(col.id, e.target.value)} onBlur={saveColumns} className="bg-transparent w-full text-center focus:bg-white focus:ring-2 focus:ring-green-500 rounded px-1 py-0.5 border border-transparent hover:border-gray-300" />
                                    <button onClick={() => deleteColumn(col.id)} className="absolute right-1 top-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-gray-200"><X size={10} /></button>
                                </div>
                            ))}
                            <div className="w-12 p-2 flex items-center justify-center bg-gray-100 hover:bg-gray-200 cursor-pointer border-r border-gray-300" onClick={addColumn} title="Add Column"><Plus size={16} className="text-green-600" /></div>
                            <div className="w-12 p-3 bg-gray-100"></div>
                        </div>
                        {(requirement.tableData || []).map((row, idx) => (
                            <div key={row.id} className="flex border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                                <div className="w-12 p-3 text-center border-r border-gray-200 bg-gray-50 text-gray-400 font-mono text-xs flex items-center justify-center sticky left-0 z-10">{idx + 1}</div>
                                {columns.map(col => (<div key={col.id} className="w-48 min-w-[180px] p-3 border-r border-gray-200 text-sm text-gray-800">{row[col.id]}</div>))}
                                <div className="w-12 flex-1 border-r border-gray-200"></div>
                                <div className="w-12 p-3 flex items-center justify-center"><button onClick={() => handleDeleteRow(row.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></div>
                            </div>
                        ))}
                        <div className="flex border-b border-gray-200 bg-yellow-50/50 sticky bottom-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                            <div className="w-12 p-3 text-center border-r border-gray-200 text-green-600 font-bold bg-yellow-50 sticky left-0">+</div>
                            {columns.map(col => (
                                <div key={col.id} className="w-48 min-w-[180px] border-r border-gray-200">
                                    <input type="text" placeholder={col.name + "..."} className="w-full h-full p-3 bg-transparent outline-none text-sm focus:bg-white focus:ring-inset focus:ring-2 focus:ring-green-500" value={newRow[col.id] || ''} onChange={e => handleRowChange(col.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRow()} />
                                </div>
                            ))}
                            <div className="w-12 flex-1 border-r border-gray-200 bg-yellow-50"></div>
                            <div className="w-12 p-2 flex items-center justify-center bg-yellow-50"><button onClick={handleAddRow} className="bg-green-600 text-white p-1 rounded hover:bg-green-700 shadow-sm"><Plus size={16} /></button></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HomeView = ({ tasks, currentUser }) => {
    // ... HomeView code ...
    const getTasksByStatus = (status) => tasks.filter(task => (status === 'todo' && (task.status === 'pending' || !task.status)) ? true : (status === 'done' && task.status === 'completed') ? true : task.status === status);
    const totalTasks = tasks.length;
    const completedTasks = getTasksByStatus('done').length;
    const inProgressTasks = getTasksByStatus('inprogress').length;
    const reviewTasks = getTasksByStatus('review').length;
    const todoTasks = getTasksByStatus('todo').length;
    
    return (
        <div className="flex flex-col h-full w-full bg-gray-50">
            <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10"><h2 className="text-2xl font-bold text-gray-800">Overview</h2><div className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div></header>
            <div className="p-6 md:p-10 overflow-y-auto flex-1">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-end"><div><h2 className="text-3xl font-bold text-gray-800">Welcome Back, {currentUser?.email?.split('@')[0]}!</h2><p className="text-gray-500 mt-1">Here is your project overview at a glance.</p></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition"><div className="flex justify-between items-start"><div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><ListTodo size={24} /></div><span className="text-xs font-bold text-gray-400 uppercase">Total Tasks</span></div><div><span className="text-3xl font-bold text-gray-800">{totalTasks}</span><span className="text-sm text-gray-400 ml-2">tasks</span></div></div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition"><div className="flex justify-between items-start"><div className="bg-green-50 text-green-600 p-2 rounded-lg"><CheckCircle2 size={24} /></div><span className="text-xs font-bold text-gray-400 uppercase">Completed</span></div><div><span className="text-3xl font-bold text-gray-800">{completedTasks}</span><span className="text-sm text-gray-400 ml-2">finished</span></div></div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition"><div className="flex justify-between items-start"><div className="bg-yellow-50 text-yellow-600 p-2 rounded-lg"><Activity size={24} /></div><span className="text-xs font-bold text-gray-400 uppercase">In Progress</span></div><div><span className="text-3xl font-bold text-gray-800">{inProgressTasks}</span><span className="text-sm text-gray-400 ml-2">active</span></div></div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition"><div className="flex justify-between items-start"><div className="bg-purple-50 text-purple-600 p-2 rounded-lg"><PieChart size={24} /></div><span className="text-xs font-bold text-gray-400 uppercase">Review</span></div><div><span className="text-3xl font-bold text-gray-800">{reviewTasks}</span><span className="text-sm text-gray-400 ml-2">pending</span></div></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-gray-800 mb-6">Task Status</h3><div className="flex items-end justify-between h-64 gap-4">{[{ label: 'To Do', count: todoTasks, color: 'bg-gray-200' }, { label: 'In Progress', count: inProgressTasks, color: 'bg-blue-500' }, { label: 'Review', count: reviewTasks, color: 'bg-purple-500' }, { label: 'Done', count: completedTasks, color: 'bg-green-500' }].map((stat) => (<div key={stat.label} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group"><div className="font-bold text-gray-800 mb-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">{stat.count}</div><div className={`w-full rounded-t-xl transition-all duration-500 ${stat.color} hover:opacity-90`} style={{ height: `${totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0}%`, minHeight: '8px' }}></div><div className="text-xs font-bold text-gray-400 uppercase text-center mt-2">{stat.label}</div></div>))}</div></div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-gray-800 mb-6">Workload</h3><div className="space-y-5">{Object.keys(TAG_COLORS).map((tag) => { const count = tagCounts[tag] || 0; return (<div key={tag}><div className="flex justify-between text-sm font-bold mb-2"><span className="text-gray-600">{tag}</span><span className="text-gray-400">{count} Tasks</span></div><div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${(TAG_COLORS[tag] || 'bg-gray-200').split(' ')[0]}`} style={{ width: `${(count / maxTagCount) * 100}%` }}></div></div></div>) })}</div></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CalendarView = ({ tasks, setSelectedTaskId }) => {
    // ... CalendarView code ...
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const getTasksForDay = (day) => {
        const currentDayDate = new Date(year, month, day);
        currentDayDate.setHours(0,0,0,0);
        return tasks.filter(task => {
            if (!task.startDate || !task.deadline) return false;
            const start = new Date(task.startDate); const end = new Date(task.deadline);
            start.setHours(0,0,0,0); end.setHours(0,0,0,0);
            return currentDayDate >= start && currentDayDate <= end;
        });
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50">
            <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarIcon className="text-blue-600" />Calendar</h2><div className="flex gap-2"><button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button><h3 className="text-lg font-bold text-gray-700 min-w-[150px] text-center">{monthNames[month]} {year}</h3><button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight /></button></div></header>
            <div className="p-6 h-full flex-1 overflow-y-auto">
                <div className="border rounded-xl overflow-hidden shadow-sm bg-white h-full flex flex-col">
                    <div className="grid grid-cols-7 bg-gray-50 border-b">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="p-3 text-center text-sm font-bold text-gray-500 uppercase tracking-wide">{day}</div>)}</div>
                    <div className="grid grid-cols-7 auto-rows-fr h-full bg-gray-50 gap-px border-gray-200">
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="bg-white min-h-[100px]"></div>)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1; const dayTasks = getTasksForDay(day);
                            return (<div key={day} className="bg-white p-2 min-h-[100px] hover:bg-gray-50 transition relative flex flex-col"><div className="text-sm font-medium mb-1 text-gray-700">{day}</div><div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[80px]">{dayTasks.map(task => (<div key={task.id} onClick={() => setSelectedTaskId(task.id)} className={`text-[10px] truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 ${TAG_COLORS[task.tag] ? TAG_COLORS[task.tag].replace('text-', 'bg-').split(' ')[0] + ' text-gray-700' : 'bg-gray-100'}`}>{task.title}</div>))}</div></div>);
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PhotoAlbumView = ({ currentUser }) => {
    const [albums, setAlbums] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [currentAlbum, setCurrentAlbum] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState('');

    useEffect(() => { const u = onSnapshot(query(collection(db, 'albums'), orderBy('createdAt', 'desc')), (s) => setAlbums(s.docs.map(d => ({...d.data(), id: d.id})))); return u; }, []);
    useEffect(() => { const u = onSnapshot(query(collection(db, 'photos'), orderBy('createdAt', 'desc')), (s) => setPhotos(s.docs.map(d => ({...d.data(), id: d.id})))); return u; }, []);

    const createAlbum = async (e) => { e.preventDefault(); if (!newAlbumName) return; await addDoc(collection(db, 'albums'), { name: newAlbumName, createdAt: new Date(), createdBy: currentUser.email }); setNewAlbumName(''); setIsCreatingAlbum(false); };
    const handleUpload = async (e) => {
        const file = e.target.files[0]; if (!file || file.size > 2e6) return alert("File too large (>2MB)"); setUploading(true);
        const reader = new FileReader(); reader.onloadend = async () => { await addDoc(collection(db, 'photos'), { url: reader.result, name: file.name, createdAt: new Date(), uploader: currentUser.email, albumId: currentAlbum.id }); setUploading(false); }; reader.readAsDataURL(file);
    };
    const handleDeletePhoto = async (id) => { if (confirm("Delete photo?")) await deleteDoc(doc(db, 'photos', id)); };
    const handleDeleteAlbum = async (e, id) => { e.stopPropagation(); if (confirm("Delete album?")) { await deleteDoc(doc(db, 'albums', id)); if (currentAlbum?.id === id) setCurrentAlbum(null); } };
    const albumPhotos = photos.filter(p => p.albumId === currentAlbum?.id);

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-50/50 overflow-y-auto"><div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">{currentAlbum && <button onClick={() => setCurrentAlbum(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><ArrowLeft size={24} /></button>}<div><h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">{currentAlbum ? <><Folder className="text-purple-600" /> {currentAlbum.name}</> : <><ImageIcon className="text-purple-600" /> Photo Albums</>}</h2></div></div>
                {!currentAlbum ? <div className="relative">{isCreatingAlbum ? <form onSubmit={createAlbum} className="flex gap-2"><input autoFocus type="text" placeholder="Album Name" className="border rounded-lg px-3 py-2 text-sm" value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)} /><button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button></form> : <button onClick={() => setIsCreatingAlbum(true)} className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg"><Plus size={20} /> Create Album</button>}</div> : <div className="relative"><input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={uploading} /><button className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg">{uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />} Upload</button></div>}
            </div>
            {!currentAlbum ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{albums.map(album => (<div key={album.id} onClick={() => setCurrentAlbum(album)} className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center aspect-square relative"><Folder size={64} className="text-purple-200 group-hover:text-purple-300 transition mb-4" /><h3 className="font-bold text-gray-700 text-center">{album.name}</h3><p className="text-xs text-gray-400 mt-1">{new Date(album.createdAt?.seconds * 1000).toLocaleDateString()}</p><button onClick={(e) => handleDeleteAlbum(e, album.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button></div>))}</div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{albumPhotos.map(photo => (<div key={photo.id} className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition aspect-square"><img src={photo.url} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2"><a href={photo.url} download={photo.name} className="p-2 bg-white/20 text-white rounded-full"><ExternalLink size={20} /></a><button onClick={() => handleDeletePhoto(photo.id)} className="p-2 bg-red-500/80 text-white rounded-full"><Trash2 size={20} /></button></div></div>))}</div>}
        </div></div>
    );
};

const SelfHealView = () => {
    const videos = ["jfKfPfyJRdk", "eKFTSSKCzWA", "inpok4MKVLM", "Dx5qFachd3A", "tEmt1Znux58", "lTRiuFIWV54"];
    const [currentVideoId, setCurrentVideoId] = useState(videos[0]);
    return (<div className="h-full w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50"><div className="text-center mb-8"><h2 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3"><Heart className="text-pink-500 fill-pink-500" size={32} />Self Heal & Relax</h2></div><div className="w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden mb-8 border-4 border-white"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`} title="YouTube" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div><button onClick={() => setCurrentVideoId(videos[Math.floor(Math.random() * videos.length)])} className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl font-bold text-indigo-600"><RefreshCw size={20} /> Change Atmosphere</button></div>);
};

const AIClipCollectorView = () => {
    const [targets, setTargets] = useState([
        { platform: 'YouTube', url: 'https://www.youtube.com/@iHAVECPU_', icon: Youtube, color: 'text-red-600', bg: 'bg-red-50' },
        { platform: 'Facebook', url: 'https://www.facebook.com/CPUCore2Duo', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
        { platform: 'TikTok', url: 'https://www.tiktok.com/@ihavecputestcom', icon: Video, color: 'text-black', bg: 'bg-gray-100' }
    ]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isCollecting, setIsCollecting] = useState(false);
    const [data, setData] = useState(null);

    const handleCollect = () => {
        setIsCollecting(true);
        setData(null);
        setTimeout(() => {
            const mockData = {};
            const contentTypes = ["RTX 4090 Test", "งบ 20,000 เล่นเกมลื่น", "Review Case Montech", "Promotion 9.9", "ประกอบคอมด่วน", "Intel Gen 14 มาแล้ว", "Live Stream ย้อนหลัง", "แจกโค้ดส่วนลด", "Q&A ตอบคำถาม"];
            targets.forEach(target => {
                const platform = target.platform;
                const channelName = target.url.split('/').pop().replace('@', '');
                mockData[platform] = Array.from({ length: Math.floor(Math.random() * 4) + 3 }).map((_, i) => {
                    const randomTitle = contentTypes[Math.floor(Math.random() * contentTypes.length)];
                    const dateStr = `${month}-${Math.floor(Math.random() * 28) + 1}`.replace(/-(\d)$/, '-0$1');
                    let videoLink = target.url;
                    if (platform === 'YouTube') videoLink = `https://www.youtube.com/watch?v=mock${Math.random().toString(36).substr(2, 8)}`;
                    else if (platform === 'Facebook') videoLink = `${target.url.replace(/\/$/, '')}/videos/${Math.floor(Math.random() * 9999999999)}`;
                    else if (platform === 'TikTok') videoLink = `${target.url.replace(/\/$/, '')}/video/${Math.floor(Math.random() * 99999999999999999)}`;
                    
                    return {
                        id: i, title: `${channelName} - ${randomTitle} #${i + 1}`, thumbnail: `https://placehold.co/300x200/333/fff?text=${platform}+${i+1}`,
                        link: videoLink, views: (Math.random() * 100).toFixed(1) + 'K', date: dateStr, engagement: (Math.random() * 15).toFixed(1) + '%'
                    };
                });
            });
            setData(mockData); setIsCollecting(false);
        }, 2000);
    };

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-50/50 overflow-y-auto"><div className="max-w-6xl mx-auto">
            <div className="mb-8"><h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><Bot className="text-indigo-600" /> AI Clip Collector</h2><p className="text-gray-500 mt-1">Automated video tracking for iHAVECPU channels.</p></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8"><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-4"><label className="block text-xs font-bold text-gray-500 uppercase">Monitored Sources</label><div className="space-y-3">{targets.map((target, idx) => (<div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"><div className={`p-2 rounded-full ${target.bg} ${target.color}`}><target.icon size={18} /></div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-700">{target.platform}</p><a href={target.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline truncate block">{target.url}</a></div><div className="flex items-center gap-2 text-green-600 text-xs font-bold"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Active</div></div>))}</div></div><div className="space-y-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Target Month</label><input type="month" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={month} onChange={(e) => setMonth(e.target.value)} /></div><button onClick={handleCollect} disabled={isCollecting} className={`w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-indigo-700 transition ${isCollecting ? 'opacity-75 cursor-wait' : ''}`}>{isCollecting ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}{isCollecting ? 'Scanning Channels...' : 'Start Collection'}</button></div></div></div>
            {data && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">{['YouTube', 'Facebook', 'TikTok'].map(platform => (<div key={platform} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col"><div className={`px-4 py-3 border-b flex items-center justify-between ${platform === 'YouTube' ? 'bg-red-50 border-red-100 text-red-700' : platform === 'Facebook' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-900 text-white'}`}><h3 className="font-bold flex items-center gap-2">{platform === 'YouTube' && <Youtube size={18} />}{platform === 'Facebook' && <Facebook size={18} />}{platform === 'TikTok' && <Video size={18} />}{platform}</h3><span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded">{data[platform].length} Clips</span></div><div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">{data[platform].map(clip => (<div key={clip.id} className="group relative border border-gray-100 rounded-lg p-2 hover:bg-gray-50 transition"><div className="aspect-video bg-gray-100 rounded-md overflow-hidden mb-2 relative"><img src={clip.thumbnail} alt="thumb" className="w-full h-full object-cover" /><a href={clip.link} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><ExternalLink className="text-white" size={24} /></a></div><h4 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight mb-1">{clip.title}</h4><div className="flex justify-between items-center text-xs text-gray-500"><span>{clip.date}</span><span className="font-medium flex items-center gap-1"><Activity size={10} /> {clip.views}</span></div></div>))}</div></div>))}</div>)}
            {isCollecting && <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} /><h3 className="text-xl font-bold text-gray-800">AI Agent is Working...</h3><p className="text-gray-500">Scanning monitored channels in {month}...</p></div>}
        </div></div>
    );
};

const AutomationView = ({ currentUser }) => {
    const [automations, setAutomations] = useState([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newAuto, setNewAuto] = useState({ name: '', trigger: 'TASK_CREATED', action: 'SEND_EMAIL', config: { target: '', template: '' }, isActive: true });

    useEffect(() => { const u = onSnapshot(query(collection(db, 'automations'), orderBy('createdAt', 'desc')), (s) => setAutomations(s.docs.map(d => ({...d.data(), id: d.id})))); return u; }, []);

    const handleSaveAutomation = async (e) => {
        e.preventDefault(); await addDoc(collection(db, 'automations'), { ...newAuto, createdAt: new Date(), createdBy: currentUser.email });
        setIsCreateOpen(false); setNewAuto({ name: '', trigger: 'TASK_CREATED', action: 'SEND_EMAIL', config: { target: '', template: '' }, isActive: true });
    };
    const deleteAutomation = async (id) => { if(confirm('Delete automation?')) await deleteDoc(doc(db, 'automations', id)); };
    const toggleAutomation = async (auto) => { await updateDoc(doc(db, 'automations', auto.id), { isActive: !auto.isActive }); };

    return (
        <div className="p-8 h-full bg-gray-50 overflow-y-auto"><div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8"><div><h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2"><Zap className="text-amber-500 fill-amber-500" /> Automation Studio</h2></div><button onClick={() => setIsCreateOpen(true)} className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2"><Plus size={18} /> Create Workflow</button></div>
            <div className="grid gap-4">{automations.map(auto => (<div key={auto.id} className={`bg-white p-6 rounded-xl border-l-4 shadow-sm flex items-center justify-between transition-all ${auto.isActive ? 'border-amber-500 opacity-100' : 'border-gray-300 opacity-60'}`}><div className="flex items-center gap-6"><div className={`p-3 rounded-full ${auto.isActive ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}><Zap size={24} /></div><div><h3 className="font-bold text-lg text-gray-800">{auto.name}</h3><div className="flex items-center gap-2 text-sm text-gray-500 mt-1"><span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs uppercase">{auto.trigger}</span><ArrowRight size={14} /><span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs uppercase">{auto.action}</span></div></div></div><div className="flex items-center gap-4"><input type="checkbox" checked={auto.isActive} onChange={() => toggleAutomation(auto)} className="cursor-pointer" /><button onClick={() => deleteAutomation(auto.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18} /></button></div></div>))}</div>
            {isCreateOpen && (<div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-gray-800">New Automation</h3><button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={24}/></button></div><form onSubmit={handleSaveAutomation} className="space-y-5"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label><input required type="text" className="w-full border rounded-lg p-3" value={newAuto.name} onChange={e => setNewAuto({...newAuto, name: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trigger</label><select className="w-full border rounded-lg p-3" value={newAuto.trigger} onChange={e => setNewAuto({...newAuto, trigger: e.target.value})}><option value="TASK_CREATED">Task Created</option><option value="TASK_DUE_SOON">Due Date Approaching</option></select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Action</label><select className="w-full border rounded-lg p-3" value={newAuto.action} onChange={e => setNewAuto({...newAuto, action: e.target.value})}><option value="SEND_EMAIL">Send Email</option><option value="WEBHOOK">Call Webhook</option></select></div></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target (Email/URL)</label><input required type="text" className="w-full border rounded-lg p-3" value={newAuto.config.target} onChange={e => setNewAuto({...newAuto, config: {...newAuto.config, target: e.target.value}})} /></div><button type="submit" className="w-full bg-amber-500 text-white px-6 py-3 rounded-lg font-bold">Create</button></form></div></div>)}
        </div></div>
    );
};

const ReportView = ({ tasks, currentUser }) => {
    const [selectedBrand, setSelectedBrand] = useState('iHAVECPU');
    const [pages, setPages] = useState([{ id: 1, title: 'Marketing Strategy Report', bodyText: 'Summarize key points...', image: null, image2: null, template: '1-landscape' }]);
    const [activePageId, setActivePageId] = useState(1);
    const [reportDate] = useState(new Date().toLocaleDateString('en-GB'));
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const activePage = pages.find(p => p.id === activePageId) || pages[0];
    const brands = [{ name: 'iHAVECPU', color: 'bg-gray-900 text-white', logo: null }, { name: 'Intel', color: 'bg-blue-600 text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Intel_logo.svg/1200px-Intel_logo.svg.png' }, { name: 'AMD', color: 'bg-black text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/AMD_Logo.svg/2560px-AMD_Logo.svg.png' }, { name: 'NVIDIA', color: 'bg-green-500 text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/2560px-Nvidia_logo.svg.png' }, { name: 'ASUS', color: 'bg-blue-800 text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/2560px-ASUS_Logo.svg.png' }, { name: 'MSI', color: 'bg-red-600 text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/MSI_Logo_2019.svg/2560px-MSI_Logo_2019.svg.png' }];
    const templates = [{ id: '1-landscape', name: '1 Landscape', icon: '1L' }, { id: '2-landscape', name: '2 Landscape', icon: '2L' }, { id: '1-portrait', name: '1 Portrait', icon: '1P' }, { id: '2-portrait', name: '2 Portrait', icon: '2P' }];

    const updatePage = (field, value) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, [field]: value } : p));
    const handleImageUpload = (e, slot) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => updatePage(slot, reader.result); reader.readAsDataURL(file); } };
    const addNewPage = () => { const newId = Date.now(); setPages([...pages, { id: newId, title: 'New Slide', bodyText: 'Enter slide content...', image: null, image2: null, template: '1-landscape' }]); setActivePageId(newId); };
    const removePage = (id, e) => { e.stopPropagation(); if (pages.length === 1) return; const newPages = pages.filter(p => p.id !== id); setPages(newPages); if (activePageId === id) setActivePageId(newPages[0].id); };
    const handleSort = () => { let _pages = [...pages]; const item = _pages.splice(dragItem.current, 1)[0]; _pages.splice(dragOverItem.current, 0, item); setPages(_pages); };
    const getTasksByStatus = (status) => tasks.filter(task => (status === 'todo' && (task.status === 'pending' || !task.status)) ? true : (status === 'done' && task.status === 'completed') ? true : task.status === status);

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-100 overflow-y-auto">
            <div className="max-w-5xl mx-auto mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2"><Presentation className="text-blue-600" /> Presentation Builder</h2><div className="flex gap-3"><button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"><Printer size={18} /> Export PDF</button></div></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><div className="flex justify-between items-center mb-4"><label className="text-xs font-bold text-gray-500 uppercase">Slides</label><button onClick={addNewPage} className="text-blue-600 text-xs font-bold flex items-center gap-1"><Plus size={14} /> Add Slide</button></div><div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">{pages.map((p, idx) => (<div key={p.id} draggable onDragStart={() => (dragItem.current = idx)} onDragEnter={() => (dragOverItem.current = idx)} onDragEnd={handleSort} onClick={() => setActivePageId(p.id)} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer ${activePageId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}><div className="flex items-center gap-2"><GripVertical size={16} /><span className="text-sm font-medium truncate">#{idx+1} {p.title}</span></div><button onClick={(e) => removePage(p.id, e)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button></div>))}</div></div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><label className="block text-xs font-bold text-gray-500 uppercase mb-3">Select Brand</label><div className="grid grid-cols-2 gap-2">{brands.map(brand => (<button key={brand.name} onClick={() => setSelectedBrand(brand.name)} className={`p-2 rounded-lg border-2 text-xs font-bold transition ${selectedBrand === brand.name ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}>{brand.name}</button>))}</div></div>
                    </div>
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3"><Edit2 size={16} /> Edit Slide</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Title</label><input type="text" value={activePage.title} onChange={(e) => updatePage('title', e.target.value)} className="w-full border rounded-lg p-3" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template</label><select value={activePage.template} onChange={(e) => updatePage('template', e.target.value)} className="w-full border rounded-lg p-3"><option value="1-landscape">1 Landscape</option><option value="2-landscape">2 Landscape</option><option value="1-portrait">1 Portrait</option><option value="2-portrait">2 Portrait</option></select></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Content</label><textarea value={activePage.bodyText} onChange={(e) => updatePage('bodyText', e.target.value)} className="w-full border rounded-lg p-3 h-20 resize-none" /></div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-4"><div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><Upload className="mx-auto text-gray-400" size={24} /><span className="text-xs text-gray-500">Image 1</span></div>{activePage.template.startsWith('2') && <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image2')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><Upload className="mx-auto text-gray-400" size={24} /><span className="text-xs text-gray-500">Image 2</span></div>}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="space-y-8 print:space-y-0">
                {pages.map((page, index) => (
                    <div key={page.id} className="max-w-5xl mx-auto bg-white aspect-video shadow-2xl rounded-xl overflow-hidden relative print:shadow-none print:w-full print:h-screen print:rounded-none flex flex-col print:break-after-page">
                        <div className={`h-24 flex items-center px-10 justify-between ${brands.find(b => b.name === selectedBrand)?.color || 'bg-gray-900 text-white'}`}><div></div>{brands.find(b => b.name === selectedBrand)?.logo ? (<img src={brands.find(b => b.name === selectedBrand).logo} alt="Logo" className="h-12 object-contain bg-white/10 p-1 rounded" />) : (<span className="text-xl font-black">{selectedBrand}</span>)}</div>
                        <div className="flex-1 p-10 flex gap-8">
                            <div className="flex-1 flex flex-col justify-center space-y-6"><div><span className="inline-block px-3 py-1 rounded bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">{reportDate}</span><h2 className="text-5xl font-extrabold text-gray-800 leading-tight">{page.title}</h2></div><div className="pt-4"><p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">{page.bodyText}</p></div><div className="pt-8 mt-auto"><p className="text-gray-400 text-sm font-medium">Prepared by</p><p className="text-gray-800 font-bold text-lg">{currentUser?.email}</p></div></div>
                            <div className="flex-1 h-full flex flex-col gap-4">
                                {page.template === '1-landscape' && (<div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image ? <img src={page.image} className="w-full h-full object-cover" /> : <ImageIcon size={48} className="text-gray-300" />}</div>)}
                                {page.template === '2-landscape' && (<><div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div><div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image2 && <img src={page.image2} className="w-full h-full object-cover" />}</div></>)}
                                {page.template === '1-portrait' && (<div className="flex-1 flex justify-center h-full"><div className="h-full aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div></div>)}
                                {page.template === '2-portrait' && (<div className="flex-1 flex gap-4 h-full"><div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div><div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image2 && <img src={page.image2} className="w-full h-full object-cover" />}</div></div>)}
                            </div>
                        </div>
                        <div className="bg-gray-50 border-t border-gray-100 p-4 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">Confidential • Internal Use Only • Slide {index + 1}</div>
                    </div>
                ))}
            </div>
            <style>{`@media print { @page { size: landscape; margin: 0; } body { -webkit-print-color-adjust: exact; } aside, nav, .print\\:hidden { display: none !important; } main { width: 100vw; height: auto; overflow: visible; background: white; } .p-6, .md\\:p-10 { padding: 0 !important; } .print\\:break-after-page { break-after: page; height: 100vh; width: 100vw; border-radius: 0; } }`}</style>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [automations, setAutomations] = useState([]); 
  const [currentView, setCurrentView] = useState('home'); 
  
  // Replace with your actual keys
  const EMAIL_SERVICE_ID = "YOUR_SERVICE_ID"; 
  const EMAIL_TEMPLATE_ID = "YOUR_TEMPLATE_ID"; 
  const EMAIL_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [activeRequirementId, setActiveRequirementId] = useState(null);
  const [isEditing, setIsEditing] = useState(false); 
  const [editedTask, setEditedTask] = useState({}); 
  const [newTask, setNewTask] = useState({
    title: '', tag: 'Planning', startDate: new Date().toISOString().split('T')[0],
    deadline: '', description: '', requirements: [], reference: '', link: '', imageUrl: '', fileUrl: ''
  });
  
  const [tempReqInput, setTempReqInput] = useState('');
  const [tempEditReqInput, setTempEditReqInput] = useState('');

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const activeRequirement = selectedTask ? getSafeRequirements(selectedTask).find(r => r.id === activeRequirementId) : null;

  // READ DATA
  useEffect(() => {
    const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const uTasks = onSnapshot(qTasks, (s) => setTasks(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    const qAutos = query(collection(db, 'automations'));
    const uAutos = onSnapshot(qAutos, (s) => setAutomations(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    return () => { uTasks(); uAutos(); };
  }, []);

  // --- AUTOMATION LOGIC ---
  const processTemplate = (template, data) => template ? template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || "") : "";
  const runAutomations = (trigger, data) => {
      const activeRules = automations.filter(a => a.isActive && a.trigger === trigger);
      activeRules.forEach(async (rule) => {
          const message = processTemplate(rule.config.template, data);
          if (rule.action === 'SEND_EMAIL') {
              if(EMAIL_SERVICE_ID !== "YOUR_SERVICE_ID") emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, { to_email: rule.config.target, message, subject: `[Auto] ${data.title}` }, EMAIL_PUBLIC_KEY);
          } else if (rule.action === 'WEBHOOK') {
              try { await fetch(rule.config.target, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ event: trigger, data, message }) }); } catch(e) { console.error(e); }
          }
      });
  };

  const handleImageUpload = (e, targetState, setTargetState) => {
      const file = e.target.files[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) return alert("File too large (>2MB)");
          const reader = new FileReader();
          reader.onloadend = () => {
              setTargetState({ ...targetState, imageUrl: reader.result });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    const taskData = { ...newTask, status: 'todo', createdAt: new Date(), author: currentUser.email, dueNotificationSent: false };
    await addDoc(collection(db, 'tasks'), taskData);
    
    // RUN AUTOMATIONS
    runAutomations('TASK_CREATED', taskData);

    setNewTask({ title: '', tag: 'Planning', startDate: new Date().toISOString().split('T')[0], deadline: '', description: '', requirements: [], reference: '', link: '', imageUrl: '', fileUrl: '' });
    setTempReqInput('');
    setIsAddModalOpen(false);
  };

  const addRequirementLine = () => {
      if (!tempReqInput.trim()) return;
      setNewTask({ ...newTask, requirements: [...newTask.requirements, { id: Date.now().toString(), text: tempReqInput, isDone: false, tableData: [] }] });
      setTempReqInput('');
  };

  const removeRequirementLine = (index) => {
      const updated = [...newTask.requirements];
      updated.splice(index, 1);
      setNewTask({ ...newTask, requirements: updated });
  };

  // Edit Mode Requirement Handlers
  const addRequirementToEdit = () => {
      if (!tempEditReqInput.trim()) return;
      const currentReqs = editedTask.requirements || [];
      setEditedTask({ ...editedTask, requirements: [...currentReqs, { id: Date.now().toString(), text: tempEditReqInput, isDone: false, tableData: [] }] });
      setTempEditReqInput('');
  };

  const removeRequirementFromEdit = (reqId) => {
      const currentReqs = editedTask.requirements || [];
      setEditedTask({ ...editedTask, requirements: currentReqs.filter(r => r.id !== reqId) });
  };
  
  const updateRequirementTextInEdit = (reqId, newText) => {
      const currentReqs = editedTask.requirements || [];
      setEditedTask({ ...editedTask, requirements: currentReqs.map(r => r.id === reqId ? { ...r, text: newText } : r) });
  };

  const startEditing = () => { 
      // Normalize requirements to array when starting edit
      const safeReqs = getSafeRequirements(selectedTask);
      setEditedTask({ ...selectedTask, requirements: safeReqs }); 
      setIsEditing(true); 
  };

  const handleUpdateTask = async (e) => { 
      e.preventDefault(); 
      await updateDoc(doc(db, 'tasks', selectedTask.id), { ...editedTask }); 
      setIsEditing(false); 
  };

  // ... (Toggle, Move, Delete handlers remain same) ...
  const toggleRequirement = async (taskId, reqId, currentRequirements) => {
      const safeReqs = getSafeRequirements({ requirements: currentRequirements });
      const updatedReqs = safeReqs.map(r => r.id === reqId ? { ...r, isDone: !r.isDone } : r);
      await updateDoc(doc(db, 'tasks', taskId), { requirements: updatedReqs });
  };
  const moveTask = async (e, taskId, currentStatus, direction) => { e.stopPropagation(); const statusOrder = ['todo', 'inprogress', 'review', 'done']; const currentIndex = statusOrder.indexOf(currentStatus); let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1; if (nextIndex >= 0 && nextIndex < statusOrder.length) { await updateDoc(doc(db, 'tasks', taskId), { status: statusOrder[nextIndex] }); } };
  const deleteTask = async (e, id) => { e.stopPropagation(); if (confirm("Delete?")) { await deleteDoc(doc(db, 'tasks', id)); if (selectedTaskId === id) setSelectedTaskId(null); } };
  const handleLogout = async () => { await logout(); navigate('/'); };

  const getTasksByStatus = (status) => tasks.filter(task => (status === 'todo' && (task.status === 'pending' || !task.status)) ? true : (status === 'done' && task.status === 'completed') ? true : task.status === status);

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
      {/* Sidebar... (Keeping same as before) */}
      <aside className="w-20 md:w-64 bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0 z-20 print:hidden">
        <div className="p-6 flex items-center gap-3 mb-6"><div className="bg-blue-600 p-2 rounded-lg text-white flex-shrink-0"><Layout size={24} /></div><div className="flex flex-col justify-center overflow-hidden"><h1 className="text-lg font-bold text-gray-900 leading-none truncate">iHAVECPU</h1><span className="text-xs text-blue-600 font-bold tracking-wider truncate">WORKSPACE</span></div></div>
        <nav className="px-3 space-y-2">
             <button onClick={() => setCurrentView('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'home' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Home size={20} /> <span className="hidden md:inline">Home</span></button>
             <button onClick={() => setCurrentView('board')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'board' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Layout size={20} /> <span className="hidden md:inline">Board</span></button>
             <button onClick={() => setCurrentView('calendar')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'calendar' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><CalendarIcon size={20} /> <span className="hidden md:inline">Calendar</span></button>
             <button onClick={() => setCurrentView('report')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'report' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Presentation size={20} /> <span className="hidden md:inline">Report</span></button>
             <button onClick={() => setCurrentView('album')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'album' ? 'bg-purple-50 text-purple-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><ImageIcon size={20} /> <span className="hidden md:inline">Photo Album</span></button>
             <button onClick={() => setCurrentView('aicollector')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'aicollector' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Bot size={20} /> <span className="hidden md:inline">AI Clip Collector</span></button>
             <button onClick={() => setCurrentView('automation')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'automation' ? 'bg-amber-50 text-amber-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Zap size={20} /> <span className="hidden md:inline">Automation</span></button>
             <button onClick={() => setCurrentView('budget')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'budget' ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Table size={20} /> <span className="hidden md:inline">Budget Recorder</span></button>
             <button onClick={() => setCurrentView('selfheal')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'selfheal' ? 'bg-pink-50 text-pink-500 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Heart size={20} /> <span className="hidden md:inline">Self Heal</span></button>
        </nav>
        <div className="p-4"><button onClick={handleLogout} className="p-2"><LogOut/></button></div>
      </aside>

      <main className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white relative">
        {currentView === 'home' && <HomeView tasks={tasks} currentUser={currentUser} />}
        {currentView === 'calendar' && <CalendarView tasks={tasks} setSelectedTaskId={setSelectedTaskId} setIsEditing={setIsEditing} />}
        {currentView === 'album' && <PhotoAlbumView currentUser={currentUser} />}
        {currentView === 'aicollector' && <AIClipCollectorView />}
        {currentView === 'automation' && <AutomationView currentUser={currentUser} />}
        {currentView === 'budget' && <BudgetRecorderView />}
        {currentView === 'selfheal' && <SelfHealView />}
        {currentView === 'report' && <ReportView tasks={tasks} currentUser={currentUser} />}

        {currentView === 'board' && (
            <div className="flex flex-col h-full w-full">
                <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10"><h2 className="text-2xl font-bold text-gray-800">Marketing Sprint</h2><button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"><Plus size={18} /> New Task</button></header>
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 pt-6"><div className="flex gap-6 h-full min-w-full">{COLUMNS.map(col => (<div key={col.id} className="flex-1 min-w-[300px] flex flex-col h-full"><div className="flex items-center justify-between mb-4 px-1"><div className="flex items-center gap-2"><h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider">{col.title}</h3><span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">{getTasksByStatus(col.id).length}</span></div><MoreHorizontal size={16} className="text-gray-300" /></div><div className={`flex-1 rounded-2xl p-2 ${col.color} overflow-y-auto custom-scrollbar`}><div className="flex flex-col gap-3 pb-2">{getTasksByStatus(col.id).map(task => (<div key={task.id} onClick={() => { setSelectedTaskId(task.id); setIsEditing(false); }} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer"><div className="flex justify-between items-start mb-3"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-500'}`}>{task.tag}</span><button onClick={(e) => deleteTask(e, task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14} /></button></div>
                                        {task.imageUrl && (<div className="mb-3 h-32 w-full overflow-hidden rounded-lg border border-gray-100"><img src={task.imageUrl} alt="Preview" className="h-full w-full object-cover" /></div>)}
                                        <h4 className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed line-clamp-2">{task.title}</h4>{task.requirements && (<div className="mb-3"><div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1"><CheckSquare size={12} className="text-green-600" /><span>Requirements</span></div><div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full w-1/2"></div></div></div>)}<div className="flex items-center justify-between pt-3 border-t border-gray-50"><div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium"><Clock size={12} /><span>{formatDate(task.deadline)}</span></div><div className="flex gap-1">{col.id !== 'todo' && <button onClick={(e) => moveTask(e, task.id, task.status || 'todo', 'prev')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><ArrowLeft size={14} /></button>}{col.id !== 'done' && <button onClick={(e) => moveTask(e, task.id, task.status || 'todo', 'next')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><ArrowRight size={14} /></button>}</div></div></div>))}</div></div></div>))}</div></div>
            </div>
        )}
      </main>

      {/* ADD TASK MODAL */}
      {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-gray-800">Create New Task</h3><button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={24} /></button></div><form onSubmit={handleAddTask} className="flex flex-col gap-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input autoFocus type="text" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium" placeholder="Task Title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} /><select className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" value={newTask.tag} onChange={e => setNewTask({...newTask, tag: e.target.value})}><option value="Planning">Planning</option><option value="Project">Project</option><option value="Product Review">Product Review</option><option value="Event">Event</option><option value="Guest Speaker">Guest Speaker</option></select></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Start Date</label><input readOnly type="date" className="w-full border-gray-200 bg-gray-100 rounded-lg px-4 py-3 text-gray-500 cursor-not-allowed" value={newTask.startDate} /></div><div><label className="text-xs font-bold text-blue-600 uppercase mb-1 block">Due Date</label><input type="date" className="w-full border-2 border-blue-200 bg-blue-50 rounded-lg px-4 py-3 font-bold" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} /></div></div><div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Details</label><textarea className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" placeholder="Task Details..." value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Requirements List</label><div className="flex gap-2 mb-2"><input type="text" placeholder="Add requirement..." className="flex-1 border-gray-200 bg-gray-50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={tempReqInput} onChange={e => setTempReqInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirementLine())} /><button type="button" onClick={addRequirementLine} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition"><Plus size={20} /></button></div><div className="space-y-2 max-h-32 overflow-y-auto">{newTask.requirements.map((req, idx) => (<div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100"><span className="text-sm text-gray-700">{req.text}</span><button type="button" onClick={() => removeRequirementLine(idx)} className="text-gray-400 hover:text-red-500"><X size={14} /></button></div>))}</div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Reference Link</label><input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" placeholder="https://..." value={newTask.reference} onChange={e => setNewTask({...newTask, reference: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Final File Link</label><input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" placeholder="https://..." value={newTask.fileUrl} onChange={e => setNewTask({...newTask, fileUrl: e.target.value})} /></div></div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Attachment Image</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group hover:bg-gray-50 transition">
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, newTask, setNewTask)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            {newTask.imageUrl ? (
                                <div className="flex items-center gap-3 justify-center">
                                    <img src={newTask.imageUrl} className="h-12 w-12 object-cover rounded-lg border" alt="Preview" />
                                    <span className="text-sm text-green-600 font-bold">Image Selected</span>
                                </div>
                            ) : (
                                <div className="text-gray-400"><ImageIcon className="mx-auto mb-1" size={24}/><span className="text-xs">Click to upload image</span></div>
                            )}
                        </div>
                    </div>
                    <button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition">Create Task</button></form></div></div>
      )}

      {/* --- TASK DETAILS / EDIT MODAL --- */}
      {selectedTask && !activeRequirement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTaskId(null)}><div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 flex flex-col" onClick={e => e.stopPropagation()}><div className="p-8"><div className="flex justify-between items-start mb-6"><div className="flex-1">{!isEditing ? (<><div className="flex items-center gap-3 mb-3"><span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${TAG_COLORS[selectedTask.tag]}`}>{selectedTask.tag}</span></div><h2 className="text-3xl font-bold text-gray-900">{selectedTask.title}</h2></>) : (<input type="text" className="w-full border p-2 text-xl font-bold rounded" value={editedTask.title} onChange={e => setEditedTask({...editedTask, title: e.target.value})} />)}</div><div className="flex gap-2">{!isEditing ? <button onClick={startEditing} className="p-2 hover:bg-blue-50 text-blue-600 rounded"><Edit2 size={20} /></button> : <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>}<button onClick={() => setSelectedTaskId(null)} className="p-2 hover:bg-gray-100 rounded"><X size={24} /></button></div></div>

        {!isEditing ? (
            <div className="space-y-8">
                {/* Image Preview in View Mode */}
                {selectedTask.imageUrl && <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-100 mb-6"><img src={selectedTask.imageUrl} className="w-full h-full object-cover" alt="Attachment" /></div>}
                
                <div><h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4"><CheckSquare size={20} className="text-green-600" /> Requirements Checklist</h4><div className="space-y-3 ml-1">{getSafeRequirements(selectedTask).map((req) => (<div key={req.id} className="flex items-start gap-3 group"><input type="checkbox" checked={req.isDone} onChange={() => toggleRequirement(selectedTask.id, req.id, selectedTask.requirements)} className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer" /><div className="flex-1"><span onClick={() => setActiveRequirementId(req.id)} className={`text-sm font-medium cursor-pointer transition px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-600 ${req.isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{req.text}</span></div><button onClick={() => setActiveRequirementId(req.id)} className="text-blue-500 text-xs font-bold hover:underline">Open Table</button></div>))}</div></div>
                <div><h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3"><AlignLeft size={20} className="text-gray-400" /> Details</h4><p className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">{selectedTask.description || <span className="italic text-gray-400">No details provided.</span>}</p></div>
                {(selectedTask.reference || selectedTask.fileUrl) && (<div><h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3"><Paperclip size={20} className="text-gray-400" /> Attachments</h4><div className="flex flex-col gap-2 ml-7">{selectedTask.reference && <a href={selectedTask.reference} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-2"><LinkIcon size={14}/> Reference Link</a>}{selectedTask.fileUrl && <a href={selectedTask.fileUrl} target="_blank" rel="noreferrer" className="text-green-600 hover:underline flex items-center gap-2"><FileText size={14}/> Final File</a>}</div></div>)}
            </div>
        ) : (
            <form onSubmit={handleUpdateTask} className="flex flex-col gap-6 mt-4">
                {/* Editable Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tag</label><select className="w-full border rounded p-2" value={editedTask.tag} onChange={e => setEditedTask({...editedTask, tag: e.target.value})}>{Object.keys(TAG_COLORS).map(tag => <option key={tag} value={tag}>{tag}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-blue-600 uppercase mb-1 block">Due Date</label><input type="date" className="w-full border-2 border-blue-200 bg-blue-50 rounded p-2 font-bold" value={editedTask.deadline} onChange={e => setEditedTask({...editedTask, deadline: e.target.value})} /></div>
                </div>
                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Details</label><textarea className="w-full border rounded p-3 h-32" value={editedTask.description} onChange={e => setEditedTask({...editedTask, description: e.target.value})} /></div>
                
                {/* Editable Requirements List */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Requirements</label>
                    <div className="space-y-2 mb-2">
                        {(editedTask.requirements || []).map((req) => (
                            <div key={req.id} className="flex gap-2">
                                <input type="text" className="flex-1 border rounded p-2 text-sm" value={req.text} onChange={(e) => updateRequirementTextInEdit(req.id, e.target.value)} />
                                <button type="button" onClick={() => removeRequirementFromEdit(req.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="New requirement..." className="flex-1 border rounded p-2 text-sm" value={tempEditReqInput} onChange={e => setTempEditReqInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirementToEdit())} />
                        <button type="button" onClick={addRequirementToEdit} className="bg-gray-100 p-2 rounded hover:bg-gray-200"><Plus size={20}/></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Reference Link</label><input type="url" className="w-full border rounded p-2" value={editedTask.reference} onChange={e => setEditedTask({...editedTask, reference: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Final File Link</label><input type="url" className="w-full border rounded p-2" value={editedTask.fileUrl} onChange={e => setEditedTask({...editedTask, fileUrl: e.target.value})} /></div>
                </div>
                
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Attachment Image</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group hover:bg-gray-50 transition">
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, editedTask, setEditedTask)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        {editedTask.imageUrl ? (
                            <div className="flex items-center gap-3 justify-center">
                                <img src={editedTask.imageUrl} className="h-12 w-12 object-cover rounded-lg border" alt="Preview" />
                                <span className="text-sm text-green-600 font-bold">Change Image</span>
                            </div>
                        ) : (
                            <div className="text-gray-400"><ImageIcon className="mx-auto mb-1" size={24}/><span className="text-xs">Click to upload image</span></div>
                        )}
                    </div>
                </div>

                <button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"><Save size={18} /> Save Changes</button>
            </form>
        )}</div></div></div>
      )}

      {activeRequirement && selectedTask && (
          <RequirementSheetModal task={selectedTask} requirement={activeRequirement} onClose={() => setActiveRequirementId(null)} />
      )}
    </div>
  );
}