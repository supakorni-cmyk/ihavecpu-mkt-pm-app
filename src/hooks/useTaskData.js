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

  // --- 1. CRITICAL FIX: SMART DEEP CLEAN DATA ---
  const cleanData = (data) => {
    // 1. Handle Primitives & Nulls
    if (data === undefined || data === null) return null;
    
    // 2. Remove Functions (Firestore cannot save functions)
    if (typeof data === 'function') return null;

    // 3. Handle Arrays
    if (Array.isArray(data)) return data.map(cleanData);
    
    // 4. Handle Dates (Keep them as Date objects for Firestore)
    if (data instanceof Date) return data;

    // 5. Handle Objects
    if (typeof data === 'object') {
        // AUTO-FIX: If accidentally passed window.location, save the URL string instead
        if (data.href && typeof data.assign === 'function') {
            return data.href;
        }

        const cleaned = {};
        Object.keys(data).forEach(key => {
            const value = cleanData(data[key]);
            cleaned[key] = value;
        });
        return cleaned;
    }
    
    return data;
  };

  // --- 2. EMAIL NOTIFICATION HELPER ---
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
        ...cleanData(data) // Ensure email data is also clean
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

  // --- 3. DEADLINE LOGIC ---
  const triggerAlert = async (task, prefix, userEmail, updateFlag) => {
    await sendEmailNotification(`${prefix}: ${task.title}`, {
        "Target User": userEmail,
        "Task Title": task.title,
        "Due Date": new Date(task.deadline).toLocaleString('en-GB'),
        "Status": task.status,
        "Message": "This task is approaching its deadline. Please check status."
    });

    await addDoc(collection(db, "notifications"), {
        title: `${prefix}: ${task.title}`,
        taskId: task.id,
        userEmail: userEmail,
        isRead: false,
        createdAt: new Date().toISOString(),
        type: 'alert'
    });

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

  // --- 4. LISTENERS ---
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

  // --- 5. ACTIONS ---

  const updateTask = async (id, updates) => {
    try {
        console.log("Saving Task ID:", id);
        
        // 1. Deep Clean (Fixes undefined & window.location issues)
        const cleanedUpdates = cleanData(updates);
        
        // 2. Check Size
        const size = JSON.stringify(cleanedUpdates).length;
        if (size > 800000) { 
            throw new Error("Data size too large! (Image might be too big)");
        }

        // 3. Update Firestore
        await updateDoc(doc(db, "tasks", id), cleanedUpdates);
        console.log("Task Updated Successfully");
        
    } catch (error) {
        console.error("FAILED to update task:", error);
        
        if (error.code === 'resource-exhausted') {
            alert("Error: Image too large! Please upload a smaller photo.");
        } else if (error.code === 'invalid-argument') {
            // This is the error you were seeing. The alerts below will now help debug if it persists.
            alert(`Error: Invalid Data Structure. (Details: ${error.message})`);
        } else {
            alert(`Failed to save: ${error.message}`);
        }
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
        sendEmailNotification(`New Task: ${task.title}`, { "Title": task.title });
    } catch (error) { console.error("Error adding task:", error); }
  };
  
  const deleteTask = async (id) => { if(confirm("Delete task?")) { try { await deleteDoc(doc(db, "tasks", id)); } catch (error) { console.error(error); } } };
  
  const moveTask = async (taskId, newStatus) => {
    try {
        await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
        const task = tasks.find(t => t.id === taskId);
        sendEmailNotification("Task Status Updated", { "Task": task?.title, "New Status": newStatus });
    } catch (error) { console.error("Error moving task:", error); }
  };

  const markNotificationRead = async (id) => { try { await updateDoc(doc(db, "notifications", id), { isRead: true }); } catch(e) { console.error(e); } };
  const clearAllNotifications = async () => { notifications.forEach(async (n) => { try { await deleteDoc(doc(db, "notifications", n.id)); } catch(e) { console.error(e); } }); };
  const addTransaction = async (t) => { try { await addDoc(collection(db, "transactions"), cleanData({ ...t, createdAt: new Date().toISOString() })); } catch (error) { console.error(error); } };
  const updateTransaction = async (id, u) => { try { await updateDoc(doc(db, "transactions", id), cleanData(u)); } catch (error) { console.error(error); } };
  const deleteTransaction = async (id) => { if(confirm("Delete record?")) await deleteDoc(doc(db, "transactions", id)); };
  const addLeave = async (leave) => { try { await addDoc(collection(db, "leaves"), cleanData({ ...leave, createdAt: new Date().toISOString() })); sendEmailNotification(`Leave Request: ${leave.name}`, leave); } catch (error) { console.error(error); } };
  const deleteLeave = async (id) => { if(confirm("Delete leave?")) await deleteDoc(doc(db, "leaves", id)); };
  const addOTRecord = async (record) => { try { await addDoc(collection(db, "ot_records"), cleanData({ ...record, status: 'Request', createdAt: new Date().toISOString() })); sendEmailNotification(`OT Request: ${record.name}`, record); } catch (error) { console.error(error); } };
  const deleteOTRecord = async (id) => { if(confirm("Delete OT record?")) await deleteDoc(doc(db, "ot_records", id)); };
  const updateOTStatus = async (id, newStatus) => { try { await updateDoc(doc(db, "ot_records", id), { status: newStatus }); } catch (error) { console.error(error); } };
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
    notifications, markNotificationRead, clearAllNotifications
  };
};