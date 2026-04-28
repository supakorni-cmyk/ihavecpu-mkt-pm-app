// src/components/views/LeaveView.jsx
import React, { useState } from 'react';
import { 
  UserMinus, 
  Plus, 
  X, 
  Trash2, 
  Users, 
  FileText,
  CheckCircle2
} from 'lucide-react';

// --- CONSTANTS ---
const EMPLOYEES = ['Pae', 'Boom', 'Yuiizzz', 'Somruk', 'Bum', 'Mham', 'Lemon', 'Guy'];
const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave', 'Other'];

// --- INDIVIDUAL QUOTAS (Randomized for demo) ---
const EMPLOYEE_QUOTAS = {
    'Pae':      { 'Annual Leave': 7, 'Sick Leave': 30, 'Personal Leave': 3 },
    'Boom':     { 'Annual Leave': 7,  'Sick Leave': 30, 'Personal Leave': 3 },
    'Yuiizzz':  { 'Annual Leave': 6,  'Sick Leave': 30, 'Personal Leave': 3 },
    'Somruk':   { 'Annual Leave': 6, 'Sick Leave': 30, 'Personal Leave': 3 },
    'Bum':      { 'Annual Leave': 6,  'Sick Leave': 30, 'Personal Leave': 3 },
    // 'Mham':     { 'Annual Leave': 6, 'Sick Leave': 30, 'Personal Leave': 3 },
    'Lemon':    { 'Annual Leave': 6,  'Sick Leave': 30, 'Personal Leave': 3 },
    'Guy':    { 'Annual Leave': 0,  'Sick Leave': 30, 'Personal Leave': 3 },
    'Pin':    { 'Annual Leave': 6,  'Sick Leave': 30, 'Personal Leave': 3 },
    'Khaofang':    { 'Annual Leave': 6,  'Sick Leave': 30, 'Personal Leave': 3 },
};

const WORK_DAY_HOURS = 8;

