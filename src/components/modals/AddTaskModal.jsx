// src/components/modals/AddTaskModal.jsx
import React, { useState } from 'react';
import { 
  X, Calendar, Clock, MapPin, Tag, 
  FileText, Image as ImageIcon, Sparkles 
} from 'lucide-react';
import { COLUMNS, TAGS } from '../../utils/constants';

// --- IMPORT AI SERVICE ---
// Make sure this file exists in src/utils/aiService.js
import { suggestTaskDescription } from '../../utils/aiService';

export default function AddTaskModal({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState(TAGS[0]);
  const [status, setStatus] = useState(COLUMNS[0].id);
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // --- NEW: Toggle for P.Pao & AI Loading State ---
  const [isPao, setIsPao] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;

    const newTask = {
      title,
      description,
      tag,
      status,
      deadline: deadline || null,
      location,
      imageUrl,
      isPao, // Include the checkbox state
      requirements: [], // Initialize empty reqs
      comments: []
    };

    onAdd(newTask);
    onClose();
  };

  // --- AI HANDLER ---
  const handleMagicFill = async () => {
    if (!title.trim()) {
        alert("Please type a Task Title first!");
        return;
    }
    
    setIsGenerating(true);
    try {
        // Call the AI Service
        const suggestion = await suggestTaskDescription(title);
        if (suggestion) {
            // Append to existing description or replace it
            setDescription(prev => (prev ? prev + "\n\n" + suggestion : suggestion));
        }
    } catch (error) {
        console.error("AI Error:", error);
        alert("Failed to generate description. Check your API Key.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-xl font-bold text-gray-800">New Task</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                <X size={20} />
            </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
            
            {/* Title Input */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Task Title</label>
                <input 
                    type="text" 
                    className="w-full text-lg font-semibold border-b-2 border-gray-200 focus:border-indigo-500 outline-none py-2 bg-transparent transition-colors placeholder:font-normal"
                    placeholder="e.g. Shoot Video for TikTok..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                />
            </div>

            {/* Description Input + AI Button */}
            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                    <button 
                        type="button"
                        onClick={handleMagicFill}
                        disabled={isGenerating || !title}
                        className={`
                            flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full transition border
                            ${isGenerating 
                                ? 'bg-indigo-50 text-indigo-400 border-indigo-100 cursor-wait' 
                                : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm'
                            }
                        `}
                        title="Auto-generate description using AI"
                    >
                        <Sparkles size={12} className={isGenerating ? "animate-spin" : "fill-indigo-600"} />
                        {isGenerating ? "Generating..." : "AI Auto-Fill"}
                    </button>
                </div>
                <div className="relative">
                    <FileText className="absolute top-3 left-3 text-gray-400" size={18} />
                    <textarea 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[120px] text-sm leading-relaxed resize-none"
                        placeholder="Add details, requirements, or scripts..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
            </div>

            {/* Tags & Status Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                    <div className="relative">
                        <Tag className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} />
                        <select 
                            value={tag} 
                            onChange={(e) => setTag(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-medium text-gray-700"
                        >
                            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Initial Status</label>
                    <div className="relative">
                        <div className={`w-3 h-3 rounded-full absolute top-1/2 -translate-y-1/2 left-3 ${COLUMNS.find(c => c.id === status)?.color.replace('text-', 'bg-')}`}></div>
                        <select 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm appearance-none focus:border-indigo-500 transition cursor-pointer font-medium text-gray-700"
                        >
                            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Date & Location Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deadline / Event Date</label>
                    <div className="relative">
                        <Calendar className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} />
                        <input 
                            type="datetime-local" 
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition text-gray-600"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Location</label>
                    <div className="relative">
                        <MapPin className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="e.g. Studio 1"
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Image URL */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cover Image URL</label>
                <div className="relative">
                    <ImageIcon className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" size={16} />
                    <input 
                        type="url" 
                        placeholder="https://..."
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-indigo-500 transition"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                    />
                </div>
            </div>

            {/* P.Pao Toggle */}
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition" onClick={() => setIsPao(!isPao)}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isPao ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                    {isPao && <X size={14} className="text-white rotate-45" strokeWidth={4} />} {/* Using X rotated as checkmark style or just use Check */}
                    {isPao && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white hidden"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>
                <span className="text-sm font-bold text-indigo-900 select-none">Add to P.Pao Schedule?</span>
            </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition text-sm"
            >
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                disabled={!title}
                className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 text-sm flex items-center gap-2
                    ${title ? 'bg-gray-900 hover:bg-black hover:shadow-xl' : 'bg-gray-300 cursor-not-allowed'}
                `}
            >
                <Sparkles size={16} className={title ? "animate-pulse" : "hidden"} />
                Create Task
            </button>
        </div>
      </div>
    </div>
  );
}