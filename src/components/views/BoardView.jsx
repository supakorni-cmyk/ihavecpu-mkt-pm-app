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
  MapPin 
} from 'lucide-react';
import { COLUMNS, TAG_COLORS, formatDate } from '../../utils/constants';

// --- MAIN COMPONENT ---
const BoardView = ({ tasks, onAddTaskClick, onTaskClick, onDeleteTask, onMoveTask }) => {
  const [isExportOpen, setIsExportOpen] = useState(false);

  const tasksByColumn = useMemo(() => {
    const normalizeStatus = (status) => {
      if (!status || status === 'pending') return 'todo';
      if (status === 'completed') return 'done';
      return status; 
    };

    const grouped = {};
    COLUMNS.forEach(col => grouped[col.id] = []);

    tasks.forEach(task => {
      const status = normalizeStatus(task.status);
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['todo'].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const handleMoveTask = (taskId, currentStatus, direction) => {
    const colIds = COLUMNS.map(c => c.id);
    const currentIndex = colIds.indexOf(currentStatus);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < colIds.length) {
      onMoveTask(taskId, colIds[newIndex]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          THE MOST BEAUTIFUL MARKETING TEAM <Heart size={24} className="text-red-600 fill-red-600" />
        </h2>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-100 px-4 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition shadow-sm"
          >
            <FileText size={18} /> Export Events
          </button>

          <button 
            onClick={onAddTaskClick} 
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"
          >
            <Plus size={18} /> New Task
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
              onTaskClick={onTaskClick}
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
    </div>
  );
};

// --- SUB-COMPONENT: EXPORT MODAL ---
const ExportEventModal = ({ tasks, onClose }) => {
  // 1. FILTER LOGIC
  const events = tasks.filter(t => {
      if (t.tag === 'Event' || t.tag === 'Guest Speaker') return true;
      if (Array.isArray(t.tags) && (t.tags.includes('Event') || t.tags.includes('Guest Speaker'))) return true;
      return false;
  });

  // 2. Sort Logic
  events.sort((a, b) => {
    const dateA = new Date( a.startDate || a.deadline || 0);
    const dateB = new Date( b.startDate || b.deadline || 0);
    return dateA - dateB;
  });

  // 3. Group Logic
  const groupedData = events.reduce((acc, task) => {
    const d = new Date(task.startDate || task.deadline);
    const key = isNaN(d) ? 'No Date' : d.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  // 4. Generate Text
  const generateExportText = () => {
    if (events.length === 0) return "No events found to export.";
    
    let text = "☀️🌈อัพเดทตารางงานพี่เปา⭐️⭐️\n\n";
    
    Object.entries(groupedData).forEach(([month, monthTasks]) => {
      text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🗓️ ${month.toUpperCase()}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      monthTasks.forEach(t => {
        const bestDate = t.startDate || t.deadline;
        let dateStr ='TBD';
        if (bestDate) {
          dateStr = new Date(bestDate).toLocaleDateString('en-GB', {
            weekday: 'long', 
            day: 'numeric',  
            month: 'long',   
            year: 'numeric'
          })
        }
        
        text += `   📅 ${dateStr}\n`;
        text += `\n📌 ${t.title}\n`;
        text += `   📝 ${t.description || 'No description provided.'}\n`;
        text += `   📍 ${t.location || 'Location TBD'}\n`;
      });
      text += "\n";
    });
    
    return text;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateExportText());
    alert("Copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      {/* UPDATED CLASSES HERE: max-w-5xl and h-[85vh] */}
      <div 
        className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[85vh] overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-indigo-600"/> Event Export
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Found {events.length} items tagged "Event" or "Guest Speaker"
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
        </div>
        
        <div className="flex-1 bg-gray-50 relative">
          <textarea 
            readOnly
            className="w-full h-full p-8 font-mono text-sm text-gray-700 bg-gray-50 outline-none resize-none leading-relaxed"
            value={generateExportText()}
          />
          <button 
            onClick={copyToClipboard}
            className="absolute bottom-8 right-8 bg-black text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800 transition transform hover:scale-105"
          >
            <Copy size={16}/> Copy Text
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: COLUMN ---
const BoardColumn = ({ column, tasks, isFirst, isLast, onTaskClick, onDeleteTask, onMoveTask }) => {
  return (
    <div className="flex-1 min-w-[300px] flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider">{column.title}</h3>
          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">
            {tasks.length}
          </span>
        </div>
        <MoreHorizontal size={16} className="text-gray-300 hover:text-gray-600 cursor-pointer" />
      </div>
      
      <div className={`flex-1 rounded-2xl p-2 ${column.color} overflow-y-auto custom-scrollbar`}>
        <div className="flex flex-col gap-3 pb-2">
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              currentColumnId={column.id}
              isFirstColumn={isFirst}
              isLastColumn={isLast}
              onClick={onTaskClick} 
              onDelete={onDeleteTask} 
              onMove={onMoveTask} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: CARD ---
const TaskCard = ({ task, currentColumnId, isFirstColumn, isLastColumn, onClick, onDelete, onMove }) => {
  const reqs = Array.isArray(task.requirements) ? task.requirements : [];
  const completedReqs = reqs.filter(r => r.isDone).length;
  const totalReqs = reqs.length;
  const progress = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;

  // Prioritize Event Date, fallback to Deadline
  const displayDate = task.eventDate 
    ? new Date(task.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })
    : formatDate(task.deadline);

  return (
    <div 
      onClick={() => onClick(task.id)} 
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-500'}`}>
          {task.tag}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} 
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {task.imageUrl && (
        <div className="mb-3 h-32 w-full overflow-hidden rounded-lg border border-gray-100">
          <img src={task.imageUrl} alt="Preview" className="h-full w-full object-cover" />
        </div>
      )}

      <h4 className="text-gray-800 font-semibold text-sm mb-2 leading-relaxed line-clamp-2">
        {task.title}
      </h4>

      {/* Location Badge */}
      {task.location && (
        <div className="flex items-center gap-1.5 text-xs text-indigo-500 mb-3 bg-indigo-50 w-fit px-2 py-1 rounded">
            <MapPin size={12}/> <span className="truncate max-w-[200px]">{task.location}</span>
        </div>
      )}

      {totalReqs > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
            <CheckSquare size={12} className="text-green-600" />
            <span>Requirements ({completedReqs}/{totalReqs})</span>
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
        
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {!isFirstColumn && (
            <button 
              onClick={() => onMove(task.id, currentColumnId, 'prev')} 
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition"
              title="Move Backward"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          {!isLastColumn && (
            <button 
              onClick={() => onMove(task.id, currentColumnId, 'next')} 
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition"
              title="Move Forward"
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardView;