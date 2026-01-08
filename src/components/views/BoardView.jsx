// src/components/views/BoardView.jsx
import React from 'react';
import { 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  CheckSquare, 
  Clock, 
  Heart 
} from 'lucide-react';

// Import shared constants and helpers
import { COLUMNS, TAG_COLORS, formatDate } from '../../utils/constants';

const BoardView = ({ 
  tasks, 
  onAddTaskClick, 
  onTaskClick, 
  onDeleteTask, 
  onMoveTask 
}) => {
  
  // --- Helper Logic ---
  // Filters tasks into columns, handling some legacy status names (like 'pending' -> 'todo')
  const getTasksByStatus = (status) => {
    return tasks.filter(task => {
      if (status === 'todo') {
        return task.status === 'pending' || !task.status || task.status === 'todo';
      }
      if (status === 'done') {
        return task.status === 'completed' || task.status === 'done';
      }
      return task.status === status;
    });
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          THE MOST BEAUTIFUL MARKETING TEAM
          <Heart size={24} className="text-red-600 fill-red-600" />
        </h2>
        <button 
          onClick={onAddTaskClick} 
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"
        >
          <Plus size={18} /> New Task
        </button>
      </header>

      {/* Board Columns Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 pt-6">
        <div className="flex gap-6 h-full min-w-full">
          {COLUMNS.map(col => {
            const columnTasks = getTasksByStatus(col.id);
            
            return (
              <div key={col.id} className="flex-1 min-w-[300px] flex flex-col h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider">
                      {col.title}
                    </h3>
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">
                      {columnTasks.length}
                    </span>
                  </div>
                  <MoreHorizontal size={16} className="text-gray-300" />
                </div>

                {/* Column Body / Droppable Area */}
                <div className={`flex-1 rounded-2xl p-2 ${col.color} overflow-y-auto custom-scrollbar`}>
                  <div className="flex flex-col gap-3 pb-2">
                    {columnTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        columnId={col.id}
                        onClick={onTaskClick}
                        onDelete={onDeleteTask}
                        onMove={onMoveTask}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Internal Sub-Component: Task Card ---
const TaskCard = ({ task, columnId, onClick, onDelete, onMove }) => {
  // Helper to calculate progress of requirements
  const reqs = Array.isArray(task.requirements) ? task.requirements : [];
  const completedReqs = reqs.filter(r => r.isDone).length;
  const totalReqs = reqs.length;
  const progress = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;

  return (
    <div 
      onClick={() => onClick(task.id)} 
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer"
    >
      {/* Top Row: Tag & Delete */}
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

      {/* Footer: Date & Move Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
          <Clock size={12} />
          <span>{formatDate(task.deadline)}</span>
        </div>
        
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {columnId !== 'todo' && (
            <button 
              onClick={() => onMove(task.id, task.status || 'todo', 'prev')} 
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition"
              title="Move Back"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          {columnId !== 'done' && (
            <button 
              onClick={() => onMove(task.id, task.status || 'todo', 'next')} 
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