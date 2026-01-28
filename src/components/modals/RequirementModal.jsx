// src/components/modals/RequirementModal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Table, FileSpreadsheet, X, Plus, Save, ZoomIn, ZoomOut, Trash2, 
    AlignLeft, AlignCenter, AlignRight, Hash, DollarSign, Type, Calculator, ExternalLink,
    Wand2
} from 'lucide-react';

const RequirementSheetModal = ({ task, requirement, onClose, onUpdateTask }) => {
    // --- State ---
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [colWidths, setColWidths] = useState({});
    const [scale, setScale] = useState(1);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Editor State
    const [editingCell, setEditingCell] = useState({ rowId: null, colId: null });
    const [contextMenu, setContextMenu] = useState(null); 
    const editorRef = useRef(null); 

    // Initialize
    useEffect(() => {
        setTableData(requirement.tableData || []);
        setColumns(requirement.columns || [
            { id: 'col1', name: 'Item / Name', align: 'left', format: 'text', autoFormula: '' }, 
            { id: 'col2', name: 'Price', align: 'right', format: 'currency', autoFormula: '' }, 
            { id: 'col3', name: 'Quantity', align: 'center', format: 'number', autoFormula: '' }, 
            { id: 'col4', name: 'Total', align: 'right', format: 'currency', autoFormula: '=B*C' } // Example default
        ]);
        setColWidths(requirement.colWidths || {});
        setHasUnsavedChanges(false);
    }, [requirement]);

    // --- 🧮 LOGIC ENGINE ---
    const getColLetter = (index) => {
        if (index === undefined || index === null || index < 0) return '?';
        try {
            let letter = '';
            let tempIndex = index;
            while (tempIndex >= 0) {
                letter = String.fromCharCode((tempIndex % 26) + 65) + letter;
                tempIndex = Math.floor(tempIndex / 26) - 1;
            }
            return letter;
        } catch (e) { return '?'; }
    };

    // Helper: Convert generic "A*B" to specific "A1*B1" based on row index
    const generateSpecificFormula = (genericFormula, rowIndex) => {
        if (!genericFormula) return '';
        const rowNum = rowIndex + 1;
        // Replace Column Letters (e.g., A, B, AA) that are NOT followed by a number
        // with Letter + RowNumber (e.g., A1, B1)
        return genericFormula.toUpperCase().replace(/([A-Z]+)(?![0-9])/g, (match) => match + rowNum);
    };

    const evaluateFormula = useCallback((expression, currentRowIdx) => {
        if (!expression || typeof expression !== 'string' || !expression.startsWith('=')) return expression;

        try {
            let formula = expression.substring(1).toUpperCase();
            
            // Regex to find and replace cell references (A1, B2) with actual values
            formula = formula.replace(/([A-Z]+)(\d+)/g, (match, colLetter, rowNum) => {
                let colIndex = 0;
                for (let i = 0; i < colLetter.length; i++) {
                    colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
                }
                colIndex -= 1; 

                const targetCol = columns[colIndex];
                const targetRowIndex = parseInt(rowNum) - 1;
                
                // Recursion Protection: If we need data from a row, we must check if THAT cell is calculated too
                // For simplicity here, we just grab raw data. A full spreadsheet graph is complex.
                // We fallback to tableData which contains RAW values (no auto-calc values stored in state).
                // Ideally, auto-formulas work best on "Input" columns.
                
                const targetRow = tableData[targetRowIndex];

                if (!targetCol || !targetRow) return 0;

                let val = targetRow[targetCol.id];
                
                // If target cell is empty, check if it has an auto-formula (Recursive-ish for 1 level)
                if ((val === undefined || val === '' || val === null) && targetCol.autoFormula) {
                     // Recalculate that dependency (Limit depth to 1 to avoid infinite loop crashes)
                     const depFormula = generateSpecificFormula(targetCol.autoFormula, targetRowIndex);
                     // We recursively call evaluateFormula but carefully
                     // For this lightweight version, let's assumes dependencies are raw numbers
                     return 0; 
                }

                if (!val) return 0;
                val = val.toString().replace(/,/g, ''); 
                return isNaN(Number(val)) ? 0 : Number(val);
            });

            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + formula)();
            return Number.isInteger(result) ? result : parseFloat(result.toFixed(2));
        } catch (error) {
            return "#ERROR";
        }
    }, [tableData, columns]);

    // Unified Value Getter (Handles Manual Value OR Auto Formula)
    const getEffectiveCellValue = (row, col, rowIndex) => {
        const rawValue = row[col.id];
        
        // 1. If cell has manual value, use it
        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
            return evaluateFormula(rawValue, rowIndex);
        }

        // 2. If empty, check for Auto Formula
        if (col.autoFormula) {
            const specificFormula = generateSpecificFormula(col.autoFormula, rowIndex);
            // Ensure it starts with =
            const cleanFormula = specificFormula.startsWith('=') ? specificFormula : '=' + specificFormula;
            return evaluateFormula(cleanFormula, rowIndex);
        }

        return '';
    };

    const formatValue = (val, format) => {
        if (val === undefined || val === null || val === '') return '';
        if (typeof val === 'string' && val.startsWith('#')) return val; 
        
        const rawNum = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
        
        if (isNaN(rawNum)) return val; 

        if (format === 'number') {
            return rawNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }
        if (format === 'currency') {
            return '฿' + rawNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return val;
    };

    // --- 📊 SUMMARY CALCULATION ---
    const calculateColumnTotal = (col) => {
        if (col.format !== 'number' && col.format !== 'currency') return null;

        const total = tableData.reduce((sum, row, rIdx) => {
            // Use Effective Value (Formula-aware)
            const val = getEffectiveCellValue(row, col, rIdx);
            
            let num = 0;
            if (typeof val === 'number') {
                num = val;
            } else if (typeof val === 'string') {
                num = parseFloat(val.replace(/,/g, ''));
            }
            return sum + (isNaN(num) ? 0 : num);
        }, 0);

        return formatValue(total, col.format);
    };

    // --- 🖱️ INTERACTION HANDLERS ---
    const handleCellClick = (rowId, colId, rowIndex, colIndex) => {
        if (editingCell.rowId === rowId && editingCell.colId === colId) return;

        if (editingCell.rowId && editingCell.colId) {
            const activeRow = tableData.find(r => r.id === editingCell.rowId);
            if (!activeRow) { setEditingCell({ rowId, colId }); return; }

            const activeVal = activeRow[editingCell.colId] || '';
            
            // Check manual formula OR auto formula input
            const activeCol = columns.find(c => c.id === editingCell.colId);
            const isFormulaInput = activeVal.toString().startsWith('=') || (activeVal === '' && activeCol?.autoFormula);

            if (isFormulaInput) {
                const cellRef = `${getColLetter(colIndex)}${rowIndex + 1}`; // Use specific row number for explicit clicks
                const input = editorRef.current;
                
                if (input) {
                    const startPos = input.selectionStart || (input.value ? input.value.length : 0);
                    const endPos = input.selectionEnd || (input.value ? input.value.length : 0);
                    const currentText = input.value;
                    const newVal = currentText.substring(0, startPos) + cellRef + currentText.substring(endPos);
                    
                    handleCellChange(editingCell.rowId, editingCell.colId, newVal);
                    
                    setTimeout(() => {
                        if(editorRef.current) {
                            editorRef.current.focus();
                            const newCursorPos = startPos + cellRef.length;
                            editorRef.current.setSelectionRange(newCursorPos, newCursorPos);
                        }
                    }, 0);
                }
                return; 
            }
        }
        setEditingCell({ rowId, colId });
    };

    const handleCellChange = (rowId, colId, value) => {
        setTableData(prev => prev.map(row => 
            row.id === rowId ? { ...row, [colId]: value } : row
        ));
        setHasUnsavedChanges(true);
    };

    const updateColumnProperty = (colId, property, value) => {
        setColumns(cols => cols.map(c => c.id === colId ? { ...c, [property]: value } : c));
        setHasUnsavedChanges(true);
    };

    // --- 🛠️ STRUCTURE ACTIONS ---
    const insertRow = (index, position) => { 
        const newRow = { id: Date.now() };
        columns.forEach(col => newRow[col.id] = '');
        
        const newData = [...tableData];
        const insertIdx = position === 'before' ? index : index + 1;
        newData.splice(insertIdx, 0, newRow);
        
        setTableData(newData);
        setHasUnsavedChanges(true);
        setContextMenu(null);
    };

    const insertCol = (index, position) => {
        const newCol = { id: `col-${Date.now()}`, name: 'New Column', align: 'left', format: 'text', autoFormula: '' };
        const newCols = [...columns];
        const insertIdx = position === 'before' ? index : index + 1;
        newCols.splice(insertIdx, 0, newCol);
        
        setColumns(newCols);
        setHasUnsavedChanges(true);
        setContextMenu(null);
    };

    const deleteStructure = (type, id) => {
        if (type === 'row') {
            setTableData(prev => prev.filter(r => r.id !== id));
        } else {
            setColumns(prev => prev.filter(c => c.id !== id));
        }
        setHasUnsavedChanges(true);
        setContextMenu(null);
    };

    // --- 💾 EXPORT ACTIONS ---
    const handleSave = () => {
        const updatedReqs = task.requirements.map(r => {
            if (r.id === requirement.id) return { ...r, tableData, columns, colWidths };
            return r;
        });
        onUpdateTask({ requirements: updatedReqs });
        setHasUnsavedChanges(false);
    };

    const copyDataToClipboard = () => {
        const headers = columns.map(c => c.name).join('\t');
        const rows = tableData.map((row, rIdx) => 
            columns.map(col => {
                const val = getEffectiveCellValue(row, col, rIdx); // Export calculated
                return val === undefined || val === null ? '' : val;
            }).join('\t')
        ).join('\n');
        
        const clipboardText = `${headers}\n${rows}`;

        navigator.clipboard.writeText(clipboardText).then(() => {
            alert("✅ Data copied! \n\nGo to your existing Google Sheet tab and press Ctrl+V to paste.");
        }).catch(err => alert("Failed to copy data: " + err));
    };

    const openNewSheet = () => {
        window.open('https://sheets.new', '_blank');
    };

    // --- 🖱️ CONTEXT MENU ---
    const handleContextMenu = (e, type, id, index) => {
        e.preventDefault();
        e.stopPropagation(); 
        let x = e.clientX;
        let y = e.clientY;
        const menuWidth = 240; // Wider for formula input
        const menuHeight = 350;
        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
        setContextMenu({ type, id, index, x, y });
    };

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in zoom-in duration-200" onClick={onClose}>
            <div className="bg-white w-full max-w-[95vw] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 relative" onClick={e => e.stopPropagation()}>
                
                {/* TOOLBAR */}
                <div className="bg-green-700 px-4 py-3 flex justify-between items-center text-white shrink-0 shadow-md z-30">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2 rounded"><Table size={20} /></div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                                {requirement.text} 
                                {hasUnsavedChanges && <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 rounded-full">Unsaved</span>}
                            </h3>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-green-800/50 p-1 rounded-lg">
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-white/20 rounded"><ZoomOut size={16}/></button>
                        <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1.5 hover:bg-white/20 rounded"><ZoomIn size={16}/></button>
                    </div>

                    <div className="flex gap-3 items-center">
                        <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${hasUnsavedChanges ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300' : 'bg-white/10 hover:bg-white/20'}`}>
                            <Save size={16} /> Save
                        </button>
                        <div className="flex bg-white/10 rounded-lg p-0.5">
                            <button onClick={copyDataToClipboard} className="px-3 py-1.5 rounded-md hover:bg-white/20 text-xs font-bold flex items-center gap-2 transition" title="Copy data to paste in existing sheet">
                                <Copy size={14} /> Copy Data
                            </button>
                            <div className="w-px bg-white/20 my-1 mx-1"></div>
                            <button onClick={openNewSheet} className="px-2 py-1.5 rounded-md hover:bg-white/20 transition" title="Open empty Google Sheet">
                                <ExternalLink size={14} />
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white transition"><X size={24} /></button>
                    </div>
                </div>

                {/* TABLE AREA */}
                <div className="flex-1 overflow-auto bg-gray-100 p-8 relative">
                    <div 
                        className="bg-white border border-gray-300 shadow-xl inline-block origin-top-left transition-transform duration-200 ease-out"
                        style={{ transform: `scale(${scale})` }}
                    >
                        {/* --- HEADER ROW --- */}
                        <div className="flex border-b border-gray-300 bg-gray-50 sticky top-0 z-20 shadow-sm">
                            <div className="w-10 p-2 border-r border-gray-300 bg-gray-100 flex items-center justify-center text-gray-400 font-mono text-xs">#</div>
                            {columns.map((col, idx) => (
                                <div 
                                    key={col.id} 
                                    className="border-r border-gray-300 relative group flex flex-col"
                                    style={{ width: colWidths[col.id] || 200, minWidth: 60 }}
                                    onContextMenu={(e) => handleContextMenu(e, 'col', col.id, idx)}
                                >
                                    <div className={`bg-gray-200 text-center text-[10px] font-bold py-1 border-b border-gray-300 select-none flex justify-center items-center gap-1 ${col.autoFormula ? 'text-purple-600' : 'text-gray-600'}`}>
                                        {col.autoFormula && <Wand2 size={8} />} {getColLetter(idx)}
                                    </div>
                                    <input 
                                        className="w-full bg-transparent text-center text-xs font-bold p-2 outline-none focus:bg-blue-50"
                                        value={col.name}
                                        onChange={(e) => updateColumnProperty(col.id, 'name', e.target.value)}
                                    />
                                    <div className="absolute top-1 left-1 opacity-20 group-hover:opacity-100 pointer-events-none">
                                        {col.format === 'number' && <Hash size={10} className="text-blue-500"/>}
                                        {col.format === 'currency' && <DollarSign size={10} className="text-green-500"/>}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 opacity-0 group-hover:opacity-100"
                                         onMouseDown={(e) => {
                                             const startX = e.pageX;
                                             const startWidth = colWidths[col.id] || 200;
                                             const onMove = (mv) => {
                                                 setColWidths(prev => ({ ...prev, [col.id]: Math.max(60, startWidth + (mv.pageX - startX)) }));
                                                 setHasUnsavedChanges(true);
                                             };
                                             const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                                             window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                                         }}
                                    />
                                </div>
                            ))}
                            <button onClick={() => insertCol(columns.length, 'after')} className="w-8 flex items-center justify-center hover:bg-gray-200 text-gray-400 border-r border-gray-300 transition-colors"><Plus size={16} /></button>
                        </div>

                        {/* --- DATA ROWS --- */}
                        {tableData.map((row, rIdx) => (
                            <div key={row.id} className="flex border-b border-gray-200 hover:bg-blue-50/10">
                                <div 
                                    className="w-10 border-r border-gray-300 bg-gray-50 text-gray-500 font-mono text-xs flex items-center justify-center cursor-context-menu hover:bg-gray-200 transition-colors select-none"
                                    onContextMenu={(e) => handleContextMenu(e, 'row', row.id, rIdx)}
                                >
                                    {rIdx + 1}
                                </div>

                                {columns.map((col, cIdx) => {
                                    const isEditing = editingCell.rowId === row.id && editingCell.colId === col.id;
                                    const rawValue = row[col.id];
                                    
                                    // Calculate Display Value
                                    // 1. If Editing -> Show Raw (or Empty if using formula)
                                    // 2. If Not Editing -> Show Effective Value (Auto-Calc or Manual)
                                    let displayValue = '';
                                    let isFormula = false;
                                    let isAuto = false;

                                    if (isEditing) {
                                        // When editing, if it's empty but has auto-formula, we show empty (user can type to override)
                                        // If user typed '=', show that.
                                        displayValue = rawValue || '';
                                        // If it's an auto-formula column and cell is empty, we could show the formula as placeholder?
                                    } else {
                                        const effective = getEffectiveCellValue(row, col, rIdx);
                                        displayValue = formatValue(effective, col.format || 'text');
                                        
                                        isFormula = typeof rawValue === 'string' && rawValue.startsWith('=');
                                        isAuto = !isFormula && (rawValue === undefined || rawValue === '') && col.autoFormula;
                                    }

                                    const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                                    const cellClass = isFormula ? 'text-green-700 font-medium bg-green-50/30' : isAuto ? 'text-purple-700 font-medium bg-purple-50/30' : 'text-gray-800';

                                    return (
                                        <div 
                                            key={col.id} 
                                            className="border-r border-gray-200 relative"
                                            style={{ width: colWidths[col.id] || 200, minWidth: 60 }}
                                            onClick={() => handleCellClick(row.id, col.id, rIdx, cIdx)}
                                        >
                                            {isEditing ? (
                                                <input
                                                    ref={editorRef}
                                                    autoFocus
                                                    className="w-full h-full px-2 py-1.5 text-sm outline-none bg-white ring-2 ring-blue-500 z-10 absolute inset-0 font-mono"
                                                    value={rawValue || ''}
                                                    onChange={(e) => handleCellChange(row.id, col.id, e.target.value)}
                                                    onBlur={() => setEditingCell({ rowId: null, colId: null })}
                                                    placeholder={col.autoFormula ? `Auto: ${col.autoFormula}` : ''}
                                                />
                                            ) : (
                                                <div className={`w-full h-full px-2 py-1.5 text-sm truncate select-none cursor-cell ${alignClass} ${cellClass}`}>
                                                    {displayValue}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="w-8 bg-gray-50 border-r border-gray-200"></div>
                            </div>
                        ))}

                        {/* --- SUMMARY ROW --- */}
                        <div className="flex border-b border-gray-300 bg-gray-100 font-bold sticky bottom-0 z-20 shadow-[-2px_-4px_10px_rgba(0,0,0,0.05)] border-t-2 border-t-gray-300">
                            <div className="w-10 border-r border-gray-300 p-2 flex items-center justify-center text-xs text-gray-500 bg-gray-200">
                                <Calculator size={14}/>
                            </div>
                            {columns.map((col, idx) => {
                                const total = calculateColumnTotal(col);
                                const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                                return (
                                    <div 
                                        key={col.id} 
                                        className={`border-r border-gray-300 px-2 py-2 text-sm ${alignClass}`}
                                        style={{ width: colWidths[col.id] || 200, minWidth: 60 }}
                                    >
                                        <span className="text-gray-800 tracking-tight">
                                            {total}
                                        </span>
                                    </div>
                                );
                            })}
                            <div className="w-8 bg-gray-100 border-r border-gray-300"></div>
                        </div>

                        {/* Add Row Button */}
                        <div className="flex border-b border-gray-300">
                            <div className="w-10 bg-gray-100 border-r border-gray-300"></div>
                            <button onClick={() => insertRow(tableData.length, 'after')} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-green-600 hover:bg-green-50 flex items-center gap-2 w-full transition-colors"><Plus size={14} /> Add Row</button>
                        </div>
                    </div>
                </div>

                {/* --- CONTEXT MENU --- */}
                {contextMenu && (
                    <div 
                        className="fixed bg-white shadow-2xl rounded-lg border border-gray-100 py-2 z-[100] w-64 text-sm animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1 flex justify-between items-center">
                            {contextMenu.type === 'row' ? `Row ${contextMenu.index + 1}` : `Column ${getColLetter(contextMenu.index)}`}
                            <button onClick={() => setContextMenu(null)} className="hover:bg-red-50 hover:text-red-500 rounded p-0.5"><X size={12}/></button>
                        </div>
                        
                        <button onClick={() => contextMenu.type === 'row' ? insertRow(contextMenu.index, 'before') : insertCol(contextMenu.index, 'before')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                            <Plus size={14} className="text-blue-500"/> Insert Before
                        </button>
                        <button onClick={() => contextMenu.type === 'row' ? insertRow(contextMenu.index, 'after') : insertCol(contextMenu.index, 'after')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                            <Plus size={14} className="text-blue-500"/> Insert After
                        </button>
                        <button onClick={() => deleteStructure(contextMenu.type, contextMenu.id)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
                            <Trash2 size={14} /> Delete
                        </button>

                        {contextMenu.type === 'col' && (
                            <>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Alignment</div>
                                <div className="flex px-2 gap-1 mb-2">
                                    {['left', 'center', 'right'].map(align => (
                                        <button 
                                            key={align}
                                            onClick={() => updateColumnProperty(contextMenu.id, 'align', align)}
                                            className={`flex-1 p-1 flex justify-center rounded hover:bg-blue-50 ${columns[contextMenu.index].align === align ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
                                        >
                                            {align === 'left' ? <AlignLeft size={16}/> : align === 'center' ? <AlignCenter size={16}/> : <AlignRight size={16}/>}
                                        </button>
                                    ))}
                                </div>

                                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Format</div>
                                <div className="flex px-2 gap-1 mb-2">
                                    <button onClick={() => updateColumnProperty(contextMenu.id, 'format', 'text')} className={`flex-1 p-1 flex justify-center rounded hover:bg-blue-50 ${columns[contextMenu.index].format === 'text' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`} title="Text"><Type size={16}/></button>
                                    <button onClick={() => updateColumnProperty(contextMenu.id, 'format', 'number')} className={`flex-1 p-1 flex justify-center rounded hover:bg-blue-50 ${columns[contextMenu.index].format === 'number' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`} title="Number"><Hash size={16}/></button>
                                    <button onClick={() => updateColumnProperty(contextMenu.id, 'format', 'currency')} className={`flex-1 p-1 flex justify-center rounded hover:bg-blue-50 ${columns[contextMenu.index].format === 'currency' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`} title="Currency"><DollarSign size={16}/></button>
                                </div>

                                {/* AUTO FORMULA INPUT */}
                                <div className="px-3 py-2 bg-purple-50 border-t border-purple-100">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Wand2 size={12} className="text-purple-600"/>
                                        <span className="text-[10px] font-bold text-purple-700 uppercase">Auto Formula</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        className="w-full text-xs border border-purple-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-purple-400 font-mono"
                                        placeholder="e.g. =A*B"
                                        value={columns[contextMenu.index].autoFormula || ''}
                                        onChange={(e) => updateColumnProperty(contextMenu.id, 'autoFormula', e.target.value)}
                                        onClick={(e) => e.stopPropagation()} // Prevent closing
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1">Use column letters (e.g. A, B)</p>
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default RequirementSheetModal;