// src/components/shared/Sidebar.jsx
import React from 'react';
import { Computer, LogOut, Home, Layout, Calendar as CalendarIcon, Presentation, Image as ImageIcon, Table, Heart, UserMinus, Clock, Cat } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, onLogout }) {
  const NavItem = ({ view, icon: Icon, label, colorClass = "text-blue-600 bg-blue-50" }) => (
    <button 
      onClick={() => setCurrentView(view)} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === view ? `${colorClass} font-bold` : 'text-gray-500 hover:bg-gray-50'}`}
    >
      <Icon size={20} /> <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <aside className="w-20 md:w-64 bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0 z-20 print:hidden">
      <div className="p-6 flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg text-white flex-shrink-0"><Cat size={24} /></div>
        <div className="flex flex-col justify-center overflow-hidden">
          <h1 className="text-lg font-bold text-gray-900 leading-none truncate">iHAVECPU</h1>
          <span className="text-xs text-red-600 font-bold tracking-wider truncate">MKT WORKSPACE</span>
        </div>
      </div>
      
      <nav className="px-3 space-y-2">
        <NavItem view="home" icon={Home} label="Home" />
        <NavItem view="board" icon={Layout} label="Board" />
        <NavItem view="calendar" icon={CalendarIcon} label="Calendar" />
        <NavItem view="report" icon={Presentation} label="Report Builder" />
        <NavItem view="album" icon={ImageIcon} label="Photo Album" colorClass="text-purple-600 bg-purple-50" />
        <NavItem view="budget" icon={Table} label="Budget" colorClass="text-emerald-600 bg-emerald-50" />
        {/* ADD THIS NEW ITEM */}
        <NavItem view="leave" icon={UserMinus} label="Leave Recorder" colorClass="text-orange-600 bg-orange-50" />
        <NavItem view="ot" icon={Clock} label="OT Recorder" colorClass="text-indigo-600 bg-indigo-50" />
        <NavItem view="selfheal" icon={Heart} label="Self Heal" colorClass="text-pink-500 bg-pink-50" />
      </nav>

      <div className="p-4">
        <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition"><LogOut/></button>
      </div>
    </aside>
  );
}