// src/components/views/BoardView.jsx
import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; // <--- NEW IMPORT
import { 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Clock, 
  Heart, 
  FileText, 
  X, 
  Copy, 
  MapPin,
  Search, 
  Filter,
  XCircle 
} from 'lucide-react';
import { COLUMNS, TAG_COLORS, formatDate } from '../../utils/constants';

// --- IMPORT THE SEPARATED MODAL ---
import EditTaskModal from '../modals/EditTaskModal';

const FILTER_CATEGORIES = ['All', 'Planning', 'Project', 'Product Review', 'Event', 'Guest Speaker'];

// --- MAIN COMPONENT ---
const BoardView = ({ tasks, onAddTaskClick, onUpdateTask, onDeleteTask, onMoveTask, onOpenRequirement }) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // --- FILTER STATE ---
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

  // --- HELPER: CLEAR FILTER ---
  const clearFilters = () => {
      setSearchQuery("");
      setSelectedCategory("All");
  };

  const isFiltered = searchQuery !== "" || selectedCategory !== "All";

  // --- GROUPING LOGIC ---
  const tasksByColumn = useMemo(() => {
    const normalizeStatus = (status) => {
      if (!status || status === 'pending') return 'todo';
      if (status === 'completed') return 'done';
      return status; 
    };

    const grouped = {};
    COLUMNS.forEach(col => grouped[col.id] = []);

    filteredTasks.forEach(task => {
      const status = normalizeStatus(task.status);
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['todo'].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  // --- NEW: DRAG END HANDLER ---
  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    // 1. Dropped outside the list?
    if (!destination) return;

    // 2. Dropped in the same place?
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // 3. Move the task
    // Note: 'destination.droppableId' corresponds to our column IDs ('todo', 'in-progress', etc.)
    onMoveTask(draggableId, destination.droppableId);
  };

  // Handler to open task for editing
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
            WE LOVE OUR JOB <Heart size={24} className="text-red-600 fill-red-600 animate-pulse" />
            </h2>
            <div className="h-8 w-px bg-gray-200 hidden xl:block"></div>
            
            {/* Search & Filter */}
            <div className="flex items-center gap-2 flex-1">
                {/* Search Input */}
                <div className="relative group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors"/>
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        className="pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-full text-sm outline-none transition-all w-32 focus:w-48 xl:w-64"
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
                        className="pl-9 pr-8 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-full text-sm outline-none appearance-none cursor-pointer font-medium text-gray-700 focus:ring-2 focus:ring-indigo-100 transition-all max-w-[150px]"
                    >
                        {FILTER_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Clear Filter Button */}
                {isFiltered && (
                    <button 
                        onClick={clearFilters}
                        className="ml-2 flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-full transition animate-in fade-in zoom-in duration-200 whitespace-nowrap"
                    >
                        <XCircle size={14} /> Clear
                    </button>
                )}
            </div>
        </div>
        
        {/* Actions Area */}
        <div className="flex gap-3 justify-end">
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-100 px-4 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition shadow-sm text-sm"
          >
            <FileText size={16} /> <span className="hidden sm:inline">Export Event</span>
          </button>

          <button 
            onClick={onAddTaskClick} 
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-black transition shadow-lg shadow-gray-200 text-sm transform hover:scale-105 active:scale-95"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </header>

      {/* --- DRAG DROP CONTEXT WRAPPER --- */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 pt-6">
          <div className="flex gap-6 h-full min-w-full">
            {COLUMNS.map((col) => (
              <BoardColumn 
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] || []}
                onTaskClick={handleTaskClick} 
                onDeleteTask={onDeleteTask}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Export Modal */}
      {isExportOpen && (
        <ExportEventModal tasks={tasks} onClose={() => setIsExportOpen(false)} />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal 
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onUpdate={(updatedData) => {
                onUpdateTask(editingTask.id, updatedData);
                setEditingTask(null);
            }}
            onOpenRequirement={onOpenRequirement || (() => {})}
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

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

// --- UPDATED BOARD COLUMN (Full Height Drop Zone) ---
const BoardColumn = ({ column, tasks, onTaskClick, onDeleteTask }) => {
  return (
    <div className="flex-1 min-w-[300px] flex flex-col h-full rounded-2xl bg-white/50 backdrop-blur-sm border border-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 p-4 border-b border-gray-100 bg-white/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
            <h3 className="text-gray-700 font-black text-sm uppercase tracking-wider">{column.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.color.replace('text-', 'bg-').replace('50', '100')} ${column.color.split(' ')[1]}`}>{tasks.length}</span>
        </div>
        <MoreHorizontal size={16} className="text-gray-300 hover:text-gray-600 cursor-pointer" />
      </div>

      {/* DROPPABLE AREA - FORCE FULL HEIGHT */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
            <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                // 'flex-grow' and 'min-h-0' ensure it fills the space but allows scrolling
                className={`flex-1 p-3 overflow-y-auto custom-scrollbar transition-colors rounded-b-2xl flex flex-col
                    ${snapshot.isDraggingOver ? 'bg-indigo-50/80 ring-2 ring-inset ring-indigo-200' : ''}
                `}
            >
                {/* The list of tasks */}
                <div className="flex flex-col gap-3 min-h-[150px] flex-grow">
                    {tasks.map((task, index) => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            index={index} 
                            onClick={onTaskClick} 
                            onDelete={onDeleteTask} 
                        />
                    ))}
                    {provided.placeholder}
                </div>
            </div>
        )}
      </Droppable>
    </div>
  );
};

// --- UPDATED TASK CARD (Stable Version) ---
const TaskCard = ({ task, index, onClick, onDelete }) => {
  const reqs = Array.isArray(task.requirements) ? task.requirements : [];
  const completedReqs = reqs.filter(r => r.isDone).length;
  const progress = reqs.length > 0 ? (completedReqs / reqs.length) * 100 : 0;
  const displayDate = task.eventDate ? new Date(task.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) : formatDate(task.deadline);
  
  const renderTags = () => { 
      const tags = task.tags && task.tags.length > 0 ? task.tags : (task.tag ? [task.tag] : []); 
      return tags.map((tag, idx) => (
        <span key={idx} className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase mr-1 ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-500'}`}>{tag}</span>
      )); 
  };

  return (
    <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => {
            // SAFE STYLE: Merges library styles properly
            const style = {
                ...provided.draggableProps.style,
                // Critical: Remove transition during drag so it doesn't "lag" behind mouse
                transition: snapshot.isDragging ? 'none' : 'all 0.2s ease', 
                cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
                // Z-index ensures it floats above everything else
                zIndex: snapshot.isDragging ? 9999 : 'auto', 
                // Slight opacity when dragging to see where you are dropping
                opacity: snapshot.isDragging ? 0.9 : 1,
            };

            return (
                <div 
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={style}
                    onClick={() => onClick(task.id)} 
                    className={`bg-white p-4 rounded-xl border group relative
                        ${snapshot.isDragging 
                            ? 'shadow-2xl border-indigo-400 ring-2 ring-indigo-200' 
                            : 'shadow-sm border-gray-100 hover:shadow-md hover:border-indigo-200'
                        }
                    `}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap gap-1">{renderTags()}</div>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    
                    {task.imageUrl && (
                        <div className="mb-3 h-32 w-full overflow-hidden rounded-lg border border-gray-100 pointer-events-none">
                            <img src={task.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                    )}
                    
                    <h4 className="text-gray-800 font-semibold text-sm mb-2 leading-relaxed line-clamp-2 select-none">{task.title}</h4>
                    
                    {task.location && (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-500 mb-3 bg-indigo-50 w-fit px-2 py-1 rounded">
                            <MapPin size={12}/> <span className="truncate max-w-[200px]">{task.location}</span>
                        </div>
                    )}
                    
                    {reqs.length > 0 && (
                        <div className="mb-3">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                                <CheckSquare size={12} className="text-green-600" />
                                <span>Requirements ({completedReqs}/{reqs.length})</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                            <Clock size={12} />
                            <span>{displayDate}</span>
                        </div>
                    </div>
                </div>
            );
        }}
    </Draggable>
  );
};

export default BoardView;