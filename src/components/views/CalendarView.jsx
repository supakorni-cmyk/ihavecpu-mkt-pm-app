// src/components/views/CalendarView.jsx
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { TAG_COLORS } from '../../utils/constants';

const CalendarView = ({ tasks, setSelectedTaskId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    // Formatting helpers
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    // Navigation Handlers
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Task Filter Logic
    const getTasksForDay = (day) => {
        const currentDayDate = new Date(year, month, day);
        currentDayDate.setHours(0, 0, 0, 0);

        return tasks.filter(task => {
            if (!task.startDate && !task.deadline) return false;
            // Use startDate if available, otherwise deadline
            const dateStr = task.startDate || task.deadline;
            const taskDate = new Date(dateStr);
            taskDate.setHours(0, 0, 0, 0);
            return currentDayDate.getTime() === taskDate.getTime();
        });
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 font-sans">
            
            {/* --- HEADER --- */}
            <header className="px-8 py-5 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                        {monthNames[month]} <span className="text-gray-400 font-light">{year}</span>
                    </h2>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-gray-600">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition">
                            Today
                        </button>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-gray-600">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* --- CALENDAR GRID --- */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-gray-100">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                            <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-400'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Cells */}
                    <div className="grid grid-cols-7 grid-rows-5 flex-1 divide-x divide-y divide-gray-100">
                        
                        {/* Empty Slots (Previous Month) */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-gray-50/30"></div>
                        ))}

                        {/* Actual Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dayTasks = getTasksForDay(day);
                            const isCurrentDay = isToday(day);

                            return (
                                <div key={day} className={`relative p-2 transition-colors hover:bg-gray-50 group flex flex-col min-h-[120px] ${isCurrentDay ? 'bg-blue-50/30' : ''}`}>
                                    
                                    {/* Date Number */}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`
                                            w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-all
                                            ${isCurrentDay 
                                                ? 'bg-blue-600 text-white shadow-md scale-110' 
                                                : 'text-gray-700 group-hover:bg-gray-200'}
                                        `}>
                                            {day}
                                        </span>
                                        {dayTasks.length > 0 && (
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded-full">
                                                {dayTasks.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Tasks List */}
                                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1">
                                        {dayTasks.map((task) => {
                                            // Get visual styles from constants
                                            const tagStyle = TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-600';
                                            // Clean the styling string to get just bg color for border
                                            const borderClass = tagStyle.split(' ')[0].replace('bg-', 'border-');

                                            return (
                                                <button
                                                    key={task.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }}
                                                    className={`
                                                        text-left w-full px-2 py-1.5 rounded-md text-[10px] font-bold truncate transition-all
                                                        border-l-2 shadow-sm hover:shadow-md hover:scale-[1.02] bg-white
                                                        ${borderClass.replace('100', '500')} 
                                                    `}
                                                >
                                                    <span className="text-gray-700">{task.title}</span>
                                                </button>
                                            );
                                        })}
                                        
                                        {/* "+ More" indicator if really crowded (optional visual cue) */}
                                        {/* Since we have overflow-auto now, this isn't strictly necessary but looks nice */}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Fill remaining cells to keep grid square-ish (optional) */}
                        {Array.from({ length: (35 - (daysInMonth + firstDay)) % 7 }).map((_, i) => (
                             <div key={`end-empty-${i}`} className="bg-gray-50/30"></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;