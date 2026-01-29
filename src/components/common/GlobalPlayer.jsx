// src/components/common/GlobalPlayer.jsx
import React, { useState } from 'react';
import { X, Maximize2, Minimize2, Music, Disc } from 'lucide-react';

const GlobalPlayer = ({ mood, mode, setMode, onClose }) => {
  if (!mood || mode === 'hidden') return null;

  const isMini = mode === 'mini';

  return (
    <div 
      className={`fixed z-[9999] transition-all duration-300 shadow-2xl overflow-hidden bg-white border border-gray-200
        ${isMini 
          ? 'bottom-4 right-4 w-80 h-24 rounded-xl flex items-center' 
          : 'bottom-4 right-4 w-96 h-80 rounded-2xl flex flex-col' // expanded floating mode
        }
      `}
    >
      {/* --- VIDEO AREA --- */}
      <div className={`relative bg-black transition-all duration-300 ${isMini ? 'w-24 h-full shrink-0' : 'w-full flex-1'}`}>
        {/* We keep the iframe mounted so audio doesn't stop */}
        <iframe 
            className="w-full h-full object-cover"
            src={`https://www.youtube.com/embed/videoseries?list=${mood.youtubeId}&autoplay=1&loop=1`}
            title="Music Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
        />
        {/* Overlay to prevent interaction in mini mode (optional) */}
        {isMini && <div className="absolute inset-0 bg-transparent cursor-pointer" onClick={() => setMode('full')} title="Expand"></div>}
      </div>

      {/* --- CONTROLS AREA --- */}
      <div className={`flex-1 flex flex-col justify-center px-4 relative ${isMini ? '' : 'h-24 bg-white border-t border-gray-100'}`}>
        
        {/* Title */}
        <div className="pr-8">
            <h4 className="font-bold text-gray-800 text-sm truncate">{mood.title}</h4>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Now Playing
            </p>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
            {isMini ? (
                <button onClick={() => setMode('full')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
                    <Maximize2 size={14} />
                </button>
            ) : (
                <button onClick={() => setMode('mini')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
                    <Minimize2 size={14} />
                </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-full text-gray-400">
                <X size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlayer;