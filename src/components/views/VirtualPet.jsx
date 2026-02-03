// src/components/views/VirtualPet.jsx
import React, { useState } from 'react';
import { Heart, Zap, Utensils, Moon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VirtualPet = ({ pet, onAdopt, onInteract }) => {
    // --- STATE ---
    const [newPetName, setNewPetName] = useState("");
    const [selectedBreed, setSelectedBreed] = useState("cat_orange");
    const [activity, setActivity] = useState('idle');
    const [clickCount, setClickCount] = useState(0);

    // --- PIXEL ASSETS ---
    // We stick to emojis but filter them to look like LCD pixels
    const BREEDS = [
        { id: 'cat_orange', name: 'Tabby', emoji: '🐱' },
        { id: 'cat_black', name: 'Void', emoji: '🐈‍⬛' },
        { id: 'cat_siamese', name: 'Siamese', emoji: '🙀' },
        { id: 'cat_calico', name: 'Calico', emoji: '😺' },
    ];

    // --- ANIMATIONS ---
    const petVariants = {
        idle: { 
            y: [0, -4, 0], 
            transition: { repeat: Infinity, duration: 1, ease: "steps(2)" } // "steps" gives jerky 8-bit feel
        },
        eating: { 
            scale: [1, 1.1, 1], 
            y: [0, 2, 0],
            transition: { repeat: Infinity, duration: 0.5, ease: "steps(2)" } 
        },
        playing: { 
            x: [-10, 10, -10], 
            rotate: [-5, 5, -5],
            transition: { duration: 0.5, ease: "steps(4)" } 
        },
        sleeping: { 
            scale: [1, 0.9, 1], 
            opacity: 0.7,
            transition: { repeat: Infinity, duration: 2, ease: "steps(2)" } 
        },
        petting: { 
            scale: [1, 1.2, 1], 
            rotate: [0, 10, -10, 0],
            transition: { duration: 0.3, ease: "steps(3)" } 
        }
    };

    const handleAction = (actionType) => {
        setActivity(actionType);
        onInteract(actionType);
        const duration = actionType === 'sleeping' ? 5000 : 2000;
        setTimeout(() => setActivity('idle'), duration);
    };

    // --- 1. ADOPTION SCREEN (RETRO STYLE) ---
    if (!pet) {
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
                
                {/* EGG SHELL */}
                <div className="relative bg-pink-400 w-full max-w-md p-8 rounded-[50%_50%_40%_40%] shadow-[0_10px_0_rgb(190,24,93)] border-4 border-pink-700">
                    
                    {/* SCREEN */}
                    <div className="bg-[#9ea73e] p-6 rounded-xl border-4 border-gray-700 shadow-inner mb-8 relative overflow-hidden font-['Press_Start_2P']">
                        {/* Scanlines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,3px_100%]"></div>
                        
                        <div className="text-center space-y-6 relative z-20">
                            <h2 className="text-xs text-gray-900 leading-relaxed">ADOPT A PET</h2>
                            
                            {/* Breed Selection */}
                            <div className="flex justify-center gap-4">
                                {BREEDS.map(breed => (
                                    <button 
                                        key={breed.id}
                                        onClick={() => setSelectedBreed(breed.id)}
                                        className={`text-2xl transition-transform hover:scale-125 grayscale contrast-150 ${selectedBreed === breed.id ? 'scale-125 drop-shadow-md' : 'opacity-50'}`}
                                    >
                                        {breed.emoji}
                                    </button>
                                ))}
                            </div>

                            {/* Input */}
                            <input 
                                type="text" 
                                value={newPetName}
                                onChange={(e) => setNewPetName(e.target.value)}
                                placeholder="NAME..."
                                className="w-full bg-[#8b9336] border-2 border-gray-800 p-2 text-xs text-center outline-none placeholder-gray-700 text-gray-900 uppercase"
                            />

                            <button 
                                onClick={() => onAdopt({ name: newPetName, breed: selectedBreed })}
                                disabled={!newPetName.trim()}
                                className="text-[10px] bg-gray-800 text-[#9ea73e] px-4 py-2 rounded shadow-lg hover:bg-black w-full"
                            >
                                START GAME
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- 2. TAMAGOTCHI DASHBOARD ---
    
    // Convert current mood to Emoji
    const getAvatar = () => {
        const breedData = BREEDS.find(b => b.id === pet.breed) || BREEDS[0];
        if (activity === 'sleeping') return "💤"; // Zzz logic
        if (pet.stats.hunger < 30) return "💀"; // Hungry/Dead logic
        return breedData.emoji;
    };

    return (
        <div className="flex flex-col items-center justify-center mt-8">
            {/* Import Pixel Font */}
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

            {/* --- DEVICE SHELL --- */}
            <div className="relative bg-pink-400 w-80 h-96 rounded-[50%_50%_45%_45%] p-6 shadow-[0_12px_0_rgb(190,24,93)] border-4 border-pink-700 flex flex-col items-center">
                
                {/* Brand Logo */}
                <div className="absolute top-4 text-pink-800 font-black text-xs tracking-widest opacity-50">TAMAGOTCHI</div>

                {/* --- LCD SCREEN --- */}
                <div className="w-48 h-48 bg-[#9ea73e] border-4 border-gray-700 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col items-center justify-center mt-4">
                    
                    {/* Retro Scanlines Overlay */}
                    <div className="absolute inset-0 pointer-events-none z-10 opacity-20" 
                         style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px' }}>
                    </div>

                    {/* PIXEL AVATAR */}
                    <motion.div 
                        variants={petVariants}
                        animate={activity}
                        className="text-6xl filter grayscale contrast-200 drop-shadow-md z-0 cursor-pointer select-none"
                        onClick={() => { setClickCount(c => c + 1); handleAction('petting'); }}
                    >
                        {getAvatar()}
                    </motion.div>

                    {/* Animations/Bubbles */}
                    <AnimatePresence>
                        {activity === 'eating' && <motion.div initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} exit={{opacity:0}} className="absolute top-4 text-2xl grayscale contrast-200">🍖</motion.div>}
                        {activity === 'playing' && <motion.div initial={{scale:0}} animate={{scale:1}} exit={{scale:0}} className="absolute bottom-4 text-2xl grayscale contrast-200">⚽</motion.div>}
                        {activity === 'petting' && <motion.div key={clickCount} initial={{y:0, opacity:1}} animate={{y:-30, opacity:0}} className="absolute top-2 text-xl text-black">♥</motion.div>}
                    </AnimatePresence>

                    {/* STATUS ICONS (Top of Screen) */}
                    <div className="absolute top-2 w-full px-2 flex justify-between opacity-60">
                        {pet.stats.hunger < 30 && <span className="animate-pulse">🍔</span>}
                        {pet.stats.energy < 30 && <span className="animate-pulse">⚡</span>}
                    </div>
                </div>

                {/* --- PHYSICAL BUTTONS --- */}
                <div className="flex justify-center gap-6 mt-8 w-full px-8">
                    <GameButton label="A" onClick={() => handleAction('eating')} icon={<Utensils size={16}/>} />
                    <GameButton label="B" onClick={() => handleAction('playing')} icon={<Zap size={16}/>} />
                    <GameButton label="C" onClick={() => handleAction('sleeping')} icon={<Moon size={16}/>} />
                </div>

                {/* Name Label */}
                <div className="font-['Press_Start_2P'] text-[10px] text-pink-900 mt-4 uppercase tracking-widest text-center">
                    {pet.name}
                </div>
            </div>

            {/* --- STATS READOUT (External) --- */}
            <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-md font-['Press_Start_2P']">
                <PixelStat label="HUN" value={pet.stats.hunger} />
                <PixelStat label="HAP" value={pet.stats.happiness} />
                <PixelStat label="NRG" value={pet.stats.energy} />
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const GameButton = ({ label, onClick, icon }) => (
    <div className="flex flex-col items-center gap-1">
        <button 
            onClick={onClick}
            className="w-10 h-10 rounded-full bg-yellow-400 border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all shadow-md flex items-center justify-center text-yellow-800"
        >
            {icon}
        </button>
        <span className="text-[8px] font-bold text-pink-800 font-sans">{label}</span>
    </div>
);

const PixelStat = ({ label, value }) => (
    <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[8px] text-gray-500 mb-1">
            <span>{label}</span>
            <span>{Math.round(value)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-none border border-gray-400 p-[1px]">
            <div 
                className="h-full bg-gray-800" 
                style={{ width: `${value}%` }}
            ></div>
        </div>
    </div>
);

export default VirtualPet;