const LeaveView = ({ leaves, onAdd, onDelete }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: EMPLOYEES[0],
        type: LEAVE_TYPES[0],
        otherType: '',
        startDate: '',
        endDate: '',
        isFullDay: false, 
        startTime: '',
        endTime: '',
        duration: '',
        details: ''
    });

    // --- HANDLERS ---
    const handleSubmit = (e) => {
        e.preventDefault();
        
        const finalType = formData.type === 'Other' ? formData.otherType : formData.type;
        
        // Calculate duration logic
        let finalDuration = formData.duration;
        
        // If Full Day is checked
        if (formData.isFullDay) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
            
            finalDuration = diffDays * WORK_DAY_HOURS;
        }

        onAdd({
            ...formData,
            duration: finalDuration,
            finalType: finalType || 'Unknown',
            startTime: formData.isFullDay ? '09:00' : formData.startTime,
            endTime: formData.isFullDay ? '18:00' : formData.endTime,
        });
        
        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            name: EMPLOYEES[0], type: LEAVE_TYPES[0], otherType: '',
            startDate: '', endDate: '', isFullDay: false,
            startTime: '', endTime: '', duration: '', details: ''
        });
    };

    // --- CALCULATIONS FOR OVERVIEW ---
    const getEmployeeStats = (employeeName) => {
        const employeeLeaves = leaves.filter(l => l.name === employeeName);
        
        const usageByType = {};
        LEAVE_TYPES.forEach(type => usageByType[type] = 0);

        employeeLeaves.forEach(leave => {
            let typeKey = LEAVE_TYPES.includes(leave.type) ? leave.type : 'Other';
            if (leave.type === 'Other') typeKey = 'Other';

            const hours = parseFloat(leave.duration) || 0;
            const days = hours / WORK_DAY_HOURS;
            
            if (usageByType[typeKey] !== undefined) {
                usageByType[typeKey] += days;
            }
        });

        const totalHours = employeeLeaves.reduce((acc, curr) => acc + (parseFloat(curr.duration) || 0), 0);
        
        return { usageByType, totalHours, count: employeeLeaves.length };
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans">
            {/* Header */}
            <header className="px-8 py-5 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                        <UserMinus size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Leave Recorder</h2>
                        <p className="text-sm text-gray-500 font-medium">Track team absence and time off</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus size={18} /> Add Leave
                </button>
            </header>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-8 pt-6 pb-0 flex gap-1 border-b border-gray-200 bg-gray-50">
                    <button onClick={() => setActiveTab('overview')} className={`px-8 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'overview' ? 'bg-white text-orange-600 shadow-sm border border-b-0 border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}>Overview</button>
                    <button onClick={() => setActiveTab('record')} className={`px-8 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'record' ? 'bg-white text-orange-600 shadow-sm border border-b-0 border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}>Leave Record</button>
                </div>

                <div className="flex-1 overflow-auto p-8">
                    
                    {/* --- TAB: OVERVIEW --- */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
                            {EMPLOYEES.map(emp => {
                                const stats = getEmployeeStats(emp);
                                // Get this specific employee's quota object
                                const personQuota = EMPLOYEE_QUOTAS[emp] || { 'Annual Leave': 6, 'Sick Leave': 30, 'Personal Leave': 6 };

                                return (
                                    <div key={emp} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition flex flex-col">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center text-lg font-bold text-orange-600 border border-orange-100">
                                                {emp.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-lg">{emp}</h3>
                                                <span className="text-xs text-gray-400 font-medium">Total: {(stats.totalHours / 8).toFixed(1)} Days Taken</span>
                                            </div>
                                        </div>
                                        
                                        {/* Quota Table */}
                                        <div className="flex-1 overflow-hidden">
                                            <table className="w-full text-xs text-left">
                                                <thead className="text-gray-400 font-semibold border-b border-gray-100">
                                                    <tr>
                                                        <th className="pb-2">Type</th>
                                                        <th className="pb-2 text-center">Quota</th>
                                                        <th className="pb-2 text-center">Used</th>
                                                        <th className="pb-2 text-right">Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {['Annual Leave', 'Sick Leave', 'Personal Leave'].map(type => {
                                                        const quota = personQuota[type];
                                                        const used = stats.usageByType[type] || 0;
                                                        const remaining = quota - used;
                                                        const isLow = remaining < 2;

                                                        return (
                                                            <tr key={type} className="group">
                                                                <td className="py-2.5 font-medium text-gray-600">{type.replace(' Leave', '')}</td>
                                                                <td className="py-2.5 text-center text-gray-400">{quota}</td>
                                                                <td className="py-2.5 text-center font-bold text-gray-800">{used > 0 ? used.toFixed(1) : '-'}</td>
                                                                <td className={`py-2.5 text-right font-bold ${isLow ? 'text-red-500' : 'text-green-600'}`}>
                                                                    {remaining.toFixed(1)}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                    {/* Other/Unpaid Summary Row */}
                                                    <tr>
                                                        <td className="py-2.5 font-medium text-gray-400">Other/Unpaid</td>
                                                        <td className="py-2.5 text-center text-gray-300">∞</td>
                                                        <td className="py-2.5 text-center font-bold text-gray-500">
                                                            {((stats.usageByType['Unpaid Leave'] || 0) + (stats.usageByType['Other'] || 0)).toFixed(1)}
                                                        </td>
                                                        <td className="py-2.5 text-right text-gray-300">-</td>
                                                    </tr>
                                                </tbody>
                                            </table>
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
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Dates</th>
                                        <th className="px-6 py-4 text-center">Full Day</th>
                                        <th className="px-6 py-4 text-center">Duration</th>
                                        <th className="px-6 py-4">Details</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {leaves.length === 0 ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400">No leave records found.</td></tr>
                                    ) : (
                                        leaves.map(leave => (
                                            <tr key={leave.id} className="hover:bg-orange-50/30 transition">
                                                <td className="px-6 py-4 font-bold text-gray-700">{leave.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${leave.finalType.includes('Sick') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                        {leave.finalType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    <div className="flex flex-col text-xs font-medium">
                                                        <span>{new Date(leave.startDate).toLocaleDateString('en-GB')}</span>
                                                        {leave.endDate && leave.endDate !== leave.startDate && (
                                                            <span className="text-gray-400">to {new Date(leave.endDate).toLocaleDateString('en-GB')}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {leave.isFullDay ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full"><CheckCircle2 size={14}/></span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 font-mono">{leave.startTime} - {leave.endTime}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-bold text-gray-800">{leave.duration}</span>
                                                    <span className="text-xs text-gray-400 ml-1">hrs</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 italic truncate max-w-xs">{leave.details || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => onDelete(leave.id)} className="text-gray-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded">
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
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Plus size={24} className="text-orange-500"/> Record Leave</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Row 1: Name & Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Name</label>
                                    <div className="relative">
                                        <Users size={18} className="absolute left-3 top-3 text-gray-400"/>
                                        <select required className="w-full border rounded-lg pl-10 p-2.5 bg-white outline-none focus:ring-2 focus:ring-orange-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}>
                                            {EMPLOYEES.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Leave Type</label>
                                    <div className="relative">
                                        <FileText size={18} className="absolute left-3 top-3 text-gray-400"/>
                                        <select required className="w-full border rounded-lg pl-10 p-2.5 bg-white outline-none focus:ring-2 focus:ring-orange-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Conditional Other Input */}
                            {formData.type === 'Other' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Specify Other Type</label>
                                    <input autoFocus type="text" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500" value={formData.otherType} onChange={e => setFormData({...formData, otherType: e.target.value})} placeholder="e.g. Maternity Leave" />
                                </div>
                            )}

                            {/* Row 2: Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Leave Start</label>
                                    <input required type="date" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-orange-500" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Leave End</label>
                                    <input required type="date" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-orange-500" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                                </div>
                            </div>

                            {/* FULL DAY TOGGLE */}
                            <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-lg border border-orange-100">
                                <input 
                                    type="checkbox" 
                                    id="fullDayCheck"
                                    className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    checked={formData.isFullDay} 
                                    onChange={e => setFormData({...formData, isFullDay: e.target.checked})}
                                />
                                <label htmlFor="fullDayCheck" className="text-sm font-bold text-gray-700 cursor-pointer">
                                    Full Day (Skip time input)
                                </label>
                            </div>

                            {/* Row 3: Time & Duration (HIDDEN IF FULL DAY) */}
                            {!formData.isFullDay && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Start Time</label>
                                        <input type="time" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">End Time</label>
                                        <input type="time" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-orange-600 uppercase mb-2">Duration (Hours)</label>
                                        <input required type="number" step="0.5" className="w-full border-2 border-orange-100 rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-center text-lg" placeholder="0.0" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                                    </div>
                                </div>
                            )}

                            {/* Details */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Additional Details</label>
                                <textarea className="w-full border rounded-lg p-3 h-24 outline-none focus:ring-2 focus:ring-orange-500 resize-none" placeholder="Reason for leave..." value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} />
                            </div>

                            {/* Footer Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition">Cancel</button>
                                <button type="submit" className="px-8 py-3 rounded-lg font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-lg transition transform hover:scale-105">Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveView;