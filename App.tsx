import React, { useState, useRef, useEffect } from 'react';
import { HandTracker } from './services/handTracker';
import { GestureState, HandData, PhotoData } from './types';
import Scene from './components/Scene';
import { Camera, Image as ImageIcon, Hand, Sparkles, Move, Info, X, Loader2, Wand2, Plus, Eye } from 'lucide-react';

const App: React.FC = () => {
  const [handData, setHandData] = useState<HandData>({
    state: GestureState.NONE, x: 0.5, y: 0.5, rotation: { x: 0, y: 0 }
  });
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<HandTracker | null>(null);

  const startCamera = async () => {
    if (isInitializing || cameraActive) return;
    setIsInitializing(true);
    try {
      trackerRef.current = new HandTracker(videoRef.current!, (data) => {
        let state = data.state;
        if (data.state === GestureState.OPEN) state = GestureState.CHAOS;
        if (data.state === GestureState.FIST) state = GestureState.FORMED;
        setHandData({ ...data, state });
      });
      await trackerRef.current.start();
      setCameraActive(true);
    } catch (error: any) {
      alert(`Initialization Error: ${error.message}`);
    } finally { setIsInitializing(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          const maxDim = 100;
          const scale = Math.min(maxDim / img.width, maxDim / img.height);
          canvas.width = img.width * scale; canvas.height = img.height * scale;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const newPhoto: PhotoData = {
            id: Math.random().toString(36).substr(2, 9),
            data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
            w: canvas.width,
            h: canvas.height,
            aspect: img.width / img.height,
            url: event.target?.result as string
          };
          setPhotos(prev => {
            const newList = [...prev, newPhoto].slice(-12);
            setSelectedPhotoIndex(newList.length - 1); // 自动聚焦到最新上传
            return newList;
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#000a06]">
      <Scene handData={handData} photos={photos} selectedIndex={selectedPhotoIndex} />

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12 z-10 font-inter">
        <header className="flex justify-between items-start">
          <div className="animate-[fade-in_1s_ease-out]">
            <h1 className="text-7xl font-black font-cinzel text-[#ffeb99] luxury-glow leading-tight">
              NOËL <br/><span className="text-4xl font-light tracking-[0.3em] text-[#d4af37]">GALLERY</span>
            </h1>
            <div className="h-px w-48 bg-gradient-to-r from-[#ffd700] to-transparent mt-4"></div>
            <p className="text-[#ffd700]/60 text-[10px] mt-4 font-bold tracking-[0.6em] uppercase">Hand Motion Kinetic Universe</p>
          </div>
          
          <div className="flex flex-col items-end gap-8 pointer-events-auto">
            {!cameraActive ? (
              <button 
                onClick={startCamera}
                disabled={isInitializing}
                className="group glass-card flex items-center gap-6 px-12 py-6 rounded-full hover:scale-105 transition-all duration-700 shadow-[0_0_40px_rgba(255,215,0,0.1)] border-[#ffeb99]/40"
              >
                {isInitializing ? <Loader2 className="w-6 h-6 text-[#ffeb99] animate-spin" /> : <Wand2 className="w-6 h-6 text-[#ffeb99]" />}
                <span className="text-[#ffeb99] font-black text-xs tracking-[0.4em] uppercase font-cinzel">
                  {isInitializing ? 'Awakening...' : 'Enter Sanctuary'}
                </span>
              </button>
            ) : (
              <div className="glass-card p-4 rounded-3xl border-l-4 border-[#ffeb99] flex items-center gap-4">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]" />
                 <div className="text-[9px] text-[#ffeb99] font-black uppercase tracking-[0.4em]">Tracking Synchronized</div>
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setShowHelp(true)} className="p-6 glass-card rounded-full text-[#ffeb99] hover:bg-[#ffeb99] hover:text-[#000a06] transition-all border-[#ffeb99]/20">
                <Info className="w-6 h-6" />
              </button>
              <label className="glass-card flex items-center gap-6 px-10 py-6 rounded-full cursor-pointer hover:bg-[#ffeb99]/10 transition-all border border-[#ffd700]/30 shadow-[0_0_20px_rgba(255,215,0,0.1)] group">
                <Plus className="w-6 h-6 text-[#ffeb99] group-hover:rotate-90 transition-all duration-500" />
                <span className="text-[#ffeb99] font-black text-[10px] tracking-[0.3em] uppercase">Upload Memory</span>
                <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>
        </header>

        {/* 缩略图列表 - 现在可以点击切换焦点 */}
        <div className="flex flex-wrap gap-4 max-w-md pointer-events-auto">
          {photos.map((p, idx) => (
            <button 
              key={p.id} 
              onClick={() => setSelectedPhotoIndex(idx)}
              className={`w-16 h-16 rounded-lg overflow-hidden border p-1 transform hover:scale-125 transition-all shadow-xl group relative
                ${selectedPhotoIndex === idx ? 'border-[#ffeb99] ring-2 ring-[#ffeb99]/50 scale-110 bg-[#ffeb99]/10' : 'border-[#ffeb99]/20 glass-card opacity-60 hover:opacity-100'}`}
            >
               <img src={p.url} className="w-full h-full object-cover rounded-sm" />
               {selectedPhotoIndex === idx && (
                 <div className="absolute inset-0 bg-[#ffeb99]/20 animate-pulse pointer-events-none" />
               )}
            </button>
          ))}
        </div>

        <footer className="flex justify-between items-end pointer-events-auto">
          <div className="flex gap-16">
            {[
              { icon: Sparkles, state: GestureState.FORMED, label: 'Tree' },
              { icon: Move, state: GestureState.CHAOS, label: 'Nebula' },
              { icon: Eye, state: GestureState.PINCH, label: 'View Photo' }
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center gap-5 transition-all duration-700 ${handData.state === item.state ? 'opacity-100 scale-110 translate-y-[-10px]' : 'opacity-20 hover:opacity-40'}`}>
                <div className={`p-8 rounded-full border border-[#ffeb99]/30 transition-all ${handData.state === item.state ? 'bg-[#ffeb99] text-[#000a06] shadow-[0_0_60px_rgba(255,235,153,0.8)]' : 'text-[#ffeb99]'}`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#ffeb99]">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="glass-card p-10 rounded-[3rem] text-right min-w-[340px] border-r-8 border-[#ffeb99] shadow-2xl">
            <span className="text-[10px] tracking-[0.8em] font-black uppercase text-[#d4af37] mb-2 block">Gesture Protocol</span>
            <p className="text-6xl font-black font-cinzel text-[#ffeb99] tracking-tighter luxury-glow">
              {handData.state === GestureState.NONE ? '...' : handData.state}
            </p>
          </div>
        </footer>
      </div>

      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-8 pointer-events-auto">
          <div className="glass-card max-w-5xl w-full rounded-[4rem] p-24 relative border border-[#ffeb99]/20 shadow-[0_0_150px_rgba(255,235,153,0.1)]">
            <button onClick={() => setShowHelp(false)} className="absolute top-12 right-12 text-[#ffeb99] hover:rotate-90 transition-all p-4">
              <X className="w-12 h-12" />
            </button>
            <h2 className="text-7xl font-black font-cinzel text-[#ffeb99] mb-20 text-center luxury-glow">KINETIC RITUALS</h2>
            <div className="grid grid-cols-2 gap-20 font-inter">
              {[
                { t: 'FIST / 握拳', d: 'Assemble the Tree. Click any thumbnail to set as "Focus". The focused photo shines brighter on the tree.' },
                { t: 'PINCH / 捏合', d: 'The Viewing Ritual. The SELECTED photo will fly to the center. Tree particles morph into its pixel cloud backdrop.' },
                { t: 'PALM / 张掌', d: 'Release into Nebula. Everything explodes into a floating cosmic emerald cloud of memories.' },
                { t: 'MOVE / 移动', d: 'Kinetic Anchor. Move your hand to tilt and rotate the entire 3D festive universe.' }
              ].map((h, i) => (
                <div key={i} className="border-l-2 border-[#ffeb99]/40 pl-10 py-6 group hover:border-[#ffeb99] transition-all">
                  <h3 className="text-2xl font-black tracking-widest text-[#ffeb99] mb-4 uppercase font-cinzel">{h.t}</h3>
                  <p className="text-base text-[#ffeb99]/70 leading-relaxed font-light">{h.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-20 pt-10 border-t border-[#ffeb99]/10 text-center">
               <p className="text-[11px] tracking-[1.2em] uppercase text-[#d4af37] opacity-60">Emerald & Gold Heritage Experience</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
