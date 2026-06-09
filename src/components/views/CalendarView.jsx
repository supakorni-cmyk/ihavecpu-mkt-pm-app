// src/components/views/CalendarView.jsx
import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Sparkles, X, Plus, User } from 'lucide-react';
import { TAG_COLORS } from '../../utils/constants';
import { summarizeSchedule } from '../../utils/aiService';

import AddTaskModal from '../modals/AddTaskModal';
import EditTaskModal from '../modals/EditTaskModal';
import TaskDetailModal from '../modals/TaskDetailModal';

const CalendarView = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); 
    
    const [aiSummary, setAiSummary] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedDateForNewTask, setSelectedDateForNewTask] = useState(null);
    
    const [selectedTask, setSelectedTask] = useState(null); 
    const [editingTask, setEditingTask] = useState(null);   

    const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'canceled'), [tasks]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const isToday = (dateObj) => {
        const today = new Date();
        return dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
    };

    const getTasksForDate = (dateObj) => {
        const startOfDay = new Date(dateObj); startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(dateObj); endOfDay.setHours(23,59,59,999);
        return activeTasks.filter(task => {
            const targetDateStr = task.deadline || task.dueDate || task.startDate || task.startTime;
            if (!targetDateStr) return false;
            const targetDate = new Date(targetDateStr);
            return targetDate >= startOfDay && targetDate <= endOfDay;
        });
    };

    const getTagBorder = (task) => {
        const tag = (task.tags && task.tags.length > 0) ? task.tags[0] : task.tag;
        if (!tag) return 'border-gray-200';

        const theme = (TAG_COLORS[tag] || '').toLowerCase();
        const name = tag.toLowerCase();

        if (theme.includes('blue')) return 'border-blue-500';
        if (theme.includes('purple')) return 'border-purple-500';
        if (theme.includes('green') || theme.includes('emerald')) return 'border-green-500';
        if (theme.includes('red') || theme.includes('rose')) return 'border-red-500';
        if (theme.includes('yellow') || theme.includes('amber')) return 'border-yellow-500';
        if (theme.includes('orange')) return 'border-orange-500';
        if (theme.includes('pink')) return 'border-pink-500';
        if (theme.includes('indigo')) return 'border-indigo-500';

        if (name.includes('plan')) return 'border-blue-500';
        if (name.includes('project')) return 'border-purple-500';
        if (name.includes('review')) return 'border-pink-500';
        if (name.includes('event')) return 'border-orange-500';
        if (name.includes('guest') || name.includes('speaker')) return 'border-emerald-500';
        if (name.includes('meet')) return 'border-yellow-500';

        return 'border-gray-300';
    };

    const handleDateClick = (date) => {
        const d = new Date(date); d.setHours(9, 0, 0, 0); 
        const offsetMs = d.getTimezoneOffset() * 60 * 1000;
        setSelectedDateForNewTask(new Date(d.getTime() - offsetMs).toISOString().slice(0, 16));
        setIsAddModalOpen(true);
    };

    const handleTaskClick = (e, task) => { e.stopPropagation(); setSelectedTask(task); };

    const navigate = (direction) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') newDate.setMonth(month + (direction === 'next' ? 1 : -1));
        else if (viewMode === 'week') newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        else if (viewMode === 'day') newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        setCurrentDate(newDate); setAiSummary(null); 
    };

    const goToToday = () => { setCurrentDate(new Date()); setAiSummary(null); };

    const handleAiBriefing = async () => {
        let contextTasks = [], dateLabel = "";
        if (viewMode === 'day') { contextTasks = getTasksForDate(currentDate); dateLabel = currentDate.toDateString(); } 
        else { const today = new Date(); contextTasks = getTasksForDate(today); dateLabel = "Today (" + today.toDateString() + ")"; }
        if (contextTasks.length === 0) { setAiSummary("No tasks found to summarize for " + dateLabel); return; }
        setIsGenerating(true);
        const summary = await summarizeSchedule(dateLabel, contextTasks);
        setAiSummary(summary);
        setIsGenerating(false);
    };

    const renderMonthView = () => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay(); 
        return (
            <div className="flex-1 flex flex-col h-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                    {dayNames.map((day, i) => <div key={day} className={`py-3 text-center text-sm font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'}`}>{day}</div>)}
                </div>
                <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-gray-100 overflow-y-auto">
                    {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`empty-${i}`} className="bg-gray-50/20"></div>)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const currentDayDate = new Date(year, month, dayNum);
                        const dayTasks = getTasksForDate(currentDayDate);
                        const todayClass = isToday(currentDayDate) ? 'bg-blue-50/50' : '';
                        return (
                            <div key={dayNum} onClick={() => handleDateClick(currentDayDate)} className={`p-2 min-h-[110px] hover:bg-gray-50 transition-colors group flex flex-col cursor-pointer ${todayClass}`}>
                                <div className="flex justify-between items-start mb-2"><span className={`w-8 h-8 flex items-center justify-center rounded-full text-base font-bold ${isToday(currentDayDate) ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}>{dayNum}</span></div>
                                
                                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                                    {dayTasks.map(task => (
                                        <button 
                                            key={task.id} 
                                            onClick={(e) => handleTaskClick(e, task)} 
                                            className={`text-left w-full px-2.5 py-2 rounded-lg transition-all border-l-4 shadow-sm hover:shadow-md hover:scale-[1.02] bg-white text-gray-700 flex flex-col gap-1.5 group ${getTagBorder(task)}`}
                                            title={`${task.title} (Leader: ${task.taskLeader || 'None'})`}
                                        >
                                            <span className="text-xs font-bold truncate w-full group-hover:text-blue-600 transition-colors">
                                                {task.title}
                                            </span>
                                            
                                            <div className="flex items-center justify-between w-full opacity-80 mt-0.5">
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold truncate w-full pr-1">
                                                    <User size={12} className="shrink-0 text-gray-400" />
                                                    <span className="truncate">{task.taskLeader || 'Unassigned'}</span>
                                                </div>
                                                <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                                                    task.status === 'on-process' ? 'bg-amber-400' :
                                                    task.status === 'review' ? 'bg-purple-400' :
                                                    task.status === 'done' || task.status === 'completed' ? 'bg-green-500' :
                                                    'bg-gray-300'
                                                }`} title={task.status || 'todo'} />
                                            </div>
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
         const diff = startOfWeek.getDate() - startOfWeek.getDay(); 
         startOfWeek.setDate(diff);
         const weekDays = Array.from({length: 7}).map((_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });
        return (
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 h-full divide-x divide-gray-100">
                    {weekDays.map((dateObj, i) => {
                        const dayTasks = getTasksForDate(dateObj);
                        const isCurrent = isToday(dateObj);
                        return (
                            <div key={i} onClick={() => handleDateClick(dateObj)} className={`flex flex-col h-full cursor-pointer hover:bg-gray-50 transition-colors ${isCurrent ? 'bg-blue-50/30' : 'bg-white'}`}>
                                <div className={`p-4 text-center border-b border-gray-100 ${isCurrent ? 'bg-blue-50' : 'bg-gray-50'}`}><p className={`text-sm font-bold uppercase mb-1.5 ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'}`}>{dayNames[dateObj.getDay()]}</p><div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-full text-xl font-black ${isCurrent ? 'bg-blue-600 text-white shadow' : 'text-gray-800'}`}>{dateObj.getDate()}</div></div>
                                <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                                    {dayTasks.map(task => (
                                        <div key={task.id} onClick={(e) => handleTaskClick(e, task)} className={`bg-white border-y border-r border-l-4 ${getTagBorder(task)} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
                                            <h4 className="font-bold text-sm text-gray-800 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600">{task.title}</h4>
                                            <p className="text-[10px] text-gray-500 font-semibold truncate flex items-center gap-1.5"><User size={12}/> {task.taskLeader || 'Unassigned'}</p>
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
                <div className="p-8 border-b border-gray-100 bg-gray-50 flex items-center gap-5">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"><span className="text-sm font-bold uppercase">{dayNames[currentDate.getDay()]}</span><span className="text-4xl font-black leading-none mt-1">{currentDate.getDate()}</span></div>
                    <div><h3 className="text-3xl font-black text-gray-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3><p className="text-gray-500 text-base mt-1">{dayTasks.length} tasks scheduled</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gray-50/50">
                    {dayTasks.map(task => (
                        <div key={task.id} onClick={(e) => handleTaskClick(e, task)} className={`flex items-center bg-white p-5 rounded-xl border-y border-r border-l-4 ${getTagBorder(task)} shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
                           <div className="w-20 flex flex-col items-center justify-center text-gray-400 border-r border-gray-100 pr-5 mr-5"><Clock size={24} className="mb-2 text-blue-500" /><span className="text-sm font-medium">All Day</span></div>
                           <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                               <h4 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                               <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-semibold self-start sm:self-auto">
                                   <User size={14}/>
                                   <span>Leader: {task.taskLeader || 'Unassigned'}</span>
                               </div>
                           </div>
                        </div>
                    ))}
                    <button onClick={() => handleDateClick(currentDate)} className="w-full py-5 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition flex items-center justify-center gap-2 text-base"><Plus size={24} /> Add Task for Today</button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 font-sans relative">
            <header className="px-8 py-6 border-b border-gray-200 bg-white flex flex-col md:flex-row justify-between items-center shadow-sm z-20 gap-5">
                <div className="flex items-center gap-5"><h2 className="text-4xl font-black text-gray-800 tracking-tight flex items-center gap-3">{viewMode === 'day' ? `${currentDate.getDate()} ${monthNames[month]}` : monthNames[month]} <span className="text-gray-400 font-light">{year}</span></h2><div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1"><button onClick={() => navigate('prev')} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition text-gray-600"><ChevronLeft size={20} /></button><button onClick={goToToday} className="px-4 py-1.5 text-sm font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition">Today</button><button onClick={() => navigate('next')} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition text-gray-600"><ChevronRight size={20} /></button></div></div>
                <div className="flex items-center gap-4"><button onClick={handleAiBriefing} disabled={isGenerating} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition shadow-sm ${isGenerating ? 'bg-indigo-50 text-indigo-400 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}><Sparkles size={16} className={isGenerating ? "animate-spin" : ""} />{isGenerating ? "Analyzing..." : "AI Daily Brief"}</button><div className="flex bg-gray-100 p-1 rounded-xl">{['month', 'week', 'day'].map((mode) => (<button key={mode} onClick={() => setViewMode(mode)} className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{mode}</button>))}</div></div>
            </header>
            {aiSummary && (
                <div className="mx-8 mt-6 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl relative animate-in slide-in-from-top-2"><button onClick={() => setAiSummary(null)} className="absolute top-3 right-3 text-indigo-300 hover:text-indigo-600 transition"><X size={20} /></button><div className="flex gap-4"><div className="mt-1 bg-indigo-100 p-2.5 rounded-full h-fit text-indigo-600"><Sparkles size={24} /></div><div><h4 className="text-base font-bold text-indigo-900 mb-1.5">Morning Briefing</h4><p className="text-base text-indigo-800 leading-relaxed whitespace-pre-line">{aiSummary}</p></div></div></div>
            )}
            <div className="flex-1 p-8 overflow-hidden flex flex-col">{viewMode === 'month' && renderMonthView()} {viewMode === 'week' && renderWeekView()} {viewMode === 'day' && renderDayView()}</div>
            {isAddModalOpen && <AddTaskModal tasks={tasks} onClose={() => setIsAddModalOpen(false)} onAdd={onAddTask} initialDate={selectedDateForNewTask} />}
            {selectedTask && <TaskDetailModal task={selectedTask} tasks={tasks} onClose={() => setSelectedTask(null)} onEdit={() => { setEditingTask(selectedTask); setSelectedTask(null); }} onDelete={() => { if(onDeleteTask) onDeleteTask(selectedTask.id); setSelectedTask(null); }} onSelectTask={(id) => { const t = tasks.find(x => x.id === id); if(t) setSelectedTask(t); }} />}
            {editingTask && <EditTaskModal task={editingTask} tasks={tasks} onClose={() => setEditingTask(null)} onUpdate={(updates) => { onUpdateTask(editingTask.id, updates); setEditingTask(null); }} onDelete={() => { if(onDeleteTask) onDeleteTask(editingTask.id); setEditingTask(null); }} onOpenRequirement={() => {}} />}
        </div>
    );
};

export default CalendarView;