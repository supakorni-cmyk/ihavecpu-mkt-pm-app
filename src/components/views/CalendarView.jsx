// src/components/views/CalendarView.jsx
import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  List,
  Grid,
  Maximize
} from 'lucide-react';
import { TAG_COLORS } from '../../utils/constants';

const CalendarView = ({ tasks, setSelectedTaskId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
    
    // --- 1. DATA FILTERING ---
    // Filter out 'canceled' tasks globally for the calendar
    const activeTasks = useMemo(() => {
        return tasks.filter(t => t.status !== 'canceled');
    }, [tasks]);

    // --- 2. DATE HELPERS ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Check if a specific day is "Today"
    const isToday = (dateObj) => {
        const today = new Date();
        return dateObj.getDate() === today.getDate() && 
               dateObj.getMonth() === today.getMonth() && 
               dateObj.getFullYear() === today.getFullYear();
    };

    // Get tasks for a specific JS Date object
    const getTasksForDate = (dateObj) => {
        const targetTime = dateObj.getTime();
        // Normalize comparison to "Start of Day"
        const startOfDay = new Date(targetTime); startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(targetTime); endOfDay.setHours(23,59,59,999);

        return activeTasks.filter(task => {
            if (!task.startDate && !task.deadline) return false;
            // Use startDate if present, else deadline
            const d = new Date(task.startDate || task.deadline);
            return d >= startOfDay && d <= endOfDay;
        });
    };

    // --- 3. NAVIGATION HANDLERS ---
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
    };

    const goToToday = () => setCurrentDate(new Date());

    // --- 4. SUB-COMPONENTS FOR VIEWS ---

    // A. Month View Grid
    const renderMonthView = () => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
        
        return (
            <div className="flex-1 flex flex-col h-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                    {dayNames.map((day, i) => (
                        <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                {/* Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-gray-100 overflow-y-auto">
                    {/* Empty Slots */}
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-gray-50/20"></div>
                    ))}
                    
                    {/* Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const currentDayDate = new Date(year, month, dayNum);
                        const dayTasks = getTasksForDate(currentDayDate);
                        const todayClass = isToday(currentDayDate) ? 'bg-blue-50/50' : '';

                        return (
                            <div key={dayNum} className={`p-2 min-h-[100px] hover:bg-gray-50 transition-colors group flex flex-col ${todayClass}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${isToday(currentDayDate) ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}>
                                        {dayNum}
                                    </span>
                                </div>
                                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                    {dayTasks.map(task => (
                                        <TaskPill key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // B. Week View Grid (7 Columns)
    const renderWeekView = () => {
        // Find Sunday of current week
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day; // adjust when day is sunday
        startOfWeek.setDate(diff);

        // Generate 7 days
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
                            <div key={i} className={`flex flex-col h-full ${isCurrent ? 'bg-blue-50/30' : 'bg-white'}`}>
                                {/* Header */}
                                <div className={`p-3 text-center border-b border-gray-100 ${isCurrent ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                    <p className={`text-xs font-bold uppercase mb-1 ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'}`}>
                                        {dayNames[dateObj.getDay()]}
                                    </p>
                                    <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full text-lg font-black ${isCurrent ? 'bg-blue-600 text-white shadow' : 'text-gray-800'}`}>
                                        {dateObj.getDate()}
                                    </div>
                                </div>
                                {/* Tasks */}
                                <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar">
                                    {dayTasks.map(task => (
                                        <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />
                                    ))}
                                    {dayTasks.length === 0 && (
                                        <div className="h-full flex items-center justify-center">
                                            <p className="text-[10px] text-gray-300 font-medium rotate-90 whitespace-nowrap">No Tasks</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // C. Day View List
    const renderDayView = () => {
        const dayTasks = getTasksForDate(currentDate);
        
        return (
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                        <span className="text-xs font-bold uppercase">{dayNames[currentDate.getDay()]}</span>
                        <span className="text-3xl font-black leading-none">{currentDate.getDate()}</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                        <p className="text-gray-500">{dayTasks.length} tasks scheduled</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/50">
                    {dayTasks.length > 0 ? (
                        dayTasks.map(task => (
                            <TaskRow key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <CalendarIcon size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">No tasks for this day.</p>
                            <button onClick={() => setViewMode('month')} className="mt-2 text-sm text-blue-500 hover:underline">Back to Month View</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- 5. RENDER MAIN ---
    return (
        <div className="flex flex-col h-full w-full bg-gray-50 font-sans">
            {/* Header Toolbar */}
            <header className="px-8 py-5 border-b border-gray-200 bg-white flex flex-col md:flex-row justify-between items-center shadow-sm z-20 gap-4">
                
                {/* Left: Month/Date Label */}
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                        {viewMode === 'day' 
                            ? `${currentDate.getDate()} ${monthNames[month]}` 
                            : monthNames[month]
                        } 
                        <span className="text-gray-400 font-light">{year}</span>
                    </h2>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                        <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-gray-600">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition">
                            Today
                        </button>
                        <button onClick={() => navigate('next')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-gray-600">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Right: View Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['month', 'week', 'day'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                                viewMode === mode 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && renderDayView()}
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

// 1. Small Pill (Month View)
const TaskPill = ({ task, onClick }) => {
    const tagStyle = TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-600';
    const borderClass = tagStyle.split(' ')[0].replace('bg-', 'border-'); // Extract bg color for border

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                text-left w-full px-2 py-1 rounded text-[10px] font-bold truncate transition-all
                border-l-2 shadow-sm hover:shadow-md hover:scale-[1.01] bg-white
                ${borderClass.replace('100', '500')} text-gray-700
            `}
        >
            {task.title}
        </button>
    );
};

// 2. Medium Card (Week View)
const TaskCard = ({ task, onClick }) => {
    const tagStyle = TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-600';
    
    return (
        <div 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
            <div className="flex items-center gap-1 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${tagStyle.replace('text-', 'bg-').split(' ')[1]}`}></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase truncate">{task.tag}</span>
            </div>
            <h4 className="font-bold text-xs text-gray-800 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600">
                {task.title}
            </h4>
            {task.location && (
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <MapPin size={10} />
                    <span className="truncate">{task.location}</span>
                </div>
            )}
        </div>
    );
};

// 3. Large Row (Day View)
const TaskRow = ({ task, onClick }) => {
    const tagStyle = TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-600';

    return (
        <div 
            onClick={onClick}
            className="flex items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
            {/* Time / Icon */}
            <div className="w-16 flex flex-col items-center justify-center text-gray-400 border-r border-gray-100 pr-4 mr-4">
                <Clock size={20} className="mb-1 text-blue-500" />
                <span className="text-xs font-medium">All Day</span>
            </div>

            {/* Content */}
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tagStyle}`}>
                        {task.tag}
                    </span>
                    {task.location && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            <MapPin size={10} /> {task.location}
                        </span>
                    )}
                </div>
                <h4 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {task.title}
                </h4>
                {task.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                )}
            </div>

            {/* Action */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                    <Maximize size={18} />
                </div>
            </div>
        </div>
    );
};

export default CalendarView;