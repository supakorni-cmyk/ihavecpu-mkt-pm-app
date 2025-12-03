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
  MoreHorizontal, 
  Plus, 
  Calendar as CalendarIcon, 
  Trash2, 
  LogOut, 
  Layout, 
  ArrowRight,
  ArrowLeft,
  Paperclip,
  Link as LinkIcon,
  FileText,
  Clock,
  AlignLeft,
  CheckSquare,
  ExternalLink,
  X,
  Edit2,
  Save,
  Heart,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Video,
  Home,
  PieChart,
  Activity,
  CheckCircle2,
  ListTodo,
  Presentation,
  Printer,
  Upload,
  Image as ImageIcon,
  GripVertical,
  LayoutTemplate,
  Camera,
  Loader2,
  Folder,
  Mail,
  Table,
  Download,
  Minus
} from 'lucide-react';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [currentView, setCurrentView] = useState('home'); 
  
  // --- EMAILJS CONFIGURATION ---
  // Replace with your actual keys
  const EMAIL_SERVICE_ID = "YOUR_SERVICE_ID"; 
  const EMAIL_TEMPLATE_ID = "YOUR_TEMPLATE_ID"; 
  const EMAIL_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); 
  const [isEditing, setIsEditing] = useState(false); 
  const [editedTask, setEditedTask] = useState({}); 
  const [activeRequirement, setActiveRequirement] = useState(null); // For Sheet View
  
  // Form States
  const [newTask, setNewTask] = useState({
    title: '',
    tag: 'Planning',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    description: '',
    requirements: [], 
    reference: '',
    link: '',
    imageUrl: '',
    fileUrl: ''
  });
  
  // Helper state for adding requirements in the modal
  const [tempReqInput, setTempReqInput] = useState('');

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // --- 1. READ: Fetch tasks ---
  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setTasks(taskData);
      
      // Update selectedTask live if open
      if (selectedTask) {
         const currentSelected = taskData.find(t => t.id === selectedTask.id);
         if (currentSelected) {
             setSelectedTask(currentSelected);
             if (activeRequirement) {
                 const updatedReq = Array.isArray(currentSelected.requirements) 
                    ? currentSelected.requirements.find(r => r.id === activeRequirement.id) 
                    : null;
                 if (updatedReq) setActiveRequirement(updatedReq);
             }
         }
      }
    });
    return unsubscribe;
  }, [selectedTask, activeRequirement]);

  // --- EMAIL LOGIC ---
  const sendEmail = (to, subject, body) => {
    if (EMAIL_SERVICE_ID === "YOUR_SERVICE_ID") {
        console.warn("EmailJS keys not set.");
        return;
    }
    const templateParams = {
        to_email: to,
        subject: subject,
        message: body,
        to_name: currentUser?.email?.split('@')[0] || 'User'
    };
    emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, EMAIL_PUBLIC_KEY)
      .then((response) => console.log('SUCCESS! Email sent.', response.status, response.text), 
            (err) => console.error('FAILED to send email.', err));
  };

  // --- DUE DATE MONITORING ---
  useEffect(() => {
    if (!currentUser || tasks.length === 0) return;
    const checkDueDates = () => {
        const today = new Date();
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(today.getDate() + 2); 

        tasks.forEach(async (task) => {
            if (task.deadline && task.status !== 'done' && !task.dueNotificationSent) {
                const dueDate = new Date(task.deadline);
                const isApproaching = dueDate >= today && dueDate <= twoDaysFromNow;
                const isOverdue = dueDate < today;

                if (isApproaching || isOverdue) {
                    const statusMsg = isOverdue ? "OVERDUE" : "due soon";
                    sendEmail(
                        currentUser.email,
                        `URGENT: "${task.title}" is ${statusMsg}`,
                        `Hello,\n\nYour task "${task.title}" is currently ${statusMsg}.\nDue Date: ${formatDate(task.deadline)}.\n\nPlease update the status on your dashboard.`
                    );
                    try { await updateDoc(doc(db, 'tasks', task.id), { dueNotificationSent: true }); } catch (err) { console.error(err); }
                }
            }
        });
    };
    const timeoutId = setTimeout(checkDueDates, 5000); 
    return () => clearTimeout(timeoutId);
  }, [tasks, currentUser]);

  // --- 2. CREATE: Add Task ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;

    const taskData = {
      ...newTask,
      status: 'todo',
      createdAt: new Date(),
      author: currentUser.email,
      dueNotificationSent: false 
    };

    await addDoc(collection(db, 'tasks'), taskData);

    sendEmail(
        currentUser.email,
        `New Task: ${newTask.title}`,
        `A new task has been created.\nTitle: ${newTask.title}\nCategory: ${newTask.tag}\nDue Date: ${newTask.deadline ? formatDate(newTask.deadline) : 'None'}`
    );

    setNewTask({
        title: '', tag: 'Planning', startDate: new Date().toISOString().split('T')[0],
        deadline: '', description: '', requirements: [], reference: '', link: '', imageUrl: '', fileUrl: ''
    });
    setTempReqInput('');
    setIsAddModalOpen(false);
  };

  const addRequirementLine = () => {
      if (!tempReqInput.trim()) return;
      const newReq = { id: Date.now().toString(), text: tempReqInput, isDone: false, tableData: [] };
      setNewTask({ ...newTask, requirements: [...newTask.requirements, newReq] });
      setTempReqInput('');
  };

  const removeRequirementLine = (index) => {
      const updated = [...newTask.requirements];
      updated.splice(index, 1);
      setNewTask({ ...newTask, requirements: updated });
  };

  // --- 3. UPDATE Logic ---
  const toggleRequirement = async (taskId, reqId, currentRequirements) => {
      let updatedReqs = [];
      if (typeof currentRequirements === 'string') {
          // Migration for legacy string data
          updatedReqs = currentRequirements.split('\n').filter(r => r.trim()).map((text, idx) => ({
              id: Date.now() + idx + '', text: text.replace(/^- /, ''), isDone: false, tableData: []
          }));
      } else {
          updatedReqs = currentRequirements.map(r => r.id === reqId ? { ...r, isDone: !r.isDone } : r);
      }
      await updateDoc(doc(db, 'tasks', taskId), { requirements: updatedReqs });
  };

  const addTableRow = async (taskId, reqId, rowData) => {
      const updatedReqs = selectedTask.requirements.map(r => {
          if (r.id === reqId) return { ...r, tableData: [...(r.tableData || []), { id: Date.now(), ...rowData }] };
          return r;
      });
      await updateDoc(doc(db, 'tasks', taskId), { requirements: updatedReqs });
  };

  const deleteTableRow = async (taskId, reqId, rowId) => {
      const updatedReqs = selectedTask.requirements.map(r => {
          if (r.id === reqId) return { ...r, tableData: r.tableData.filter(row => row.id !== rowId) };
          return r;
      });
      await updateDoc(doc(db, 'tasks', taskId), { requirements: updatedReqs });
  };

  const exportToCSV = (req) => {
      if (!req.tableData || req.tableData.length === 0) return alert("No data to export.");
      const headers = ["Item", "Description", "Status", "Notes"];
      const rows = req.tableData.map(row => [
          `"${(row.col1 || '').replace(/"/g, '""')}"`, `"${(row.col2 || '').replace(/"/g, '""')}"`,
          `"${(row.col3 || '').replace(/"/g, '""')}"`, `"${(row.notes || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${req.text}_table.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getSafeRequirements = (task) => {
      if (!task.requirements) return [];
      if (Array.isArray(task.requirements)) return task.requirements;
      return task.requirements.split('\n').filter(r => r.trim()).map((text, idx) => ({
          id: `legacy-${idx}`, text: text.replace(/^- /, ''), isDone: false, tableData: []
      }));
  };

  const moveTask = async (e, taskId, currentStatus, direction) => { 
      e.stopPropagation(); 
      const statusOrder = ['todo', 'inprogress', 'review', 'done']; 
      const currentIndex = statusOrder.indexOf(currentStatus); 
      if (currentIndex === -1) { await updateDoc(doc(db, 'tasks', taskId), { status: 'todo' }); return; } 
      let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1; 
      if (nextIndex >= 0 && nextIndex < statusOrder.length) { await updateDoc(doc(db, 'tasks', taskId), { status: statusOrder[nextIndex] }); } 
  };
  
  const deleteTask = async (e, id) => { 
      e.stopPropagation(); 
      if (confirm("Delete task?")) { await deleteDoc(doc(db, 'tasks', id)); if (selectedTask?.id === id) setSelectedTask(null); } 
  };
  
  const handleLogout = async () => { await logout(); navigate('/'); };
  const startEditing = () => { setEditedTask(selectedTask); setIsEditing(true); };
  const handleUpdateTask = async (e) => { e.preventDefault(); await updateDoc(doc(db, 'tasks', selectedTask.id), { ...editedTask }); setIsEditing(false); };
  
  const columns = [{ id: 'todo', title: 'To Do', color: 'bg-gray-100' }, { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50' }, { id: 'review', title: 'Review', color: 'bg-purple-50' }, { id: 'done', title: 'Done', color: 'bg-green-50' }];
  const tagColors = { 'Planning': 'bg-pink-100 text-pink-600', 'Project': 'bg-purple-100 text-purple-600', 'Product Review': 'bg-blue-100 text-blue-600', 'Event': 'bg-yellow-100 text-yellow-600', 'Guest Speaker': 'bg-green-100 text-green-600' };
  const getTasksByStatus = (status) => tasks.filter(task => (status === 'todo' && (task.status === 'pending' || !task.status)) ? true : (status === 'done' && task.status === 'completed') ? true : task.status === status);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'No Date';

  // --- SUB-COMPONENTS ---

  const RequirementSheetModal = ({ task, requirement, onClose }) => {
      const [newRow, setNewRow] = useState({ col1: '', col2: '', col3: '', notes: '' });
      const handleAddRow = () => {
          if(!newRow.col1 && !newRow.col2) return;
          addTableRow(task.id, requirement.id, newRow);
          setNewRow({ col1: '', col2: '', col3: '', notes: '' });
      };
      return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
                  <div className="bg-green-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                      <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded"><Table size={24} /></div><div><h3 className="font-bold text-lg leading-tight">{requirement.text}</h3><p className="text-xs opacity-80 font-mono tracking-wide uppercase">Table for Task: {task.title}</p></div></div>
                      <div className="flex gap-3"><button onClick={() => exportToCSV(requirement)} className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50 transition flex items-center gap-2"><Download size={16} /> Export CSV</button><button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white"><X size={24} /></button></div>
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
                                  <div className="w-12 p-3 flex items-center justify-center"><button onClick={() => deleteTableRow(task.id, requirement.id, row.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></div>
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

  const HomeView = () => {
    const totalTasks = tasks.length;
    const completedTasks = getTasksByStatus('done').length;
    const inProgressTasks = getTasksByStatus('inprogress').length;
    const reviewTasks = getTasksByStatus('review').length;
    const todoTasks = getTasksByStatus('todo').length;
    const tagCounts = tasks.reduce((acc, task) => { acc[task.tag] = (acc[task.tag] || 0) + 1; return acc; }, {});
    const maxTagCount = Math.max(...Object.values(tagCounts), 1);

    return (
        <div className="p-6 md:p-10 h-full w-full overflow-y-auto bg-gray-50/50">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-end"><div><h2 className="text-3xl font-bold text-gray-800">Welcome Back!</h2><p className="text-gray-500 mt-1">Project overview.</p></div><div className="text-right hidden sm:block"><p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Today</p><p className="text-xl font-bold text-gray-800">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition"><div className="flex justify-between items-start"><div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><ListTodo size={24} /></div><span className="text-xs font-bold text-gray-400 uppercase">Total Tasks</span></div><div><span className="text-3xl font-bold text-gray-800">{totalTasks}</span><span className="text-sm text-gray-400 ml-2">tasks</span></div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition"><div className="flex justify-between items-start"><div className="bg-green-50 text-green-600 p-2 rounded-lg"><CheckCircle2 size={24} /></div><span className="text-xs font-bold text-gray-400 uppercase">Completed</span></div><div><span className="text-3xl font-bold text-gray-800">{completedTasks}</span><span className="text-sm text-gray-400 ml-2">finished</span></div></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-gray-800 mb-6">Task Status</h3><div className="flex items-end justify-between h-64 gap-4">{[{ label: 'To Do', count: todoTasks, color: 'bg-gray-200' }, { label: 'In Progress', count: inProgressTasks, color: 'bg-blue-500' }, { label: 'Review', count: reviewTasks, color: 'bg-purple-500' }, { label: 'Done', count: completedTasks, color: 'bg-green-500' }].map((stat) => (<div key={stat.label} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group"><div className="font-bold text-gray-800 mb-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">{stat.count}</div><div className={`w-full rounded-t-xl transition-all duration-500 ${stat.color} hover:opacity-90`} style={{ height: `${totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0}%`, minHeight: '8px' }}></div><div className="text-xs font-bold text-gray-400 uppercase text-center mt-2">{stat.label}</div></div>))}</div></div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-gray-800 mb-6">Workload</h3><div className="space-y-5">{Object.keys(tagColors).map((tag) => { const count = tagCounts[tag] || 0; return (<div key={tag}><div className="flex justify-between text-sm font-bold mb-2"><span className="text-gray-600">{tag}</span><span className="text-gray-400">{count} Tasks</span></div><div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${tagColors[tag].split(' ')[0]}`} style={{ width: `${(count / maxTagCount) * 100}%` }}></div></div></div>) })}</div></div>
                </div>
            </div>
        </div>
    );
  };

  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const getTasksForDay = (day) => {
        const currentDayDate = new Date(year, month, day);
        currentDayDate.setHours(0,0,0,0);
        return tasks.filter(task => {
            if (!task.startDate || !task.deadline) return false;
            const start = new Date(task.startDate); const end = new Date(task.deadline);
            start.setHours(0,0,0,0); end.setHours(0,0,0,0);
            return currentDayDate >= start && currentDayDate <= end;
        });
    };

    return (
        <div className="p-6 h-full w-full flex flex-col">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarIcon className="text-blue-600" />{monthNames[month]} {year}</h2><div className="flex gap-2"><button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button><button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight /></button></div></div>
            <div className="flex-1 border rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="grid grid-cols-7 bg-gray-50 border-b">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="p-3 text-center text-sm font-bold text-gray-500 uppercase tracking-wide">{day}</div>)}</div>
                <div className="grid grid-cols-7 auto-rows-fr h-full bg-gray-50 gap-px border-gray-200">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="bg-white min-h-[100px]"></div>)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1; const dayTasks = getTasksForDay(day);
                        return (<div key={day} className="bg-white p-2 min-h-[100px] hover:bg-gray-50 transition relative"><div className="text-sm font-medium mb-1 text-gray-700">{day}</div><div className="flex flex-col gap-1 overflow-y-auto max-h-[80px]">{dayTasks.map(task => (<div key={task.id} onClick={() => { setSelectedTask(task); setIsEditing(false); }} className={`text-[10px] truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 ${tagColors[task.tag] ? tagColors[task.tag].replace('text-', 'bg-').split(' ')[0] + ' text-gray-700' : 'bg-gray-100'}`}>{task.title}</div>))}</div></div>);
                    })}
                </div>
            </div>
        </div>
    );
  };

  const PhotoAlbumView = () => {
    const [albums, setAlbums] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [currentAlbum, setCurrentAlbum] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState('');

    useEffect(() => { const u = onSnapshot(query(collection(db, 'albums'), orderBy('createdAt', 'desc')), (s) => setAlbums(s.docs.map(d => ({...d.data(), id: d.id})))); return u; }, []);
    useEffect(() => { const u = onSnapshot(query(collection(db, 'photos'), orderBy('createdAt', 'desc')), (s) => setPhotos(s.docs.map(d => ({...d.data(), id: d.id})))); return u; }, []);

    const createAlbum = async (e) => { e.preventDefault(); if (!newAlbumName) return; await addDoc(collection(db, 'albums'), { name: newAlbumName, createdAt: new Date(), createdBy: currentUser.email }); setNewAlbumName(''); setIsCreatingAlbum(false); };
    const handleUpload = async (e) => {
        const file = e.target.files[0]; if (!file || file.size > 2e6) return alert("File too large"); setUploading(true);
        const reader = new FileReader(); reader.onloadend = async () => { await addDoc(collection(db, 'photos'), { url: reader.result, name: file.name, createdAt: new Date(), uploader: currentUser.email, albumId: currentAlbum.id }); setUploading(false); }; reader.readAsDataURL(file);
    };
    const handleDeletePhoto = async (id) => { if (confirm("Delete photo?")) await deleteDoc(doc(db, 'photos', id)); };
    const handleDeleteAlbum = async (e, id) => { e.stopPropagation(); if (confirm("Delete album?")) { await deleteDoc(doc(db, 'albums', id)); if (currentAlbum?.id === id) setCurrentAlbum(null); } };
    const albumPhotos = photos.filter(p => p.albumId === currentAlbum?.id);

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-50/50 overflow-y-auto"><div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">{currentAlbum && <button onClick={() => setCurrentAlbum(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><ArrowLeft size={24} /></button>}<div><h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">{currentAlbum ? <><Folder className="text-purple-600" /> {currentAlbum.name}</> : <><ImageIcon className="text-purple-600" /> Photo Albums</>}</h2></div></div>
                {!currentAlbum ? <div className="relative">{isCreatingAlbum ? <form onSubmit={createAlbum} className="flex gap-2"><input autoFocus type="text" placeholder="Album Name" className="border rounded-lg px-3 py-2 text-sm" value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)} /><button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button></form> : <button onClick={() => setIsCreatingAlbum(true)} className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg"><Plus size={20} /> Create Album</button>}</div> : <div className="relative"><input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={uploading} /><button className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg">{uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />} Upload</button></div>}
            </div>
            {!currentAlbum ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{albums.map(album => (<div key={album.id} onClick={() => setCurrentAlbum(album)} className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center aspect-square relative"><Folder size={64} className="text-purple-200 group-hover:text-purple-300 transition mb-4" /><h3 className="font-bold text-gray-700 text-center">{album.name}</h3><button onClick={(e) => handleDeleteAlbum(e, album.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button></div>))}</div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{albumPhotos.map(photo => (<div key={photo.id} className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition aspect-square"><img src={photo.url} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2"><a href={photo.url} download={photo.name} className="p-2 bg-white/20 text-white rounded-full"><ExternalLink size={20} /></a><button onClick={() => handleDeletePhoto(photo.id)} className="p-2 bg-red-500/80 text-white rounded-full"><Trash2 size={20} /></button></div></div>))}</div>}
        </div></div>
    );
  };

  const SelfHealView = () => {
    const videos = ["jfKfPfyJRdk", "eKFTSSKCzWA", "inpok4MKVLM", "Dx5qFachd3A", "tEmt1Znux58", "lTRiuFIWV54"];
    const [currentVideoId, setCurrentVideoId] = useState(videos[0]);
    return (<div className="h-full w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50"><div className="text-center mb-8"><h2 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3"><Heart className="text-pink-500 fill-pink-500" size={32} />Self Heal & Relax</h2></div><div className="w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden mb-8 border-4 border-white"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`} title="YouTube" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div><button onClick={() => setCurrentVideoId(videos[Math.floor(Math.random() * videos.length)])} className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl font-bold text-indigo-600"><RefreshCw size={20} /> Change Atmosphere</button></div>);
  };

  const ReportView = () => {
    const [pages, setPages] = useState([{ id: 1, title: 'Marketing Strategy Report', bodyText: 'Summarize key points...', image: null, image2: null, template: '1-landscape' }]);
    const [activePageId, setActivePageId] = useState(1);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const activePage = pages.find(p => p.id === activePageId) || pages[0];
    const updatePage = (field, value) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, [field]: value } : p));
    const handleImageUpload = (e, slot) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => updatePage(slot, reader.result); reader.readAsDataURL(file); } };
    const handleSort = () => { let _pages = [...pages]; const item = _pages.splice(dragItem.current, 1)[0]; _pages.splice(dragOverItem.current, 0, item); setPages(_pages); };
    
    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-100 overflow-y-auto">
            <div className="max-w-5xl mx-auto mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2"><Presentation className="text-blue-600" /> Presentation Builder</h2><div className="flex gap-3"><button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"><Printer size={18} /> Export PDF</button></div></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><div className="flex justify-between items-center mb-4"><label className="text-xs font-bold text-gray-500 uppercase">Slides</label><button onClick={() => { const newId = Date.now(); setPages([...pages, { id: newId, title: 'New Slide', bodyText: '', image: null, template: '1-landscape' }]); setActivePageId(newId); }} className="text-blue-600 text-xs font-bold flex items-center gap-1"><Plus size={14} /> Add Slide</button></div><div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">{pages.map((p, idx) => (<div key={p.id} draggable onDragStart={() => (dragItem.current = idx)} onDragEnter={() => (dragOverItem.current = idx)} onDragEnd={handleSort} onClick={() => setActivePageId(p.id)} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer ${activePageId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}><div className="flex items-center gap-2"><GripVertical size={16} /><span className="text-sm font-medium truncate">#{idx+1} {p.title}</span></div><button onClick={(e) => { e.stopPropagation(); if (pages.length > 1) setPages(pages.filter(pg => pg.id !== p.id)); }} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button></div>))}</div></div>
                    </div>
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3"><Edit2 size={16} /> Edit Slide</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Title</label><input type="text" value={activePage.title} onChange={(e) => updatePage('title', e.target.value)} className="w-full border rounded-lg p-3" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template</label><select value={activePage.template} onChange={(e) => updatePage('template', e.target.value)} className="w-full border rounded-lg p-3"><option value="1-landscape">1 Landscape</option><option value="2-landscape">2 Landscape</option><option value="1-portrait">1 Portrait</option><option value="2-portrait">2 Portrait</option></select></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Content</label><textarea value={activePage.bodyText} onChange={(e) => updatePage('bodyText', e.target.value)} className="w-full border rounded-lg p-3 h-20 resize-none" /></div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-4"><div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><Upload className="mx-auto text-gray-400" size={24} /><span className="text-xs text-gray-500">Image 1</span></div>{activePage.template.startsWith('2') && <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image2')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><Upload className="mx-auto text-gray-400" size={24} /><span className="text-xs text-gray-500">Image 2</span></div>}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="space-y-8 print:space-y-0">
                {pages.map((page, index) => (
                    <div key={page.id} className="max-w-5xl mx-auto bg-white aspect-video shadow-2xl rounded-xl overflow-hidden relative print:shadow-none print:w-full print:h-screen print:rounded-none flex flex-col print:break-after-page">
                        <div className="h-24 bg-gray-900 text-white flex items-center px-10 justify-between"><div></div><span className="text-xl font-black">iHAVECPU</span></div>
                        <div className="flex-1 p-10 flex gap-8">
                            <div className="flex-1 flex flex-col justify-center space-y-6"><div><h2 className="text-5xl font-extrabold text-gray-800 leading-tight">{page.title}</h2></div><div className="pt-4"><p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">{page.bodyText}</p></div></div>
                            <div className="flex-1 h-full flex flex-col gap-4">
                                {page.template === '1-landscape' && (<div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image ? <img src={page.image} className="w-full h-full object-cover" /> : <ImageIcon size={48} className="text-gray-300" />}</div>)}
                                {page.template === '2-landscape' && (<><div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div><div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image2 && <img src={page.image2} className="w-full h-full object-cover" />}</div></>)}
                                {page.template === '1-portrait' && (<div className="flex-1 flex justify-center h-full"><div className="h-full aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div></div>)}
                                {page.template === '2-portrait' && (<div className="flex-1 flex gap-4 h-full"><div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div><div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image2 && <img src={page.image2} className="w-full h-full object-cover" />}</div></div>)}
                            </div>
                        </div>
                        <div className="bg-gray-50 border-t border-gray-100 p-4 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">Confidential • Internal Use Only • Slide {index + 1}</div>
                    </div>
                ))}
            </div>
            <style>{`@media print { @page { size: landscape; margin: 0; } body { -webkit-print-color-adjust: exact; } aside, nav, .print\\:hidden { display: none !important; } main { width: 100vw; height: auto; overflow: visible; background: white; } .p-6, .md\\:p-10 { padding: 0 !important; } .print\\:break-after-page { break-after: page; height: 100vh; width: 100vw; border-radius: 0; } }`}</style>
        </div>
    );
  };

  // --- MAIN RENDER ---
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
        <div className="p-4 border-t border-gray-100"><button onClick={handleLogout} className="w-full flex items-center gap-2 text-gray-400 hover:text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition text-sm"><LogOut size={16} /> <span className="hidden md:inline">Log out</span></button></div>
      </aside>

      <main className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white relative">
        {currentView === 'home' && <HomeView />}
        {currentView === 'board' && (
            <div className="flex flex-col h-full w-full">
                <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10"><h2 className="text-2xl font-bold text-gray-800">Marketing Sprint</h2><button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"><Plus size={18} /> New Task</button></header>
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 pt-6"><div className="flex gap-6 h-full min-w-full">{columns.map(col => (<div key={col.id} className="flex-1 min-w-[300px] flex flex-col h-full"><div className="flex items-center justify-between mb-4 px-1"><div className="flex items-center gap-2"><h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider">{col.title}</h3><span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">{getTasksByStatus(col.id).length}</span></div><MoreHorizontal size={16} className="text-gray-300" /></div><div className={`flex-1 rounded-2xl p-2 ${col.color} overflow-y-auto custom-scrollbar`}><div className="flex flex-col gap-3 pb-2">{getTasksByStatus(col.id).map(task => (<div key={task.id} onClick={() => { setSelectedTask(task); setIsEditing(false); }} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer"><div className="flex justify-between items-start mb-3"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${tagColors[task.tag] || 'bg-gray-100 text-gray-500'}`}>{task.tag}</span><button onClick={(e) => deleteTask(e, task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14} /></button></div><h4 className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed line-clamp-2">{task.title}</h4>{/* Requirements Preview */}{task.requirements && (<div className="mb-3"><div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1"><CheckSquare size={12} className="text-green-600" /><span>Requirements</span></div><div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full w-1/2"></div></div></div>)}<div className="flex items-center justify-between pt-3 border-t border-gray-50"><div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium"><Clock size={12} /><span>{formatDate(task.deadline)}</span></div><div className="flex gap-1">{col.id !== 'todo' && <button onClick={(e) => moveTask(e, task.id, task.status || 'todo', 'prev')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><ArrowLeft size={14} /></button>}{col.id !== 'done' && <button onClick={(e) => moveTask(e, task.id, task.status || 'todo', 'next')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><ArrowRight size={14} /></button>}</div></div></div>))}</div></div></div>))}</div></div>
            </div>
        )}
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'album' && <PhotoAlbumView />}
        {currentView === 'selfheal' && <SelfHealView />}
        {currentView === 'report' && <ReportView />}
      </main>

      {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-gray-800">Create New Task</h3><button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={24} /></button></div><form onSubmit={handleAddTask} className="flex flex-col gap-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input autoFocus type="text" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium" placeholder="Task Title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} /><select className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" value={newTask.tag} onChange={e => setNewTask({...newTask, tag: e.target.value})}><option value="Planning">Planning</option><option value="Project">Project</option><option value="Product Review">Product Review</option><option value="Event">Event</option><option value="Guest Speaker">Guest Speaker</option></select></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input type="date" className="w-full border-2 border-blue-200 bg-blue-50 rounded-lg px-4 py-3 font-bold" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Requirements List</label><div className="flex gap-2 mb-2"><input type="text" placeholder="Add requirement..." className="flex-1 border-gray-200 bg-gray-50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={tempReqInput} onChange={e => setTempReqInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirementLine())} /><button type="button" onClick={addRequirementLine} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition"><Plus size={20} /></button></div><div className="space-y-2 max-h-32 overflow-y-auto">{newTask.requirements.map((req, idx) => (<div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100"><span className="text-sm text-gray-700">{req.text}</span><button type="button" onClick={() => removeRequirementLine(idx)} className="text-gray-400 hover:text-red-500"><X size={14} /></button></div>))}</div></div><button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition">Create Task</button></form></div></div>
      )}

      {selectedTask && !isChecklistModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setSelectedTask(null); setIsEditing(false); }}><div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 flex flex-col" onClick={e => e.stopPropagation()}><div className="p-8"><div className="flex justify-between items-start mb-6"><div className="flex-1">{!isEditing ? (<><div className="flex items-center gap-3 mb-3"><span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${tagColors[selectedTask.tag] || 'bg-gray-100'}`}>{selectedTask.tag}</span><span className="text-gray-400 text-xs flex items-center gap-1"><Clock size={12} /> Created {formatDate(selectedTask.createdAt?.seconds ? new Date(selectedTask.createdAt.seconds * 1000) : selectedTask.createdAt)}</span></div><h2 className="text-3xl font-bold text-gray-900 leading-tight">{selectedTask.title}</h2></>) : (<input type="text" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-2 text-xl font-bold" value={editedTask.title} onChange={e => setEditedTask({...editedTask, title: e.target.value})} />)}</div><div className="flex gap-2 ml-4">{!isEditing ? <button onClick={startEditing} className="p-2 hover:bg-blue-50 text-blue-600 rounded-full transition"><Edit2 size={20} /></button> : <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>}<button onClick={() => { setSelectedTask(null); setIsEditing(false); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"><X size={24} /></button></div></div>{!isEditing ? (<div className="space-y-8"><div><h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4"><CheckSquare size={20} className="text-green-600" /> Requirements Checklist</h4><div className="space-y-3 ml-1">{getSafeRequirements(selectedTask).length === 0 && <p className="text-gray-400 italic text-sm">No requirements added.</p>}{getSafeRequirements(selectedTask).map((req) => (<div key={req.id} className="flex items-start gap-3 group"><input type="checkbox" checked={req.isDone} onChange={() => toggleRequirement(selectedTask.id, req.id, selectedTask.requirements)} className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer" /><div className="flex-1"><span onClick={() => setActiveRequirement(req)} className={`text-sm font-medium cursor-pointer transition px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-600 ${req.isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`} title="Click to open detailed table">{req.text}</span>{req.tableData && req.tableData.length > 0 && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{req.tableData.length} items</span>}</div><button onClick={() => setActiveRequirement(req)} className="text-blue-500 opacity-0 group-hover:opacity-100 transition text-xs font-bold hover:underline">Open Table</button></div>))}</div></div><div><h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3"><AlignLeft size={20} className="text-gray-400" /> Description</h4><p className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">{selectedTask.description || <span className="italic text-gray-400">No description provided.</span>}</p></div></div>) : (<form onSubmit={handleUpdateTask} className="flex flex-col gap-6"><div className="p-4 bg-yellow-50 text-yellow-700 text-sm rounded-lg">To edit Requirements or their Tables, please use the View mode interaction.</div><textarea className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 min-h-[100px]" value={editedTask.description} onChange={e => setEditedTask({...editedTask, description: e.target.value})} placeholder="Description..." /><button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"><Save size={18} /> Save Changes</button></form>)}</div></div></div>
      )}

      {activeRequirement && selectedTask && (
          <RequirementSheetModal task={selectedTask} requirement={activeRequirement} onClose={() => setActiveRequirement(null)} />
      )}
    </div>
  );
}