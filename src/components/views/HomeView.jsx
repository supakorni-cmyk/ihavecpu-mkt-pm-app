// src/components/views/HomeView.jsx
import React, { useState } from 'react';
import { 
  Heart, Calendar, CheckCircle2, Clock, 
  ArrowRight, User, Briefcase 
} from 'lucide-react';
import { formatDate } from '../../utils/constants';

// --- SYSTEM DEFAULT AVATARS ---
// High-quality static images from Unsplash
const SYSTEM_AVATARS = {
  jittikorn: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop", // Male (Business)
  supakorn: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop", // Male (Casual)
  sophisa: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop", // Female (Smiling)
  suchada: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop", // Female (Portrait)
};

// --- TEAM CONFIGURATION ---
const INITIAL_TEAM = [
  { 
    id: 1, 
    name: 'Jittikorn M.', 
    email: 'jittikorn.m@ihavecpu.com',
    role: 'Marketing Lead', 
    avatar: SYSTEM_AVATARS.jittikorn 
  },
  { 
    id: 2, 
    name: 'Supakorn I.', 
    email: 'supakorn.i@ihavecpu.com',
    role: 'Creative Director', 
    avatar: SYSTEM_AVATARS.supakorn 
  },
  { 
    id: 3, 
    name: 'Sophisa P.', 
    email: 'sophisa.p@ihavecpu.com',
    role: 'Content Creator', 
    avatar: SYSTEM_AVATARS.sophisa 
  },
  { 
    id: 4, 
    name: 'Suchada T.', 
    email: 'suchada.t@ihavecpu.com',
    role: 'Coordinator', 
    avatar: SYSTEM_AVATARS.suchada 
  },
];

const HomeView = ({ tasks }) => {
  const [team] = useState(INITIAL_TEAM);

  // Helper stats
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const upcomingEvents = tasks.filter(t => t.tags && (t.tags.includes('Event') || t.tags.includes('Guest Speaker')));

  // Current User (Defaults to Jittikorn for the "Welcome Back" message)
  const currentUser = team[0]; 

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 p-8 font-sans">
      {/* --- WELCOME HEADER --- */}
      <div className="mb-10 flex items-center gap-5">
        {/* Recommended Size: w-16 h-16 (64px) */}
        <div className="relative">
            <img 
                src={currentUser.avatar} 
                alt="Profile" 
                className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover"
            />
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
            Welcome Back, {currentUser.name.split(' ')[0]}! <span className="text-2xl animate-pulse">👋</span>
            </h1>
            <p className="text-gray-500 mt-1 font-medium">Dashboard overview for {currentUser.email}</p>
        </div>
      </div>

      {/* --- TEAM SECTION (READ-ONLY) --- */}
      <div className="mb-12">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="text-blue-600" size={20}/> Team Members
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {team.map(member => (
                <div key={member.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition group">
                    
                    {/* Recommended Size: w-20 h-20 (80px) */}
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-sm relative">
                        <img 
                            src={member.avatar} 
                            alt={member.name} 
                            className="w-full h-full object-cover transition transform group-hover:scale-110 duration-500" 
                        />
                    </div>

                    <h4 className="font-bold text-gray-800">{member.name}</h4>
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full mt-1 mb-1">
                        {member.role}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate w-full px-2">{member.email}</span>
                </div>
            ))}
            
            {/* Static Invite Button */}
            <div className="border-2 border-dashed border-gray-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition hover:border-gray-300 opacity-60 hover:opacity-100">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <span className="text-2xl text-gray-400">+</span>
                </div>
                <span className="text-sm font-bold text-gray-400">Invite New</span>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-500/50 rounded-lg"><Briefcase size={24}/></div>
                <span className="text-xs font-bold bg-indigo-500/50 px-2 py-1 rounded">Active</span>
            </div>
            <div className="text-4xl font-black mb-1">{pendingTasks}</div>
            <div className="text-indigo-100 text-sm font-medium">Pending Tasks</div>
        </div>

        <div className="bg-emerald-500 text-white p-6 rounded-2xl shadow-lg shadow-emerald-200">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-400/50 rounded-lg"><CheckCircle2 size={24}/></div>
                <span className="text-xs font-bold bg-emerald-400/50 px-2 py-1 rounded">Done</span>
            </div>
            <div className="text-4xl font-black mb-1">{completedTasks}</div>
            <div className="text-emerald-50 text-sm font-medium">Completed Tasks</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-pink-50 text-pink-500 rounded-lg"><Heart size={24}/></div>
            </div>
            <div className="text-4xl font-black mb-1 text-gray-800">{upcomingEvents.length}</div>
            <div className="text-gray-400 text-sm font-medium">Upcoming Events</div>
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex-1">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar className="text-orange-500" size={20}/> Upcoming Schedule
        </h3>
        
        <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center p-4 hover:bg-gray-50 rounded-xl transition border border-gray-50 hover:border-gray-200 group cursor-pointer">
                    <div className="w-14 h-14 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-600 font-bold shrink-0 mr-4">
                        <span className="text-xs uppercase">{new Date(task.startDate || task.deadline).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-xl leading-none">{new Date(task.startDate || task.deadline).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 truncate">{task.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock size={12}/> {task.deadline ? formatDate(task.deadline) : 'No time'}</span>
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
    </div>
  );
};

export default HomeView;