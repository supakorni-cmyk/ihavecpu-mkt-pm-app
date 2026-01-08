import React, { useState } from 'react';

const SelfHealView = () => {
    const videos = ["jfKfPfyJRdk", "eKFTSSKCzWA", "inpok4MKVLM", "Dx5qFachd3A", "tEmt1Znux58", "lTRiuFIWV54"];
    const [currentVideoId, setCurrentVideoId] = useState(videos[0]);
    return (<div className="h-full w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50"><div className="text-center mb-8"><h2 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3"><Heart className="text-pink-500 fill-pink-500" size={32} />Self Heal & Relax</h2></div><div className="w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden mb-8 border-4 border-white"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`} title="YouTube" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div><button onClick={() => setCurrentVideoId(videos[Math.floor(Math.random() * videos.length)])} className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl font-bold text-indigo-600"><RefreshCw size={20} /> Change Atmosphere</button></div>);
};

export default SelfHealView;