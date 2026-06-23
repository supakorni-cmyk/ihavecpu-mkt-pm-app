// src/components/shared/Sidebar.jsx
import React, { useState } from 'react';
import { LogOut, Home, Layout, Calendar as CalendarIcon, Presentation, Image as ImageIcon, Table, Heart, UserMinus, Clock, Clipboard, Menu, X, Cat, MonitorPlay, Mail, Monitor } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, onLogout }) {
  const [isOpen, setIsOpen] = useState(false); // State for mobile menu

  const NavItem = ({ view, icon: Icon, label, colorClass = "text-blue-600 bg-blue-50" }) => (
    <button 
      onClick={() => {
        setCurrentView(view);
        setIsOpen(false); // Close menu on mobile after selection
      }} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        currentView === view ? `${colorClass} font-bold` : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      <Icon size={20} />
      <span className={`${isOpen ? 'inline' : 'hidden md:inline'}`}>{label}</span>
    </button>
  );

  return (
    <>
      {/* --- MOBILE TOP BAR --- */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg text-white"><Cat size={20} /></div>
          <span className="font-bold text-gray-900">iHAVECPU</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- SIDEBAR ASIDE --- */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 transition duration-200 ease-in-out
        w-64 bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0 z-40 print:hidden
      `}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 hidden md:flex items-center gap-3 mb-6">
            <div className="bg-red-600 p-2 rounded-lg text-white"><Cat size={24} /></div>
            <div className="flex flex-col justify-center">
              <h1 className="text-lg font-bold text-gray-900 leading-none">iHAVECPU</h1>
              <span className="text-xs text-red-600 font-bold tracking-wider uppercase">Mkt Workspace</span>
            </div>
          </div>
          
          <nav className="px-3 space-y-1">
            <NavItem view="home" icon={Home} label="Home" />
            <NavItem view="board" icon={Layout} label="Board" />
            <NavItem view="calendar" icon={CalendarIcon} label="Calendar" />
            <NavItem view="report" icon={Presentation} label="Report Builder" />
            <NavItem view="documents" icon={Clipboard} label="Document" />
            <NavItem view="album" icon={ImageIcon} label="Photo Album" colorClass="text-purple-600 bg-purple-50" />
            <NavItem view="budget" icon={Table} label="Budget" colorClass="text-emerald-600 bg-emerald-50" />
            <NavItem view="social-summarize" icon={MonitorPlay} label="Social Media" colorClass="text-red-600 bg-red-50" />
            <NavItem view="fb-tracker" icon={Monitor} label="FB Tracker" colorClass="text-blue-600 bg-blue-50" />
            <NavItem view="video-summarize" icon={MonitorPlay} label="Video Summarizer" colorClass="text-red-600 bg-red-50" />
            <NavItem view="leave" icon={UserMinus} label="Leave Recorder" colorClass="text-orange-600 bg-orange-50" />
            <NavItem view="ot" icon={Clock} label="OT Recorder" colorClass="text-indigo-600 bg-indigo-50" />
            <NavItem view="selfheal" icon={Heart} label="Self Heal" colorClass="text-pink-500 bg-pink-50" />
            <NavItem view="my-email" icon={Mail} label="My Email" colorClass="text-indigo-600 bg-indigo-50" />
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
            <LogOut size={20} /> <span className={`${isOpen ? 'inline' : 'hidden md:inline'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)}></div>
      )}
    </>
  );
}