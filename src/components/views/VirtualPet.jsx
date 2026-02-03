// src/components/views/VirtualPet.jsx
import React, { useState } from 'react';
import { Heart, Zap, Utensils, Moon, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 🐱 CUSTOM 8-BIT CAT COMPONENT (COLOR) ---
const PixelCat = ({ color, secondaryColor, activity }) => {
    const isSleeping = activity === 'sleeping';
    const isEating = activity === 'eating';

    return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
            {/* --- BODY --- */}
            {isSleeping ? (
                // SLEEPING POSE
                <path d="M2 10h12v4H2z" fill={color} />
            ) : (
                // SITTING POSE
                <>
                    <path d="M4 6h8v9H4z" fill={color} /> {/* Torso */}
                    <path d="M4 11h2v4H4z" fill={secondaryColor} opacity="0.6" /> {/* Left Leg */}
                    <path d="M10 11h2v4H10z" fill={secondaryColor} opacity="0.6" /> {/* Right Leg */}
                </>
            )}

            {/* --- HEAD --- */}
            <g transform={isSleeping ? "translate(4, 2)" : "translate(0, 0)"}>
                {/* Ears */}
                <path d="M3 2h2v2H3z M11 2h2v2H11z" fill={color} />
                {/* Face Base */}
                <path d="M3 4h10v5H3z" fill={color} />
                
                {/* Eyes */}
                {isSleeping ? (
                    <path d="M5 6h2v1H5z M9 6h2v1H9z" fill={secondaryColor} /> // Closed
                ) : (
                    <path d="M5 5h2v2H5z M9 5h2v2H9z" fill="#1a1a1a" /> // Open (Dark Grey)
                )}

                {/* Mouth */}
                {isEating ? (
                    <path d="M7 7h2v2H7z" fill="#ff9999" /> // Open (Pink)
                ) : (
                    <path d="M7 7h2v1H7z" fill={secondaryColor} /> // Closed
                )}
            </g>

            {/* --- TAIL --- */}
            {!isSleeping && (
                <path d="M12 10h2v-3h1v4h-3z" fill={secondaryColor} />
            )}
        </svg>
    );
};

