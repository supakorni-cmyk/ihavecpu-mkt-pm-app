// src/components/views/DocumentView.jsx
import React, { useState } from 'react';
import { 
  FileText, Table, FileQuestion, Plus, Search, 
  MoreVertical, Calendar, Link as LinkIcon, Trash2 
} from 'lucide-react';
import DocumentEditorModal from '../modals/DocumentEditorModal';

const DocumentView = ({ documents, tasks, onAdd, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState('ALL'); // ALL, DOC, SHEET, FORM
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null); // For Editing
  const [isCreating, setIsCreating] = useState(false); // For New Doc Modal

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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* HEADER */}
      <div className="px-8 py-6 bg-white border-b border-gray-200 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-black text-gray-800">Documents</h1>
            <p className="text-gray-500 text-sm">Manage docs, sheets, and forms.</p>
        </div>
        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search documents..." 
                    className="pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <button 
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-blue-200"
            >
                <Plus size={18} /> New File
            </button>
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
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition cursor-pointer group flex flex-col h-48"
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
                  <p>No documents found.</p>
              </div>
          )}
      </div>

      {/* EDITOR MODAL */}
      {(isCreating || selectedDoc) && (
          <DocumentEditorModal 
            existingDoc={selectedDoc}
            tasks={tasks}
            onClose={() => { setIsCreating(false); setSelectedDoc(null); }}
            onSave={(data) => {
                if (selectedDoc) {
                    onUpdate(selectedDoc.id, data);
                } else {
                    onAdd(data);
                }
                setIsCreating(false); 
                setSelectedDoc(null);
            }}
          />
      )}
    </div>
  );
};

export default DocumentView;