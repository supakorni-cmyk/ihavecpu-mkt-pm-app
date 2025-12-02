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
import emailjs from '@emailjs/browser'; // IMPORT EMAILJS
import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, 
  Computer,
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
  Folder
} from 'lucide-react';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'board', 'calendar', 'selfheal', 'report', 'album'
  
 // --- EMAILJS CONFIGURATION ---
  // REPLACE THESE WITH YOUR ACTUAL KEYS FROM EMAILJS DASHBOARD
  const EMAIL_SERVICE_ID = "service_ld9gdun"; 
  const EMAIL_TEMPLATE_ID = "template_y1drpcl"; 
  const EMAIL_PUBLIC_KEY = "jDQgm1SiqFlSBF9d3";


  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // For viewing details
  const [isEditing, setIsEditing] = useState(false); // Edit mode toggle
  const [editedTask, setEditedTask] = useState({}); // State for editing
  
  // Form States
  const [newTask, setNewTask] = useState({
    title: '',
    tag: 'Planning',
    startDate: new Date().toISOString().split('T')[0],
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
      
      if (selectedTask) {
         const currentSelected = taskData.find(t => t.id === selectedTask.id);
         if (currentSelected) setSelectedTask(currentSelected);
      }
    });
    return unsubscribe;
  }, []);

   // --- EMAIL NOTIFICATION LOGIC ---
 const sendEmail = (to, subject, body) => {
    if (EMAIL_SERVICE_ID === "service_ld9gdun") {
        console.warn("EmailJS keys not set. Check src/Dashboard.jsx");
        return;
    }

    const templateParams = {
        to_email: to,
        subject: subject,
        message: body,
        to_name: currentUser?.email?.split('@')[0] || 'User'
    };

    emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, EMAIL_PUBLIC_KEY)
      .then((response) => {
         console.log('SUCCESS! Email sent.', response.status, response.text);
      }, (err) => {
         console.error('FAILED to send email.', err);
      });
  };
   // --- DUE DATE MONITORING ---
  useEffect(() => {
    if (!currentUser || tasks.length === 0) return;

    const checkDueDates = () => {
        const today = new Date();
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(today.getDate() + 2); // Check window: 48 hours

        tasks.forEach(async (task) => {
            // Check if task has a deadline, isn't done, and hasn't already notified us
            if (task.deadline && task.status !== 'done' && !task.dueNotificationSent) {
                const dueDate = new Date(task.deadline);
                
                // Compare dates (ignoring time for simple comparison)
                const isApproaching = dueDate >= today && dueDate <= twoDaysFromNow;
                const isOverdue = dueDate < today;

                if (isApproaching || isOverdue) {
                    const statusMsg = isOverdue ? "OVERDUE" : "due soon";
                    
                    // 1. Send Real Email
                    sendEmail(
                        currentUser.email,
                        `URGENT: "${task.title}" is ${statusMsg}`,
                        `Hello,\n\nYour task "${task.title}" is currently ${statusMsg}.\nDue Date: ${formatDate(task.deadline)}.\n\nPlease update the status on your dashboard.\n\n- iHAVECPU Manager`
                    );

                    // 2. Update DB to prevent spamming loops
                    try {
                        await updateDoc(doc(db, 'tasks', task.id), {
                            dueNotificationSent: true
                        });
                    } catch (err) {
                        console.error("Error updating notification status", err);
                    }
                }
            }
        });
    };

    // Run check every time tasks change, or every minute via interval if needed
    // Simple check on load/update is usually sufficient for this scale
    const timeoutId = setTimeout(checkDueDates, 5000); // 5 sec delay to let auth load
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
      dueNotificationSent: false // Initialize notification flag
    };

    await addDoc(collection(db, 'tasks'), taskData);

    // Send "New Task" Email
    sendEmail(
        currentUser.email,
        `New Task: ${newTask.title}`,
        `A new task has been created.\n\nTitle: ${newTask.title}\nCategory: ${newTask.tag}\nDue Date: ${newTask.deadline ? formatDate(newTask.deadline) : 'None'}\n\nLogin to view details.`
    );

    setNewTask({
        title: '',
        tag: 'Planning',
        startDate: new Date().toISOString().split('T')[0],
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
    e.stopPropagation();
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

  // --- 3.5 UPDATE: Edit Task Details ---
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editedTask.title) return;

    await updateDoc(doc(db, 'tasks', selectedTask.id), {
        ...editedTask
    });
    
    setSelectedTask({ ...selectedTask, ...editedTask });
    setIsEditing(false);
  };

  // --- 4. DELETE: Remove Task ---
  const deleteTask = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteDoc(doc(db, 'tasks', id));
      if (selectedTask?.id === id) {
          setSelectedTask(null);
          setIsEditing(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch {
      alert("Failed to log out");
    }
  };

  const startEditing = () => {
    setEditedTask(selectedTask);
    setIsEditing(true);
  };

  // --- Helpers ---
  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50' },
    { id: 'review', title: 'Review', color: 'bg-purple-50' },
    { id: 'done', title: 'Done', color: 'bg-green-50' },
  ];

  const tagColors = {
    'Planning': 'bg-pink-100 text-pink-600',
    'Project': 'bg-purple-100 text-purple-600',
    'Product Review': 'bg-blue-100 text-blue-600',
    'Event': 'bg-yellow-100 text-yellow-600',
    'Guest Speaker': 'bg-green-100 text-green-600',
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => {
      if (status === 'todo' && (task.status === 'pending' || !task.status)) return true;
      if (status === 'done' && task.status === 'completed') return true;
      return task.status === status;
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    return new Date(dateString).toLocaleDateString('en-GB'); 
  };

  // --- VIEW COMPONENTS ---

  const HomeView = () => {
    const totalTasks = tasks.length;
    const completedTasks = getTasksByStatus('done').length;
    const inProgressTasks = getTasksByStatus('inprogress').length;
    const reviewTasks = getTasksByStatus('review').length;
    const todoTasks = getTasksByStatus('todo').length;
    
    const tagCounts = tasks.reduce((acc, task) => {
        acc[task.tag] = (acc[task.tag] || 0) + 1;
        return acc;
    }, {});

    const maxTagCount = Math.max(...Object.values(tagCounts), 1);

    return (
        <div className="p-6 md:p-10 h-full w-full overflow-y-auto bg-gray-50/50">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">Welcome Back! {currentUser?.email?.split('.')[0]}</h2>
                        <p className="text-gray-500 mt-1">Here is your project overview at a glance.</p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Today</p>
                        <p className="text-xl font-bold text-gray-800">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><ListTodo size={24} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Total Tasks</span>
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-gray-800">{totalTasks}</span>
                            <span className="text-sm text-gray-400 ml-2">tasks</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div className="bg-yellow-50 text-yellow-600 p-2 rounded-lg"><Activity size={24} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">In Progress</span>
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-gray-800">{inProgressTasks}</span>
                            <span className="text-sm text-gray-400 ml-2">active</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div className="bg-purple-50 text-purple-600 p-2 rounded-lg"><PieChart size={24} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Review</span>
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-gray-800">{reviewTasks}</span>
                            <span className="text-sm text-gray-400 ml-2">pending</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div className="bg-green-50 text-green-600 p-2 rounded-lg"><CheckCircle2 size={24} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Completed</span>
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-gray-800">{completedTasks}</span>
                            <span className="text-sm text-gray-400 ml-2">finished</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Task Status</h3>
                        <div className="flex items-end justify-between h-64 gap-4">
                            {[
                                { label: 'To Do', count: todoTasks, color: 'bg-gray-200' },
                                { label: 'In Progress', count: inProgressTasks, color: 'bg-blue-500' },
                                { label: 'Review', count: reviewTasks, color: 'bg-purple-500' },
                                { label: 'Done', count: completedTasks, color: 'bg-green-500' }
                            ].map((stat) => (
                                <div key={stat.label} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                                    <div className="font-bold text-gray-800 mb-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">{stat.count}</div>
                                    <div 
                                        className={`w-full rounded-t-xl transition-all duration-500 ${stat.color} hover:opacity-90`}
                                        style={{ height: `${totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0}%`, minHeight: '8px' }}
                                    ></div>
                                    <div className="text-xs font-bold text-gray-400 uppercase text-center mt-2">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Workload</h3>
                        <div className="space-y-5">
                            {Object.keys(tagColors).map((tag) => {
                                const count = tagCounts[tag] || 0;
                                const barColor = tagColors[tag].split(' ')[0].replace('bg-', 'bg-');
                                
                                return (
                                    <div key={tag}>
                                        <div className="flex justify-between text-sm font-bold mb-2">
                                            <span className="text-gray-600">{tag}</span>
                                            <span className="text-gray-400">{count} Tasks</span>
                                        </div>
                                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${tagColors[tag].split(' ')[0]}`} 
                                                style={{ width: `${(count / maxTagCount) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const getTasksForDay = (day) => {
        const currentDayDate = new Date(year, month, day);
        currentDayDate.setHours(0,0,0,0);

        return tasks.filter(task => {
            if (!task.startDate || !task.deadline) return false;
            const start = new Date(task.startDate);
            const end = new Date(task.deadline);
            start.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            return currentDayDate >= start && currentDayDate <= end;
        });
    };

    return (
        <div className="p-6 h-full w-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CalendarIcon className="text-blue-600" />
                    {monthNames[month]} {year}
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight /></button>
                </div>
            </div>

            <div className="flex-1 border rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="grid grid-cols-7 bg-gray-50 border-b">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-3 text-center text-sm font-bold text-gray-500 uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr h-full bg-gray-50 gap-px border-gray-200">
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-white min-h-[100px]"></div>
                    ))}
                    
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dayTasks = getTasksForDay(day);
                        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                        return (
                            <div key={day} className={`bg-white p-2 min-h-[100px] hover:bg-gray-50 transition relative ${isToday ? 'bg-blue-50/30' : ''}`}>
                                <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm' : 'text-gray-700'}`}>
                                    {day}
                                </div>
                                <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px]">
                                    {dayTasks.map(task => (
                                        <div 
                                            key={task.id}
                                            onClick={() => { setSelectedTask(task); setIsEditing(false); }}
                                            className={`text-[10px] truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 ${tagColors[task.tag] ? tagColors[task.tag].replace('text-', 'bg-').split(' ')[0] + ' text-gray-700' : 'bg-gray-100'}`}
                                            title={`${task.title} (${task.status})`}
                                        >
                                            {task.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  const SelfHealView = () => {
    const videos = [
        "jfKfPfyJRdk", 
        "eKFTSSKCzWA", 
        "inpok4MKVLM", 
        "Dx5qFachd3A", 
        "tEmt1Znux58", 
        "lTRiuFIWV54", 
    ];
    
    const [currentVideoId, setCurrentVideoId] = useState(videos[0]);

    const randomizeVideo = () => {
        const randomIndex = Math.floor(Math.random() * videos.length);
        setCurrentVideoId(videos[randomIndex]);
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
                    <Heart className="text-pink-500 fill-pink-500" size={32} />
                    Self Heal & Relax
                </h2>
                <p className="text-gray-500">Take a moment to breathe. You are doing great.</p>
            </div>

            <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden mb-8 border-4 border-white">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                ></iframe>
            </div>

            <button 
                onClick={randomizeVideo}
                className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all font-bold text-indigo-600"
            >
                <RefreshCw size={20} /> Change Atmosphere
            </button>
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

    useEffect(() => {
        const q = query(collection(db, 'albums'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAlbums(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPhotos(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return unsubscribe;
    }, []);

    const createAlbum = async (e) => {
        e.preventDefault();
        if (!newAlbumName) return;
        try {
            await addDoc(collection(db, 'albums'), {
                name: newAlbumName,
                createdAt: new Date(),
                createdBy: currentUser.email
            });
            setNewAlbumName('');
            setIsCreatingAlbum(false);
        } catch (error) {
            console.error("Error creating album:", error);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            alert("File is too large! Please upload images under 2MB.");
            return;
        }

        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                await addDoc(collection(db, 'photos'), {
                    url: reader.result,
                    name: file.name,
                    createdAt: new Date(),
                    uploader: currentUser.email,
                    albumId: currentAlbum.id
                });
            } catch (error) {
                console.error("Error uploading:", error);
                alert("Failed to upload photo.");
            }
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleDeletePhoto = async (id) => {
        if (confirm("Delete this photo permanently?")) {
            await deleteDoc(doc(db, 'photos', id));
        }
    };

    const handleDeleteAlbum = async (e, id) => {
        e.stopPropagation();
        if (confirm("Delete this album? Photos will need manual cleanup.")) {
            await deleteDoc(doc(db, 'albums', id));
            if (currentAlbum?.id === id) setCurrentAlbum(null);
        }
    };

    const albumPhotos = photos.filter(p => p.albumId === currentAlbum?.id);

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-50/50 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        {currentAlbum && (
                            <button onClick={() => setCurrentAlbum(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                                <ArrowLeft size={24} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                {currentAlbum ? (
                                    <>
                                        <Folder className="text-purple-600" /> {currentAlbum.name}
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="text-purple-600" /> Photo Albums
                                    </>
                                )}
                            </h2>
                            <p className="text-gray-500 mt-1">
                                {currentAlbum ? `${albumPhotos.length} photos in this album` : 'Manage your team galleries'}
                            </p>
                        </div>
                    </div>

                    {!currentAlbum ? (
                        <div className="relative">
                            {isCreatingAlbum ? (
                                <form onSubmit={createAlbum} className="flex gap-2">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="Album Name"
                                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={newAlbumName}
                                        onChange={e => setNewAlbumName(e.target.value)}
                                    />
                                    <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button>
                                    <button type="button" onClick={() => setIsCreatingAlbum(false)} className="text-gray-500 hover:bg-gray-100 px-2 rounded-lg"><X size={18}/></button>
                                </form>
                            ) : (
                                <button onClick={() => setIsCreatingAlbum(true)} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg hover:bg-purple-700 transition">
                                    <Plus size={20} /> Create Album
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="relative">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={uploading}
                            />
                            <button className={`flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg hover:bg-purple-700 transition ${uploading ? 'opacity-70 cursor-wait' : ''}`}>
                                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                                {uploading ? 'Uploading...' : 'Upload Photo'}
                            </button>
                        </div>
                    )}
                </div>

                {!currentAlbum ? (
                    /* ALBUM LIST */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {albums.map(album => (
                            <div 
                                key={album.id} 
                                onClick={() => setCurrentAlbum(album)}
                                className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center aspect-square relative"
                            >
                                <Folder size={64} className="text-purple-200 group-hover:text-purple-300 transition mb-4" />
                                <h3 className="font-bold text-gray-700 text-center">{album.name}</h3>
                                <p className="text-xs text-gray-400 mt-1">{new Date(album.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                
                                <button 
                                    onClick={(e) => handleDeleteAlbum(e, album.id)}
                                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {albums.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-400">
                                <p>No albums yet. Create one to get started.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* PHOTO GRID */
                    <div>
                        {albumPhotos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-white text-gray-400">
                                <ImageIcon size={48} className="mb-4 opacity-50" />
                                <p>No photos in this album yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {albumPhotos.map(photo => (
                                    <div key={photo.id} className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition aspect-square">
                                        <img src={photo.url} alt="Album" className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                            <a href={photo.url} download={photo.name} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 backdrop-blur-sm transition">
                                                <ExternalLink size={20} />
                                            </a>
                                            <button 
                                                onClick={() => handleDeletePhoto(photo.id)}
                                                className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 backdrop-blur-sm transition"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white opacity-0 group-hover:opacity-100 transition">
                                            <p className="text-xs font-medium truncate">{photo.name}</p>
                                            <p className="text-[10px] opacity-75">{new Date(photo.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
  };

  const ReportView = () => {
    const [selectedBrand, setSelectedBrand] = useState('iHAVECPU');
    // Pages State
    const [pages, setPages] = useState([
        { id: 1, title: 'Marketing Strategy Report', bodyText: 'Summarize your key points here...', image: null, image2: null, template: '1-landscape' }
    ]);
    const [activePageId, setActivePageId] = useState(1);
    const [reportDate] = useState(new Date().toLocaleDateString('en-GB'));

    // Drag References
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const activePage = pages.find(p => p.id === activePageId) || pages[0];

    const brands = [
        { name: 'iHAVECPU', color: 'bg-gray-900 text-white', logo: null },
        { name: 'Intel', color: 'bg-blue-600 text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Intel_logo.svg/1200px-Intel_logo.svg.png' },
        { name: 'AMD', color: 'bg-black text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/AMD_Logo.svg/2560px-AMD_Logo.svg.png' },
        { name: 'NVIDIA', color: 'bg-green-500 text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/2560px-Nvidia_logo.svg.png' },
        { name: 'ASUS', color: 'bg-blue-800 text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/2560px-ASUS_Logo.svg.png' },
        { name: 'MSI', color: 'bg-red-600 text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/MSI_Logo_2019.svg/2560px-MSI_Logo_2019.svg.png' }
    ];

    const templates = [
        { id: '1-landscape', name: '1 Landscape', icon: '1L' },
        { id: '2-landscape', name: '2 Landscape', icon: '2L' },
        { id: '1-portrait', name: '1 Portrait', icon: '1P' },
        { id: '2-portrait', name: '2 Portrait', icon: '2P' },
    ];

    const updatePage = (field, value) => {
        setPages(prev => prev.map(p => p.id === activePageId ? { ...p, [field]: value } : p));
    };

    const handleImageUpload = (e, slot) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updatePage(slot, reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const addNewPage = () => {
        const newId = Date.now();
        setPages([...pages, { id: newId, title: 'New Slide', bodyText: 'Enter slide content...', image: null, image2: null, template: '1-landscape' }]);
        setActivePageId(newId);
    };

    const removePage = (id, e) => {
        e.stopPropagation();
        if (pages.length === 1) return;
        const newPages = pages.filter(p => p.id !== id);
        setPages(newPages);
        if (activePageId === id) setActivePageId(newPages[0].id);
    };

    // Handle Drag Sort
    const handleSort = () => {
        let _pages = [...pages];
        const draggedItemContent = _pages.splice(dragItem.current, 1)[0];
        _pages.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setPages(_pages);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-100 overflow-y-auto">
            
            {/* Controls (Hidden when printing) */}
            <div className="max-w-5xl mx-auto mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <Presentation className="text-blue-600" /> Presentation Builder
                    </h2>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => window.open('https://www.canva.com', '_blank')}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-purple-700 transition flex items-center gap-2"
                        >
                            <ExternalLink size={18} /> Open Canva
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <Printer size={18} /> Export PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Col: Global & Page Nav */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Brands */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Select Brand Style</label>
                             <div className="grid grid-cols-2 gap-2">
                                {brands.map(brand => (
                                    <button 
                                        key={brand.name}
                                        onClick={() => setSelectedBrand(brand.name)}
                                        className={`p-2 rounded-lg border-2 text-xs font-bold transition ${selectedBrand === brand.name ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}
                                    >
                                        {brand.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Page Navigation */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-bold text-gray-500 uppercase">Slides</label>
                                <button onClick={addNewPage} className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                                    <Plus size={14} /> Add Slide
                                </button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {pages.map((p, idx) => (
                                    <div 
                                        key={p.id}
                                        draggable
                                        onDragStart={(e) => (dragItem.current = idx)}
                                        onDragEnter={(e) => (dragOverItem.current = idx)}
                                        onDragEnd={handleSort}
                                        onDragOver={(e) => e.preventDefault()}
                                        onClick={() => setActivePageId(p.id)}
                                        className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition group ${activePageId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <GripVertical className="text-gray-300 cursor-move flex-shrink-0 group-hover:text-gray-500" size={16} />
                                            <span className="text-sm font-medium truncate">#{idx+1} {p.title}</span>
                                        </div>
                                        {pages.length > 1 && (
                                            <button onClick={(e) => removePage(p.id, e)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Active Page Editor */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <Edit2 size={16} /> Editing Slide #{pages.findIndex(p => p.id === activePageId) + 1}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Report Title</label>
                                <input 
                                    type="text" 
                                    value={activePage.title}
                                    onChange={(e) => updatePage('title', e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Layout Template</label>
                                <select 
                                    value={activePage.template}
                                    onChange={(e) => updatePage('template', e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Slide Content</label>
                                <textarea 
                                    value={activePage.bodyText}
                                    onChange={(e) => updatePage('bodyText', e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                />
                            </div>

                            {/* Dynamic Uploads based on Template */}
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <div className={`border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative group ${activePage.template.startsWith('2') ? '' : 'col-span-2'}`}>
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-blue-500">
                                        <Upload size={24} />
                                        <span className="font-medium text-xs">Image 1</span>
                                    </div>
                                </div>
                                {activePage.template.startsWith('2') && (
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative group">
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image2')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-blue-500">
                                            <Upload size={24} />
                                            <span className="font-medium text-xs">Image 2</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Section - Renders ALL pages */}
            <div className="space-y-8 print:space-y-0">
                {pages.map((page, index) => (
                    <div key={page.id} className="max-w-5xl mx-auto bg-white aspect-video shadow-2xl rounded-xl overflow-hidden relative print:shadow-none print:w-full print:h-screen print:rounded-none flex flex-col print:break-after-page">
                        {/* Brand Header (Subtitle removed) */}
                        <div className={`h-24 flex items-center px-10 justify-between ${brands.find(b => b.name === selectedBrand)?.color || 'bg-gray-900 text-white'}`}>
                            {/* Empty title area where subtitle was */}
                            <div></div>
                            {brands.find(b => b.name === selectedBrand)?.logo ? (
                                <img src={brands.find(b => b.name === selectedBrand).logo} alt="Logo" className="h-12 object-contain bg-white/10 p-1 rounded" />
                            ) : (
                                <span className="text-xl font-black">{selectedBrand}</span>
                            )}
                        </div>

                        <div className="flex-1 p-10 flex gap-8">
                            {/* Left Content (Text) */}
                            <div className="flex-1 flex flex-col justify-center space-y-6">
                                <div>
                                    <span className="inline-block px-3 py-1 rounded bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">
                                        {reportDate}
                                    </span>
                                    <h2 className="text-5xl font-extrabold text-gray-800 leading-tight">{page.title}</h2>
                                </div>
                                
                                <div className="pt-4">
                                    <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">
                                        {page.bodyText}
                                    </p>
                                </div>

                                <div className="pt-8 mt-auto">
                                    <p className="text-gray-400 text-sm font-medium">Prepared by</p>
                                    <p className="text-gray-800 font-bold text-lg">{currentUser?.email}</p>
                                </div>
                            </div>

                            {/* Right Content (Images based on Template) */}
                            <div className="flex-1 h-full flex flex-col gap-4">
                                {page.template === '1-landscape' && (
                                    <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                                        {page.image ? <img src={page.image} className="w-full h-full object-cover" /> : <div className="text-gray-300 flex flex-col items-center"><ImageIcon size={48} /><span className="mt-2 text-xs">1 Landscape</span></div>}
                                    </div>
                                )}
                                {page.template === '2-landscape' && (
                                    <>
                                        <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                                            {page.image ? <img src={page.image} className="w-full h-full object-cover" /> : <div className="text-gray-300 flex flex-col items-center"><ImageIcon size={32} /><span className="mt-1 text-xs">Img 1</span></div>}
                                        </div>
                                        <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                                            {page.image2 ? <img src={page.image2} className="w-full h-full object-cover" /> : <div className="text-gray-300 flex flex-col items-center"><ImageIcon size={32} /><span className="mt-1 text-xs">Img 2</span></div>}
                                        </div>
                                    </>
                                )}
                                {page.template === '1-portrait' && (
                                    <div className="flex-1 flex justify-center h-full">
                                        <div className="h-full aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                                            {page.image ? <img src={page.image} className="w-full h-full object-cover" /> : <div className="text-gray-300 flex flex-col items-center"><ImageIcon size={48} /><span className="mt-2 text-xs">1 Portrait</span></div>}
                                        </div>
                                    </div>
                                )}
                                {page.template === '2-portrait' && (
                                    <div className="flex-1 flex gap-4 h-full">
                                        <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                                            {page.image ? <img src={page.image} className="w-full h-full object-cover" /> : <div className="text-gray-300 flex flex-col items-center"><ImageIcon size={32} /><span className="mt-1 text-xs">P1</span></div>}
                                        </div>
                                        <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                                            {page.image2 ? <img src={page.image2} className="w-full h-full object-cover" /> : <div className="text-gray-300 flex flex-col items-center"><ImageIcon size={32} /><span className="mt-1 text-xs">P2</span></div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 border-t border-gray-100 p-4 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">
                            Confidential • Internal Use Only • {selectedBrand} Marketing • Slide {index + 1}
                        </div>
                    </div>
                ))}
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { -webkit-print-color-adjust: exact; }
                    aside, nav, .print\\:hidden { display: none !important; }
                    main { width: 100vw; height: auto; overflow: visible; background: white; }
                    .p-6, .md\\:p-10 { padding: 0 !important; }
                    .print\\:break-after-page { break-after: page; height: 100vh; width: 100vw; border-radius: 0; }
                }
            `}</style>
        </div>
    );
  };

  // --- RENDER ---
  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-20 md:w-64 bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0 z-20 print:hidden">
        <div>
            <div className="p-6 flex items-center gap-3 mb-6">
                <div className="bg-red-600 p-2 rounded-lg text-white">
                    <Computer size={24} />
                </div>
                <div className="hidden md:block">
                    <h1 className="text-lg font-bold text-gray-900 leading-none">iHAVECPU</h1>
                    <span className="text-xs text-blue-600 font-bold tracking-wider">WORKSPACE</span>
                </div>
            </div>

            <nav className="px-3 space-y-2">
                <button 
                    onClick={() => setCurrentView('home')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'home' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Home size={20} /> <span className="hidden md:inline">Home</span>
                </button>
                <button 
                    onClick={() => setCurrentView('board')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'board' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Layout size={20} /> <span className="hidden md:inline">Kanban Board</span>
                </button>
                <button 
                    onClick={() => setCurrentView('calendar')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'calendar' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <CalendarIcon size={20} /> <span className="hidden md:inline">Calendar</span>
                </button>
                <button 
                    onClick={() => setCurrentView('report')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'report' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Presentation size={20} /> <span className="hidden md:inline">Report Builder</span>
                </button>
                <button 
                    onClick={() => setCurrentView('album')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'album' ? 'bg-purple-50 text-purple-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <ImageIcon size={20} /> <span className="hidden md:inline">Photo Album</span>
                </button>
                <button 
                    onClick={() => setCurrentView('selfheal')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'selfheal' ? 'bg-pink-50 text-pink-500 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Heart size={20} /> <span className="hidden md:inline">Self Heal</span>
                </button>
            </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
             <div className="flex items-center gap-3 px-4 py-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
                    {currentUser?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block overflow-hidden">
                    <p className="text-sm font-bold text-gray-700 truncate">{currentUser?.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-gray-400">Admin</p>
                </div>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center gap-2 text-gray-400 hover:text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition text-sm">
                <LogOut size={16} /> <span className="hidden md:inline">Log out</span>
             </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white relative">
        
        {/* VIEW: HOME */}
        {currentView === 'home' && <HomeView />}

        {/* VIEW: BOARD */}
        {currentView === 'board' && (
            <div className="flex flex-col h-full w-full">
                <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
                     <h2 className="text-2xl font-bold text-gray-800">Marketing Sprint</h2>
                     <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-200"
                     >
                        <Plus size={18} /> New Task
                     </button>
                </header>

                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 pt-6">
                    <div className="flex gap-6 h-full min-w-full">
                    {columns.map(col => (
                        <div key={col.id} className="flex-1 min-w-[300px] flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider">{col.title}</h3>
                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {getTasksByStatus(col.id).length}
                                </span>
                            </div>
                            <button className="text-gray-300 hover:text-gray-600"><MoreHorizontal size={16} /></button>
                        </div>

                        <div className={`flex-1 rounded-2xl p-2 ${col.color} overflow-y-auto custom-scrollbar`}>
                            <div className="flex flex-col gap-3 pb-2">
                                {getTasksByStatus(col.id).map(task => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => { setSelectedTask(task); setIsEditing(false); }}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${tagColors[task.tag] || 'bg-gray-100 text-gray-500'}`}>
                                                {task.tag}
                                            </span>
                                            <button onClick={(e) => deleteTask(e, task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <h4 className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed line-clamp-2">{task.title}</h4>

                                        {(task.description || task.link || task.fileUrl) && (
                                            <div className="flex gap-2 mb-3 text-gray-400">
                                                {task.description && <AlignLeft size={14} />}
                                                {(task.link || task.reference) && <LinkIcon size={14} />}
                                                {(task.fileUrl || task.imageUrl) && <Paperclip size={14} />}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                            <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                                                <Clock size={12} />
                                                <span>{formatDate(task.deadline)}</span>
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
            </div>
        )}

        {/* VIEW: CALENDAR */}
        {currentView === 'calendar' && <CalendarView />}

        {/* VIEW: PHOTO ALBUM */}
        {currentView === 'album' && <PhotoAlbumView />}

        {/* VIEW: SELF HEAL */}
        {currentView === 'selfheal' && <SelfHealView />}

        {/* VIEW: REPORT */}
        {currentView === 'report' && <ReportView />}

      </main>

      {/* --- ADD TASK MODAL (Reused) --- */}
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
                                    <option value="Planning">Planning</option>
                                    <option value="Project">Project</option>
                                    <option value="Product Review">Product Review</option>
                                    <option value="Event">Event</option>
                                    <option value="Guest Speaker">Guest Speaker</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Start Date (Auto)</label>
                                <input readOnly type="date" className="w-full border-gray-200 bg-gray-100 rounded-lg px-4 py-3 text-gray-500 cursor-not-allowed"
                                    value={newTask.startDate} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">Due Date</label>
                                <input type="date" className="w-full border-2 border-blue-200 bg-blue-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-bold"
                                    value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
                            </div>
                        </div>
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

      {/* --- TASK DETAILS MODAL (Reused) --- */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setSelectedTask(null); setIsEditing(false); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 flex flex-col" onClick={e => e.stopPropagation()}>
                {!isEditing && selectedTask.imageUrl && (
                    <div className="h-48 w-full bg-gray-100 overflow-hidden relative">
                         <img src={selectedTask.imageUrl} alt="Task attachment" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                )}
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                            {!isEditing ? (
                                <>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${tagColors[selectedTask.tag] || 'bg-gray-100'}`}>
                                            {selectedTask.tag}
                                        </span>
                                        <span className="text-gray-400 text-xs flex items-center gap-1">
                                            <Clock size={12} /> Created {formatDate(selectedTask.createdAt?.seconds ? new Date(selectedTask.createdAt.seconds * 1000) : selectedTask.createdAt)}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900 leading-tight">{selectedTask.title}</h2>
                                </>
                            ) : (
                                <div className="space-y-4">
                                     <h3 className="text-lg font-bold text-gray-400 uppercase tracking-wide">Editing Task</h3>
                                     <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Title</label>
                                        <input type="text" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-2 text-xl font-bold" 
                                            value={editedTask.title} onChange={e => setEditedTask({...editedTask, title: e.target.value})} />
                                     </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 ml-4">
                            {!isEditing ? (
                                <button onClick={startEditing} className="p-2 hover:bg-blue-50 text-blue-600 rounded-full transition" title="Edit Task">
                                    <Edit2 size={20} />
                                </button>
                            ) : (
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            )}
                            <button onClick={() => { setSelectedTask(null); setIsEditing(false); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    {isEditing ? (
                        <form onSubmit={handleUpdateTask} className="flex flex-col gap-6">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tag</label>
                                    <select className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-2"
                                        value={editedTask.tag} onChange={e => setEditedTask({...editedTask, tag: e.target.value})}>
                                        <option value="Planning">Planning</option>
                                        <option value="Project">Project</option>
                                        <option value="Product Review">Product Review</option>
                                        <option value="Event">Event</option>
                                        <option value="Guest Speaker">Guest Speaker</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase block mb-1">Due Date</label>
                                    <input type="date" className="w-full border-2 border-blue-200 bg-blue-50 rounded-lg px-4 py-2 font-bold"
                                        value={editedTask.deadline} onChange={e => setEditedTask({...editedTask, deadline: e.target.value})} />
                                </div>
                             </div>
                             <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Description</label>
                                <textarea className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 min-h-[100px]"
                                    value={editedTask.description} onChange={e => setEditedTask({...editedTask, description: e.target.value})} />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Requirements</label>
                                <textarea className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-3 min-h-[80px]"
                                    value={editedTask.requirements} onChange={e => setEditedTask({...editedTask, requirements: e.target.value})} />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Link</label>
                                    <input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-2"
                                        value={editedTask.link} onChange={e => setEditedTask({...editedTask, link: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Image URL</label>
                                    <input type="url" className="w-full border-gray-200 bg-gray-50 rounded-lg px-4 py-2"
                                        value={editedTask.imageUrl} onChange={e => setEditedTask({...editedTask, imageUrl: e.target.value})} />
                                </div>
                             </div>
                             <button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                                <Save size={18} /> Save Changes
                             </button>
                        </form>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Start Date</span>
                                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                                        <Clock size={16} className="text-blue-500" />
                                        {formatDate(selectedTask.startDate)}
                                    </div>
                                </div>
                                <div>
                                     <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Due Date</span>
                                     <div className="flex items-center gap-2 text-gray-700 font-medium">
                                        <Clock size={16} className="text-red-500" />
                                        {formatDate(selectedTask.deadline)}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div>
                                    <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
                                        <AlignLeft size={20} className="text-gray-400" /> Description
                                    </h4>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">
                                        {selectedTask.description || <span className="italic text-gray-400">No description provided.</span>}
                                    </p>
                                </div>
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
                        </>
                    )}
                </div>
                {!isEditing && (
                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                        <button onClick={() => setSelectedTask(null)} className="px-6 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition">Close</button>
                        <button onClick={(e) => deleteTask(e, selectedTask.id)} className="px-6 py-2 rounded-lg font-bold bg-red-100 text-red-600 hover:bg-red-200 transition flex items-center gap-2">
                            <Trash2 size={16} /> Delete Task
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}