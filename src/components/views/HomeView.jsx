// src/components/views/HomeView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Heart, Calendar, CheckCircle2, Clock, 
  ArrowRight, User, Briefcase, Bell, CloudRain, Sun, Droplets, Wind, TrendingUp, MapPin
} from 'lucide-react';
import { formatDate } from '../../utils/constants';

// 🟢 MODALS
import TaskDetailModal from '../modals/TaskDetailModal';
import EditTaskModal from '../modals/EditTaskModal';

// --- SYSTEM DEFAULT AVATARS ---
const SYSTEM_AVATARS = {
  jittikorn: '/avatars/pae.jpg', 
  supakorn: '/avatars/boom.jpg', 
  sophisa: '/avatars/yui.jpg', 
  suchada: '/avatars/bum.jpg', 
  nichapa: '/avatars/mod.jpg'
};

// --- TEAM CONFIGURATION ---
const INITIAL_TEAM = [
  { id: 1, name: 'เป้ ไข่หมุน', email: 'jittikorn.m@ihavecpu.com', role: 'Marketing Manager', avatar: SYSTEM_AVATARS.jittikorn },
  { id: 2, name: 'SPARKIEZZ', email: 'supakorn.i@ihavecpu.com', role: 'Assistant Manager', avatar: SYSTEM_AVATARS.supakorn },
  { id: 3, name: 'อียุ้ยคนสวย', email: 'sophisa.p@ihavecpu.com', role: 'Assistant Manager', avatar: SYSTEM_AVATARS.sophisa },
  { id: 4, name: 'ณ๊องส์บิ๋ม', email: 'suchada.t@ihavecpu.com', role: 'Graphic Head', avatar: SYSTEM_AVATARS.suchada },
  { id: 5, name: 'มดตะนอยร้อยแรงม้า', email: 'nichapa.w@ihavecpu.com', role: 'Marketing Coordinator', avatar: SYSTEM_AVATARS.nichapa}
];

