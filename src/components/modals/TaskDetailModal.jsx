// src/components/modals/TaskDetailModal.jsx
import React, { useState } from 'react'; 
import { 
  X, Calendar, Clock, MapPin, Tag, User,
  FileText, Link as LinkIcon, ExternalLink, 
  CheckSquare, Pencil, Trash2, Layers, CornerDownRight, BarChartHorizontal, Activity,
  MessageSquare, Send
} from 'lucide-react';
import { TAG_COLORS, formatDate, COLUMNS } from '../../utils/constants';

import GanttChartModal from './GanttChartModal.jsx';

export default function TaskDetailModal({ task, onClose, onEdit, onDelete, tasks = [], onSelectTask, onUpdateTask, currentUser }) {
  const [showGantt, setShowGantt] = useState(false);
  const [commentText, setCommentText] = useState('');

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

  const parentTask = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : null;
  const subtasks = tasks.filter(t => t.parentTaskId === task.id);

  const getStatusLabel = (statusId) => {
      const col = COLUMNS.find(c => c.id === statusId);
      return col ? col.title : statusId;
  };

  const logs = Array.isArray(task.logs) ? task.logs : [];
  const comments = Array.isArray(task.comments) ? task.comments : [];

  // 🟢 HANDLER: POST NEW COMMENT
  const handleSendComment = () => {
    if (!commentText.trim()) return;

    const newCommentObj = {
      id: `cmt_${Date.now()}`,
      user: currentUser?.email || task.taskLeader || 'User',
      text: commentText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedComments = [newCommentObj, ...comments];

    if (onUpdateTask) {
      onUpdateTask(task.id, { comments: updatedComments });
    }

    setCommentText('');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          
          <div className="relative">
              <div className={`h-32 w-full ${task.imageUrl ? '' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
                  {task.imageUrl && <img src={task.imageUrl} alt="Cover" className="w-full h-full object-cover opacity-90"/>}
              </div>
              <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition"><X size={20} /></button>

              <div className="absolute -bottom-3 left-8 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm border border-white ${TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-600'}`}>
                      {task.tag || 'General'}
                  </span>
                  {task.isMainTask && (
                      <span className="px-3 py-1 rounded-lg text-xs font-bold tracking-wider shadow-sm border border-white bg-indigo-600 text-white flex items-center gap-1">
                          <Layers size={12}/> Main Project
                      </span>
                  )}
              </div>
          </div>

          <div className="px-8 pt-6 pb-4 overflow-y-auto custom-scrollbar flex-1">
              {parentTask && (
                  <div 
                      onClick={() => onSelectTask && onSelectTask(parentTask.id)}
                      className="mb-2 mt-2 flex items-center w-fit gap-1.5 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 p-1.5 rounded transition"
                  >
                      <CornerDownRight size={14} className="text-gray-400" />
                      Subtask of: <span className="text-indigo-600 font-bold underline decoration-indigo-300">{parentTask.title}</span>
                  </div>
              )}

              <div className="mb-6 mt-2">
                  <h2 className="text-2xl font-black text-gray-800 leading-tight mb-4">{task.title}</h2>
                  
                  {/* META GRID */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-gray-600 font-semibold">
                      <div className="flex items-center gap-2">
                          <User size={16} className="text-blue-500 shrink-0"/>
                          <span>Task Leader: <span className="text-gray-900 font-bold">{task.taskLeader || 'Unassigned'}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Layers size={16} className="text-orange-500 shrink-0"/>
                          <span>Task Status: <span className="text-gray-900 font-bold">{getStatusLabel(task.status)}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-indigo-500 shrink-0"/>
                          <span>Deadline: <span className="text-gray-900 font-bold">{task.deadline ? formatDate(task.deadline) : (task.startDate ? new Date(task.startDate).toLocaleDateString('en-GB') : 'No Time Set')}</span></span>
                      </div>
                      {task.startTime && (
                          <div className="flex items-center gap-2">
                              <Clock size={16} className="text-pink-500 shrink-0"/>
                              <span>Time: <span className="text-gray-900 font-medium">{new Date(task.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}{task.endTime && ` - ${new Date(task.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}</span></span>
                          </div>
                      )}
                      {task.location && (
                          <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                              <MapPin size={16} className="text-red-500 shrink-0"/>
                              <span>Location: {' '}
                                  {isLocationUrl ? (
                                      <button onClick={() => openLink(task.location)} className="text-blue-600 hover:text-blue-800 hover:underline transition truncate max-w-[300px] text-left inline-block align-bottom font-bold" title={task.location}>{task.location}</button>
                                  ) : (<span className="text-gray-900 font-bold">{task.location}</span>)}
                              </span>
                          </div>
                      )}
                  </div>
              </div>

              {task.description && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                      {task.description}
                  </div>
              )}

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

              {reqs.length > 0 && (
                  <div className="mb-6">
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

              {/* 🟢 TASK COMMENTS SECTION */}
              <div className="mb-6">
                  <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                      <MessageSquare size={18} className="text-indigo-500"/> Comments ({comments.length})
                  </h4>

                  {/* Comment Input */}
                  <div className="flex gap-2 mb-4">
                      <input 
                          type="text" 
                          placeholder="Write a comment..." 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                          className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition font-medium"
                      />
                      <button 
                          onClick={handleSendComment}
                          disabled={!commentText.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                      >
                          <Send size={13} /> Comment
                      </button>
                  </div>

                  {/* Comments Timeline */}
                  <div className="space-y-2.5 max-h-52 overflow-y-auto custom-scrollbar">
                      {comments.length > 0 ? (
                          comments.map((c, idx) => (
                              <div key={c.id || idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="font-bold text-gray-800">{c.user || c.author || 'User'}</span>
                                      <span className="text-[10px] text-gray-400">
                                          {c.timestamp ? new Date(c.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                  </div>
                                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{c.text || c.message}</p>
                              </div>
                          ))
                      ) : (
                          <p className="text-xs text-gray-400 italic py-1">No comments posted yet.</p>
                      )}
                  </div>
              </div>

              {/* TASK ACTIVITY LOG SECTION */}
              <div className="mb-6">
                  <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                      <Activity size={18} className="text-indigo-500"/> Activity Log ({logs.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-gray-50 p-3 rounded-xl border border-gray-200/60">
                      {logs.length > 0 ? (
                          logs.map((log, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-200/50 last:border-0">
                                  <div className="flex items-center gap-2 truncate pr-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                      <span className="font-bold text-gray-800">{log.user || 'System'}</span>
                                      <span className="text-gray-600 truncate">{log.action}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 shrink-0">
                                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                              </div>
                          ))
                      ) : (
                          <p className="text-xs text-gray-400 italic py-1">
                              {task.updatedAt ? `Last updated by ${task.updatedBy || 'System'} on ${new Date(task.updatedAt).toLocaleString('en-GB')}` : 'No activity logs recorded yet.'}
                          </p>
                      )}
                  </div>
              </div>

              {task.isMainTask && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                              <Layers size={18} className="text-indigo-500"/> Subtasks ({subtasks.length})
                          </h4>
                          {subtasks.length > 0 && (
                              <button 
                                  onClick={() => setShowGantt(true)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition border border-indigo-100"
                              >
                                  <BarChartHorizontal size={14} /> View Gantt Chart
                              </button>
                          )}
                      </div>

                      <div className="space-y-2">
                          {subtasks.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No subtasks assigned yet.</p>
                          ) : (
                              subtasks.map(st => (
                                  <div 
                                      key={st.id} 
                                      onClick={() => onSelectTask && onSelectTask(st.id)}
                                      className="p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition group"
                                  >
                                      <div className="flex items-center gap-3 truncate">
                                          <div className={`shrink-0 w-2 h-2 rounded-full ${st.status === 'done' || st.status === 'completed' ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                                          <span className={`text-sm font-medium truncate group-hover:text-indigo-600 transition-colors ${st.status === 'done' || st.status === 'completed' ? 'text-gray-400 line-through group-hover:text-gray-500' : 'text-gray-700'}`}>
                                              {st.title}
                                          </span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                          {getStatusLabel(st.status)}
                                      </span>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              )}
          </div>

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

      {showGantt && (
          <GanttChartModal mainTask={task} subtasks={subtasks} onClose={() => setShowGantt(false)} />
      )}
    </>
  );
}