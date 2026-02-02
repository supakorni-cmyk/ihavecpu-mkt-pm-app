// src/components/views/VirtualPet.jsx
import React, { useState, useEffect } from 'react';
import { Heart, Zap, Utensils, Smile, Moon, Sparkles, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VirtualPet = ({ pet, onAdopt, onInteract }) => {
    // --- CREATION STATE ---
    const [newPetName, setNewPetName] = useState("");
    const [selectedBreed, setSelectedBreed] = useState("cat_orange");
    const [selectedColor, setSelectedColor] = useState("#FDBA74");
    
    // --- ANIMATION STATE ---
    const [activity, setActivity] = useState('idle'); // idle, eating, playing, sleeping, petting
    const [clickCount, setClickCount] = useState(0);

    // --- ASSETS & CONFIG ---
    // You can replace these emojis with GIF links if you have them!
    const BREEDS = [
        { id: 'cat_orange', name: 'Ginger Tabby', emoji: '🐱', color: '#FDBA74', bg: 'bg-orange-50' },
        { id: 'cat_black', name: 'Void Kitty', emoji: '🐈‍⬛', color: '#374151', bg: 'bg-gray-100' },
        { id: 'cat_siamese', name: 'Siamese', emoji: '🙀', color: '#E5E7EB', bg: 'bg-stone-100' },
        { id: 'cat_calico', name: 'Calico', emoji: '😺', color: '#D97706', bg: 'bg-amber-50' },
    ];

    // --- ANIMATION VARIANTS (The Magic 🪄) ---
    const petVariants = {
        idle: { 
            y: [0, -5, 0], 
            scale: 1,
            rotate: 0,
            transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } 
        },
        eating: { 
            scale: [1, 1.1, 1], 
            rotate: [0, -3, 3, 0],
            y: [0, 2, 0],
            transition: { repeat: Infinity, duration: 0.4 } 
        },
        playing: { 
            x: [-20, 20, -10, 10, 0], 
            y: [0, -30, 0, -10, 0], 
            rotate: [0, -10, 10, 0],
            scale: [1, 1.2, 1],
            transition: { duration: 0.8 } 
        },
        sleeping: { 
            scale: [1, 0.98, 1], 
            opacity: 0.8,
            y: 5,
            transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } 
        },
        petting: { 
            scale: 1.1, 
            rotate: [0, 5, -5, 0],
            filter: "brightness(1.1)",
            transition: { duration: 0.3 } 
        }
    };

    // --- HANDLERS ---
    const handleAction = (actionType) => {
        setActivity(actionType);
        onInteract(actionType); // Call backend

        // Reset to idle after animation finishes
        const duration = actionType === 'sleeping' ? 5000 : 
                         actionType === 'playing' ? 2000 : 
                         1000;
                         
        setTimeout(() => setActivity('idle'), duration);
    };

    // --- RENDER: ADOPTION CENTER ---
    if (!pet) {
        return (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-indigo-100 text-center max-w-2xl mx-auto mt-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner border border-indigo-100">
                    🏠
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Adoption Center</h2>
                <p className="text-gray-500 mb-8 text-sm">Adopt a virtual companion to keep you company while you work!</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">1. Choose a Breed</label>
                        <div className="grid grid-cols-2 gap-3">
                            {BREEDS.map(breed => (
                                <button 
                                    key={breed.id}
                                    onClick={() => { setSelectedBreed(breed.id); setSelectedColor(breed.color); }}
                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedBreed === breed.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 ring-offset-2' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <span className="text-3xl">{breed.emoji}</span>
                                    <span className="text-xs font-bold text-gray-600">{breed.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col justify-between">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">2. Name Your Friend</label>
                            <input 
                                type="text" 
                                value={newPetName}
                                onChange={(e) => setNewPetName(e.target.value)}
                                placeholder="e.g. Mr. Whiskers"
                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-gray-700 placeholder-gray-300 transition-all"
                            />
                        </div>

                        <button 
                            onClick={() => onAdopt({ name: newPetName, breed: selectedBreed, color: selectedColor })}
                            disabled={!newPetName.trim()}
                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200 mt-4 flex items-center justify-center gap-2"
                        >
                            <Heart size={18} className="fill-white" /> Adopt Now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: PET DASHBOARD ---
    
    // Dynamic Avatar Logic
    const getAvatar = () => {
        // If you had GIF links, you would switch them here based on `activity`
        // Example: if (activity === 'eating') return "https://...cat_eating.gif";
        
        // Default Emoji Logic
        const breedData = BREEDS.find(b => b.id === pet.breed) || BREEDS[0];
        
        if (activity === 'sleeping') return "😴";
        if (activity === 'eating') return "😋";
        if (activity === 'playing') return "😺";
        if (pet.stats.happiness < 30) return "😿"; 
        if (pet.stats.hunger < 30) return "😾";    
        return breedData.emoji;
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-indigo-50 relative overflow-hidden mt-8">
            {/* Ambient Background */}
            <div className={`absolute inset-0 opacity-30 transition-colors duration-1000 ${activity === 'sleeping' ? 'bg-indigo-900' : 'bg-white'}`}></div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full opacity-50 blur-2xl"></div>
            
            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                
                {/* 🟢 1. ANIMATED AVATAR AREA */}
                <div className="flex flex-col items-center min-w-[200px]">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                        
                        {/* Background Circle */}
                        <motion.div 
                            animate={{ scale: activity === 'playing' ? [1, 1.2, 1] : 1 }}
                            className={`absolute inset-0 rounded-full opacity-20 ${activity === 'sleeping' ? 'bg-indigo-200' : 'bg-yellow-200'}`} 
                        />

                        {/* THE PET */}
                        <motion.div 
                            variants={petVariants}
                            animate={activity}
                            className="text-9xl cursor-pointer relative z-10 select-none filter drop-shadow-xl"
                            onClick={() => {
                                setClickCount(c => c + 1);
                                handleAction('petting');
                            }}
                        >
                            {getAvatar()}
                        </motion.div>

                        {/* Floating Particles */}
                        <AnimatePresence>
                            {activity === 'eating' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 0 }} 
                                    animate={{ opacity: 1, y: -20 }} 
                                    exit={{ opacity: 0 }}
                                    className="absolute top-0 text-4xl"
                                >
                                    🐟
                                </motion.div>
                            )}
                            {activity === 'sleeping' && (
                                <motion.div 
                                    initial={{ opacity: 0, x: 20, y: -10 }} 
                                    animate={{ opacity: [0, 1, 0], x: 40, y: -40 }} 
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute top-0 right-0 text-3xl font-bold text-indigo-300"
                                >
                                    Zzz...
                                </motion.div>
                            )}
                            {activity === 'petting' && (
                                <motion.div 
                                    key={clickCount}
                                    initial={{ opacity: 1, scale: 0.5, y: 0 }}
                                    animate={{ opacity: 0, scale: 1.5, y: -50 }}
                                    className="absolute -top-4 text-pink-500"
                                >
                                    <Heart size={32} fill="currentColor" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="text-center mt-6">
                        <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2 justify-center">
                            {pet.name} 
                            {pet.stats.happiness > 80 && <Star size={20} className="text-yellow-400 fill-yellow-400 animate-spin-slow" />}
                        </h3>
                        <p className={`text-xs font-bold px-3 py-1 rounded-full mt-1 inline-block transition-colors ${activity === 'sleeping' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                            {activity === 'idle' ? "Chilling..." : activity.toUpperCase() + "!"}
                        </p>
                    </div>
                </div>

                {/* 2. Stats & Controls */}
                <div className="flex-1 w-full space-y-6">
                    
                    {/* Stats Bars */}
                    <div className="space-y-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                        <StatBar icon={<Utensils size={14}/>} label="Hunger" value={pet.stats.hunger} color="bg-green-500" track="bg-green-100" />
                        <StatBar icon={<Smile size={14}/>} label="Happiness" value={pet.stats.happiness} color="bg-pink-500" track="bg-pink-100" />
                        <StatBar icon={<Zap size={14}/>} label="Energy" value={pet.stats.energy} color="bg-yellow-400" track="bg-yellow-100" />
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-4 gap-3">
                        <ActionButton 
                            icon={<Utensils size={20}/>} 
                            label="Feed" 
                            onClick={() => handleAction('eating')} 
                            color="hover:bg-green-50 hover:text-green-600" 
                            disabled={activity !== 'idle'}
                        />
                        <ActionButton 
                            icon={<Heart size={20}/>} 
                            label="Pet" 
                            onClick={() => handleAction('petting')} 
                            color="hover:bg-pink-50 hover:text-pink-600" 
                            disabled={activity !== 'idle'}
                        />
                        <ActionButton 
                            icon={<Zap size={20}/>} 
                            label="Play" 
                            onClick={() => handleAction('playing')} 
                            color="hover:bg-yellow-50 hover:text-yellow-600" 
                            disabled={activity !== 'idle'}
                        />
                        <ActionButton 
                            icon={<Moon size={20}/>} 
                            label="Sleep" 
                            onClick={() => handleAction('sleeping')} 
                            color="hover:bg-blue-50 hover:text-blue-600" 
                            disabled={activity !== 'idle'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---
const StatBar = ({ icon, label, value, color, track }) => (
    <div className="flex items-center gap-3">
        <div className="w-24 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
            {icon} {label}
        </div>
        <div className={`flex-1 h-3 ${track} rounded-full overflow-hidden`}>
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ type: "spring", stiffness: 50 }}
                className={`h-full rounded-full ${color} shadow-sm`}
            />
        </div>
        <div className="w-8 text-right text-xs font-black text-gray-400">{value}%</div>
    </div>
);

const ActionButton = ({ icon, label, onClick, color, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-95 bg-white text-gray-400 ${color} disabled:opacity-50 disabled:cursor-not-allowed group`}
    >
        <div className="p-2 rounded-full bg-gray-50 group-hover:bg-white group-hover:shadow-md transition-all">
            {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
);

export default VirtualPet;