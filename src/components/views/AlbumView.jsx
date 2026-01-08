// src/components/views/AlbumView.jsx
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  ImageIcon, 
  Plus, 
  Loader2, 
  Upload, 
  Trash2, 
  ExternalLink 
} from 'lucide-react';

const PhotoAlbumView = ({ 
  albums, 
  photos, 
  onAddAlbum, 
  onAddPhoto, 
  onDeleteAlbum, 
  onDeletePhoto 
}) => {
    // --- Local State ---
    const [currentAlbum, setCurrentAlbum] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState('');

    // --- Derived State ---
    // Filter photos to only show ones belonging to the open album
    const albumPhotos = photos.filter(p => p.albumId === currentAlbum?.id);

    // --- Handlers ---
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
            onAddPhoto({ 
                url: reader.result, 
                name: file.name, 
                createdAt: new Date(), 
                albumId: currentAlbum.id 
            }); 
            setUploading(false); 
        }; 
        reader.readAsDataURL(file);
    };

    const handleDeletePhotoLocal = (id) => { 
        if (confirm("Delete photo?")) onDeletePhoto(id); 
    };

    const handleDeleteAlbumLocal = (e, id) => { 
        e.stopPropagation(); // Prevent opening the album when clicking delete
        if (confirm("Delete album?")) { 
            onDeleteAlbum(id); 
            // If we deleted the folder we are currently in, go back to root
            if (currentAlbum?.id === id) setCurrentAlbum(null); 
        } 
    };

    return (
        <div className="p-6 md:p-10 h-full w-full bg-gray-50/50 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                
                {/* Header Section */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        {currentAlbum && (
                            <button 
                                onClick={() => setCurrentAlbum(null)} 
                                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"
                            >
                                <ArrowLeft size={24} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                {currentAlbum ? (
                                    <>
                                        <Folder className="text-purple-600" /> {currentAlbum.name}
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="text-purple-600" /> Photo Albums
                                    </>
                                )}
                            </h2>
                        </div>
                    </div>

                    {/* Action Buttons (Create Album OR Upload Photo) */}
                    {!currentAlbum ? (
                        <div className="relative">
                            {isCreatingAlbum ? (
                                <form onSubmit={createAlbum} className="flex gap-2 animate-in fade-in slide-in-from-right-4">
                                    <input 
                                        autoFocus 
                                        type="text" 
                                        placeholder="Album Name" 
                                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                                        value={newAlbumName} 
                                        onChange={e => setNewAlbumName(e.target.value)} 
                                    />
                                    <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 transition">
                                        Save
                                    </button>
                                </form>
                            ) : (
                                <button 
                                    onClick={() => setIsCreatingAlbum(true)} 
                                    className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg hover:bg-purple-700 transition"
                                >
                                    <Plus size={20} /> Create Album
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="relative group">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                disabled={uploading} 
                            />
                            <button className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg group-hover:bg-purple-700 transition">
                                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />} 
                                {uploading ? 'Uploading...' : 'Upload Photo'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Grid */}
                {!currentAlbum ? (
                    // --- ALBUMS VIEW ---
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {albums.map(album => (
                            <div 
                                key={album.id} 
                                onClick={() => setCurrentAlbum(album)} 
                                className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center aspect-square relative"
                            >
                                <Folder size={64} className="text-purple-200 group-hover:text-purple-300 transition mb-4" />
                                <h3 className="font-bold text-gray-700 text-center truncate w-full px-2">{album.name}</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(album.createdAt).toLocaleDateString()}
                                </p>
                                <button 
                                    onClick={(e) => handleDeleteAlbumLocal(e, album.id)} 
                                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2 rounded-full hover:bg-red-50"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {albums.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400">
                                <Folder size={48} className="mb-2 opacity-50"/>
                                <p>No albums yet. Create one to start.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // --- PHOTOS VIEW ---
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {albumPhotos.map(photo => (
                            <div key={photo.id} className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition aspect-square border border-gray-100">
                                <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                    <a 
                                        href={photo.url} 
                                        download={photo.name} 
                                        className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition"
                                        title="Download/Open"
                                    >
                                        <ExternalLink size={20} />
                                    </a>
                                    <button 
                                        onClick={() => handleDeletePhotoLocal(photo.id)} 
                                        className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition"
                                        title="Delete"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {albumPhotos.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <ImageIcon size={48} className="mb-2 opacity-50"/>
                                <p>This album is empty.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PhotoAlbumView;