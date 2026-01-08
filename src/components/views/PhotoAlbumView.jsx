import React, { useState } from 'react';
import { 
  FileReader,Date
} from 'lucide-react';


const PhotoAlbumView = ({ albums, photos, onAddAlbum, onAddPhoto, onDeleteAlbum, onDeletePhoto }) => {
    const [currentAlbum, setCurrentAlbum] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState('');

    const createAlbum = (e) => { 
        e.preventDefault(); 
        if (!newAlbumName) return; 
        onAddAlbum({ name: newAlbumName, createdAt: new Date() });
        setNewAlbumName(''); 
        setIsCreatingAlbum(false); 
    };

    const handleUpload = (e) => {
        const file = e.target.files[0]; 
        if (!file || file.size > 2e6) return alert("File too large (>2MB)"); 
        setUploading(true);
        const reader = new FileReader(); 
        reader.onloadend = () => { 
            onAddPhoto({ url: reader.result, name: file.name, createdAt: new Date(), albumId: currentAlbum.id }); 
            setUploading(false); 
        }; 
        reader.readAsDataURL(file);
    };

    const handleDeletePhotoLocal = (id) => { if (confirm("Delete photo?")) onDeletePhoto(id); };
    const handleDeleteAlbumLocal = (e, id) => { 
        e.stopPropagation(); 
        if (confirm("Delete album?")) { 
            onDeleteAlbum(id); 
            if (currentAlbum?.id === id) setCurrentAlbum(null); 
        } 
    };

    const albumPhotos = photos.filter(p => p.albumId === currentAlbum?.id);

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-50/50 overflow-y-auto"><div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">{currentAlbum && <button onClick={() => setCurrentAlbum(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><ArrowLeft size={24} /></button>}<div><h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">{currentAlbum ? <><Folder className="text-purple-600" /> {currentAlbum.name}</> : <><ImageIcon className="text-purple-600" /> Photo Albums</>}</h2></div></div>
                {!currentAlbum ? <div className="relative">{isCreatingAlbum ? <form onSubmit={createAlbum} className="flex gap-2"><input autoFocus type="text" placeholder="Album Name" className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)} /><button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button></form> : <button onClick={() => setIsCreatingAlbum(true)} className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg"><Plus size={20} /> Create Album</button>}</div> : <div className="relative"><input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={uploading} /><button className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg">{uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />} Upload</button></div>}
            </div>
            {!currentAlbum ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{albums.map(album => (<div key={album.id} onClick={() => setCurrentAlbum(album)} className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center aspect-square relative"><Folder size={64} className="text-purple-200 group-hover:text-purple-300 transition mb-4" /><h3 className="font-bold text-gray-700 text-center">{album.name}</h3><p className="text-xs text-gray-400 mt-1">{new Date(album.createdAt).toLocaleDateString()}</p><button onClick={(e) => handleDeleteAlbumLocal(e, album.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button></div>))}</div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{albumPhotos.map(photo => (<div key={photo.id} className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition aspect-square"><img src={photo.url} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2"><a href={photo.url} download={photo.name} className="p-2 bg-white/20 text-white rounded-full"><ExternalLink size={20} /></a><button onClick={() => handleDeletePhotoLocal(photo.id)} className="p-2 bg-red-500/80 text-white rounded-full"><Trash2 size={20} /></button></div></div>))}</div>}
        </div></div>
    );
};

export default PhotoAlbumView;