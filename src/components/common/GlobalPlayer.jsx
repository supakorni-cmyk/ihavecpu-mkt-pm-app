// src/components/common/GlobalPlayer.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Maximize2, Minimize2, 
  Play, Pause, SkipBack, SkipForward 
} from 'lucide-react';

const GlobalPlayer = ({ mood, mode, setMode, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoTitle, setVideoTitle] = useState(''); 
  const [isLoadingTitle, setIsLoadingTitle] = useState(true);
  const iframeRef = useRef(null);

  // Reset state when mood changes
  useEffect(() => {
    setIsPlaying(true);
    setVideoTitle(''); 
    setIsLoadingTitle(true);
    
    // If title doesn't load in 3 seconds (due to adblock), stop showing "Loading..."
    const timer = setTimeout(() => setIsLoadingTitle(false), 3000);
    return () => clearTimeout(timer);
  }, [mood]);

  // --- LISTENER: Get Video Title from YouTube ---
  useEffect(() => {
    const handleMessage = (event) => {
        if (!event.origin.includes('youtube.com')) return;

        try {
            const data = JSON.parse(event.data);

            // Check for title in various event types
            const info = data.info || {};
            const title = info.videoData ? info.videoData.title : (info.title || null);

            if (title) {
                setVideoTitle(title);
                setIsLoadingTitle(false);
            }
            
            // Sync Play/Pause state if external controls (keyboard) are used
            if (info.playerState === 1) setIsPlaying(true);
            if (info.playerState === 2) setIsPlaying(false);

        } catch (error) {
            // Ignore parsing errors
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!mood || mode === 'hidden') return null;

  const isMini = mode === 'mini';

  // --- COMMAND SENDER ---
  const sendCommand = (command) => {
    if (iframeRef.current) {
        iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: command, args: [] }), 
            '*'
        );
    }
  };

  const handlePlayPause = () => {
      if (isPlaying) {
          sendCommand('pauseVideo');
      } else {
          sendCommand('playVideo');
      }
      setIsPlaying(!isPlaying);
  };

  return (
    <div 
      className={`fixed z-[9999] transition-all duration-300 shadow-2xl overflow-hidden bg-white border border-gray-200 flex
        ${isMini 
          ? 'bottom-4 right-4 w-96 h-28 rounded-xl items-center' 
          : 'bottom-4 right-4 w-96 h-[400px] rounded-2xl flex-col' 
        }
      `}
    >
      {/* --- VIDEO AREA --- */}
      <div className={`relative bg-black transition-all duration-300 group ${isMini ? 'w-32 h-full shrink-0' : 'w-full flex-1'}`}>
        <iframe 
            ref={iframeRef}
            className="w-full h-full object-cover pointer-events-none" 
            // ADDED: origin parameter to help with CORS/API connection
            src={`https://www.youtube.com/embed/videoseries?list=${mood.youtubeId}&autoplay=1&loop=1&enablejsapi=1&controls=0&modestbranding=1&origin=${window.location.origin}`}
            title="Music Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
        />
        {/* Click video to expand/shrink */}
        <div 
            className="absolute inset-0 bg-transparent cursor-pointer hover:bg-white/10 transition-colors" 
            onClick={() => setMode(isMini ? 'full' : 'mini')}
            title={isMini ? "Expand" : "Minimize"}
        ></div>
      </div>

      {/* --- CONTROLS AREA --- */}
      <div className={`flex-1 flex flex-col justify-center px-5 relative bg-white ${isMini ? 'h-full' : 'h-32 border-t border-gray-100 shrink-0'}`}>
        
        {/* Top Right Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
            <button onClick={() => setMode(isMini ? 'full' : 'mini')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">
                {isMini ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-full text-gray-400 transition">
                <X size={14} />
            </button>
        </div>

        {/* Title Info */}
        <div className="pr-6 mb-3 mt-1 overflow-hidden">
            {/* 1. Main Playlist Name */}
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                {mood.title}
            </p>
            
            {/* 2. Specific Video Name (With AdBlock Fallback) */}
            <h4 className="font-bold text-gray-800 text-sm truncate leading-tight" title={videoTitle || mood.title}>
                {videoTitle ? videoTitle : (isLoadingTitle ? "Loading track..." : "Mix Playlist")}
            </h4>

            {/* 3. Status Indicator */}
            <p className="text-[10px] text-gray-500 flex items-center gap-1.5 font-medium mt-1">
                {isPlaying ? (
                    <><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Now Playing</>
                ) : (
                    <><span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span> Paused</>
                )}
            </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-4">
            <button 
                onClick={() => sendCommand('previousVideo')} 
                className="text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-1.5 rounded-full transition active:scale-95"
                title="Previous Track"
            >
                <SkipBack size={20} fill="currentColor" />
            </button>

            <button 
                onClick={handlePlayPause}
                className="w-10 h-10 flex items-center justify-center bg-gray-900 text-white rounded-full hover:scale-105 active:scale-95 transition shadow-lg hover:shadow-xl hover:bg-black"
                title={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5"/>}
            </button>

            <button 
                onClick={() => sendCommand('nextVideo')} 
                className="text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-1.5 rounded-full transition active:scale-95"
                title="Next Track"
            >
                <SkipForward size={20} fill="currentColor" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlayer;