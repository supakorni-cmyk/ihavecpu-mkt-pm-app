// src/components/views/SelfHealView.jsx
import React, { useState } from 'react';
import { Heart, RefreshCw } from 'lucide-react';

const SelfHealView = () => {
    // List of relaxing YouTube video IDs (Lofi, Jazz, Nature, etc.)
    const videos = [
        "jfKfPfyJRdk", // Lofi Girl
        // "eKFTSSKCzWA", // Relaxing Jazz
        // "inpok4MKVLM", // Rainy Window
        // "Dx5qFachd3A", // Piano
        // "tEmt1Znux58", // Nature Sounds
        // "lTRiuFIWV54",  // Deep Focus
        "KhP8jEXA6MQ", // Rain - Pixxie
        "ApCdvrKngIw", // ใจฉันตามเธอไป
        "r-3G1JWR-4Q", // เจ้าหญิงคนต่อไป
    ];
    
    const [currentVideoId, setCurrentVideoId] = useState(videos[0]);

    const changeVideo = () => {
        // Pick a random video from the list
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * videos.length);
        } while (videos[newIndex] === currentVideoId && videos.length > 1);
        
        setCurrentVideoId(videos[newIndex]);
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
                    <Heart className="text-pink-500 fill-pink-500" size={32} />
                    Self Heal & Relax
                </h2>
                <p className="text-gray-500">Take a moment to breathe and recharge.</p>
            </div>

            <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden mb-8 border-4 border-white ring-4 ring-purple-100">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`} 
                    title="Relaxation Video" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                ></iframe>
            </div>

            <button 
                onClick={changeVideo} 
                className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl font-bold text-indigo-600 hover:scale-105 transition-transform"
            >
                <RefreshCw size={20} /> Change Atmosphere
            </button>
        </div>
    );
};

export default SelfHealView;