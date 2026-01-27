// src/utils/constants.js

export const TAG_COLORS = { 
  'Planning': 'bg-pink-100 text-pink-600', 
  'Project': 'bg-purple-100 text-purple-600', 
  'Product Review': 'bg-blue-100 text-blue-600', 
  'Event': 'bg-yellow-100 text-yellow-600', 
  'Guest Speaker': 'bg-green-100 text-green-600',
  'Meeting': 'bg-orange-100 text-orange-600' 
};

export const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'review', title: 'Review', color: 'bg-purple-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' }
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