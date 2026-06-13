import React, { useState } from 'react';
import { Bookmark, HelpCircle } from 'lucide-react';
import { featuredTrees } from './DiscoverTab';
import EnvironmentDrawer from './EnvironmentDrawer';

const myPlantedTrees = [
  {
    id: 1,
    title: 'Untitled (West Lake)',
    location: 'Hangzhou — West Lake',
    excerpt: 'Light breaks on water / fragments of forever',
    status: 'BLOOMING',
    noteCount: 12,
    tags: { lux: '70', temp: '40', flux: '85', grav: '60' },
    theme: '城市变迁'
  },
  {
    id: 2,
    title: 'Street Memory',
    location: 'Shanghai — French Concession',
    excerpt: 'Shadows remember / what sunlight forgets',
    status: 'ROOTING',
    noteCount: 8,
    tags: { lux: '70', temp: '40', flux: '85', grav: '60' },
    theme: '记忆'
  }
];

interface MyGardenTabProps {
  savedTreeIds: number[];
  onViewInAR?: () => void;
}

export default function MyGardenTab({ savedTreeIds, onViewInAR }: MyGardenTabProps) {
  const [showEnvironmentDrawer, setShowEnvironmentDrawer] = useState(false);

  const [currentEnvironment] = useState({
    soil: 'THICK',
    wind: 'NE',
    wthr: 'HUMID',
    moist: 'WET'
  });

  return (
    <div className="h-full flex flex-col bg-[#EAEAEA] overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b-2 border-black bg-white">
        <h1 className="font-pixel text-xl uppercase tracking-wider mb-2">MY GARDEN</h1>
        <p className="text-xs text-black/70 tracking-wide font-medium">
          What you planted, where it lives.
        </p>
      </div>

      <div className="px-5 py-6">
        {/* Environment Terminal Box */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-pixel text-[12px]">ENVIRONMENT</h2>
            <button
              onClick={() => setShowEnvironmentDrawer(true)}
              className="flex items-center gap-1 text-[9px] text-black/50 hover:text-black transition-colors"
            >
              <HelpCircle className="w-3 h-3" strokeWidth={2} />
              <span className="font-pixel underline underline-offset-2">HOW?</span>
            </button>
          </div>
          <div className="bg-black text-[#7CFF6B] p-3 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between font-pixel text-[10px] tracking-wider">
              <span>LUX:70</span>
              <span>TEMP:40</span>
              <span>FLUX:85</span>
              <span>GRAV:60</span>
            </div>
          </div>
        </div>

        {/* Planted Archive */}
        <div className="mb-8">
          <h2 className="font-pixel text-[12px] mb-4">PLANTED</h2>
          <div className="space-y-4">
            {myPlantedTrees.map((tree) => (
              <div key={tree.id} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-4 mb-3">
                  {/* Generative art thumb */}
                  <div className="w-16 h-20 bg-black flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=200&auto=format&fit=crop')] bg-cover mix-blend-screen"></div>
                    <div className="w-4 h-4 border border-[#7CFF6B] relative z-10 flex items-center justify-center">
                      <div className="w-1 h-1 bg-[#7CFF6B]"></div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-pixel text-black uppercase tracking-wider">{tree.location.split(' — ')[0]}</p>
                      <span className="inline-block px-1.5 py-0.5 text-[7px] font-pixel bg-[#7CFF6B] text-black border border-black">
                        {tree.status}
                      </span>
                    </div>
                    <div className="text-sm font-serif leading-relaxed text-black font-medium mb-1">
                      {tree.excerpt.split(' / ').map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-t border-black/10 pt-3">
                  <div className="flex gap-2">
                    <div className="px-2 py-1 text-[9px] border border-black flex items-center gap-1 bg-[#EAEAEA]">
                      <div className="w-2 h-2 bg-[#FF2EE6]"></div>
                      <span>{tree.theme}</span>
                    </div>
                  </div>
                  <button onClick={onViewInAR} className="font-pixel text-[9px] underline decoration-2 underline-offset-4 hover:text-[#FF2EE6]">
                    VIEW &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Archive */}
        <div className="mb-6">
          <h2 className="font-pixel text-[12px] mb-4">SAVED</h2>
          
          {savedTreeIds.length === 0 ? (
            <div className="bg-white border-2 border-black border-dashed p-6 text-center">
              <p className="text-[9px] font-pixel text-black/50 leading-relaxed uppercase">
                No saved trees yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {featuredTrees
                .filter(tree => savedTreeIds.includes(tree.id))
                .map((tree) => (
                  <div key={tree.id} className="bg-white border-2 border-black p-4 relative shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)] z-10">
                      <Bookmark className="w-4 h-4 fill-black text-black" strokeWidth={2} />
                    </div>

                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 bg-black flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=200&auto=format&fit=crop')] bg-cover mix-blend-screen"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[9px] font-pixel text-black/60 uppercase mb-1">{tree.location}</p>
                        <p className="text-xs font-serif leading-relaxed text-black mb-2 italic">
                          {tree.excerpt}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="px-1.5 py-0.5 text-[8px] font-pixel border border-black text-[#7CFF6B] bg-black">
                        LUX:{tree.tags.lux}
                      </div>
                      <div className="px-1.5 py-0.5 text-[8px] font-pixel border border-black text-[#7CFF6B] bg-black">
                        TEMP:{tree.tags.temp}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {showEnvironmentDrawer && (
        <EnvironmentDrawer
          currentEnvironment={currentEnvironment}
          onClose={() => setShowEnvironmentDrawer(false)}
        />
      )}
    </div>
  );
}