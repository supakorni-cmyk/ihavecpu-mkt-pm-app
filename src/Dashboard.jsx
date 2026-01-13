import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Assuming you have this

// Logic & Utilities
import { useTaskData } from './hooks/useTaskData';
import { getSafeRequirements } from './utils/constants';

// Shared Components
import Sidebar from './components/shared/Sidebar';

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

// Modals
import AddTaskModal from './components/modals/AddTaskModal';
import EditTaskModal from './components/modals/EditTaskModal'; // Extract the edit modal content here
import RequirementSheetModal from './components/modals/RequirementModal';

export default function Dashboard() {
  // 1. Setup Hooks
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const data = useTaskData(currentUser); // Access all our data logic

  // 2. Local UI State
  const [currentView, setCurrentView] = useState('board');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [activeRequirementId, setActiveRequirementId] = useState(null);

  // 3. Derived State
  const selectedTask = data.tasks.find(t => t.id === selectedTaskId);
  const activeRequirement = selectedTask 
    ? getSafeRequirements(selectedTask).find(r => r.id === activeRequirementId) 
    : null;

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onLogout={handleLogout} 
      />

      {/* MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white relative">
        {currentView === 'home' && (
          <HomeView tasks={data.tasks} currentUser={currentUser} />
        )}
        
        {currentView === 'board' && (
          <BoardView 
            tasks={data.tasks} 
            onAddTaskClick={() => setIsAddModalOpen(true)}
            onTaskClick={setSelectedTaskId}
            onDeleteTask={data.deleteTask}
            onMoveTask={data.moveTask}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView 
            tasks={data.tasks} 
            setSelectedTaskId={setSelectedTaskId} 
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

        {/* ADD THIS BLOCK */}
        {currentView === 'leave' && (
          <LeaveView 
            leaves={data.leaves} 
            onAdd={data.addLeave} 
            onDelete={data.deleteLeave} 
          />
        )}

        {/* ADD OT VIEW BLOCK */}
        {currentView === 'ot' && (
          <OTView 
            records={data.otRecords} 
            onAdd={data.addOTRecord} 
            onDelete={data.deleteOTRecord}
            onUpdateStatus={data.updateOTStatus}
            currentUser={currentUser} // Important for permission check
          />
        )}

        {currentView === 'selfheal' && <SelfHealView />}
        
        {currentView === 'report' && (
          <ReportView tasks={data.tasks} currentUser={currentUser} />
        )}
      </main>

      {/* MODAL LAYER */}
      {isAddModalOpen && (
        <AddTaskModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={data.addTask} 
        />
      )}

      {/* Task Details / Edit Modal */}
      {selectedTask && !activeRequirement && (
        <EditTaskModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updates) => data.updateTask(selectedTask.id, updates)}
          onOpenRequirement={(reqId) => setActiveRequirementId(reqId)}
        />
      )}

      {/* Requirement Sheet Modal */}
      {activeRequirement && selectedTask && (
        <RequirementSheetModal 
          task={selectedTask} 
          requirement={activeRequirement} 
          onClose={() => setActiveRequirementId(null)} 
          onUpdateTask={(updates) => data.updateTask(selectedTask.id, updates)} 
        />
      )}
    </div>
  );
}