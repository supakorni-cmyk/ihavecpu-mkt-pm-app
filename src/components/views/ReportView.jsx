// src/components/views/ReportView.jsx
import React, { useState, useRef, useMemo } from 'react';
import { 
  Presentation, 
  Printer, 
  Plus, 
  GripVertical, 
  Trash2, 
  Edit2, 
  Upload, 
  Image as ImageIcon,
  X,
  Link as LinkIcon 
} from 'lucide-react';

import ihavecpuLogo from '../../assets/logos/ihavecpu.png'

// --- CONSTANTS ---
const BRANDS = [
    { name: 'iHAVECPU', color: 'bg-gray-900 text-white', logo: ihavecpuLogo },
    { name: 'Intel', color: 'bg-blue-600 text-white', logo: null },
    { name: 'AMD', color: 'bg-black text-white', logo: null },
    { name: 'NVIDIA', color: 'bg-green-500 text-white', logo: null },
    { name: 'ASUS', color: 'bg-blue-800 text-white', logo: null },
    { name: 'MSI', color: 'bg-red-600 text-white', logo: null }
];

const ReportView = ({ tasks, currentUser }) => {
    // --- Local State ---
    const [selectedBrand, setSelectedBrand] = useState('iHAVECPU');
    const [activePageId, setActivePageId] = useState(1);
    const [customLogo, setCustomLogo] = useState(null);
    
    // Safe Date Formatter
    const getFormattedDate = () => {
        try {
            return new Date().toLocaleDateString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } catch (e) {
            return "Date";
        }
    };
    const [reportDate] = useState(getFormattedDate());
    
    // Pages State
    const [pages, setPages] = useState([
        { 
            id: 1, 
            title: 'Marketing Strategy Report', 
            bodyText: 'Annual overview and strategic planning for Q1-Q4.', 
            image: null, 
            image2: null, 
            template: 'title-only' 
        },
        { 
            id: 2, 
            title: 'Visual Overview', 
            bodyText: 'Here is a look at our new product lineup layout.', 
            image: null, 
            image2: null, 
            template: 'top-1-landscape' 
        }
    ]);

    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    // --- Derived State & Safety ---
    const activePage = useMemo(() => {
        const found = pages.find(p => p.id === activePageId);
        return found || pages[0]; // Always fall back to first page
    }, [pages, activePageId]);

    // Calculate Active Logo
    const currentBrandConfig = BRANDS.find(b => b.name === selectedBrand) || BRANDS[0];
    const activeLogo = customLogo || currentBrandConfig.logo;

    // --- Handlers ---
    const updatePage = (field, value) => {
        if (!activePage) return;
        setPages(prev => prev.map(p => p.id === activePage.id ? { ...p, [field]: value } : p));
    };

    const handleImageUpload = (e, slot) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(ev.target?.result) updatePage(slot, ev.target.result);
            };
            reader.readAsDataURL(file);
            e.target.value = ''; 
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(ev.target?.result) setCustomLogo(ev.target.result);
            };
            reader.readAsDataURL(file);
            e.target.value = ''; 
        }
    };

    const addNewPage = () => {
        const newId = Date.now();
        setPages([...pages, { 
            id: newId, 
            title: 'New Slide', 
            bodyText: 'Enter content...', 
            image: null, 
            image2: null, 
            template: '1-landscape' 
        }]);
        setActivePageId(newId);
    };

    const removePage = (id, e) => {
        e.stopPropagation();
        if (pages.length === 1) return; 
        const newPages = pages.filter(p => p.id !== id);
        setPages(newPages);
        // If we deleted the active page, switch to the first available
        if (activePageId === id) setActivePageId(newPages[0].id);
    };

    const handleSort = () => {
        let _pages = [...pages];
        const item = _pages.splice(dragItem.current, 1)[0];
        _pages.splice(dragOverItem.current, 0, item);
        setPages(_pages);
    };

    // --- Safety Check Before Render ---
    if (!activePage) return <div className="p-10 text-center text-gray-500">Loading Slides...</div>;

    // Helper to safely check template string
    const template = activePage.template || 'title-only';

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-100 overflow-y-auto">
            <div className="max-w-5xl mx-auto mb-8 print:hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <Presentation className="text-blue-600" /> Presentation Builder
                    </h2>
                    <div className="flex gap-3">
                        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition">
                            <Printer size={18} /> Export to PDF
                        </button>
                    </div>
                </div>

                {/* Editor UI */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-bold text-gray-500 uppercase">Slides</label>
                                <button onClick={addNewPage} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                                    <Plus size={14} /> Add Slide
                                </button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {pages.map((p, idx) => (
                                    <div 
                                        key={p.id} 
                                        draggable 
                                        onDragStart={() => (dragItem.current = idx)} 
                                        onDragEnter={() => (dragOverItem.current = idx)} 
                                        onDragEnd={handleSort} 
                                        onClick={() => setActivePageId(p.id)} 
                                        className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition ${activePageId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <GripVertical size={16} className="text-gray-400 cursor-move shrink-0" />
                                            <span className="text-sm font-medium truncate">#{idx + 1} {p.title}</span>
                                        </div>
                                        <button onClick={(e) => removePage(p.id, e)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* BRAND & LOGO SELECTOR */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                            {/* Brand Color */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Select Brand</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {BRANDS.map(brand => (
                                        <button 
                                            key={brand.name} 
                                            onClick={() => setSelectedBrand(brand.name)} 
                                            className={`p-2 rounded-lg border-2 text-xs font-bold transition ${selectedBrand === brand.name ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}
                                        >
                                            {brand.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Logo Upload */}
                            <div>
                                <label className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase mb-3">
                                    <span>Brand Logo</span>
                                    {customLogo && (
                                        <button onClick={() => setCustomLogo(null)} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                                            <X size={12}/> Clear
                                        </button>
                                    )}
                                </label>
                                
                                {customLogo ? (
                                    <div className="w-full h-24 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center p-2 relative group">
                                        <img src={customLogo} alt="Custom Logo" className="max-h-full max-w-full object-contain" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                                            <button onClick={() => setCustomLogo(null)} className="text-white bg-red-500 p-1.5 rounded-full"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleLogoUpload} 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                        />
                                        <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-500">
                                            <Upload size={20} className="mb-1" />
                                            <span className="text-xs font-medium">Click to Upload Logo</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Editor */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <Edit2 size={16} /> Edit Slide
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Title</label>
                                <input type="text" value={activePage.title || ''} onChange={(e) => updatePage('title', e.target.value)} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template</label>
                                <select 
                                    value={template} 
                                    onChange={(e) => updatePage('template', e.target.value)} 
                                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="title-only">Title Slide (Center)</option>
                                    <optgroup label="Standard (Side-by-Side)">
                                        <option value="1-landscape">1 Landscape Image</option>
                                        <option value="2-landscape">2 Landscape Images</option>
                                        <option value="1-portrait">1 Portrait Image</option>
                                        <option value="2-portrait">2 Portrait Images</option>
                                    </optgroup>
                                    <optgroup label="Top Center Layout">
                                        <option value="top-1-landscape">Title Top + 1 Landscape</option>
                                        <option value="top-2-portrait">Title Top + 2 Portraits</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Content</label>
                                <textarea value={activePage.bodyText || ''} onChange={(e) => updatePage('bodyText', e.target.value)} className="w-full border rounded-lg p-3 h-20 resize-none focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            
                            {template !== 'title-only' && (
                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group hover:bg-gray-50 transition">
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <Upload className="mx-auto text-gray-400" size={24} />
                                        <span className="text-xs text-gray-500">Image 1</span>
                                    </div>
                                    
                                    {(template.includes('2') || template.includes('top-2')) && (
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group hover:bg-gray-50 transition">
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image2')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <Upload className="mx-auto text-gray-400" size={24} />
                                            <span className="text-xs text-gray-500">Image 2</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview / Print Area */}
            <div className="space-y-8 print:space-y-0">
                {pages.map((page, index) => (
                    <div 
                        key={page.id} 
                        className="max-w-5xl mx-auto bg-white aspect-video shadow-2xl rounded-xl overflow-hidden relative print:shadow-none print:w-full print:h-screen print:rounded-none flex flex-col print:break-after-page"
                    >
                        {/* Slide Header */}
                        <div className={`h-24 flex items-center px-10 justify-between ${currentBrandConfig.color}`}>
                            <div></div>
                            {/* Force Render Custom Logo if exists, else Brand Logo, else Brand Name */}
                            {activeLogo ? (
                                <img src={activeLogo} alt="Logo" className="h-12 object-contain bg-white/10 p-1 rounded" />
                            ) : (
                                <span className="text-xl font-black">{selectedBrand}</span>
                            )}
                        </div>

                        {/* RENDER LOGIC */}
                        {(page.template || 'title-only') === 'title-only' && (
                            <div className="flex-1 p-20 flex flex-col items-center justify-start pt-32 text-center">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm font-bold uppercase tracking-wider mb-6">{reportDate}</span>
                                <h2 className="text-6xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-8">{page.title}</h2>
                                <div className="w-32 h-2 bg-blue-600 rounded-full mb-10"></div>
                                <p className="text-gray-600 text-2xl leading-relaxed max-w-4xl">{page.bodyText}</p>
                                <div className="mt-auto pt-12 opacity-80">
                                    {/* <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">Prepared by</p>
                                    <p className="text-gray-800 font-bold text-xl mt-1">{currentUser?.email || 'Marketing Team'}</p> */}
                                </div>
                            </div>
                        )}

                        {(page.template || '').startsWith('top-') && (
                            <div className="flex-1 p-10 flex flex-col">
                                <div className="text-center mb-6">
                                    <h2 className="text-4xl font-extrabold text-gray-800 leading-tight mb-2">{page.title}</h2>
                                    <p className="text-gray-600 text-lg">{page.bodyText}</p>
                                </div>
                                <div className="flex-1 w-full min-h-0">
                                    {page.template === 'top-1-landscape' ? (
                                        <div className="w-full h-full bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
                                            {page.image ? <img src={page.image} className="w-full h-full object-cover" alt="Slide" /> : <ImageIcon size={48} className="text-gray-300" />}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex gap-8 justify-center">
                                            <div className="h-full aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
                                                {page.image ? <img src={page.image} className="w-full h-full object-cover" alt="Slide 1" /> : <ImageIcon size={48} className="text-gray-300" />}
                                            </div>
                                            <div className="h-full aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
                                                {page.image2 ? <img src={page.image2} className="w-full h-full object-cover" alt="Slide 2" /> : <ImageIcon size={48} className="text-gray-300" />}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!(page.template || '').startsWith('top-') && (page.template || 'title-only') !== 'title-only' && (
                            <div className="flex-1 p-10 flex gap-8">
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    <div>
                                        <span className="inline-block px-3 py-1 rounded bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">{reportDate}</span>
                                        <h2 className="text-5xl font-extrabold text-gray-800 leading-tight">{page.title}</h2>
                                    </div>
                                    <div className="pt-4"><p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">{page.bodyText}</p></div>
                                    {/* <div className="pt-8 mt-auto"><p className="text-gray-400 text-sm font-medium">Prepared by</p><p className="text-gray-800 font-bold text-lg">{currentUser?.email || 'Marketing Team'}</p></div> */}
                                </div>

                                <div className="flex-1 h-full flex flex-col gap-4">
                                    {page.template === '1-landscape' && (
                                        <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                                            {page.image ? <img src={page.image} className="w-full h-full object-cover" alt="Slide" /> : <ImageIcon size={48} className="text-gray-300" />}
                                        </div>
                                    )}
                                    {page.template === '2-landscape' && (
                                        <>
                                            <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div>
                                            <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image2 && <img src={page.image2} className="w-full h-full object-cover" />}</div>
                                        </>
                                    )}
                                    {page.template === '1-portrait' && (
                                        <div className="flex-1 flex justify-center h-full">
                                            <div className="h-full aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div>
                                        </div>
                                    )}
                                    {page.template === '2-portrait' && (
                                        <div className="flex-1 flex gap-4 h-full">
                                            <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image && <img src={page.image} className="w-full h-full object-cover" />}</div>
                                            <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">{page.image2 && <img src={page.image2} className="w-full h-full object-cover" />}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Slide Footer */}
                        {/* <div className="bg-gray-50 border-t border-gray-100 p-4 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">
                            Confidential • Internal Use Only • Slide {index + 1}
                        </div> */}
                    </div>
                ))}
            </div>

            {/* Print Styles */}
            <style>{`
                @media print { 
                    @page { size: landscape; margin: 0; } 
                    body { -webkit-print-color-adjust: exact; } 
                    aside, nav, .print\\:hidden { display: none !important; } 
                    main { width: 100vw; height: auto; overflow: visible; background: white; } 
                    .p-6, .md\\:p-10 { padding: 0 !important; } 
                    .print\\:break-after-page { break-after: page; height: 100vh; width: 100vw; border-radius: 0; } 
                }
            `}</style>
        </div>
    );
};

export default ReportView;