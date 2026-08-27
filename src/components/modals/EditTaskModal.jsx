// src/components/modals/EditTaskModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, MapPin, Tag, User,
  FileText, Image as ImageIcon, Save, Trash2, 
  CheckSquare, Link as LinkIcon, ExternalLink, Plus, Check,
  Layers, CornerDownRight
} from 'lucide-react';
import { COLUMNS, TAG_COLORS } from '../../utils/constants';

const INITIAL_TEAM = [
    { name: 'แบงค์กี้', email: 'panarin.b@ihavecpu.com' }, 
    { name: 'เป้ ไข่หมุน', email: 'jittikorn.m@ihavecpu.com' }, 
    { name: 'บูม', email: 'supakorn.i@ihavecpu.com' }, 
    { name: 'ยุ้ย', email: 'sophisa.p@ihavecpu.com' }, 
    { name: 'สมรักษ์', email: 'somruk.m@ihavecpu.com' }, 
    { name: 'มดตะนอย', email: 'nichapa.w@ihavecpu.com'}
];

export default function EditTaskModal({ task, onClose, onUpdate, onOpenRequirement, tasks = [] }) {
  const TAGS = Object.keys(TAG_COLORS);

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [tag, setTag] = useState(task.tag || TAGS[0]);
  const [status, setStatus] = useState(task.status || 'todo');
  const [taskLeader, setTaskLeader] = useState(task.taskLeader || ''); // 🟢 New Field State
  const [deadline, setDeadline] = useState(task.deadline || '');
  
  const [startTime, setStartTime] = useState(task.startTime || '');
  const [endTime, setEndTime] = useState(task.endTime || '');
  const [reference, setReference] = useState(task.reference || '');
  const [finalFile, setFinalFile] = useState(task.finalFile || '');
  
  const [location, setLocation] = useState(task.location || '');
  const [imageUrl, setImageUrl] = useState(task.imageUrl || '');
  const [isPao, setIsPao] = useState(task.isPao || false);

  const [isMainTask, setIsMainTask] = useState(task.isMainTask || false);
  const [parentTaskId, setParentTaskId] = useState(task.parentTaskId || '');

  const mainTasks = tasks.filter(t => t.isMainTask && t.id !== task.id && t.status !== 'canceled');

  const [reqs, setReqs] = useState(task.requirements || []);
  const [newReqTitle, setNewReqTitle] = useState('');

  useEffect(() => {
    setReqs(task.requirements || []);
  }, [task.requirements]);

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

    const updatedReqs = [...reqs, newReq];
    setReqs(updatedReqs);
    setNewReqTitle('');
    onUpdate({ requirements: updatedReqs });
  };

  const handleDeleteRequirement = (id) => {
      const updatedReqs = reqs.filter(r => r.id !== id);
      setReqs(updatedReqs);
      onUpdate({ requirements: updatedReqs });
  };

  const handleToggleRequirement = (id) => {
      const updatedReqs = reqs.map(r => r.id === id ? { ...r, isDone: !r.isDone } : r);
      setReqs(updatedReqs);
      onUpdate({ requirements: updatedReqs });
  };

  const handleSave = () => {
    onUpdate({
      title, description, tag, status, deadline,
      startTime, endTime, reference, finalFile,
      location, imageUrl, isPao, taskLeader, // 🟢 Added to payload
      isMainTask,                                     
      parentTaskId: isMainTask ? null : parentTaskId, 
      requirements: reqs 
    });
    onClose(); 
  };

  const completedReqs = reqs.filter(r => r.isDone).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:flex-row" onClick={e => e.stopPropagation()}>
        
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-800">Edit Task</h3>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Task Title</label>
                    <input type="text" className="w-full text-lg font-semibold border-b-2 border-gray-200 focus:border-indigo-500 outline-none py-2 bg-transparent transition-colors" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                {/* 🟢 NEW FIELD: TASK LEADER SELECTION */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Task Leader (Assign to)</label>
                    <div className="relative">
                        <User className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} />
                        <select value={taskLeader} onChange={(e) => setTaskLeader(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-semibold text-gray-700">
                            <option value="">Select Task Leader...</option>
                            {INITIAL_TEAM.map(member => (
                                <option key={member.email} value={member.name}>{member.name} ({member.email})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Layers size={14} /> Task Hierarchy</label>
                    <div className="flex items-center gap-2 cursor-pointer w-fit" onClick={() => { setIsMainTask(!isMainTask); if(!isMainTask) setParentTaskId(''); }}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${isMainTask ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300'}`}>{isMainTask && <div className="w-1.5 h-2.5 border-b-2 border-r-2 border-white rotate-45 mb-0.5"></div>}</div>
                        <span className="text-sm font-medium text-gray-700">Set as Main Task (Project)</span>
                    </div>
                    {!isMainTask && mainTasks.length > 0 && (
                        <div className="relative mt-2">
                            <CornerDownRight className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} />
                            <select value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-medium text-gray-700">
                                <option value="">-- Is a Subtask of... --</option>
                                {mainTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <FileText className="absolute top-3 left-3 text-gray-400" size={18} />
                    <textarea className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[120px] text-sm resize-none" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Time</label><div className="relative"><Clock className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="datetime-local" className="w-full pl-9 pr-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">End Time</label><div className="relative"><Clock className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="datetime-local" className="w-full pl-9 pr-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deadline</label><div className="relative"><Calendar className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="datetime-local" className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs focus:border-indigo-500 transition" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Location</label><div className="relative"><MapPin className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="text" className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition" value={location} onChange={(e) => setLocation(e.target.value)} /></div></div>
                </div>

                <div className="space-y-3">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reference Link</label><div className="relative"><LinkIcon className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="url" className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition text-blue-600" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="https://..." /></div></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Final Work Link</label><div className="relative"><ExternalLink className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="url" className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition text-green-600" value={finalFile} onChange={(e) => setFinalFile(e.target.value)} placeholder="https://..." /></div></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label><div className="relative"><Tag className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><select value={tag} onChange={(e) => setTag(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-medium text-gray-700">{TAGS.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label><div className="relative"><div className={`w-3 h-3 rounded-full absolute top-1/2 -translate-y-1/2 left-3 ${COLUMNS.find(c => c.id === status)?.color.replace('text-', 'bg-')}`}></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-medium text-gray-700">{COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div></div>
                </div>

                <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cover Image URL</label><div className="relative"><ImageIcon className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} /><input type="url" className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></div></div>

                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition" onClick={() => setIsPao(!isPao)}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isPao ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>{isPao && <X size={14} className="text-white rotate-45" strokeWidth={4} />}</div>
                    <span className="text-sm font-bold text-indigo-900 select-none">Add to P.Pao Schedule?</span>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition text-sm">Cancel</button>
                <button onClick={handleSave} className="px-8 py-2.5 rounded-xl font-bold text-white bg-gray-900 hover:bg-black shadow-lg transition transform active:scale-95 text-sm flex items-center gap-2"><Save size={16} /> Save Changes</button>
            </div>
        </div>

        <div className="w-full md:w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
             <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
                <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2"><CheckSquare size={16} className="text-green-600"/> Requirements</h4>
                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{completedReqs}/{reqs.length}</span>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-2">
                    <input type="text" placeholder="New item..." className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-indigo-500 outline-none" value={newReqTitle} onChange={(e) => setNewReqTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddRequirement(e)} />
                    <button onClick={handleAddRequirement} className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 transition"><Plus size={14} /></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {reqs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs">No requirements added yet.</div>
                ) : (
                    reqs.map((req) => (
                        <div key={req.id} onClick={() => onOpenRequirement(req.id)} className={`p-3 rounded-xl border transition cursor-pointer group relative overflow-hidden flex justify-between items-center ${req.isDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'}`}>
                            <div className="flex items-start gap-3 relative z-10 flex-1 min-w-0">
                                <div onClick={(e) => { e.stopPropagation(); handleToggleRequirement(req.id); }} className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer hover:ring-2 hover:ring-green-200 ${req.isDone ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300 hover:border-green-400'}`}>{req.isDone && <Check size={10} className="text-white" strokeWidth={4} />}</div>
                                <div className="truncate"><p className={`text-xs font-medium leading-relaxed truncate ${req.isDone ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{req.title || req.text || "Untitled"}</p></div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRequirement(req.id); }} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
                        </div>
                    ))
                )}
            </div>
            {imageUrl && (
                <div className="p-4 border-t border-gray-200 bg-white">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Cover Preview</p>
                    <div className="rounded-lg overflow-hidden border border-gray-200 h-32 w-full relative group">
                        <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
                        <a href={imageUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">View Full Size</a>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}