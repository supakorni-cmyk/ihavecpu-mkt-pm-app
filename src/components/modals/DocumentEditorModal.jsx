// src/components/modals/DocumentEditorModal.jsx
import React, { useState, useRef } from 'react';
import { 
    X, Save, FileText, Table, FileQuestion, Link as LinkIcon, 
    Plus, Trash2, Upload, Bold, Italic, Underline, 
    AlignLeft, AlignCenter, AlignRight, Type, Paperclip 
} from 'lucide-react';
import RequirementSheetModal from './RequirementModal'; 

const DocumentEditorModal = ({ existingDoc, initialType, tasks, onClose, onSave }) => {
    const [title, setTitle] = useState(existingDoc?.title || '');
    const [type, setType] = useState(existingDoc?.type || initialType || 'DOC');
    const [linkedTaskId, setLinkedTaskId] = useState(existingDoc?.linkedTaskId || '');
    
    // Content States
    const [docContent, setDocContent] = useState(existingDoc?.content || ''); // HTML String for Doc
    const [sheetData, setSheetData] = useState(existingDoc?.sheetData || null); 
    const [formQuestions, setFormQuestions] = useState(existingDoc?.formQuestions || []);

    const docEditorRef = useRef(null);
    const fileInputRef = useRef(null);

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

    // --- RICH TEXT FORMATTING (DOC MODE) ---
    const execCmd = (command, value = null) => {
        document.execCommand(command, false, value);
        // Sync state immediately
        if (docEditorRef.current) {
            setDocContent(docEditorRef.current.innerHTML);
        }
    };

    // --- FILE UPLOAD HANDLER ---
    const handleFileClick = () => {
        fileInputRef.current.click();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Handle Text Files (Read Content)
        if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (type === 'DOC') {
                    // Append text to doc
                    const text = event.target.result.replace(/\n/g, '<br>');
                    const newContent = (docContent || '') + `<div>${text}</div>`;
                    setDocContent(newContent);
                    if (docEditorRef.current) docEditorRef.current.innerHTML = newContent;
                }
            };
            reader.readAsText(file);
        } 
        // 2. Handle Binary Files (Create Attachment Chip)
        else {
            // Note: In a real app, you would upload 'file' to Firebase Storage here and get a URL.
            // Since we are client-side only for this demo, we simulate a link.
            const fileIcon = file.name.endsWith('.pdf') ? '📄' : file.name.endsWith('.xlsx') ? '📊' : '📎';
            
            const attachmentHTML = `
                <div style="
                    display: inline-flex; align-items: center; gap: 8px; 
                    padding: 8px 12px; margin: 10px 0; 
                    background: #f3f4f6; border: 1px solid #e5e7eb; 
                    border-radius: 8px; font-size: 14px; color: #374151; font-weight: 500;
                    user-select: none;" contenteditable="false">
                    <span>${fileIcon}</span>
                    <span>${file.name}</span>
                    <span style="font-size: 10px; color: #9ca3af; margin-left: 8px;">(${(file.size / 1024).toFixed(1)} KB)</span>
                </div><br/>
            `;

            if (type === 'DOC') {
                const newContent = (docContent || '') + attachmentHTML;
                setDocContent(newContent);
                if (docEditorRef.current) docEditorRef.current.innerHTML = newContent;
            } else {
                alert(`File "${file.name}" attached. (Note: Only .txt files display content directly in this view)`);
            }
        }
        
        // Clear input to allow re-uploading same file
        e.target.value = '';
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

    // --- RENDER SHEET EDITOR ---
    if (type === 'SHEET') {
        const mockReq = { id: 'temp-sheet', title: title, ...(sheetData || {}) };
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
                            <div className={`p-2 rounded-lg cursor-pointer transition ${type === 'DOC' ? 'bg-blue-100 text-blue-600' : type === 'FORM' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                {type === 'DOC' && <FileText size={24}/>}
                                {type === 'FORM' && <FileQuestion size={24}/>}
                            </div>
                            {!existingDoc && (
                                <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-100 rounded-xl p-2 hidden group-hover:block w-40 z-50">
                                    <button onClick={() => setType('DOC')} className="flex items-center gap-2 p-2 hover:bg-gray-50 w-full text-left rounded-lg text-xs font-bold text-gray-600"><FileText size={14} className="text-blue-500"/> Document</button>
                                    <button onClick={() => setType('SHEET')} className="flex items-center gap-2 p-2 hover:bg-gray-50 w-full text-left rounded-lg text-xs font-bold text-gray-600"><Table size={14} className="text-green-500"/> Sheet</button>
                                    <button onClick={() => setType('FORM')} className="flex items-center gap-2 p-2 hover:bg-gray-50 w-full text-left rounded-lg text-xs font-bold text-gray-600"><FileQuestion size={14} className="text-purple-500"/> Form</button>
                                </div>
                            )}
                        </div>

                        <input 
                            type="text" 
                            placeholder="Untitled Document"
                            className="text-xl font-bold bg-transparent outline-none w-full placeholder:text-gray-400"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus={!existingDoc}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* 🟢 UPLOAD BUTTON */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".txt,.pdf,.docx,.xlsx" 
                            onChange={handleFileUpload} 
                        />
                        <button 
                            onClick={handleFileClick} 
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition border border-transparent hover:border-blue-100"
                            title="Upload File (.txt, .pdf, .docx, .xlsx)"
                        >
                            <Upload size={18} />
                        </button>

                        <div className="h-6 w-px bg-gray-300 mx-1"></div>

                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                            <select 
                                value={linkedTaskId}
                                onChange={(e) => setLinkedTaskId(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 w-40 truncate"
                            >
                                <option value="">Link Task</option>
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
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    
                    {/* --- DOC EDITOR --- */}
                    {type === 'DOC' && (
                        <>
                            {/* 🟢 RICH TEXT TOOLBAR */}
                            <div className="px-6 py-2 border-b border-gray-100 bg-white flex items-center gap-1">
                                <button onMouseDown={(e) => {e.preventDefault(); execCmd('bold');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Bold size={16}/></button>
                                <button onMouseDown={(e) => {e.preventDefault(); execCmd('italic');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Italic size={16}/></button>
                                <button onMouseDown={(e) => {e.preventDefault(); execCmd('underline');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Underline size={16}/></button>
                                <div className="h-4 w-px bg-gray-200 mx-2"></div>
                                <button onMouseDown={(e) => {e.preventDefault(); execCmd('justifyLeft');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><AlignLeft size={16}/></button>
                                <button onMouseDown={(e) => {e.preventDefault(); execCmd('justifyCenter');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><AlignCenter size={16}/></button>
                                <button onMouseDown={(e) => {e.preventDefault(); execCmd('justifyRight');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><AlignRight size={16}/></button>
                                <div className="h-4 w-px bg-gray-200 mx-2"></div>
                                <div className="flex items-center gap-1">
                                    <Type size={14} className="text-gray-400"/>
                                    <select onChange={(e) => execCmd('fontSize', e.target.value)} className="text-xs bg-transparent outline-none cursor-pointer">
                                        <option value="3">Normal</option>
                                        <option value="1">Small</option>
                                        <option value="5">Large</option>
                                        <option value="7">Huge</option>
                                    </select>
                                </div>
                            </div>

                            {/* 🟢 EDITABLE AREA */}
                            <div className="flex-1 overflow-y-auto p-8 cursor-text" onClick={() => docEditorRef.current?.focus()}>
                                <div 
                                    ref={docEditorRef}
                                    contentEditable
                                    className="outline-none text-gray-800 leading-relaxed font-serif text-lg min-h-full empty:before:content-[attr(placeholder)] empty:before:text-gray-300"
                                    placeholder="Start typing your document..."
                                    onInput={(e) => setDocContent(e.target.innerHTML)}
                                    dangerouslySetInnerHTML={{ __html: docContent }}
                                    style={{ whiteSpace: 'pre-wrap' }}
                                />
                            </div>
                        </>
                    )}

                    {/* --- FORM EDITOR --- */}
                    {type === 'FORM' && (
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentEditorModal;