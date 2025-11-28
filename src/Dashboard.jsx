import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Trash2, CheckCircle, Circle, LogOut, Plus } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold tracking-wider text-red-500">iHAVECPU <span className="text-white">Manager</span></h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{currentUser.email}</span>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded hover:bg-gray-700 border border-gray-600">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* Create Task Form */}
        <form onSubmit={addTask} className="bg-white p-6 rounded-lg shadow-sm mb-8 flex gap-4 border border-gray-200">
          <select 
            className="border p-2 rounded bg-gray-50"
            value={category} onChange={(e) => setCategory(e.target.value)}
          >
            <option>Marketing</option>
            <option>Project</option>
            <option>Sales</option>
          </select>
          <input 
            type="text" 
            placeholder="Add a new task..." 
            className="flex-1 border p-2 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={newTask} onChange={(e) => setNewTask(e.target.value)}
          />
          <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded font-semibold hover:bg-red-700 flex items-center gap-2">
            <Plus size={18} /> Add
          </button>
        </form>

        {/* Task List */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className={`flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border-l-4 ${task.status === 'completed' ? 'border-green-500 opacity-75' : 'border-red-500'}`}>
              <div className="flex items-center gap-4">
                <button onClick={() => toggleStatus(task)} className="text-gray-500 hover:text-red-500">
                  {task.status === 'completed' ? <CheckCircle className="text-green-500" /> : <Circle />}
                </button>
                <div>
                  <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</h3>
                  <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">{task.category}</span>
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-600 transition">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-center text-gray-500 mt-10">No tasks found. Start planning!</p>}
        </div>
      </div>
    </div>
  );
}