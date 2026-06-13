import React, { useState } from 'react';
import MyMapTab from './MyMapTab';
import MyGardenTab from './MyGardenTab';

interface MyCityTabProps {
  onViewInAR?: () => void;
  savedTreeIds: number[];
}

export default function MyCityTab({ onViewInAR, savedTreeIds }: MyCityTabProps) {
  const [activeSegment, setActiveSegment] = useState<'map' | 'garden'>('map');

  return (
    <div className="h-full flex flex-col bg-[#EAEAEA] font-sans relative overflow-hidden">
      {/* Top Segment Switch */}
      <div className="px-4 py-3 border-b-2 border-black bg-white flex justify-center z-10 shrink-0 shadow-sm">
        <div className="flex border-2 border-black bg-[#EAEAEA] p-1 w-full max-w-[240px]">
          <button
            onClick={() => setActiveSegment('map')}
            className={`flex-1 py-1.5 font-pixel text-[10px] text-center transition-all ${
              activeSegment === 'map' 
                ? 'bg-black text-[#7CFF6B]' 
                : 'text-black hover:bg-black/5'
            }`}
          >
            MAP
          </button>
          <button
            onClick={() => setActiveSegment('garden')}
            className={`flex-1 py-1.5 font-pixel text-[10px] text-center transition-all ${
              activeSegment === 'garden' 
                ? 'bg-black text-[#7CFF6B]' 
                : 'text-black hover:bg-black/5'
            }`}
          >
            GARDEN
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeSegment === 'map' ? (
          <MyMapTab onViewInAR={onViewInAR} />
        ) : (
          <MyGardenTab savedTreeIds={savedTreeIds} onViewInAR={onViewInAR} />
        )}
      </div>
    </div>
  );
}