import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Trash2, CheckCircle, Circle, LogOut, Plus, Menu } from 'lucide-react';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [category, setCategory] = useState('Marketing');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // READ: Fetch tasks real-time
  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setTasks(taskData);
    });
    return unsubscribe;
  }, []);

  // CREATE: Add new task
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask) return;
    await addDoc(collection(db, 'tasks'), {
      title: newTask,
      category,
      status: 'pending',
      createdAt: new Date(),
      author: currentUser.email
    });
    setNewTask('');
  };

  // UPDATE: Toggle status
  const toggleStatus = async (task) => {
    const taskRef = doc(db, 'tasks', task.id);
    await updateDoc(taskRef, {
      status: task.status === 'completed' ? 'pending' : 'completed'
    });
  };

  // DELETE: Remove task
  const deleteTask = async (id) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* Header - Responsive Layout */}
      <nav className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-lg sm:text-xl font-bold tracking-wider text-red-500 truncate">
            iHAVECPU <span className="text-white hidden xs:inline">Manager</span>
          </h1>
          
          <div className="flex items-center gap-3">
            {/* Hide email on very small screens (xs) */}
            <span className="text-xs sm:text-sm text-gray-400 hidden sm:block max-w-[150px] truncate">
              {currentUser.email}
            </span>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded hover:bg-gray-700 border border-gray-600 text-sm transition-colors"
            >
              <LogOut size={16} /> <span className="hidden xs:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        
        {/* Create Task Form - Stacks on mobile, Row on Desktop */}
        <form onSubmit={addTask} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-6 flex flex-col sm:flex-row gap-3 border border-gray-200">
          <select 
            className="border p-3 rounded bg-gray-50 text-gray-700 w-full sm:w-auto focus:ring-2 focus:ring-red-500 outline-none"
            value={category} onChange={(e) => setCategory(e.target.value)}
          >
            <option>Marketing</option>
            <option>Project</option>
            <option>Sales</option>
            <option>IT Support</option>
          </select>
          
          <input 
            type="text" 
            placeholder="Add a new task..." 
            className="flex-1 border p-3 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 w-full"
            value={newTask} onChange={(e) => setNewTask(e.target.value)}
          />
          
          <button type="submit" className="bg-red-600 text-white px-6 py-3 rounded font-semibold hover:bg-red-700 flex items-center justify-center gap-2 w-full sm:w-auto transition-colors">
            <Plus size={20} /> <span className="sm:hidden">Add Task</span> <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {/* Task List */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className={`flex items-start justify-between p-4 bg-white rounded-lg shadow-sm border-l-4 transition-all hover:shadow-md ${task.status === 'completed' ? 'border-green-500 opacity-75' : 'border-red-500'}`}>
              
              <div className="flex gap-3 sm:gap-4 items-start w-full">
                {/* Checkbox Icon */}
                <button onClick={() => toggleStatus(task)} className="mt-1 flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                  {task.status === 'completed' ? <CheckCircle className="text-green-500" size={24} /> : <Circle size={24} />}
                </button>
                
                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium text-sm sm:text-base break-words ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] sm:text-xs text-gray-600 px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200">
                      {task.category}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {/* Simple date display */}
                      {task.createdAt?.seconds ? new Date(task.createdAt.seconds * 1000).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delete Button */}
              <button onClick={() => deleteTask(task.id)} className="ml-2 sm:ml-4 text-gray-300 hover:text-red-600 transition-colors p-1">
                <Trash2 size={20} />
              </button>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-400">No tasks found.</p>
              <p className="text-sm text-gray-300">Start planning your marketing projects!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}