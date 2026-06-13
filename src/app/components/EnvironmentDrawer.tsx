import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

type EnvironmentParam = 'lux' | 'temp' | 'flux' | 'grav' | null;

interface EnvironmentDrawerProps {
  onClose: () => void;
  currentEnvironment: {
    soil: string;
    wind: string;
    wthr: string;
    moist: string;
  };
}

const parameterExplanations = {
  lux: `LUX（光照 / 可见度）
解释：诗把多少东西照亮给你看。
低值（0–30）： 多暗示、少交代，意义藏于阴影。
高值（70–100）： 多呈现、少遮掩，叙事骨架能立刻浮现。
读法： LUX 越高，越明说；越低，越含混不清。`,
  temp: `TEMP（温度 / 情绪热度）
解释：诗的情绪有多烫，或有多冷。
低值（0–30）： 冷、克制、保持距离，如旁观者的陈述。
高值（70–100）： 热、贴近、带冲动，是创作者的呼吸。
读法： TEMP 越高，越炽热；越低，越冷静。`,
  flux: `FLUX（通量 / 流速）
解释：诗的推进速度与转场力度。
低值（0–30）： 慢、停驻、反复凝视，如长镜头。
高值（70–100）： 快、跳切、持续推进，若湍流。
读法： FLUX 越高，变化越迅疾；越低，越像舒缓的长镜头。`,
  grav: `GRAV（Gravity / 重力）
解释：诗的意象重量。
低值（0–30）： 轻盈、透明、易读，似光、风、薄雾。
高值（70–100）： 厚重、密度高，难以摆脱牵引，一如历史、死亡、命运。
读法： GRAV 越高，越下坠；越低，越轻盈。`
};

// Fixed climate values for ME page
const climateValues = {
  lux: '70',
  temp: '40',
  flux: '85',
  grav: '60'
};

export default function EnvironmentDrawer({ onClose, currentEnvironment }: EnvironmentDrawerProps) {
  const [selectedParam, setSelectedParam] = useState<EnvironmentParam>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Slide up animation
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end" onClick={handleClose}>
      <div 
        className={`w-full bg-[#e8e8e8] border-t-1 border-black transition-all duration-300 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b-1 border-black px-5 py-4 flex items-center justify-between">
          <h3 className="font-pixel text-[12px]">YOUR CLIMATE</h3>
          <button
            onClick={handleClose}
            className="w-7 h-7 border-1 border-black bg-white hover:bg-black hover:text-white transition-colors flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 pb-8">
          {/* Explanation */}
          <div className="mb-4">
            <p className="text-[10px] text-black/70 leading-relaxed mb-1">
              这是你全部 Poem-Plant 的统计气候，不是某一首诗的属性。
            </p>
            <p className="text-[10px] text-black/70 leading-relaxed mb-3">
              It summarizes your overall writing climate across all Poem-Plants.
            </p>
          </div>

          {/* Tappable Parameters Grid */}
          <div className="mb-4">
            <p className="text-[9px] font-pixel text-black/60 mb-2">TAP TO LEARN</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(climateValues).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedParam(selectedParam === key ? null : key as EnvironmentParam)}
                  className={`border-1 p-3 transition-all text-left ${ 
                    selectedParam === key
                      ? 'bg-[#00ff88] border-black'
                      : 'bg-[#00ff88]/30 border-[#00ff88] hover:bg-[#00ff88]/40'
                  }`}
                >
                  <p className="text-[8px] font-pixel mb-1" style={{ color: selectedParam === key ? '#000' : '#00ff88' }}>
                    {key.toUpperCase()}
                  </p>
                  <p className={`text-[10px] font-medium transition-colors ${
                    selectedParam === key ? 'text-black' : 'text-black/80'
                  }`}>
                    TOP POEMS
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Card - shows when parameter selected */}
          {selectedParam && (
            <div 
              className="bg-white border-1 border-black p-3 mb-4 transition-all duration-200"
              style={{ animation: 'fadeIn 200ms ease-out' }}
            >
              <p className="text-sm text-black leading-relaxed whitespace-pre-line">
                {parameterExplanations[selectedParam]}
              </p>
            </div>
          )}

          {/* Connection hints */}
          <div className="border-t-1 border-black/10 pt-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-[#00ff88] mt-1.5 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
              <p className="text-[9px] text-black/55 leading-relaxed">
                Values are aggregated from all your Poem-Plants.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-[#00ff88] mt-1.5 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
              <p className="text-[9px] text-black/55 leading-relaxed">
                Tap an attribute to see the top contributing poems.
              </p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(4px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}