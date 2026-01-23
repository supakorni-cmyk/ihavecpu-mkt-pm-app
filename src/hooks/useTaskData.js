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

  // --- 1. HELPER: EMAIL NOTIFICATION (Defined First) ---
  const sendEmailNotification = async (subject, data) => {
    const MAIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    const CC_EMAILS = "mkt@ihavecpu.com, suchada.t@ihavecpu.com"; 

    const formData = {
        _subject: subject,
        _cc: CC_EMAILS,
        _template: "table",
        _captcha: "false",
        "Notification Time": new Date().toLocaleString('en-GB'),
        "Action By": currentUser?.email || 'System Auto-Alert',
        ...data
    };

    try {
        await fetch(`https://formsubmit.co/ajax/${MAIN_EMAIL}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(formData)
        });
        console.log(`Email Sent Successfully: ${subject}`);
    } catch (error) {
        console.error("Email failed:", error);
    }
  };

  // --- 2. DEADLINE CHECKER LOGIC (Moved UP before useEffect) ---
  
  // A. Trigger Alert Helper
  const triggerAlert = async (task, prefix, userEmail, updateFlag) => {
    // 1. Send Email
    await sendEmailNotification(`${prefix}: ${task.title}`, {
        "Target User": userEmail,
        "Task Title": task.title,
        "Due Date": new Date(task.deadline).toLocaleString('en-GB'),
        "Status": task.status,
        "Message": "This task is approaching its deadline. Please check status."
    });

    // 2. Create In-App Notification
    await addDoc(collection(db, "notifications"), {
        title: `${prefix}: ${task.title}`,
        taskId: task.id,
        userEmail: userEmail,
        isRead: false,
        createdAt: new Date().toISOString(),
        type: 'alert'
    });

    // 3. Update Task (prevent spamming)
    await updateDoc(doc(db, "tasks", task.id), updateFlag);
  };

  // B. Main Check Function
  const checkDeadlines = (taskList, user) => {
    const now = new Date();
    
    taskList.forEach(async (task) => {
        // Validation checks
        if (task.status === 'completed' || !task.deadline) return;
        
        // Filter by user name (if email not stored in assignee)
        if (task.assignee?.name && user.name && !task.assignee.name.includes(user.name.split(' ')[0])) return;

        const deadline = new Date(task.deadline);
        const timeDiff = deadline - now;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // ALERT 1: 7 Days Left
        if (daysLeft <= 7 && daysLeft > 2 && !task.notified7Days) {
            await triggerAlert(task, "⚠️ Reminder: 7 Days Left", user.email, { notified7Days: true });
        }

        // ALERT 2: 2 Days Left
        if (daysLeft <= 2 && daysLeft >= 0 && !task.notified2Days) {
            await triggerAlert(task, "🔥 URGENT: 2 Days Left", user.email, { notified2Days: true });
        }
    });
  };

  // --- 3. HELPER: CLEAN DATA ---
  const cleanData = (data) => {
    const cleaned = {};
    Object.keys(data).forEach(key => {
        cleaned[key] = data[key] === undefined ? null : data[key];
    });
    return cleaned;
  };

  // --- 4. REAL-TIME DATA LISTENERS ---
  useEffect(() => {
    const safeSnapshot = (colName, setter) => {
        try {
            const q = query(collection(db, colName), orderBy("createdAt", "desc"));
            return onSnapshot(q, (snapshot) => {
                setter(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            }, (error) => console.error(`Error reading ${colName}:`, error));
        } catch (err) {
            console.error(`Setup failed for ${colName}:`, err);
            return () => {};
        }
    };

    // Load Tasks & Trigger Check
    const unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy("createdAt", "desc")), (snapshot) => {
        const loadedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setTasks(loadedTasks);
        
        // Now checkDeadlines is defined and safe to call
        if (currentUser?.email) {
            checkDeadlines(loadedTasks, currentUser);
        }
    });

    const unsubBudget = safeSnapshot("transactions", setTransactions);
    const unsubLeaves = safeSnapshot("leaves", setLeaves);
    const unsubOT = safeSnapshot("ot_records", setOtRecords);

    // Load Notifications
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
  }, [currentUser]); // Dependencies

  // --- 5. ACTIONS ---

  const markNotificationRead = async (id) => {
      try { await updateDoc(doc(db, "notifications", id), { isRead: true }); } catch(e) { console.error(e); }
  };

  const clearAllNotifications = async () => {
      notifications.forEach(async (n) => {
          try { await deleteDoc(doc(db, "notifications", n.id)); } catch(e) { console.error(e); }
      });
  };

  const addTask = async (task) => {
    try {
        await addDoc(collection(db, "tasks"), cleanData({ 
            ...task, 
            createdAt: new Date().toISOString(),
            notified7Days: false,
            notified2Days: false
        }));
        
        sendEmailNotification(`New Task: ${task.title}`, {
            "Task Title": task.title,
            "Tag": task.tag,
            "Details": task.description || '-',
            "Requirement": task.requirements || [], 
            "Due Date": task.deadline || 'No Date',
            "Reference": task.reference || '-',
            "Final Link": task.link || '-'
        });
    } catch (error) { console.error("Error adding task:", error); }
  };
  
  const updateTask = async (id, updates) => {
    try { await updateDoc(doc(db, "tasks", id), cleanData(updates)); } catch (error) { console.error(error); }
  };
  
  const deleteTask = async (id) => {
    if(confirm("Delete task?")) {
        try { await deleteDoc(doc(db, "tasks", id)); } catch (error) { console.error(error); }
    }
  };
  
  const moveTask = async (taskId, newStatus) => {
    try {
        await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
        const task = tasks.find(t => t.id === taskId);
        const taskTitle = task ? task.title : 'Unknown Task';
        sendEmailNotification("Task Status Updated", {
            "Task": taskTitle,
            "New Status": newStatus,
            "Updated By": currentUser?.email
        });
    } catch (error) { console.error("Error moving task:", error); }
  };

  const addTransaction = async (t) => { try { await addDoc(collection(db, "transactions"), cleanData({ ...t, createdAt: new Date().toISOString() })); } catch (error) { console.error(error); } };
  const updateTransaction = async (id, u) => { try { await updateDoc(doc(db, "transactions", id), cleanData(u)); } catch (error) { console.error(error); } };
  const deleteTransaction = async (id) => { if(confirm("Delete record?")) await deleteDoc(doc(db, "transactions", id)); };

  const addLeave = async (leave) => {
    try { 
        await addDoc(collection(db, "leaves"), cleanData({ ...leave, createdAt: new Date().toISOString() })); 
        sendEmailNotification(`Leave Request: ${leave.name}`, {
            "Employee Name": leave.name,
            "Leave Type": leave.type,
            "Start Date": leave.startDate,
            "End Date": leave.endDate,
            "Duration": leave.duration,
            "Details": leave.details || '-'
        });
    } catch (error) { console.error("Error adding leave:", error); }
  };
  const deleteLeave = async (id) => { if(confirm("Delete leave?")) await deleteDoc(doc(db, "leaves", id)); };

  const addOTRecord = async (record) => {
    try { 
        await addDoc(collection(db, "ot_records"), cleanData({ ...record, status: 'Request', createdAt: new Date().toISOString() })); 
        sendEmailNotification(`OT Request: ${record.name}`, {
            "Employee Name": record.name,
            "Date": record.date,
            "Time": `${record.startTime} - ${record.endTime}`,
            "Duration": `${record.duration} hours`,
            "Details": record.details || '-'
        });
    } catch (error) { console.error("Error adding OT:", error); }
  };
  const deleteOTRecord = async (id) => { if(confirm("Delete OT record?")) await deleteDoc(doc(db, "ot_records", id)); };
  
  const updateOTStatus = async (id, newStatus) => {
    try { 
        await updateDoc(doc(db, "ot_records", id), { status: newStatus }); 
        const record = otRecords.find(r => r.id === id);
        if(record) {
            sendEmailNotification(`OT ${newStatus}: ${record.name}`, {
                "Employee Name": record.name,
                "Status Update": newStatus,
                "Date": record.date,
                "Duration": record.duration
            });
        }
    } catch (error) { console.error("Error updating status:", error); }
  };

  const addAlbum = (name) => setAlbums([...albums, { id: Date.now(), name, cover: null }]);
  const deleteAlbum = (id) => setAlbums(albums.filter(a => a.id !== id));
  const addPhoto = (photo) => setPhotos([...photos, { ...photo, id: Date.now() }]);
  const deletePhoto = (id) => setPhotos(photos.filter(p => p.id !== id));

  return {
    tasks, addTask, updateTask, deleteTask, moveTask,
    transactions, addTransaction, deleteTransaction, updateTransaction,
    leaves, addLeave, deleteLeave,
    otRecords, addOTRecord, deleteOTRecord, updateOTStatus,
    albums, addAlbum, deleteAlbum,
    photos, addPhoto, deletePhoto,
    // NEW EXPORTS
    notifications, markNotificationRead, clearAllNotifications
  };
};