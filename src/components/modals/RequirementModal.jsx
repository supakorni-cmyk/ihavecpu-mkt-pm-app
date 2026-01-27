// src/components/modals/RequirementModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Download, X, Trash2, Plus, Save } from 'lucide-react';

const RequirementSheetModal = ({ task, requirement, onClose, onUpdateTask }) => {
    // --- Local State ---
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Track which cell is being edited to show raw formula vs calculated result
    const [editingCell, setEditingCell] = useState({ rowId: null, colId: null });

    // Initialize
    useEffect(() => {
        setTableData(requirement.tableData || []);
        setColumns(requirement.columns || [
            { id: 'col1', name: 'Item / Name' }, 
            { id: 'col2', name: 'Price' }, 
            { id: 'col3', name: 'Quantity' }, 
            { id: 'col4', name: 'Total (=B1*C1)' }
        ]);
        setHasUnsavedChanges(false);
    }, [requirement]);

    // --- 🧮 FORMULA ENGINE ---
    
    // 1. Convert Column Index to Letter (0 -> A, 1 -> B, etc.)
    const getColLetter = (index) => String.fromCharCode(65 + index);

    // 2. Evaluator Function
    const evaluateFormula = useCallback((expression, currentRowId) => {
        // If it's not a formula or empty, return as is
        if (!expression || typeof expression !== 'string' || !expression.startsWith('=')) {
            return expression;
        }

        try {
            // Remove '=' and convert to uppercase for consistency
            let formula = expression.substring(1).toUpperCase();

            // Regex to find Cell References (e.g., A1, B2, Z99)
            // Matches: [Letter(s)] followed by [Number(s)]
            formula = formula.replace(/([A-Z]+)(\d+)/g, (match, colLetter, rowNum) => {
                
                // 1. Find Column ID from Letter (A -> 0 -> colId)
                // We assume single letters A-Z for simplicity (0-25 columns)
                const colIndex = colLetter.charCodeAt(0) - 65;
                const targetCol = columns[colIndex];
                
                // 2. Find Row Data from Number (1 -> index 0)
                const rowIndex = parseInt(rowNum) - 1;
                const targetRow = tableData[rowIndex];

                if (!targetCol || !targetRow) return 0; // Reference not found, treat as 0

                // 3. Get the value
                let val = targetRow[targetCol.id];

                // If the referenced cell is ALSO a formula, we need to evaluate it recursively?
                // For simplicity, we just check if it looks numeric. 
                // A robust system would build a dependency graph, but this is a light version.
                
                // If value is empty, 0
                if (!val) return 0;

                // Remove commas from numbers (e.g. 1,000 -> 1000)
                val = val.toString().replace(/,/g, '');

                return isNaN(Number(val)) ? 0 : Number(val);
            });

            // Safe Evaluation of the math string (e.g., "100 * 5")
            // We use Function constructor which is safer than direct eval() but still powerful
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + formula)();
            
            // Round to 2 decimals if it's a number
            return Number.isInteger(result) ? result : parseFloat(result.toFixed(2));

        } catch (error) {
            console.error("Formula Error:", error);
            return "#ERROR";
        }
    }, [tableData, columns]);


    // --- Actions ---

    const handleSave = () => {
        const updatedReqs = task.requirements.map(r => {
            if (r.id === requirement.id) {
                return { ...r, tableData, columns };
            }
            return r;
        });
        onUpdateTask({ requirements: updatedReqs });
        setHasUnsavedChanges(false);
    };

    const handleColumnNameChange = (colId, newName) => {
        setColumns(cols => cols.map(c => c.id === colId ? { ...c, name: newName } : c));
        setHasUnsavedChanges(true);
    };
    
    const addColumn = () => { 
        setColumns([...columns, { id: `col-${Date.now()}`, name: 'New Column' }]); 
        setHasUnsavedChanges(true);
    };

    const deleteColumn = (colId) => { 
        if (confirm('Delete column?')) { 
            setColumns(columns.filter(c => c.id !== colId)); 
            setHasUnsavedChanges(true);
        } 
    };

    const addRow = () => {
        const newRow = { id: Date.now() };
        columns.forEach(col => newRow[col.id] = '');
        setTableData([...tableData, newRow]);
        setHasUnsavedChanges(true);
    };

    const deleteRow = (rowId) => {
        setTableData(tableData.filter(row => row.id !== rowId));
        setHasUnsavedChanges(true);
    };

    const handleCellChange = (rowId, colId, value) => {
        setTableData(prevData => prevData.map(row => 
            row.id === rowId ? { ...row, [colId]: value } : row
        ));
        setHasUnsavedChanges(true);
    };

    const exportToCSV = () => {
        if (!tableData || tableData.length === 0) return alert("No data to export.");
        // We export the *Calculated* values, not the formulas
        const headers = columns.map(c => c.name);
        const rows = tableData.map((row, rIdx) => 
            columns.map(col => {
                const val = row[col.id];
                const calculated = evaluateFormula(val, rIdx);
                return `"${(calculated || '').toString().replace(/"/g, '""')}"`;
            })
        );
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a"); 
        link.setAttribute("href", encodedUri); 
        link.setAttribute("download", `${requirement.text}_table.csv`);
        document.body.appendChild(link); 
        link.click(); 
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in zoom-in duration-200" onClick={onClose}>
            <div className="bg-white w-full max-w-7xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="bg-green-600 px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-md z-20">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded"><Table size={24} /></div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{requirement.text}</h3>
                            <p className="text-xs opacity-80 font-mono tracking-wide uppercase">Table for Task: {task.title}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-center">
                        {hasUnsavedChanges && (
                            <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded font-bold animate-pulse">
                                Unsaved Changes
                            </span>
                        )}
                        <button 
                            onClick={handleSave} 
                            className={`
                                flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-all
                                ${hasUnsavedChanges 
                                    ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300 scale-105 ring-2 ring-yellow-200' 
                                    : 'bg-green-700 text-white hover:bg-green-800 opacity-90'}
                            `}
                        >
                            <Save size={16} /> Save Data
                        </button>
                        <div className="h-6 w-px bg-white/30 mx-1"></div>
                        <button onClick={exportToCSV} className="bg-white/10 text-white px-3 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition flex items-center gap-2">
                            <Download size={14} /> CSV
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white transition">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    <div className="bg-white border border-gray-300 shadow-sm min-w-max rounded-lg overflow-hidden">
                        
                        {/* Table Header Row */}
                        <div className="flex border-b border-gray-300 bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                            {/* Row Number Header */}
                            <div className="w-12 p-2 text-center border-r border-gray-300 bg-gray-100 sticky left-0 z-20 flex items-center justify-center">
                                #
                            </div>
                            
                            {columns.map((col, index) => (
                                <div key={col.id} className="w-64 min-w-[200px] border-r border-gray-300 relative group bg-gray-100 flex flex-col">
                                    {/* A, B, C Label */}
                                    <div className="bg-gray-200 text-center text-[10px] text-gray-500 font-mono py-0.5 border-b border-gray-300">
                                        {getColLetter(index)}
                                    </div>
                                    
                                    {/* Editable Header Name */}
                                    <div className="relative p-2">
                                        <input 
                                            type="text" 
                                            value={col.name} 
                                            onChange={(e) => handleColumnNameChange(col.id, e.target.value)} 
                                            className="bg-transparent w-full text-center focus:bg-white focus:ring-2 focus:ring-green-500 rounded px-1 py-1 border border-transparent hover:border-gray-300 transition-colors" 
                                        />
                                        <button onClick={() => deleteColumn(col.id)} className="absolute right-1 top-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-gray-200">
                                            <X size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            <div className="w-12 p-2 flex items-center justify-center bg-gray-100 hover:bg-gray-200 cursor-pointer border-r border-gray-300 transition-colors" onClick={addColumn} title="Add Column">
                                <Plus size={16} className="text-green-600" />
                            </div>
                            <div className="w-12 p-3 bg-gray-100"></div>
                        </div>

                        {/* Table Data Rows */}
                        {tableData.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 flex flex-col items-center justify-center">
                                <Table size={48} className="mb-4 opacity-20" />
                                <p>No rows yet.</p>
                                <button onClick={addRow} className="mt-4 text-green-600 font-bold hover:underline">Click to add your first row</button>
                            </div>
                        ) : (
                            tableData.map((row, rIdx) => (
                                <div key={row.id} className="flex border-b border-gray-200 hover:bg-blue-50/20 transition-colors group">
                                    {/* Row Index (1, 2, 3...) */}
                                    <div className="w-12 p-3 text-center border-r border-gray-200 bg-gray-50 text-gray-400 font-mono text-xs flex items-center justify-center sticky left-0 z-10">
                                        {rIdx + 1}
                                    </div>
                                    
                                    {columns.map(col => {
                                        const isEditing = editingCell.rowId === row.id && editingCell.colId === col.id;
                                        const rawValue = row[col.id];
                                        const displayValue = isEditing ? rawValue : evaluateFormula(rawValue, rIdx);
                                        const isFormula = typeof rawValue === 'string' && rawValue.startsWith('=');

                                        return (
                                            <div key={col.id} className="w-64 min-w-[200px] border-r border-gray-200 relative">
                                                <textarea 
                                                    value={displayValue || ''}
                                                    onChange={(e) => handleCellChange(row.id, col.id, e.target.value)}
                                                    onFocus={() => setEditingCell({ rowId: row.id, colId: col.id })}
                                                    onBlur={() => setEditingCell({ rowId: null, colId: null })}
                                                    className={`
                                                        w-full h-full p-3 border-none outline-none resize-none text-sm transition-all overflow-hidden
                                                        ${isFormula && !isEditing ? 'text-green-700 font-medium bg-green-50/30' : 'text-gray-800 bg-transparent'}
                                                        focus:bg-white focus:ring-inset focus:ring-2 focus:ring-blue-500
                                                    `}
                                                    rows={1}
                                                    style={{ minHeight: '44px' }}
                                                />
                                            </div>
                                        );
                                    })}
                                    
                                    <div className="w-12 flex-1 border-r border-gray-200"></div>
                                    
                                    <div className="w-12 p-2 flex items-center justify-center">
                                        <button 
                                            onClick={() => deleteRow(row.id)} 
                                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition opacity-0 group-hover:opacity-100"
                                            title="Delete Row"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Add Row Button */}
                        <div 
                            onClick={addRow}
                            className="flex items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-gray-500 hover:text-green-600 border-t border-gray-200 transition-colors gap-2 text-sm font-bold uppercase tracking-wide"
                        >
                            <Plus size={16} /> Add New Row
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequirementSheetModal;