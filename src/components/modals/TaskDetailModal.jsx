// src/components/modals/TaskDetailModal.jsx
import React from 'react';
import { 
  X, Calendar, Clock, MapPin, Tag, 
  FileText, Link as LinkIcon, ExternalLink, 
  CheckSquare, Pencil, Trash2, Layers, CornerDownRight, CheckCircle2 
} from 'lucide-react';
import { TAG_COLORS, formatDate, COLUMNS } from '../../utils/constants';

export default function TaskDetailModal({ task, onClose, onEdit, onDelete, tasks = [] }) {
  if (!task) return null;

  const openLink = (url) => {
    if (!url) return;
    let safeUrl = url.trim();
    if (!safeUrl.startsWith('http')) safeUrl = `https://${safeUrl}`;
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };

  const reqs = task.requirements || [];
  const completedReqs = reqs.filter(r => r.isDone).length;

  const isLocationUrl = task.location && (
    task.location.startsWith('http') || 
    task.location.startsWith('www') || 
    task.location.includes('.com') || 
    task.location.includes('maps.app')
  );

  // 🟢 HIERARCHY LOOKUPS
  const parentTask = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : null;
  const subtasks = tasks.filter(t => t.parentTaskId === task.id);

  // Helper to format status cleanly
  const getStatusLabel = (statusId) => {
      const col = COLUMNS.find(c => c.id === statusId);
      return col ? col.title : statusId;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* --- HEADER --- */}
        <div className="relative">
            <div className={`h-32 w-full ${task.imageUrl ? '' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
                {task.imageUrl && <img src={task.imageUrl} alt="Cover" className="w-full h-full object-cover opacity-90"/>}
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition"><X size={20} /></button>

            <div className="absolute -bottom-3 left-8 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm border border-white ${TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-600'}`}>
                    {task.tag || 'General'}
                </span>
                {/* 🟢 Badge if Main Task */}
                {task.isMainTask && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold tracking-wider shadow-sm border border-white bg-indigo-600 text-white flex items-center gap-1">
                        <Layers size={12}/> Main Project
                    </span>
                )}
            </div>
        </div>

        {/* --- BODY --- */}
        <div className="px-8 pt-6 pb-4 overflow-y-auto custom-scrollbar flex-1">
            
            {/* 🟢 Show Parent Task Reference if Subtask */}
            {parentTask && (
                <div className="mb-2 mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <CornerDownRight size={14} className="text-gray-400" />
                    Subtask of: <span className="text-indigo-600 font-bold">{parentTask.title}</span>
                </div>
            )}

            {/* Title & Time */}
            <div className="mb-6 mt-2">
                <h2 className="text-2xl font-black text-gray-800 leading-tight mb-2">{task.title}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5"><Calendar size={16} className="text-indigo-500"/>{task.startDate ? new Date(task.startDate).toLocaleDateString('en-GB') : (task.deadline ? formatDate(task.deadline) : 'No Date')}</div>
                    {task.startTime && (
                        <div className="flex items-center gap-1.5"><Clock size={16} className="text-orange-500"/>{new Date(task.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}{task.endTime && ` - ${new Date(task.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}</div>
                    )}
                    {task.location && (
                        <div className="flex items-center gap-1.5">
                            <MapPin size={16} className="text-red-500"/>
                            {isLocationUrl ? (
                                <button onClick={() => openLink(task.location)} className="text-blue-600 hover:text-blue-800 hover:underline transition truncate max-w-[200px] text-left" title={task.location}>{task.location}</button>
                            ) : (<span>{task.location}</span>)}
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            {task.description && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    {task.description}
                </div>
            )}

            {/* Actionable Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {task.reference && (
                    <button onClick={() => openLink(task.reference)} className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100 transition text-left group">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:bg-white transition"><LinkIcon size={18}/></div>
                        <div className="flex-1 min-w-0"><p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Reference / Script</p><p className="text-xs text-blue-600 truncate underline decoration-blue-300">Click to Open</p></div>
                        <ExternalLink size={14} className="text-blue-400"/>
                    </button>
                )}
                {task.finalFile && (
                    <button onClick={() => openLink(task.finalFile)} className="flex items-center gap-3 p-3 rounded-xl border border-green-100 bg-green-50/50 hover:bg-green-100 transition text-left group">
                        <div className="bg-green-100 p-2 rounded-lg text-green-600 group-hover:bg-white transition"><FileText size={18}/></div>
                        <div className="flex-1 min-w-0"><p className="text-xs font-bold text-green-800 uppercase tracking-wide">Final Work</p><p className="text-xs text-green-600 truncate underline decoration-green-300">Click to Download</p></div>
                        <ExternalLink size={14} className="text-green-400"/>
                    </button>
                )}
            </div>

            {/* Requirements Summary */}
            {reqs.length > 0 && (
                <div className="mb-4">
                    <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><CheckSquare size={18} className="text-gray-400"/> Requirements ({completedReqs}/{reqs.length})</h4>
                    <div className="space-y-2">
                        {reqs.map(req => (
                            <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50/50">
                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${req.isDone ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>{req.isDone && <div className="w-1.5 h-2.5 border-b-2 border-r-2 border-white rotate-45 mb-0.5"></div>}</div>
                                <span className={`text-sm ${req.isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{req.title || req.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 🟢 SUBTASKS LIST */}
            {task.isMainTask && subtasks.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                        <Layers size={18} className="text-indigo-500"/> Subtasks ({subtasks.length})
                    </h4>
                    <div className="space-y-2">
                        {subtasks.map(st => (
                            <div key={st.id} className="p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-3 truncate">
                                    <div className={`shrink-0 w-2 h-2 rounded-full ${st.status === 'done' || st.status === 'completed' ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                                    <span className={`text-sm font-medium truncate ${st.status === 'done' || st.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                        {st.title}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0">
                                    {getStatusLabel(st.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button 
                onClick={() => { if(confirm("Are you sure you want to delete this task?")) { onDelete(); onClose(); } }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"
            >
                <Trash2 size={16} /> Delete
            </button>
            <button onClick={onEdit} className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold text-white bg-gray-900 hover:bg-black shadow-lg transition">
                <Pencil size={16} /> Edit
            </button>
        </div>
      </div>
    </div>
  );
}