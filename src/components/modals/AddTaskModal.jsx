// src/components/modals/AddTaskModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, MapPin, Tag, 
  FileText, Image as ImageIcon, Sparkles, Link as LinkIcon, ExternalLink,
  CheckSquare, Plus, Trash2, Layers, CornerDownRight
} from 'lucide-react';
import { COLUMNS, TAG_COLORS } from '../../utils/constants';
import { suggestTaskDescription, refineTextTone } from '../../utils/aiService';

export default function AddTaskModal({ onClose, onAdd, initialDate, tasks = [] }) { 
  const TAGS = Object.keys(TAG_COLORS);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState(TAGS[0] || 'General');
  const [status, setStatus] = useState(COLUMNS[0].id);
  
  const [deadline, setDeadline] = useState(''); 
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [reference, setReference] = useState('');
  const [finalFile, setFinalFile] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPao, setIsPao] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [newReqTitle, setNewReqTitle] = useState('');

  // 🟢 HIERARCHY STATE
  const [isMainTask, setIsMainTask] = useState(false);
  const [parentTaskId, setParentTaskId] = useState('');

  // Get available Main Tasks
  const mainTasks = tasks.filter(t => t.isMainTask && t.status !== 'canceled');

  useEffect(() => {
      if (initialDate) {
          setStartTime(initialDate);
          setDeadline(initialDate); 
      }
  }, [initialDate]);

  const handleAddRequirement = (e) => {
    e.preventDefault();
    if (!newReqTitle.trim()) return;

    const newReq = {
        id: Date.now().toString(),
        title: newReqTitle,
        isDone: false,
        tableData: [],
        columns: [
            { id: 'col1', name: 'Item / Name', align: 'left', format: 'text', autoFormula: '' }, 
            { id: 'col2', name: 'Price', align: 'right', format: 'currency', autoFormula: '' }, 
            { id: 'col3', name: 'Quantity', align: 'center', format: 'number', autoFormula: '' }, 
            { id: 'col4', name: 'Total', align: 'right', format: 'currency', autoFormula: '=B*C' }
        ],
        colWidths: {}
    };

    setRequirements([...requirements, newReq]);
    setNewReqTitle('');
  };

  const handleRemoveRequirement = (id) => {
    setRequirements(requirements.filter(r => r.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;

    const newTask = {
      title,
      description,
      tag,
      status,
      deadline: deadline || null,
      startTime: startTime || null,
      endTime: endTime || null,
      reference,
      finalFile,
      location,
      imageUrl,
      isPao, 
      requirements: requirements,
      isMainTask,          // 🟢 Save Hierarchy
      parentTaskId: isMainTask ? null : parentTaskId, // Clear parent if marked as main
      comments: []
    };

    onAdd(newTask);
    onClose();
  };

  const handleMagicFill = async () => {
    if (!title.trim()) {
        alert("Please type a Task Title first!");
        return;
    }
    setIsGenerating(true);
    try {
        const suggestion = await suggestTaskDescription(title);
        if (suggestion) {
            setDescription(prev => (prev ? prev + "\n\n" + suggestion : suggestion));
        }
    } catch (error) {
        console.error("AI Error:", error);
        alert("Failed to generate description.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div className="bg-white rounded-none md:rounded-2xl w-full h-full md:h-auto md:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-screen md:max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-xl font-bold text-gray-800">New Task</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                <X size={20} />
            </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
            
            {/* Title */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Task Title</label>
                <input 
                    type="text" 
                    className="w-full text-lg font-semibold border-b-2 border-gray-200 focus:border-indigo-500 outline-none py-2 bg-transparent transition-colors placeholder:font-normal"
                    placeholder="e.g. Shoot Video for TikTok..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                />
            </div>

            {/* 🟢 HIERARCHY SECTION */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Layers size={14} /> Task Hierarchy (Optional)
                </label>
                
                <div className="flex items-center gap-2 cursor-pointer w-fit" onClick={() => { setIsMainTask(!isMainTask); if(!isMainTask) setParentTaskId(''); }}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${isMainTask ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300'}`}>
                        {isMainTask && <div className="w-1.5 h-2.5 border-b-2 border-r-2 border-white rotate-45 mb-0.5"></div>}
                    </div>
                    <span className="text-sm font-medium text-gray-700">Set as Main Task (Project)</span>
                </div>

                {!isMainTask && mainTasks.length > 0 && (
                    <div className="relative mt-2">
                        <CornerDownRight className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} />
                        <select 
                            value={parentTaskId}
                            onChange={(e) => setParentTaskId(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-medium text-gray-700"
                        >
                            <option value="">-- Is a Subtask of... --</option>
                            {mainTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* REQUIREMENTS */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Requirements / Checklist</label>
                <div className="flex gap-2 mb-3">
                    <input type="text" placeholder="Add requirement..." className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" value={newReqTitle} onChange={(e) => setNewReqTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddRequirement(e)} />
                    <button type="button" onClick={handleAddRequirement} className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition"><Plus size={18} /></button>
                </div>
                <div className="space-y-2">
                    {requirements.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 group">
                            <div className="flex items-center gap-2"><CheckSquare size={14} className="text-gray-400" /><span className="text-sm text-gray-700 font-medium">{req.title}</span></div>
                            <button onClick={() => handleRemoveRequirement(req.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Description + AI */}
            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                    <button type="button" onClick={handleMagicFill} disabled={isGenerating || !title} className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full transition border ${isGenerating ? 'bg-indigo-50 text-indigo-400 border-indigo-100' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}>
                        <Sparkles size={12} className={isGenerating ? "animate-spin" : "fill-indigo-600"} /> {isGenerating ? "Generating..." : "AI Auto-Fill"}
                    </button>
                </div>
                <div className="relative">
                    <FileText className="absolute top-3 left-3 text-gray-400" size={18} />
                    <textarea className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[100px] text-sm resize-none" placeholder="Add details, requirements..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
            </div>

            {/* Time Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Time</label>
                    <div className="relative"><Clock className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="datetime-local" className="w-full pl-9 pr-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">End Time</label>
                    <div className="relative"><Clock className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="datetime-local" className="w-full pl-9 pr-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
                </div>
            </div>

            {/* Deadline & Location */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deadline (Due)</label>
                    <div className="relative"><Calendar className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="datetime-local" className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Location</label>
                    <div className="relative"><MapPin className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="text" placeholder="e.g. Studio 1" className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
                </div>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reference Link</label>
                    <div className="relative"><LinkIcon className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="url" placeholder="https://..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition text-blue-600" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Final Work Link</label>
                    <div className="relative"><ExternalLink className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="url" placeholder="https://..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition text-green-600" value={finalFile} onChange={(e) => setFinalFile(e.target.value)} /></div>
                </div>
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                    <div className="relative">
                        <Tag className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} />
                        <select value={tag} onChange={(e) => setTag(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-medium text-gray-700">
                            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                    <div className="relative">
                        <div className={`w-3 h-3 rounded-full absolute top-1/2 -translate-y-1/2 left-3 ${COLUMNS.find(c => c.id === status)?.color.replace('text-', 'bg-')}`}></div>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-medium text-gray-700">
                            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Cover Image */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cover Image URL</label>
                <div className="relative"><ImageIcon className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="url" placeholder="https://..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></div>
            </div>

            {/* P.Pao Toggle */}
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition" onClick={() => setIsPao(!isPao)}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isPao ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                    {isPao && <X size={14} className="text-white rotate-45" strokeWidth={4} />}
                </div>
                <span className="text-sm font-bold text-indigo-900 select-none">Add to P.Pao Schedule?</span>
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={!title} className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 text-sm flex items-center gap-2 ${title ? 'bg-gray-900 hover:bg-black' : 'bg-gray-300 cursor-not-allowed'}`}>
                <Sparkles size={16} className={title ? "animate-pulse" : "hidden"} />
                Create Task
            </button>
        </div>
      </div>
    </div>
  );
}