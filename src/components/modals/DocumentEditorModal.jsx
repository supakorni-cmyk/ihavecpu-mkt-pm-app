// src/components/modals/DocumentEditorModal.jsx
import React, { useState, useRef } from 'react';
import { 
    X, Save, FileText, Table, FileQuestion, Link as LinkIcon, 
    Plus, Trash2, Bold, Italic, Underline, 
    AlignLeft, AlignCenter, AlignRight, Type, Sparkles,
    Image as ImageIcon, Download // 🟢 Added new icons
} from 'lucide-react';
import RequirementSheetModal from './RequirementModal'; 

const DocumentEditorModal = ({ existingDoc, initialType, tasks, onClose, onSave }) => {
    const [title, setTitle] = useState(existingDoc?.title || '');
    const [type, setType] = useState(existingDoc?.type || initialType || 'DOC');
    const [linkedTaskId, setLinkedTaskId] = useState(existingDoc?.linkedTaskId || '');
    
    const [sheetData, setSheetData] = useState(existingDoc?.sheetData || null); 
    const [formQuestions, setFormQuestions] = useState(existingDoc?.formQuestions || []);

    const [showAiBar, setShowAiBar] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const initialContent = useRef(existingDoc?.content || '');
    const docEditorRef = useRef(null);
    const fileInputRef = useRef(null); // 🟢 Ref for hidden image input

    // --- FORM LOGIC ---
    const addQuestion = () => setFormQuestions([...formQuestions, { id: Date.now(), text: '', type: 'text' }]);
    const updateQuestion = (id, field, val) => setFormQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: val } : q));
    const deleteQuestion = (id) => setFormQuestions(prev => prev.filter(q => q.id !== id));

    // --- RICH TEXT FORMATTING ---
    const execCmd = (command, value = null) => {
        document.execCommand(command, false, value);
        if (docEditorRef.current) docEditorRef.current.focus();
    };

    // --- 🟢 IMAGE UPLOAD & PASTE LOGIC ---
    const insertImageBase64 = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (docEditorRef.current) {
                docEditorRef.current.focus();
                // Ensure the image fits nicely in the editor
                const imgHtml = `<img src="${e.target.result}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" />`;
                document.execCommand('insertHTML', false, imgHtml + '<br/>');
                initialContent.current = docEditorRef.current.innerHTML;
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        insertImageBase64(file);
        e.target.value = null; // reset input
    };

    const handlePaste = (e) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const items = clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault(); // Stop normal text paste
                const file = items[i].getAsFile();
                insertImageBase64(file);
                return;
            }
        }
    };

    // --- 🟢 EXPORT TO DOC/WORD LOGIC ---
    const handleExportDoc = () => {
        const content = docEditorRef.current?.innerHTML || initialContent.current;
        if (!content) return;

        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${title || 'Exported Document'}</title></head><body>`;
        const footer = "</body></html>";
        
        const html = header + content + footer;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'Untitled_Document'}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- GEMINI AI GENERATOR ---
    const handleGenerateAi = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingAi(true);
        
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                alert("Missing Gemini API Key in .env file.");
                setIsGeneratingAi(false);
                return;
            }

            const promptText = `You are a professional copywriter and document assistant. Generate content based on the following request: "${aiPrompt}". 
            Format your response STRICTLY as valid HTML (using <p>, <br>, <b>, <i>, <ul>, <li>, <h3> where appropriate) so it can be inserted directly into a rich text editor. 
            DO NOT wrap your response in markdown code blocks like \`\`\`html.`;

            const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
            let responseData = null;
            let errorMessage = "";

            for (const model of modelsToTry) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
                    });

                    if (response.ok) {
                        responseData = await response.json();
                        console.log(`✅ Success using model: ${model}`);
                        break; 
                    } else {
                        const errorData = await response.json();
                        errorMessage = errorData?.error?.message || `HTTP Error ${response.status}`;
                    }
                } catch (networkError) {
                    throw new Error("Your browser blocked the connection. Please disable AdBlockers or VPNs.");
                }
            }

            if (!responseData) throw new Error(`All models failed. Last Google error: ${errorMessage}`);
            
            if (responseData.candidates && responseData.candidates.length > 0) {
                const candidate = responseData.candidates[0];
                if (candidate.finishReason && candidate.finishReason !== 'STOP') throw new Error(`Generation stopped early. Reason: ${candidate.finishReason}`);

                if (candidate.content && candidate.content.parts && candidate.content.parts[0].text) {
                    let generatedHtml = candidate.content.parts[0].text;
                    generatedHtml = generatedHtml.replace(/^```html/i, '').replace(/```$/i, '').trim();

                    if (docEditorRef.current) {
                        docEditorRef.current.focus();
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(docEditorRef.current);
                        range.collapse(false); 
                        
                        selection.removeAllRanges();
                        selection.addRange(range);

                        const currentHtml = docEditorRef.current.innerHTML.trim();
                        const spacing = (currentHtml && currentHtml !== '<br>') ? '<br/><br/>' : '';
                        
                        document.execCommand('insertHTML', false, spacing + generatedHtml);
                    }
                    setAiPrompt('');
                    setShowAiBar(false);
                } else { throw new Error("Response is missing text content."); }
            } else { throw new Error("No candidates returned from Gemini."); }
        } catch (error) {
            alert(`AI Error: ${error.message}`);
        } finally { setIsGeneratingAi(false); }
    };

    // --- HANDLE SAVE ---
    const handleSave = () => {
        if (!title.trim()) { alert("Please enter a title"); return; }
        const payload = {
            title, type, linkedTaskId,
            content: type === 'DOC' ? (docEditorRef.current?.innerHTML || initialContent.current) : null,
            sheetData: type === 'SHEET' ? sheetData : null,
            formQuestions: type === 'FORM' ? formQuestions : null,
        };
        onSave(payload);
    };

    if (type === 'SHEET') {
        const mockReq = { id: 'temp-sheet', title: title, ...(sheetData || {}) };
        const mockTask = { requirements: [mockReq] };
        return (
            <RequirementSheetModal 
                task={mockTask} requirement={mockReq} onClose={onClose}
                onUpdateTask={(updatedTaskWrapper) => {
                    const updatedReq = updatedTaskWrapper.requirements[0];
                    onSave({
                        title: title || updatedReq.title, type: 'SHEET', linkedTaskId,
                        sheetData: { tableData: updatedReq.tableData, columns: updatedReq.columns, colWidths: updatedReq.colWidths }
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
                                <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-100 rounded-xl p-2 hidden  w-40 z-50">
                                    <button onClick={() => setType('DOC')} className="flex items-center gap-2 p-2 hover:bg-gray-50 w-full text-left rounded-lg text-xs font-bold text-gray-600"><FileText size={14} className="text-blue-500"/> Document</button>
                                    <button onClick={() => setType('SHEET')} className="flex items-center gap-2 p-2 hover:bg-gray-50 w-full text-left rounded-lg text-xs font-bold text-gray-600"><Table size={14} className="text-green-500"/> Sheet</button>
                                    <button onClick={() => setType('FORM')} className="flex items-center gap-2 p-2 hover:bg-gray-50 w-full text-left rounded-lg text-xs font-bold text-gray-600"><FileQuestion size={14} className="text-purple-500"/> Form</button>
                                </div>
                            )}
                        </div>
                        <input type="text" placeholder="Untitled Document" className="text-xl font-bold bg-transparent outline-none w-full placeholder:text-gray-400" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!existingDoc} />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                            <select value={linkedTaskId} onChange={(e) => setLinkedTaskId(e.target.value)} className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 w-40 truncate">
                                <option value="">Link to Task (Optional)</option>
                                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>
                        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold transition shadow-lg"><Save size={16}/> Save</button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
                    </div>
                </div>

                {/* BODY CONTENT */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {type === 'DOC' && (
                        <>
                            {/* 🟢 TOOLBAR */}
                            <div className="px-6 py-2 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-1">
                                    <button onMouseDown={(e) => {e.preventDefault(); execCmd('bold');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition" title="Bold"><Bold size={16}/></button>
                                    <button onMouseDown={(e) => {e.preventDefault(); execCmd('italic');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition" title="Italic"><Italic size={16}/></button>
                                    <button onMouseDown={(e) => {e.preventDefault(); execCmd('underline');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition" title="Underline"><Underline size={16}/></button>
                                    
                                    <div className="h-4 w-px bg-gray-200 mx-2"></div>
                                    
                                    <button onMouseDown={(e) => {e.preventDefault(); execCmd('justifyLeft');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition" title="Align Left"><AlignLeft size={16}/></button>
                                    <button onMouseDown={(e) => {e.preventDefault(); execCmd('justifyCenter');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition" title="Align Center"><AlignCenter size={16}/></button>
                                    <button onMouseDown={(e) => {e.preventDefault(); execCmd('justifyRight');}} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition" title="Align Right"><AlignRight size={16}/></button>
                                    
                                    <div className="h-4 w-px bg-gray-200 mx-2"></div>

                                    {/* 🟢 IMAGE UPLOAD & EXPORT */}
                                    <button onClick={() => fileInputRef.current.click()} className="p-1.5 hover:bg-gray-100 rounded text-blue-600 transition" title="Insert Image">
                                        <ImageIcon size={16}/>
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                                    </button>
                                    <button onClick={handleExportDoc} className="p-1.5 hover:bg-gray-100 rounded text-green-600 transition" title="Export to Doc">
                                        <Download size={16}/>
                                    </button>
                                    
                                    <div className="h-4 w-px bg-gray-200 mx-2"></div>
                                    
                                    <div className="flex items-center gap-1 group relative">
                                        <Type size={14} className="text-gray-400 ml-1"/>
                                        <select onChange={(e) => execCmd('fontSize', e.target.value)} className="text-xs bg-transparent outline-none cursor-pointer p-1 text-gray-600 font-medium" defaultValue="3">
                                            <option value="1">Small</option>
                                            <option value="3">Normal</option>
                                            <option value="5">Large</option>
                                            <option value="7">Huge</option>
                                        </select>
                                    </div>
                                </div>

                                <button onClick={() => setShowAiBar(!showAiBar)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showAiBar ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                                    <Sparkles size={14} /> AI Assist
                                </button>
                            </div>

                            {/* AI PROMPT */}
                            {showAiBar && (
                                <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 flex gap-2 items-center shrink-0 animate-in slide-in-from-top-1">
                                    <Sparkles size={18} className="text-indigo-400 shrink-0"/>
                                    <input type="text" placeholder="Tell Gemini what to write..." className="flex-1 bg-white border border-indigo-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerateAi()} disabled={isGeneratingAi} autoFocus />
                                    <button onClick={handleGenerateAi} disabled={!aiPrompt.trim() || isGeneratingAi} className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 ${isGeneratingAi || !aiPrompt.trim() ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}>
                                        {isGeneratingAi ? <><Sparkles size={14} className="animate-spin"/> Generating...</> : "Generate"}
                                    </button>
                                </div>
                            )}

                            {/* 🟢 EDITABLE AREA WITH PASTE LISTENER */}
                            <div className="flex-1 overflow-y-auto p-8 cursor-text bg-gray-50/30" onClick={() => docEditorRef.current?.focus()}>
                                <div 
                                    ref={docEditorRef}
                                    contentEditable
                                    onPaste={handlePaste} // 🟢 Handles Ctrl+V images
                                    onInput={(e) => { initialContent.current = e.target.innerHTML; }}
                                    className="outline-none text-gray-800 leading-relaxed font-serif text-lg min-h-full max-w-4xl mx-auto bg-white p-12 shadow-sm border border-gray-100 empty:before:content-[attr(placeholder)] empty:before:text-gray-300"
                                    placeholder="Start typing or paste an image here..."
                                    dangerouslySetInnerHTML={{ __html: initialContent.current }}
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
                                            <input type="text" className="flex-1 bg-gray-50 border-b-2 border-gray-200 focus:border-purple-500 outline-none px-3 py-2 font-medium" placeholder="Question Text" value={q.text} onChange={(e) => updateQuestion(q.id, 'text', e.target.value)} />
                                            <select className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm outline-none" value={q.type} onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}>
                                                <option value="text">Short Answer</option>
                                                <option value="paragraph">Paragraph</option>
                                                <option value="radio">Multiple Choice</option>
                                                <option value="checkbox">Checkboxes</option>
                                            </select>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded border border-dashed border-gray-300 text-xs text-gray-400 text-center">User input area preview ({q.type})</div>
                                        <button onClick={() => deleteQuestion(q.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button>
                                    </div>
                                ))}

                                <button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition flex items-center justify-center gap-2"><Plus size={20}/> Add Question</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentEditorModal;