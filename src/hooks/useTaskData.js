// src/hooks/useTaskData.js
import { useState, useEffect } from 'react';
import { db } from '../firebase'; // Import your database
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

// // Internal helper for local storage
// const usePersistedState = (key, defaultValue) => {
//   const [state, setState] = useState(() => {
//     const stored = localStorage.getItem(key);
//     return stored ? JSON.parse(stored) : defaultValue;
//   });
//   useEffect(() => {
//     localStorage.setItem(key, JSON.stringify(state));
//   }, [key, state]);
//   return [state, setState];
// };

export const useTaskData = (currentUser) => {
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [otRecords, setOtRecords] = useState([]);
  // You can keep photos/albums local or add Firebase Storage later.
  // For now, let's keep them in local state to avoid complexity.
  const [albums, setAlbums] = useState([]); 
  const [photos, setPhotos] = useState([]);

  // --- 1. REAL-TIME DATA LISTENERS ---
  // This automatically updates state whenever the database changes
  useEffect(() => {
    // Listen to Tasks
    const unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy("createdAt", "desc")), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    // Listen to Budget Transactions
    const unsubBudget = onSnapshot(query(collection(db, "transactions"), orderBy("createdAt", "desc")), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    // Listen to Leaves
    const unsubLeaves = onSnapshot(query(collection(db, "leaves"), orderBy("createdAt", "desc")), (snapshot) => {
      setLeaves(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    // Listen to OT Records
    const unsubOT = onSnapshot(query(collection(db, "ot_records"), orderBy("createdAt", "desc")), (snapshot) => {
      setOtRecords(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    // Cleanup listeners on unmount
    return () => {
      unsubTasks();
      unsubBudget();
      unsubLeaves();
      unsubOT();
    };
  }, []);


// --- 2. TASKS ACTIONS ---
  const addTask = async (task) => {
    await addDoc(collection(db, "tasks"), { ...task, createdAt: new Date().toISOString() });
  };
  const updateTask = async (id, updates) => {
    await updateDoc(doc(db, "tasks", id), updates);
  };
  const deleteTask = async (id) => {
    if(confirm("Delete task?")) await deleteDoc(doc(db, "tasks", id));
  };
  const moveTask = async (taskId, newStatus) => {
    await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
  };

  // --- 3. BUDGET ACTIONS ---
  const addTransaction = async (t) => {
    await addDoc(collection(db, "transactions"), { ...t, createdAt: new Date().toISOString() });
  };
  const updateTransaction = async (id, updates) => {
    await updateDoc(doc(db, "transactions", id), updates);
  };
  const deleteTransaction = async (id) => {
    if(confirm("Delete record?")) await deleteDoc(doc(db, "transactions", id));
  };

  // --- 4. LEAVE ACTIONS ---
  const addLeave = async (leave) => {
    await addDoc(collection(db, "leaves"), { ...leave, createdAt: new Date().toISOString() });
  };
  const deleteLeave = async (id) => {
    if(confirm("Delete leave?")) await deleteDoc(doc(db, "leaves", id));
  };

  // --- 5. OT ACTIONS ---
  const addOTRecord = async (record) => {
    await addDoc(collection(db, "ot_records"), { 
      ...record, 
      status: 'Request', 
      createdAt: new Date().toISOString() 
    });
  };
  const deleteOTRecord = async (id) => {
    if(confirm("Delete OT record?")) await deleteDoc(doc(db, "ot_records", id));
  };
  const updateOTStatus = async (id, newStatus) => {
    await updateDoc(doc(db, "ot_records", id), { status: newStatus });
  };

  // --- 6. ALBUM/PHOTO (Keep Local for now unless you set up Firebase Storage) ---
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