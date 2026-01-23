// src/hooks/useTaskData.js
import { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';

export const useTaskData = (currentUser) => {
  // --- STATE ---
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [otRecords, setOtRecords] = useState([]);
  const [albums, setAlbums] = useState([]); 
  const [photos, setPhotos] = useState([]);
  const [notifications, setNotifications] = useState([]); 

  // --- 1. DATA CLEANER ---
  const cleanData = (data) => {
    if (data === undefined || data === null) return null;
    if (typeof data === 'function') return null;
    if (Array.isArray(data)) return data.map(cleanData);
    if (data instanceof Date) return data;
    if (typeof data === 'object') {
        if (data.href && typeof data.assign === 'function') return data.href;
        const cleaned = {};
        Object.keys(data).forEach(key => {
            cleaned[key] = cleanData(data[key]);
        });
        return cleaned;
    }
    return data;
  };

  // --- 2. EMAIL NOTIFICATION ---
  const sendEmailNotification = async (subject, data) => {
    const MAIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    const CC_EMAILS = "mkt@ihavecpu.com, suchada.t@ihavecpu.com"; 

    const formData = {
        _subject: subject,
        _cc: CC_EMAILS,
        _template: "table",
        _captcha: "false",
        "Target Email": MAIN_EMAIL,
        "Triggered By": currentUser?.email || 'System',
        "Time": new Date().toLocaleString('en-GB'),
        ...data 
    };

    try {
        await fetch(`https://formsubmit.co/ajax/${MAIN_EMAIL}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(formData)
        });
        console.log(`✅ Email Sent: ${subject}`);
    } catch (error) { console.error("❌ Email Error:", error); }
  };

// --- 3. LINE MESSAGING API (PUSH TO GROUP) ---
  const sendLinePush = async (text) => {
    const CHANNEL_ACCESS_TOKEN = "asI8bw3wLZAIlgAQbOvzD/OwRuontfeiEwsnV14iGyBCfuG95dlQaQHh4Q23VvUSObT9qqqu9RkJ6w0f0Z3bEtG9n2Ulg0vnnibU17BPM91hpcAuSfRerf/vtikl00eTh+RAyFQhNA25i6jdGf+8OAdB04t89/1O/w1cDnyilFU="; 
    
    // 👇 PASTE THE GROUP ID YOU FOUND HERE (Starts with C or G)
    const GROUP_ID = "Cfb3a99b16a4599c8d386b0f6edf1100f"; 
    
    const PROXY_URL = "https://corsproxy.io/?";
    // CHANGED: Use 'push' instead of 'broadcast'
    const TARGET_URL = "https://api.line.me/v2/bot/message/push";

    if (!GROUP_ID || GROUP_ID.includes("Cfb3a99b16a4599c8d386b0f6edf1100f")) {
        console.warn("⚠️ Group ID missing.");
        return;
    }

    try {
        const payload = {
            to: GROUP_ID, // <--- Target the specific group
            messages: [
                {
                    type: "text",
                    text: text
                }
            ]
        };

        const response = await fetch(PROXY_URL + encodeURIComponent(TARGET_URL), {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const err = await response.json();
            console.error("❌ LINE API Error:", err);
        } else {
            console.log(`✅ LINE Group Message Sent`);
        }
    } catch (error) {
        console.error("❌ LINE Network Error:", error);
    }
  };

  // --- 4. DEADLINE LOGIC ---
  const triggerAlert = async (task, prefix, userEmail, updateFlag) => {
    console.log(`🔔 Alerting: ${task.title}`);

    // A. Send Email
    await sendEmailNotification(`${prefix}: ${task.title}`, {
        "Target User": userEmail,
        "Task Title": task.title,
        "Due Date": new Date(task.deadline).toLocaleString('en-GB'),
        "Status": task.status
    });

    // B. Send LINE Message (New Format)
    // Using Emojis to make it readable
    const lineMsg = `${prefix} 🚨\n\n📌 Task: ${task.title}\n📅 Due: ${new Date(task.deadline).toLocaleDateString('en-GB')}\n👤 Assignee: ${task.assignee?.name || 'Unassigned'}`;
    
    await sendLineBroadcast(lineMsg);

    // C. Create In-App Notification
    await addDoc(collection(db, "notifications"), {
        title: `${prefix}: ${task.title}`,
        taskId: task.id,
        userEmail: userEmail,
        isRead: false,
        createdAt: new Date().toISOString(),
        type: 'alert'
    });

    // D. Update Task
    await updateDoc(doc(db, "tasks", task.id), updateFlag);
  };

  const checkDeadlines = (taskList, user) => {
    const now = new Date();
    taskList.forEach(async (task) => {
        if (task.status === 'completed' || !task.deadline) return;
        if (task.assignee?.name && user.name && !task.assignee.name.includes(user.name.split(' ')[0])) return;

        const deadline = new Date(task.deadline);
        const timeDiff = deadline - now;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysLeft <= 7 && daysLeft > 2 && !task.notified7Days) {
            await triggerAlert(task, "⚠️ Reminder: 7 Days Left", user.email, { notified7Days: true });
        }
        if (daysLeft <= 2 && daysLeft >= 0 && !task.notified2Days) {
            await triggerAlert(task, "🔥 URGENT: 2 Days Left", user.email, { notified2Days: true });
        }
    });
  };

  // --- 5. LISTENERS ---
  useEffect(() => {
    const safeSnapshot = (colName, setter) => {
        try {
            const q = query(collection(db, colName), orderBy("createdAt", "desc"));
            return onSnapshot(q, (snapshot) => {
                setter(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            }, (error) => console.error(`Error reading ${colName}:`, error));
        } catch (err) { return () => {}; }
    };

    const unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy("createdAt", "desc")), (snapshot) => {
        const loadedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setTasks(loadedTasks);
        if (currentUser?.email) checkDeadlines(loadedTasks, currentUser);
    });

    const unsubBudget = safeSnapshot("transactions", setTransactions);
    const unsubLeaves = safeSnapshot("leaves", setLeaves);
    const unsubOT = safeSnapshot("ot_records", setOtRecords);
    const unsubNotifs = onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc")), (snapshot) => {
        const allNotifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setNotifications(allNotifs.filter(n => n.userEmail === currentUser?.email));
    });

    return () => {
      unsubTasks();
      unsubBudget();
      unsubLeaves();
      unsubOT();
      unsubNotifs();
    };
  }, [currentUser]);

  // --- 6. ACTIONS ---

  const updateTask = async (id, updates) => {
    try {
        const cleanedUpdates = cleanData(updates);
        const size = JSON.stringify(cleanedUpdates).length;
        if (size > 800000) throw new Error("Data size too large!");

        await updateDoc(doc(db, "tasks", id), cleanedUpdates);
        console.log("Task Updated Successfully");
    } catch (error) {
        console.error("FAILED to update task:", error);
        alert(`Failed to save: ${error.message}`);
    }
  };

  const addTask = async (task) => {
    try {
        const cleanedTask = cleanData({ 
            ...task, 
            createdAt: new Date().toISOString(),
            notified7Days: false,
            notified2Days: false
        });

        await addDoc(collection(db, "tasks"), cleanedTask);
        
        // Notify
        await sendEmailNotification(`New Task: ${task.title}`, { "Title": task.title });
        await sendLineBroadcast(`🆕 New Task:\n${task.title}\n[${task.tag}]`);

    } catch (error) { console.error("Error adding task:", error); }
  };
  
  const moveTask = async (taskId, newStatus) => {
    try {
        await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
        const task = tasks.find(t => t.id === taskId);
        
        // Notify
        await sendEmailNotification("Task Status Updated", { "Task": task?.title, "New Status": newStatus });
        await sendLineBroadcast(`🔄 Status Update:\n${task?.title}\nNow: ${newStatus}`);

    } catch (error) { console.error("Error moving task:", error); }
  };

  // Boilerplate actions
  const deleteTask = async (id) => { if(confirm("Delete task?")) await deleteDoc(doc(db, "tasks", id)); };
  const markNotificationRead = async (id) => { try { await updateDoc(doc(db, "notifications", id), { isRead: true }); } catch(e) {} };
  const clearAllNotifications = async () => { notifications.forEach(async (n) => { try { await deleteDoc(doc(db, "notifications", n.id)); } catch(e) {} }); };
  const addTransaction = async (t) => { try { await addDoc(collection(db, "transactions"), cleanData({ ...t, createdAt: new Date().toISOString() })); } catch (e) { console.error(e); } };
  const updateTransaction = async (id, u) => { try { await updateDoc(doc(db, "transactions", id), cleanData(u)); } catch (e) { console.error(e); } };
  const deleteTransaction = async (id) => { if(confirm("Delete?")) await deleteDoc(doc(db, "transactions", id)); };
  const addLeave = async (l) => { try { await addDoc(collection(db, "leaves"), cleanData({ ...l, createdAt: new Date().toISOString() })); await sendEmailNotification(`Leave: ${l.name}`, l); } catch (e) {} };
  const deleteLeave = async (id) => { if(confirm("Delete?")) await deleteDoc(doc(db, "leaves", id)); };
  const addOTRecord = async (r) => { try { await addDoc(collection(db, "ot_records"), cleanData({ ...r, status: 'Request', createdAt: new Date().toISOString() })); await sendEmailNotification(`OT: ${r.name}`, r); } catch (e) {} };
  const deleteOTRecord = async (id) => { if(confirm("Delete?")) await deleteDoc(doc(db, "ot_records", id)); };
  const updateOTStatus = async (id, s) => { try { await updateDoc(doc(db, "ot_records", id), { status: s }); } catch (e) {} };
  const addAlbum = (name) => setAlbums([...albums, { id: Date.now(), name, cover: null }]);
  const deleteAlbum = (id) => setAlbums(albums.filter(a => a.id !== id));
  const addPhoto = (p) => setPhotos([...photos, { ...p, id: Date.now() }]);
  const deletePhoto = (id) => setPhotos(photos.filter(p => p.id !== id));

  return {
    tasks, addTask, updateTask, deleteTask, moveTask,
    transactions, addTransaction, deleteTransaction, updateTransaction,
    leaves, addLeave, deleteLeave,
    otRecords, addOTRecord, deleteOTRecord, updateOTStatus,
    albums, addAlbum, deleteAlbum,
    photos, addPhoto, deletePhoto,
    notifications, markNotificationRead, clearAllNotifications
  };
};