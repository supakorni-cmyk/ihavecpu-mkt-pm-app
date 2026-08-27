// src/components/views/HomeView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Calendar, CheckCircle2, Clock, ArrowRight, User, 
  Briefcase, Bell, CloudRain, Sun, Droplets, Wind, MapPin, 
  Layers, ListTodo, ClipboardList, CheckSquare,
  BarChart3, Table as TableIcon, PieChart as PieChartIcon
} from 'lucide-react';

import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';

import { formatDate, TAG_COLORS } from '../../utils/constants';
import TaskDetailModal from '../modals/TaskDetailModal';
import EditTaskModal from '../modals/EditTaskModal';

const SYSTEM_AVATARS = { 
  panarin: '/avatars/bank.jpg', 
  jittikorn: '/avatars/pae.jpg', 
  sutharat:'/avatars/ahzumi.jpg', 
  supakorn: '/avatars/boom.jpg', 
  sophisa: '/avatars/yui.jpg', 
  somruk: '/avatars/somruk.jpg', 
  nichapa: '/avatars/mod.jpg' 
};

const INITIAL_TEAM = [
    { id: 6, name: 'Panarin Boonsri', email: 'panarin.b@ihavecpu.com', role: 'Asst.CEO', avatar: SYSTEM_AVATARS.panarin}, 
    { id: 1, name: 'Jittikorn Maneekum', email: 'jittikorn.m@ihavecpu.com', role: 'Advertising', avatar: SYSTEM_AVATARS.jittikorn },
    { id: 7, name: 'Sutharat Suthanithee', email: 'sutharat@ihavecpu.com', role:'Online Business Manager', avatar: SYSTEM_AVATARS.sutharat},
    { id: 2, name: 'Supakorn Intayanon', email: 'supakorn.i@ihavecpu.com', role: 'Assistant Manager', avatar: SYSTEM_AVATARS.supakorn },
    { id: 3, name: 'Sophisa Phromduang', email: 'sophisa.p@ihavecpu.com', role: 'Assistant Manager', avatar: SYSTEM_AVATARS.sophisa },
    { id: 4, name: 'Somruk Mangsa', email: 'somruk.m@ihavecpu.com', role: 'Graphic Head', avatar: SYSTEM_AVATARS.somruk },
    { id: 5, name: 'Nichapa Wangsuk', email: 'nichapa.w@ihavecpu.com', role: 'Marketing Coordinator', avatar: SYSTEM_AVATARS.nichapa}
];

// Fallback color palette if a tag has no mapped color
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];

const HomeView = ({ tasks, currentUser, notifications = [], markNotificationRead, clearAllNotifications, users = [], onUpdateTask, onDeleteTask }) => {
  const [team] = useState(INITIAL_TEAM);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState(null); 
  const [editingTask, setEditingTask] = useState(null);   

  const [weatherData, setWeatherData] = useState(null);
  const [locationName, setLocationName] = useState("Locating..."); 

  const [matrixView, setMatrixView] = useState('chart'); 

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

  // --- DATA ENGINE ---
  
  // 1. Tasks Grouped By Category (CASE INSENSITIVE)
  const activeTasksByCategory = useMemo(() => {
    const grouped = {};
    const activeTasks = tasks.filter(t => {
        const s = (t.status || '').toLowerCase();
        return s !== 'canceled' && s !== 'done' && s !== 'completed';
    });

    activeTasks.forEach(t => {
        const cat = (t.tag || 'General').trim().toUpperCase();
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(t);
    });

    Object.keys(grouped).forEach(cat => {
        grouped[cat].sort((a, b) => {
            const dateA = new Date(a.deadline || a.startDate || '9999-12-31T23:59:59.999Z');
            const dateB = new Date(b.deadline || b.startDate || '9999-12-31T23:59:59.999Z');
            return dateA - dateB;
        });
    });

    return grouped;
  }, [tasks]);

  // 2. Category Breakdown Aggregator (CASE INSENSITIVE)
  const categoriesBreakdown = useMemo(() => {
    const breakdown = {};
    tasks.filter(t => t.status !== 'canceled').forEach(t => {
        const categoryName = (t.tag || 'General').trim().toUpperCase();
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
    return Object.entries(breakdown).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.total - a.total);
  }, [tasks]);

  // 3. Team Roster Pipeline
  const teamAssignedWorkload = useMemo(() => {
    return team.map(member => {
        const pendingLeaderTasks = tasks.filter(t => {
            const s = (t.status || '').toLowerCase();
            const isActive = s !== 'completed' && s !== 'done' && s !== 'canceled';
            return isActive && t.taskLeader === member.name;
        }).sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));

        return { ...member, assignedTasks: pendingLeaderTasks };
    });
  }, [tasks, team]);

