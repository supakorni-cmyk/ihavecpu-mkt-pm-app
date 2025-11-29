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
  ArrowLeft,
  Paperclip,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Clock,
  AlignLeft,
  CheckSquare,
  ExternalLink,
  X
} from 'lucide-react';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // For viewing details
  
  // Form States
  const [newTask, setNewTask] = useState({
    title: '',
    tag: 'Marketing',
    startDate: '',
    deadline: '',
    description: '',
    requirements: '',
    reference: '',
    link: '',
    imageUrl: '',
    fileUrl: ''
  });
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // --- 1. READ: Fetch tasks from Firebase ---
  useEffect(() => {
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
    if (!newTask.title) return;

    await addDoc(collection(db, 'tasks'), {
      ...newTask,
      status: 'todo',
      createdAt: new Date(),
      author: currentUser.email,
    });

    // Reset Form
    setNewTask({
        title: '',
        tag: 'Marketing',
        startDate: '',
        deadline: '',
        description: '',
        requirements: '',
        reference: '',
        link: '',
        imageUrl: '',
        fileUrl: ''
    });
    setIsAddModalOpen(false);
  };

  // --- 3. UPDATE: Move Task ---
  const moveTask = async (e, taskId, currentStatus, direction) => {
    e.stopPropagation(); // Prevent opening the details modal
    const statusOrder = ['todo', 'inprogress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    if (currentIndex === -1) {
        await updateDoc(doc(db, 'tasks', taskId), { status: 'todo' });
        return;
    }

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: statusOrder[nextIndex]
      });
    }
  };

  // --- 4. DELETE: Remove Task ---
  const deleteTask = async (e, id) => {
    e.stopPropagation(); // Prevent opening details modal
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteDoc(doc(db, 'tasks', id));
      if (selectedTask?.id === id) setSelectedTask(null); // Close modal if open
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

  // --- Helpers ---
  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50' },
    { id: 'review', title: 'Review', color: 'bg-purple-50' },
    { id: 'done', title: 'Done', color: 'bg-green-50' },
  ];

  const tagColors = {
    'Marketing': 'bg-pink-100 text-pink-600',
    'Design': 'bg-purple-100 text-purple-600',
    'Dev': 'bg-blue-100 text-blue-600',
    'Planning': 'bg-yellow-100 text-yellow-600',
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => {
      if (status === 'todo' && (task.status === 'pending' || !task.status)) return true;
      if (status === 'done' && task.status === 'completed') return true;
      return task.status === status;
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      
      {/* --- Top Navigation --- */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Layout size={20} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">iHAVECPU <span className="text-blue-600">Board</span></h1>
                <p className="text-xs text-gray-400 font-medium">Project Management</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-700">{currentUser?.email?.split('@')[0]}</span>
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
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      {/* --- Kanban Columns --- */}
      <div className="px-6 pb-10 overflow-x-auto">
        <div className="flex gap-6 min-w-[1000px]">
          {columns.map(col => (
            <div key={col.id} className="flex-1 min-w-[280px]">
              {/* Header */}
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
              <div className={`h-full min-h-[500px] rounded-2xl p-2 ${col.color}`}>
                 <div className="flex flex-col gap-3">
                    {getTasksByStatus(col.id).map(task => (
                        <div 
                            key={task.id} 
                            onClick={() => setSelectedTask(task)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer"
                        >
                            {/* Tags & Delete */}
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${tagColors[task.tag] || 'bg-gray-100 text-gray-500'}`}>
                                    {task.tag}
                                </span>
                                <button onClick={(e) => deleteTask(e, task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Title */}
                            <h4 className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed line-clamp-2">{task.title}</h4>

                            {/* Attachments Indicators */}
                            {(task.description || task.link || task.fileUrl) && (
                                <div className="flex gap-2 mb-3 text-gray-400">
                                    {task.description && <AlignLeft size={14} />}
                                    {(task.link || task.reference) && <LinkIcon size={14} />}
                                    {(task.fileUrl || task.imageUrl) && <Paperclip size={14} />}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                                    <Clock size={12} />
                                    <span>{task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}) : 'No Deadline'}</span>
                                </div>
                                
                                <div className="flex gap-1">
                                    {col.id !== 'todo' && (
                                        <button onClick={(e) => moveTask(e, task.id, task.status || 'todo', 'prev')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600">
                                            <ArrowLeft size={14} />
                                        </button>
                                    )}
                                    {col.id !== 'done' && (
                                        <button onClick={(e) => moveTask(e, task.id, task.status || 'todo', 'next')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600">
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

      {/* --- ADD TASK MODAL --- */}
        {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-800">Create New Task</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleAddTask} className="flex flex-col gap-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Task Title</label>
                                <input autoFocus type="text" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium" 
                                    placeholder="e.g. Q4 Marketing Campaign"
                                    value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Tag / Department</label>
                                <select className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                    value={newTask.tag} onChange={e => setNewTask({...newTask, tag: e.target.value})}>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Design">Design</option>
                                    <option value="Dev">Dev</option>
                                    <option value="Planning">Planning</option>
                                </select>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Start Date</label>
                                <input type="date" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                    value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Deadline</label>
                                <input type="date" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                    value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
                            </div>
                        </div>

                        {/* Details */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Description (Long Text)</label>
                            <textarea className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 min-h-[100px]"
                                placeholder="Detailed explanation of the task..."
                                value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Requirements</label>
                            <textarea className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 min-h-[80px]"
                                placeholder="- Must include vector logo&#10;- Dark mode compatible"
                                value={newTask.requirements} onChange={e => setNewTask({...newTask, requirements: e.target.value})} />
                        </div>

                        {/* Attachments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Link / Reference URL</label>
                                <input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                    placeholder="https://..."
                                    value={newTask.link} onChange={e => setNewTask({...newTask, link: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Image URL</label>
                                <input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                    placeholder="https://example.com/image.png"
                                    value={newTask.imageUrl} onChange={e => setNewTask({...newTask, imageUrl: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">File URL (GDrive/Dropbox)</label>
                            <input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                placeholder="https://dropbox.com/..."
                                value={newTask.fileUrl} onChange={e => setNewTask({...newTask, fileUrl: e.target.value})} />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Cancel</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition">Create Task</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      {/* --- TASK DETAILS MODAL --- */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header Image if exists */}
                {selectedTask.imageUrl && (
                    <div className="h-48 w-full bg-gray-100 overflow-hidden relative">
                         <img src={selectedTask.imageUrl} alt="Task attachment" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                )}

                <div className="p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${tagColors[selectedTask.tag]}`}>
                                    {selectedTask.tag}
                                </span>
                                <span className="text-gray-400 text-xs flex items-center gap-1">
                                    <Clock size={12} /> Created {new Date(selectedTask.createdAt?.seconds * 1000).toLocaleDateString()}
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 leading-tight">{selectedTask.title}</h2>
                        </div>
                        <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">
                            <X size={28} />
                        </button>
                    </div>

                    {/* Timeline Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Start Date</span>
                            <div className="flex items-center gap-2 text-gray-700 font-medium">
                                <Calendar size={16} className="text-blue-500" />
                                {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : 'Not set'}
                            </div>
                        </div>
                        <div>
                             <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Deadline</span>
                             <div className="flex items-center gap-2 text-gray-700 font-medium">
                                <Clock size={16} className="text-red-500" />
                                {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : 'No Deadline'}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-8">
                        {/* Description */}
                        <div>
                            <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
                                <AlignLeft size={20} className="text-gray-400" /> Description
                            </h4>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">
                                {selectedTask.description || <span className="italic text-gray-400">No description provided.</span>}
                            </p>
                        </div>

                        {/* Requirements */}
                        {selectedTask.requirements && (
                            <div>
                                <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
                                    <CheckSquare size={20} className="text-gray-400" /> Requirements
                                </h4>
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-gray-700 whitespace-pre-wrap ml-7">
                                    {selectedTask.requirements}
                                </div>
                            </div>
                        )}

                        {/* Links & Files */}
                        {(selectedTask.link || selectedTask.fileUrl || selectedTask.reference) && (
                            <div>
                                <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
                                    <Paperclip size={20} className="text-gray-400" /> Attachments & References
                                </h4>
                                <div className="flex flex-col gap-3 ml-7">
                                    {selectedTask.link && (
                                        <a href={selectedTask.link} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition group">
                                            <div className="bg-blue-100 p-2 rounded text-blue-600"><LinkIcon size={16} /></div>
                                            <span className="text-blue-600 font-medium truncate flex-1">{selectedTask.link}</span>
                                            <ExternalLink size={14} className="text-gray-400 group-hover:text-blue-500" />
                                        </a>
                                    )}
                                    {selectedTask.fileUrl && (
                                        <a href={selectedTask.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition group">
                                            <div className="bg-green-100 p-2 rounded text-green-600"><FileText size={16} /></div>
                                            <span className="text-green-700 font-medium truncate flex-1">Attached File</span>
                                            <ExternalLink size={14} className="text-gray-400 group-hover:text-green-500" />
                                        </a>
                                    )}
                                     {selectedTask.reference && (
                                         <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                                            <span className="font-bold block text-xs text-gray-400 uppercase mb-1">Reference Note</span>
                                            {selectedTask.reference}
                                         </div>
                                     )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer Actions */}
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={() => setSelectedTask(null)} className="px-6 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition">Close</button>
                    <button onClick={(e) => deleteTask(e, selectedTask.id)} className="px-6 py-2 rounded-lg font-bold bg-red-100 text-red-600 hover:bg-red-200 transition flex items-center gap-2">
                        <Trash2 size={16} /> Delete Task
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}