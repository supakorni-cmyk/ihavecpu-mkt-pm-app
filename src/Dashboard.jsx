import { useState, useEffect, useRef } from 'react';
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
import emailjs from '@emailjs/browser'; 
import { 
  MoreHorizontal, Plus, Calendar as CalendarIcon, Trash2, LogOut, Layout, ArrowRight, ArrowLeft,
  Paperclip, Link as LinkIcon, FileText, Clock, AlignLeft, CheckSquare, ExternalLink, X, Edit2,
  Save, Heart, ChevronLeft, ChevronRight, RefreshCw, Video, Home, PieChart, Activity, CheckCircle2,
  ListTodo, Presentation, Printer, Upload, Image as ImageIcon, GripVertical, LayoutTemplate, Camera,
  Loader2, Folder, Mail, Table, Download, Minus
} from 'lucide-react';

// --- CONSTANTS & HELPERS (Moved Outside Component) ---
const TAG_COLORS = { 
  'Planning': 'bg-pink-100 text-pink-600', 
  'Project': 'bg-purple-100 text-purple-600', 
  'Product Review': 'bg-blue-100 text-blue-600', 
  'Event': 'bg-yellow-100 text-yellow-600', 
  'Guest Speaker': 'bg-green-100 text-green-600' 
};

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'review', title: 'Review', color: 'bg-purple-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' }
];

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'No Date';

// Helper: Safely parse requirements
const getSafeRequirements = (task) => {
    if (!task || !task.requirements) return [];
    if (Array.isArray(task.requirements)) return task.requirements;
    if (typeof task.requirements === 'string') {
        return task.requirements.split('\n').filter(r => r.trim()).map((text, idx) => ({
            id: `legacy-${idx}`, text: text.replace(/^- /, ''), isDone: false, tableData: []
        }));
    }
    return []; // Fallback for unknown types
};

// --- SUB-COMPONENTS (Moved Outside to Prevent Crashes) ---

