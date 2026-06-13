import React, { useState } from 'react';
import { Bookmark, MessageSquare } from 'lucide-react';

export const featuredTrees = [
  {
    id: 1,
    location: 'London — Brick Lane',
    excerpt: 'The streets remember what we forget / written in cracks and wet cement',
    noteCount: 23,
    tags: { lux: '70', temp: '40', flux: '85', grav: '60' }
  },
  {
    id: 2,
    location: 'Tokyo — Shibuya',
    excerpt: 'Neon rain falls on pixel dreams / nothing is quite what it seems',
    noteCount: 45,
    tags: { lux: '70', temp: '40', flux: '85', grav: '60' }
  },
  {
    id: 3,
    location: 'New York — Brooklyn',
    excerpt: 'Between the lines / we plant our signs',
    noteCount: 12,
    tags: { lux: '70', temp: '40', flux: '85', grav: '60' }
  },
  {
    id: 4,
    location: 'Berlin — Kreuzberg',
    excerpt: 'Words grow wild where walls once stood / meaning blooms in neighborhood',
    noteCount: 34,
    tags: { lux: '70', temp: '40', flux: '85', grav: '60' }
  }
];

interface DiscoverTabProps {
  savedTreeIds: number[];
  onToggleSave: (treeId: number) => void;
}

export default function DiscoverTab({ savedTreeIds, onToggleSave }: DiscoverTabProps) {
  const [viewMode, setViewMode] = useState<'magazine' | 'grid'>('magazine');

  // Hardcode some image variations for the generative art
  const images = [
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop"
  ];

  return (
    <div className="h-full flex flex-col bg-[#EAEAEA] font-sans relative">
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-black bg-white flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center">
          <h1 className="font-pixel text-[14px] leading-none pt-1">
            HIT THE STREETS
          </h1>
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setViewMode(prev => prev === 'magazine' ? 'grid' : 'magazine')}
          className="border-2 border-black p-1.5 flex gap-1 hover:bg-[#7CFF6B] transition-colors"
        >
          {viewMode === 'magazine' ? (
            <span className="font-pixel text-[12px] leading-none" title="Magazine Mode">▣</span>
          ) : (
            <span className="font-pixel text-[12px] leading-none" title="Grid Mode">▦</span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto snap-y snap-mandatory bg-[#EAEAEA] pb-24">
        {viewMode === 'magazine' ? (
          /* MAGAZINE MODE */
          <div className="py-6 space-y-8 flex flex-col items-center">
            {featuredTrees.map((tree, idx) => (
              <div key={tree.id} className="w-[calc(100%-2.5rem)] h-[calc(100vh-280px)] min-h-[500px] max-h-[650px] snap-center shrink-0 flex flex-col bg-white border-2 border-black relative shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                
                {/* Generative Art Image Area */}
                <div className="flex-[1.2] relative bg-black border-b-2 border-black overflow-hidden">
                  <img 
                    src={images[idx % images.length]} 
                    alt="Generative art" 
                    className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
                  />
                  {/* Decorative Terminal overlay */}
                  <div className="absolute top-4 left-4 font-pixel text-[8px] text-[#7CFF6B] drop-shadow-md">
                    SYS.RENDER_ID: {tree.id}00{idx}<br/>
                    STATUS: BLOOMING
                  </div>
                  
                  {/* Bookmark Button */}
                  <button 
                    onClick={() => onToggleSave(tree.id)}
                    className="absolute top-4 right-4 w-9 h-9 bg-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all z-20"
                  >
                    <Bookmark className={`w-4 h-4 ${savedTreeIds.includes(tree.id) ? 'fill-[#7CFF6B] text-black' : 'text-black'}`} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white p-5 flex flex-col justify-between">
                  <div>
                    <h2 className="font-pixel text-[16px] uppercase leading-tight mb-4 pr-8">
                      {tree.location.replace(' — ', '\n')}
                    </h2>
                    
                    <div className="border-l-[3px] border-[#FF2EE6] pl-3 mb-5">
                      <p className="font-serif text-[15px] leading-relaxed text-black font-medium">
                        {tree.excerpt.split(' / ').map((line, i, arr) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < arr.length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </p>
                    </div>
                  </div>
                  
                  {/* Footer Stats */}
                  <div className="flex justify-between items-end mt-auto">
                    <div className="bg-black text-[#7CFF6B] p-2 border-2 border-black shrink-0 shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-pixel text-[7px] tracking-wider">
                        <span>LUX:{tree.tags.lux}</span>
                        <span>TEMP:{tree.tags.temp}</span>
                        <span>FLUX:{tree.tags.flux}</span>
                        <span>GRAV:{tree.tags.grav}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-black hover:bg-[#EAEAEA] cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all">
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span className="font-pixel text-[9px]">{tree.noteCount}</span>
                    </div>
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        ) : (
          /* GRID MODE */
          <div className="p-4 columns-2 gap-4 space-y-4 pb-24">
            {featuredTrees.map((tree, idx) => (
              <div key={tree.id} className="break-inside-avoid bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] relative group">
                <div className="aspect-[3/4] bg-black border-b-2 border-black overflow-hidden relative">
                  <img 
                    src={images[idx % images.length]} 
                    alt="Generative art" 
                    className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                  <button 
                    onClick={() => onToggleSave(tree.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${savedTreeIds.includes(tree.id) ? 'fill-[#7CFF6B] text-black' : 'text-black'}`} strokeWidth={2} />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-pixel text-[10px] uppercase mb-2 line-clamp-2">
                    {tree.location}
                  </h3>
                  <p className="font-serif text-[12px] leading-snug line-clamp-2 text-black/80">
                    {tree.excerpt.split(' / ')[0]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}