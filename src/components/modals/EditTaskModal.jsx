// src/components/modals/EditTaskModal.jsx
import React, { useState } from 'react';
import { 
    X, Edit2, Save, CheckSquare, AlignLeft, 
    Paperclip, Link as LinkIcon, FileText, 
    ImageIcon, Trash2, Plus, Calendar
} from 'lucide-react';
import { TAG_COLORS, getSafeRequirements, formatDate } from '../../utils/constants';

const EditTaskModal = ({ task, onClose, onUpdate, onOpenRequirement }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState({});
    const [tempEditReqInput, setTempEditReqInput] = useState('');

    // --- Helpers ---
    const startEditing = () => {
        const safeReqs = getSafeRequirements(task);
        // Ensure startDate exists, fallback to today if missing
        const startDate = task.startDate || new Date().toISOString().split('T')[0];
        setEditedTask({ ...task, requirements: safeReqs, startDate });
        setIsEditing(true);
    };

    const handleUpdateTask = (e) => {
        e.preventDefault();
        onUpdate(editedTask);
        setIsEditing(false);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setEditedTask({ ...editedTask, imageUrl: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const toggleRequirement = (reqId) => {
        const safeReqs = getSafeRequirements(task);
        const updatedReqs = safeReqs.map(r => r.id === reqId ? { ...r, isDone: !r.isDone } : r);
        onUpdate({ requirements: updatedReqs });
    };

    const addRequirementToEdit = () => {
        if (!tempEditReqInput.trim()) return;
        setEditedTask({ 
            ...editedTask, 
            requirements: [
                ...(editedTask.requirements || []), 
                { id: Date.now().toString(), text: tempEditReqInput, isDone: false, tableData: [] }
            ] 
        });
        setTempEditReqInput('');
    };

    const removeRequirementFromEdit = (reqId) => {
        setEditedTask({ 
            ...editedTask, 
            requirements: (editedTask.requirements || []).filter(r => r.id !== reqId) 
        });
    };

    const updateRequirementTextInEdit = (reqId, newText) => {
        setEditedTask({ 
            ...editedTask, 
            requirements: (editedTask.requirements || []).map(r => r.id === reqId ? { ...r, text: newText } : r) 
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                            {!isEditing ? (
                                <>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${TAG_COLORS[task.tag]}`}>
                                            {task.tag}
                                        </span>
                                        {/* Show Date Range in View Mode */}
                                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                            <Calendar size={12} />
                                            {formatDate(task.startDate)} - {formatDate(task.deadline)}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">{task.title}</h2>
                                </>
                            ) : (
                                <input type="text" className="w-full border p-2 text-xl font-bold rounded" value={editedTask.title} onChange={e => setEditedTask({...editedTask, title: e.target.value})} />
                            )}
                        </div>
                        <div className="flex gap-2">
                            {!isEditing ? (
                                <button onClick={startEditing} className="p-2 hover:bg-blue-50 text-blue-600 rounded"><Edit2 size={20} /></button>
                            ) : (
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded"><X size={24} /></button>
                        </div>
                    </div>

                    {!isEditing ? (
                        // --- VIEW MODE ---
                        <div className="space-y-8">
                            {task.imageUrl && (
                                <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-100 mb-6">
                                    <img src={task.imageUrl} className="w-full h-full object-cover" alt="Attachment" />
                                </div>
                            )}
                            
                            <div>
                                <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
                                    <CheckSquare size={20} className="text-green-600" /> Requirements Checklist
                                </h4>
                                <div className="space-y-3 ml-1">
                                    {getSafeRequirements(task).map((req) => (
                                        <div key={req.id} className="flex items-start gap-3 group">
                                            <input type="checkbox" checked={req.isDone} onChange={() => toggleRequirement(req.id)} className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer" />
                                            <div className="flex-1">
                                                <span onClick={() => onOpenRequirement(req.id)} className={`text-sm font-medium cursor-pointer transition px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-600 ${req.isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                    {req.text}
                                                </span>
                                            </div>
                                            <button onClick={() => onOpenRequirement(req.id)} className="text-blue-500 text-xs font-bold hover:underline">Open Table</button>
                                        </div>
                                    ))}
                                    {getSafeRequirements(task).length === 0 && <span className="text-gray-400 text-sm italic ml-2">No requirements added.</span>}
                                </div>
                            </div>

                            <div>
                                <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3"><AlignLeft size={20} className="text-gray-400" /> Details</h4>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">{task.description || <span className="italic text-gray-400">No details provided.</span>}</p>
                            </div>

                            {(task.reference || task.fileUrl) && (
                                <div>
                                    <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3"><Paperclip size={20} className="text-gray-400" /> Attachments</h4>
                                    <div className="flex flex-col gap-2 ml-7">
                                        {task.reference && <a href={task.reference} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-2"><LinkIcon size={14}/> Reference Link</a>}
                                        {task.fileUrl && <a href={task.fileUrl} target="_blank" rel="noreferrer" className="text-green-600 hover:underline flex items-center gap-2"><FileText size={14}/> Final File</a>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // --- EDIT MODE ---
                        <form onSubmit={handleUpdateTask} className="flex flex-col gap-6 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tag</label>
                                    <select className="w-full border rounded p-2" value={editedTask.tag} onChange={e => setEditedTask({...editedTask, tag: e.target.value})}>
                                        {Object.keys(TAG_COLORS).map(tag => <option key={tag} value={tag}>{tag}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* ADDED START DATE EDITING */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Start Date</label>
                                        <input type="date" className="w-full border rounded p-2" value={editedTask.startDate} onChange={e => setEditedTask({...editedTask, startDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">Due Date</label>
                                        <input type="date" className="w-full border-2 border-blue-200 bg-blue-50 rounded p-2 font-bold" value={editedTask.deadline} onChange={e => setEditedTask({...editedTask, deadline: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Details</label>
                                <textarea className="w-full border rounded p-3 h-32" value={editedTask.description} onChange={e => setEditedTask({...editedTask, description: e.target.value})} />
                            </div>
                            
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
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
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

                            <button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                                <Save size={18} /> Save Changes
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditTaskModal;