// src/components/views/VirtualPet.jsx
import React, { useState } from 'react';
import { Heart, Zap, Utensils, Moon, Sparkles, Star, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VirtualPet = ({ pet, onAdopt, onInteract }) => {
    // --- STATE ---
    const [newPetName, setNewPetName] = useState("");
    const [selectedBreed, setSelectedBreed] = useState("real_orange");
    const [activity, setActivity] = useState('idle');
    const [clickCount, setClickCount] = useState(0);

    // --- 📸 REAL CAT ASSETS ---
    // You can replace these URLs with your own photos!
    const BREEDS = [
        { 
            id: 'real_orange', 
            name: 'Ginger', 
            image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=500&auto=format&fit=crop&q=60', // Orange Cat
            color: 'bg-orange-100 text-orange-700'
        },
        { 
            id: 'real_white', 
            name: 'Snowball', 
            image: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=500&auto=format&fit=crop&q=60', // White Cat
            color: 'bg-blue-50 text-blue-700'
        },
        { 
            id: 'real_black', 
            name: 'Midnight', 
            image: 'https://images.unsplash.com/photo-1557246565-8a3d3ab5d7f6?w=500&auto=format&fit=crop&q=60', // Black Cat
            color: 'bg-gray-100 text-gray-700'
        },
        { 
            id: 'real_tabby', 
            name: 'Tiger', 
            image: 'https://images.unsplash.com/photo-1529778873920-4da4926a7071?w=500&auto=format&fit=crop&q=60', // Tabby
            color: 'bg-emerald-50 text-emerald-700'
        },
    ];

    // --- ANIMATIONS (Optimized for Photos) ---
    const petVariants = {
        idle: { 
            y: [0, -5, 0], 
            scale: [1, 1.02, 1],
            transition: { repeat: Infinity, duration: 4, ease: "easeInOut" } 
        },
        eating: { 
            rotate: [0, -5, 5, 0],
            scale: [1, 1.1, 1],
            y: [0, 5, 0],
            transition: { repeat: Infinity, duration: 0.5 } 
        },
        playing: { 
            x: [-15, 15, -10, 10, 0], 
            y: [0, -20, 0, -10, 0], 
            rotate: [0, -10, 10, 0],
            transition: { duration: 0.8, type: "spring" } 
        },
        sleeping: { 
            scale: [1, 0.95, 1], 
            opacity: 0.8,
            filter: "brightness(0.7)", // Dim the lights for sleep
            y: 5,
            transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } 
        },
        petting: { 
            scale: 1.15, 
            filter: "brightness(1.1)",
            transition: { duration: 0.3 } 
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

    // --- 1. ADOPTION SCREEN ---
    if (!pet) {
        return (
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center max-w-2xl mx-auto mt-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"></div>
                
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Camera size={28} />
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Adoption Center</h2>
                    <p className="text-gray-500 mb-8 text-sm">Pick a companion to join your workspace.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">1. Choose Breed</label>
                            <div className="grid grid-cols-2 gap-3">
                                {BREEDS.map(breed => (
                                    <button 
                                        key={breed.id}
                                        onClick={() => setSelectedBreed(breed.id)}
                                        className={`relative group rounded-xl overflow-hidden aspect-square border-2 transition-all 
                                            ${selectedBreed === breed.id 
                                                ? `border-blue-500 ring-2 ring-blue-100 ring-offset-2` 
                                                : 'border-transparent hover:border-gray-200'
                                            }`}
                                    >
                                        <img src={breed.image} alt={breed.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-bold py-1 text-center backdrop-blur-sm">
                                            {breed.name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col justify-between">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">2. Name It</label>
                                <input 
                                    type="text" 
                                    value={newPetName}
                                    onChange={(e) => setNewPetName(e.target.value)}
                                    placeholder="e.g. Garfield"
                                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none font-bold text-gray-700 transition-all"
                                />
                            </div>

                            <button 
                                onClick={() => onAdopt({ name: newPetName, breed: selectedBreed })}
                                disabled={!newPetName.trim()}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-4 flex items-center justify-center gap-2"
                            >
                                <Heart size={18} className="fill-white" /> Adopt This Pet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- 2. PET DASHBOARD ---
    const breedData = BREEDS.find(b => b.id === pet.breed) || BREEDS[0];

    // Status Text
    const getStatusText = () => {
        if (activity === 'sleeping') return "Shh... Sleeping 💤";
        if (activity === 'eating') return "Eating... Yum! 🐟";
        if (activity === 'playing') return "Having fun! 🧶";
        if (pet.stats.hunger < 30) return "So hungry... 😿";
        return "Feeling happy! 😺";
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-blue-50 relative overflow-hidden mt-8">
            {/* Background Glow */}
            <div className={`absolute inset-0 opacity-20 transition-colors duration-1000 
                ${activity === 'sleeping' ? 'bg-indigo-900' : 
                  activity === 'playing' ? 'bg-yellow-100' : 
                  activity === 'eating' ? 'bg-green-100' : 'bg-blue-50'}`} 
            />
            
            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                
                {/* 🟢 AVATAR AREA (PHOTO) */}
                <div className="flex flex-col items-center justify-center min-w-[200px]">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                        
                        {/* Circle Backdrop */}
                        <div className={`absolute inset-2 rounded-full border-4 border-white shadow-inner opacity-50
                            ${activity === 'playing' ? 'bg-yellow-100' : 'bg-gray-100'}`} 
                        />

                        {/* THE REAL PHOTO */}
                        <motion.div 
                            variants={petVariants}
                            animate={activity}
                            className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl cursor-pointer z-10"
                            onClick={() => { setClickCount(c => c + 1); handleAction('petting'); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <img 
                                src={breedData.image} 
                                alt="Pet" 
                                className="w-full h-full object-cover"
                            />
                            
                            {/* Overlay for Sleep */}
                            {activity === 'sleeping' && (
                                <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[1px] flex items-center justify-center">
                                    <span className="text-3xl">💤</span>
                                </div>
                            )}
                        </motion.div>

                        {/* Floating Emojis */}
                        <AnimatePresence>
                            {activity === 'eating' && (
                                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:-20}} exit={{opacity:0}} className="absolute -right-2 top-0 text-4xl drop-shadow-md">🍗</motion.div>
                            )}
                            {activity === 'playing' && (
                                <motion.div initial={{opacity:0, scale:0}} animate={{opacity:1, scale:1.2}} exit={{opacity:0}} className="absolute -left-2 top-10 text-4xl drop-shadow-md">🎾</motion.div>
                            )}
                            {activity === 'petting' && (
                                <motion.div key={clickCount} initial={{y:0, opacity:1, scale:0.5}} animate={{y:-60, opacity:0, scale:1.5}} className="absolute top-0 text-pink-500 drop-shadow-sm">
                                    <Heart size={40} fill="currentColor" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="text-center mt-4">
                        <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2 justify-center">
                            {pet.name} 
                            {pet.stats.happiness > 90 && <Star size={20} className="text-yellow-400 fill-yellow-400 animate-spin-slow" />}
                        </h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 shadow-sm transition-colors duration-300 bg-white border border-gray-100 text-gray-500`}>
                            {getStatusText()}
                        </span>
                    </div>
                </div>

                {/* 2. Controls & Stats */}
                <div className="flex-1 w-full space-y-6">
                    
                    {/* Stats Bars */}
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
                            color="text-green-600 bg-green-50 hover:bg-green-100 hover:ring-2 hover:ring-green-200" 
                            disabled={activity !== 'idle'}
                        />
                        <ModernActionButton 
                            icon={<Heart size={20}/>} 
                            label="Pet" 
                            onClick={() => handleAction('petting')} 
                            color="text-pink-600 bg-pink-50 hover:bg-pink-100 hover:ring-2 hover:ring-pink-200" 
                            disabled={activity !== 'idle'}
                        />
                        <ModernActionButton 
                            icon={<Zap size={20}/>} 
                            label="Play" 
                            onClick={() => handleAction('playing')} 
                            color="text-yellow-600 bg-yellow-50 hover:bg-yellow-100 hover:ring-2 hover:ring-yellow-200" 
                            disabled={activity !== 'idle'}
                        />
                        <ModernActionButton 
                            icon={<Moon size={20}/>} 
                            label="Sleep" 
                            onClick={() => handleAction('sleeping')} 
                            color="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:ring-2 hover:ring-indigo-200" 
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