// src/components/modals/RequirementModal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, FileSpreadsheet, X, Plus, Save, ZoomIn, ZoomOut, MoreHorizontal, MousePointerClick } from 'lucide-react';

const RequirementSheetModal = ({ task, requirement, onClose, onUpdateTask }) => {
    // --- State ---
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [colWidths, setColWidths] = useState({});
    const [scale, setScale] = useState(1);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Editor State
    const [editingCell, setEditingCell] = useState({ rowId: null, colId: null });
    const [contextMenu, setContextMenu] = useState(null); // { type: 'row'|'col', id: string, x: number, y: number }
    const editorRef = useRef(null); // Ref for the active input to insert cell refs

    // Initialize
    useEffect(() => {
        setTableData(requirement.tableData || []);
        setColumns(requirement.columns || [
            { id: 'col1', name: 'Item / Name' }, 
            { id: 'col2', name: 'Price' }, 
            { id: 'col3', name: 'Quantity' }, 
            { id: 'col4', name: 'Total (=B1*C1)' }
        ]);
        setColWidths(requirement.colWidths || {});
        setHasUnsavedChanges(false);
    }, [requirement]);

    // --- 🧮 FORMULA & CELL ENGINE ---
    const getColLetter = (index) => {
        let letter = '';
        while (index >= 0) {
            letter = String.fromCharCode((index % 26) + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    };

    const evaluateFormula = useCallback((expression, currentRowIdx) => {
        if (!expression || typeof expression !== 'string' || !expression.startsWith('=')) return expression;

        try {
            let formula = expression.substring(1).toUpperCase();
            // Regex to match cell references (A1, B2, AA10)
            formula = formula.replace(/([A-Z]+)(\d+)/g, (match, colLetter, rowNum) => {
                // Convert Letter to Index
                let colIndex = 0;
                for (let i = 0; i < colLetter.length; i++) {
                    colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
                }
                colIndex -= 1; // 0-based

                const targetCol = columns[colIndex];
                const rowIndex = parseInt(rowNum) - 1;
                const targetRow = tableData[rowIndex];

                if (!targetCol || !targetRow) return 0;

                let val = targetRow[targetCol.id];
                if (!val) return 0;
                val = val.toString().replace(/,/g, '');
                return isNaN(Number(val)) ? 0 : Number(val);
            });

            // Safe Eval
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + formula)();
            return Number.isInteger(result) ? result : parseFloat(result.toFixed(2));
        } catch (error) {
            return "#ERROR";
        }
    }, [tableData, columns]);

    // --- 🖱️ INTERACTION HANDLERS ---

    const handleCellClick = (rowId, colId, rowIndex, colIndex) => {
        // FORMULA INJECTION MODE
        // If we are currently editing a cell AND it starts with '=', insert the clicked cell reference
        if (editingCell.rowId && editingCell.colId && (editingCell.rowId !== rowId || editingCell.colId !== colId)) {
            const activeRow = tableData.find(r => r.id === editingCell.rowId);
            const activeVal = activeRow[editingCell.colId] || '';
            
            if (activeVal.toString().startsWith('=')) {
                // We are in formula mode!
                const cellRef = `${getColLetter(colIndex)}${rowIndex + 1}`;
                const input = editorRef.current;
                
                if (input) {
                    const startPos = input.selectionStart;
                    const endPos = input.selectionEnd;
                    const newVal = activeVal.substring(0, startPos) + cellRef + activeVal.substring(endPos);
                    
                    handleCellChange(editingCell.rowId, editingCell.colId, newVal);
                    
                    // Restore focus and cursor
                    setTimeout(() => {
                        input.focus();
                        input.setSelectionRange(startPos + cellRef.length, startPos + cellRef.length);
                    }, 0);
                }
                return; // Stop here, don't change focus to the clicked cell
            }
        }

        // Normal Selection
        setEditingCell({ rowId, colId });
    };

    const handleCellChange = (rowId, colId, value) => {
        setTableData(prev => prev.map(row => 
            row.id === rowId ? { ...row, [colId]: value } : row
        ));
        setHasUnsavedChanges(true);
    };

    // --- 🛠️ STRUCTURE ACTIONS (Insert/Delete) ---

    const insertRow = (index, position) => { // position: 'before' | 'after'
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
        const newCol = { id: `col-${Date.now()}`, name: 'New Column' };
        const newCols = [...columns];
        const insertIdx = position === 'before' ? index : index + 1;
        newCols.splice(insertIdx, 0, newCol);
        
        setColumns(newCols);
        setHasUnsavedChanges(true);
        setContextMenu(null);
    };

    const deleteStructure = (type, id) => {
        if (type === 'row') {
            setTableData(tableData.filter(r => r.id !== id));
        } else {
            setColumns(columns.filter(c => c.id !== id));
        }
        setHasUnsavedChanges(true);
        setContextMenu(null);
    };

    // --- 💾 DATA ACTIONS ---

    const handleSave = () => {
        const updatedReqs = task.requirements.map(r => {
            if (r.id === requirement.id) return { ...r, tableData, columns, colWidths };
            return r;
        });
        onUpdateTask({ requirements: updatedReqs });
        setHasUnsavedChanges(false);
    };

    const exportToGoogleSheets = () => {
        // 1. Build TSV string (Tab Separated Values work best for copy-paste to Sheets)
        const headers = columns.map(c => c.name).join('\t');
        const rows = tableData.map((row, rIdx) => 
            columns.map(col => {
                const val = row[col.id];
                // Export calculated value
                const calculated = evaluateFormula(val, rIdx); 
                return calculated === undefined || calculated === null ? '' : calculated;
            }).join('\t')
        ).join('\n');
        
        const clipboardText = `${headers}\n${rows}`;

        // 2. Copy to Clipboard
        navigator.clipboard.writeText(clipboardText).then(() => {
            // 3. Open Sheets
            window.open('https://sheets.new', '_blank');
            alert("✅ Data copied! Press Ctrl+V in the new Google Sheet to paste.");
        }).catch(err => alert("Failed to copy data: " + err));
    };

    // --- 🖱️ CONTEXT MENU UI ---
    const handleContextMenu = (e, type, id, index) => {
        e.preventDefault();
        setContextMenu({ type, id, index, x: e.clientX, y: e.clientY });
    };

    // Close menus on click away
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
                        <button 
                            onClick={handleSave} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${hasUnsavedChanges ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                            <Save size={16} /> Save
                        </button>
                        <button onClick={exportToGoogleSheets} className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50 transition flex items-center gap-2 shadow-sm">
                            <FileSpreadsheet size={16} /> Export to Sheets
                        </button>
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
                        <div className="flex border-b border-gray-300 bg-gray-50 sticky top-0 z-20">
                            {/* Corner */}
                            <div className="w-10 p-2 border-r border-gray-300 bg-gray-100 flex items-center justify-center text-gray-400 font-mono text-xs">
                                #
                            </div>
                            
                            {/* Columns */}
                            {columns.map((col, idx) => (
                                <div 
                                    key={col.id} 
                                    className="border-r border-gray-300 relative group flex flex-col"
                                    style={{ width: colWidths[col.id] || 200, minWidth: 60 }}
                                    onContextMenu={(e) => handleContextMenu(e, 'col', col.id, idx)}
                                >
                                    {/* Excel Letter Header */}
                                    <div className="bg-gray-200 text-center text-[10px] text-gray-600 font-bold py-1 border-b border-gray-300">
                                        {getColLetter(idx)}
                                    </div>
                                    {/* Editable Name */}
                                    <input 
                                        className="w-full bg-transparent text-center text-xs font-bold p-2 outline-none focus:bg-blue-50"
                                        value={col.name}
                                        onChange={(e) => {
                                            const newCols = [...columns];
                                            newCols[idx].name = e.target.value;
                                            setColumns(newCols);
                                            setHasUnsavedChanges(true);
                                        }}
                                    />
                                    {/* Resize Handle (Simple implementation) */}
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
                                         onMouseDown={(e) => {
                                             const startX = e.pageX;
                                             const startWidth = colWidths[col.id] || 200;
                                             const onMove = (mv) => {
                                                 setColWidths(prev => ({ ...prev, [col.id]: Math.max(60, startWidth + (mv.pageX - startX)) }));
                                                 setHasUnsavedChanges(true);
                                             };
                                             const onUp = () => {
                                                 window.removeEventListener('mousemove', onMove);
                                                 window.removeEventListener('mouseup', onUp);
                                             };
                                             window.addEventListener('mousemove', onMove);
                                             window.addEventListener('mouseup', onUp);
                                         }}
                                    />
                                </div>
                            ))}
                            {/* Add Col Btn */}
                            <button 
                                onClick={() => insertCol(columns.length, 'after')}
                                className="w-8 flex items-center justify-center hover:bg-gray-200 text-gray-400 border-r border-gray-300"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* --- DATA ROWS --- */}
                        {tableData.map((row, rIdx) => (
                            <div key={row.id} className="flex border-b border-gray-200 hover:bg-blue-50/10">
                                {/* Row Number & Context Trigger */}
                                <div 
                                    className="w-10 border-r border-gray-300 bg-gray-50 text-gray-500 font-mono text-xs flex items-center justify-center cursor-context-menu hover:bg-gray-200 hover:text-gray-800 transition-colors"
                                    onContextMenu={(e) => handleContextMenu(e, 'row', row.id, rIdx)}
                                >
                                    {rIdx + 1}
                                </div>

                                {columns.map((col, cIdx) => {
                                    const isEditing = editingCell.rowId === row.id && editingCell.colId === col.id;
                                    const rawValue = row[col.id];
                                    // If editing, show raw. If not, show evaluated formula OR raw value.
                                    const displayValue = isEditing ? (rawValue || '') : evaluateFormula(rawValue, rIdx);
                                    const isFormula = typeof rawValue === 'string' && rawValue.startsWith('=');

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
                                                    className="w-full h-full px-2 py-1.5 text-sm outline-none bg-white ring-2 ring-blue-500 z-10 absolute inset-0"
                                                    value={rawValue || ''}
                                                    onChange={(e) => handleCellChange(row.id, col.id, e.target.value)}
                                                    onBlur={() => setEditingCell({ rowId: null, colId: null })}
                                                />
                                            ) : (
                                                <div className={`w-full h-full px-2 py-1.5 text-sm truncate select-none cursor-cell ${isFormula ? 'text-green-700 font-medium bg-green-50/20' : 'text-gray-800'}`}>
                                                    {displayValue}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="w-8 bg-gray-50 border-r border-gray-200"></div>
                            </div>
                        ))}
                        
                        {/* Footer Add Row */}
                        <div className="flex border-b border-gray-300">
                            <div className="w-10 bg-gray-100 border-r border-gray-300"></div>
                            <button 
                                onClick={() => insertRow(tableData.length, 'after')}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-green-600 hover:bg-green-50 flex items-center gap-2 w-full"
                            >
                                <Plus size={14} /> Add Row Bottom
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- CONTEXT MENU --- */}
                {contextMenu && (
                    <div 
                        className="fixed bg-white shadow-2xl rounded-lg border border-gray-100 py-1 z-50 w-48 text-sm animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                            {contextMenu.type === 'row' ? `Row ${contextMenu.index + 1}` : `Column ${getColLetter(contextMenu.index)}`} Options
                        </div>
                        
                        <button onClick={() => contextMenu.type === 'row' ? insertRow(contextMenu.index, 'before') : insertCol(contextMenu.index, 'before')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                            <Plus size={14} className="text-blue-500"/> Insert {contextMenu.type === 'row' ? 'Row' : 'Column'} Before
                        </button>
                        <button onClick={() => contextMenu.type === 'row' ? insertRow(contextMenu.index, 'after') : insertCol(contextMenu.index, 'after')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                            <Plus size={14} className="text-blue-500"/> Insert {contextMenu.type === 'row' ? 'Row' : 'Column'} After
                        </button>
                        
                        <div className="h-px bg-gray-100 my-1"></div>
                        
                        <button onClick={() => deleteStructure(contextMenu.type, contextMenu.id)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
                            <Trash2 size={14} /> Delete {contextMenu.type === 'row' ? 'Row' : 'Column'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default RequirementSheetModal;