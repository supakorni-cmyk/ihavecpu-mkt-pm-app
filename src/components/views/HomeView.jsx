// src/components/views/HomeView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Calendar, CheckCircle2, Clock, ArrowRight, User, 
  Briefcase, Bell, CloudRain, Sun, Droplets, Wind, MapPin, 
  Layers, ListTodo, ClipboardList, CheckSquare
} from 'lucide-react';
import { formatDate, TAG_COLORS } from '../../utils/constants';

import TaskDetailModal from '../modals/TaskDetailModal';
import EditTaskModal from '../modals/EditTaskModal';

const SYSTEM_AVATARS = { 
  panarin: '/avatars/bank.jpg', 
  jittikorn: '/avatars/pae.jpg', 
  sutharat:'/avatars/ahzumi.jpg', 
  supakorn: '/avatars/boom.jpg', 
  sophisa: '/avatars/yui.jpg', 
  somruk: '/avatars/somruk.png', 
  nichapa: '/avatars/mod.jpg' 
};

const INITIAL_TEAM = [
    { id: 6, name: 'แบงค์กี้', email: 'panarin.b@ihavecpu.com', role: 'Asst.CEO', avatar: SYSTEM_AVATARS.panarin}, 
    { id: 1, name: 'เป้ ไข่หมุน', email: 'jittikorn.m@ihavecpu.com', role: 'Marketing Manager', avatar: SYSTEM_AVATARS.jittikorn },
    { id: 7, name: 'AHZUMI', email: 'sutharat@ihavecpu.com', role:'Online Business Manager', avatar: SYSTEM_AVATARS.sutharat},
    { id: 2, name: 'SPARKIEZZ', email: 'supakorn.i@ihavecpu.com', role: 'Assistant Manager', avatar: SYSTEM_AVATARS.supakorn },
    { id: 3, name: 'อียุ้ยคนสวย', email: 'sophisa.p@ihavecpu.com', role: 'Assistant Manager', avatar: SYSTEM_AVATARS.sophisa },
    { id: 4, name: 'สมรักษ์ คำสิงห์', email: 'somruk.m@ihavecpu.com', role: 'Graphic Head', avatar: SYSTEM_AVATARS.somruk },
    { id: 5, name: 'มดตะนอยร้อยแรงม้า', email: 'nichapa.w@ihavecpu.com', role: 'Marketing Coordinator', avatar: SYSTEM_AVATARS.nichapa}
];

