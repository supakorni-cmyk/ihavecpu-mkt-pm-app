// src/components/views/VirtualPet.jsx
import React, { useState } from 'react';
import { Heart, Zap, Utensils, Smile, Moon, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const VirtualPet = ({ pet, onAdopt, onInteract }) => {
    // --- CREATION STATE ---
    const [newPetName, setNewPetName] = useState("");
    const [selectedBreed, setSelectedBreed] = useState("cat_orange");
    const [selectedColor, setSelectedColor] = useState("#FDBA74");

    // Pet Types
    const BREEDS = [
        { id: 'cat_orange', name: 'Ginger Tabby', emoji: '🐱', color: '#FDBA74' },
        { id: 'cat_black', name: 'Void Kitty', emoji: '🐈‍⬛', color: '#374151' },
        { id: 'cat_siamese', name: 'Siamese', emoji: '🙀', color: '#E5E7EB' },
        { id: 'cat_calico', name: 'Calico', emoji: '😺', color: '#D97706' },
    ];

    // --- RENDER: ADOPTION CENTER (If no pet) ---
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
                    {/* Breed Selection */}
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

                    {/* Name & Confirm */}
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

    // --- RENDER: PET DASHBOARD (If pet exists) ---
    
    // Determine mood based on stats
    const getMoodEmoji = () => {
        if (pet.stats.happiness < 30) return "😿"; // Sad
        if (pet.stats.hunger < 30) return "😾";    // Hangry
        if (pet.stats.energy < 30) return "😴";    // Sleepy
        return BREEDS.find(b => b.id === pet.breed)?.emoji || "🐱"; // Normal
    };

    const getMoodText = () => {
        if (pet.stats.happiness < 30) return "Feeling lonely...";
        if (pet.stats.hunger < 30) return "So hungry!";
        if (pet.stats.energy < 30) return "Need a nap...";
        return "Feeling great!";
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-indigo-50 relative overflow-hidden mt-8">
            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full opacity-50 blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full opacity-50 blur-2xl"></div>
            
            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                
                {/* 1. Pet Avatar Area */}
                <div className="flex flex-col items-center min-w-[180px]">
                    <motion.div 
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-40 h-40 rounded-full bg-white border-4 border-white shadow-2xl flex items-center justify-center text-8xl relative cursor-pointer group"
                        onClick={() => onInteract('pet')}
                    >
                        {getMoodEmoji()}
                        
                        {/* Status Bubbles */}
                        {pet.stats.hunger < 30 && <div className="absolute top-0 right-0 text-2xl animate-bounce bg-white rounded-full p-1 shadow-md border border-gray-100">🍗</div>}
                        {pet.stats.energy < 30 && <div className="absolute top-0 left-0 text-2xl animate-pulse bg-white rounded-full p-1 shadow-md border border-gray-100">💤</div>}
                        
                        {/* Hover hint */}
                        <div className="absolute bottom-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-100">Click me!</div>
                    </motion.div>

                    <div className="text-center mt-4">
                        <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2 justify-center">
                            {pet.name} 
                            <Sparkles size={16} className="text-yellow-400 fill-yellow-400" />
                        </h3>
                        <p className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full mt-1 inline-block">
                            {getMoodText()}
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
                        <ActionButton icon={<Utensils size={20}/>} label="Feed" onClick={() => onInteract('feed')} color="hover:bg-green-50 hover:text-green-600 hover:border-green-200" />
                        <ActionButton icon={<Heart size={20}/>} label="Pet" onClick={() => onInteract('pet')} color="hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200" />
                        <ActionButton icon={<Zap size={20}/>} label="Play" onClick={() => onInteract('play')} color="hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200" />
                        <ActionButton icon={<Moon size={20}/>} label="Sleep" onClick={() => onInteract('sleep')} color="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" />
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

const ActionButton = ({ icon, label, onClick, color }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-95 bg-white text-gray-400 ${color} group`}
    >
        <div className="p-2 rounded-full bg-gray-50 group-hover:bg-white group-hover:shadow-md transition-all">
            {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
);

export default VirtualPet;