//   // --- WEATHER FORECAST ---
//   useEffect(() => {
//       const fetchWeather = async (lat, lon, locName) => {
//           try {
//               const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
//               const weatherJson = await weatherRes.json();
//               if (weatherJson && weatherJson.current_weather) setWeatherData(weatherJson.current_weather);
//               setLocationName(locName);
//           } catch (error) { setLocationName("Unknown Location"); }
//       };

//       if ("geolocation" in navigator) {
//           navigator.geolocation.getCurrentPosition(
//               async (position) => {
//                   const lat = position.coords.latitude; const lon = position.coords.longitude;
//                   try {
//                       const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
//                       const geoData = await geoRes.json();
//                       fetchWeather(lat, lon, geoData.city || geoData.locality || "Current Location");
//                   } catch (e) { fetchWeather(lat, lon, "Current Location"); }
//               },
//               () => fetchWeather(14.0208, 100.5250, "Pathum Thani"),
//               { timeout: 10000 }
//           );
//       } else { fetchWeather(14.0208, 100.5250, "Pathum Thani"); }
//   }, []);

//   const getWeatherIcon = (code) => {
//       if (code === 0) return <Sun className="text-yellow-500" size={36} />; 
//       if (code > 0 && code < 4) return <CloudRain className="text-gray-400" size={36} />; 
//       if (code >= 51 && code <= 67) return <Droplets className="text-blue-400" size={36} />; 
//       return <CloudRain className="text-gray-500" size={36} />; 
//   };