const RequirementSheetModal = ({ task, requirement, onClose }) => {
    const [newRow, setNewRow] = useState({ col1: '', col2: '', col3: '', notes: '' });

    const handleAddRow = () => {
        if(!newRow.col1 && !newRow.col2) return;
        const updatedReqs = task.requirements.map(r => {
            if (r.id === requirement.id) {
                return { ...r, tableData: [...(r.tableData || []), { id: Date.now(), ...newRow }] };
            }
            return r;
        });
        updateDoc(doc(db, 'tasks', task.id), { requirements: updatedReqs });
        setNewRow({ col1: '', col2: '', col3: '', notes: '' });
    };

    const handleDeleteRow = (rowId) => {
        const updatedReqs = task.requirements.map(r => {
            if (r.id === requirement.id) {
                return { ...r, tableData: r.tableData.filter(row => row.id !== rowId) };
            }
            return r;
        });
        updateDoc(doc(db, 'tasks', task.id), { requirements: updatedReqs });
    };

    const exportToCSV = () => {
        if (!requirement.tableData || requirement.tableData.length === 0) return alert("No data to export.");
        const headers = ["Item", "Description", "Status", "Notes"];
        const rows = requirement.tableData.map(row => [
            `"${(row.col1 || '').replace(/"/g, '""')}"`, `"${(row.col2 || '').replace(/"/g, '""')}"`,
            `"${(row.col3 || '').replace(/"/g, '""')}"`, `"${(row.notes || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${requirement.text}_table.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
                <div className="bg-green-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded"><Table size={24} /></div><div><h3 className="font-bold text-lg leading-tight">{requirement.text}</h3><p className="text-xs opacity-80 font-mono tracking-wide uppercase">Table for Task: {task.title}</p></div></div>
                    <div className="flex gap-3"><button onClick={exportToCSV} className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50 transition flex items-center gap-2"><Download size={16} /> Export CSV</button><button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white"><X size={24} /></button></div>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    <div className="bg-white border border-gray-300 shadow-sm min-w-[800px]">
                        <div className="flex border-b border-gray-300 bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                            <div className="w-12 p-3 text-center border-r border-gray-300">#</div><div className="flex-1 p-3 border-r border-gray-300">Item / Name</div><div className="flex-1 p-3 border-r border-gray-300">Description</div><div className="w-32 p-3 border-r border-gray-300">Status</div><div className="flex-1 p-3 border-r border-gray-300">Notes</div><div className="w-12 p-3"></div>
                        </div>
                        {(requirement.tableData || []).map((row, idx) => (
                            <div key={row.id} className="flex border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                                <div className="w-12 p-3 text-center border-r border-gray-200 bg-gray-50 text-gray-400 font-mono text-xs flex items-center justify-center">{idx + 1}</div>
                                <div className="flex-1 p-3 border-r border-gray-200 text-sm">{row.col1}</div><div className="flex-1 p-3 border-r border-gray-200 text-sm">{row.col2}</div><div className="w-32 p-3 border-r border-gray-200 text-sm">{row.col3}</div><div className="flex-1 p-3 border-r border-gray-200 text-sm text-gray-500 italic">{row.notes}</div>
                                <div className="w-12 p-3 flex items-center justify-center"><button onClick={() => handleDeleteRow(row.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></div>
                            </div>
                        ))}
                        <div className="flex border-b border-gray-200 bg-yellow-50/50">
                            <div className="w-12 p-3 text-center border-r border-gray-200 text-green-600 font-bold">+</div>
                            <div className="flex-1 border-r border-gray-200"><input type="text" placeholder="Item Name..." className="w-full h-full p-3 bg-transparent outline-none text-sm" value={newRow.col1} onChange={e => setNewRow({...newRow, col1: e.target.value})} /></div>
                            <div className="flex-1 border-r border-gray-200"><input type="text" placeholder="Details..." className="w-full h-full p-3 bg-transparent outline-none text-sm" value={newRow.col2} onChange={e => setNewRow({...newRow, col2: e.target.value})} /></div>
                            <div className="w-32 border-r border-gray-200"><input type="text" placeholder="Status..." className="w-full h-full p-3 bg-transparent outline-none text-sm" value={newRow.col3} onChange={e => setNewRow({...newRow, col3: e.target.value})} /></div>
                            <div className="flex-1 border-r border-gray-200"><input type="text" placeholder="Notes..." className="w-full h-full p-3 bg-transparent outline-none text-sm" value={newRow.notes} onChange={e => setNewRow({...newRow, notes: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleAddRow()} /></div>
                            <div className="w-12 p-2 flex items-center justify-center"><button onClick={handleAddRow} className="bg-green-600 text-white p-1 rounded hover:bg-green-700"><Plus size={16} /></button></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [currentView, setCurrentView] = useState('home'); 
  
  // Replace with your actual keys
  const EMAIL_SERVICE_ID = "YOUR_SERVICE_ID"; 
  const EMAIL_TEMPLATE_ID = "YOUR_TEMPLATE_ID"; 
  const EMAIL_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); 
  const [isEditing, setIsEditing] = useState(false); 
  const [editedTask, setEditedTask] = useState({}); 
  const [activeRequirement, setActiveRequirement] = useState(null); 
  
  const [newTask, setNewTask] = useState({
    title: '', tag: 'Planning', startDate: new Date().toISOString().split('T')[0],
    deadline: '', description: '', requirements: [], reference: '', link: '', imageUrl: '', fileUrl: ''
  });
  
  const [tempReqInput, setTempReqInput] = useState('');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // READ Tasks
  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setTasks(taskData);
    });
    return unsubscribe;
  }, []);

  // Sync Selected Task
  useEffect(() => {
    if (selectedTask) {
       const currentSelected = tasks.find(t => t.id === selectedTask.id);
       if (currentSelected && JSON.stringify(currentSelected) !== JSON.stringify(selectedTask)) {
           setSelectedTask(currentSelected);
       }
       if (activeRequirement && currentSelected) {
           const reqs = getSafeRequirements(currentSelected);
           const updatedReq = reqs.find(r => r.id === activeRequirement.id);
           if (updatedReq && JSON.stringify(updatedReq) !== JSON.stringify(activeRequirement)) {
               setActiveRequirement(updatedReq);
           }
       }
    }
  }, [tasks]);

  const sendEmail = (to, subject, body) => {
    if (EMAIL_SERVICE_ID === "YOUR_SERVICE_ID") return;
    const templateParams = { to_email: to, subject: subject, message: body, to_name: currentUser?.email?.split('@')[0] || 'User' };
    emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, EMAIL_PUBLIC_KEY).catch(e => console.error(e));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    const taskData = { ...newTask, status: 'todo', createdAt: new Date(), author: currentUser.email, dueNotificationSent: false };
    await addDoc(collection(db, 'tasks'), taskData);
    sendEmail(currentUser.email, `New Task: ${newTask.title}`, `Created: ${newTask.title}`);
    setNewTask({ title: '', tag: 'Planning', startDate: new Date().toISOString().split('T')[0], deadline: '', description: '', requirements: [], reference: '', link: '', imageUrl: '', fileUrl: '' });
    setTempReqInput('');
    setIsAddModalOpen(false);
  };

  const addRequirementLine = () => {
      if (!tempReqInput.trim()) return;
      setNewTask({ ...newTask, requirements: [...newTask.requirements, { id: Date.now().toString(), text: tempReqInput, isDone: false, tableData: [] }] });
      setTempReqInput('');
  };

  const removeRequirementLine = (index) => {
      const updated = [...newTask.requirements];
      updated.splice(index, 1);
      setNewTask({ ...newTask, requirements: updated });
  };

  const toggleRequirement = async (taskId, reqId, currentRequirements) => {
      const safeReqs = getSafeRequirements({ requirements: currentRequirements });
      const updatedReqs = safeReqs.map(r => r.id === reqId ? { ...r, isDone: !r.isDone } : r);
      await updateDoc(doc(db, 'tasks', taskId), { requirements: updatedReqs });
  };

  const moveTask = async (e, taskId, currentStatus, direction) => { e.stopPropagation(); const statusOrder = ['todo', 'inprogress', 'review', 'done']; const currentIndex = statusOrder.indexOf(currentStatus); let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1; if (nextIndex >= 0 && nextIndex < statusOrder.length) { await updateDoc(doc(db, 'tasks', taskId), { status: statusOrder[nextIndex] }); } };
  const deleteTask = async (e, id) => { e.stopPropagation(); if (confirm("Delete?")) { await deleteDoc(doc(db, 'tasks', id)); if (selectedTask?.id === id) setSelectedTask(null); } };
  const handleUpdateTask = async (e) => { e.preventDefault(); await updateDoc(doc(db, 'tasks', selectedTask.id), { ...editedTask }); setIsEditing(false); };

  const getTasksByStatus = (status) => tasks.filter(task => (status === 'todo' && (task.status === 'pending' || !task.status)) ? true : (status === 'done' && task.status === 'completed') ? true : task.status === status);

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
      <aside className="w-20 md:w-64 bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0 z-20 print:hidden">
        <div>
            <div className="p-6 flex items-center gap-3 mb-6"><div className="bg-blue-600 p-2 rounded-lg text-white"><Layout size={24} /></div><div className="hidden md:block"><h1 className="text-lg font-bold text-gray-900 leading-none">iHAVECPU</h1><span className="text-xs text-blue-600 font-bold tracking-wider">WORKSPACE</span></div></div>
            <nav className="px-3 space-y-2">
                {[{ id: 'home', icon: Home, label: 'Home' }, { id: 'board', icon: Layout, label: 'Board' }, { id: 'calendar', icon: CalendarIcon, label: 'Calendar' }, { id: 'report', icon: Presentation, label: 'Report' }, { id: 'album', icon: ImageIcon, label: 'Photo Album' }, { id: 'selfheal', icon: Heart, label: 'Self Heal' }].map(item => (
                    <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><item.icon size={20} /> <span className="hidden md:inline">{item.label}</span></button>
                ))}
            </nav>
        </div>
        <div className="p-4 border-t border-gray-100"><button onClick={() => {logout(); navigate('/');}} className="w-full flex items-center gap-2 text-gray-400 hover:text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition text-sm"><LogOut size={16} /> <span className="hidden md:inline">Log out</span></button></div>
      </aside>

      <main className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white relative">
        {currentView === 'home' && <div className="p-10">Home View</div>} 
        {/* Note: View components truncated for brevity in this fix block, normally they would be imported or defined below. 
            For the Board view fix, see below logic. */}
        {currentView === 'board' && (
            <div className="flex flex-col h-full w-full">
                <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10"><h2 className="text-2xl font-bold text-gray-800">Marketing Sprint</h2><button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"><Plus size={18} /> New Task</button></header>
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 pt-6"><div className="flex gap-6 h-full min-w-full">{COLUMNS.map(col => (<div key={col.id} className="flex-1 min-w-[300px] flex flex-col h-full"><div className="flex items-center justify-between mb-4 px-1"><div className="flex items-center gap-2"><h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider">{col.title}</h3><span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">{getTasksByStatus(col.id).length}</span></div><MoreHorizontal size={16} className="text-gray-300" /></div><div className={`flex-1 rounded-2xl p-2 ${col.color} overflow-y-auto custom-scrollbar`}><div className="flex flex-col gap-3 pb-2">{getTasksByStatus(col.id).map(task => (<div key={task.id} onClick={() => { setSelectedTask(task); setIsEditing(false); }} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer"><div className="flex justify-between items-start mb-3"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${TAG_COLORS[task.tag] || 'bg-gray-100 text-gray-500'}`}>{task.tag}</span><button onClick={(e) => deleteTask(e, task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14} /></button></div><h4 className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed line-clamp-2">{task.title}</h4>{task.requirements && (<div className="mb-3"><div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1"><CheckSquare size={12} className="text-green-600" /><span>Requirements</span></div><div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full w-1/2"></div></div></div>)}<div className="flex items-center justify-between pt-3 border-t border-gray-50"><div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium"><Clock size={12} /><span>{formatDate(task.deadline)}</span></div></div></div>))}</div></div></div>))}</div></div>
            </div>
        )}
      </main>

      {/* Task Details Modal */}
      {selectedTask && !isChecklistModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                            {!isEditing ? (
                                <><div className="flex items-center gap-3 mb-3"><span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${TAG_COLORS[selectedTask.tag]}`}>{selectedTask.tag}</span></div><h2 className="text-3xl font-bold text-gray-900">{selectedTask.title}</h2></>
                            ) : (<input type="text" className="w-full border p-2" value={editedTask.title} onChange={e => setEditedTask({...editedTask, title: e.target.value})} />)}
                        </div>
                        <div className="flex gap-2">
                            {!isEditing ? <button onClick={() => { setEditedTask(selectedTask); setIsEditing(true); }} className="p-2 hover:bg-blue-50 text-blue-600 rounded"><Edit2 size={20} /></button> : <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>}
                            <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-gray-100 rounded"><X size={24} /></button>
                        </div>
                    </div>
                    {!isEditing ? (
                        <div className="space-y-8">
                            <div>
                                <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4"><CheckSquare size={20} className="text-green-600" /> Requirements Checklist</h4>
                                <div className="space-y-3 ml-1">
                                    {getSafeRequirements(selectedTask).map((req) => (
                                        <div key={req.id} className="flex items-start gap-3 group">
                                            <input type="checkbox" checked={req.isDone} onChange={() => toggleRequirement(selectedTask.id, req.id, selectedTask.requirements)} className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer" />
                                            <div className="flex-1"><span onClick={() => setActiveRequirement(req)} className={`text-sm font-medium cursor-pointer transition px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-600 ${req.isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{req.text}</span></div>
                                            <button onClick={() => setActiveRequirement(req)} className="text-blue-500 text-xs font-bold hover:underline">Open Table</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (<form onSubmit={handleUpdateTask}><button type="submit" className="w-full py-3 rounded bg-blue-600 text-white">Save Changes</button></form>)}
                </div>
            </div>
        </div>
      )}

      {/* Requirement Sheet Modal */}
      {activeRequirement && selectedTask && (
          <RequirementSheetModal task={selectedTask} requirement={activeRequirement} onClose={() => setActiveRequirement(null)} />
      )}
    </div>
  );
}