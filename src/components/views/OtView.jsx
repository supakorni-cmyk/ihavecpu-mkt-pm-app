// src/components/views/OTView.jsx
import React, { useState } from 'react';
import { 
  Clock, 
  Plus, 
  X, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';

// --- CONSTANTS ---
const OT_EMPLOYEES = ['Somruk', 'Bum', 'Mham', 'Manow', 'Guy'];

// The list of users authorized to Approve/Reject
const APPROVERS = [
    'supakorn.i@ihavecpu.com', 
    'sophisa.p@ihavecpu.com', 
    'jittikorn.m@ihavecpu.com',
    'somruk.m@ihavecpu.com'
];

const OTView = ({ records, onAdd, onDelete, onUpdateStatus, currentUser }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Permission Check
    const canApprove = APPROVERS.includes(currentUser?.email);

    // Form State
    const [formData, setFormData] = useState({
        name: OT_EMPLOYEES[0],
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        duration: '', // Auto-calculated HH:MM
        details: ''
    });

    // --- HANDLERS ---
    
    // NEW: Auto Calculation Logic
    const calculateAutoDuration = (start, end) => {
        if (!start || !end) return '';
        
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        
        // Convert to total minutes
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        
        let diffMinutes = endTotal - startTotal;
        
        // Handle overnight (e.g. 23:00 to 01:00)
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
        }

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        
        // Format as HH:MM
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const handleTimeChange = (field, value) => {
        // Create temporary state to calculate duration based on new input
        const updatedData = { ...formData, [field]: value };
        
        if (updatedData.startTime && updatedData.endTime) {
            updatedData.duration = calculateAutoDuration(updatedData.startTime, updatedData.endTime);
        }
        
        setFormData(updatedData);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(formData);
        setIsModalOpen(false);
        setFormData({
            name: OT_EMPLOYEES[0],
            date: new Date().toISOString().split('T')[0],
            startTime: '', endTime: '', duration: '', details: ''
        });
    };

    // --- HELPER: Parse Duration "HH:MM" to float hours for stats ---
    const parseDuration = (durationStr) => {
        if (!durationStr) return 0;
        const [hours, minutes] = durationStr.split(':').map(Number);
        return (hours || 0) + ((minutes || 0) / 60);
    };

    // --- STATS CALCULATION ---
    const getEmployeeStats = (employeeName) => {
        const userRecords = records.filter(r => r.name === employeeName);
        
        // Only sum hours for 'Approved' records
        const approvedRecords = userRecords.filter(r => r.status === 'Approved');
        const totalHours = approvedRecords.reduce((acc, curr) => acc + parseDuration(curr.duration), 0);
        
        const pendingCount = userRecords.filter(r => r.status === 'Request').length;

        return { 
            totalHours: totalHours.toFixed(2), 
            pendingCount,
            approvedCount: approvedRecords.length 
        };
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans">
            {/* Header */}
            <header className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">OT Recorder</h2>
                        <p className="text-sm text-gray-500 font-medium">Overtime tracking & approvals</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus size={18} /> Request OT
                </button>
            </header>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-8 pt-6 pb-0 flex gap-1 border-b border-gray-200 bg-gray-50">
                    <button onClick={() => setActiveTab('overview')} className={`px-8 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm border border-b-0 border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}>Overview</button>
                    <button onClick={() => setActiveTab('record')} className={`px-8 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'record' ? 'bg-white text-indigo-600 shadow-sm border border-b-0 border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}>Overtime Recorder</button>
                </div>

                <div className="flex-1 overflow-auto p-8">
                    
                    {/* --- TAB: OVERVIEW --- */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
                            {OT_EMPLOYEES.map(emp => {
                                const stats = getEmployeeStats(emp);
                                return (
                                    <div key={emp} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-lg font-bold text-indigo-600 border border-indigo-100">
                                                {emp.charAt(0)}
                                            </div>
                                            {stats.pendingCount > 0 && (
                                                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">
                                                    {stats.pendingCount} Pending
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg mb-1">{emp}</h3>
                                        <div className="space-y-2 mt-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Approved Hours</span>
                                                <span className="font-bold text-indigo-600">{stats.totalHours} hrs</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(stats.totalHours * 2, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* --- TAB: RECORDS TABLE --- */}
                    {activeTab === 'record' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4 text-center">Duration</th>
                                        <th className="px-6 py-4">Details</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {records.length === 0 ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400">No OT records found.</td></tr>
                                    ) : (
                                        records.map(r => (
                                            <tr key={r.id} className="hover:bg-indigo-50/30 transition">
                                                <td className="px-6 py-4 font-bold text-gray-700">{r.name}</td>
                                                <td className="px-6 py-4 text-gray-600">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.startTime} - {r.endTime}</td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-800">{r.duration}</td>
                                                <td className="px-6 py-4 text-gray-500 italic truncate max-w-xs">{r.details || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border 
                                                        ${r.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                          r.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                          'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                                    {/* Approve/Reject Buttons - ONLY FOR APPROVERS */}
                                                    {canApprove && r.status === 'Request' && (
                                                        <>
                                                            <button 
                                                                onClick={() => onUpdateStatus(r.id, 'Approved')} 
                                                                className="p-1 text-green-600 hover:bg-green-50 rounded" 
                                                                title="Approve"
                                                            >
                                                                <CheckCircle2 size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => onUpdateStatus(r.id, 'Rejected')} 
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded" 
                                                                title="Reject"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    
                                                    {/* Delete Button */}
                                                    <button onClick={() => onDelete(r.id)} className="text-gray-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Clock size={24} className="text-indigo-600"/> Request Overtime</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name & Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Name</label>
                                    <select required className="w-full border rounded-lg p-3 bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}>
                                        {OT_EMPLOYEES.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label>
                                    <input required type="date" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                            </div>

                            {/* Time & Duration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Start Time</label>
                                    <input required type="time" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={formData.startTime} onChange={e => handleTimeChange('startTime', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">End Time</label>
                                    <input required type="time" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={formData.endTime} onChange={e => handleTimeChange('endTime', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-600 uppercase mb-2">Total (Calculated)</label>
                                    <input 
                                        readOnly 
                                        type="text" 
                                        placeholder="00:00" 
                                        className="w-full border-2 border-indigo-100 bg-indigo-50 rounded-lg p-2 outline-none font-bold text-center text-lg text-indigo-700 cursor-not-allowed" 
                                        value={formData.duration} 
                                    />
                                </div>
                            </div>

                            {/* Details & Status */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Additional Details</label>
                                    <textarea className="w-full border rounded-lg p-3 h-24 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Task description..." value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                                    <div className="w-full border rounded-lg p-3 bg-gray-100 text-gray-500 flex items-center gap-2 cursor-not-allowed">
                                        <AlertCircle size={16} /> Request
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Status defaults to Request. Approval required.</p>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition">Cancel</button>
                                <button type="submit" className="px-8 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition transform hover:scale-105">Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OTView;