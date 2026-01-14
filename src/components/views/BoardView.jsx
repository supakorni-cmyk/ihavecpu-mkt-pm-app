// src/components/views/BoardView.jsx
import React, { useMemo } from 'react';
import { MoreHorizontal, Plus, Trash2, ArrowLeft, ArrowRight, CheckSquare, Clock, Heart } from 'lucide-react';
import { COLUMNS, TAG_COLORS, formatDate } from '../../utils/constants';

// --- MAIN COMPONENT ---
const BoardView = ({ tasks, onAddTaskClick, onTaskClick, onDeleteTask, onMoveTask }) => {
  
  // 1. Memoized Grouping: Organizes tasks into columns efficiently
  const tasksByColumn = useMemo(() => {
    // Helper to map backend statuses to frontend column IDs
    const normalizeStatus = (status) => {
      if (!status || status === 'pending') return 'todo';
      if (status === 'completed') return 'done';
      return status; // 'in-progress', etc.
    };

    const grouped = {};
    // Initialize empty arrays for all columns
    COLUMNS.forEach(col => grouped[col.id] = []);

    // Sort tasks into groups
    tasks.forEach(task => {
      const status = normalizeStatus(task.status);
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        // Fallback for any unknown status
        grouped['todo'].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // 2. Smart Move Handler: Calculates the next status based on direction
  const handleMoveTask = (taskId, currentStatus, direction) => {
    const colIds = COLUMNS.map(c => c.id); // ['todo', 'in-progress', 'done']
    const currentIndex = colIds.indexOf(currentStatus);
    
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    // Bounds check
    if (newIndex >= 0 && newIndex < colIds.length) {
      onMoveTask(taskId, colIds[newIndex]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          THE MOST BEAUTIFUL MARKETING TEAM <Heart size={24} className="text-red-600 fill-red-600" />
        </h2>
        <button 
          onClick={onAddTaskClick} 
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"
        >
          <Plus size={18} /> New Task
        </button>
      </header>

      {/* Board Columns */}
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
  // Safe access for requirements
  const reqs = Array.isArray(task.requirements) ? task.requirements : [];
  const completedReqs = reqs.filter(r => r.isDone).length;
  const totalReqs = reqs.length;
  const progress = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;

  // Format Date Logic
  const dateDisplay = task.startDate 
    ? `${new Date(task.startDate).getDate()}/${new Date(task.startDate).getMonth() + 1} - ${formatDate(task.deadline)}` 
    : formatDate(task.deadline);

  return (
    <div 
      onClick={() => onClick(task.id)} 
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer"
    >
      {/* Header: Tag & Delete */}
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

      {/* Image Cover */}
      {task.imageUrl && (
        <div className="mb-3 h-32 w-full overflow-hidden rounded-lg border border-gray-100">
          <img src={task.imageUrl} alt="Preview" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Title */}
      <h4 className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed line-clamp-2">
        {task.title}
      </h4>

      {/* Requirements Progress */}
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

      {/* Footer: Date & Navigation */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
          <Clock size={12} />
          <span>{dateDisplay}</span>
        </div>
        
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {!isFirstColumn && (
            <button 
              onClick={() => onMove(task.id, currentColumnId, 'prev')} 
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition"
              title="Move Back"
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