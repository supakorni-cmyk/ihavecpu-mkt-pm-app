import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy 
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, 
  Plus, 
  Calendar, 
  Trash2, 
  LogOut, 
  Layout, 
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTag, setNewTaskTag] = useState('Marketing');
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // --- 1. READ: Fetch tasks from Firebase ---
  useEffect(() => {
    // Determine user query based on need. Currently fetching all tasks.
    // To fetch only user's tasks: query(collection(db, 'tasks'), where("author", "==", currentUser.email));
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setTasks(taskData);
    });
    return unsubscribe;
  }, []);

  // --- 2. CREATE: Add Task ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    await addDoc(collection(db, 'tasks'), {
      title: newTaskTitle,
      tag: newTaskTag,
      status: 'todo', // Default status
      createdAt: new Date(),
      author: currentUser.email,
      dueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    });

    setNewTaskTitle('');
    setIsModalOpen(false);
  };

  // --- 3. UPDATE: Move Task (Change Status) ---
  const moveTask = async (taskId, currentStatus, direction) => {
    const statusOrder = ['todo', 'inprogress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    // Fallback if status isn't recognized (e.g. old data)
    if (currentIndex === -1) {
        await updateDoc(doc(db, 'tasks', taskId), { status: 'todo' });
        return;
    }

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    // Boundary checks
    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: statusOrder[nextIndex]
      });
    }
  };

  // --- 4. DELETE: Remove Task ---
  const deleteTask = async (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteDoc(doc(db, 'tasks', id));
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch {
      alert("Failed to log out");
    }
  };

  // --- Visual Configuration ---
  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50' },
    { id: 'review', title: 'Review', color: 'bg-purple-50' },
    { id: 'done', title: 'Done', color: 'bg-green-50' },
  ];

  const tagColors = {
    'Project': 'bg-pink-100 text-pink-600',
    'Event': 'bg-purple-100 text-purple-600',
    'Review': 'bg-blue-100 text-blue-600',
    'Planning': 'bg-yellow-100 text-yellow-600',
  };

  // Filter tasks into columns
  const getTasksByStatus = (status) => {
    return tasks.filter(task => {
      // Handle legacy data that might have 'pending' or 'completed'
      if (status === 'todo' && (task.status === 'pending' || !task.status)) return true;
      if (status === 'done' && task.status === 'completed') return true;
      return task.status === status;
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      
      {/* --- Top Navigation --- */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg text-white">
                <Layout size={20} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">iHAVECPU <span className="text-red-600">MARKETING</span></h1>
                <p className="text-xs text-gray-400 font-medium">Project Management</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-700">Welcome! {currentUser?.email?.split('@')[0]}</span>
                <span className="text-[10px] text-gray-400">Admin</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <LogOut size={20} />
            </button>
        </div>
      </nav>

      {/* --- Board Actions --- */}
      <div className="px-6 py-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Marketing Sprint</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      {/* --- Kanban Columns --- */}
      <div className="px-6 pb-10 overflow-x-auto">
        <div className="flex gap-6 min-w-[1000px]"> {/* Min width ensures columns don't squish on small screens */}
          {columns.map(col => (
            <div key={col.id} className="flex-1 min-w-[280px]">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider">{col.title}</h3>
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">
                        {getTasksByStatus(col.id).length}
                    </span>
                </div>
                <button className="text-gray-300 hover:text-gray-600"><MoreHorizontal size={16} /></button>
              </div>

              {/* Column Content */}
              <div className={`h-full min-h-[500px] rounded-2xl p-2 ${col.color}`}> {/* Removed border-dashed, added colored bg */}
                 <div className="flex flex-col gap-3">
                    {getTasksByStatus(col.id).map(task => (
                        <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative">
                            {/* Tags */}
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${tagColors[task.tag] || 'bg-gray-100 text-gray-500'}`}>
                                    {task.tag}
                                </span>
                                <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Title */}
                            <h4 className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed">{task.title}</h4>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                                    <Calendar size={12} />
                                    <span>{task.dueDate || 'No Date'}</span>
                                </div>
                                
                                {/* Movement Controls */}
                                <div className="flex gap-1">
                                    {col.id !== 'todo' && (
                                        <button onClick={() => moveTask(task.id, task.status || 'todo', 'prev')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600" title="Move Back">
                                            <ArrowLeft size={14} />
                                        </button>
                                    )}
                                    {col.id !== 'done' && (
                                        <button onClick={() => moveTask(task.id, task.status || 'todo', 'next')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600" title="Move Forward">
                                            <ArrowRight size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Add Task Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Add New Task</h3>
                <form onSubmit={handleAddTask} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Title</label>
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                            placeholder="e.g., Launch Facebook Ads"
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tag</label>
                        <select 
                            className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                            value={newTaskTag}
                            onChange={e => setNewTaskTag(e.target.value)}
                        >
                            <option value="Marketing">Project</option>
                            <option value="Design">Event</option>
                            <option value="Dev">Review</option>
                            <option value="Planning">Planning</option>
                        </select>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Cancel</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}