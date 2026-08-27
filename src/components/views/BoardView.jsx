// src/components/views/BoardView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  MoreHorizontal, Plus, Trash2, CheckSquare, Clock, Heart, FileText, X, Copy, MapPin, Search, Filter, XCircle, User, Briefcase, ChevronDown, PlusCircle, Upload, FileJson
} from 'lucide-react';
import { COLUMNS, TAG_COLORS, formatDate } from '../../utils/constants';

import EditTaskModal from '../modals/EditTaskModal';
import RequirementSheetModal from '../modals/RequirementModal'; 
import TaskDetailModal from '../modals/TaskDetailModal'; 

const FILTER_CATEGORIES = ['All', 'OVERVIEW + PLANING', 'PROJECT','ARTWORK/PROMOTION', 'ARTWORK/BRAND', 'REVIEW / IT', 'REVIEW / OTHER', 'OFFLINE EVENT', 'GUEST SPEAKER', 'MEETING', 'EXPENSE', 'WEBSITE', 'INFLUENCER', 'ONLINE ADS', 'OFFLINE ADS'];

const DEFAULT_WORKSPACES = [
  {
    id: 'marketing',
    name: 'Marketing Workspace',
    columns: COLUMNS
  }
];

const COLOR_OPTIONS = [
  { label: 'Gray', value: 'text-gray-600 bg-gray-100' },
  { label: 'Blue', value: 'text-blue-600 bg-blue-100' },
  { label: 'Purple', value: 'text-purple-600 bg-purple-100' },
  { label: 'Yellow', value: 'text-yellow-600 bg-yellow-100' },
  { label: 'Green', value: 'text-green-600 bg-green-100' },
  { label: 'Red', value: 'text-red-600 bg-red-100' },
];

