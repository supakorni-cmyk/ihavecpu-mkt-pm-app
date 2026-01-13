// src/components/views/HomeView.jsx
import React from 'react';
import { Home, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// --- USER NAME MAPPING ---
const USER_MAP = {
    'supakorn.i@ihavecpu.com': 'Boom',
    'sophisa.p@ihavecpu.com': 'E.Yuiizz',
    'jittikorn.m@ihavecpu.com': 'Uncle Tony',
    'suchada.t@ihavecpu.com': 'Bum'
};

const HomeView = ({ currentUser, tasks }) => {
    // Determine Display Name
    const email = currentUser?.email;
    const displayName = USER_MAP[email] || email || 'Team Member';

    // Basic Stats Calculation
    // Ensure tasks is an array to prevent crashes if data hasn't loaded
    const taskList = Array.isArray(tasks) ? tasks : [];
    const totalTasks = taskList.length;
    const completedTasks = taskList.filter(t => t.status === 'Done').length;
    const pendingTasks = totalTasks - completedTasks;

    return (
        <div className="p-8 h-full overflow-y-auto bg-gray-50 font-sans">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Welcome back, <span className="text-indigo-600">{displayName}</span>
                </h1>
                <p className="text-gray-500 mt-1">Here is what's happening with your projects today.</p>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Home size={28}/></div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Tasks</p>
                        <p className="text-3xl font-black text-gray-800">{totalTasks}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                    <div className="p-4 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={28}/></div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Completed</p>
                        <p className="text-3xl font-black text-gray-800">{completedTasks}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-xl"><Clock size={28}/></div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pending</p>
                        <p className="text-3xl font-black text-gray-800">{pendingTasks}</p>
                    </div>
                </div>
            </div>

            {/* Recent Tasks */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertCircle size={20} className="text-indigo-500"/> Recent Activity
                    </h2>
                </div>
                
                {taskList.length > 0 ? (
                    <div className="space-y-3">
                        {taskList.slice(0, 5).map(task => (
                            <div key={task.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-xl border border-gray-100 transition group">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-700 group-hover:text-indigo-600 transition">{task.title}</span>
                                    <span className="text-xs text-gray-400 mt-1">Updated: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Recently'}</span>
                                </div>
                                <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wide ${
                                    task.status === 'Done' ? 'bg-green-100 text-green-700' : 
                                    task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {task.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                        <p className="text-gray-400 font-medium">No tasks found. Get started by creating one!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeView;