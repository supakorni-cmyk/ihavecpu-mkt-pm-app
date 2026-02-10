// src/components/views/DocumentView.jsx
import React, { useState, useRef } from 'react';
import { 
  FileText, Table, FileQuestion, Search, 
  Trash2, Calendar, Link as LinkIcon, Upload, File 
} from 'lucide-react';
import DocumentEditorModal from '../modals/DocumentEditorModal';

const DocumentView = ({ documents, tasks, onAdd, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState('ALL'); // ALL, DOC, SHEET, FORM
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null); // For Editing
  const [createType, setCreateType] = useState(null); // 'DOC', 'SHEET', 'FORM', or null
  
  const fileInputRef = useRef(null);

  // Filter Logic
  const filteredDocs = documents.filter(doc => {
      const matchesType = filter === 'ALL' || doc.type === filter;
      const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
  });

  const getIcon = (type) => {
      switch(type) {
          case 'SHEET': return <Table className="text-green-600" size={24} />;
          case 'FORM': return <FileQuestion className="text-purple-600" size={24} />;
          default: return <FileText className="text-blue-600" size={24} />;
      }
  };

  const getTypeLabel = (type) => {
      switch(type) {
          case 'SHEET': return 'Spreadsheet';
          case 'FORM': return 'Form';
          default: return 'Document';
      }
  };

  // --- 🟢 FILE UPLOAD HANDLER ---
  const handleUploadClick = () => {
      fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      let content = '';
      let title = file.name;

      // 1. Handle Text Files (Read Content directly)
      if (file.type === 'text/plain') {
          try {
              const text = await file.text();
              content = `<div>${text.replace(/\n/g, '<br>')}</div>`;
          } catch (err) {
              console.error("Read error", err);
              content = "Error reading text file.";
          }
      } 
      // 2. Handle Binary Files (Create Visual Chip)
      else {
          const fileIconChar = file.name.endsWith('.pdf') ? '📄' : file.name.endsWith('.xlsx') ? '📊' : '📎';
          // Simulate an attachment chip
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

      // 3. Create the Document immediately
      const newDoc = {
          title: title,
          type: 'DOC', // We treat uploads as generic Docs containing the file info
          content: content,
          linkedTaskId: '',
          createdAt: new Date().toISOString()
      };

      onAdd(newDoc);
      
      // Reset input
      e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* HEADER */}
      <div className="px-8 py-6 bg-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-800">Documents</h1>
            <p className="text-gray-500 text-sm">Manage docs, sheets, and forms.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search documents..." 
                    className="pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

            {/* BUTTONS */}
            <div className="flex gap-2">
                {/* 🟢 HIDDEN INPUT & UPLOAD BUTTON */}
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
                    title="Upload .txt, .pdf, .docx, .xlsx"
                >
                    <Upload size={16} /> Upload
                </button>

                <button 
                    onClick={() => setCreateType('DOC')}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-blue-200"
                >
                    <FileText size={16} /> New Doc
                </button>
                <button 
                    onClick={() => setCreateType('SHEET')}
                    className="bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-green-200"
                >
                    <Table size={16} /> New Sheet
                </button>
                <button 
                    onClick={() => setCreateType('FORM')}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-purple-200"
                >
                    <FileQuestion size={16} /> New Form
                </button>
            </div>
        </div>
      </div>

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
      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar flex-1">
          {filteredDocs.map(doc => {
              const linkedTask = tasks.find(t => t.id === doc.linkedTaskId);
              return (
                <div 
                    key={doc.id} 
                    onClick={() => setSelectedDoc(doc)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition cursor-pointer group flex flex-col h-48 animate-in fade-in zoom-in-95 duration-300"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition">
                            {getIcon(doc.type)}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                            className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    
                    <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{doc.title}</h3>
                    <p className="text-xs text-gray-400 mb-4">{getTypeLabel(doc.type)}</p>
                    
                    <div className="mt-auto space-y-2">
                        {linkedTask ? (
                            <div className="flex items-center gap-2 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit max-w-full">
                                <LinkIcon size={10} />
                                <span className="truncate">Linked: {linkedTask.title}</span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-300 italic">No task linked</div>
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
                  <FileText size={64} className="mb-4" />
                  <p>No documents found. Start by creating or uploading one.</p>
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
                    onAdd(data);
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