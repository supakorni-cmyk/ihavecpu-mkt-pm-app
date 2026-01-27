// src/components/modals/RequirementModal.jsx
import React, { useState, useEffect } from 'react';
import { Table, Download, X, Trash2, Plus, Save, RotateCcw } from 'lucide-react';

const RequirementSheetModal = ({ task, requirement, onClose, onUpdateTask }) => {
    // --- Local State for Editing (Prevents lag) ---
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initialize state from props
    useEffect(() => {
        setTableData(requirement.tableData || []);
        setColumns(requirement.columns || [
            { id: 'col1', name: 'Item / Name' }, 
            { id: 'col2', name: 'Description' }, 
            { id: 'col3', name: 'Status' }, 
            { id: 'notes', name: 'Notes' }
        ]);
        setHasUnsavedChanges(false);
    }, [requirement]);

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
        // Create an empty row object based on current columns
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
        const headers = columns.map(c => c.name);
        const rows = tableData.map(row => columns.map(col => `"${(row[col.id] || '').replace(/"/g, '""')}"`));
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
                            <div className="w-12 p-3 text-center border-r border-gray-300 bg-gray-100 sticky left-0 z-20">#</div>
                            {columns.map(col => (
                                <div key={col.id} className="w-64 min-w-[200px] p-2 border-r border-gray-300 relative group bg-gray-100">
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
                            ))}
                            <div className="w-12 p-2 flex items-center justify-center bg-gray-100 hover:bg-gray-200 cursor-pointer border-r border-gray-300 transition-colors" onClick={addColumn} title="Add Column">
                                <Plus size={16} className="text-green-600" />
                            </div>
                            <div className="w-12 p-3 bg-gray-100"></div>
                        </div>

                        {/* Table Data Rows (Editable) */}
                        {tableData.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 flex flex-col items-center justify-center">
                                <Table size={48} className="mb-4 opacity-20" />
                                <p>No rows yet.</p>
                                <button onClick={addRow} className="mt-4 text-green-600 font-bold hover:underline">Click to add your first row</button>
                            </div>
                        ) : (
                            tableData.map((row, idx) => (
                                <div key={row.id} className="flex border-b border-gray-200 hover:bg-blue-50/20 transition-colors group">
                                    <div className="w-12 p-3 text-center border-r border-gray-200 bg-gray-50 text-gray-400 font-mono text-xs flex items-center justify-center sticky left-0 z-10">{idx + 1}</div>
                                    
                                    {columns.map(col => (
                                        <div key={col.id} className="w-64 min-w-[200px] border-r border-gray-200 relative">
                                            <textarea 
                                                value={row[col.id] || ''} 
                                                onChange={(e) => handleCellChange(row.id, col.id, e.target.value)}
                                                className="w-full h-full p-3 bg-transparent border-none outline-none resize-none text-sm text-gray-800 focus:bg-blue-50 focus:ring-inset focus:ring-2 focus:ring-blue-500 transition-all overflow-hidden"
                                                rows={1}
                                                style={{ minHeight: '44px' }}
                                                onInput={(e) => {
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }}
                                            />
                                        </div>
                                    ))}
                                    
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

                        {/* Add Row Button (Bottom) */}
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