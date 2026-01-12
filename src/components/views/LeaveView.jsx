// src/components/views/LeaveView.jsx
import React, { useState } from 'react';
import { 
  UserMinus, 
  Plus, 
  X, 
  Trash2, 
  Calendar, 
  Clock, 
  Users, 
  FileText 
} from 'lucide-react';

// --- CONSTANTS ---
const EMPLOYEES = ['Pae', 'Boom', 'Yuiizzz', 'Somruk', 'Bum', 'Mham', 'Manow'];
const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave', 'Other'];

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
        startTime: '',
        endTime: '',
        duration: '',
        details: ''
    });

    // --- HANDLERS ---
    const handleSubmit = (e) => {
        e.preventDefault();
        // Use "OtherType" if "Other" is selected, otherwise use "type"
        const finalType = formData.type === 'Other' ? formData.otherType : formData.type;
        
        onAdd({
            ...formData,
            finalType: finalType || 'Unknown' // Store processed type
        });
        
        setIsModalOpen(false);
        // Reset Form
        setFormData({
            name: EMPLOYEES[0], type: LEAVE_TYPES[0], otherType: '',
            startDate: '', endDate: '', startTime: '', endTime: '',
            duration: '', details: ''
        });
    };

    // --- CALCULATIONS FOR OVERVIEW ---
    const getEmployeeStats = (employeeName) => {
        const employeeLeaves = leaves.filter(l => l.name === employeeName);
        const totalHours = employeeLeaves.reduce((acc, curr) => acc + (parseFloat(curr.duration) || 0), 0);
        const days = (totalHours / 8).toFixed(1); // Assuming 8 hour work day
        return { totalHours, days, count: employeeLeaves.length };
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
                                return (
                                    <div key={emp} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600 border border-gray-200">
                                                {emp.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-lg">{emp}</h3>
                                                <span className="text-xs text-gray-400 font-medium">{stats.count} Records</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Total Hours</span>
                                                <span className="text-2xl font-black text-orange-600">{stats.totalHours}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Approx. Days</span>
                                                <span className="text-2xl font-bold text-gray-800">{stats.days}</span>
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
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Dates</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4 text-center">Duration (Hr)</th>
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
                                                <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                                    {leave.startTime ? `${leave.startTime} - ${leave.endTime || '?'}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-800">{leave.duration}</td>
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

                            {/* Row 3: Time & Duration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Start Time (Opt)</label>
                                    <input type="time" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">End Time (Opt)</label>
                                    <input type="time" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-orange-600 uppercase mb-2">Duration (Hours)</label>
                                    <input required type="number" step="0.5" className="w-full border-2 border-orange-100 rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-center text-lg" placeholder="0.0" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                                </div>
                            </div>

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