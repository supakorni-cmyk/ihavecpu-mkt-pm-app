// src/components/views/CalendarView.jsx
import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Sparkles, 
  X,
  Plus
} from 'lucide-react';
import { TAG_COLORS } from '../../utils/constants';
import { summarizeSchedule } from '../../utils/aiService';

// 🟢 MODALS
import AddTaskModal from '../modals/AddTaskModal';
import EditTaskModal from '../modals/EditTaskModal';
import TaskDetailModal from '../modals/TaskDetailModal';

const CalendarView = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); 
    
    // --- STATE ---
    const [aiSummary, setAiSummary] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedDateForNewTask, setSelectedDateForNewTask] = useState(null);
    
    // 🟢 MODAL STATE
    const [selectedTask, setSelectedTask] = useState(null); 
    const [editingTask, setEditingTask] = useState(null);   

    const activeTasks = useMemo(() => {
        return tasks.filter(t => t.status !== 'canceled');
    }, [tasks]);

    // --- DATE HELPERS ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const isToday = (dateObj) => {
        const today = new Date();
        return dateObj.getDate() === today.getDate() && 
               dateObj.getMonth() === today.getMonth() && 
               dateObj.getFullYear() === today.getFullYear();
    };

    const getTasksForDate = (dateObj) => {
        const startOfDay = new Date(dateObj); 
        startOfDay.setHours(0,0,0,0);
        
        const endOfDay = new Date(dateObj); 
        endOfDay.setHours(23,59,59,999);

        return activeTasks.filter(task => {
            const targetDateStr = task.deadline || task.dueDate || task.startDate || task.startTime;
            if (!targetDateStr) return false;
            
            const targetDate = new Date(targetDateStr);
            return targetDate >= startOfDay && targetDate <= endOfDay;
        });
    };

    /// 🟢 FIXED: Explicit string mapping for Tailwind JIT compiler
    const getTagBorder = (task) => {
        const tag = (task.tags && task.tags.length > 0) ? task.tags[0] : task.tag;
        const theme = tag && TAG_COLORS[tag] ? TAG_COLORS[tag] : '';
        
        if (theme.includes('blue')) return 'border-blue-500';
        if (theme.includes('purple')) return 'border-purple-500';
        if (theme.includes('green') || theme.includes('emerald')) return 'border-green-500';
        if (theme.includes('red') || theme.includes('rose')) return 'border-red-500';
        if (theme.includes('yellow') || theme.includes('amber')) return 'border-yellow-500';
        if (theme.includes('orange')) return 'border-orange-500';
        if (theme.includes('pink')) return 'border-pink-500';
        if (theme.includes('indigo')) return 'border-indigo-500';
        
        return 'border-gray-300';
    };

    // --- INTERACTION HANDLERS ---
    const handleDateClick = (date) => {
        const d = new Date(date);
        d.setHours(9, 0, 0, 0); 
        const offsetMs = d.getTimezoneOffset() * 60 * 1000;
        const localISOTime = new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);

        setSelectedDateForNewTask(localISOTime);
        setIsAddModalOpen(true);
    };

    const handleTaskClick = (e, task) => {
        e.stopPropagation(); 
        setSelectedTask(task);
    };

    // --- NAVIGATION ---
    const navigate = (direction) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(month + (direction === 'next' ? 1 : -1));
        } else if (viewMode === 'week') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (viewMode === 'day') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
        setAiSummary(null); 
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setAiSummary(null);
    };

    const handleAiBriefing = async () => {
        let contextTasks = [];
        let dateLabel = "";

        if (viewMode === 'day') {
            contextTasks = getTasksForDate(currentDate);
            dateLabel = currentDate.toDateString();
        } else {
            const today = new Date();
            contextTasks = getTasksForDate(today);
            dateLabel = "Today (" + today.toDateString() + ")";
        }

        if (contextTasks.length === 0) {
            setAiSummary("No tasks found to summarize for " + dateLabel);
            return;
        }

        setIsGenerating(true);
        const summary = await summarizeSchedule(dateLabel, contextTasks);
        setAiSummary(summary);
        setIsGenerating(false);
    };

    // --- RENDER VIEWS ---
    const renderMonthView = () => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay(); 
        
        return (
            <div className="flex-1 flex flex-col h-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                    {dayNames.map((day, i) => (
                        <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-gray-100 overflow-y-auto">
                    {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`empty-${i}`} className="bg-gray-50/20"></div>)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const currentDayDate = new Date(year, month, dayNum);
                        const dayTasks = getTasksForDate(currentDayDate);
                        const todayClass = isToday(currentDayDate) ? 'bg-blue-50/50' : '';

                        return (
                            <div 
                                key={dayNum} 
                                onClick={() => handleDateClick(currentDayDate)} 
                                className={`p-2 min-h-[100px] hover:bg-gray-50 transition-colors group flex flex-col cursor-pointer ${todayClass}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${isToday(currentDayDate) ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}>
                                        {dayNum}
                                    </span>
                                </div>
                                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                    {dayTasks.map(task => (
                                        <button 
                                            key={task.id} 
                                            onClick={(e) => handleTaskClick(e, task)}
                                            className={`text-left w-full px-2 py-1 rounded text-[10px] font-bold truncate transition-all border-l-2 shadow-sm hover:shadow-md hover:scale-[1.01] bg-white ${getTagBorder(task)} text-gray-700`}
                                        >
                                            {task.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
         const startOfWeek = new Date(currentDate);
         const day = startOfWeek.getDay();
         const diff = startOfWeek.getDate() - day; 
         startOfWeek.setDate(diff);
         const weekDays = Array.from({length: 7}).map((_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return d;
        });
        return (
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 h-full divide-x divide-gray-100">
                    {weekDays.map((dateObj, i) => {
                        const dayTasks = getTasksForDate(dateObj);
                        const isCurrent = isToday(dateObj);
                        return (
                            <div key={i} onClick={() => handleDateClick(dateObj)} className={`flex flex-col h-full cursor-pointer hover:bg-gray-50 transition-colors ${isCurrent ? 'bg-blue-50/30' : 'bg-white'}`}>
                                <div className={`p-3 text-center border-b border-gray-100 ${isCurrent ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                    <p className={`text-xs font-bold uppercase mb-1 ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'}`}>{dayNames[dateObj.getDay()]}</p>
                                    <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full text-lg font-black ${isCurrent ? 'bg-blue-600 text-white shadow' : 'text-gray-800'}`}>{dateObj.getDate()}</div>
                                </div>
                                <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar">
                                    {dayTasks.map(task => (
                                        <div key={task.id} onClick={(e) => handleTaskClick(e, task)} className={`bg-white border border-gray-200 border-l-4 ${getTagBorder(task)} rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
                                            <h4 className="font-bold text-xs text-gray-800 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600">{task.title}</h4>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const dayTasks = getTasksForDate(currentDate);
        return (
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto w-full relative">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                        <span className="text-xs font-bold uppercase">{dayNames[currentDate.getDay()]}</span>
                        <span className="text-3xl font-black leading-none">{currentDate.getDate()}</span>
                    </div>
                    <div><h3 className="text-2xl font-bold text-gray-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3><p className="text-gray-500">{dayTasks.length} tasks scheduled</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/50">
                    {dayTasks.map(task => (
                        <div key={task.id} onClick={(e) => handleTaskClick(e, task)} className={`flex items-center bg-white p-4 rounded-xl border border-gray-200 border-l-4 ${getTagBorder(task)} shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
                           <div className="w-16 flex flex-col items-center justify-center text-gray-400 border-r border-gray-100 pr-4 mr-4"><Clock size={20} className="mb-1 text-blue-500" /><span className="text-xs font-medium">All Day</span></div>
                           <div className="flex-1"><h4 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{task.title}</h4></div>
                        </div>
                    ))}
                    <button onClick={() => handleDateClick(currentDate)} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition flex items-center justify-center gap-2"><Plus size={20} /> Add Task for Today</button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 font-sans relative">
            <header className="px-8 py-5 border-b border-gray-200 bg-white flex flex-col md:flex-row justify-between items-center shadow-sm z-20 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                        {viewMode === 'day' ? `${currentDate.getDate()} ${monthNames[month]}` : monthNames[month]} <span className="text-gray-400 font-light">{year}</span>
                    </h2>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                        <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-gray-600"><ChevronLeft size={18} /></button>
                        <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition">Today</button>
                        <button onClick={() => navigate('next')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-gray-600"><ChevronRight size={18} /></button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleAiBriefing} disabled={isGenerating} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition shadow-sm ${isGenerating ? 'bg-indigo-50 text-indigo-400 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}><Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />{isGenerating ? "Analyzing..." : "AI Daily Brief"}</button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['month', 'week', 'day'].map((mode) => (
                            <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{mode}</button>
                        ))}
                    </div>
                </div>
            </header>

            {/* AI Summary Popup */}
            {aiSummary && (
                <div className="mx-6 mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl relative animate-in slide-in-from-top-2">
                    <button onClick={() => setAiSummary(null)} className="absolute top-2 right-2 text-indigo-300 hover:text-indigo-600 transition"><X size={16} /></button>
                    <div className="flex gap-3">
                        <div className="mt-1 bg-indigo-100 p-2 rounded-full h-fit text-indigo-600"><Sparkles size={20} /></div>
                        <div><h4 className="text-sm font-bold text-indigo-900 mb-1">Morning Briefing</h4><p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-line">{aiSummary}</p></div>
                    </div>
                </div>
            )}

            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && renderDayView()}
            </div>

            {isAddModalOpen && (
                <AddTaskModal 
                    tasks={tasks}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={onAddTask}
                    initialDate={selectedDateForNewTask} 
                />
            )}

            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask}
                    tasks={tasks}
                    onClose={() => setSelectedTask(null)}
                    onEdit={() => {
                        setEditingTask(selectedTask); 
                        setSelectedTask(null);        
                    }}
                    onDelete={() => {
                        if(onDeleteTask) onDeleteTask(selectedTask.id);
                        setSelectedTask(null);
                    }}
                />
            )}

            {editingTask && (
                <EditTaskModal 
                    task={editingTask}
                    tasks={tasks}
                    onClose={() => setEditingTask(null)}
                    onUpdate={(updates) => {
                        onUpdateTask(editingTask.id, updates);
                        setEditingTask(null);
                    }}
                    onDelete={() => {
                        if(onDeleteTask) onDeleteTask(editingTask.id);
                        setEditingTask(null);
                    }}
                    onOpenRequirement={() => {}} 
                />
            )}
        </div>
    );
};

export default CalendarView;