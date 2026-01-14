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
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [otRecords, setOtRecords] = useState([]);
  const [albums, setAlbums] = useState([]); 
  const [photos, setPhotos] = useState([]);


  // --- FREE EMAIL PROVIDER: FormSubmit ---
  const sendEmailNotification = async (action, taskTitle, details) => {
    // 1. Main Recipient
    const MAIN_EMAIL = "mkt@ihavecpu.com"; 
    
    // 2. CC Recipients (Comma separated)
    const CC_EMAILS = "suchada.t@ihavecpu.com"; 

    // 3. Prepare Data
    const formData = {
        _subject: `${action}: ${taskTitle}`, // Custom Subject
        _cc: CC_EMAILS,                      // Send copy to other emails
        _captcha: "false",                   // Disable captcha page
        _template: "table",                  // Use a nice table format
        
        // Actual Message Content
        Task_Title: taskTitle,
        Status_Update: action,
        User: currentUser?.email || 'Unknown',
        Details: details,
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
        console.log("Email sent via FormSubmit!");
    } catch (error) {
        console.error("Email failed:", error);
    }
  };

  // --- 1. REAL-TIME DATA LISTENERS ---
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

    const unsubTasks = safeSnapshot("tasks", setTasks);
    const unsubBudget = safeSnapshot("transactions", setTransactions);
    const unsubLeaves = safeSnapshot("leaves", setLeaves);
    const unsubOT = safeSnapshot("ot_records", setOtRecords);

    return () => {
      if(unsubTasks) unsubTasks();
      if(unsubBudget) unsubBudget();
      if(unsubLeaves) unsubLeaves();
      if(unsubOT) unsubOT();
    };
  }, []);

  const cleanData = (data) => {
    const cleaned = {};
    Object.keys(data).forEach(key => {
        cleaned[key] = data[key] === undefined ? null : data[key];
    });
    return cleaned;
  };

  // --- 2. TASKS ACTIONS ---
  
  // CREATE TASK
  const addTask = async (task) => {
    try {
        await addDoc(collection(db, "tasks"), cleanData({ ...task, createdAt: new Date().toISOString() }));
        
        // TRIGGER EMAIL: NEW TASK
        sendEmailNotification(
            "New Task Created", 
            task.title, 
            `A new task has been created by ${currentUser?.email}.\n\nPriority: ${task.priority}\nAssignee: ${task.assignee || 'None'}\nStatus: ${task.status}`
        );

    } catch (error) {
        console.error("Error adding task:", error);
    }
  };
  
  const updateTask = async (id, updates) => {
    try {
        await updateDoc(doc(db, "tasks", id), cleanData(updates));
    } catch (error) {
        console.error("Error updating task:", error);
    }
  };
  
  const deleteTask = async (id) => {
    if(confirm("Delete task?")) {
        try {
            await deleteDoc(doc(db, "tasks", id));
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    }
  };
  
  // UPDATE STATUS (MOVE TASK)
  const moveTask = async (taskId, newStatus) => {
    try {
        await updateDoc(doc(db, "tasks", taskId), { status: newStatus });

        // FIND TASK DETAILS FOR EMAIL
        const task = tasks.find(t => t.id === taskId);
        const taskTitle = task ? task.title : 'Unknown Task';

        // TRIGGER EMAIL: STATUS UPDATE
        sendEmailNotification(
            "Task Status Updated",
            taskTitle,
            `The task "${taskTitle}" has been moved to: ${newStatus}.\n\nUpdated by: ${currentUser?.email}`
        );

    } catch (error) {
        console.error("Error moving task:", error);
    }
  };

  // --- 3. OTHER ACTIONS (Budget, Leave, OT, Album) ---
  const addTransaction = async (t) => {
    try { await addDoc(collection(db, "transactions"), cleanData({ ...t, createdAt: new Date().toISOString() })); } catch (error) { console.error("Error adding transaction:", error); }
  };
  const updateTransaction = async (id, updates) => {
    try { await updateDoc(doc(db, "transactions", id), cleanData(updates)); } catch (error) { console.error("Error updating transaction:", error); }
  };
  const deleteTransaction = async (id) => {
    if(confirm("Delete record?")) await deleteDoc(doc(db, "transactions", id));
  };

  const addLeave = async (leave) => {
    try { await addDoc(collection(db, "leaves"), cleanData({ ...leave, createdAt: new Date().toISOString() })); } catch (error) { console.error("Error adding leave:", error); }
  };
  const deleteLeave = async (id) => {
    if(confirm("Delete leave?")) await deleteDoc(doc(db, "leaves", id));
  };

  const addOTRecord = async (record) => {
    try { await addDoc(collection(db, "ot_records"), cleanData({ ...record, status: 'Request', createdAt: new Date().toISOString() })); } catch (error) { console.error("Error adding OT:", error); }
  };
  const deleteOTRecord = async (id) => {
    if(confirm("Delete OT record?")) await deleteDoc(doc(db, "ot_records", id));
  };
  const updateOTStatus = async (id, newStatus) => {
    try { await updateDoc(doc(db, "ot_records", id), { status: newStatus }); } catch (error) { console.error("Error updating status:", error); }
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
    photos, addPhoto, deletePhoto
  };
};