const HomeView = ({ tasks, currentUser, notifications = [], markNotificationRead, clearAllNotifications, users = [], onUpdateTask, onDeleteTask }) => {
  const [team] = useState(INITIAL_TEAM);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // MODAL STATE
  const [selectedTask, setSelectedTask] = useState(null); 
  const [editingTask, setEditingTask] = useState(null);   

  // --- API DATA STATE ---
  const [weatherData, setWeatherData] = useState(null);
  const [locationName, setLocationName] = useState("Locating..."); 

  // --- STATS LOGIC ---
  const completedTasks = tasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      return s === 'completed' || s === 'done';
  }).length;

  const pendingTasks = tasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      return s !== 'completed' && s !== 'done' && s !== 'canceled';
  }).length;

  const upcomingEvents = tasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      if (s === 'canceled' || s === 'completed' || s === 'done') return false;
      if (t.tag === 'Event' || t.tag === 'Guest Speaker') return true;
      if (Array.isArray(t.tags) && (t.tags.includes('Event') || t.tags.includes('Guest Speaker'))) return true;
      return false;
  });

  upcomingEvents.sort((a, b) => {
      const dateA = new Date(a.startDate || a.deadline || 0);
      const dateB = new Date(b.startDate || b.deadline || 0);
      return dateA - dateB;
  });

  const coreMember = team.find(member => member.email === currentUser?.email);
  const displayAvatar = coreMember?.avatar || currentUser?.photoURL || 'https://ui-avatars.com/api/?background=random&color=fff&name=' + (currentUser?.email || 'User');
  const displayName = coreMember?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest';

  const coreEmails = team.map(m => m.email.toLowerCase());
  const cutePeople = users.filter(u => u.email && !coreEmails.includes(u.email.toLowerCase()));

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // --- FETCH WEATHER ---
  useEffect(() => {
      const fetchWeather = async (lat, lon, locName) => {
          try {
              const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
              const weatherJson = await weatherRes.json();
              if (weatherJson && weatherJson.current_weather) {
                  setWeatherData(weatherJson.current_weather);
              }
              setLocationName(locName);
          } catch (error) {
              console.error("Failed to fetch weather", error);
              setLocationName("Unknown Location");
          }
      };

      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              async (position) => {
                  const lat = position.coords.latitude;
                  const lon = position.coords.longitude;
                  try {
                      const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                      const geoData = await geoRes.json();
                      const city = geoData.city || geoData.locality || "Current Location";
                      fetchWeather(lat, lon, city);
                  } catch (e) { fetchWeather(lat, lon, "Current Location"); }
              },
              (error) => {
                  console.warn("Geolocation denied/failed. Falling back to Pathum Thani.");
                  fetchWeather(14.0208, 100.5250, "Pathum Thani");
              },
              { timeout: 10000 }
          );
      } else {
          fetchWeather(14.0208, 100.5250, "Pathum Thani");
      }
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


  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 p-8 font-sans relative">
      {/* --- WELCOME HEADER --- */}
      <div className="mb-10 flex justify-between items-start">
        <div className="flex items-center gap-5">
            <div className="relative">
                <img src={displayAvatar} alt="Profile" className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover bg-white"/>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                Welcome Back, {displayName.split(' ')[0]}! <span className="text-2xl animate-pulse">👋</span>
                </h1>
                <p className="text-gray-500 mt-1 font-medium">Wish you have a good {today}</p>
            </div>
        </div>
        
        {/* NOTIFICATION BELL */}
        <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-3 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-100 transition relative">
                <Bell size={24} className="text-gray-600" />
                {unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm border border-white">{unreadCount}</span>}
            </button>
            {isNotifOpen && (
                <div className="absolute right-0 top-14 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                        <h4 className="font-bold text-gray-700 text-sm">Notifications</h4>
                        {notifications.length > 0 && <button onClick={clearAllNotifications} className="text-[10px] text-red-500 hover:underline">Clear All</button>}
                    </div>
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
        
        {/* Weather Widget */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-sm flex justify-between items-center relative overflow-hidden group h-full max-w-2xl">
            <div className="absolute -right-6 -top-6 text-white opacity-50 group-hover:scale-110 transition-transform duration-700">
                {weatherData ? getWeatherIcon(weatherData.weathercode) : <CloudRain size={120} />}
            </div>
            <div className="relative z-10 flex flex-col h-full justify-center">
                <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12}/> {locationName}</h4>
                <div className="text-4xl font-black text-gray-800 tracking-tighter">
                    {weatherData ? `${weatherData.temperature}°C` : '--°C'}
                </div>
                <p className="text-sm font-medium text-gray-600 mt-1">
                    {weatherData ? getWeatherCondition(weatherData.weathercode) : 'Loading...'}
                </p>
            </div>
            <div className="relative z-10 text-right space-y-2 self-end">
                {weatherData && (
                    <>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-white/60 px-3 py-1.5 rounded-lg shadow-sm border border-white">
                            <Wind size={14} className="text-blue-400"/> {weatherData.windspeed} km/h
                        </div>
                        <div className="text-[10px] text-gray-400">Updated: {new Date(weatherData.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </>
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

      {/* --- UPCOMING EVENTS --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex-1">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar className="text-orange-500" size={20}/> Upcoming Schedule
        </h3>
        
        <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5).map(task => (
                <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)} 
                    className="flex items-center p-4 hover:bg-gray-50 rounded-xl transition border border-gray-50 hover:border-gray-200 group cursor-pointer"
                >
                    <div className="w-14 h-14 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-600 font-bold shrink-0 mr-4">
                        <span className="text-xs uppercase">{new Date(task.startDate || task.deadline).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-xl leading-none">{new Date(task.startDate || task.deadline).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 truncate">{task.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock size={12}/> {task.deadline ? formatDate(task.deadline) : 'No time'}</span>
                            {task.location && <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{task.location}</span>}
                        </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition text-gray-300">
                        <ArrowRight size={20} />
                    </div>
                </div>
            )) : (
                <div className="text-center py-10 text-gray-400">
                    <Calendar size={48} className="mx-auto mb-3 opacity-20"/>
                    <p>No upcoming events scheduled.</p>
                </div>
            )}
        </div>
      </div>

      {/* --- OTHER USERS --- */}
      {cutePeople.length > 0 && (
          <div className="mt-12 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

      {/* 🟢 DETAIL MODAL */}
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

      {/* 🟢 EDIT MODAL */}
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

export default HomeView;