const HomeView = ({ tasks, currentUser, notifications = [], markNotificationRead, clearAllNotifications, users = [], onUpdateTask, onDeleteTask }) => {
  const [team] = useState(INITIAL_TEAM);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState(null); 
  const [editingTask, setEditingTask] = useState(null);   

  const [weatherData, setWeatherData] = useState(null);
  const [locationName, setLocationName] = useState("Locating..."); 

  // --- STATS LOGIC ---
  const completedTasks = tasks.filter(t => { const s = (t.status || '').toLowerCase(); return s === 'completed' || s === 'done'; }).length;
  const pendingTasks = tasks.filter(t => { const s = (t.status || '').toLowerCase(); return s !== 'completed' && s !== 'done' && s !== 'canceled'; }).length;

  const upcomingEvents = tasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      if (s === 'canceled' || s === 'completed' || s === 'done') return false;
      if (t.tag === 'Event' || t.tag === 'Guest Speaker') return true;
      if (Array.isArray(t.tags) && (t.tags.includes('Event') || t.tags.includes('Guest Speaker'))) return true;
      return false;
  });

  upcomingEvents.sort((a, b) => new Date(a.startDate || a.deadline || 0) - new Date(b.startDate || b.deadline || 0));

  const coreMember = team.find(member => member.email === currentUser?.email);
  const displayAvatar = coreMember?.avatar || currentUser?.photoURL || 'https://ui-avatars.com/api/?background=random&color=fff&name=' + (currentUser?.email || 'User');
  const displayName = coreMember?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest';

  const coreEmails = team.map(m => m.email.toLowerCase());
  const cutePeople = users.filter(u => u.email && !coreEmails.includes(u.email.toLowerCase()));

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // --- 🟢 ADVANCED DATA ENGINE: PROCESSING NEW WORKSPACE SECTIONS ---
  
  // 1. Things to Do (Status: todo or on-process) Sorted chronologically by deadline date
  const todoAndOnProcessTasks = useMemo(() => {
    return tasks.filter(t => {
        const s = (t.status || '').toLowerCase();
        return s === 'todo' || s === 'on-process';
    }).sort((a, b) => {
        const dateA = new Date(a.deadline || a.startDate || '9999-12-31T23:59:59.999Z');
        const dateB = new Date(b.deadline || b.startDate || '9999-12-31T23:59:59.999Z');
        return dateA - dateB;
    });
  }, [tasks]);

  // 2. Task Category Breakdown Aggregator
  const categoriesBreakdown = useMemo(() => {
    const breakdown = {};
    tasks.filter(t => t.status !== 'canceled').forEach(t => {
        const categoryName = t.tag || 'General';
        if (!breakdown[categoryName]) {
            breakdown[categoryName] = { total: 0, todo: 0, onProcess: 0, review: 0, done: 0 };
        }
        breakdown[categoryName].total++;
        const s = (t.status || '').toLowerCase();
        if (s === 'todo') breakdown[categoryName].todo++;
        else if (s === 'on-process') breakdown[categoryName].onProcess++;
        else if (s === 'review') breakdown[categoryName].review++;
        else if (s === 'done' || s === 'completed') breakdown[categoryName].done++;
    });
    return Object.entries(breakdown).map(([name, stats]) => ({ name, ...stats }));
  }, [tasks]);

  // 3. Team Roster Workload Pipeline Map
  const teamAssignedWorkload = useMemo(() => {
    return team.map(member => {
        const pendingLeaderTasks = tasks.filter(t => {
            const s = (t.status || '').toLowerCase();
            const isActive = s !== 'completed' && s !== 'done' && s !== 'canceled';
            return isActive && t.taskLeader === member.name;
        }).sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));

        return {
            ...member,
            assignedTasks: pendingLeaderTasks
        };
    });
  }, [tasks, team]);

  // --- WEATHER FORECAST FETCH LIFE-CYCLE ---
  useEffect(() => {
      const fetchWeather = async (lat, lon, locName) => {
          try {
              const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
              const weatherJson = await weatherRes.json();
              if (weatherJson && weatherJson.current_weather) setWeatherData(weatherJson.current_weather);
              setLocationName(locName);
          } catch (error) { setLocationName("Unknown Location"); }
      };

      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              async (position) => {
                  const lat = position.coords.latitude; const lon = position.coords.longitude;
                  try {
                      const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                      const geoData = await geoRes.json();
                      fetchWeather(lat, lon, geoData.city || geoData.locality || "Current Location");
                  } catch (e) { fetchWeather(lat, lon, "Current Location"); }
              },
              () => fetchWeather(14.0208, 100.5250, "Pathum Thani"),
              { timeout: 10000 }
          );
      } else { fetchWeather(14.0208, 100.5250, "Pathum Thani"); }
  }, []);

  const getWeatherIcon = (code) => {
      if (code === 0) return <Sun className="text-yellow-500" size={32} />; 
      if (code > 0 && code < 4) return <CloudRain className="text-gray-400" size={32} />; 
      if (code >= 51 && code <= 67) return <Droplets className="text-blue-400" size={32} />; 
      return <CloudRain className="text-gray-500" size={32} />; 
  };

  const getWeatherCondition = (code) => {
      if (code === 0) return "Clear Sky";
      if (code === 1 || code === 2 || code === 3) return "Partly Cloudy";
      if (code >= 51 && code <= 67) return "Raining";
      return "Cloudy";
  };

  const getTagTheme = (task) => {
      const tag = (task.tags && task.tags.length > 0) ? task.tags[0] : task.tag;
      if (!tag) return 'bg-gray-100 text-gray-500';

      const theme = (TAG_COLORS[tag] || '').toLowerCase();
      const name = tag.toLowerCase();

      if (theme.includes('blue')) return 'bg-blue-100 text-blue-600';
      if (theme.includes('purple')) return 'bg-purple-100 text-purple-600';
      if (theme.includes('green') || theme.includes('emerald')) return 'bg-green-100 text-green-600';
      if (theme.includes('red') || theme.includes('rose')) return 'bg-red-100 text-red-600';
      if (theme.includes('yellow') || theme.includes('amber')) return 'bg-yellow-100 text-yellow-600';
      if (theme.includes('orange')) return 'bg-orange-100 text-orange-600';
      if (theme.includes('pink')) return 'bg-pink-100 text-pink-600';
      if (theme.includes('indigo')) return 'bg-indigo-100 text-indigo-600';

      if (name.includes('plan')) return 'bg-blue-100 text-blue-600';
      if (name.includes('project')) return 'bg-purple-100 text-purple-600';
      if (name.includes('review')) return 'bg-pink-100 text-pink-600';
      if (name.includes('event')) return 'bg-orange-100 text-orange-600';
      if (name.includes('guest') || name.includes('speaker')) return 'bg-emerald-100 text-emerald-600';
      if (name.includes('meet')) return 'bg-yellow-100 text-yellow-600';

      return 'bg-blue-50 text-blue-600';
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 p-8 font-sans relative">
      {/* --- WELCOME HEADER --- */}
      <div className="mb-10 flex justify-between items-start">
        <div className="flex items-center gap-5">
            <div className="relative"><img src={displayAvatar} alt="Profile" className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover bg-white"/><div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div></div>
            <div><h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">Welcome Back, {displayName.split(' ')[0]}! <span className="text-2xl animate-pulse">👋</span></h1><p className="text-gray-500 mt-1 font-medium">Wish you have a good {today}</p></div>
        </div>
        
        {/* NOTIFICATION BELL */}
        <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-3 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-100 transition relative"><Bell size={24} className="text-gray-600" />{unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm border border-white">{unreadCount}</span>}</button>
            {isNotifOpen && (
                <div className="absolute right-0 top-14 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center"><h4 className="font-bold text-gray-700 text-sm">Notifications</h4>{notifications.length > 0 && <button onClick={clearAllNotifications} className="text-[10px] text-red-500 hover:underline">Clear All</button>}</div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? <div className="p-6 text-center text-gray-400 text-xs">No new notifications</div> : notifications.map(n => (
                            <div key={n.id} className={`p-3 border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer flex gap-3 ${!n.isRead ? 'bg-blue-50/30' : ''}`} onClick={() => markNotificationRead(n.id)}>
                                <div className="mt-1"><div className={`w-2 h-2 rounded-full ${!n.isRead ? 'bg-blue-500' : 'bg-gray-300'}`}></div></div>
                                <div className="flex-1"><p className={`text-xs ${!n.isRead ? 'font-bold text-gray-800' : 'text-gray-500'}`}>{n.title}</p><p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- THE TEAM --- */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><User className="text-blue-600" size={20}/> THE TEAM</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {team.map(member => (
                <div key={member.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${member.email === currentUser?.email ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'} flex flex-col items-center justify-center text-center hover:shadow-md transition group`}>
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-sm relative"><img src={member.avatar} alt={member.name} className="w-full h-full object-cover transition transform group-hover:scale-110 duration-500" /></div>
                    <h4 className="font-bold text-gray-800">{member.name}</h4><span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full mt-1 mb-1">{member.role}</span><span className="text-[10px] text-gray-400 truncate w-full px-2">{member.email}</span>
                </div>
            ))}
        </div>
      </div>

      {/* --- WIDGETS: WEATHER --- */}
      <div className="grid grid-cols-1 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-sm flex justify-between items-center relative overflow-hidden group h-full max-w-2xl">
            <div className="absolute -right-6 -top-6 text-white opacity-50 group-hover:scale-110 transition-transform duration-700">{weatherData ? getWeatherIcon(weatherData.weathercode) : <CloudRain size={120} />}</div>
            <div className="relative z-10 flex flex-col h-full justify-center"><h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12}/> {locationName}</h4><div className="text-4xl font-black text-gray-800 tracking-tighter">{weatherData ? `${weatherData.temperature}°C` : '--°C'}</div><p className="text-sm font-medium text-gray-600 mt-1">{weatherData ? getWeatherCondition(weatherData.weathercode) : 'Loading...'}</p></div>
            <div className="relative z-10 text-right space-y-2 self-end">
                {weatherData && (
                    <><div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-white/60 px-3 py-1.5 rounded-lg shadow-sm border border-white"><Wind size={14} className="text-blue-400"/> {weatherData.windspeed} km/h</div><div className="text-[10px] text-gray-400">Updated: {new Date(weatherData.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></>
                )}
            </div>
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200"><div className="flex justify-between items-start mb-4"><div className="p-2 bg-indigo-500/50 rounded-lg"><Briefcase size={24}/></div><span className="text-xs font-bold bg-indigo-500/50 px-2 py-1 rounded">Active</span></div><div className="text-4xl font-black mb-1">{pendingTasks}</div><div className="text-indigo-100 text-sm font-medium">Pending Tasks</div></div>
        <div className="bg-emerald-500 text-white p-6 rounded-2xl shadow-lg shadow-emerald-200"><div className="flex justify-between items-start mb-4"><div className="p-2 bg-emerald-400/50 rounded-lg"><CheckCircle2 size={24}/></div><span className="text-xs font-bold bg-emerald-400/50 px-2 py-1 rounded">Done</span></div><div className="text-4xl font-black mb-1">{completedTasks}</div><div className="text-emerald-50 text-sm font-medium">Completed Tasks</div></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-2 bg-pink-50 text-pink-500 rounded-lg"><Heart size={24}/></div></div><div className="text-4xl font-black mb-1 text-gray-800">{upcomingEvents.length}</div><div className="text-gray-400 text-sm font-medium">Upcoming Events</div></div>
      </div>

      {/* --- 🟢 NEW WORKSPACE COMPONENT 1: THINGS TO DO --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <ListTodo className="text-indigo-600" size={20}/> Things to Do (To Do / On Process)
        </h3>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100 font-bold">
                    <tr>
                        <th className="px-6 py-4">Task</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Leader</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Deadline</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {todoAndOnProcessTasks.length > 0 ? todoAndOnProcessTasks.map(task => (
                        <tr 
                            key={task.id} 
                            onClick={() => setSelectedTask(task)}
                            className="hover:bg-indigo-50/20 transition-colors cursor-pointer group"
                        >
                            <td className="px-6 py-4 font-bold text-gray-800 max-w-[200px] truncate">{task.title}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getTagTheme(task)}`}>
                                    {task.tag || 'General'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 font-medium">{task.taskLeader || 'Unassigned'}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase ${
                                    task.status === 'on-process' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                                }`}>
                                    {task.status || 'todo'}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-gray-500 font-bold">
                                {task.deadline ? formatDate(task.deadline) : 'No time'}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">No tasks left in To Do or On Process!</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- 🟢 NEW WORKSPACE COMPONENT 2: TASK CATEGORY MATRIX ANALYTICS --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <ClipboardList className="text-emerald-600" size={20}/> Task Categories Distribution Matrix
        </h3>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100 font-bold">
                    <tr>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4 text-center">To Do</th>
                        <th className="px-6 py-4 text-center">On Process</th>
                        <th className="px-6 py-4 text-center">Review</th>
                        <th className="px-6 py-4 text-center">Completed</th>
                        <th className="px-6 py-4 text-center bg-gray-100/50">Total Vol</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {categoriesBreakdown.length > 0 ? categoriesBreakdown.map((cat, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-gray-700">{cat.name}</td>
                            <td className="px-6 py-4 text-center text-gray-500 font-medium">{cat.todo}</td>
                            <td className="px-6 py-4 text-center text-amber-600 font-bold">{cat.onProcess}</td>
                            <td className="px-6 py-4 text-center text-purple-600 font-bold">{cat.review}</td>
                            <td className="px-6 py-4 text-center text-green-600 font-bold">{cat.done}</td>
                            <td className="px-6 py-4 text-center font-black bg-gray-50/50 text-gray-900">{cat.total}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">No project data registered.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- 🟢 NEW WORKSPACE COMPONENT 3: OPERATION WORKLOAD PIPELINE MAP --- */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <CheckSquare className="text-blue-600" size={20}/> Team Action Assignments
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teamAssignedWorkload.map(member => (
                <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[320px]">
                    <div className="flex items-center gap-4 border-b border-gray-50 pb-3 shrink-0">
                        <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"/>
                        <div>
                            <h4 className="font-bold text-gray-800 text-sm leading-tight">{member.name}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">{member.role}</p>
                        </div>
                        <span className="ml-auto bg-blue-50 text-blue-600 text-xs font-black px-2.5 py-1 rounded-full">
                            {member.assignedTasks.length} Active
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-2">
                        {member.assignedTasks.length > 0 ? member.assignedTasks.map(task => (
                            <div 
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="p-3 bg-gray-50 hover:bg-indigo-50/30 rounded-xl border border-gray-100/70 flex justify-between items-center group cursor-pointer transition-all"
                            >
                                <div className="min-w-0 flex-1 pr-2">
                                    <p className="text-xs font-bold text-gray-700 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">
                                        {task.deadline ? `⏳ Due: ${new Date(task.deadline).toLocaleDateString()}` : 'No deadline'}
                                    </p>
                                </div>
                                <span className={`text-[9px] font-black tracking-wider uppercase border px-2 py-0.5 rounded ${
                                    task.status === 'on-process' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}>
                                    {task.status || 'todo'}
                                </span>
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center text-center text-gray-300 text-xs italic">
                                All tasks completed! Clear pipeline 🌟
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* --- UPCOMING EVENTS --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex-1 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Calendar className="text-orange-500" size={20}/> Upcoming Schedule</h3>
        <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5).map(task => (
                <div key={task.id} onClick={() => setSelectedTask(task)} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition border border-gray-50 hover:border-gray-200 group cursor-pointer gap-4">
                    <div className="flex items-center flex-1 min-w-0">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 mr-4 ${getTagTheme(task)}`}>
                            <span className="text-xs uppercase">{new Date(task.startDate || task.deadline).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-xl leading-none">{new Date(task.startDate || task.deadline).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 truncate mb-1">{task.title}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1 font-semibold text-gray-600"><User size={12} className="text-gray-400"/> Task Leader: <span className="text-gray-900 font-bold">{task.taskLeader || 'Unassigned'}</span></span>
                                <span className="hidden sm:inline text-gray-300">|</span>
                                <span className="flex items-center gap-1 font-semibold text-gray-600"><Clock size={12} className="text-gray-400"/> Deadline: <span className="text-gray-900 font-bold">{task.deadline ? formatDate(task.deadline) : 'No time'}</span></span>
                                {task.location && (
                                    <>
                                        <span className="hidden sm:inline text-gray-300">|</span>
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 truncate max-w-[150px] font-medium">{task.location}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md">
                            Status: {task.status || 'todo'}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition text-gray-300"><ArrowRight size={20} /></div>
                    </div>
                </div>
            )) : (
                <div className="text-center py-10 text-gray-400"><Calendar size={48} className="mx-auto mb-3 opacity-20"/><p>No upcoming events scheduled.</p></div>
            )}
        </div>
      </div>

      {/* --- OTHER USERS --- */}
      {cutePeople.length > 0 && (
          <div className="mt-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Heart className="text-pink-500 fill-pink-500 animate-pulse" size={20}/> คนน่ารัก ({cutePeople.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {cutePeople.map((user, idx) => (
                    <div key={user.id || idx} className={`bg-white p-6 rounded-2xl shadow-sm border ${user.email === currentUser?.email ? 'border-pink-500 ring-2 ring-pink-100' : 'border-pink-100'} flex flex-col items-center justify-center text-center hover:border-pink-300 hover:shadow-md transition group`}>
                        <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-sm relative">{user.photoURL || user.avatar ? <img src={user.photoURL || user.avatar} alt={user.name} className="w-full h-full object-cover transition transform group-hover:scale-110 duration-500" /> : <span className="text-2xl font-bold text-pink-400">{(user.name || user.email || '?').charAt(0).toUpperCase()}</span>}</div>
                        <h4 className="font-bold text-gray-800">{user.name || user.email?.split('@')[0]}</h4><span className="text-xs text-pink-500 font-medium bg-pink-50 px-2 py-0.5 rounded-full mt-1 mb-1">{user.role || 'Guest'}</span><span className="text-[10px] text-gray-400 truncate w-full px-2">{user.email}</span>
                    </div>
                ))}
            </div>
          </div>
      )}

      {selectedTask && <TaskDetailModal task={selectedTask} tasks={tasks} onClose={() => setSelectedTask(null)} onEdit={() => { setEditingTask(selectedTask); setSelectedTask(null); }} onDelete={() => { if(onDeleteTask) onDeleteTask(selectedTask.id); setSelectedTask(null); }} onSelectTask={(id) => { const t = tasks.find(x => x.id === id); if(t) setSelectedTask(t); }} />}
      {editingTask && <EditTaskModal task={editingTask} tasks={tasks} onClose={() => setEditingTask(null)} onUpdate={(updates) => { onUpdateTask(editingTask.id, updates); setEditingTask(null); }} onDelete={() => { if(onDeleteTask) onDeleteTask(editingTask.id); setEditingTask(null); }} onOpenRequirement={() => {}} />}
    </div>
  );
};

export default HomeView;