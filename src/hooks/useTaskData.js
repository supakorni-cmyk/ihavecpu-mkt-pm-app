// src/hooks/useTaskData.js
import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase'; 
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where 
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
  const [myPet, setMyPet] = useState(null); 
  
  const processedAlerts = useRef(new Set()); 
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

  const formatDateTime = (isoString) => {
      if (!isoString) return "";
      return new Date(isoString).toLocaleString('en-GB', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', hour12: false 
      });
  };

  // --- 🟢 HELPER: Smart URL Validation ---
  const getValidUrl = (string) => {
      if (!string || typeof string !== 'string') return null;
      let urlToCheck = string.trim();
      
      // Auto-add https if missing (for button compatibility)
      if (!urlToCheck.startsWith('http://') && !urlToCheck.startsWith('https://')) {
          urlToCheck = `https://${urlToCheck}`;
      }

      try {
          new URL(urlToCheck); // Will throw if invalid
          return urlToCheck;
      } catch (_) {
          return null; // Not a URL
      }
  };

  // --- 2. EMAIL NOTIFICATION ---
  const sendEmailNotification = async (subject, data) => {
    const MAIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    const CC_EMAILS = "mkt@ihavecpu.com,suchada.t@ihavecpu.com"; 

    const cleanDataPayload = {};
    Object.keys(data).forEach(key => {
        const value = data[key];
        cleanDataPayload[key] = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value);
    });

    const formData = {
        _subject: subject,
        _cc: CC_EMAILS,
        _template: "box",
        _captcha: "false",
        _honey: "",
        ...cleanDataPayload
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

  // --- 3. LINE FLEX MESSAGE (Updated) ---
  const sendLinePush = async (task, headerTitle, headerColor = "#1DB446") => {
    const PROXY_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL; 

    if (!PROXY_URL) return;

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

    const formatTime = (isoString) => {
        if (!isoString) return null;
        return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };
    
    let timeDisplay = "TBD";
    if (task.startTime) {
        timeDisplay = formatTime(task.startTime);
        if (task.endTime) timeDisplay += ` - ${formatTime(task.endTime)}`;
    } else if (task.deadline) {
        timeDisplay = `Due: ${formatTime(task.deadline)}`;
    }

    // 🟢 1. CHECK LINKS
    const refLink = getValidUrl(task.reference);
    const finalLink = getValidUrl(task.finalFile);
    const locationLink = getValidUrl(task.location); // Check if location is a URL

    // 🟢 2. CREATE BUTTONS
    const linkButtons = [];

    if (refLink) {
        linkButtons.push({
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#3B82F6", // Blue
            action: { type: "uri", label: "📄 Reference", uri: refLink },
            margin: "sm"
        });
    }

    if (finalLink) {
        linkButtons.push({
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#10B981", // Green
            action: { type: "uri", label: "📂 Final File", uri: finalLink },
            margin: "sm"
        });
    }

    if (locationLink) {
        linkButtons.push({
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F59E0B", // Orange
            action: { type: "uri", label: "📍 Location Map", uri: locationLink },
            margin: "sm"
        });
    }

    // 🟢 3. CONSTRUCT FLEX MESSAGE
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
                    { type: "text", text: headerTitle, color: "#ffffff", weight: "bold", size: "md" }
                ],
                backgroundColor: headerColor, 
                paddingAll: "15px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: task.title, weight: "bold", size: "xl", margin: "md", wrap: true },
                    { type: "text", text: task.description || "No details provided.", size: "sm", color: "#666666", margin: "sm", wrap: true, maxLines: 3 },
                    { type: "separator", margin: "lg" },
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
                                    { type: "text", text: "Date", color: "#aaaaaa", size: "xs", flex: 2 },
                                    { type: "text", text: task.startTime ? new Date(task.startTime).toLocaleDateString('en-GB') : (task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : "TBD"), color: "#666666", size: "xs", flex: 5 }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "Time", color: "#aaaaaa", size: "xs", flex: 2 },
                                    { type: "text", text: timeDisplay, color: "#666666", size: "xs", flex: 5 }
                                ]
                            },
                            // 🟢 Show Location TEXT only if it is NOT a Link (e.g. "Meeting Room 1")
                            (task.location && !locationLink) ? {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "Location", color: "#aaaaaa", size: "xs", flex: 2 },
                                    { type: "text", text: task.location, color: "#666666", size: "xs", flex: 5, wrap: true }
                                ]
                            } : null
                        ].filter(Boolean)
                    }
                ]
            },
            // 🟢 4. ADD FOOTER IF BUTTONS EXIST
            footer: linkButtons.length > 0 ? {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: linkButtons
            } : undefined
        }
    };

    TARGETS.forEach(async (target) => {
        if (!target.token || !target.groupId) return;
        if (target.allowedTags !== "ALL") {
            if (!task.tag || !target.allowedTags.includes(task.tag)) return;
        }
        
        try {
            const relayData = { token: target.token, payload: { to: target.groupId, messages: [flexMessage] } };
            await fetch(PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                body: JSON.stringify(relayData)
            });
            console.log(`✅ LINE Sent to ${target.name}`);
        } catch (error) { console.error(`❌ Network Error (${target.name}):`, error); }
    });
  };

  // --- 4. ALERT LOGIC ---
  const triggerAlert = async (task, prefix, userEmail, updateFlag) => {
    const alertId = `${task.id}-${Object.keys(updateFlag)[0]}`; 
    if (processedAlerts.current.has(alertId)) return;
    processedAlerts.current.add(alertId);

    let color = "#F59E0B"; 
    if (prefix.includes("TODAY") || prefix.includes("URGENT")) color = "#EF4444"; 

    await sendLinePush(task, prefix, color);

    const emailData = {
        "Status": "⚠️ " + prefix.replace("🔥🔥", "").replace("🔥", "").trim(),
        "Task": task.title,
    };
    if (task.startTime) emailData["Start Date & Time"] = formatDateTime(task.startTime);
    if (task.endTime) emailData["End Date & Time"] = formatDateTime(task.endTime);
    if (task.deadline) emailData["Due Date & Time"] = formatDateTime(task.deadline);
    emailData["Details"] = task.description || "-";

    await sendEmailNotification(`${prefix}: ${task.title}`, emailData);

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
    if (!user) return;
    const now = new Date();
    const ADMIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    if (user.email !== ADMIN_EMAIL) return;

    taskList.forEach(async (task) => {
        const status = task.status ? task.status.toLowerCase() : '';
        const isComplete = status === 'completed' || status === 'done' || status === 'canceled';

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

  // --- 🐶 5. PET ACTIONS & GAME LOOP ---
  const adoptPet = async (petData) => {
      if (!currentUser) return;
      try {
          const newPet = {
              ...petData,
              ownerEmail: currentUser.email,
              stats: { hunger: 80, happiness: 80, energy: 80 },
              createdAt: new Date().toISOString(),
              lastInteraction: new Date().toISOString()
          };
          await addDoc(collection(db, "pets"), newPet);
      } catch (error) { console.error("Adoption failed:", error); }
  };

  const interactWithPet = async (action) => {
      if (!myPet) return;
      
      const currentStats = {
          hunger: Number(myPet.stats?.hunger) || 0,
          happiness: Number(myPet.stats?.happiness) || 0,
          energy: Number(myPet.stats?.energy) || 0,
      };

      const newStats = { ...currentStats };
      
      if (action === 'eating') {
          newStats.hunger = Math.min(100, currentStats.hunger + 20);
          newStats.energy = Math.min(100, currentStats.energy + 5);
      } 
      else if (action === 'playing') {
          newStats.happiness = Math.min(100, currentStats.happiness + 15);
          newStats.energy = Math.max(0, currentStats.energy - 20);
          newStats.hunger = Math.max(0, currentStats.hunger - 10);
      } 
      else if (action === 'petting') {
          newStats.happiness = Math.min(100, currentStats.happiness + 10);
      } 
      else if (action === 'sleeping') {
          newStats.energy = 100;
          newStats.hunger = Math.max(0, currentStats.hunger - 20);
      }
      
      try {
          await updateDoc(doc(db, "pets", myPet.id), { 
              stats: newStats,
              lastInteraction: new Date().toISOString()
          });
      } catch (error) { console.error("Interaction failed:", error); }
  };

  useEffect(() => {
    if (!myPet || !myPet.stats) return;

    const intervalId = setInterval(async () => {
        const currentStats = {
            hunger: Number(myPet.stats.hunger) || 0,
            happiness: Number(myPet.stats.happiness) || 0,
            energy: Number(myPet.stats.energy) || 0,
        };
        
        const newStats = {
            hunger: Math.max(0, currentStats.hunger - 2),
            happiness: Math.max(0, currentStats.happiness - 2),
            energy: Math.max(0, currentStats.energy - 1)
        };

        if (
            newStats.hunger !== currentStats.hunger || 
            newStats.happiness !== currentStats.happiness || 
            newStats.energy !== currentStats.energy
        ) {
            try {
                await updateDoc(doc(db, "pets", myPet.id), { stats: newStats });
            } catch (err) { console.error("Decay error:", err); }
        }
    }, 30000); 

    return () => clearInterval(intervalId);
  }, [myPet]);

  // --- 6. LISTENERS ---
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

    let unsubPet = () => {};
    if (currentUser?.email) {
        const qPet = query(collection(db, "pets"), where("ownerEmail", "==", currentUser.email));
        unsubPet = onSnapshot(qPet, (snapshot) => {
            if (!snapshot.empty) {
                const docData = snapshot.docs[0];
                setMyPet({ ...docData.data(), id: docData.id });
            } else {
                setMyPet(null);
            }
        });
    }

    const unsubBudget = safeSnapshot("transactions", setTransactions);
    const unsubLeaves = safeSnapshot("leaves", setLeaves);
    const unsubOT = safeSnapshot("ot_records", setOtRecords);
    const unsubNotifs = onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc")), (snapshot) => {
        const allNotifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setNotifications(allNotifs.filter(n => n.userEmail === currentUser?.email));
    });

    return () => {
      unsubTasks(); unsubUsers(); unsubBudget(); unsubLeaves(); unsubOT(); unsubNotifs(); unsubPet();
    };
  }, [currentUser]);

  // --- 7. ACTIONS ---
  const updateTask = async (id, updates) => {
    try {
        const oldTask = tasks.find(t => t.id === id);
        if (!oldTask) return;

        const cleanedUpdates = cleanData(updates);
        await updateDoc(doc(db, "tasks", id), cleanedUpdates);

        const changedFields = [];
        if (updates.startTime && updates.startTime !== oldTask.startTime) changedFields.push("Start Time");
        if (updates.endTime && updates.endTime !== oldTask.endTime) changedFields.push("End Time");
        if (updates.deadline && updates.deadline !== oldTask.deadline) changedFields.push("Due Date");
        if (updates.description && updates.description !== oldTask.description) changedFields.push("Details");
        if (updates.location && updates.location !== oldTask.location) changedFields.push("Location");

        if (changedFields.length > 0) {
            const mergedTask = { ...oldTask, ...updates }; 
            await sendLinePush(mergedTask, "✏️ Task Updated", "#3B82F6"); 
        }
    } catch (error) { console.error("FAILED to update task:", error); }
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
        
        const emailData = { "Task": task.title };
        if (task.startTime) emailData["Start Date & Time"] = formatDateTime(task.startTime);
        emailData["Details"] = task.description || "No details provided";
        
        await sendEmailNotification(`New Task: ${task.title}`, emailData);
        await sendLinePush(task, "🆕 New Task Created", "#1DB446");
        
    } catch (error) { console.error("Error adding task:", error); }
  };
  
  const moveTask = async (taskId, newStatus) => {
    try {
        await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
        const task = tasks.find(t => t.id === taskId);
        const updatedTask = { ...task, status: newStatus };

        if (newStatus === 'canceled') {
            await sendLinePush(updatedTask, "🚫 This task was canceled", "#9CA3AF");
        } else {
            await sendLinePush(updatedTask, "🔄 Status Updated", "#3B82F6");
        }
    } catch (error) { console.error("Error moving task:", error); }
  };
  
  const deleteTask = async (id) => { 
      if(!confirm("Delete task?")) return;
      try { 
          await deleteDoc(doc(db, "tasks", id)); 
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

  const activeNotifications = useMemo(() => {
    return notifications.filter(n => {
        if (!n.taskId) return true;
        const task = tasks.find(t => t.id === n.taskId);
        if (task && (task.status === 'canceled' || task.status === 'Canceled')) {
            return false;
        }
        return true;
    });
  }, [notifications, tasks]);

  return {
    tasks, addTask, updateTask, deleteTask, moveTask,
    transactions, addTransaction, deleteTransaction, updateTransaction,
    leaves, addLeave, deleteLeave,
    otRecords, addOTRecord, deleteOTRecord, updateOTStatus,
    albums, addAlbum, deleteAlbum,
    photos, addPhoto, deletePhoto,
    notifications: activeNotifications,
    markNotificationRead, clearAllNotifications,
    allUsers,
    myPet, adoptPet, interactWithPet 
  };
};