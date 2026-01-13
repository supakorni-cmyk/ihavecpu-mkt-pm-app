// src/hooks/useTaskData.js
import { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import emailjs from '@emailjs/browser'; // Import EmailJS
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

  // --- EMAIL CONFIGURATION ---
  // 1. Sign up at https://www.emailjs.com/
  // 2. Create a generic Email Service (e.g., Gmail)
  // 3. Create an Email Template with variables: {{subject}}, {{message}}, {{to_email}}
  const EMAIL_SERVICE_ID = "service_ld9gdun"; // Replace with real ID
  const EMAIL_TEMPLATE_ID = "template_y1drpcl"; // Replace with real ID
  const EMAIL_PUBLIC_KEY = "jDQgm1SiqFlSBF9d3";   // Replace with real Key
  
  const TARGET_EMAILS = "mkt@ihavecpu.com";

  // --- HELPER: SEND EMAIL ---
  const sendEmailNotification = (action, taskTitle, details) => {
    // If keys are not set, just log to console (Simulation Mode)
    if (EMAIL_SERVICE_ID === "service_ld9gdun") {
        console.log(`%c[EMAIL SIMULATION]`, 'color: cyan; font-weight: bold;');
        console.log(`To: ${TARGET_EMAILS}`);
        console.log(`Subject: ${action} - ${taskTitle}`);
        console.log(`Body: ${details}`);
        return;
    }

    const templateParams = {
        to_email: TARGET_EMAILS,
        subject: `${action}: ${taskTitle}`,
        message: details,
        task_title: taskTitle,
        action_type: action,
        user_email: currentUser?.email || 'Unknown User'
    };

    emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, EMAIL_PUBLIC_KEY)
        .then((response) => {
            console.log('SUCCESS! Email sent.', response.status, response.text);
        }, (err) => {
            console.error('FAILED to send email...', err);
        });
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