const BoardView = ({ tasks, onAddTaskClick, onUpdateTask, onDeleteTask, onMoveTask, onBatchAddTasks }) => {
  // PERSISTENT WORKSPACES STATE
  const [workspaces, setWorkspaces] = useState(() => {
    try {
      const saved = localStorage.getItem('app_workspaces');
      return saved ? JSON.parse(saved) : DEFAULT_WORKSPACES;
    } catch (e) {
      return DEFAULT_WORKSPACES;
    }
  });

  // PERSISTENT ACTIVE WORKSPACE ID STATE
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    try {
      const saved = localStorage.getItem('app_active_workspace_id');
      return saved || 'marketing';
    } catch (e) {
      return 'marketing';
    }
  });

  useEffect(() => {
    localStorage.setItem('app_workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem('app_active_workspace_id', activeWorkspaceId);
  }, [activeWorkspaceId]);

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isNewWorkspaceModalOpen, setIsNewWorkspaceModalOpen] = useState(false);
  const [isTrelloModalOpen, setIsTrelloModalOpen] = useState(false);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); 
  const [editingTask, setEditingTask] = useState(null);
  const [activeRequirement, setActiveRequirement] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const activeWorkspace = useMemo(() => {
    return workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  }, [workspaces, activeWorkspaceId]);

  // Strict workspace task filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
        const taskWorkspace = task.workspaceId || 'marketing';
        const matchesWorkspace = taskWorkspace === activeWorkspaceId;
        
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        let matchesCategory = true;
        if (selectedCategory !== 'All') {
            const hasSingleTag = task.tag === selectedCategory;
            const hasArrayTag = Array.isArray(task.tags) && task.tags.includes(selectedCategory);
            matchesCategory = hasSingleTag || hasArrayTag;
        }
        return matchesWorkspace && matchesSearch && matchesCategory;
    });
  }, [tasks, activeWorkspaceId, searchQuery, selectedCategory]);

  const clearFilters = () => {
      setSearchQuery("");
      setSelectedCategory("All");
  };

  const isFiltered = searchQuery !== "" || selectedCategory !== "All";

  const tasksByColumn = useMemo(() => {
    const activeCols = activeWorkspace.columns;
    const grouped = {};
    activeCols.forEach(col => grouped[col.id] = []);

    const firstColId = activeCols[0]?.id || 'todo';

    filteredTasks.forEach(task => {
      let status = task.status;
      if (!status || status === 'pending') status = 'todo';
      if (status === 'completed') status = 'done';

      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped[firstColId]?.push(task);
      }
    });
    return grouped;
  }, [filteredTasks, activeWorkspace]);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    onMoveTask(draggableId, destination.droppableId);
  };

  const handleTaskClick = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) setSelectedTask(task);
  };

  const handleOpenRequirement = (reqId) => {
      if (editingTask) {
           const req = editingTask.requirements.find(r => r.id === reqId);
           if (req) {
               setActiveRequirement({ task: editingTask, requirement: req });
           }
      }
  };

  const handleCreateWorkspace = (newWorkspace) => {
    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
    setIsNewWorkspaceModalOpen(false);
  };

  // 🟢 TRELLO IMPORT HANDLER (Supports both existing and new workspaces)
  const handleImportTrelloBoard = (importedWorkspace, importedTasks, targetWorkspaceId) => {
    if (importedWorkspace) {
      setWorkspaces(prev => [...prev, importedWorkspace]);
      setActiveWorkspaceId(importedWorkspace.id);
    } else if (targetWorkspaceId) {
      setActiveWorkspaceId(targetWorkspaceId);
    }
    
    if (onBatchAddTasks && importedTasks.length > 0) {
      onBatchAddTasks(importedTasks);
    }
    setIsTrelloModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-gray-50">
      <header className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm z-10 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 whitespace-nowrap">
            WE LOVE OUR JOB <Heart size={24} className="text-red-600 fill-red-600 animate-pulse" />
            </h2>
            <div className="h-8 w-px bg-gray-200 hidden xl:block"></div>
            
            {/* WORKSPACE SELECTOR DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold px-3 py-2 rounded-xl text-sm transition"
              >
                <Briefcase size={16} />
                <span>{activeWorkspace.name}</span>
                <ChevronDown size={14} />
              </button>

              {isWorkspaceMenuOpen && (
                <div 
                  className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 py-2"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Workspaces
                  </div>
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => setActiveWorkspaceId(ws.id)}
                      className={`w-full text-left px-4 py-2 text-sm font-semibold flex items-center justify-between hover:bg-indigo-50 transition ${
                        ws.id === activeWorkspaceId ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-gray-700'
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      <span className="text-xs text-gray-400 font-normal">({ws.columns.length} status)</span>
                    </button>
                  ))}
                  
                  <div className="border-t border-gray-100 mt-2 pt-2 px-2 flex flex-col gap-1">
                    <button
                      onClick={() => setIsNewWorkspaceModalOpen(true)}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-2 transition"
                    >
                      <PlusCircle size={14} /> Create Blank Workspace
                    </button>
                    <button
                      onClick={() => setIsTrelloModalOpen(true)}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl flex items-center gap-2 transition"
                    >
                      <FileJson size={14} /> Import Trello Board (.json)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-1">
                <div className="relative group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors"/>
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        className="pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-full text-sm outline-none transition-all w-32 focus:w-48 xl:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-full text-sm outline-none appearance-none cursor-pointer font-medium text-gray-700 focus:ring-2 focus:ring-indigo-100 transition-all max-w-[150px]"
                    >
                        {FILTER_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {isFiltered && (
                    <button 
                        onClick={clearFilters}
                        className="ml-2 flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-full transition animate-in fade-in zoom-in duration-200 whitespace-nowrap"
                    >
                        <XCircle size={14} /> Clear
                    </button>
                )}
            </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-100 px-4 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition shadow-sm text-sm"
          >
            <FileText size={16} /> <span className="hidden sm:inline">Export P.Pao</span>
          </button>
          
          <button 
            onClick={() => onAddTaskClick(activeWorkspaceId)} 
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-black transition shadow-lg shadow-gray-200 text-sm transform hover:scale-105 active:scale-95"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 pt-6">
          <div className="flex gap-6 h-full min-w-full">
            {activeWorkspace.columns.map((col) => (
              <BoardColumn 
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] || []}
                onTaskClick={handleTaskClick} 
                onDeleteTask={onDeleteTask}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {isNewWorkspaceModalOpen && (
        <CreateWorkspaceModal 
          onClose={() => setIsNewWorkspaceModalOpen(false)}
          onCreate={handleCreateWorkspace}
        />
      )}

      {isTrelloModalOpen && (
        <ImportTrelloModal 
          activeWorkspace={activeWorkspace}
          workspaces={workspaces}
          onClose={() => setIsTrelloModalOpen(false)}
          onImport={handleImportTrelloBoard}
        />
      )}

      {isExportOpen && <ExportEventModal tasks={tasks} onClose={() => setIsExportOpen(false)} />}
      
      {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} tasks={tasks} onClose={() => setSelectedTask(null)}
            onEdit={() => { setEditingTask(selectedTask); setSelectedTask(null); }}
            onDelete={() => { if(onDeleteTask) onDeleteTask(selectedTask.id); setSelectedTask(null); }}
            onSelectTask={(taskId) => { const t = tasks.find(x => x.id === taskId); if (t) setSelectedTask(t); }}
        />
      )}

      {editingTask && (
        <EditTaskModal 
            task={editingTask} tasks={tasks} onClose={() => setEditingTask(null)}
            onUpdate={(updatedData) => { onUpdateTask(editingTask.id, updatedData); setEditingTask(prev => ({ ...prev, ...updatedData })); setEditingTask(null); }}
            onOpenRequirement={handleOpenRequirement}
        />
      )}

      {activeRequirement && (
          <RequirementSheetModal 
              task={activeRequirement.task} requirement={activeRequirement.requirement} onClose={() => setActiveRequirement(null)}
              onUpdateTask={(updates) => {
                  onUpdateTask(activeRequirement.task.id, updates);
                  const updatedTask = { ...activeRequirement.task, ...updates };
                  const updatedReq = updatedTask.requirements.find(r => r.id === activeRequirement.requirement.id);
                  setActiveRequirement({ task: updatedTask, requirement: updatedReq });
                  setEditingTask(prev => ({ ...prev, ...updates }));
              }}
          />
      )}
    </div>
  );
};

// 🟢 ENHANCED TRELLO JSON IMPORT MODAL (DESTINATION SELECTION)
const ImportTrelloModal = ({ activeWorkspace, workspaces, onClose, onImport }) => {
  const [trelloFile, setTrelloFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [importDestination, setImportDestination] = useState('current'); // 'current' or 'new'
  const [customWorkspaceName, setCustomWorkspaceName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.lists || !json.cards) {
          return alert("Invalid Trello JSON format. Ensure you exported your board from the Trello menu.");
        }

        setParsedData(json);
        setCustomWorkspaceName(json.name || 'Imported Trello Board');
        setTrelloFile(file);
      } catch (err) {
        alert("Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    if (!parsedData) return;

    let targetWorkspaceId = activeWorkspace.id;
    let newWorkspaceObj = null;

    if (importDestination === 'new') {
      targetWorkspaceId = `ws_trello_${Date.now()}`;
      const colors = [
        'text-[#0052CC] bg-[#DEEBFF]',
        'text-[#00875A] bg-[#E3FCEF]',
        'text-[#FFAB00] bg-[#FFF0B3]',
        'text-[#FF5630] bg-[#FFBDAD]',
        'text-[#5243AA] bg-[#EAE6FF]'
      ];

      const activeLists = parsedData.lists.filter(l => !l.closed);
      const columns = activeLists.map((list, idx) => ({
        id: list.id,
        title: list.name,
        color: colors[idx % colors.length]
      }));

      newWorkspaceObj = {
        id: targetWorkspaceId,
        name: customWorkspaceName.trim() || 'Imported Trello Workspace',
        columns: columns.length > 0 ? columns : COLUMNS
      };
    }

    // Map Trello Lists to status column IDs
    const listToColumnIdMap = {};
    if (importDestination === 'current') {
      const activeLists = parsedData.lists.filter(l => !l.closed);
      activeLists.forEach(list => {
        // Try matching by title or id
        const matchedCol = activeWorkspace.columns.find(col => 
          col.title.toLowerCase() === list.name.toLowerCase() ||
          col.id.toLowerCase() === list.name.toLowerCase()
        );
        // Fall back to first column if no match found
        listToColumnIdMap[list.id] = matchedCol ? matchedCol.id : (activeWorkspace.columns[0]?.id || 'todo');
      });
    } else {
      parsedData.lists.forEach(list => {
        listToColumnIdMap[list.id] = list.id;
      });
    }

    // Build Checklists Mapping
    const checklistMap = {};
    (parsedData.checklists || []).forEach(ch => {
      checklistMap[ch.id] = ch.checkItems || [];
    });

    // Build Tasks from Trello Cards
    const activeCards = parsedData.cards.filter(c => !c.closed);
    const importedTasks = activeCards.map((card, idx) => {
      const requirements = [];
      (card.idChecklists || []).forEach(chId => {
        const items = checklistMap[chId] || [];
        items.forEach(item => {
          requirements.push({
            id: `req_${item.id}`,
            title: item.name,
            isDone: item.state === 'complete'
          });
        });
      });

      let imageUrl = '';
      if (card.attachments && card.attachments.length > 0) {
        const imageAtt = card.attachments.find(a => a.mimeType && a.mimeType.startsWith('image/'));
        if (imageAtt) imageUrl = imageAtt.url;
      }

      const cardTags = (card.labels || []).map(l => l.name || l.color).filter(Boolean);

      return {
        id: `trello_${card.id}_${Date.now()}_${idx}`,
        workspaceId: targetWorkspaceId,
        title: card.name,
        description: card.desc || '',
        status: listToColumnIdMap[card.idList] || activeWorkspace.columns[0]?.id || 'todo',
        deadline: card.due || null,
        startTime: null,
        tag: cardTags[0] || 'TRELLO',
        tags: cardTags.length > 0 ? cardTags : ['TRELLO'],
        requirements: requirements,
        imageUrl: imageUrl,
        taskLeader: 'Trello Import',
        isPao: false
      };
    });

    onImport(newWorkspaceObj, importedTasks, targetWorkspaceId);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <FileJson size={18} className="text-blue-600" /> Import Trello Board
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition"><X size={18}/></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upload Trello JSON File</label>
            <input 
              type="file" 
              accept=".json"
              onChange={handleFileUpload}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 rounded-xl p-1"
            />
          </div>

          {parsedData && (
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Import Destination</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="destination"
                      value="current"
                      checked={importDestination === 'current'}
                      onChange={() => setImportDestination('current')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Import into Current Workspace (<strong>{activeWorkspace.name}</strong>)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="destination"
                      value="new"
                      checked={importDestination === 'new'}
                      onChange={() => setImportDestination('new')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Create a Brand New Workspace</span>
                  </label>
                </div>
              </div>

              {importDestination === 'new' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Workspace Name</label>
                  <input 
                    type="text"
                    value={customWorkspaceName}
                    onChange={(e) => setCustomWorkspaceName(e.target.value)}
                    className="w-full border border-blue-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-bold text-gray-600 pt-2 border-t border-blue-100">
                <span>Lists in JSON: <strong className="text-blue-700">{parsedData.lists.filter(l=>!l.closed).length}</strong></span>
                <span>Cards to Import: <strong className="text-blue-700">{parsedData.cards.filter(c=>!c.closed).length}</strong></span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!parsedData}
              onClick={handleProcessImport}
              className="px-5 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 rounded-xl transition shadow-md flex items-center gap-2"
            >
              <Upload size={16} /> Import Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateWorkspaceModal = ({ onClose, onCreate }) => {
  const [workspaceName, setWorkspaceName] = useState('');
  const [columns, setColumns] = useState([
    { id: 'todo', title: 'To Do', color: 'text-gray-600 bg-gray-100' },
    { id: 'in_progress', title: 'In Progress', color: 'text-blue-600 bg-blue-100' },
    { id: 'done', title: 'Done', color: 'text-green-600 bg-green-100' }
  ]);

  const handleAddColumn = () => {
    const id = `col_${Date.now()}`;
    setColumns(prev => [...prev, { id, title: 'New Status', color: 'text-purple-600 bg-purple-100' }]);
  };

  const handleRemoveColumn = (index) => {
    if (columns.length <= 1) return alert("A workspace must have at least one column status.");
    setColumns(prev => prev.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index, field, value) => {
    setColumns(prev => prev.map((col, i) => {
      if (i === index) {
        const updated = { ...col, [field]: value };
        if (field === 'title') {
          updated.id = value.toLowerCase().replace(/\s+/g, '_') || col.id;
        }
        return updated;
      }
      return col;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!workspaceName.trim()) return alert("Please enter a workspace name.");
    
    const newWorkspace = {
      id: `ws_${Date.now()}`,
      name: workspaceName.trim(),
      columns: columns.map(c => ({
        ...c,
        title: c.title.trim() || 'Untitled Status'
      }))
    };
    onCreate(newWorkspace);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Briefcase size={18} className="text-indigo-600" /> Create Workspace
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition"><X size={18}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Workspace Name</label>
            <input 
              type="text"
              placeholder="e.g. Design Workspace, QA Team"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 font-semibold"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Process Statuses (Columns)</label>
              <button
                type="button"
                onClick={handleAddColumn}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Column
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {columns.map((col, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                  <input 
                    type="text"
                    value={col.title}
                    onChange={(e) => handleColumnChange(idx, 'title', e.target.value)}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-500"
                    placeholder="Status Name"
                  />
                  <select
                    value={col.color}
                    onChange={(e) => handleColumnChange(idx, 'color', e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none"
                  >
                    {COLOR_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition shadow-md"
            >
              Create & Switch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ExportEventModal = ({ tasks, onClose }) => {
  const events = tasks.filter(t => { const s = (t.status || '').toLowerCase(); return t.isPao === true && s !== 'canceled' && s !== 'done' && s !== 'completed'; });
  events.sort((a, b) => { return new Date(a.startTime || a.deadline || 0) - new Date(b.startTime || b.deadline || 0); });
  const groupedData = events.reduce((acc, task) => { const d = new Date(task.startTime || task.deadline); const key = isNaN(d) ? 'No Date' : d.toLocaleString('default', { month: 'long', year: 'numeric' }); if (!acc[key]) acc[key] = []; acc[key].push(task); return acc; }, {});
  const formatTime = (isoString) => { if (!isoString) return ""; return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };

  const generateExportText = () => { 
      if (events.length === 0) return "No pending P.Pao events found."; 
      let text = "☀️🌈อัพเดทตารางงานพี่เปา⭐️⭐️\n\n"; 
      Object.entries(groupedData).forEach(([month, monthTasks]) => { 
          text += `━━━━━━━━━━━━━━━━━━━━━━\n🗓️ ${month.toUpperCase()}\n━━━━━━━━━━━━━━━━━━━━━━\n`; 
          monthTasks.forEach(t => { 
              const bestDate = t.startTime || t.deadline; 
              let dateStr = 'TBD'; 
              if (bestDate) dateStr = new Date(bestDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              let timeStr = "";
              if (t.startTime) { timeStr = `⏰ ${formatTime(t.startTime)}`; if (t.endTime) timeStr += ` - ${formatTime(t.endTime)}`; } 
              else if (t.deadline) { timeStr = `⏰ Due: ${formatTime(t.deadline)}`; }
              text += `\n📅 ${dateStr}`; if (timeStr) text += `\n${timeStr}`; text += `\n📌 ${t.title}`;
              if (t.description?.trim()) text += `\n📝 ${t.description.trim()}`;
              if (t.location?.trim()) text += `\n📍 ${t.location.trim()}`;
              if (t.reference?.trim()) text += `\n📋 Script: ${t.reference.trim()}`;
              if (t.finalFile?.trim()) text += `\n📂 Final File: ${t.finalFile.trim()}`;
              text += `\n\n`; 
          }); text += "\n"; 
      }); return text; 
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50"><div><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-indigo-600"/> Event Export (P.Pao)</h3><p className="text-xs text-gray-500 mt-1">Found {events.length} active items</p></div><button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20}/></button></div>
        <div className="flex-1 bg-gray-50 relative"><textarea readOnly className="w-full h-full p-8 font-mono text-sm text-gray-700 bg-gray-50 outline-none resize-none leading-relaxed" value={generateExportText()}/><button onClick={() => { navigator.clipboard.writeText(generateExportText()); alert("Copied!"); }} className="absolute bottom-8 right-8 bg-black text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800 transition transform hover:scale-105"><Copy size={16}/> Copy Text</button></div>
      </div>
    </div>
  );
};

const BoardColumn = ({ column, tasks, onTaskClick, onDeleteTask }) => {
  return (
    <div className="flex-1 min-w-[300px] flex flex-col h-full rounded-2xl bg-white/50 backdrop-blur-sm border border-white shadow-sm">
      <div className="flex items-center justify-between mb-4 p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
            <h3 className="text-gray-700 font-black text-sm uppercase tracking-wider">{column.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.color?.replace('text-', 'bg-').replace('50', '100') || 'bg-gray-100'} ${column.color?.split(' ')[1] || 'text-gray-700'}`}>{tasks.length}</span>
        </div>
        <MoreHorizontal size={16} className="text-gray-300 hover:text-gray-600 cursor-pointer" />
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className={`flex-1 p-2 overflow-y-auto custom-scrollbar transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}>
                <div className="flex flex-col gap-3 pb-2 min-h-[100px]">
                    {tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} onClick={onTaskClick} onDelete={onDeleteTask} />)}
                    {provided.placeholder}
                </div>
            </div>
        )}
      </Droppable>
    </div>
  );
};

const TaskCard = ({ task, index, onClick, onDelete }) => {
  const reqs = Array.isArray(task.requirements) ? task.requirements : [];
  const completedReqs = reqs.filter(r => r.isDone).length;
  const progress = reqs.length > 0 ? (completedReqs / reqs.length) * 100 : 0;
  
  const displayDate = task.startTime ? new Date(task.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) : formatDate(task.deadline);
  
  const getSafeTagStyle = (tagStr) => {
      if (!tagStr) return 'bg-gray-100 text-gray-500';
      const theme = (TAG_COLORS[tagStr] || '').toLowerCase();
      const name = tagStr.toLowerCase();

      if (theme.includes('blue') || name.includes('plan')) return 'bg-blue-100 text-blue-700';
      if (theme.includes('purple') || name.includes('project')) return 'bg-purple-100 text-purple-700';
      if (theme.includes('green') || theme.includes('emerald') || name.includes('guest') || name.includes('speaker')) return 'bg-emerald-100 text-emerald-700';
      if (theme.includes('red') || theme.includes('rose')) return 'bg-red-100 text-red-700';
      if (theme.includes('yellow') || theme.includes('amber') || name.includes('meet')) return 'bg-yellow-100 text-yellow-700';
      if (theme.includes('orange') || name.includes('event')) return 'bg-orange-100 text-orange-700';
      if (theme.includes('pink') || name.includes('review')) return 'bg-pink-100 text-pink-700';
      if (theme.includes('indigo')) return 'bg-indigo-100 text-indigo-700';

      return 'bg-gray-100 text-gray-600';
  };

  const renderTags = () => { 
      const tags = task.tags && task.tags.length > 0 ? task.tags : (task.tag ? [task.tag] : []); 
      return tags.map((tag, idx) => (
        <span key={idx} className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase mr-1 ${getSafeTagStyle(tag)}`}>
            {tag}
        </span>
      )); 
  };

  const getTagBorder = () => {
      const tag = (task.tags && task.tags.length > 0) ? task.tags[0] : task.tag;
      if (!tag) return 'border-gray-200 hover:border-gray-300';

      const theme = (TAG_COLORS[tag] || '').toLowerCase();
      const name = tag.toLowerCase();

      if (theme.includes('blue') || name.includes('plan')) return 'border-blue-500 hover:border-blue-300';
      if (theme.includes('purple') || name.includes('project')) return 'border-purple-500 hover:border-purple-300';
      if (theme.includes('green') || theme.includes('emerald') || name.includes('guest') || name.includes('speaker')) return 'border-green-500 hover:border-green-300';
      if (theme.includes('red') || theme.includes('rose')) return 'border-red-500 hover:border-red-300';
      if (theme.includes('yellow') || theme.includes('amber') || name.includes('meet')) return 'border-yellow-500 hover:border-yellow-300';
      if (theme.includes('orange') || name.includes('event')) return 'border-orange-500 hover:border-orange-300';
      if (theme.includes('pink') || name.includes('review')) return 'border-pink-500 hover:border-pink-300';
      if (theme.includes('indigo')) return 'border-indigo-500 hover:border-indigo-300';

      return 'border-gray-200 hover:border-gray-300';
  };

  return (
    <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
            <div 
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                style={{ ...provided.draggableProps.style }}
                onClick={() => onClick(task.id)} 
                className={`bg-white p-4 rounded-xl border-y border-r border-l-4 transition-all group relative cursor-pointer
                    ${snapshot.isDragging ? 'shadow-2xl rotate-2 ring-2 ring-indigo-500 z-50' : `shadow-sm ${getTagBorder()}`}
                `}
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-wrap gap-1">{renderTags()}</div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <Trash2 size={14} />
                    </button>
                </div>
                
                {task.imageUrl && (
                    <div className="mb-3 h-32 w-full overflow-hidden rounded-lg border border-gray-100">
                        <img src={task.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                )}
                
                <h4 className="text-gray-800 font-semibold text-sm mb-2 leading-relaxed line-clamp-2">{task.title}</h4>
                
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2">
                    <User size={12} className="text-gray-400" />
                    <span>Leader: <span className="text-gray-700">{task.taskLeader || 'Unassigned'}</span></span>
                </div>

                {task.location && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-500 mb-3 bg-indigo-50 w-fit px-2 py-1 rounded">
                        <MapPin size={12}/> <span className="truncate max-w-[200px]">{task.location}</span>
                    </div>
                )}
                
                {reqs.length > 0 && (
                    <div className="mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                            <CheckSquare size={12} className="text-green-600" />
                            <span>Requirements ({completedReqs}/{reqs.length})</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <Clock size={12} />
                        <span>{displayDate}</span>
                    </div>
                </div>
            </div>
        )}
    </Draggable>
  );
};

export default BoardView;