import { MARKER_KINDS, type MarkerKind } from '../data/mapMarkers';

// 地球左下角图例 + 图层开关：标明每种颜色方块代表什么，点一下开/闭该类点。
// 解耦：图层从 MARKER_KINDS 自动列出，新增类型无需改本组件。

interface Props {
  visibleKinds: Set<MarkerKind>;
  onToggle: (k: MarkerKind) => void;
}

export default function MapLegend({ visibleKinds, onToggle }: Props) {
  return (
    <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-md border-2 border-black shadow-[2px_2px_0_#000] p-2 pointer-events-auto select-none">
      <div className="font-pixel text-[7px] tracking-widest mb-1.5 text-black/55">LAYERS · 图层</div>
      <div className="space-y-1">
        {MARKER_KINDS.map((k) => {
          const on = visibleKinds.has(k.kind);
          return (
            <button
              key={k.kind}
              onClick={() => onToggle(k.kind)}
              className={`flex items-center gap-2 w-full transition-opacity active:translate-y-px ${on ? '' : 'opacity-35'}`}
            >
              {/* 方块（黑框 + 彩芯，呼应地图上的标记点）*/}
              <div className="w-3 h-3 shrink-0 bg-black flex items-center justify-center border border-black" style={{ boxShadow: `1px 1px 0 ${k.color}` }}>
                <div className="w-1.5 h-1.5" style={{ background: k.color }} />
              </div>
              <span className="font-pixel text-[8px] leading-none">{k.label}</span>
              <span className="ml-auto pl-2 font-pixel text-[6px] text-black/40 leading-none">{on ? 'ON' : 'OFF'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
