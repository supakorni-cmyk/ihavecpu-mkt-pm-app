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
  const [documents, setDocuments] = useState([]); // 🟢 NEW STATE
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
    const MEGAPHONE_IMAGE = "https://plus.unsplash.com/premium_photo-1678193923226-bc247f475175?q=80&w=665&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
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
        const timeDiff = deadline - now;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0 && daysLeft > -3 && !task.notified0Day) {
            await triggerAlert(task,"🔥🔥 DEADLINE TODAY", user.email, "notified0Day");
        }
        else if (daysLeft <= 2 && daysLeft > 0 && !task.notified2Days) {
            await triggerAlert(task, "🔥 URGENT: 2 Days Left", user.email, "notified2Days");
        }
        else if (daysLeft <= 7 && daysLeft > 2 && !task.notified7Days) {
            await triggerAlert(task, "⚠️ Reminder: 7 Days Left", user.email, "notified7Days");
        }
    });
  };

  // --- 🟢 NEW: DOCUMENT ACTIONS ---
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

  // --- CRUD & LISTENERS ---
  const adoptPet = async (petData) => { if (!currentUser) return; try { await addDoc(collection(db, "pets"), { ...petData, ownerEmail: currentUser.email, stats: { hunger: 80, happiness: 80, energy: 80 }, createdAt: new Date().toISOString(), lastInteraction: new Date().toISOString() }); } catch (error) { console.error(error); } };
  const interactWithPet = async (action) => { if (!myPet) return; try { await updateDoc(doc(db, "pets", myPet.id), { /* stats logic */ }); } catch (error) { console.error(error); } };
  useEffect(() => { /* pet logic */ }, [myPet]);

  useEffect(() => {
    // TASKS
    const unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy("createdAt", "desc")), (snapshot) => {
        const loaded = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        setTasks(loaded);
        if (currentUser?.email) checkDeadlines(loaded, currentUser);
    });
    // 🟢 DOCUMENTS
    const unsubDocs = onSnapshot(query(collection(db, "documents"), orderBy("createdAt", "desc")), (snapshot) => {
        setDocuments(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });
    // OTHER
    const unsubTrans = onSnapshot(collection(db, "transactions"), (s) => setTransactions(s.docs.map(d => ({...d.data(), id: d.id}))));
    const unsubUsers = onSnapshot(collection(db, "users"), (s) => setAllUsers(s.docs.map(d => ({...d.data(), id: d.id}))));
    
    // ... (leaves, ot, notifs, pet, etc.) ... (Abbreviated for brevity)

    return () => { unsubTasks(); unsubDocs(); unsubTrans(); unsubUsers(); };
  }, [currentUser]);

  const updateTask = async (id, updates) => {
    try {
        const oldTask = tasks.find(t => t.id === id);
        if (!oldTask) return;
        const cleanedUpdates = cleanData(updates);
        await updateDoc(doc(db, "tasks", id), cleanedUpdates);
        
        const changedFields = [];
        if (updates.startTime && updates.startTime !== oldTask.startTime) changedFields.push("Start Time");
        if (updates.deadline && updates.deadline !== oldTask.deadline) changedFields.push("Due Date");
        if (changedFields.length > 0) {
            const mergedTask = { ...oldTask, ...updates }; 
            await sendLinePush(mergedTask, "✏️ Task Updated", "#3B82F6"); 
        }
    } catch (e) { console.error(e); }
  };

  const addTask = async (task) => {
    try {
        const cleanedTask = cleanData({ ...task, createdAt: new Date().toISOString(), notified7Days: false, notified2Days: false, notified0Day: false });
        const docRef = await addDoc(collection(db, "tasks"), cleanedTask);
        const taskWithId = { ...cleanedTask, id: docRef.id };
        await sendEmailNotification(`New Task: ${task.title}`, { "Task": task.title });
        await sendLinePush(taskWithId, "🆕 New Task Created", "#1DB446");
    } catch (e) { console.error(e); }
  };
  
  const moveTask = async (taskId, newStatus) => { try { await updateDoc(doc(db, "tasks", taskId), { status: newStatus }); } catch (e) { console.error(e); } };
  const deleteTask = async (id) => { if(confirm("Delete?")) await deleteDoc(doc(db, "tasks", id)); };
  
  const activeNotifications = useMemo(() => notifications.filter(n => { if (!n.taskId) return true; const task = tasks.find(t => t.id === n.taskId); return !task || (task.status !== 'canceled'); }), [notifications, tasks]);

  return { 
      tasks, addTask, updateTask, deleteTask, moveTask, 
      transactions, addTransaction: async()=>{}, deleteTransaction: async()=>{}, updateTransaction: async()=>{},
      leaves, addLeave: async()=>{}, deleteLeave: async()=>{},
      otRecords, addOTRecord: async()=>{}, deleteOTRecord: async()=>{}, updateOTStatus: async()=>{},
      albums, addAlbum: ()=>{}, deleteAlbum: ()=>{}, photos, addPhoto: ()=>{}, deletePhoto: ()=>{},
      notifications: activeNotifications, markNotificationRead: async()=>{}, clearAllNotifications: async()=>{},
      allUsers, myPet, adoptPet, interactWithPet,
      // 🟢 Export Documents
      documents, addDocument, updateDocument, deleteDocument
  };
};