//   const getWeatherCondition = (code) => {
//       if (code === 0) return "Clear Sky";
//       if (code === 1 || code === 2 || code === 3) return "Partly Cloudy";
//       if (code >= 51 && code <= 67) return "Raining";
//       return "Cloudy";
//   };

  // --- COLOR MAPPERS ---
  const getSafeTagStyle = (tagStr) => {
      if (!tagStr) return 'bg-gray-100 text-gray-500';
      const theme = (TAG_COLORS[tagStr] || '').toLowerCase();
      const name = tagStr.toLowerCase();

      if (theme.includes('blue') || name.includes('plan')) return 'bg-blue-100 text-blue-700';
      if (theme.includes('purple') || name.includes('project')) return 'bg-purple-100 text-purple-700';
      if (theme.includes('green') || theme.includes('emerald') || name.includes('guest') || name.includes('speaker')) return 'bg-emerald-100 text-emerald-700';
      if (theme.includes('red') || theme.includes('rose')) return 'bg-red-100 text-red-700';
      if (theme.includes('yellow') || theme.includes('amber') || name.includes('meet')) return 'bg-yellow-100 text-yellow-700';
      if (theme.includes('orange') || name.includes('event')) return 'bg-orange-100 text-orange-700';
      if (theme.includes('pink') || name.includes('review')) return 'bg-pink-100 text-pink-700';
      if (theme.includes('indigo')) return 'bg-indigo-100 text-indigo-700';

      return 'bg-gray-100 text-gray-600';
  };

  const getHexColorForTag = (tagStr, fallbackIndex) => {
      if (!tagStr) return PIE_COLORS[fallbackIndex % PIE_COLORS.length];
      const theme = (TAG_COLORS[tagStr] || '').toLowerCase();
      const name = tagStr.toLowerCase();

      if (theme.includes('blue') || name.includes('plan')) return '#3b82f6';
      if (theme.includes('purple') || name.includes('project')) return '#a855f7';
      if (theme.includes('green') || theme.includes('emerald') || name.includes('guest') || name.includes('speaker')) return '#10b981';
      if (theme.includes('red') || theme.includes('rose')) return '#ef4444';
      if (theme.includes('yellow') || theme.includes('amber') || name.includes('meet')) return '#f59e0b';
      if (theme.includes('orange') || name.includes('event')) return '#f97316';
      if (theme.includes('pink') || name.includes('review')) return '#ec4899';
      if (theme.includes('indigo')) return '#6366f1';

      return PIE_COLORS[fallbackIndex % PIE_COLORS.length];
  };

  const CustomPieTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
              <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 z-50 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: payload[0].color }}></span>
                      <p className="font-black text-gray-800 uppercase tracking-wider text-sm">{data.name}</p>
                  </div>
                  <div className="space-y-2 text-base">
                      <div className="flex justify-between items-center text-gray-500"><span>To Do:</span> <span className="font-bold text-gray-700">{data.todo}</span></div>
                      <div className="flex justify-between items-center text-amber-600"><span>On Process:</span> <span className="font-bold">{data.onProcess}</span></div>
                      <div className="flex justify-between items-center text-purple-600"><span>Review:</span> <span className="font-bold">{data.review}</span></div>
                      <div className="flex justify-between items-center text-green-600"><span>Completed:</span> <span className="font-bold">{data.done}</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-xl">
                      <span className="text-gray-500 font-bold uppercase tracking-wider text-sm">Total</span>
                      <span className="font-black text-indigo-600 text-xl leading-none">{data.total}</span>
                  </div>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 p-8 font-sans relative">
      <div className="mb-10 flex justify-between items-start">
        <div className="flex items-center gap-5">
            <div className="relative"><img src={displayAvatar} alt="Profile" className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-white"/><div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div></div>
            <div><h1 className="text-4xl font-black text-gray-800 flex items-center gap-2">Welcome Back, {displayName.split(' ')[0]}! <span className="text-3xl animate-pulse">👋</span></h1><p className="text-gray-500 mt-1 font-medium text-base">Wish you have a good {today}</p></div>
        </div>
        <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-3 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-100 transition relative"><Bell size={28} className="text-gray-600" />{unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm border border-white">{unreadCount}</span>}</button>
            {isNotifOpen && (
                <div className="absolute right-0 top-16 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center"><h4 className="font-bold text-gray-700 text-base">Notifications</h4>{notifications.length > 0 && <button onClick={clearAllNotifications} className="text-xs text-red-500 hover:underline">Clear All</button>}</div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">No new notifications</div> : notifications.map(n => (
                            <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer flex gap-3 ${!n.isRead ? 'bg-blue-50/30' : ''}`} onClick={() => markNotificationRead(n.id)}>
                                <div className="mt-1"><div className={`w-2.5 h-2.5 rounded-full ${!n.isRead ? 'bg-blue-500' : 'bg-gray-300'}`}></div></div>
                                <div className="flex-1"><p className={`text-sm ${!n.isRead ? 'font-bold text-gray-800' : 'text-gray-500'}`}>{n.title}</p><p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><User className="text-blue-600" size={24}/> THE TEAM</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {team.map(member => (
                <div key={member.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${member.email === currentUser?.email ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'} flex flex-col items-center justify-center text-center hover:shadow-md transition group`}>
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-sm relative"><img src={member.avatar} alt={member.name} className="w-full h-full object-cover transition transform group-hover:scale-110 duration-500" /></div>
                    <h4 className="font-bold text-gray-800 text-base">{member.name}</h4><span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full mt-2 mb-2">{member.role}</span><span className="text-xs text-gray-400 truncate w-full px-2">{member.email}</span>
                </div>
            ))}
        </div>
      </div>

      {/* <div className="grid grid-cols-1 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 shadow-sm flex justify-between items-center relative overflow-hidden group h-full max-w-2xl">
            <div className="absolute -right-6 -top-6 text-white opacity-50 group-hover:scale-110 transition-transform duration-700">{weatherData ? getWeatherIcon(weatherData.weathercode) : <CloudRain size={140} />}</div>
            <div className="relative z-10 flex flex-col h-full justify-center"><h4 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin size={16}/> {locationName}</h4><div className="text-5xl font-black text-gray-800 tracking-tighter">{weatherData ? `${weatherData.temperature}°C` : '--°C'}</div><p className="text-base font-medium text-gray-600 mt-2">{weatherData ? getWeatherCondition(weatherData.weathercode) : 'Loading...'}</p></div>
            <div className="relative z-10 text-right space-y-3 self-end">
                {weatherData && (
                    <><div className="flex items-center gap-2 text-sm font-bold text-gray-500 bg-white/60 px-4 py-2 rounded-lg shadow-sm border border-white"><Wind size={16} className="text-blue-400"/> {weatherData.windspeed} km/h</div><div className="text-xs text-gray-400">Updated: {new Date(weatherData.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></>
                )}
            </div>
        </div>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-lg shadow-indigo-200"><div className="flex justify-between items-start mb-4"><div className="p-3 bg-indigo-500/50 rounded-xl"><Briefcase size={28}/></div><span className="text-sm font-bold bg-indigo-500/50 px-3 py-1 rounded">Active</span></div><div className="text-5xl font-black mb-2">{pendingTasks}</div><div className="text-indigo-100 text-base font-medium">Pending Tasks</div></div>
        <div className="bg-emerald-500 text-white p-8 rounded-2xl shadow-lg shadow-emerald-200"><div className="flex justify-between items-start mb-4"><div className="p-3 bg-emerald-400/50 rounded-xl"><CheckCircle2 size={28}/></div><span className="text-sm font-bold bg-emerald-400/50 px-3 py-1 rounded">Done</span></div><div className="text-5xl font-black mb-2">{completedTasks}</div><div className="text-emerald-50 text-base font-medium">Completed Tasks</div></div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 bg-pink-50 text-pink-500 rounded-xl"><Heart size={28}/></div></div><div className="text-5xl font-black mb-2 text-gray-800">{upcomingEvents.length}</div><div className="text-gray-400 text-base font-medium">Upcoming Events</div></div>
      </div>

      {/* --- 🟢 TASK CATEGORY MATRIX INTERACTIVE PIE CHART --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-gray-100 pb-4">
            <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <PieChartIcon className="text-emerald-600" size={24}/> Task Categories Distribution
                </h3>
                <p className="text-sm text-gray-500 mt-1 font-medium">Visual breakdown of your active project categories.</p>
            </div>
            <div className="flex bg-gray-100 p-1.5 rounded-xl w-fit">
                <button onClick={() => setMatrixView('chart')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${matrixView === 'chart' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <PieChartIcon size={18}/> Chart
                </button>
                <button onClick={() => setMatrixView('table')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${matrixView === 'table' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <TableIcon size={18}/> Table
                </button>
            </div>
        </div>

        {categoriesBreakdown.length > 0 ? (
            matrixView === 'chart' ? (
                <div className="h-[450px] w-full animate-in fade-in zoom-in-95 duration-300">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoriesBreakdown}
                                cx="50%" cy="50%"
                                innerRadius={90}
                                outerRadius={150}
                                paddingAngle={3}
                                dataKey="total"
                                nameKey="name"
                                label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                labelLine={false}
                            >
                                {categoriesBreakdown.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={getHexColorForTag(entry.name, index)} 
                                        className="transition-all duration-300 hover:opacity-80 outline-none hover:scale-105" 
                                    />
                                ))}
                            </Pie>
                            <RechartsTooltip content={<CustomPieTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 'bold', color: '#64748b' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="overflow-x-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-300">
                    <table className="w-full text-base text-left">
                        <thead className="text-sm text-gray-400 uppercase bg-gray-50 border-b border-gray-100 font-bold">
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
                            {categoriesBreakdown.map((cat, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-black text-gray-700">
                                        <span className={`px-3 py-1 rounded text-xs font-black uppercase mr-2 ${getSafeTagStyle(cat.name)}`}>{cat.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500 font-medium">{cat.todo}</td>
                                    <td className="px-6 py-4 text-center text-amber-600 font-bold">{cat.onProcess}</td>
                                    <td className="px-6 py-4 text-center text-purple-600 font-bold">{cat.review}</td>
                                    <td className="px-6 py-4 text-center text-green-600 font-bold">{cat.done}</td>
                                    <td className="px-6 py-4 text-center font-black bg-gray-50/50 text-gray-900 text-lg">{cat.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        ) : (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 italic">
                <PieChartIcon size={56} className="mb-4 text-gray-200" />
                <span className="text-lg">No project data registered yet.</span>
            </div>
        )}
      </div>

      {/* --- 🟢 SEPARATED TASK TABLES BY CATEGORY --- */}
      <div className="mb-8 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <ListTodo className="text-indigo-600" size={28}/>
            <h3 className="text-2xl font-black text-gray-800">Active Tasks by Category</h3>
          </div>
          
          {Object.keys(activeTasksByCategory).length > 0 ? (
              Object.entries(activeTasksByCategory).map(([category, catTasks]) => (
                  <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${getSafeTagStyle(category).replace('text-', 'bg-').replace('100', '50/50')}`}>
                          <h4 className={`text-base font-black uppercase tracking-widest ${getSafeTagStyle(category).split(' ')[1]}`}>
                              {category}
                          </h4>
                          <span className="text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded shadow-sm border border-gray-100">
                              {catTasks.length} {catTasks.length === 1 ? 'Task' : 'Tasks'}
                          </span>
                      </div>
                      
                      <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-base text-left">
                              <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100 font-bold">
                                  <tr>
                                      <th className="px-6 py-4 w-1/2">Task</th>
                                      <th className="px-6 py-4">Leader</th>
                                      <th className="px-6 py-4">Status</th>
                                      <th className="px-6 py-4 text-right">Deadline</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 bg-white">
                                  {catTasks.map(task => (
                                      <tr key={task.id} onClick={() => setSelectedTask(task)} className="hover:bg-indigo-50/20 transition-colors cursor-pointer group">
                                          <td className="px-6 py-5 font-bold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                                              {task.title}
                                          </td>
                                          <td className="px-6 py-5 text-gray-600 text-sm font-medium">
                                              <span className="flex items-center gap-1.5"><User size={14} className="text-gray-400"/> {task.taskLeader || 'Unassigned'}</span>
                                          </td>
                                          <td className="px-6 py-5">
                                              <span className={`px-3 py-1 rounded text-xs font-black uppercase border ${
                                                  task.status === 'on-process' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                  task.status === 'review' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                  'bg-gray-50 text-gray-500 border-gray-200'
                                              }`}>
                                                  {task.status || 'todo'}
                                              </span>
                                          </td>
                                          <td className="px-6 py-5 font-mono text-sm text-gray-500 font-bold text-right">
                                              {task.deadline ? formatDate(task.deadline) : '-'}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              ))
          ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm text-gray-400 italic text-lg">
                  No active tasks to display!
              </div>
          )}
      </div>

      {/* --- OPERATION WORKLOAD PIPELINE MAP --- */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <CheckSquare className="text-blue-600" size={24}/> Team Action Assignments
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teamAssignedWorkload.map(member => (
                <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[360px]">
                    <div className="flex items-center gap-4 border-b border-gray-50 pb-4 shrink-0">
                        <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"/>
                        <div>
                            <h4 className="font-bold text-gray-800 text-base leading-tight">{member.name}</h4>
                            <p className="text-sm text-gray-400 mt-1">{member.role}</p>
                        </div>
                        <span className="ml-auto bg-blue-50 text-blue-600 text-sm font-black px-3 py-1.5 rounded-full">
                            {member.assignedTasks.length} Active
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 space-y-3">
                        {member.assignedTasks.length > 0 ? member.assignedTasks.map(task => (
                            <div key={task.id} onClick={() => setSelectedTask(task)} className="p-4 bg-gray-50 hover:bg-indigo-50/30 rounded-xl border border-gray-100/70 flex justify-between items-center group cursor-pointer transition-all">
                                <div className="min-w-0 flex-1 pr-3">
                                    <p className="text-sm font-bold text-gray-700 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                                    <p className="text-xs text-gray-400 mt-1 font-semibold">{task.deadline ? `⏳ Due: ${new Date(task.deadline).toLocaleDateString()}` : 'No deadline'}</p>
                                </div>
                                <span className={`text-[10px] font-black tracking-wider uppercase border px-2.5 py-1 rounded ${task.status === 'on-process' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {task.status || 'todo'}
                                </span>
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center text-center text-gray-300 text-sm italic">All tasks completed! Clear pipeline 🌟</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* --- UPCOMING EVENTS --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex-1 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Calendar className="text-orange-500" size={24}/> Upcoming Schedule</h3>
        <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5).map(task => (
                <div key={task.id} onClick={() => setSelectedTask(task)} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-50 rounded-xl transition border border-gray-50 hover:border-gray-200 group cursor-pointer gap-4">
                    <div className="flex items-center flex-1 min-w-0">
                        <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 mr-5 ${getSafeTagStyle(task.tag)}`}>
                            <span className="text-sm uppercase">{new Date(task.startDate || task.deadline).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-2xl leading-none">{new Date(task.startDate || task.deadline).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-base truncate mb-1.5">{task.title}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5 font-semibold text-gray-600"><User size={14} className="text-gray-400"/> Task Leader: <span className="text-gray-900 font-bold">{task.taskLeader || 'Unassigned'}</span></span>
                                <span className="hidden sm:inline text-gray-300">|</span>
                                <span className="flex items-center gap-1.5 font-semibold text-gray-600"><Clock size={14} className="text-gray-400"/> Deadline: <span className="text-gray-900 font-bold">{task.deadline ? formatDate(task.deadline) : 'No time'}</span></span>
                                {task.location && (
                                    <><span className="hidden sm:inline text-gray-300">|</span><span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 truncate max-w-[150px] font-medium">{task.location}</span></>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                        <span className={`text-xs font-bold tracking-wider uppercase border px-3 py-1.5 rounded-md ${task.status === 'on-process' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            Status: {task.status || 'todo'}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition text-gray-300"><ArrowRight size={24} /></div>
                    </div>
                </div>
            )) : (
                <div className="text-center py-12 text-gray-400"><Calendar size={56} className="mx-auto mb-4 opacity-20"/><p className="text-lg">No upcoming events scheduled.</p></div>
            )}
        </div>
      </div>

      {/* --- OTHER USERS --- */}
      {cutePeople.length > 0 && (
          <div className="mt-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Heart className="text-pink-500 fill-pink-500 animate-pulse" size={24}/> คนน่ารัก ({cutePeople.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {cutePeople.map((user, idx) => (
                    <div key={user.id || idx} className={`bg-white p-6 rounded-2xl shadow-sm border ${user.email === currentUser?.email ? 'border-pink-500 ring-2 ring-pink-100' : 'border-pink-100'} flex flex-col items-center justify-center text-center hover:border-pink-300 hover:shadow-md transition group`}>
                        <div className="w-24 h-24 rounded-full bg-pink-50 flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-sm relative">{user.photoURL || user.avatar ? <img src={user.photoURL || user.avatar} alt={user.name} className="w-full h-full object-cover transition transform group-hover:scale-110 duration-500" /> : <span className="text-3xl font-bold text-pink-400">{(user.name || user.email || '?').charAt(0).toUpperCase()}</span>}</div>
                        <h4 className="font-bold text-gray-800 text-base">{user.name || user.email?.split('@')[0]}</h4><span className="text-sm text-pink-500 font-medium bg-pink-50 px-3 py-1 rounded-full mt-2 mb-2">{user.role || 'Guest'}</span><span className="text-xs text-gray-400 truncate w-full px-2">{user.email}</span>
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