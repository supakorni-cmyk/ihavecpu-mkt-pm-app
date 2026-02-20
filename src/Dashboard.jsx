// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Logic & Utilities
import { useTaskData } from './hooks/useTaskData';
import { getSafeRequirements } from './utils/constants';

// Shared Components
import Sidebar from './components/shared/Sidebar';
import GlobalPlayer from './components/common/GlobalPlayer'; 

// Views
import HomeView from './components/views/HomeView';
import BoardView from './components/views/BoardView';
import CalendarView from './components/views/CalendarView';
import PhotoAlbumView from './components/views/AlbumView';
import BudgetRecorderView from './components/views/BudgetView';
import LeaveView from './components/views/LeaveView';
import SelfHealView from './components/views/SelfHealView';
import ReportView from './components/views/ReportView';
import OTView from './components/views/OtView';
import DocumentView from './components/views/DocumentView';
import VideoSummarizeView from './components/views/VideoSummarizeView';

// Modals
import AddTaskModal from './components/modals/AddTaskModal';
import EditTaskModal from './components/modals/EditTaskModal';
import RequirementSheetModal from './components/modals/RequirementModal';
import TaskDetailModal from './components/modals/TaskDetailModal'; // 🟢 IMPORTED

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // 🟢 SINGLE HOOK CALL
  const data = useTaskData(currentUser);

  // --- STATE ---
  const [playerMood, setPlayerMood] = useState(null);
  const [playerMode, setPlayerMode] = useState('hidden'); 
  const [currentView, setCurrentView] = useState('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null); // For Edit
  const [activeRequirementId, setActiveRequirementId] = useState(null);
  
  // 🟢 DEEP LINK STATE
  const [deepLinkTask, setDeepLinkTask] = useState(null);

  // --- DERIVED STATE ---
  const selectedTask = data.tasks.find(t => t.id === selectedTaskId);
  const activeRequirement = selectedTask 
    ? getSafeRequirements(selectedTask).find(r => r.id === activeRequirementId) 
    : null;

  const handleLogout = async () => { await logout(); navigate('/'); };
  const handlePlayMood = (mood) => { setPlayerMood(mood); setPlayerMode('mini'); };

  // 🟢 DEEP LINK HANDLER (On Load)
  useEffect(() => {
    if (data.tasks.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('taskId');

      if (targetId) {
        const foundTask = data.tasks.find(t => t.id === targetId);
        if (foundTask) {
          console.log("🔗 Deep Link Found for:", foundTask.title);
          setDeepLinkTask(foundTask);
          
          // Optional: Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [data.tasks]);

  return (
  <div className="flex flex-col md:flex-row h-screen w-full bg-gray-50 font-sans overflow-hidden">
      
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white relative">
        {currentView === 'home' && (
          <HomeView 
            tasks={data.tasks} 
            currentUser={currentUser}
            notifications={data.notifications} 
            markNotificationRead={data.markNotificationRead}
            clearAllNotifications={data.clearAllNotifications}
            users={data.allUsers}
            onUpdateTask={data.updateTask} 
            onDeleteTask={data.deleteTask} 
          />
        )}
        
        {currentView === 'board' && (
          <BoardView 
            tasks={data.tasks} 
            onAddTaskClick={() => setIsAddModalOpen(true)}
            onTaskClick={setSelectedTaskId}
            onUpdateTask={data.updateTask}
            onDeleteTask={data.deleteTask}
            onMoveTask={data.moveTask}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView 
            tasks={data.tasks} 
            onAddTask={data.addTask}
            onUpdateTask={data.updateTask}
            onDeleteTask={data.deleteTask}
          />
        )}

        {currentView === 'documents' && (
          <DocumentView 
            documents={data.documents}
            tasks={data.tasks}
            onAdd={data.addDocument}
            onUpdate={data.updateDocument}
            onDelete={data.deleteDocument}
          />
        )}

        {currentView === 'album' && (
          <PhotoAlbumView 
            albums={data.albums} 
            photos={data.photos} 
            onAddAlbum={data.addAlbum} 
            onDeleteAlbum={data.deleteAlbum} 
            onAddPhoto={data.addPhoto} 
            onDeletePhoto={data.deletePhoto} 
          />
        )}

        {currentView === 'budget' && (
          <BudgetRecorderView 
            transactions={data.transactions} 
            onAdd={data.addTransaction} 
            onDelete={data.deleteTransaction} 
            onUpdate={data.updateTransaction}
          />
        )}

        {currentView === 'video-summarize' && (
          <VideoSummarizeView />
        )}

        {currentView === 'leave' && (
          <LeaveView leaves={data.leaves} onAdd={data.addLeave} onDelete={data.deleteLeave} />
        )}

        {currentView === 'ot' && (
          <OTView 
            records={data.otRecords} 
            onAdd={data.addOTRecord} 
            onDelete={data.deleteOTRecord}
            onUpdateStatus={data.updateOTStatus}
            currentUser={currentUser}
          />
        )}

        {currentView === 'selfheal' && (
            <SelfHealView 
                onPlay={handlePlayMood} 
                currentMoodId={playerMood?.id} 
                currentUser={currentUser}
            />
        )}
        
        {currentView === 'report' && (
          <ReportView tasks={data.tasks} currentUser={currentUser} />
        )}
      </main>

      <GlobalPlayer 
          mood={playerMood} 
          mode={playerMode} 
          setMode={setPlayerMode} 
          onClose={() => { setPlayerMode('hidden'); setPlayerMood(null); }} 
      />

      {/* MODALS */}
      {isAddModalOpen && (
        <AddTaskModal onClose={() => setIsAddModalOpen(false)} onAdd={data.addTask} />
      )}

      {selectedTask && !activeRequirement && (
        <EditTaskModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updates) => data.updateTask(selectedTask.id, updates)}
          onDelete={() => data.deleteTask(selectedTask.id)}
          onOpenRequirement={(reqId) => setActiveRequirementId(reqId)}
        />
      )}

      {activeRequirement && selectedTask && (
        <RequirementSheetModal 
          task={selectedTask} 
          requirement={activeRequirement} 
          onClose={() => setActiveRequirementId(null)} 
          onUpdateTask={(updates) => data.updateTask(selectedTask.id, updates)} 
        />
      )}

      {/* 🟢 DEEP LINK READ-ONLY MODAL */}
      {deepLinkTask && (
        <TaskDetailModal 
            task={deepLinkTask}
            onClose={() => setDeepLinkTask(null)}
            onEdit={() => {
                setSelectedTaskId(deepLinkTask.id); // Open Edit Modal
                setDeepLinkTask(null); // Close Read-Only
            }}
            onDelete={() => {
                data.deleteTask(deepLinkTask.id);
                setDeepLinkTask(null);
            }}
        />
      )}
    </div>
  );
}