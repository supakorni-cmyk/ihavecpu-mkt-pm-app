// src/components/views/VirtualPet.jsx
import React, { useState } from 'react';
import { Heart, Zap, Utensils, Moon, Sparkles, Smile, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VirtualPet = ({ pet, onAdopt, onInteract }) => {
    // --- STATE ---
    const [newPetName, setNewPetName] = useState("");
    const [selectedBreed, setSelectedBreed] = useState("cat_orange");
    const [activity, setActivity] = useState('idle');
    const [clickCount, setClickCount] = useState(0);

    // --- MODERN ASSETS (Emojis) ---
    const BREEDS = [
        { id: 'cat_orange', name: 'Ginger', emoji: '🐱', bg: 'bg-orange-100', text: 'text-orange-600' },
        { id: 'cat_black', name: 'Void', emoji: '🐈‍⬛', bg: 'bg-gray-100', text: 'text-gray-600' },
        { id: 'cat_siamese', name: 'Siamese', emoji: '🙀', bg: 'bg-blue-50', text: 'text-blue-600' },
        { id: 'cat_calico', name: 'Calico', emoji: '😺', bg: 'bg-yellow-50', text: 'text-yellow-600' },
    ];

    // --- MODERN ANIMATIONS (Smooth Physics) ---
    const petVariants = {
        idle: { 
            y: [0, -8, 0], 
            rotate: [0, 2, -2, 0],
            scale: 1,
            transition: { repeat: Infinity, duration: 4, ease: "easeInOut" } 
        },
        eating: { 
            scale: [1, 1.15, 1], 
            rotate: [0, -5, 5, 0],
            transition: { repeat: Infinity, duration: 0.6 } 
        },
        playing: { 
            x: [-20, 20, -10, 10, 0], 
            y: [0, -30, 0, -15, 0], 
            rotate: [0, -15, 15, 0],
            scale: [1, 1.1, 1],
            transition: { duration: 0.8, type: "spring" } 
        },
        sleeping: { 
            scale: [1, 0.95, 1], 
            opacity: 0.8,
            y: 10,
            transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } 
        },
        petting: { 
            scale: [1, 1.2, 1], 
            rotate: [0, 5, -5, 0],
            filter: "brightness(1.1)",
            transition: { duration: 0.4 } 
        }
    };

    const handleAction = (actionType) => {
        setActivity(actionType);
        onInteract(actionType);
        const duration = actionType === 'sleeping' ? 5000 : 
                         actionType === 'playing' ? 1500 : 
                         1000;
        setTimeout(() => setActivity('idle'), duration);
    };

    // --- RENDER: MODERN ADOPTION CENTER ---
    if (!pet) {
        return (
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center max-w-2xl mx-auto mt-8 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Sparkles size={28} />
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Find Your Companion</h2>
                    <p className="text-gray-500 mb-8 text-sm">Choose a virtual pet to keep you company while you work.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        {/* Breed Selector */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">1. Choose Breed</label>
                            <div className="grid grid-cols-2 gap-3">
                                {BREEDS.map(breed => (
                                    <button 
                                        key={breed.id}
                                        onClick={() => setSelectedBreed(breed.id)}
                                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 
                                            ${selectedBreed === breed.id 
                                                ? `border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 ring-offset-1` 
                                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="text-3xl filter drop-shadow-sm">{breed.emoji}</span>
                                        <span className="text-xs font-bold text-gray-600">{breed.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name Input */}
                        <div className="flex flex-col justify-between">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">2. Name It</label>
                                <input 
                                    type="text" 
                                    value={newPetName}
                                    onChange={(e) => setNewPetName(e.target.value)}
                                    placeholder="e.g. Luna"
                                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none font-bold text-gray-700 placeholder-gray-300 transition-all"
                                />
                            </div>

                            <button 
                                onClick={() => onAdopt({ name: newPetName, breed: selectedBreed })}
                                disabled={!newPetName.trim()}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-1 mt-4 flex items-center justify-center gap-2"
                            >
                                <Heart size={18} className="fill-white" /> Adopt Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: MODERN DASHBOARD ---
    const breedData = BREEDS.find(b => b.id === pet.breed) || BREEDS[0];

    // Determine Avatar & Status
    const getAvatar = () => {
        if (activity === 'sleeping') return "💤";
        if (activity === 'eating') return "😋";
        if (activity === 'playing') return "😺";
        if (pet.stats.hunger < 30) return "😫";
        return breedData.emoji;
    };

    const getStatusText = () => {
        if (activity === 'sleeping') return "Sleeping...";
        if (activity === 'eating') return "Yum yum!";
        if (activity === 'playing') return "Zoomies!";
        if (pet.stats.hunger < 30) return "Hungry!";
        if (pet.stats.energy < 30) return "Sleepy...";
        return "Feeling Good";
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-indigo-50 relative overflow-hidden mt-8">
            {/* Dynamic Background Gradient based on Activity */}
            <div className={`absolute inset-0 opacity-20 transition-colors duration-1000 
                ${activity === 'sleeping' ? 'bg-indigo-900' : 
                  activity === 'playing' ? 'bg-yellow-100' : 
                  activity === 'eating' ? 'bg-green-100' : 'bg-blue-50'}`} 
            />
            
            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                
                {/* 1. Avatar Section */}
                <div className="flex flex-col items-center justify-center min-w-[200px]">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                        {/* Glow Effect */}
                        <div className={`absolute w-32 h-32 rounded-full blur-2xl opacity-40 transition-colors duration-500
                            ${activity === 'playing' ? 'bg-yellow-400' : 'bg-indigo-300'}`} 
                        />

                        {/* THE PET */}
                        <motion.div 
                            variants={petVariants}
                            animate={activity}
                            className="text-9xl cursor-pointer relative z-10 select-none filter drop-shadow-2xl"
                            onClick={() => { setClickCount(c => c + 1); handleAction('petting'); }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            {getAvatar()}
                        </motion.div>

                        {/* Floating Emojis */}
                        <AnimatePresence>
                            {activity === 'eating' && (
                                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:-40}} exit={{opacity:0}} className="absolute text-4xl">🐟</motion.div>
                            )}
                            {activity === 'playing' && (
                                <motion.div initial={{opacity:0, scale:0}} animate={{opacity:1, scale:1.5}} exit={{opacity:0}} className="absolute top-0 right-0 text-4xl">🧶</motion.div>
                            )}
                            {activity === 'petting' && (
                                <motion.div key={clickCount} initial={{y:0, opacity:1, scale:0.5}} animate={{y:-50, opacity:0, scale:1.5}} className="absolute top-0 text-pink-500">
                                    <Heart size={40} fill="currentColor" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="text-center mt-2">
                        <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2 justify-center">
                            {pet.name} 
                            {pet.stats.happiness > 90 && <Star size={20} className="text-yellow-400 fill-yellow-400 animate-spin-slow" />}
                        </h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 shadow-sm transition-colors duration-300
                            ${activity === 'idle' ? 'bg-white text-gray-500' : 'bg-gray-900 text-white'}`}>
                            {getStatusText()}
                        </span>
                    </div>
                </div>

                {/* 2. Controls & Stats */}
                <div className="flex-1 w-full space-y-6">
                    
                    {/* Modern Stats Bars */}
                    <div className="space-y-4 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white shadow-sm">
                        <ModernStatBar icon={<Utensils size={16}/>} label="Hunger" value={pet.stats.hunger} color="bg-green-500" />
                        <ModernStatBar icon={<Smile size={16}/>} label="Happiness" value={pet.stats.happiness} color="bg-pink-500" />
                        <ModernStatBar icon={<Zap size={16}/>} label="Energy" value={pet.stats.energy} color="bg-yellow-400" />
                    </div>

                    {/* Action Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        <ModernActionButton 
                            icon={<Utensils size={20}/>} 
                            label="Feed" 
                            onClick={() => handleAction('eating')} 
                            color="text-green-600 bg-green-50 hover:bg-green-100 hover:ring-green-200" 
                            disabled={activity !== 'idle'}
                        />
                        <ModernActionButton 
                            icon={<Heart size={20}/>} 
                            label="Pet" 
                            onClick={() => handleAction('petting')} 
                            color="text-pink-600 bg-pink-50 hover:bg-pink-100 hover:ring-pink-200" 
                            disabled={activity !== 'idle'}
                        />
                        <ModernActionButton 
                            icon={<Zap size={20}/>} 
                            label="Play" 
                            onClick={() => handleAction('playing')} 
                            color="text-yellow-600 bg-yellow-50 hover:bg-yellow-100 hover:ring-yellow-200" 
                            disabled={activity !== 'idle'}
                        />
                        <ModernActionButton 
                            icon={<Moon size={20}/>} 
                            label="Sleep" 
                            onClick={() => handleAction('sleeping')} 
                            color="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:ring-indigo-200" 
                            disabled={activity !== 'idle'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODERN SUB-COMPONENTS ---

const ModernStatBar = ({ icon, label, value, color }) => (
    <div className="flex items-center gap-4">
        <div className="w-24 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
            {icon} {label}
        </div>
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 10 }}
                className={`h-full rounded-full ${color} shadow-sm`}
            />
        </div>
        <div className="w-8 text-right text-xs font-black text-gray-400 tabular-nums">{Math.round(value)}%</div>
    </div>
);

const ModernActionButton = ({ icon, label, onClick, color, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`
            flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all duration-200
            ${color} 
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
            hover:-translate-y-1 hover:shadow-lg focus:ring-4 focus:outline-none active:scale-95
        `}
    >
        <div className="p-2 bg-white rounded-full shadow-sm">{icon}</div>
        <span className="text-[11px] font-extrabold uppercase tracking-wide">{label}</span>
    </button>
);

export default VirtualPet;