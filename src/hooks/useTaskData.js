// src/hooks/useTaskData.js
import { useState, useEffect } from 'react';

// Internal helper for local storage
const usePersistedState = (key, defaultValue) => {
  const [state, setState] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState];
};

export const useTaskData = (currentUser) => {
  const [tasks, setTasks] = usePersistedState('tasks', []);
  const [transactions, setTransactions] = usePersistedState('transactions', []);
  const [albums, setAlbums] = usePersistedState('albums', []);
  const [photos, setPhotos] = usePersistedState('photos', []);

  // --- ACTIONS ---

  const addTask = (newTask) => {
    const task = { ...newTask, id: Date.now().toString(), status: 'todo', createdAt: new Date(), author: currentUser?.email || 'User' };
    setTasks([task, ...tasks]);
  };

  const updateTask = (taskId, updates) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const deleteTask = (id) => {
    if (confirm("Delete?")) setTasks(prev => prev.filter(t => t.id !== id));
  };

  const moveTask = (taskId, currentStatus, direction) => {
    const statusOrder = ['todo', 'inprogress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
       updateTask(taskId, { status: statusOrder[nextIndex] });
    }
  };

  const addTransaction = (t) => setTransactions([t, ...transactions]);

  const updateTransaction = (id, updates) => {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

  const deleteTransaction = (id) => setTransactions(prev => prev.filter(t => t.id !== id));

  const addAlbum = (a) => setAlbums([{ ...a, id: Date.now().toString() }, ...albums]);
  const deleteAlbum = (id) => {
     setAlbums(prev => prev.filter(a => a.id !== id));
     setPhotos(prev => prev.filter(p => p.albumId !== id));
  };

  const addPhoto = (p) => setPhotos([{ ...p, id: Date.now().toString() }, ...photos]);
  const deletePhoto = (id) => setPhotos(prev => prev.filter(p => p.id !== id));

  // NEW: Add Leaves State
  const [leaves, setLeaves] = usePersistedState('leaves', []);

  const addLeave = (leave) => {
    setLeaves([{ ...leave, id: Date.now().toString(), createdAt: new Date() }, ...leaves]);
  };

  const deleteLeave = (id) => {
    if (confirm("Delete this leave record?")) {
      setLeaves(prev => prev.filter(l => l.id !== id));
    }
  };

  return {
    tasks, addTask, updateTask, deleteTask, moveTask,
    transactions, addTransaction, deleteTransaction,
    albums, addAlbum, deleteAlbum,
    photos, addPhoto, deletePhoto,
    leaves, addLeave, deleteLeave // <--- Export new functions
  };
};