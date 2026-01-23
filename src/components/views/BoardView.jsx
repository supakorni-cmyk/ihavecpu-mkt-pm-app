// src/components/views/BoardView.jsx
import React, { useState, useMemo } from 'react';
import { 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  CheckSquare, 
  Clock, 
  Heart, 
  FileText, 
  X, 
  Copy, 
  MapPin,
  User,
  Upload,
  Search, // Added
  Filter  // Added
} from 'lucide-react';
import { COLUMNS, TAG_COLORS, formatDate } from '../../utils/constants';

// Define categories for the filter
const FILTER_CATEGORIES = ['All', 'Design', 'Dev', 'Marketing', 'Event', 'Guest Speaker'];

// --- MAIN COMPONENT ---
const BoardView = ({ tasks, onAddTaskClick, onUpdateTask, onDeleteTask, onMoveTask }) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // --- NEW: FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // --- FILTERING LOGIC ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
        // 1. Search Filter (Title)
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        
        // 2. Category Filter (Tags)
        let matchesCategory = true;
        if (selectedCategory !== 'All') {
            const hasSingleTag = task.tag === selectedCategory;
            const hasArrayTag = Array.isArray(task.tags) && task.tags.includes(selectedCategory);
            matchesCategory = hasSingleTag || hasArrayTag;
        }

        return matchesSearch && matchesCategory;
    });
  }, [tasks, searchQuery, selectedCategory]);

  // --- GROUPING LOGIC (Uses filteredTasks now) ---
  const tasksByColumn = useMemo(() => {
    const normalizeStatus = (status) => {
      if (!status || status === 'pending') return 'todo';
      if (status === 'completed') return 'done';
      return status; 
    };

    const grouped = {};
    COLUMNS.forEach(col => grouped[col.id] = []);

    filteredTasks.forEach(task => { // CHANGED: Iterating over filteredTasks
      const status = normalizeStatus(task.status);
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['todo'].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]); // CHANGED: Dependency is now filteredTasks

  const handleMoveTask = (taskId, currentStatus, direction) => {
    const colIds = COLUMNS.map(c => c.id);
    const currentIndex = colIds.indexOf(currentStatus);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < colIds.length) {
      onMoveTask(taskId, colIds[newIndex]);
    }
  };

  const handleTaskClick = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) setEditingTask(task);
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm z-10 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
        
        {/* Title Area */}
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 whitespace-nowrap">
            THE TEAM <Heart size={24} className="text-red-600 fill-red-600 animate-pulse" />
            </h2>
            <div className="h-8 w-px bg-gray-200 hidden xl:block"></div>
            
            {/* --- NEW: SEARCH & FILTER BAR --- */}
            <div className="flex items-center gap-2 flex-1">
                {/* Search Input */}
                <div className="relative group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors"/>
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        className="pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-full text-sm outline-none transition-all w-48 focus:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Category Dropdown */}
                <div className="relative">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-full text-sm outline-none appearance-none cursor-pointer font-medium text-gray-700 focus:ring-2 focus:ring-indigo-100 transition-all"
                    >
                        {FILTER_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
        
        {/* Actions Area */}
        <div className="flex gap-3 justify-end">
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-100 px-4 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition shadow-sm text-sm"
          >
            <FileText size={16} /> <span className="hidden sm:inline">Export</span>
          </button>

          <button 
            onClick={onAddTaskClick} 
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-black transition shadow-lg shadow-gray-200 text-sm transform hover:scale-105 active:scale-95"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </header>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 pt-6">
        <div className="flex gap-6 h-full min-w-full">
          {COLUMNS.map((col, index) => (
            <BoardColumn 
              key={col.id}
              column={col}
              tasks={tasksByColumn[col.id] || []}
              isFirst={index === 0}
              isLast={index === COLUMNS.length - 1}
              onTaskClick={handleTaskClick} 
              onDeleteTask={onDeleteTask}
              onMoveTask={handleMoveTask}
            />
          ))}
        </div>
      </div>

      {/* Export Modal */}
      {isExportOpen && (
        <ExportEventModal tasks={tasks} onClose={() => setIsExportOpen(false)} />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal 
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={(updatedData) => {
                onUpdateTask(editingTask.id, updatedData);
                setEditingTask(null);
            }}
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS (Keep existing ones) ---

const EditTaskModal = ({ task, onClose, onSave }) => {
    const AVAILABLE_TAGS = ['Design', 'Dev', 'Marketing', 'Event', 'Guest Speaker'];
    
    const [formData, setFormData] = useState({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Medium',
        tags: task.tags || (task.tag ? [task.tag] : []),
        location: task.location || '',
        startDate: task.startDate || '',
        deadline: task.deadline || '',
        status: task.status || 'todo',
        assignee: task.assignee || { name: '', avatar: null }
    });

    const handleTagToggle = (tag) => {
        setFormData(prev => {
            const tags = prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag];
            return { ...prev, tags };
        });
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 700 * 1024) { // 700KB Limit
                alert("Image too large! Please select an image smaller than 700KB.");
                e.target.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    assignee: { ...prev.assignee, avatar: reader.result }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Edit Task</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X size={24}/></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label><input required type="text" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign To</label><div className="flex items-center border rounded-lg p-3"><User size={16} className="text-gray-400 mr-2"/><input type="text" placeholder="Name" className="w-full outline-none text-sm" value={formData.assignee?.name || ''} onChange={e => setFormData({...formData, assignee: {...formData.assignee, name: e.target.value}})} /></div></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Photo</label><label className="flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:bg-gray-50 text-sm text-gray-500 transition"><Upload size={16} />{formData.assignee?.avatar ? "Change" : "Upload"}<input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} /></label></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label><input type="datetime-local" className="w-full border rounded-lg p-2 text-sm" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deadline</label><input type="datetime-local" className="w-full border rounded-lg p-2 text-sm" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label><div className="flex items-center border rounded-lg p-3"><MapPin size={16} className="text-gray-400 mr-2"/><input type="text" placeholder="e.g. Main Hall" className="w-full outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tags</label><div className="flex flex-wrap gap-2">{AVAILABLE_TAGS.map(tag => (<button key={tag} type="button" onClick={() => handleTagToggle(tag)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${formData.tags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>{tag}</button>))}</div></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label><textarea className="w-full border rounded-lg p-3 outline-none min-h-[100px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                    <div className="pt-2 flex gap-3"><button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-lg transition">Cancel</button><button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-lg shadow-lg transition">Save Changes</button></div>
                </form>
            </div>
        </div>
    );
};

const ExportEventModal = ({ tasks, onClose }) => {
  const events = tasks.filter(t => { if (t.tag === 'Event' || t.tag === 'Guest Speaker') return true; if (Array.isArray(t.tags) && (t.tags.includes('Event') || t.tags.includes('Guest Speaker'))) return true; return false; });
  events.sort((a, b) => new Date( a.startDate || a.deadline || 0) - new Date( b.startDate || b.deadline || 0));
  const groupedData = events.reduce((acc, task) => { const d = new Date(task.startDate || task.deadline); const key = isNaN(d) ? 'No Date' : d.toLocaleString('default', { month: 'long', year: 'numeric' }); if (!acc[key]) acc[key] = []; acc[key].push(task); return acc; }, {});
  const generateExportText = () => { if (events.length === 0) return "No events found to export."; let text = "☀️🌈อัพเดทตารางงานพี่เปา⭐️⭐️\n\n"; Object.entries(groupedData).forEach(([month, monthTasks]) => { text += `━━━━━━━━━━━━━━━━━━━━━━\n🗓️ ${month.toUpperCase()}\n━━━━━━━━━━━━━━━━━━━━━━\n`; monthTasks.forEach(t => { const bestDate = t.startDate || t.deadline; let dateStr ='TBD'; if (bestDate) { dateStr = new Date(bestDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) } text += `\n📅 ${dateStr}\n📌 ${t.title}\n📝 ${t.description || 'No description provided.'}\n📍 ${t.location || 'Location TBD'}\n\n` }); text += "\n"; }); return text; };
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50"><div><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-indigo-600"/> Event Export</h3><p className="text-xs text-gray-500 mt-1">Found {events.length} items</p></div><button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20}/></button></div>
        <div className="flex-1 bg-gray-50 relative"><textarea readOnly className="w-full h-full p-8 font-mono text-sm text-gray-700 bg-gray-50 outline-none resize-none leading-relaxed" value={generateExportText()}/><button onClick={() => { navigator.clipboard.writeText(generateExportText()); alert("Copied!"); }} className="absolute bottom-8 right-8 bg-black text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800 transition transform hover:scale-105"><Copy size={16}/> Copy Text</button></div>
      </div>
    </div>
  );
};

