// src/components/views/SelfHealView.jsx
import React, { useState, useEffect } from 'react';
import { Heart, Coffee, Music, BookOpen, RefreshCw, PlayCircle } from 'lucide-react';

// --- 🎵 MOOD PLAYLIST CONFIGURATION 🎵 ---
const MOODS = [
  { 
    id: "relax",
    title: "Relax & Focus",
    youtubeId: "PL0vfts4VzfNigohKr5sPrixYSl8Etq6OX", 
    image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80",
    color: "from-blue-400 to-indigo-500"
  },
  { 
    id: "rage",
    title: "Rage Out!",
    youtubeId: "PLhd1RvZtrYl8H4YqD2kDrO38aZ6Vj_q1H", 
    image: "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=400&q=80",
    color: "from-red-500 to-orange-600"
  },
  { 
    id: "love",
    title: "In Love",
    youtubeId: "PLC8F6C76918B22756", 
    image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80",
    color: "from-pink-400 to-rose-500"
  },
  { 
    id: "hiphop",
    title: "Hip Hop Beats",
    youtubeId: "PLozxDs0W75a-L6gMa-t6ge_6-7F1Sft_", 
    image: "https://images.unsplash.com/photo-1605722243979-fe0be81929d9?w=400&q=80",
    color: "from-purple-500 to-violet-600"
  }
];

const QUOTES = [
  { text: "Rest is not idleness, it's the key to better work.", author: "Anonymous" },
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott" },
  { text: "Your mind will answer most questions if you learn to relax and wait for the answer.", author: "William S. Burroughs" },
  { text: "Breathe. It’s just a bad day, not a bad life.", author: "Just Breathe" },
  { text: "You can’t pour from an empty cup. Take care of yourself first.", author: "Self Care" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" }
];

const SelfHealView = () => {
  const [currentMood, setCurrentMood] = useState(MOODS[0]);
  const [quote, setQuote] = useState(QUOTES[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const randomizeQuote = () => {
    setIsAnimating(true);
    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * QUOTES.length);
        setQuote(QUOTES[randomIndex]);
        setIsAnimating(false);
    }, 200);
  };

  useEffect(() => { randomizeQuote(); }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 mb-8 shadow-sm">
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          Self Heal Zone <Heart className="text-pink-500 fill-pink-500 animate-pulse" />
        </h1>
        <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
          <Coffee size={18} /> Choose your vibe. Recharge.
        </p>
      </header>

      <div className="px-8 pb-12 max-w-7xl mx-auto w-full space-y-8">
        
        {/* --- TOP ROW: PLAYER & QUOTE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Player Container */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden relative group">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${currentMood.color}`}></div>
                
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Music className="text-indigo-500" /> 
                        {currentMood.title}
                    </h3>
                    <span className="text-xs font-bold bg-pink-100 text-pink-600 px-3 py-1 rounded-full uppercase tracking-wider">
                        Auto-Play
                    </span>
                </div>

                <div className="aspect-video w-full bg-black relative">
                    <iframe 
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/videoseries?list=${currentMood.youtubeId}`}
                        title="YouTube video player" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                    ></iframe>
                </div>
            </div>

            {/* Quote Card */}
            <div className={`bg-gradient-to-br ${currentMood.color} rounded-3xl p-8 text-white shadow-lg flex flex-col justify-between relative overflow-hidden min-h-[300px]`}>
                <Heart className="absolute -bottom-10 -right-10 text-white opacity-10" size={200} />
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <BookOpen className="text-white/80" size={32} />
                        <button 
                            onClick={randomizeQuote}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition active:scale-95 backdrop-blur-sm"
                        >
                            <RefreshCw size={20} className={isAnimating ? "animate-spin" : ""} />
                        </button>
                    </div>

                    <div className={`transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                        <h2 className="text-2xl lg:text-3xl font-black mb-4 leading-tight">
                            "{quote.text}"
                        </h2>
                        <p className="text-white/80 font-medium italic">
                            — {quote.author}
                        </p>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/20">
                    <p className="font-medium text-white/90">
                        Don't forget to drink water!
                    </p>
                </div>
            </div>
        </div>

        {/* --- BOTTOM ROW: MOOD SELECTOR --- */}
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PlayCircle size={20} className="text-gray-400" /> Select Your Mood
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {MOODS.map((mood) => (
                    <div 
                        key={mood.id}
                        onClick={() => setCurrentMood(mood)}
                        className={`
                            relative h-40 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300
                            ${currentMood.id === mood.id ? 'ring-4 ring-indigo-500 ring-offset-2 scale-[1.02]' : 'hover:-translate-y-1 hover:shadow-xl'}
                        `}
                    >
                        {/* Background Image */}
                        <img 
                            src={mood.image} 
                            alt={mood.title} 
                            className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-110"
                        />
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                        
                        {/* Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                            <span className="text-white font-black text-xl drop-shadow-md tracking-tight">
                                {mood.title}
                            </span>
                            {currentMood.id === mood.id && (
                                <span className="mt-2 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in">
                                    PLAYING
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default SelfHealView;