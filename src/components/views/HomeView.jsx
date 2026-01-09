// src/components/views/HomeView.jsx
import React from 'react';
import { 
  ListTodo, 
  CheckCircle2, 
  Activity, 
  PieChart 
} from 'lucide-react';
import { TAG_COLORS } from '../../utils/constants';

// --- CUSTOM NAME MAPPING ---
// Add your team members' emails and their desired display names here
const USER_NICKNAMES = {
    'admin@ihavecpu.com': 'Big Boss',
    'marketing@ihavecpu.com': 'Marketing Lead',
    'editor@ihavecpu.com': 'Video Editor',
    'sarah@example.com': 'Sarah J.',
    // 'email@address.com': 'Custom Name',
};

const HomeView = ({ tasks = [], currentUser }) => {
    // --- Helper Logic ---
    const getTasksByStatus = (status) => {
        return tasks.filter(task => {
            if (status === 'todo') return (task.status === 'pending' || !task.status || task.status === 'todo');
            if (status === 'done') return (task.status === 'completed' || task.status === 'done');
            return task.status === status;
        });
    };

    const totalTasks = tasks.length;
    const completedTasks = getTasksByStatus('done').length;
    const inProgressTasks = getTasksByStatus('inprogress').length;
    const reviewTasks = getTasksByStatus('review').length;
    const todoTasks = getTasksByStatus('todo').length;

    const tagCounts = tasks.reduce((acc, task) => { 
        const tag = task.tag || 'Uncategorized'; 
        acc[tag] = (acc[tag] || 0) + 1; 
        return acc; 
    }, {});
    const maxTagCount = Math.max(...Object.values(tagCounts), 1);

    // --- GET DISPLAY NAME ---
    // If the email is in our list, use that name. Otherwise, split the email string.
    const userEmail = currentUser?.email;
    const displayName = USER_NICKNAMES[userEmail] || userEmail?.split('@')[0] || 'User';

    return (
        <div className="flex flex-col h-full w-full bg-gray-50">
            <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
                <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
                <div className="text-sm font-medium text-gray-500">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </header>

            <div className="p-6 md:p-10 overflow-y-auto flex-1">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-end">
                        <div>
                            {/* UPDATED GREETING LINE */}
                            <h2 className="text-3xl font-bold text-gray-800">
                                Welcome Back, <span className="text-blue-600">{displayName}</span>!
                            </h2>
                            <p className="text-gray-500 mt-1">Here is your project overview at a glance.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatsCard title="Total Tasks" value={totalTasks} sub="tasks" icon={ListTodo} color="blue" />
                        <StatsCard title="Completed" value={completedTasks} sub="finished" icon={CheckCircle2} color="green" />
                        <StatsCard title="In Progress" value={inProgressTasks} sub="active" icon={Activity} color="yellow" />
                        <StatsCard title="Review" value={reviewTasks} sub="pending" icon={PieChart} color="purple" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Task Status</h3>
                            <div className="flex items-end justify-between h-64 gap-4">
                                {[
                                    { label: 'To Do', count: todoTasks, color: 'bg-gray-200' }, 
                                    { label: 'In Progress', count: inProgressTasks, color: 'bg-blue-500' }, 
                                    { label: 'Review', count: reviewTasks, color: 'bg-purple-500' }, 
                                    { label: 'Done', count: completedTasks, color: 'bg-green-500' }
                                ].map((stat) => (
                                    <div key={stat.label} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                                        <div className="font-bold text-gray-800 mb-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">{stat.count}</div>
                                        <div className={`w-full rounded-t-xl transition-all duration-500 ${stat.color} hover:opacity-90`} style={{ height: `${totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0}%`, minHeight: '8px' }}></div>
                                        <div className="text-xs font-bold text-gray-400 uppercase text-center mt-2">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Workload</h3>
                            <div className="space-y-5">
                                {Object.keys(TAG_COLORS).map((tag) => { 
                                    const count = tasks.filter(t => t.tag === tag).length; 
                                    const colorClass = (TAG_COLORS[tag] || 'bg-gray-200').split(' ')[0];
                                    return (
                                        <div key={tag}>
                                            <div className="flex justify-between text-sm font-bold mb-2">
                                                <span className="text-gray-600">{tag}</span>
                                                <span className="text-gray-400">{count} Tasks</span>
                                            </div>
                                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${(count / maxTagCount) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    ) 
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatsCard = ({ title, value, sub, icon: Icon, color }) => {
    const colors = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
        green: { bg: 'bg-green-50', text: 'text-green-600' },
        yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    };
    const activeColor = colors[color] || colors.blue;
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition">
            <div className="flex justify-between items-start">
                <div className={`${activeColor.bg} ${activeColor.text} p-2 rounded-lg`}><Icon size={24} /></div>
                <span className="text-xs font-bold text-gray-400 uppercase">{title}</span>
            </div>
            <div>
                <span className="text-3xl font-bold text-gray-800">{value}</span>
                <span className="text-sm text-gray-400 ml-2">{sub}</span>
            </div>
        </div>
    );
};

export default HomeView;