const VirtualPet = ({ pet, onAdopt, onInteract }) => {
    // --- STATE ---
    const [newPetName, setNewPetName] = useState("");
    const [selectedBreed, setSelectedBreed] = useState("cat_orange");
    const [activity, setActivity] = useState('idle');
    const [clickCount, setClickCount] = useState(0);

    // --- 8-BIT COLOR BREEDS ---
    const BREEDS = [
        { id: 'cat_orange', name: 'Tabby', color: '#e09f3e', secondary: '#9e6d24' }, // Orange / Brown
        { id: 'cat_black', name: 'Void', color: '#2d3436', secondary: '#636e72' },   // Black / Dark Grey
        { id: 'cat_siamese', name: 'Siamese', color: '#dfe6e9', secondary: '#2d3436' }, // White / Black points
        { id: 'cat_calico', name: 'Calico', color: '#e17055', secondary: '#2d3436' },  // Rust / Black
    ];

    // --- ANIMATIONS ---
    const petVariants = {
        idle: { 
            y: [0, -1, 0], 
            transition: { repeat: Infinity, duration: 1.5, ease: "steps(2)" } 
        },
        eating: { 
            y: [0, 1, 0],
            transition: { repeat: Infinity, duration: 0.2, ease: "steps(2)" } 
        },
        playing: { 
            x: [-4, 4, -4], 
            rotate: [-2, 2, -2],
            transition: { duration: 0.5, ease: "steps(4)" } 
        },
        sleeping: { 
            scale: [1, 0.98, 1], 
            transition: { repeat: Infinity, duration: 2, ease: "linear" } 
        },
        petting: { 
            scale: [1, 1.1, 1], 
            transition: { duration: 0.2, ease: "steps(2)" } 
        }
    };

    const handleAction = (actionType) => {
        setActivity(actionType);
        onInteract(actionType);
        const duration = actionType === 'sleeping' ? 5000 : 2000;
        setTimeout(() => setActivity('idle'), duration);
    };

    // --- RENDER: ADOPTION SCREEN ---
    if (!pet) {
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
                
                {/* EGG SHELL */}
                <div className="relative bg-pink-400 w-full max-w-md p-8 rounded-[50%_50%_40%_40%] shadow-[0_10px_0_rgb(190,24,93)] border-4 border-pink-700">
                    
                    {/* SCREEN */}
                    <div className="bg-[#9ea73e] p-6 rounded-xl border-4 border-gray-700 shadow-inner mb-8 relative overflow-hidden font-['Press_Start_2P']">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] z-10 pointer-events-none bg-[length:100%_4px]"></div>
                        
                        <div className="text-center space-y-6 relative z-20">
                            <h2 className="text-[10px] text-gray-900 leading-relaxed tracking-widest">ADOPT A PET</h2>
                            
                            {/* Breed Selection */}
                            <div className="flex justify-center gap-4">
                                {BREEDS.map(breed => (
                                    <button 
                                        key={breed.id}
                                        onClick={() => setSelectedBreed(breed.id)}
                                        className={`w-12 h-12 border-2 p-1 rounded transition-all hover:scale-110 ${selectedBreed === breed.id ? 'border-gray-900 bg-[#8b9336]' : 'border-transparent opacity-60'}`}
                                    >
                                        <PixelCat color={breed.color} secondaryColor={breed.secondary} activity="idle" />
                                    </button>
                                ))}
                            </div>

                            <input 
                                type="text" 
                                value={newPetName}
                                onChange={(e) => setNewPetName(e.target.value)}
                                placeholder="NAME..."
                                className="w-full bg-[#8b9336] border-2 border-gray-800 p-2 text-[10px] text-center outline-none placeholder-gray-700 text-gray-900 uppercase"
                            />

                            <button 
                                onClick={() => onAdopt({ name: newPetName, breed: selectedBreed })}
                                disabled={!newPetName.trim()}
                                className="text-[10px] bg-gray-800 text-[#9ea73e] px-4 py-3 rounded shadow-md hover:bg-black w-full flex items-center justify-center gap-2"
                            >
                                START <ArrowRight size={10} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: TAMAGOTCHI GAME ---
    const breedData = BREEDS.find(b => b.id === pet.breed) || BREEDS[0];

    return (
        <div className="flex flex-col items-center justify-center mt-8">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

            {/* --- DEVICE SHELL --- */}
            <div className="relative bg-pink-400 w-80 h-96 rounded-[50%_50%_45%_45%] p-6 shadow-[0_12px_0_rgb(190,24,93)] border-4 border-pink-700 flex flex-col items-center">
                
                <div className="absolute top-4 text-pink-800 font-black text-[10px] tracking-widest opacity-50 font-sans">TAMAGOTCHI</div>

                {/* --- LCD SCREEN --- */}
                <div className="w-48 h-48 bg-[#9ea73e] border-4 border-gray-700 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col items-center justify-center mt-4">
                    
                    {/* Scanlines */}
                    <div className="absolute inset-0 pointer-events-none z-10 opacity-30" 
                         style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px' }}>
                    </div>

                    {/* PIXEL AVATAR */}
                    <motion.div 
                        variants={petVariants}
                        animate={activity}
                        className="w-24 h-24 z-0 cursor-pointer select-none filter drop-shadow-sm"
                        onClick={() => { setClickCount(c => c + 1); handleAction('petting'); }}
                    >
                        <PixelCat 
                            color={breedData.color} 
                            secondaryColor={breedData.secondary} 
                            activity={activity} 
                        />
                    </motion.div>

                    {/* Action Effects (Pixels) */}
                    <AnimatePresence>
                        {activity === 'eating' && (
                            <motion.div initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} exit={{opacity:0}} className="absolute top-4 right-8 text-xs font-['Press_Start_2P'] text-black">
                                +20
                            </motion.div>
                        )}
                        {activity === 'sleeping' && (
                            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{repeat:Infinity, duration:2}} className="absolute top-6 right-6 text-xs font-['Press_Start_2P'] text-black">
                                Zzz
                            </motion.div>
                        )}
                        {activity === 'petting' && (
                            <motion.div key={clickCount} initial={{y:0, opacity:1}} animate={{y:-20, opacity:0}} className="absolute top-4 text-xs text-black">
                                ♥
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Status Icons */}
                    <div className="absolute top-2 w-full px-2 flex justify-between opacity-70">
                        {pet.stats.hunger < 30 && <span className="animate-pulse text-xs">⚠️</span>}
                        {pet.stats.energy < 30 && <span className="animate-pulse text-xs">⚡</span>}
                    </div>
                </div>

                {/* --- CONTROLS --- */}
                <div className="flex justify-center gap-6 mt-8 w-full px-8">
                    <GameButton label="A" onClick={() => handleAction('eating')} icon={<Utensils size={14}/>} />
                    <GameButton label="B" onClick={() => handleAction('playing')} icon={<Zap size={14}/>} />
                    <GameButton label="C" onClick={() => handleAction('sleeping')} icon={<Moon size={14}/>} />
                </div>

                {/* Name */}
                <div className="font-['Press_Start_2P'] text-[10px] text-pink-900 mt-4 uppercase tracking-widest text-center truncate w-40">
                    {pet.name}
                </div>
            </div>

            {/* --- STATS READOUT --- */}
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
            className="w-10 h-10 rounded-full bg-yellow-400 border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all shadow-md flex items-center justify-center text-yellow-900"
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