const BoardColumn = ({ column, tasks, isFirst, isLast, onTaskClick, onDeleteTask, onMoveTask }) => {
  return (
    <div className="flex-1 min-w-[300px] flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2"><h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider">{column.title}</h3><span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">{tasks.length}</span></div><MoreHorizontal size={16} className="text-gray-300 hover:text-gray-600 cursor-pointer" />
      </div>
      <div className={`flex-1 rounded-2xl p-2 ${column.color} overflow-y-auto custom-scrollbar`}><div className="flex flex-col gap-3 pb-2">{tasks.map(task => (<TaskCard key={task.id} task={task} currentColumnId={column.id} isFirstColumn={isFirst} isLastColumn={isLast} onClick={onTaskClick} onDelete={onDeleteTask} onMove={onMoveTask} />))}</div></div>
    </div>
  );
};

const TaskCard = ({ task, currentColumnId, isFirstColumn, isLastColumn, onClick, onDelete, onMove }) => {
  const reqs = Array.isArray(task.requirements) ? task.requirements : [];
  const completedReqs = reqs.filter(r => r.isDone).length;
  const progress = reqs.length > 0 ? (completedReqs / reqs.length) * 100 : 0;
  const displayDate = task.eventDate ? new Date(task.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) : formatDate(task.deadline);
  const renderTags = () => { const tags = task.tags && task.tags.length > 0 ? task.tags : (task.tag ? [task.tag] : []); return tags.map(tag => (<span key={tag} className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase mr-1 ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-500'}`}>{tag}</span>)); };

  return (
    <div onClick={() => onClick(task.id)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer">
      <div className="flex justify-between items-start mb-3"><div className="flex flex-wrap gap-1">{renderTags()}</div><button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14} /></button></div>
      {task.imageUrl && (<div className="mb-3 h-32 w-full overflow-hidden rounded-lg border border-gray-100"><img src={task.imageUrl} alt="Preview" className="h-full w-full object-cover" /></div>)}
      <h4 className="text-gray-800 font-semibold text-sm mb-2 leading-relaxed line-clamp-2">{task.title}</h4>
      {task.location && (<div className="flex items-center gap-1.5 text-xs text-indigo-500 mb-3 bg-indigo-50 w-fit px-2 py-1 rounded"><MapPin size={12}/> <span className="truncate max-w-[200px]">{task.location}</span></div>)}
      {reqs.length > 0 && (<div className="mb-3"><div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1"><CheckSquare size={12} className="text-green-600" /><span>Requirements ({completedReqs}/{reqs.length})</span></div><div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div></div>)}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium"><Clock size={12} /><span>{displayDate}</span></div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {!isFirstColumn && (<button onClick={() => onMove(task.id, currentColumnId, 'prev')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition" title="Move Backward"><ArrowLeft size={14} /></button>)}
          {!isLastColumn && (<button onClick={() => onMove(task.id, currentColumnId, 'next')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition" title="Move Forward"><ArrowRight size={14} /></button>)}
        </div>
      </div>
    </div>
  );
};

export default BoardView;