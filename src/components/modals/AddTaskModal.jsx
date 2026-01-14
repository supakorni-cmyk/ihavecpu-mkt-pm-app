// src/components/modals/AddTaskModal.jsx
import React, { useState } from 'react';
import { X, Plus, ImageIcon } from 'lucide-react';

const AddTaskModal = ({ onClose, onAdd }) => {
    // --- Local State ---
    const [newTask, setNewTask] = useState({
        title: '', 
        tag: 'Planning', 
        startDate: new Date().toISOString().split('T')[0], // Defaults to today
        deadline: '', 
        description: '', 
        requirements: [], 
        location: '',
        reference: '', 
        link: '', 
        imageUrl: '', 
        fileUrl: ''
    });

    const [tempReqInput, setTempReqInput] = useState('');

    // --- Handlers ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) return alert("File too large (>2MB)");
            const reader = new FileReader();
            reader.onloadend = () => setNewTask({ ...newTask, imageUrl: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const addRequirementLine = () => {
        if (!tempReqInput.trim()) return;
        setNewTask({ 
            ...newTask, 
            requirements: [
                ...newTask.requirements, 
                { id: Date.now().toString(), text: tempReqInput, isDone: false, tableData: [] }
            ] 
        });
        setTempReqInput('');
    };

    const removeRequirementLine = (index) => {
        const updated = [...newTask.requirements];
        updated.splice(index, 1);
        setNewTask({ ...newTask, requirements: updated });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newTask.title) return;
        onAdd(newTask);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">Create New Task</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input autoFocus type="text" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium" placeholder="Task Title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                        <select className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" value={newTask.tag} onChange={e => setNewTask({...newTask, tag: e.target.value})}>
                            <option value="Planning">Planning</option>
                            <option value="Project">Project</option>
                            <option value="Product Review">Product Review</option>
                            <option value="Event">Event</option>
                            <option value="Guest Speaker">Guest Speaker</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            {/* CHANGED: Removed readOnly and bg-gray-100 to make it editable */}
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Start Date</label>
                            <input 
                                type="date" 
                                className="w-full border-gray-200 bg-white border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" 
                                value={newTask.startDate} 
                                onChange={e => setNewTask({...newTask, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">Due Date</label>
                            <input type="date" className="w-full border-2 border-blue-200 bg-blue-50 rounded-lg px-4 py-3 font-bold" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Details</label>
                        <textarea className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" placeholder="Task Details..." value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Requirements List</label>
                        <div className="flex gap-2 mb-2">
                            <input type="text" placeholder="Add requirement..." className="flex-1 border-gray-200 bg-gray-50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={tempReqInput} onChange={e => setTempReqInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirementLine())} />
                            <button type="button" onClick={addRequirementLine} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition"><Plus size={20} /></button>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {newTask.requirements.map((req, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                                    <span className="text-sm text-gray-700">{req.text}</span>
                                    <button type="button" onClick={() => removeRequirementLine(idx)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Location</label>
                            <input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" placeholder="Google Maps Link" value={newTask.location} onChange={e => setNewTask({...newTask, location: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Reference Link</label>
                            <input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" placeholder="https://..." value={newTask.reference} onChange={e => setNewTask({...newTask, reference: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Final File Link</label>
                            <input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" placeholder="https://..." value={newTask.fileUrl} onChange={e => setNewTask({...newTask, fileUrl: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Attachment Image</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group hover:bg-gray-50 transition">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
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

                    <button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition">Create Task</button>
                </form>
            </div>
        </div>
    );
};

export default AddTaskModal;