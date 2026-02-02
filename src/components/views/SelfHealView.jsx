// src/components/views/SelfHealView.jsx
import React, { useState, useEffect } from 'react';
import { Heart, Coffee, Music, BookOpen, RefreshCw, PlayCircle, Cat, PauseCircle } from 'lucide-react';
import VirtualPet from './VirtualPet'; 
import { useTaskData } from '../../hooks/useTaskData'; 

// --- MOOD CONFIGURATION ---
export const MOODS = [
  { 
    id: "relax",
    title: "Relax & Focus",
    youtubeId: "PL4QNnZJr8sRPmuz_d87ygGR6YAYEF-fmw", 
    image: "https://images.unsplash.com/photo-1601435119596-7cc938a5cbf4?q=80&w=1740&auto=format&fit=crop",
    color: "from-blue-400 to-indigo-500"
  },
  { 
    id: "rage",
    title: "Rage Out!",
    youtubeId: "PLe3UPCHpSqZkYD5f7jKblv0ZQ9XmkGjjZ", 
    image: "https://images.unsplash.com/photo-1738214997766-93b0c56bfce6?q=80&w=1740&auto=format&fit=crop",
    color: "from-red-500 to-orange-600"
  },
  { 
    id: "love",
    title: "In Love",
    youtubeId: "PLgzTt0k8mXzE6H9DDgiY7Pd8pKZteis48", 
    image: "https://images.unsplash.com/photo-1518104593124-ac2e82a5eb9d?q=80&w=1740&auto=format&fit=crop",
    color: "from-pink-400 to-rose-500"
  },
  { 
    id: "hiphop",
    title: "Hip Hop Beats",
    youtubeId: "PLwNv9Hhd8gZjeee8SBwokNf2JhqBvYqeB", 
    image: "https://images.unsplash.com/photo-1713450605253-832df45f9032?q=80&w=1740&auto=format&fit=crop",
    color: "from-purple-500 to-violet-600"
  },
  {
    id: "thai",
    title: "ฉันฟังเพลงไทยจ้า",
    youtubeId: "PLrDUi3beimz7D4BdUUGhpUGlxKHg8CQup", 
    image: "https://plus.unsplash.com/premium_photo-1690958385472-b8e011570ceb?q=80&w=1740&auto=format&fit=crop",
    color: "from-red-500 to-blue-600"
  },
  {
    id: "edm",
    title: "Let's Dance!",
    youtubeId: "PL3oW2tjiIxvQ60uIjLdo7vrUe4ukSpbKl", 
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1740&auto=format&fit=crop",
    color: "from-pink-500 to-violet-600"
  },
  {
    id: "folk",
    title: "ฉันฟังลูกทุ่ง",
    youtubeId: "PLAOHQrWWN5WYuN2UX3sTi9U5RePGMDmj-", 
    image: "https://images.unsplash.com/photo-1684716091108-70c2b19db377?q=80&w=1750&auto=format&fit=crop",
    color: "from-pink-500 to-orange-600"
  },
  {
    id: "citypop",
    title: "City Pop",
    youtubeId: "PLgf-8GQFjABq2XqYIaYD4C_uIZ4jLL4x-", 
    image: "https://plus.unsplash.com/premium_photo-1666700698920-d2d2bba589f8?q=80&w=2064&auto=format&fit=crop",
    color: "from-blue-500 to-pink-600"
  }
];

const QUOTES = [
  { text: "Rest is not idleness, it's the key to better work.", author: "Anonymous" },
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott" },
  { text: "You don’t have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
  { text: "Self-care is not self-indulgence, it is self-preservation.", author: "Audre Lorde" },
];

const SelfHealView = ({ onPlay, currentMoodId, currentUser }) => {
  const [quote, setQuote] = useState(QUOTES[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cats, setCats] = useState([]);

  // 🟢 Load Pet Data
  const { myPet, adoptPet, interactWithPet } = useTaskData(currentUser);

  const randomizeQuote = () => {
    setIsAnimating(true);
    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * QUOTES.length);
        setQuote(QUOTES[randomIndex]);
        setIsAnimating(false);
    }, 200);
  };

  const fetchCats = async () => {
      try {
          const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=4');
          const data = await res.json();
          setCats(data);
      } catch (error) { console.error("Failed to fetch cats:", error); }
  };

  useEffect(() => { 
      randomizeQuote(); 
      fetchCats(); 
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 mb-8 shadow-sm">
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          Self Heal Zone <Heart className="text-pink-500 fill-pink-500 animate-pulse" />
        </h1>
        <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
          <Coffee size={18} /> Choose your vibe. Recharge.
        </p>
      </header>

      <div className="px-8 pb-12 max-w-7xl mx-auto w-full space-y-12">
        
        {/* Quote Card */}
        <div className="w-full">
            <div className={`bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-10 text-white shadow-xl flex flex-col justify-between relative overflow-hidden min-h-[250px]`}>
                <Heart className="absolute -bottom-10 -right-10 text-white opacity-10" size={200} />
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <BookOpen className="text-white/80" size={32} />
                        <button onClick={randomizeQuote} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition active:scale-95 backdrop-blur-sm">
                            <RefreshCw size={20} className={isAnimating ? "animate-spin" : ""} />
                        </button>
                    </div>
                    <div className={`transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                        <h2 className="text-3xl font-black mb-4 leading-tight">"{quote.text}"</h2>
                        <p className="text-white/80 font-medium italic">— {quote.author}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Mood Selector */}
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PlayCircle size={20} className="text-gray-400" /> Select Your Mood
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {MOODS.map((mood) => {
                    const isPlaying = currentMoodId === mood.id;
                    return (
                        <div 
                            key={mood.id}
                            onClick={() => onPlay(mood)} 
                            className={`
                                relative h-48 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 shadow-md
                                ${isPlaying ? 'ring-4 ring-green-500 ring-offset-2 scale-[1.02]' : 'hover:-translate-y-1 hover:shadow-xl'}
                            `}
                        >
                            <img src={mood.image} alt={mood.title} className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                            <div className={`absolute inset-0 transition-colors ${isPlaying ? 'bg-green-900/40' : 'bg-black/40 group-hover:bg-black/20'}`}></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                {isPlaying ? (
                                    <PauseCircle size={40} className="text-white mb-2 animate-pulse" />
                                ) : (
                                    <PlayCircle size={40} className="text-white mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition" />
                                )}
                                <span className="text-white font-black text-lg drop-shadow-md tracking-tight leading-none">
                                    {mood.title}
                                </span>
                                {isPlaying && (
                                    <span className="mt-2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm animate-in zoom-in">
                                        PLAYING NOW
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Cats Section */}
        <div className="border-t border-gray-100 pt-8">
            <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Cat size={24} className="text-orange-500" /> Instant Serotonin
                </h3>
                <button onClick={fetchCats} className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-full font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition shadow-sm">
                    <RefreshCw size={14} /> Refresh Cats
                </button>
            </div>
            {cats.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {cats.map((cat, index) => (
                        <div key={index} className="aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group bg-gray-100">
                            <img src={cat.url} alt="Random Cat" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">Loading cute cats...</div>
            )}
        </div>

        {/* 🟢 VIRTUAL PET SECTION */}
        <div className="border-t border-gray-100 pt-8">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Heart size={24} className="text-red-500" /> Your Virtual Companion
            </h3>
            <VirtualPet 
                pet={myPet} 
                onAdopt={adoptPet} 
                onInteract={interactWithPet} 
            />
        </div>

      </div>
    </div>
  );
};

export default SelfHealView;