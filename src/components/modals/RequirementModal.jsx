// src/components/modals/RequirementModal.jsx
import React, { useState, useEffect } from 'react';
import { Table, Download, X, Trash2, Plus } from 'lucide-react';

const RequirementSheetModal = ({ task, requirement, onClose, onUpdateTask }) => {
    const [newRow, setNewRow] = useState({ col1: '', col2: '', col3: '', notes: '' });
    // Default columns if none exist
    const [columns, setColumns] = useState(requirement.columns || [
        { id: 'col1', name: 'Item / Name' }, 
        { id: 'col2', name: 'Description' }, 
        { id: 'col3', name: 'Status' }, 
        { id: 'notes', name: 'Notes' }
    ]);

    useEffect(() => {
        if (requirement.columns) setColumns(requirement.columns);
    }, [requirement.columns]);

    const updateRequirement = (updates) => {
        const updatedReqs = task.requirements.map(r => {
            if (r.id === requirement.id) return { ...r, ...updates };
            return r;
        });
        onUpdateTask({ requirements: updatedReqs });
    };

    const handleColumnNameChange = (colId, newName) => {
        const updatedCols = columns.map(c => c.id === colId ? { ...c, name: newName } : c);
        setColumns(updatedCols);
    };

    const saveColumns = () => updateRequirement({ columns });
    
    const addColumn = () => { 
        const newCols = [...columns, { id: `col-${Date.now()}`, name: 'New Column' }]; 
        setColumns(newCols); 
        updateRequirement({ columns: newCols }); 
    };

    const deleteColumn = (colId) => { 
        if (confirm('Delete column?')) { 
            const newCols = columns.filter(c => c.id !== colId); 
            setColumns(newCols); 
            updateRequirement({ columns: newCols }); 
        } 
    };

    const handleAddRow = () => { 
        if (Object.keys(newRow).length === 0) return; 
        const updatedTableData = [...(requirement.tableData || []), { id: Date.now(), ...newRow }]; 
        updateRequirement({ tableData: updatedTableData }); 
        setNewRow({}); 
    };

    const handleDeleteRow = (rowId) => { 
        const updatedTableData = (requirement.tableData || []).filter(row => row.id !== rowId); 
        updateRequirement({ tableData: updatedTableData }); 
    };

    const handleRowChange = (colId, value) => { 
        setNewRow(prev => ({ ...prev, [colId]: value })); 
    };

    const exportToCSV = () => {
        if (!requirement.tableData || requirement.tableData.length === 0) return alert("No data to export.");
        const headers = columns.map(c => c.name);
        const rows = requirement.tableData.map(row => columns.map(col => `"${(row[col.id] || '').replace(/"/g, '""')}"`));
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
                <div className="bg-green-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded"><Table size={24} /></div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{requirement.text}</h3>
                            <p className="text-xs opacity-80 font-mono tracking-wide uppercase">Table for Task: {task.title}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={exportToCSV} className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50 transition flex items-center gap-2">
                            <Download size={16} /> Export CSV
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    <div className="bg-white border border-gray-300 shadow-sm min-w-max">
                        {/* Table Header Row */}
                        <div className="flex border-b border-gray-300 bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                            <div className="w-12 p-3 text-center border-r border-gray-300 bg-gray-100 sticky left-0 z-20">#</div>
                            {columns.map(col => (
                                <div key={col.id} className="w-48 min-w-[180px] p-2 border-r border-gray-300 relative group bg-gray-100">
                                    <input 
                                        type="text" 
                                        value={col.name} 
                                        onChange={(e) => handleColumnNameChange(col.id, e.target.value)} 
                                        onBlur={saveColumns} 
                                        className="bg-transparent w-full text-center focus:bg-white focus:ring-2 focus:ring-green-500 rounded px-1 py-0.5 border border-transparent hover:border-gray-300" 
                                    />
                                    <button onClick={() => deleteColumn(col.id)} className="absolute right-1 top-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-gray-200">
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                            <div className="w-12 p-2 flex items-center justify-center bg-gray-100 hover:bg-gray-200 cursor-pointer border-r border-gray-300" onClick={addColumn} title="Add Column">
                                <Plus size={16} className="text-green-600" />
                            </div>
                            <div className="w-12 p-3 bg-gray-100"></div>
                        </div>

                        {/* Table Data Rows */}
                        {(requirement.tableData || []).map((row, idx) => (
                            <div key={row.id} className="flex border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                                <div className="w-12 p-3 text-center border-r border-gray-200 bg-gray-50 text-gray-400 font-mono text-xs flex items-center justify-center sticky left-0 z-10">{idx + 1}</div>
                                {columns.map(col => (
                                    <div key={col.id} className="w-48 min-w-[180px] p-3 border-r border-gray-200 text-sm text-gray-800">
                                        {row[col.id]}
                                    </div>
                                ))}
                                <div className="w-12 flex-1 border-r border-gray-200"></div>
                                <div className="w-12 p-3 flex items-center justify-center">
                                    <button onClick={() => handleDeleteRow(row.id)} className="text-gray-300 hover:text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add New Row (Footer) */}
                        <div className="flex border-b border-gray-200 bg-yellow-50/50 sticky bottom-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                            <div className="w-12 p-3 text-center border-r border-gray-200 text-green-600 font-bold bg-yellow-50 sticky left-0">+</div>
                            {columns.map(col => (
                                <div key={col.id} className="w-48 min-w-[180px] border-r border-gray-200">
                                    <input 
                                        type="text" 
                                        placeholder={col.name + "..."} 
                                        className="w-full h-full p-3 bg-transparent outline-none text-sm focus:bg-white focus:ring-inset focus:ring-2 focus:ring-green-500" 
                                        value={newRow[col.id] || ''} 
                                        onChange={e => handleRowChange(col.id, e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleAddRow()} 
                                    />
                                </div>
                            ))}
                            <div className="w-12 flex-1 border-r border-gray-200 bg-yellow-50"></div>
                            <div className="w-12 p-2 flex items-center justify-center bg-yellow-50">
                                <button onClick={handleAddRow} className="bg-green-600 text-white p-1 rounded hover:bg-green-700 shadow-sm">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequirementSheetModal;