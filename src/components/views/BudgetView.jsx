// src/components/views/BudgetView.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Plus, 
  Wallet, 
  Activity, 
  Trash2, 
  Edit2, 
  X,
  FileText,
  Upload,
  Paperclip,
  Eye,
  PieChart as PieChartIcon,
  Filter,
  Calendar,
  Tag,
  Sparkles,
  Send,
  MessageSquare,
  Copy,
  Users,      
  Target,     
  Zap,        
  Rocket,
  DollarSign,
  Smile,
  ArrowUp,       // 🟢 ADD THIS
  ArrowDown,     // 🟢 ADD THIS
  ArrowUpDown
} from 'lucide-react';

import { BarChart, Bar, Legend, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Pie, PieChart, Line, LineChart, Label } from 'recharts';

import { BUDGET_CATEGORIES } from '../../utils/constants';
import { analyzeFinancials } from '../../utils/aiService';
import aiAvatar from '../../assets/bot/avatar.png';

const TOTAL_BUDGET_CONST = 33000000;
const BUDGET_STATUSES = ['Pending', 'Follow-up', 'Complete'];

// 🟢 CUSTOM AVATAR DICTIONARY
const CUSTOM_AVATARS = {
    "9ARM": "https://yt3.googleusercontent.com/akMx9Hn1be32NzcpB9VovBgQTmgew0_yBhMGmk_Uj2gIdlEaM6158lA5r2NShIUTp-UT0URIYg=s900-c-k-c0x00ffffff-no-rj",
    "Bayriffer": "https://i1.sndcdn.com/artworks-000064671688-hq0zfp-t240x240.jpg",
    "Extreme IT": "https://9conversations.co/wp-content/uploads/2022/04/nop-thumb-2-1024x684.jpg",
    "ลุงเอ": "https://yt3.googleusercontent.com/7qaDhYDzjPqCmfqK_6GAAMpBdlWJCExGvgnOB1jyr4ZFYNL_dC-aCtRpGMkP7pYS9aj43EFl=s900-c-k-c0x00ffffff-no-rj",
    "มาลีสวยมาก": "https://yt3.googleusercontent.com/KjCKaYVLA1uvmObZsz1Z4iRkYX3PYrNWmk-5_Uy2Ycar-AdDe_f22ZYrFZ600LVDD3JPplw3mZQ=s900-c-k-c0x00ffffff-no-rj",
    "Edwin": "https://yt3.googleusercontent.com/y9WH6lUIDtybsJ2oc9IqdDF0JthGshw9AuujwZ2mYkXXQLAuDYhRytDA1ELakIoQ1ZzmlZaKvr0=s900-c-k-c0x00ffffff-no-rj",
    "วรโชติ": "https://yt3.googleusercontent.com/fmGgxOV5OP6O3hjjscbYiJdcgEMLS-XhF9hCQ09ymLLY5wnoIApVStDVSk3jcQibLFk8R7ibb4g=s900-c-k-c0x00ffffff-no-rj",
    "Jellyjane": "https://i.ytimg.com/vi/ZHBrGZqWMYI/oar2.jpg?sqp=-oaymwEYCJUDENAFSFqQAgHyq4qpAwcIARUAAIhC&rs=AOn4CLBPRhKclhGoYADMOVCxAjiGmdOJig&usqp=CCk",
};

// 🟢 NEW: INFLUENCER MONTHLY COST DICTIONARY
// The code uses these numbers to calculate total spend and CPV automatically!
const INFLUENCER_MONTHLY_COSTS = {
    "9ARM": 100000,      // e.g. 50k THB per month
    "Bayriffer": 95000, 
    "Extreme IT": 250000,
    "ลุงเอ": 20000,
    "มาลีสวยมาก": 150000,
    "Edwin": 40000,
    "วรโชติ": 12000,
    "Jellyjane": 30000,
    "Default": 0    // Fallback if an influencer isn't listed above
};

// 🟢 AGGRESSIVE PLATFORM COLOR MATCHER (Immune to spacing and hidden characters)
const getPlatformColor = (rawPlatform) => {
    if (!rawPlatform) return "#8b5cf6"; // Default purple
    
    // Force to string and lowercase so we can search inside it safely
    const p = String(rawPlatform).toLowerCase();
    
    if (p.includes("youtube") || p.includes("yt")) return "#f44336";   // YouTube Red
    if (p.includes("tiktok") || p.includes("tt")) return "#ed4b82";    // TikTok Black
    if (p.includes("facebook") || p.includes("fb")) return "#2979ff";  // Facebook Blue
    if (p.includes("instagram") || p.includes("ig")) return "#ff9100"; // Instagram Pink
    if (p.includes("twitch") || p.includes("x")) return "#d500f9";    // Twitter/X Blue
    
    return "#8b5cf6"; // Default purple for anything else
};

const AI_AVATAR = aiAvatar;

// --- HELPER: NUMBER FORMATTING ---
const formatAmount = (num) => {
    return new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(num || 0);
};

const formatCompactNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 2
    }).format(num);
};

const BudgetView = ({ transactions, onAdd, onDelete, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    
    // --- AI STATE ---
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [lastQuestion, setLastQuestion] = useState(''); 
    const [aiResponse, setAiResponse] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const aiInputRef = useRef(null);

    // --- ADD/EDIT/PREVIEW STATE ---
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        type: 'income', date: new Date().toISOString().split('T')[0],
        brand: '', category: BUDGET_CATEGORIES[0], description: '', amount: '',
        company: '', emailSubject: '', quotation: '', qtFile: null,
        invoice: '', invoiceFile: null, paymentDate: '', status: 'Pending', slip: '', slipFile: null, remark: ''
    });
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editFormData, setEditFormData] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    // 🟢 NEW: Track which row is clicked to reveal actions
    const [selectedRowId, setSelectedRowId] = useState(null);

    // --- FILTER STATE ---
    const [overviewMonthFilter, setOverviewMonthFilter] = useState('ALL'); // 🟢 NEW OVERVIEW FILTER
    const [overviewCategoryFilter, setOverviewCategoryFilter] = useState('ALL'); // 🟢 NEW CATEGORY FILTER
    const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('All');
    const [incomeMonthFilter, setIncomeMonthFilter] = useState('All');
    const [incomeBrandFilter, setIncomeBrandFilter] = useState('All');

    // 🟢 NEW: Sorting State (Defaults to newest dates first)
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // --- GOOGLE SHEETS ROI STATE ---
    const [roiData, setRoiData] = useState([]);
    const [isRoiLoading, setIsRoiLoading] = useState(false);
    const [roiError, setRoiError] = useState('');
    
    // ROI FILTERS
    const [roiInfluencerFilter, setRoiInfluencerFilter] = useState('ALL');
    const [roiMonthFilter, setRoiMonthFilter] = useState('ALL');

    useEffect(() => {
        if (activeTab === 'influencer_roi' && roiData.length === 0) {
            fetchSheetData();
        }
    }, [activeTab]);

    const fetchSheetData = async () => {
        setIsRoiLoading(true);
        setRoiError('');
        try {
            const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Missing API Key in .env file.");

            const SPREADSHEET_ID = "1K7HmBde2m-1XSrh6rXpOtdTXCmyKdbl4D1E4LhOklpk"; 
            
            const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title&key=${apiKey}`);
            if (!metaResponse.ok) {
                const errData = await metaResponse.json();
                throw new Error(`Google Meta Error: ${errData.error?.message || "Failed to read sheets"}`);
            }
            const metaData = await metaResponse.json();
            const sheetNames = metaData.sheets.map(s => s.properties.title);

            const rangesQuery = sheetNames.map(name => `ranges=${encodeURIComponent(name)}!A:Z`).join('&');

            const dataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${rangesQuery}&key=${apiKey}`);
            if (!dataResponse.ok) {
                const errData = await dataResponse.json();
                throw new Error(`Google Data Error: ${errData.error?.message || "Failed to fetch data"}`);
            }
            const batchData = await dataResponse.json();
            
            let combinedData = [];

            batchData.valueRanges.forEach((rangeData, sheetIndex) => {
                const currentSheetName = sheetNames[sheetIndex];
                const rows = rangeData.values;
                
                if (!rows || rows.length === 0) return;

                rows.forEach((row, rowIdx) => {
                    if (rowIdx === 0) return; // Skip Header

                   const cleanNum = (str) => parseFloat((str || "0").toString().replace(/[^0-9.-]+/g,""));
                    
                    // 🟢 UPDATED: Extracts Month and Year (e.g., "Jan 2024")
                    let rawDate = row[0] ? String(row[0]).trim() : "";
                    let monthStr = "Unknown Date";

                    if (rawDate) {
                        const match = rawDate.match(/(\d+)[/-](\d+)[/-](\d+)/);
                        if (match) {
                            let part1 = parseInt(match[1], 10);
                            let part2 = parseInt(match[2], 10);
                            let part3 = parseInt(match[3], 10);
                            
                            let monthNum = part2; 
                            // Identify the year correctly based on standard formats
                            let yearNum = part3 > 1000 ? part3 : (part1 > 1000 ? part1 : new Date().getFullYear());

                            if (part1 > 1000) monthNum = part2; 
                            else if (part1 > 12) monthNum = part2; 
                            else if (part2 > 12) monthNum = part1; 

                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            if (monthNum >= 1 && monthNum <= 12) {
                                monthStr = `${monthNames[monthNum - 1]} ${yearNum}`; 
                            } else {
                                monthStr = rawDate; 
                            }
                        } else {
                            const dateObj = new Date(rawDate);
                            if (!isNaN(dateObj.getTime())) {
                                monthStr = `${dateObj.toLocaleString('en-US', { month: 'short' })} ${dateObj.getFullYear()}`;
                            } else {
                                monthStr = rawDate; 
                            }
                        }
                    }
                    
                    const platform = row[1] || "Unknown";
                    const views = cleanNum(row[3]) || 0;
                    const emv = cleanNum(row[8]) || 0;
                    const influencer = currentSheetName; 
                    
                    // 🟢 COST AND CPV ARE NO LONGER EXTRACTED FROM THE SHEET!
                    if (emv > 0 || views > 0) {
                        combinedData.push({
                            id: `${currentSheetName}-${rowIdx}`,
                            month: monthStr,
                            influencer: influencer,
                            platform: platform, 
                            reach: views,
                            mediaValue: emv
                        });
                    }
                });
            });

            if (combinedData.length === 0) {
                throw new Error("No data found across any sheets. Please check your data formatting.");
            }

            setRoiData(combinedData);
       
        } catch (err) {
            console.error("Sheet Fetch Error:", err);
            setRoiError(err.message);
        } finally {
            setIsRoiLoading(false);
        }
    };

    const uniqueInfluencers = ["ALL", ...new Set(roiData.map(d => d.influencer))];
    const uniqueMonths = ["ALL", ...Array.from(new Set(roiData.map(d => d.month))).sort((a,b) => new Date(a) - new Date(b))];

    const filteredROI = roiData.filter(item => {
        const matchInfluencer = roiInfluencerFilter === 'ALL' || item.influencer === roiInfluencerFilter;
        const matchMonth = roiMonthFilter === 'ALL' || item.month === roiMonthFilter;
        return matchInfluencer && matchMonth;
    });

    // 🟢 List of all unique platforms in the filtered data to draw the stacked bars dynamically
    const uniquePlatforms = Array.from(new Set(filteredROI.map(d => d.platform)));

    // 🟢 THE ADVANCED MATH ENGINE: Dynamically calculates Spend & CPV
    
    // 1. Group by Influencer for the Leaderboard & Influencer Charts
    const influencerRoiMap = {};
    filteredROI.forEach(item => {
        if (!influencerRoiMap[item.influencer]) {
            influencerRoiMap[item.influencer] = { 
                influencer: item.influencer, 
                reach: 0,
                mediaValue: 0,
                activeMonths: new Set(), // Tracks unique months posted
                platforms: {} // Stores views split by platform
            };
        }
        influencerRoiMap[item.influencer].reach += item.reach;
        influencerRoiMap[item.influencer].mediaValue += item.mediaValue;
        influencerRoiMap[item.influencer].activeMonths.add(item.month);

        if (!influencerRoiMap[item.influencer].platforms[item.platform]) {
            influencerRoiMap[item.influencer].platforms[item.platform] = 0;
        }
        influencerRoiMap[item.influencer].platforms[item.platform] += item.reach;
    });
    
    // Map the Leaderboard Array
    const influencerROIBreakdown = Object.values(influencerRoiMap).map(inf => {
        // Calculate dynamic cost: (Fixed Monthly Cost * Number of months they were active in the filter)
        const baseCost = INFLUENCER_MONTHLY_COSTS[inf.influencer] || INFLUENCER_MONTHLY_COSTS["Default"];
        const totalCalculatedSpend = baseCost * inf.activeMonths.size;
        
        // Calculate true CPV on the fly
        const calculatedCpv = inf.reach > 0 ? parseFloat((totalCalculatedSpend / inf.reach).toFixed(2)) : 0;
        const avatarUrl = CUSTOM_AVATARS[inf.influencer] || `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.influencer)}&background=random&color=fff&size=128&bold=true`;
        
        // Flatten the platforms so the Stacked Bar Chart can easily read them
        const flatPlatforms = {};
        for (const [plat, views] of Object.entries(inf.platforms)) {
            flatPlatforms[plat] = views;
        }

        return {
            ...inf,
            ...flatPlatforms, // Spreads { YouTube: 1000, TikTok: 500 } directly
            spend: totalCalculatedSpend,
            cpv: calculatedCpv,
            avatar: avatarUrl
        };
    }).sort((a, b) => b.reach - a.reach); 

    // 2. Group by Month for the Trend Charts
    const monthlyRoiMap = {};
    filteredROI.forEach(item => {
        if (!monthlyRoiMap[item.month]) {
            monthlyRoiMap[item.month] = { 
                month: item.month, 
                reach: 0, 
                activeInfluencers: new Set(),
                platforms: {}
            };
        }
        monthlyRoiMap[item.month].reach += item.reach;
        monthlyRoiMap[item.month].activeInfluencers.add(item.influencer);

        if (!monthlyRoiMap[item.month].platforms[item.platform]) {
            monthlyRoiMap[item.month].platforms[item.platform] = 0;
        }
        monthlyRoiMap[item.month].platforms[item.platform] += item.reach;
    });

    
    // 🟢 UPDATED: Use native Date sorting (You can delete the old monthOrder dictionary)
    const monthlyROIBreakdown = Object.values(monthlyRoiMap).map(m => {
        let monthlySpend = 0;
        m.activeInfluencers.forEach(inf => {
            monthlySpend += (INFLUENCER_MONTHLY_COSTS[inf] || INFLUENCER_MONTHLY_COSTS["Default"]);
        });

        const flatPlatforms = {};
        for (const [plat, views] of Object.entries(m.platforms)) {
            flatPlatforms[plat] = views;
        }

        return {
            ...m,
            ...flatPlatforms,
            spend: monthlySpend,
            cpv: m.reach > 0 ? parseFloat((monthlySpend / m.reach).toFixed(2)) : 0
        };
    }).sort((a, b) => new Date(a.month) - new Date(b.month)); // Native chronologic sorting!

    // 3. Global Dashboard KPIs
    const roiTotalReach = filteredROI.reduce((sum, item) => sum + item.reach, 0);
    // Total spend must be the sum of our code-calculated monthly spends!
    const roiTotalSpend = monthlyROIBreakdown.reduce((sum, m) => sum + m.spend, 0);
    const roiCPV = roiTotalReach > 0 ? parseFloat((roiTotalSpend / roiTotalReach).toFixed(2)) : 0;

    const dynamicBreakdownData = [
        { name: "Total View", value: roiTotalReach },
        { name: "Total Cost", value: roiTotalSpend }
    ].filter(item => item.value > 0); 


   // --- 🟢 UPGRADED DATA PROCESSING ENGINE ---
    
    // 1. Generate unique months and categories for the Overview dropdowns
    const overviewUniqueMonths = ["ALL", ...Array.from(new Set(transactions.map(t => {
        const d = new Date(t.date);
        return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
    }))).sort((a, b) => new Date(a) - new Date(b))];
    
    const overviewUniqueCategories = ["ALL", ...Array.from(new Set(transactions.map(t => t.category || 'Uncategorized'))).sort()];

    // 2. Filter transactions based on the selected month AND category
    const filteredOverviewTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Check Month
            let matchMonth = true;
            if (overviewMonthFilter !== 'ALL') {
                const d = new Date(t.date);
                const monthStr = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
                matchMonth = monthStr === overviewMonthFilter;
            }
            
            // Check Category
            let matchCategory = true;
            if (overviewCategoryFilter !== 'ALL') {
                matchCategory = (t.category || 'Uncategorized') === overviewCategoryFilter;
            }

            return matchMonth && matchCategory;
        });
    }, [transactions, overviewMonthFilter, overviewCategoryFilter]);

    // 2.5 A special filter just for the All-Time chart (Respects Category, ignores Month)
    const categoryFilteredTransactions = useMemo(() => {
        return transactions.filter(t => overviewCategoryFilter === 'ALL' || (t.category || 'Uncategorized') === overviewCategoryFilter);
    }, [transactions, overviewCategoryFilter]);

    // 3. Dynamic Calculation Helpers
    const getMonthlyData = (type, dataset) => {
        const data = {};
        dataset.filter(t => t.type === type).forEach(t => {
            const date = new Date(t.date);
            const key = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`; 
            if (!data[key]) data[key] = { amount: 0, dateObj: date }; 
            data[key].amount += parseFloat(t.amount) || 0;
        });
        return Object.entries(data)
            .map(([label, val]) => ({ date: label, value: val.amount, dateObj: val.dateObj }))
            .sort((a, b) => a.dateObj - b.dateObj);
    };

    const getCategoryData = (type, dataset) => {
        const data = {};
        dataset.filter(t => t.type === type).forEach(t => {
            const cat = t.category || 'Uncategorized';
            if (!data[cat]) data[cat] = 0;
            data[cat] += parseFloat(t.amount) || 0;
        });
        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    const getTopTransactions = (type, dataset) => {
        return [...dataset]
            .filter(t => t.type === type)
            .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))
            .slice(0, 10);
    };

    // 4. Calculate Data for UI
    // Trend chart ALWAYS uses raw 'transactions' so you can see the all-time trajectory
    const incomeTrend = getMonthlyData('income', categoryFilteredTransactions);
    const spendingTrend = getMonthlyData('spending', categoryFilteredTransactions);
    
    // Everything else uses the dynamically filtered data!
    const incomeCategories = getCategoryData('income', filteredOverviewTransactions);
    const spendingCategories = getCategoryData('spending', filteredOverviewTransactions);
    const topIncome = getTopTransactions('income', filteredOverviewTransactions);
    const topSpending = getTopTransactions('spending', filteredOverviewTransactions);

    const overviewTotalIncome = filteredOverviewTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const overviewTotalSpending = filteredOverviewTransactions.filter(t => t.type === 'spending').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const overviewNetBalance = (TOTAL_BUDGET_CONST + overviewTotalIncome) - overviewTotalSpending;
    const overviewBudgetUsedPct = Math.min((overviewTotalSpending / TOTAL_BUDGET_CONST) * 100, 100).toFixed(1);
    
    const allMonths = Array.from(new Set([...incomeTrend.map(d => d.date), ...spendingTrend.map(d => d.date)])).sort((a, b) => new Date(a) - new Date(b));
    const combinedData = allMonths.map(month => ({
        date: month, 
        income: incomeTrend.find(d => d.date === month)?.value || 0, 
        spending: spendingTrend.find(d => d.date === month)?.value || 0
    }));

const filteredTransactions = transactions.filter(t => t.type === activeTab);
    const tabTotal = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // 🟢 NEW: Advanced Sorting Engine
    const sortedTransactions = useMemo(() => {
        let sortableItems = [...filteredTransactions];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle Number Sorting
                if (sortConfig.key === 'amount') {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                } 
                // Handle Date Sorting
                else if (sortConfig.key === 'date' || sortConfig.key === 'paymentDate') {
                    aValue = new Date(aValue || 0).getTime();
                    bValue = new Date(bValue || 0).getTime();
                } 
                // Handle Text Sorting (Case Insensitive)
                else {
                    aValue = (aValue || '').toString().toLowerCase();
                    bValue = (bValue || '').toString().toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredTransactions, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Helper component for table headers
    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
        if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="text-indigo-500 ml-1" />;
        return <ArrowDown size={14} className="text-indigo-500 ml-1" />;
    };

    const handleAiSubmit = async (e) => { e.preventDefault(); if (!aiQuery.trim()) return; const questionToSend = aiQuery; setLastQuestion(questionToSend); setAiQuery(''); setAiResponse(''); setIsAiLoading(true); try { const result = await analyzeFinancials(questionToSend, transactions); setAiResponse(result || "Sorry, I couldn't analyze the data."); } catch (error) { setAiResponse("An error occurred while connecting to AI."); } finally { setIsAiLoading(false); } };
    const handleFileUpload = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setNewTransaction(prev => ({ ...prev, invoiceFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveFile = () => { setNewTransaction(prev => ({ ...prev, invoiceFile: null })); const input = document.getElementById('addFile'); if(input) input.value = ''; };
    const handleQtUpload = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setNewTransaction(prev => ({ ...prev, qtFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveQt = () => { setNewTransaction(prev => ({ ...prev, qtFile: null })); const input = document.getElementById('addQt'); if(input) input.value = ''; };
    const handleSlipUpload = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setNewTransaction(prev => ({ ...prev, slipFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveSlip = () => { setNewTransaction(prev => ({ ...prev, slipFile: null })); const input = document.getElementById('addSlip'); if(input) input.value = ''; };
    const handleEditFileUpload = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setEditFormData(prev => ({ ...prev, invoiceFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveEditFile = () => { setEditFormData(prev => ({ ...prev, invoiceFile: null })); const input = document.getElementById('editFile'); if(input) input.value = ''; };
    const handleEditQt = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setEditFormData(prev => ({ ...prev, qtFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveEditQt = () => { setEditFormData(prev => ({ ...prev, qtFile: null })); const input = document.getElementById('editQt'); if(input) input.value = ''; };
    const handleEditSlip = (e) => { const file = e.target.files[0]; if (file && file.size <= 1024 * 1024) { const reader = new FileReader(); reader.onloadend = () => setEditFormData(prev => ({ ...prev, slipFile: reader.result })); reader.readAsDataURL(file); } else if(file) { alert("File too large (>1MB)"); } };
    const handleRemoveEditSlip = () => { setEditFormData(prev => ({ ...prev, slipFile: null })); const input = document.getElementById('slipQt'); if(input) input.value = ''; };
    const handleAddTransaction = (e) => { e.preventDefault(); onAdd({ ...newTransaction, type: activeTab === 'overview' ? 'income' : activeTab, createdAt: new Date(), id: Date.now().toString() }); setIsAddOpen(false); setNewTransaction({ type: 'income', date: new Date().toISOString().split('T')[0], brand: '', category: BUDGET_CATEGORIES[0], description: '', amount: '', company: '', emailSubject: '', invoice: '', invoiceFile: null, quotation: '', qtFile: null, paymentDate: '', status: 'Pending', slip: '', slipFile: null, remark: '' }); };
    const handleEditClick = (t) => { setEditFormData({ ...t }); setIsEditOpen(true); };
    const handleEditSubmit = (e) => { e.preventDefault(); onUpdate(editFormData.id, editFormData); setIsEditOpen(false); setEditFormData(null); };
    const handleDuplicate = (transaction) => { setNewTransaction({ ...transaction, date: new Date().toISOString().split('T')[0], id: undefined, type: transaction.type }); setIsAddOpen(true); };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans relative selection:bg-indigo-100 selection:text-indigo-900">
            {/* --- HEADER --- */}
            <header className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl shadow-sm z-20 flex justify-between items-center sticky top-0">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl shadow-inner ${activeTab === 'income' ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' : activeTab === 'spending' ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white'}`}>
                        {activeTab === 'income' ? <TrendingUp size={24} /> : activeTab === 'spending' ? <TrendingDown size={24} /> : <BarChart3 size={24} />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Budget Overview</h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Track your project finances dynamically</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => setIsAiOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100/50 px-5 py-2.5 rounded-xl font-bold hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-sm group">
                        <Sparkles size={16} className="text-indigo-500 group-hover:animate-pulse" /> Ask AI
                    </button>
                    {(activeTab === 'income' || activeTab === 'spending') && (
                        <div className="text-right pr-4 border-r border-gray-200">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total {activeTab}</p>
                            <p className={`text-2xl font-black tracking-tighter ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>฿{formatAmount(tabTotal)}</p>
                        </div>
                    )}
                    <button onClick={() => setIsAddOpen(true)} className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-gray-900/20 flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl"><Plus size={18} /> Add Record</button>
                </div>
            </header>

            {/* --- AI MODAL --- */}
            {isAiOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsAiOpen(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md"><Sparkles size={24} className="animate-pulse"/></div>
                                <div><h3 className="font-bold text-lg">Cat AI Analyst</h3><p className="text-indigo-200 text-xs">Ask questions about your budget data</p></div>
                            </div>
                            <button onClick={() => setIsAiOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto custom-scrollbar space-y-4">
                             <div className="flex gap-3">
                                <img src={AI_AVATAR} alt="AI" className="w-8 h-8 rounded-full object-cover border border-indigo-100 bg-white"/>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-700 max-w-[85%]">
                                    <p>Hello! I have analyzed your {transactions.length} transaction records.</p>
                                    <p className="mt-2 font-medium text-gray-500 text-xs">Try asking:</p>
                                    <ul className="list-disc pl-4 mt-1 text-xs text-gray-500 space-y-1">
                                        <li>"What is my highest spending category?"</li>
                                        <li>"How much total income this month?"</li>
                                        <li>"List top 5 expenses."</li>
                                    </ul>
                                </div>
                             </div>
                             {lastQuestion && (
                                 <div className="flex gap-3 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">You</div>
                                    <div className="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md text-sm max-w-[85%]">{lastQuestion}</div>
                                 </div>
                             )}
                             {isAiLoading && (
                                <div className="flex gap-3">
                                    <img src={AI_AVATAR} alt="AI" className="w-8 h-8 rounded-full object-cover border border-indigo-100 bg-white"/>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm flex items-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                             )}
                             {aiResponse && !isAiLoading && (
                                <div className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                                    <img src={AI_AVATAR} alt="AI" className="w-8 h-8 rounded-full object-cover border border-indigo-100 bg-white"/>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-w-[90%]">{aiResponse}</div>
                                </div>
                             )}
                        </div>
                        <form onSubmit={handleAiSubmit} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                            <input ref={aiInputRef} type="text" placeholder="Ask a question..." className="flex-1 bg-gray-100 border-transparent focus:bg-white border focus:border-indigo-500 rounded-xl px-4 py-3 outline-none transition text-sm" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} />
                            <button type="submit" disabled={isAiLoading || !aiQuery.trim()} className={`p-3 rounded-xl transition shadow-lg flex items-center justify-center ${isAiLoading || !aiQuery.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95'}`}><Send size={20} /></button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- TABS NAVIGATION --- */}
            <div className="flex-1 overflow-hidden flex flex-col relative z-10">
                <div className="px-8 pt-8 pb-0 flex gap-2 border-b border-gray-200 bg-transparent overflow-x-auto custom-scrollbar">
                    {['overview', 'income', 'spending', 'influencer_roi'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3.5 font-bold text-sm rounded-t-2xl transition-all duration-300 capitalize relative overflow-hidden whitespace-nowrap ${activeTab === tab ? 'bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)] border border-b-0 border-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-800'}`}>
                            <span className="relative z-10">{tab === 'influencer_roi' ? 'Influencer ROI' : tab}</span>
                            {activeTab === tab && (
                                <div className={`absolute bottom-0 left-0 w-full h-1 rounded-t-xl ${tab === 'income' ? 'bg-green-500' : tab === 'spending' ? 'bg-red-500' : tab === 'influencer_roi' ? 'bg-orange-500' : 'bg-indigo-600'}`}></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                    
                    {/* --- OVERVIEW TAB --- */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12 max-w-[1600px] mx-auto">
                            
                            {/* 🟢 NEW: Overview Filter Bar */}
                            <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <BarChart3 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Financial Dashboard</h3>
                                        <p className="text-xs text-gray-500">Filter by Month to recalculate metrics</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                    {/* 🟢 NEW: Category Filter */}
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                        <Tag size={14} className="text-gray-400 ml-2" />
                                        <select 
                                            className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none pr-4 cursor-pointer max-w-[150px] truncate"
                                            value={overviewCategoryFilter}
                                            onChange={(e) => setOverviewCategoryFilter(e.target.value)}
                                        >
                                            {overviewUniqueCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Month Filter */}
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                        <Calendar size={14} className="text-gray-400 ml-2" />
                                        <select 
                                            className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none pr-4 cursor-pointer"
                                            value={overviewMonthFilter}
                                            onChange={(e) => setOverviewMonthFilter(e.target.value)}
                                        >
                                            {overviewUniqueMonths.map(month => (
                                                <option key={month} value={month}>{month === 'ALL' ? 'All Time' : month}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* --- KPI ROW --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Total Budget */}
                                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border border-slate-800">
                                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors duration-500"></div>
                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Budget</span>
                                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md shadow-inner border border-white/5"><Wallet size={20} className="text-blue-300"/></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-4xl font-black tracking-tighter mb-2 drop-shadow-sm" title={`฿${formatAmount(TOTAL_BUDGET_CONST)}`}>
                                            ฿{formatCompactNumber(TOTAL_BUDGET_CONST)}
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2 mt-4 mb-2 overflow-hidden shadow-inner">
                                            <div className={`h-2 rounded-full transition-all duration-1000 ease-out ${overviewBudgetUsedPct > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-400'}`} style={{width: `${overviewBudgetUsedPct}%`}}></div>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                            <span>{overviewBudgetUsedPct}% Used {overviewMonthFilter !== 'ALL' ? 'This Month' : ''}</span>
                                            <span className="text-blue-300">฿{formatCompactNumber(TOTAL_BUDGET_CONST - overviewTotalSpending)} Left</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Income */}
                                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-900/5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Income</span>
                                        <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl text-green-600 group-hover:scale-110 group-hover:bg-green-100 transition-all duration-300"><TrendingUp size={20}/></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-4xl font-black text-gray-900 tracking-tighter" title={`฿${formatAmount(overviewTotalIncome)}`}>
                                            ฿{formatCompactNumber(overviewTotalIncome)}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-3 font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Across {filteredOverviewTransactions.filter(t=>t.type==='income').length} transactions</p>
                                    </div>
                                </div>

                                {/* Total Spending */}
                                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-900/5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Spending</span>
                                        <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 group-hover:scale-110 group-hover:bg-red-100 transition-all duration-300"><TrendingDown size={20}/></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-4xl font-black text-gray-900 tracking-tighter" title={`฿${formatAmount(overviewTotalSpending)}`}>
                                            ฿{formatCompactNumber(overviewTotalSpending)}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-3 font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Across {filteredOverviewTransactions.filter(t=>t.type==='spending').length} transactions</p>
                                    </div>
                                </div>

                                {/* Net Balance */}
                                <div className={`p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden ${overviewNetBalance >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-50 border border-green-200' : 'bg-gradient-to-br from-rose-50 to-red-50 border border-red-200'}`}>
                                    <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl transition-opacity duration-700 ${overviewNetBalance >= 0 ? 'bg-green-400/20' : 'bg-red-400/20'}`}></div>
                                    <div className="relative z-10 flex justify-between items-start mb-6">
                                        <span className={`text-xs font-bold uppercase tracking-widest ${overviewNetBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>Net Balance</span>
                                        <div className={`p-2.5 rounded-xl border bg-white/50 backdrop-blur-sm shadow-sm ${overviewNetBalance >= 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}><Activity size={20}/></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className={`text-4xl font-black tracking-tighter drop-shadow-sm ${overviewNetBalance >= 0 ? 'text-green-800' : 'text-red-800'}`} title={`฿${formatAmount(Math.abs(overviewNetBalance))}`}>
                                            {overviewNetBalance >= 0 ? '+' : '-'}฿{formatCompactNumber(Math.abs(overviewNetBalance))}
                                        </div>
                                        <p className={`text-xs mt-3 font-bold uppercase tracking-wider ${overviewNetBalance >= 0 ? 'text-green-600/70' : 'text-red-600/70'}`}>Income vs Spending</p>
                                    </div>
                                </div>
                            </div>

                            {/* --- LINE CHART (FULL WIDTH) --- */}
                            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col relative overflow-hidden w-full">
                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">All-Time Cash Flow Dynamics</h3>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Historical trajectory of income and expenses</p>
                                    </div>
                                    <div className="flex gap-4 text-xs font-bold bg-gray-50/80 backdrop-blur-md border border-gray-100 px-4 py-2 rounded-xl">
                                        <span className="text-green-600 flex items-center gap-2"><div className="w-3 h-3 rounded bg-gradient-to-br from-green-400 to-green-600 shadow-sm"></div> Income</span>
                                        <span className="text-red-600 flex items-center gap-2"><div className="w-3 h-3 rounded bg-gradient-to-br from-red-400 to-red-600 shadow-sm"></div> Spending</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[360px] w-full relative z-10">
                                    <InteractiveCombinedChart data={combinedData} />
                                </div>
                            </div>

                            {/* --- PIE CHARTS (SIDE BY SIDE) --- */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col">
                                    <div className="mb-8 text-center">
                                        <h3 className="text-xl font-black text-gray-900">Income Distribution</h3>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Where your revenue comes from</p>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <InteractivePieChart data={incomeCategories} type="income" />
                                    </div>
                                </div>
                                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col">
                                    <div className="mb-8 text-center">
                                        <h3 className="text-xl font-black text-gray-900">Spending Distribution</h3>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Where your budget is going</p>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <InteractivePieChart data={spendingCategories} type="spending" />
                                    </div>
                                </div>
                            </div>
                             {/* --- 🟢 NEW: MONTHLY SUMMARY TABLE --- */}
                            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col mt-8">
                                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                                            <Calendar size={20} className="text-indigo-500"/> Monthly Financial Summary
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">Detailed breakdown of income and spending per month</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-white font-bold border-b border-gray-200">
                                            <tr>
                                                <th className="px-8 py-5">Month</th>
                                                <th className="px-8 py-5 text-right">Income Amount</th>
                                                <th className="px-8 py-5 text-right">Spending Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {combinedData.length > 0 ? combinedData.map((row, idx) => {
                                                const net = row.income - row.spending;
                                                return (
                                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="px-8 py-4 font-bold text-gray-700 whitespace-nowrap">
                                                            {row.date}
                                                        </td>
                                                        <td className="px-8 py-4 font-mono font-bold text-right text-green-600 whitespace-nowrap">
                                                            ฿{formatAmount(row.income)}
                                                        </td>
                                                        <td className="px-8 py-4 font-mono font-bold text-right text-red-600 whitespace-nowrap">
                                                            ฿{formatAmount(row.spending)}
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan="4" className="px-8 py-12 text-center text-gray-400 font-medium">
                                                        No monthly data available. Add records to see them here.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {/* Optional Table Footer for Grand Totals */}
                                        <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                            <tr>
                                                <td className="px-8 py-4 text-gray-900 uppercase text-xs tracking-widest">All-Time Total</td>
                                                <td className="px-8 py-4 font-mono text-right text-green-600">฿{formatAmount(combinedData.reduce((acc, curr) => acc + curr.income, 0))}</td>
                                                <td className="px-8 py-4 font-mono text-right text-red-600">฿{formatAmount(combinedData.reduce((acc, curr) => acc + curr.spending, 0))}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* --- INFLUENCER ROI TAB --- */}
                    {activeTab === 'influencer_roi' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-12">
                            
                            {isRoiLoading ? (
                                <div className="flex flex-col items-center justify-center py-32 text-indigo-500">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                    <p className="font-bold">Fetching Live Data from Database...</p>
                                </div>
                            ) : roiError ? (
                                <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex items-start gap-4">
                                    <Activity size={24} className="mt-1 shrink-0"/> 
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Connection Error</h4>
                                        <p className="text-sm">{roiError}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Filters Section */}
                                    <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                                <Target size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">Influencer ROI Dashboard</h3>
                                                <p className="text-xs text-gray-500">Filter by Influencer or Month to recalculate metrics</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                                <Users size={14} className="text-gray-400 ml-2" />
                                                <select 
                                                    className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none pr-4 cursor-pointer"
                                                    value={roiInfluencerFilter}
                                                    onChange={(e) => setRoiInfluencerFilter(e.target.value)}
                                                >
                                                    {uniqueInfluencers.map(inf => (
                                                        <option key={inf} value={inf}>{inf === 'ALL' ? 'All Influencers' : inf}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                                <Calendar size={14} className="text-gray-400 ml-2" />
                                                <select 
                                                    className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none pr-4 cursor-pointer"
                                                    value={roiMonthFilter}
                                                    onChange={(e) => setRoiMonthFilter(e.target.value)}
                                                >
                                                    {uniqueMonths.map(month => (
                                                        <option key={month} value={month}>{month === 'ALL' ? 'All Months' : month}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KPI Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Eye size={20}/></div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-bold mb-1">Total View</p>
                                            <h3 className="text-3xl font-black text-gray-800" title={roiTotalReach}>
                                                {(roiTotalReach / 1000000).toFixed(2)}<span className="text-lg text-gray-400">M</span>
                                            </h3>
                                        </div>

                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Tag size={20}/></div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-bold mb-1">Total Calculated Spend</p>
                                            <h3 className="text-3xl font-black text-gray-800" title={`฿${formatAmount(roiTotalSpend)}`}>
                                                ฿{formatCompactNumber(roiTotalSpend)}
                                            </h3>
                                        </div>

                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Rocket size={20}/></div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-bold mb-1 relative z-10">Overall CPV</p>
                                            {roiCPV < 0.1 ? (
                                                <div>
                                                    <h3 className="text-3xl font-black text-green-600 relative z-10">
                                                        {roiCPV}
                                                    </h3>
                                                    <p className="text-m font-black text-green-600 relative z-10">Excellent</p>
                                                </div>
                                            ): roiCPV < 0.3 ? (
                                                <div>
                                                    <h3 className="text-3xl font-black text-blue-600 relative z-10">
                                                        {roiCPV}
                                                    </h3>
                                                    <p className="text-m font-black text-blue-600 relative z-10">Very Good</p>
                                                </div>
                                            ) : roiCPV < 0.7 ? (
                                                <div>
                                                    <h3 className="text-3xl font-black text-gray-500 relative z-10">
                                                        {roiCPV}
                                                    </h3>
                                                    <p className="text-m font-black text-gray-500 relative z-10">Standard</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h3 className="text-3xl font-black text-red-600 relative z-10">
                                                        {roiCPV}
                                                    </h3>
                                                    <p className="text-m font-black text-red-600 relative z-10">Underperform</p>
                                                </div>
                                            )}   
                                        </div>

                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-purple-50 text-green-600 rounded-2xl"><Smile size={20}/></div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-bold mb-1">Total Influencers</p>
                                            <h3 className="text-3xl font-black text-gray-800">
                                                8
                                            </h3>
                                        </div>
                                    </div>

                                    {/* 🟢 NEW: INFLUENCER AVATAR LEADERBOARD WITH PLATFORM PILLS */}
                                    {influencerROIBreakdown.length > 0 && (
                                        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mt-6">
                                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                                    <Users className="text-indigo-500"/> Top Performing Influencers
                                                </h3>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ranked by Views</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {influencerROIBreakdown.map((inf, idx) => (
                                                    <div key={inf.influencer} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200 flex flex-col hover:shadow-md hover:-translate-y-0.5 hover:bg-white hover:border-indigo-100 transition-all group">
                                                        
                                                        {/* Top Row: Avatar & Global Stats */}
                                                        <div className="flex items-center gap-4 mb-3">
                                                            <div className="relative shrink-0">
                                                                <img 
                                                                    src={inf.avatar} 
                                                                    alt={inf.influencer} 
                                                                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform" 
                                                                />
                                                                {idx < 3 && (
                                                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-black border-2 border-white shadow-sm z-10">
                                                                        #{idx + 1}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-bold text-gray-900 truncate text-sm" title={inf.influencer}>{inf.influencer}</h4>
                                                                <div className="flex flex-col mt-1 gap-0.5 text-[11px] text-gray-500 font-medium">
                                                                    <span className="flex items-center justify-between">
                                                                        <span className="flex items-center gap-1"><Eye size={12}/> Total:</span>
                                                                        <span className="font-bold text-gray-700">{formatCompactNumber(inf.reach)}</span>
                                                                    </span>
                                                                    <span className="flex items-center justify-between">
                                                                        <span className="flex items-center gap-1 text-orange-500"><Rocket size={12}/> CPV:</span>
                                                                        <span className="font-black text-orange-600">฿{inf.cpv}</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Bottom Row: Platform Breakdown Badges */}
                                                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-200/60">
                                                            {uniquePlatforms.filter(plat => inf[plat] > 0).map(plat => (
                                                                <span 
                                                                    key={plat} 
                                                                    className="text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase border"
                                                                    style={{ 
                                                                        backgroundColor: `${getPlatformColor(plat)}10`, 
                                                                        color: getPlatformColor(plat),
                                                                        borderColor: `${getPlatformColor(plat)}25`
                                                                    }}
                                                                >
                                                                    {plat}: {formatCompactNumber(inf[plat])}
                                                                </span>
                                                            ))}
                                                        </div>

                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                    )}

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                                        {/* Average CPV by Influencer */}
                                        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[450px]">
                                            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                                <BarChart3 className="text-orange-500"/> Average CPV by Influencer
                                            </h3>
                                            <div className="flex-1 w-full min-h-[250px]">
                                            {influencerROIBreakdown.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                                    <BarChart data={influencerROIBreakdown} width="100%" height="100%" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                            <XAxis dataKey="influencer" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10}/>
                                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `฿${val}`}/>
                                                            <RechartsTooltip 
                                                                cursor={{fill: '#f8fafc'}}
                                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                            />
                                                            <Bar dataKey="cpv" name="Avg CPV (฿)" fill="#f97316" radius={[6,6,0,0]} />
                                                    </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                                        No data available for these filters.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dynamic Breakdown Visualizer */}
                                        {dynamicBreakdownData.length > 0 ? (
                                            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[450px]">
                                                <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                                    <BarChart3 className="text-indigo-500"/> Breakdown
                                                </h3>
                                                <div className="flex-1 w-full min-h-[250px]">
                                                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                                        <BarChart data={dynamicBreakdownData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => formatCompactNumber(val)}/>
                                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} width={120}/>
                                                            <RechartsTooltip 
                                                                cursor={{fill: '#f8fafc'}} 
                                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                                formatter={(value) => formatCompactNumber(value)}
                                                            />
                                                            <Bar dataKey="value" name="Value" fill="#8b5cf6" radius={[0,6,6,0]} barSize={24} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white p-8 rounded-3xl border border-gray-100 border-dashed flex flex-col items-center justify-center text-gray-400 font-bold h-[450px]">
                                                <PieChartIcon size={48} className="mb-4 text-gray-200" />
                                                No breakdown data found
                                            </div>
                                        )}
                                    </div>

                                    {/* 🟢 NEW: Stacked Bar Chart for Views by Platform per Influencer */}
                                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[450px] mt-8">
                                        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                            <BarChart3 className="text-orange-500"/> Views by Platform (Per Influencer)
                                        </h3>
                                        <div className="flex-1 w-full min-h-[250px]">
                                        {influencerROIBreakdown.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                                <BarChart data={influencerROIBreakdown} width="100%" height="100%" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                        <XAxis dataKey="influencer" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10}/>
                                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => formatCompactNumber(val)}/>
                                                        <RechartsTooltip 
                                                            cursor={{fill: '#f8fafc'}}
                                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                            formatter={(value) => formatCompactNumber(value)}
                                                        />
                                                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', color: '#64748b' }}/>
                                                        
                                                        {uniquePlatforms.map(plat => (
                                                            <Bar key={plat} dataKey={plat} name={`${plat} Views`} stackId="a" fill={getPlatformColor(plat)} border={{ width: 8, color: '#ffffff' }} />
                                                        ))}
                                                        
                                                </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                                    No data available for these filters.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Monthly Charts Container */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                                        {/* Monthly Trend: CPV */}
                                        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[450px]">
                                            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                                <Rocket className="text-blue-500"/> Monthly Trend: CPV
                                            </h3>
                                            <div className="flex-1 w-full min-h-[250px]">
                                                {monthlyROIBreakdown.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                                        <BarChart data={monthlyROIBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10}/>
                                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `฿${val}`}/>
                                                            <RechartsTooltip 
                                                                cursor={{fill: '#f8fafc'}}
                                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                            />
                                                            <Bar dataKey="cpv" name="Average CPV (฿)" fill="#3b82f6" radius={[6,6,0,0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                                        No data available for these filters.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 🟢 NEW: Stacked Bar Chart for Monthly Views Separated by Platform */}
                                        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[450px]">
                                            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                                <Eye className="text-green-500"/> Monthly Total Views (By Platform)
                                            </h3>
                                            <div className="flex-1 w-full min-h-[250px]">
                                                {monthlyROIBreakdown.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                                        <BarChart data={monthlyROIBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10}/>
                                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => formatCompactNumber(val)}/>
                                                            <RechartsTooltip 
                                                                cursor={{fill: '#f8fafc'}}
                                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                                formatter={(value) => formatCompactNumber(value)}
                                                            />
                                                            <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', color: '#64748b' }}/>
                                                            
                                                            {uniquePlatforms.map(plat => (
                                                                <Bar key={plat} dataKey={plat} name={`${plat} Views`} stackId="a" fill={getPlatformColor(plat)} border={{ width: 2, color: '#ffffff' }} />
                                                            ))}
                                                            
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                                        No data available for these filters.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

{/* --- INCOME / SPENDING DATA TABLES --- */}
                    {(activeTab === 'income' || activeTab === 'spending') && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto custom-scrollbar relative">
<table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-bold border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                                    <tr className="whitespace-nowrap">
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('date')}>
                                            <div className="flex items-center">Date <SortIcon column="date" /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('brand')}>
                                            <div className="flex items-center">Brand <SortIcon column="brand" /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('category')}>
                                            <div className="flex items-center">Category <SortIcon column="category" /></div>
                                        </th>
                                        <th className="px-6 py-4 w-64 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('description')}>
                                            <div className="flex items-center">Description <SortIcon column="description" /></div>
                                        </th>
                                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('amount')}>
                                            <div className="flex items-center justify-end">Amount (THB) <SortIcon column="amount" /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('company')}>
                                            <div className="flex items-center">Company <SortIcon column="company" /></div>
                                        </th>
                                        <th className="px-6 py-4 w-48 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('emailSubject')}>
                                            <div className="flex items-center">Email Subject <SortIcon column="emailSubject" /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('quotation')}>
                                            <div className="flex items-center">Quotation <SortIcon column="quotation" /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('invoice')}>
                                            <div className="flex items-center">Invoice <SortIcon column="invoice" /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('paymentDate')}>
                                            <div className="flex items-center">Payment Date <SortIcon column="paymentDate" /></div>
                                        </th>
                                        <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('status')}>
                                            <div className="flex items-center justify-center">Status <SortIcon column="status" /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('slip')}>
                                            <div className="flex items-center">Slip <SortIcon column="slip" /></div>
                                        </th>
                                        <th className="px-6 py-4 w-48 cursor-pointer hover:bg-gray-200 transition group select-none" onClick={() => requestSort('remark')}>
                                            <div className="flex items-center">Remark <SortIcon column="remark" /></div>
                                        </th>
                                        <th className="px-6 py-4 text-center sticky right-0 bg-gray-50 z-30 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] border-l border-gray-200">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {/* 🟢 CHANGED: Now mapping over sortedTransactions! */}
                                    {sortedTransactions.map((t) => (
                                        <tr 
                                            key={t.id} 
                                            onClick={() => setSelectedRowId(selectedRowId === t.id ? null : t.id)}
                                            className={`transition-colors whitespace-nowrap cursor-pointer group ${selectedRowId === t.id ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-gray-50 bg-white'}`}
                                        >
                                            <td className="px-4 py-4">{t.date}</td>
                                            <td className="px-4 py-4 font-bold text-gray-700">{t.brand || "-"}</td>
                                            <td className="px-4 py-4">{t.category || "-"}</td>
                                            <td className="px-4 py-4 truncate max-w-[16rem]">{t.description || "-"}</td>
                                            <td className={`px-4 py-4 font-mono font-bold text-right ${activeTab === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatAmount(t.amount)}
                                            </td>
                                            <td className="px-4 py-4">{t.company || "-"}</td>
                                            <td className="px-4 py-4 text-gray-600 truncate text-xs max-w-[12rem]">{t.emailSubject || "-"}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs w-20 truncate">{t.quotation || "-"}</span>
                                                    {t.qtFile && (<button onClick={(e) => { e.stopPropagation(); setPreviewFile(t.qtFile); }} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="Preview"><Eye size={16} /></button>)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs w-20 truncate">{t.invoice || "-"}</span>
                                                    {t.invoiceFile && (<button onClick={(e) => { e.stopPropagation(); setPreviewFile(t.invoiceFile); }} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="Preview"><Eye size={16} /></button>)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">{t.paymentDate || "-"}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-block rounded-full text-xs font-bold border px-2 py-1 ${t.status === 'Complete' ? 'bg-green-50 text-green-700 border-green-200' : t.status === 'Follow-up' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                    {t.status || "-"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs w-20 truncate">{t.slip || "-"}</span>
                                                    {t.slipFile && (<button onClick={(e) => { e.stopPropagation(); setPreviewFile(t.slipFile); }} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="Preview"><Eye size={16} /></button>)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 italic text-gray-500 text-xs max-w-[12rem] truncate">{t.remark || "-"}</td>
                                            
                                            <td className={`px-6 py-4 text-center sticky right-0 z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] border-l border-gray-100 transition-colors ${selectedRowId === t.id ? 'bg-blue-50' : 'bg-white group-hover:bg-gray-50'}`}>
                                                {selectedRowId === t.id ? (
                                                    <div className="flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-200">
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(t); }} className="text-blue-500 hover:text-blue-700 p-1.5 rounded-md hover:bg-blue-100 bg-white shadow-sm" title="Edit"><Edit2 size={16} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDuplicate(t); }} className="text-indigo-500 hover:text-indigo-700 p-1.5 rounded-md hover:bg-indigo-100 bg-white shadow-sm" title="Duplicate"><Copy size={16} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-100 bg-white shadow-sm" title="Delete"><Trash2 size={16} /></button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {sortedTransactions.length === 0 && <tr><td colSpan="14" className="px-6 py-12 text-center text-gray-400 font-medium bg-gray-50/50">No records found. Click "Add Record" to start tracking.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ADD TRANSACTION MODAL --- */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                            <div><h3 className="text-2xl font-bold text-gray-900">Add Record</h3><p className="text-sm text-gray-500 mt-1">Select type and fill details.</p></div>
                            <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                           <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={newTransaction.type} onChange={e => setNewTransaction({...newTransaction, type: e.target.value})}><option value="income">Income</option><option value="spending">Spending</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label><input required type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brand</label><input required type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.brand} onChange={e => setNewTransaction({...newTransaction, brand: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}>{BUDGET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount</label><input required type="number" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})} /></div>
                            </div>
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.company} onChange={e => setNewTransaction({...newTransaction, company: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Subject</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.emailSubject} onChange={e => setNewTransaction({...newTransaction, emailSubject: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quotation No.</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.quotation} onChange={e => setNewTransaction({...newTransaction, quotation: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload Quotation</label>
                                        {newTransaction.qtFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold"><Paperclip size={16}/> Attached</span>
                                                <button type="button" onClick={handleRemoveQt} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleQtUpload} className="hidden" id="addQt"/>
                                                <label htmlFor="addQt" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select File</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Invoice No.</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.invoice} onChange={e => setNewTransaction({...newTransaction, invoice: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload</label>
                                        {newTransaction.invoiceFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold"><Paperclip size={16}/> Attached</span>
                                                <button type="button" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleFileUpload} className="hidden" id="addFile"/>
                                                <label htmlFor="addFile" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select File</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Date</label><input type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.paymentDate} onChange={e => setNewTransaction({...newTransaction, paymentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.status} onChange={e => setNewTransaction({...newTransaction, status: e.target.value})}>{BUDGET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Slip</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={newTransaction.slip} onChange={e => setNewTransaction({...newTransaction, slip: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload</label>
                                        {newTransaction.slipFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold"><Paperclip size={16}/> Attached</span>
                                                <button type="button" onClick={handleRemoveSlip} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleSlipUpload} className="hidden" id="addSlip"/>
                                                <label htmlFor="addSlip" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select File</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Remark</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={newTransaction.remark} onChange={e => setNewTransaction({...newTransaction, remark: e.target.value})} /></div>
                            </div>
                            <div className="md:col-span-2 pt-6 border-t flex justify-end gap-3"><button type="button" onClick={() => setIsAddOpen(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Cancel</button><button type="submit" className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700">Save Record</button></div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* --- EDIT TRANSACTION MODAL --- */}
            {isEditOpen && editFormData && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                            <div><h3 className="text-2xl font-bold text-gray-900">Edit Record</h3><p className="text-sm text-gray-500 mt-1">Modify transaction details.</p></div>
                            <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                             <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={editFormData.type} onChange={e => setEditFormData({...editFormData, type: e.target.value})}><option value="income">Income</option><option value="spending">Spending</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label><input required type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.date} onChange={e => setEditFormData({...editFormData, date: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brand</label><input required type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.brand} onChange={e => setEditFormData({...editFormData, brand: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})}>{BUDGET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount</label><input required type="number" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} /></div>
                            </div>
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.company} onChange={e => setEditFormData({...editFormData, company: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Subject</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.emailSubject} onChange={e => setEditFormData({...editFormData, emailSubject: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quotation No.</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.quotation} onChange={e => setEditFormData({...editFormData, quotation: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update File</label>
                                        {editFormData.qtFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold truncate max-w-[150px]"><Paperclip size={16}/> File Attached</span>
                                                <button type="button" onClick={handleRemoveEditQt} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleEditQt} className="hidden" id="editQt"/>
                                                <label htmlFor="editQt" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select New</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Invoice No.</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.invoice} onChange={e => setEditFormData({...editFormData, invoice: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update File</label>
                                        {editFormData.invoiceFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold truncate max-w-[150px]"><Paperclip size={16}/> File Attached</span>
                                                <button type="button" onClick={handleRemoveEditFile} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleEditFileUpload} className="hidden" id="editFile"/>
                                                <label htmlFor="editFile" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select New</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Date</label><input type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.paymentDate} onChange={e => setEditFormData({...editFormData, paymentDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label><select className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>{BUDGET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Slip</label><input type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={editFormData.invoice} onChange={e => setEditFormData({...editFormData, invoice: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update File</label>
                                        {editFormData.slipFile ? (
                                            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-2.5">
                                                <span className="flex items-center gap-2 text-xs text-green-700 font-bold truncate max-w-[150px]"><Paperclip size={16}/> File Attached</span>
                                                <button type="button" onClick={handleRemoveEditSlip} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center cursor-pointer hover:bg-gray-50 transition">
                                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleEditSlip} className="hidden" id="editSlip"/>
                                                <label htmlFor="editSlip" className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer w-full h-full"><Upload size={16}/> Select New</label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Remark</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={editFormData.remark} onChange={e => setEditFormData({...editFormData, remark: e.target.value})} /></div>
                            </div>
                            <div className="md:col-span-2 pt-6 border-t flex justify-end gap-3"><button type="button" onClick={() => setIsEditOpen(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Cancel</button><button type="submit" className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700">Save Changes</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- PREVIEW MODAL --- */}
            {previewFile && (
                <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setPreviewFile(null)}>
                    <div className="relative w-full h-full max-w-5xl max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><FileText size={20}/> Document Preview</h3>
                            <button onClick={() => setPreviewFile(null)} className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-500 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-4">
                            {previewFile.startsWith('data:image') ? (
                                <img src={previewFile} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
                            ) : (
                                <iframe src={previewFile} title="Document Preview" className="w-full h-full border-none shadow-lg bg-white rounded" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ✨ PREMIUM INTERACTIVE CHARTS ✨ ---

const InteractiveCombinedChart = ({ data }) => {
   if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400 font-medium">No data available to chart</div>;

    return (
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}} 
                    dx={-10} 
                    tickFormatter={(val) => `฿${formatCompactNumber(val)}`}
                />
                <RechartsTooltip 
                    // Adds a sleek dashed line tracking your mouse
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                    formatter={(value) => `฿${formatCompactNumber(value)}`}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', color: '#64748b' }}/>
                
                {/* Sleek, curved lines with interactive hover dots */}
                <Line 
                    type="monotone" 
                    dataKey="income" 
                    name="Income (฿)" 
                    stroke="#22c55e" 
                    strokeWidth={4} 
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, shadow: '0 4px 10px rgba(0,0,0,0.2)' }} 
                />
                <Line 
                    type="monotone" 
                    dataKey="spending" 
                    name="Spending (฿)" 
                    stroke="#ef4444" 
                    strokeWidth={4} 
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, shadow: '0 4px 10px rgba(0,0,0,0.2)' }} 
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

const InteractivePieChart = ({ data, type = "spending" }) => {
    const [hoverIndex, setHoverIndex] = useState(null);

    if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400 font-medium">No data to display</div>;
    
    const total = data.reduce((acc, cur) => acc + cur.value, 0);
    
    // Dynamic color palettes
    const spendingColors = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#d946ef', '#f97316'];
    const incomeColors = ['#10b981', '#3b82f6', '#0ea5e9', '#14b8a6', '#06b6d4', '#34d399', '#2dd4bf'];
    const colors = type === 'income' ? incomeColors : spendingColors;

    // 🟢 NEW: Inject the fill color directly into the data payload!
    const pieData = data.map((entry, index) => {
        const baseColor = colors[index % colors.length];
        const isHovered = hoverIndex === index;
        const isAnyHovered = hoverIndex !== null;

        // Apply Hex Opacity (50 = ~30% opacity) if another slice is being hovered
        const finalColor = (isAnyHovered && !isHovered) ? `${baseColor}50` : baseColor;

        return {
            ...entry,
            fill: finalColor // Recharts automatically reads this property
        };
    });

    return (
        <div className="flex flex-col items-center w-full">
            {/* Recharts Donut Container */}
            <div className="w-48 h-48 relative mb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData} // 🟢 Pass our new dynamically colored data here
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            onMouseEnter={(_, index) => setHoverIndex(index)}
                            onMouseLeave={() => setHoverIndex(null)}
                            stroke="none"
                            style={{ outline: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                
                {/* Dynamic Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {hoverIndex !== null ? (
                        <>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{((data[hoverIndex].value / total) * 100).toFixed(0)}%</span>
                            <span className="text-sm font-black text-gray-800 tracking-tighter">฿{formatCompactNumber(data[hoverIndex].value)}</span>
                        </>
                    ) : (
                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Hover</span>
                    )}
                </div>
            </div>

            {/* Custom Interactive Legend */}
            <div className="w-full space-y-2 overflow-y-auto max-h-48 pr-2 custom-scrollbar">
                {data.map((d, i) => (
                    <div 
                        key={i} 
                        className={`flex justify-between items-center p-2 rounded-lg transition-all cursor-default ${hoverIndex === i ? 'bg-gray-50 scale-105' : 'hover:bg-gray-50/50'}`}
                        onMouseEnter={() => setHoverIndex(i)}
                        onMouseLeave={() => setHoverIndex(null)}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded shadow-sm transition-transform ${hoverIndex === i ? 'scale-125' : ''}`} style={{backgroundColor: colors[i % colors.length]}}></span>
                            <span className={`text-sm truncate max-w-[150px] transition-colors ${hoverIndex === i ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`} title={d.name}>{d.name}</span>
                        </div>
                        <span className={`text-sm transition-colors ${hoverIndex === i ? 'font-black text-gray-900' : 'font-bold text-gray-400'}`}>฿{formatCompactNumber(d.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BudgetView;