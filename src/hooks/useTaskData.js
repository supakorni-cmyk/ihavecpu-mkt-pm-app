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
  where,
  runTransaction 
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
  const [documents, setDocuments] = useState([]); 
  const [myPet, setMyPet] = useState(null); 
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

  const getValidUrl = (string) => {
      if (!string || typeof string !== 'string') return null;
      let urlToCheck = string.trim();
      if (!urlToCheck.startsWith('http://') && !urlToCheck.startsWith('https://')) {
          urlToCheck = `https://${urlToCheck}`;
      }
      try { new URL(urlToCheck); return urlToCheck; } catch (_) { return null; }
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

  // --- 3. LINE FLEX MESSAGE ---
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

    const appUrl = window.location.origin;
    const taskDeepLink = `${appUrl}?taskId=${task.id}`;

    const formatDateLine = (isoString) => {
        if (!isoString) return null;
        try { return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return null; }
    };

    const formatTime = (isoString) => {
        if (!isoString) return null;
        try { return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return null; }
    };
    
    const startIso = task.startTime || task.startDate;
    const endIso = task.endTime || task.endDate;
    const dueIso = task.deadline || task.dueDate;

    let dateDisplay = "No Date";
    let timeDisplay = "All Day";

    if (startIso) {
        dateDisplay = formatDateLine(startIso) || "Invalid Date";
        timeDisplay = formatTime(startIso) || "TBD";
        if (endIso) {
            const endTime = formatTime(endIso);
            if (endTime) timeDisplay += ` - ${endTime}`;
        }
    } else if (dueIso) {
        dateDisplay = formatDateLine(dueIso) || "Invalid Date";
        timeDisplay = `Due: ${formatTime(dueIso) || "TBD"}`;
    }

    const refLink = getValidUrl(task.reference);
    const finalLink = getValidUrl(task.finalFile);
    const locationLink = getValidUrl(task.location);
    const MEGAPHONE_IMAGE = "https://images.unsplash.com/photo-1585676625395-9c8d30327776?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max";
    const heroImageUrl = getValidUrl(task.imageUrl) || MEGAPHONE_IMAGE;

    const primaryButton = {
        type: "button",
        style: "primary",
        color: "#3B82F6",
        height: "sm",
        action: { type: "uri", label: "🚀 Go to Task", uri: taskDeepLink },
        margin: "md"
    };

    const actions = [];
    if (refLink) actions.push({ type: "uri", label: "📄 Reference", uri: refLink });
    if (finalLink) actions.push({ type: "uri", label: "📂 Final File", uri: finalLink });
    if (locationLink) actions.push({ type: "uri", label: "📍 Location", uri: locationLink });

    const secondaryButtons = actions.map(act => ({
        type: "button",
        style: "secondary",
        color: "#ffffff",
        height: "sm",
        action: act,
        margin: "sm"
    }));

    const flexMessage = {
        type: "flex",
        altText: `${headerTitle}: ${task.title || "Task"}`,
        contents: {
            type: "bubble",
            size: "mega",
            hero: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "image", url: heroImageUrl, size: "full", aspectMode: "cover", aspectRatio: "20:13", gravity: "center" },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [{ type: "text", text: (task.tag || "TASK").toUpperCase(), size: "xs", color: "#ffffff", align: "center", weight: "bold" }],
                        position: "absolute",
                        backgroundColor: "#eb4d4b",
                        cornerRadius: "md",
                        paddingAll: "xs",
                        offsetTop: "12px",
                        offsetStart: "12px",
                        maxWidth: "120px"
                    }
                ],
                paddingAll: "none" 
            },
            body: {
                type: "box",
                layout: "vertical",
                backgroundColor: "#202833",
                contents: [
                    { type: "text", text: headerTitle, weight: "bold", size: "xxs", color: "#eb4d4b" },
                    { type: "text", text: task.title || "No Title", weight: "bold", size: "xl", color: "#ffffff", wrap: true, margin: "sm" },
                    { type: "box", layout: "baseline", margin: "md", contents: [{ type: "text", text: "📅", size: "sm", flex: 1, color: "#9ca3af" }, { type: "text", text: dateDisplay, size: "sm", flex: 8, color: "#e5e7eb", weight: "bold" }] },
                    { type: "box", layout: "baseline", margin: "sm", contents: [{ type: "text", text: "⏰", size: "sm", flex: 1, color: "#9ca3af" }, { type: "text", text: timeDisplay, size: "sm", flex: 8, color: "#9ca3af" }] },
                    (task.location && !locationLink) ? { type: "box", layout: "baseline", margin: "md", contents: [{ type: "text", text: "📍", size: "sm", flex: 1, color: "#9ca3af" }, { type: "text", text: task.location, size: "sm", flex: 8, color: "#9ca3af", wrap: true }] } : null,
                    { type: "separator", margin: "lg", color: "#374151" },
                    primaryButton,
                    ...(secondaryButtons.length > 0 ? [{ type: "box", layout: "vertical", margin: "sm", contents: secondaryButtons }] : [])
                ].filter(Boolean),
                paddingAll: "20px"
            }
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
  const triggerAlert = async (task, prefix, userEmail, updateKey) => {
    let color = "#F59E0B"; 
    if (prefix.includes("TODAY") || prefix.includes("URGENT")) color = "#EF4444";

    try {
        await runTransaction(db, async (transaction) => {
            const taskRef = doc(db, "tasks", task.id);
            const taskSnapshot = await transaction.get(taskRef);
            if (!taskSnapshot.exists()) throw "Task does not exist!";
            const freshTask = taskSnapshot.data();
            if (freshTask[updateKey] === true) throw "ALREADY_SENT"; 
            transaction.update(taskRef, { [updateKey]: true });
        });

        console.log(`🔔 Sending Alert: ${prefix} for ${task.title}`);
        await sendLinePush(task, prefix, color);

        const appUrl = window.location.origin;
        const taskDeepLink = `${appUrl}?taskId=${task.id}`;

        const emailData = {
            "Status": "⚠️ " + prefix.replace("🔥🔥", "").replace("🔥", "").trim(),
            "Task": task.title,
            "Link": taskDeepLink
        };
        const startIso = task.startTime || task.startDate;
        const dueIso = task.deadline || task.dueDate;
        
        if (startIso) emailData["Start Date & Time"] = formatDateTime(startIso);
        if (dueIso) emailData["Due Date & Time"] = formatDateTime(dueIso);
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

    } catch (e) {
        if (e === "ALREADY_SENT") {
            console.log(`🚫 Skipped duplicate alert for ${task.title}.`);
        } else {
            console.error("Transaction failed: ", e);
        }
    }
  };

  // 🟢 FIXED: DEADLINE CHECKER (Strictly prevents past notifications)
  const checkDeadlines = (taskList, user) => {
    if (!user) return;
    const now = new Date();
    const ADMIN_EMAIL = "supakorn.i@ihavecpu.com"; 
    if (user.email !== ADMIN_EMAIL) return;

    taskList.forEach(async (task) => {
        const status = task.status ? task.status.toLowerCase() : '';
        const isComplete = status === 'completed' || status === 'done' || status === 'canceled';
        if (isComplete) return;

        const deadlineIso = task.deadline || task.dueDate || task.startDate || task.startTime;
        if (!deadlineIso) return;

        const deadline = new Date(deadlineIso);
        
        // 🛑 STOP: If deadline is in the past, do not send notifications.
        if (deadline < now) return; 

        // Calculate Days Left (Positive Numbers)
        // 1 = Today (within 24h), 2 = Tomorrow, etc.
        const timeDiff = deadline - now;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Logic:
        // daysLeft = 1 (Means < 24h left) -> Today Alert
        // daysLeft = 2 or 3 -> 2 Days Alert
        // daysLeft = 4 to 7 -> 7 Days Alert

        if (daysLeft <= 1 && !task.notified0Day) {
            await triggerAlert(task,"🔥🔥 DEADLINE TODAY", user.email, "notified0Day");
        }
        else if (daysLeft > 1 && daysLeft <= 3 && !task.notified2Days) {
            await triggerAlert(task, "🔥 URGENT: 2 Days Left", user.email, "notified2Days");
        }
        else if (daysLeft > 3 && daysLeft <= 7 && !task.notified7Days) {
            await triggerAlert(task, "⚠️ Reminder: 7 Days Left", user.email, "notified7Days");
        }
    });
  };

  // --- 5. DOCUMENT ACTIONS ---
  const addDocument = async (docData) => {
      try {
          await addDoc(collection(db, "documents"), cleanData({
              ...docData,
              createdAt: new Date().toISOString(),
              createdBy: currentUser?.email
          }));
      } catch (e) { console.error("Error adding document:", e); }
  };

  const updateDocument = async (id, updates) => {
      try {
          await updateDoc(doc(db, "documents", id), cleanData(updates));
      } catch (e) { console.error("Error updating document:", e); }
  };

  const deleteDocument = async (id) => {
      if(confirm("Delete this document permanently?")) {
          try { await deleteDoc(doc(db, "documents", id)); } catch (e) { console.error(e); }
      }
  };

  // --- 6. PET ACTIONS ---
  const adoptPet = async (petData) => {
      if (!currentUser) return;
      try {
          await addDoc(collection(db, "pets"), {
              ...petData,
              ownerEmail: currentUser.email,
              stats: { hunger: 80, happiness: 80, energy: 80 },
              createdAt: new Date().toISOString(),
              lastInteraction: new Date().toISOString()
          });
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
      } else if (action === 'playing') {
          newStats.happiness = Math.min(100, currentStats.happiness + 15);
          newStats.energy = Math.max(0, currentStats.energy - 20);
          newStats.hunger = Math.max(0, currentStats.hunger - 10);
      } else if (action === 'petting') {
          newStats.happiness = Math.min(100, currentStats.happiness + 10);
      } else if (action === 'sleeping') {
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
        if (newStats.hunger !== currentStats.hunger || newStats.happiness !== currentStats.happiness || newStats.energy !== currentStats.energy) {
            try { await updateDoc(doc(db, "pets", myPet.id), { stats: newStats }); } catch (err) { console.error("Decay error:", err); }
        }
    }, 30000); 
    return () => clearInterval(intervalId);
  }, [myPet]);

  // --- 7. LISTENERS ---
  useEffect(() => {
    const unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy("createdAt", "desc")), (snapshot) => {
        const loadedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setTasks(loadedTasks);
        if (currentUser?.email) checkDeadlines(loadedTasks, currentUser);
    });

    const unsubDocs = onSnapshot(query(collection(db, "documents"), orderBy("createdAt", "desc")), (snapshot) => {
        setDocuments(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubTrans = onSnapshot(collection(db, "transactions"), (s) => setTransactions(s.docs.map(d => ({...d.data(), id: d.id}))));
    
    const unsubLeaves = onSnapshot(query(collection(db, "leaves"), orderBy("createdAt", "desc")), (snapshot) => {
        setLeaves(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubOT = onSnapshot(query(collection(db, "ot_records"), orderBy("createdAt", "desc")), (snapshot) => {
        setOtRecords(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubNotifs = onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc")), (snapshot) => {
        const allNotifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setNotifications(allNotifs.filter(n => n.userEmail === currentUser?.email));
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

    return () => { 
        unsubTasks(); unsubDocs(); unsubTrans(); unsubLeaves(); unsubOT(); 
        unsubNotifs(); unsubUsers(); unsubPet();
    };
  }, [currentUser]);

  // --- 8. CRUD HELPERS ---
  const addTask = async (task) => {
    try {
        const cleanedTask = cleanData({ 
            ...task, 
            createdAt: new Date().toISOString(),
            notified7Days: false,
            notified2Days: false,
            notified0Day: false
        });
        const docRef = await addDoc(collection(db, "tasks"), cleanedTask);
        const taskWithId = { ...cleanedTask, id: docRef.id };
        await sendEmailNotification(`New Task: ${task.title}`, { "Task": task.title, "Details": task.description || "-" });
        await sendLinePush(taskWithId, "🆕 New Task Created", "#1DB446");
    } catch (error) { console.error("Error adding task:", error); }
  };
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
        
        if (changedFields.length > 0) {
            const mergedTask = { ...oldTask, ...updates }; 
            await sendLinePush(mergedTask, "✏️ Task Updated", "#3B82F6"); 
        }
    } catch (error) { console.error("FAILED to update task:", error); }
  };
  const moveTask = async (taskId, newStatus) => { try { await updateDoc(doc(db, "tasks", taskId), { status: newStatus }); const task = tasks.find(t => t.id === taskId); const updatedTask = { ...task, status: newStatus }; if (newStatus === 'canceled') await sendLinePush(updatedTask, "🚫 Task Canceled", "#9CA3AF"); else await sendLinePush(updatedTask, "🔄 Status Updated", "#3B82F6"); } catch (error) { console.error("Error moving task:", error); } };
  const deleteTask = async (id) => { if(!confirm("Delete task?")) return; try { await deleteDoc(doc(db, "tasks", id)); } catch (error) { console.error(error); } };

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

  const markNotificationRead = async (id) => { try { await updateDoc(doc(db, "notifications", id), { isRead: true }); } catch(e) {} };
  const clearAllNotifications = async () => { notifications.forEach(async (n) => { try { await deleteDoc(doc(db, "notifications", n.id)); } catch(e) {} }); };

  const activeNotifications = useMemo(() => notifications.filter(n => { if (!n.taskId) return true; const task = tasks.find(t => t.id === n.taskId); return !task || (task.status !== 'canceled'); }), [notifications, tasks]);

  return {
    tasks, addTask, updateTask, deleteTask, moveTask,
    transactions, addTransaction, deleteTransaction, updateTransaction,
    leaves, addLeave, deleteLeave,
    otRecords, addOTRecord, deleteOTRecord, updateOTStatus,
    albums, addAlbum, deleteAlbum,
    photos, addPhoto, deletePhoto,
    notifications: activeNotifications, markNotificationRead, clearAllNotifications,
    allUsers, myPet, adoptPet, interactWithPet,
    documents, addDocument, updateDocument, deleteDocument
  };
};