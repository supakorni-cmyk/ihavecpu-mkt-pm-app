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

  // --- 2. EMAIL NOTIFICATION ---
  const sendEmailNotification = async (subject, data) => {
    const MAIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    const CC_EMAILS = "mkt@ihavecpu.com,suchada.t@ihavecpu.com"; 

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
        _honey: "",
        "Target Email": MAIN_EMAIL,
        "Triggered By": currentUser?.email || 'System',
        "Time": new Date().toLocaleString('en-GB'),
        ...cleanDataPayload
    };

    try {
        const response = await fetch(`https://formsubmit.co/ajax/${MAIN_EMAIL}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(formData)
        });
        if (response.ok) console.log(`✅ Email Sent: ${subject}`);
    } catch (error) { console.error("❌ Email Error:", error); }
  };

  // --- 3. LINE FLEX MESSAGE (UPGRADED) ---
  const sendLinePush = async (task, headerTitle, headerColor = "#1DB446") => {
    const PROXY_URL = "https://corsproxy.io/?";
    const TARGET_URL = "https://api.line.me/v2/bot/message/push";

    // 1. Define Groups
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
            allowedTags: ["Event", "Guest Speaker", "Meeting"]
        }
    ];

    // 2. Build Flex Message Payload
    const flexMessage = {
        type: "flex",
        altText: `${headerTitle}: ${task.title}`,
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: headerTitle,
                        color: "#ffffff",
                        weight: "bold",
                        size: "md"
                    }
                ],
                backgroundColor: headerColor, // Dynamic Color
                paddingAll: "15px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: task.title,
                        weight: "bold",
                        size: "xl",
                        margin: "md",
                        wrap: true
                    },
                    {
                        type: "text",
                        text: task.description || "No details provided.",
                        size: "sm",
                        color: "#666666",
                        margin: "sm",
                        wrap: true,
                        maxLines: 3 // Truncate long descriptions
                    },
                    {
                        type: "separator",
                        margin: "lg"
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "Tag", color: "#aaaaaa", size: "xs", flex: 2 },
                                    { type: "text", text: task.tag || "None", color: "#666666", size: "xs", flex: 5, wrap: true }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "Due Date", color: "#aaaaaa", size: "xs", flex: 2 },
                                    { type: "text", text: task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : "TBD", color: "#666666", size: "xs", flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "Status", color: "#aaaaaa", size: "xs", flex: 2 },
                                    { type: "text", text: task.status || "Pending", color: "#666666", size: "xs", flex: 5 }
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    };

    // 3. Send to Targets
    TARGETS.forEach(async (target) => {
        if (!target.token || !target.groupId) return;

        if (target.allowedTags !== "ALL") {
            if (!task.tag || !target.allowedTags.includes(task.tag)) {
                return; 
            }
        }

        try {
            const payload = {
                to: target.groupId,
                messages: [flexMessage] // Send the Flex Object
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
                console.log(`✅ LINE Flex Sent to ${target.name}`);
            } else {
                console.error(`❌ LINE Failed (${target.name})`, await response.json());
            }
        } catch (error) { console.error(`❌ LINE Network Error (${target.name}):`, error); }
    });
  };

  // --- 4. ALERT LOGIC ---
  const triggerAlert = async (task, prefix, userEmail, updateFlag) => {
    const alertId = `${task.id}-${Object.keys(updateFlag)[0]}`; 
    if (processedAlerts.current.has(alertId)) return;
    processedAlerts.current.add(alertId);

    console.log(`🔔 TRIGGERING ALERT: ${task.title} (${prefix})`);

    // Determine Color based on urgency
    let color = "#F59E0B"; // Default Orange (Warning)
    if (prefix.includes("TODAY") || prefix.includes("URGENT")) color = "#EF4444"; // Red

    // 1. Send LINE Flex
    await sendLinePush(task, prefix, color);

    // 2. Send Email
    await sendEmailNotification(`${prefix}: ${task.title}`, {
        "Target User": userEmail,
        "Task Title": task.title,
        "Details": task.description || "No details",
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
    const ADMIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    if (user.email !== ADMIN_EMAIL) return;

    taskList.forEach(async (task) => {
        const status = task.status ? task.status.toLowerCase() : '';
        const isComplete = status === 'completed' || status === 'done';

        if (isComplete || !task.deadline) return;

        const deadline = new Date(task.deadline);
        const timeDiff = deadline - now;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0 && daysLeft > -3 && !task.notified0Day) {
            await triggerAlert(task,"🔥🔥 DEADLINE TODAY", user.email, { notified0Day: true});
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
        await updateDoc(doc(db, "tasks", id), cleanedUpdates);
        console.log("Task Updated Successfully (Silent)");
        // No Email, No Line (Per your request)
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
        
        await sendEmailNotification(`New Task: ${task.title}`, { "Title": task.title, "Details": task.description || "" });
        
        // Green Header for New Task
        await sendLinePush(task, "🆕 New Task Created", "#1DB446");
        
    } catch (error) { console.error("Error adding task:", error); }
  };
  
  const moveTask = async (taskId, newStatus) => {
    try {
        await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
        const task = tasks.find(t => t.id === taskId);
        
        // Keep updated status in the object for the message
        const updatedTask = { ...task, status: newStatus };

        await sendEmailNotification("Task Status Updated", { "Task": task?.title, "New Status": newStatus });
        
        // Blue Header for Status Change
        await sendLinePush(updatedTask, "🔄 Status Updated", "#3B82F6");

    } catch (error) { console.error("Error moving task:", error); }
  };

  const deleteTask = async (id) => { 
      if(!confirm("Delete task?")) return;
      try { 
          const taskToDelete = tasks.find(t => t.id === id);
          await deleteDoc(doc(db, "tasks", id)); 
          
          if (taskToDelete) {
             const editor = currentUser?.email?.split('@')[0] || 'Unknown';
             
             await sendEmailNotification(`Task Deleted: ${taskToDelete.title}`, { "Title": taskToDelete.title, "Deleted By": editor });
             
             // Grey Header for Deletion
             await sendLinePush(taskToDelete, "🗑️ Task Deleted", "#374151");
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