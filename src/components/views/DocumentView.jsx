// src/components/views/DocumentView.jsx
import React, { useState, useRef } from 'react';
import { 
  FileText, Table, FileQuestion, Search, 
  Trash2, Calendar, Link as LinkIcon, Upload, 
  Folder, FolderPlus, ChevronLeft
} from 'lucide-react';
import DocumentEditorModal from '../modals/DocumentEditorModal';

const DocumentView = ({ documents, tasks, onAdd, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState('ALL'); // ALL, DOC, SHEET, FORM, FOLDER
  const [search, setSearch] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null); // null = Root directory
  
  const [selectedDoc, setSelectedDoc] = useState(null); // For Editing
  const [createType, setCreateType] = useState(null); // 'DOC', 'SHEET', 'FORM', or null
  
  const fileInputRef = useRef(null);

  // --- FILTER & FOLDER LOGIC ---
  const filteredDocs = documents.filter(doc => {
      // If the user is searching, ignore folders and show all matching files globally.
      // Otherwise, only show files that belong to the current folder.
      const inCurrentFolder = search ? true : (doc.folderId || null) === currentFolder;
      
      const matchesType = filter === 'ALL' || doc.type === filter || (filter === 'ALL' && doc.type === 'FOLDER');
      const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase());
      
      return inCurrentFolder && matchesType && matchesSearch;
  });

  const getIcon = (type) => {
      switch(type) {
          case 'SHEET': return <Table className="text-green-600" size={24} />;
          case 'FORM': return <FileQuestion className="text-purple-600" size={24} />;
          case 'FOLDER': return <Folder className="text-yellow-500" size={24} fill="currentColor" />;
          default: return <FileText className="text-blue-600" size={24} />;
      }
  };

  const getTypeLabel = (type) => {
      switch(type) {
          case 'SHEET': return 'Spreadsheet';
          case 'FORM': return 'Form';
          case 'FOLDER': return 'Folder';
          default: return 'Document';
      }
  };

  // --- CREATE FOLDER HANDLER ---
  const handleCreateFolder = () => {
      const folderName = window.prompt('Enter folder name:');
      if (folderName && folderName.trim()) {
          onAdd({
              title: folderName.trim(),
              type: 'FOLDER',
              folderId: currentFolder, // Put it inside the current folder
              createdAt: new Date().toISOString()
          });
      }
  };

  // --- FILE UPLOAD HANDLER ---
  const handleUploadClick = () => {
      fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      let content = '';
      let title = file.name;

      // Handle Text Files
      if (file.type === 'text/plain') {
          try {
              const text = await file.text();
              content = `<div>${text.replace(/\n/g, '<br>')}</div>`;
          } catch (err) {
              console.error("Read error", err);
              content = "Error reading text file.";
          }
      } 
      // Handle Binary Files (Create Visual Chip)
      else {
          const fileIconChar = file.name.endsWith('.pdf') ? '📄' : file.name.endsWith('.xlsx') ? '📊' : '📎';
          content = `
              <div style="
                  display: inline-flex; align-items: center; gap: 8px; 
                  padding: 10px 14px; margin: 10px 0; 
                  background: #f8fafc; border: 1px solid #e2e8f0; 
                  border-radius: 8px; font-family: sans-serif; font-size: 14px; 
                  color: #334155; font-weight: 500; user-select: none;" contenteditable="false">
                  <span style="font-size: 18px;">${fileIconChar}</span>
                  <span>${file.name}</span>
                  <span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">(${(file.size / 1024).toFixed(1)} KB)</span>
              </div><br/><br/>
          `;
      }

      // Create the Document inside the current folder
      onAdd({
          title: title,
          type: 'DOC', 
          content: content,
          linkedTaskId: '',
          folderId: currentFolder, // 🟢 Assign to current folder
          createdAt: new Date().toISOString()
      });
      
      e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* HEADER */}
      <div className="px-8 py-6 bg-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-800">Documents</h1>
            <p className="text-gray-500 text-sm">Manage docs, sheets, forms, and folders.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search all files..." 
                    className="pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

            {/* BUTTONS */}
            <div className="flex flex-wrap gap-2">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".txt,.pdf,.docx,.xlsx" 
                    onChange={handleFileChange} 
                />
                <button 
                    onClick={handleUploadClick}
                    className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-gray-200 shadow-sm"
                >
                    <Upload size={16} /> Upload
                </button>

                {/* 🟢 NEW FOLDER BUTTON */}
                <button 
                    onClick={handleCreateFolder}
                    className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-yellow-200"
                >
                    <FolderPlus size={16} /> New Folder
                </button>

                <button 
                    onClick={() => setCreateType('DOC')}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-blue-200"
                >
                    <FileText size={16} /> New Doc
                </button>
            </div>
        </div>
      </div>

      {/* 🟢 BREADCRUMB NAVIGATION (Shows only when inside a folder) */}
      {currentFolder && !search && (
          <div className="px-8 py-3 bg-gray-100/50 border-b border-gray-200 flex items-center gap-2 text-sm text-gray-600">
              <button 
                  onClick={() => setCurrentFolder(null)} 
                  className="hover:text-blue-600 flex items-center gap-1 font-medium transition"
              >
                  <ChevronLeft size={16} /> Back to Root
              </button>
              <span className="text-gray-400">/</span>
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Folder size={14} className="text-yellow-500" fill="currentColor" />
                  {documents.find(d => d.id === currentFolder)?.title || 'Unknown Folder'}
              </span>
          </div>
      )}

      {/* TABS */}
      <div className="px-8 py-4 flex gap-6 border-b border-gray-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          {['ALL', 'DOC', 'SHEET', 'FORM'].map(type => (
              <button 
                key={type}
                onClick={() => setFilter(type)}
                className={`text-xs font-bold pb-2 border-b-2 transition ${filter === type ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                  {type === 'ALL' ? 'All Files' : getTypeLabel(type) + 's'}
              </button>
          ))}
      </div>

      {/* GRID */}
      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar flex-1 items-start content-start">
          {filteredDocs.map(doc => {
              const linkedTask = tasks.find(t => t.id === doc.linkedTaskId);
              const isFolder = doc.type === 'FOLDER';

              return (
                <div 
                    key={doc.id} 
                    onClick={() => {
                        // 🟢 CLICK LOGIC: Folders navigate, files open the editor
                        if (isFolder) {
                            setCurrentFolder(doc.id);
                            setSearch(''); // Clear search when navigating
                        } else {
                            setSelectedDoc(doc);
                        }
                    }}
                    className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group flex flex-col h-48 animate-in fade-in zoom-in-95 duration-300 ${isFolder ? 'hover:border-yellow-300' : 'hover:border-blue-200'}`}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className={`p-2 rounded-lg transition ${isFolder ? 'bg-yellow-50 group-hover:bg-yellow-100' : 'bg-gray-50 group-hover:bg-blue-50'}`}>
                            {getIcon(doc.type)}
                        </div>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                // Optional: You might want to prevent deleting a folder if it has contents inside it later
                                onDelete(doc.id); 
                            }}
                            className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    
                    <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{doc.title}</h3>
                    <p className="text-xs text-gray-400 mb-4">{getTypeLabel(doc.type)}</p>
                    
                    <div className="mt-auto space-y-2">
                        {!isFolder && linkedTask ? (
                            <div className="flex items-center gap-2 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit max-w-full">
                                <LinkIcon size={10} />
                                <span className="truncate">Linked: {linkedTask.title}</span>
                            </div>
                        ) : !isFolder ? (
                            <div className="text-[10px] text-gray-300 italic">No task linked</div>
                        ) : (
                            <div className="text-[10px] text-yellow-600 font-medium">Click to open folder</div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Calendar size={10} />
                            {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
              );
          })}
          
          {/* Empty State */}
          {filteredDocs.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 opacity-50">
                  {search ? (
                      <Search size={64} className="mb-4" />
                  ) : currentFolder ? (
                      <Folder size={64} className="mb-4 text-yellow-200" fill="currentColor"/>
                  ) : (
                      <FileText size={64} className="mb-4" />
                  )}
                  <p>
                      {search ? "No matching files found." 
                      : currentFolder ? "This folder is empty." 
                      : "No documents found. Start by creating a folder or file."}
                  </p>
              </div>
          )}
      </div>

      {/* EDITOR MODAL */}
      {(createType || selectedDoc) && (
          <DocumentEditorModal 
            existingDoc={selectedDoc}
            initialType={createType} 
            tasks={tasks}
            onClose={() => { setCreateType(null); setSelectedDoc(null); }}
            onSave={(data) => {
                if (selectedDoc) {
                    onUpdate(selectedDoc.id, data);
                } else {
                    // 🟢 Inject the current folder ID when creating a brand new document
                    onAdd({ ...data, folderId: currentFolder });
                }
                setCreateType(null); 
                setSelectedDoc(null);
            }}
          />
      )}
    </div>
  );
};

export default DocumentView;