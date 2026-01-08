// src/components/views/CalendarView.jsx
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

// Import shared constants
import { TAG_COLORS } from '../../utils/constants';

const CalendarView = ({ tasks, setSelectedTaskId }) => {
    // --- State & Date Logic ---
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Calculate days in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Calculate which day of the week the month starts on (0=Sun, 1=Mon, etc.)
    const firstDay = new Date(year, month, 1).getDay();
    
    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    // --- Handlers ---
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Helper: Find tasks active on a specific day
    const getTasksForDay = (day) => {
        const currentDayDate = new Date(year, month, day);
        currentDayDate.setHours(0, 0, 0, 0);

        return tasks.filter(task => {
            if (!task.startDate || !task.deadline) return false;
            
            const start = new Date(task.startDate);
            const end = new Date(task.deadline);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            
            // Check if the current day falls within the task's range
            return currentDayDate >= start && currentDayDate <= end;
        });
    };

    // --- Render ---
    return (
        <div className="flex flex-col h-full w-full bg-gray-50">
            {/* Header / Navigation */}
            <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CalendarIcon className="text-blue-600" />
                    Calendar
                </h2>
                <div className="flex gap-2 items-center">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ChevronLeft />
                    </button>
                    <h3 className="text-lg font-bold text-gray-700 min-w-[150px] text-center">
                        {monthNames[month]} {year}
                    </h3>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ChevronRight />
                    </button>
                </div>
            </header>

            {/* Calendar Grid */}
            <div className="p-6 h-full flex-1 overflow-y-auto">
                <div className="border rounded-xl overflow-hidden shadow-sm bg-white h-full flex flex-col">
                    
                    {/* Days Header (Sun, Mon, Tue...) */}
                    <div className="grid grid-cols-7 bg-gray-50 border-b">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="p-3 text-center text-sm font-bold text-gray-500 uppercase tracking-wide">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Cells */}
                    <div className="grid grid-cols-7 auto-rows-fr h-full bg-gray-50 gap-px border-gray-200">
                        {/* Empty cells for days before the 1st of the month */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-white min-h-[100px]"></div>
                        ))}

                        {/* Actual Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dayTasks = getTasksForDay(day);

                            return (
                                <div key={day} className="bg-white p-2 min-h-[100px] hover:bg-gray-50 transition relative flex flex-col group">
                                    <div className="text-sm font-medium mb-1 text-gray-700 group-hover:text-blue-600">
                                        {day}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                        {dayTasks.map(task => {
                                            // Get the background color class based on the tag
                                            // If tag is not found, default to gray. 
                                            // Note: TAG_COLORS strings look like "bg-pink-100 text-pink-600"
                                            // We extract just the background part for the calendar chip.
                                            const colorString = TAG_COLORS[task.tag];
                                            const bgClass = colorString 
                                                ? colorString.split(' ')[0] 
                                                : 'bg-gray-100';

                                            return (
                                                <div 
                                                    key={task.id} 
                                                    onClick={() => setSelectedTaskId(task.id)}
                                                    className={`text-[10px] truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition ${bgClass} text-gray-700 font-medium`}
                                                    title={task.title}
                                                >
                                                    {task.title}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;