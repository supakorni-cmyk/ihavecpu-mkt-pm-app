// src/components/views/SelfHealView.jsx
import React, { useState, useEffect } from 'react';
import { Heart, Coffee, Music, BookOpen, RefreshCw, PlayCircle, Cat } from 'lucide-react';

// --- 🎵 MOOD PLAYLIST CONFIGURATION 🎵 ---
const MOODS = [
  { 
    id: "relax",
    title: "Relax & Focus",
    youtubeId: "PL4QNnZJr8sRPmuz_d87ygGR6YAYEF-fmw", 
    image: "https://images.unsplash.com/photo-1601435119596-7cc938a5cbf4?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-blue-400 to-indigo-500"
  },
  { 
    id: "rage",
    title: "Rage Out!",
    youtubeId: "PLe3UPCHpSqZkYD5f7jKblv0ZQ9XmkGjjZ", 
    image: "https://images.unsplash.com/photo-1738214997766-93b0c56bfce6?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-red-500 to-orange-600"
  },
  { 
    id: "love",
    title: "In Love",
    youtubeId: "PLgzTt0k8mXzE6H9DDgiY7Pd8pKZteis48", 
    image: "https://images.unsplash.com/photo-1518104593124-ac2e82a5eb9d?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-pink-400 to-rose-500"
  },
  { 
    id: "hiphop",
    title: "Hip Hop Beats",
    youtubeId: "PLwNv9Hhd8gZjeee8SBwokNf2JhqBvYqeB", 
    image: "https://images.unsplash.com/photo-1713450605253-832df45f9032?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-purple-500 to-violet-600"
  },
  {
    id: "thai",
    title: "ฉันฟังเพลงไทยจ้า",
    youtubeId: "PLrDUi3beimz7D4BdUUGhpUGlxKHg8CQup", 
    image: "https://plus.unsplash.com/premium_photo-1690958385472-b8e011570ceb?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-red-500 to-blue-600"
  },
  {
    id: "edm",
    title: "Let's Dance!",
    youtubeId: "PL3oW2tjiIxvQ60uIjLdo7vrUe4ukSpbKl", 
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-pink-500 to-violet-600"
  },
  {
    id: "folk",
    title: "ฉันฟังลูกทุ่ง",
    youtubeId: "PLAOHQrWWN5WYuN2UX3sTi9U5RePGMDmj-", 
    image: "https://images.unsplash.com/photo-1684716091108-70c2b19db377?q=80&w=1750&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-pink-500 to-orange-600"
  },
    {
    id: "citypop",
    title: "City Pop",
    youtubeId: "PLgf-8GQFjABq2XqYIaYD4C_uIZ4jLL4x-", 
    image: "https://plus.unsplash.com/premium_photo-1666700698920-d2d2bba589f8?q=80&w=2064&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-blue-500 to-pink-600"
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
  const [cats, setCats] = useState([]); // <--- NEW: Cat State

  const randomizeQuote = () => {
    setIsAnimating(true);
    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * QUOTES.length);
        setQuote(QUOTES[randomIndex]);
        setIsAnimating(false);
    }, 200);
  };

  // --- CAT LOGIC ---
  const fetchCats = async () => {
      try {
          // Fetches 4 random cat images
          const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
          const data = await res.json();
          setCats(data);
      } catch (error) {
          console.error("Failed to fetch cats:", error);
      }
  };

  useEffect(() => { 
      randomizeQuote(); 
      fetchCats(); // <--- Fetch cats on load
  }, []);

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
                <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${currentMood.color}`}></div>
                
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Music className="text-indigo-500" /> 
                        {currentMood.title}
                    </h3>
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
        {/* --- 🐱 NEW SECTION: RANDOM CAT GRID 🐱 --- */}
        <div className="border-t border-gray-100 pt-8">
            <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Cat size={24} className="text-orange-500" /> Instant Serotonin
                </h3>
                <button 
                    onClick={fetchCats} 
                    className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-full font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition shadow-sm"
                >
                    <RefreshCw size={14} /> Refresh Cats
                </button>
            </div>
            
            {cats.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {cats.map((cat, index) => (
                        <div key={index} className="aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group bg-gray-100">
                            <img 
                                src={cat.url} 
                                alt="Random Cat" 
                                className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                    Loading cute cats...
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SelfHealView;