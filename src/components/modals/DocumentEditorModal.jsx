// src/components/views/DocumentView.jsx
import React, { useState } from 'react';
import { 
    FileText, 
    Table, 
    FileQuestion, 
    Search, 
    Plus, 
    Trash2, 
    Edit2, 
    Clock,
    FolderOpen
} from 'lucide-react';

import DocumentEditorModal from '../modals/DocumentEditorModal';

const DocumentView = ({ documents = [], tasks = [], onAdd, onUpdate, onDelete }) => {
    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'DOC', 'SHEET', 'FORM'
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [initialType, setInitialType] = useState('DOC');

    // --- FILTERING LOGIC ---
    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || doc.type === filterType;
        return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); // Newest first

    // --- HANDLERS ---
    const handleCreateNew = (type) => {
        setInitialType(type);
        setSelectedDoc(null);
        setIsModalOpen(true);
    };

    const handleEdit = (doc) => {
        setSelectedDoc(doc);
        setIsModalOpen(true);
    };

    const handleSaveDoc = (payload) => {
        if (selectedDoc) {
            onUpdate(selectedDoc.id, payload);
        } else {
            onAdd({ 
                ...payload, 
                id: Date.now().toString(), 
                createdAt: new Date().toISOString() 
            });
        }
        setIsModalOpen(false);
        setSelectedDoc(null);
    };

    // --- HELPER: TYPE RENDERERS ---
    const getTypeConfig = (type) => {
        switch (type) {
            case 'DOC':
                return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Document' };
            case 'SHEET':
                return { icon: Table, color: 'text-green-600', bg: 'bg-green-100', label: 'Spreadsheet' };
            case 'FORM':
                return { icon: FileQuestion, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Form' };
            default:
                return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Unknown' };
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans">
            
            {/* --- HEADER --- */}
            <header className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl shadow-sm z-20 flex flex-col md:flex-row md:justify-between md:items-center gap-4 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl shadow-inner">
                        <FolderOpen size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Workspace</h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Manage your documents, sheets, and forms.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search files..." 
                            className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {/* Create New Button */}
                    <button 
                        onClick={() => handleCreateNew('DOC')} 
                        className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-gray-900/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 hover:shadow-xl"
                    >
                        <Plus size={18} /> New File
                    </button>
                </div>
            </header>

            {/* --- BODY --- */}
            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                
                {/* Filters */}
                <div className="flex gap-2 mb-8 border-b border-gray-200 pb-4 overflow-x-auto custom-scrollbar">
                    {['ALL', 'DOC', 'SHEET', 'FORM'].map(type => (
                        <button 
                            key={type} 
                            onClick={() => setFilterType(type)}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${filterType === type ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                        >
                            {type === 'ALL' ? 'All Files' : type === 'DOC' ? 'Documents' : type === 'SHEET' ? 'Spreadsheets' : 'Forms'}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {filteredDocs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDocs.map(doc => {
                            const { icon: TypeIcon, color, bg, label } = getTypeConfig(doc.type);
                            
                            return (
                                <div key={doc.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group flex flex-col cursor-pointer" onClick={() => handleEdit(doc)}>
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${bg} ${color}`}>
                                            <TypeIcon size={24} />
                                        </div>
                                        
                                        {/* Actions (Hidden until hover) */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-md transition" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate" title={doc.title}>
                                        {doc.title || 'Untitled'}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-6 uppercase tracking-widest">
                                        <span className={color}>{label}</span>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} />
                                            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                                        </div>
                                        
                                        {doc.linkedTaskId && (
                                            <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-500 truncate max-w-[100px]" title="Linked to task">
                                                Linked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                            <FolderOpen size={48} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 mb-1">No files found</h3>
                        <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                            {searchTerm ? `We couldn't find any ${filterType !== 'ALL' ? filterType.toLowerCase() : ''} files matching "${searchTerm}".` : "You haven't created any files yet. Get started by creating a new document, spreadsheet, or form."}
                        </p>
                        {!searchTerm && (
                            <button onClick={() => handleCreateNew('DOC')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2">
                                <Plus size={18} /> Create Your First File
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* --- MODAL INJECTION --- */}
            {(isModalOpen || selectedDoc) && (
                <DocumentEditorModal 
                    existingDoc={selectedDoc}
                    initialType={initialType}
                    tasks={tasks}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedDoc(null);
                    }}
                    onSave={handleSaveDoc}
                />
            )}
        </div>
    );
};

export default DocumentView;