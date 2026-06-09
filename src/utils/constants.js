// src/utils/constants.js

export const TAG_COLORS = { 
  'OVERVIEW + PLANING': 'bg-pink-100 text-pink-600', 
  'PROJECT': 'bg-purple-100 text-purple-600', 
  'REVIEW / IT': 'bg-blue-100 text-blue-600', 
  'REVIEW / OTHER': 'bg-blue-200 text-blue-700', 
  'OFFLINE EVENT': 'bg-yellow-100 text-yellow-600', 
  'GUEST SPEAKER': 'bg-green-100 text-green-600',
  'MEETING': 'bg-orange-100 text-orange-600',
  'EXPENSE': 'bg-gray-100 text-gray-600', 
  'WEBSITE': 'bg-teal-100 text-teal-600',
  'INFLUENCER': 'bg-indigo-100 text-indigo-600',
  'ONLINE ADS': 'bg-red-100 text-red-600',
  'OFFLINE ADS': 'bg-red-200 text-red-700',
};

export const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'text-gray-600 bg-gray-100' },
  { id: 'on-process', title: 'On Process', color: 'text-amber-500 bg-amber-50' },
  { id: 'done', title: 'Done', color: 'text-green-600 bg-green-100' },
  // --- NEW COLUMN ---
  { id: 'canceled', title: 'Canceled', color: 'text-gray-400 bg-gray-200' } 
];

// This is the array causing your error. Ensure it is exported like this:
export const BUDGET_CATEGORIES = [
  'Video Content', 
  'Website Banner', 
  'Boost/Ads', 
  'Etc.', 
  'Event Support', 
  'FB Photo Album', 
  'Guest Speaker', 
  'Project / MDF', 
  'Sponsor',
  'Branch Opening'
];

export const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'No Date';
};

export const getSafeRequirements = (task) => {
    if (!task || !task.requirements) return [];
    if (Array.isArray(task.requirements)) return task.requirements;
    if (typeof task.requirements === 'string') {
        return task.requirements.split('\n').filter(r => r.trim()).map((text, idx) => ({
            id: `legacy-${idx}`, text: text.replace(/^- /, ''), isDone: false, tableData: []
        }));
    }
    return [];
};