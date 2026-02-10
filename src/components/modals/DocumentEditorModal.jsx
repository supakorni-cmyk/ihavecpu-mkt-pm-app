// src/components/modals/DocumentEditorModal.jsx
import React, { useState } from 'react';
import { X, Save, FileText, Table, FileQuestion, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import RequirementSheetModal from './RequirementModal'; 

const DocumentEditorModal = ({ existingDoc, initialType, tasks, onClose, onSave }) => {
    // 🟢 Initialize type with existing doc type OR the button clicked (initialType)
    const [title, setTitle] = useState(existingDoc?.title || '');
    const [type, setType] = useState(existingDoc?.type || initialType || 'DOC');
    const [linkedTaskId, setLinkedTaskId] = useState(existingDoc?.linkedTaskId || '');
    
    // Content States
    const [docContent, setDocContent] = useState(existingDoc?.content || '');
    const [sheetData, setSheetData] = useState(existingDoc?.sheetData || null); 
    const [formQuestions, setFormQuestions] = useState(existingDoc?.formQuestions || []);

    // --- FORM LOGIC ---
    const addQuestion = () => {
        setFormQuestions([...formQuestions, { id: Date.now(), text: '', type: 'text' }]);
    };
    const updateQuestion = (id, field, val) => {
        setFormQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: val } : q));
    };
    const deleteQuestion = (id) => {
        setFormQuestions(prev => prev.filter(q => q.id !== id));
    };

    // --- HANDLE SAVE ---
    const handleSave = () => {
        if (!title.trim()) { alert("Please enter a title"); return; }
        
        const payload = {
            title,
            type,
            linkedTaskId,
            content: type === 'DOC' ? docContent : null,
            sheetData: type === 'SHEET' ? sheetData : null,
            formQuestions: type === 'FORM' ? formQuestions : null,
        };
        onSave(payload);
    };

    // --- RENDER SHEET EDITOR (Wrapper around RequirementModal) ---
    if (type === 'SHEET') {
        const mockReq = { 
            id: 'temp-sheet', 
            title: title, 
            ...(sheetData || {}) 
        };
        const mockTask = { requirements: [mockReq] };

        return (
            <RequirementSheetModal 
                task={mockTask}
                requirement={mockReq}
                onClose={onClose}
                onUpdateTask={(updatedTaskWrapper) => {
                    const updatedReq = updatedTaskWrapper.requirements[0];
                    onSave({
                        title: title || updatedReq.title,
                        type: 'SHEET',
                        linkedTaskId,
                        sheetData: {
                            tableData: updatedReq.tableData,
                            columns: updatedReq.columns,
                            colWidths: updatedReq.colWidths
                        }
                    });
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative group">
                            <div className={`p-2 rounded-lg transition ${type === 'DOC' ? 'bg-blue-100 text-blue-600' : type === 'FORM' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                {type === 'DOC' && <FileText size={24}/>}
                                {type === 'FORM' && <FileQuestion size={24}/>}
                            </div>
                        </div>

                        <input 
                            type="text" 
                            placeholder="Untitled Document"
                            className="text-xl font-bold bg-transparent outline-none w-full placeholder:text-gray-400"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus={!existingDoc} // Auto focus title for new docs
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                            <select 
                                value={linkedTaskId}
                                onChange={(e) => setLinkedTaskId(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 w-48 truncate"
                            >
                                <option value="">Link to Task (Optional)</option>
                                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>

                        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold transition shadow-lg">
                            <Save size={16}/> Save
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
                    </div>
                </div>

                {/* BODY CONTENT */}
                <div className="flex-1 overflow-y-auto bg-white p-8">
                    
                    {/* DOC EDITOR */}
                    {type === 'DOC' && (
                        <textarea 
                            className="w-full h-full resize-none outline-none text-gray-800 leading-relaxed font-serif text-lg placeholder:text-gray-300"
                            placeholder="Start typing your document..."
                            value={docContent}
                            onChange={(e) => setDocContent(e.target.value)}
                        />
                    )}

                    {/* FORM EDITOR */}
                    {type === 'FORM' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="bg-purple-50 border-t-4 border-purple-500 p-6 rounded-lg shadow-sm">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{title || "Untitled Form"}</h2>
                                <p className="text-sm text-gray-500">Add questions below.</p>
                            </div>

                            {formQuestions.map((q, idx) => (
                                <div key={q.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative group">
                                    <div className="flex gap-4 mb-4">
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-gray-50 border-b-2 border-gray-200 focus:border-purple-500 outline-none px-3 py-2 font-medium"
                                            placeholder="Question Text"
                                            value={q.text}
                                            onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                        />
                                        <select 
                                            className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm outline-none"
                                            value={q.type}
                                            onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                                        >
                                            <option value="text">Short Answer</option>
                                            <option value="paragraph">Paragraph</option>
                                            <option value="radio">Multiple Choice</option>
                                            <option value="checkbox">Checkboxes</option>
                                        </select>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded border border-dashed border-gray-300 text-xs text-gray-400 text-center">
                                        User input area preview ({q.type})
                                    </div>
                                    <button 
                                        onClick={() => deleteQuestion(q.id)}
                                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}

                            <button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition flex items-center justify-center gap-2">
                                <Plus size={20}/> Add Question
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentEditorModal;