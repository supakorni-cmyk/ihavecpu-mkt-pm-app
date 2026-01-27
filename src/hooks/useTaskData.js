// src/hooks/useTaskData.js
import { useState, useEffect, useRef } from 'react';
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
  
  // --- MEMORY LOCK ---
  const processedAlerts = useRef(new Set()); 

  // --- USERS LISTENER ---
  const [allUsers, setAllUsers] = useState([]);

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

  // --- 2. EMAIL NOTIFICATION (FIXED for 500 Error) ---
  const sendEmailNotification = async (subject, data) => {
    const MAIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    // FIX: No spaces in CC list
    const CC_EMAILS = "mkt@ihavecpu.com,suchada.t@ihavecpu.com"; 

    // FIX: Convert all data values to strings to prevent 500 Error
    const cleanDataPayload = {};
    Object.keys(data).forEach(key => {
        const value = data[key];
        if (typeof value === 'object' && value !== null) {
            cleanDataPayload[key] = JSON.stringify(value); 
        } else {
            cleanDataPayload[key] = String(value);
        }
    });

    const formData = {
        _subject: subject,
        _cc: CC_EMAILS,
        _template: "table",
        _captcha: "false",
        _honey: "", // Anti-spam
        "Target Email": MAIN_EMAIL,
        "Triggered By": currentUser?.email || 'System',
        "Time": new Date().toLocaleString('en-GB'),
        ...cleanDataPayload
    };

    try {
        const response = await fetch(`https://formsubmit.co/ajax/${MAIN_EMAIL}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Accept": "application/json" 
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            console.log(`✅ Email Sent Successfully: ${subject}`);
        } else {
            console.error(`❌ Email Failed (Status ${response.status})`);
        }
    } catch (error) { console.error("❌ Email Network Error:", error); }
  };

  // --- 3. LINE PUSH NOTIFICATION ---
  const sendLinePush = async (text, taskTag) => {
    const PROXY_URL = "https://corsproxy.io/?";
    const TARGET_URL = "https://api.line.me/v2/bot/message/push";

    const TARGETS = [
        {
            name: "Marketing Group (Main)",
            token: import.meta.env.VITE_LINE_TOKEN_BOT1, 
            groupId: import.meta.env.VITE_LINE_GROUP_ID_BOT1,
            allowedTags: "ALL"
        },
        {
            name: "Second Group (Events Only)",
            token: import.meta.env.VITE_LINE_TOKEN_BOT2,
            groupId: import.meta.env.VITE_LINE_GROUP_ID_BOT2,
            allowedTags: ["Event", "Guest Speaker"]
        }
    ];

    TARGETS.forEach(async (target) => {
        if (!target.token || !target.groupId) return;

        if (target.allowedTags !== "ALL") {
            if (!taskTag || !target.allowedTags.includes(taskTag)) {
                return; 
            }
        }

        try {
            const payload = {
                to: target.groupId,
                messages: [{ type: "text", text: text }]
            };

            const response = await fetch(PROXY_URL + encodeURIComponent(TARGET_URL), {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${target.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                console.log(`✅ LINE Sent to ${target.name}`);
            } else {
                console.error(`❌ LINE Failed (${target.name})`, await response.json());
            }
        } catch (error) {
            console.error(`❌ LINE Network Error (${target.name}):`, error);
        }
    });
  };

  // --- 4. ALERT LOGIC ---
  const triggerAlert = async (task, prefix, userEmail, updateFlag) => {
    const alertId = `${task.id}-${Object.keys(updateFlag)[0]}`; 
    
    if (processedAlerts.current.has(alertId)) return;
    processedAlerts.current.add(alertId);

    console.log(`🔔 TRIGGERING ALERT: ${task.title} (${prefix})`);

    const desc = task.description || "No details provided";

    // 1. Send LINE
    const lineMsg = `${prefix} 🚨\n\n📌 Task: ${task.title}\n📋 Details: ${desc}\n🏷️ Tag: ${task.tag}\n📅 Due: ${new Date(task.deadline).toLocaleDateString('en-GB')}`;
    await sendLinePush(lineMsg, task.tag);

    // 2. Send Email
    await sendEmailNotification(`${prefix}: ${task.title}`, {
        "Target User": userEmail,
        "Task Title": task.title,
        "Details": desc,
        "Due Date": new Date(task.deadline).toLocaleString('en-GB'),
        "Status": task.status
    });

    // 3. In-App Notification
    await addDoc(collection(db, "notifications"), {
        title: `${prefix}: ${task.title}`,
        taskId: task.id,
        userEmail: userEmail,
        isRead: false,
        createdAt: new Date().toISOString(),
        type: 'alert'
    });

    // 4. Update DB
    await updateDoc(doc(db, "tasks", task.id), updateFlag);
  };

  const checkDeadlines = (taskList, user) => {
    if (!user) return;
    const now = new Date();
    
    // ADMIN CHECK (Prevents duplicate sending from multiple users)
    const ADMIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    if (user.email !== ADMIN_EMAIL) return;

    taskList.forEach(async (task) => {
        // --- FIX: Check for "Completed", "Done", etc. (Case Insensitive) ---
        const status = task.status ? task.status.toLowerCase() : '';
        const isComplete = status === 'completed' || status === 'done';

        if (isComplete || !task.deadline) return;

        const deadline = new Date(task.deadline);
        const timeDiff = deadline - now;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // --- ALERTS ---
        if (daysLeft <= 0 && daysLeft > -3 && !task.notified0Day) {
            await triggerAlert(task,"🔥🔥 It's need to be done TODAY!", user.email, { notified0Day: true});
        }
        else if (daysLeft <= 2 && daysLeft > 0 && !task.notified2Days) {
            await triggerAlert(task, "🔥 URGENT: 2 Days Left", user.email, { notified2Days: true });
        }
        else if (daysLeft <= 7 && daysLeft > 2 && !task.notified7Days) {
            await triggerAlert(task, "⚠️ Reminder: 7 Days Left", user.email, { notified7Days: true });
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

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => console.log("Users not found"));

    const unsubBudget = safeSnapshot("transactions", setTransactions);
    const unsubLeaves = safeSnapshot("leaves", setLeaves);
    const unsubOT = safeSnapshot("ot_records", setOtRecords);
    const unsubNotifs = onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc")), (snapshot) => {
        const allNotifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setNotifications(allNotifs.filter(n => n.userEmail === currentUser?.email));
    });

    return () => {
      unsubTasks(); unsubUsers(); unsubBudget(); unsubLeaves(); unsubOT(); unsubNotifs();
    };
  }, [currentUser]);

  // --- 6. ACTIONS ---

  const updateTask = async (id, updates) => {
    try {
        const cleanedUpdates = cleanData(updates);
        const originalTask = tasks.find(t => t.id === id);

        await updateDoc(doc(db, "tasks", id), cleanedUpdates);
        console.log("Task Updated Successfully");
        
        if (originalTask) {
            const title = cleanedUpdates.title || originalTask.title;
            const description = cleanedUpdates.description || originalTask.description || "No details";
            const tag = cleanedUpdates.tag || originalTask.tag;
            const editor = currentUser?.email?.split('@')[0] || 'Unknown';
            
            // 1. Send LINE
            await sendLinePush(`📝 Task Edited:\n📌 ${title}\n📋 ${description}\n👤 By: ${editor}\n🏷️ Tag: ${tag}`, tag);

            // 2. Send Email
            await sendEmailNotification(`Task Edited: ${title}`, {
                "Title": title,
                "Details": description,
                "Edited By": editor,
                "New Tag": tag
            });
        }

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
            notified2Days: false,
            notified0Day: false
        });

        await addDoc(collection(db, "tasks"), cleanedTask);
        const desc = task.description || "No details";

        await sendEmailNotification(`New Task: ${task.title}`, { 
            "Title": task.title,
            "Details": desc 
        });
        await sendLinePush(`🆕 New Task Created:\n📌 ${task.title}\n📋 Details: ${desc}\n🏷️ [${task.tag}]\n📅 Due: ${task.deadline || 'TBD'}`, task.tag);
    } catch (error) { console.error("Error adding task:", error); }
  };
  
  const moveTask = async (taskId, newStatus) => {
    try {
        await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
        const task = tasks.find(t => t.id === taskId);
        
        await sendEmailNotification("Task Status Updated", { "Task": task?.title, "New Status": newStatus });
        await sendLinePush(`🔄 Status Update:\n📌 ${task?.title}\n📋 Details: ${task.description || '-'}\n🏷️ [${task?.tag}]\n➡️ Now: ${newStatus}`, task?.tag);
    } catch (error) { console.error("Error moving task:", error); }
  };

  const deleteTask = async (id) => { 
      if(!confirm("Delete task?")) return;
      try { 
          const taskToDelete = tasks.find(t => t.id === id);
          await deleteDoc(doc(db, "tasks", id)); 
          
          if (taskToDelete) {
             const editor = currentUser?.email?.split('@')[0] || 'Unknown';
             
             await sendLinePush(`🗑️ Task Deleted:\n📌 ${taskToDelete.title}\n📋 Details: ${taskToDelete.description}\n👤 By: ${editor}`, taskToDelete.tag);
             
             await sendEmailNotification(`Task Deleted: ${taskToDelete.title}`, {
                "Title": taskToDelete.title,
                "Deleted By": editor
             });
          }
      } catch (error) { console.error(error); } 
  };

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
    notifications, markNotificationRead, clearAllNotifications,
    allUsers
  };
};