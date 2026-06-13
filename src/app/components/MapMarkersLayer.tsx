import type mapboxgl from 'mapbox-gl';
import { MapMarker, MarkerKind, KIND_COLOR } from '../data/mapMarkers';

// 地图标记图层：把统一的 MapMarker 渲染成地球上的方块点。
// - 按 kind 上色（绿=音乐，青=照片）
// - 背面隐藏（球面角 > 85° 不画）+ 视口裁剪
// - 重合聚合：缩小时落在同一屏幕格的点只画一个；放大后点散开、各自显示
// 解耦：只认 MapMarker[] 与 visibleKinds，不关心点从哪来；新增类型无需改本组件。

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
function centralAngleDeg(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const c =
    Math.sin(lat1 * r) * Math.sin(lat2 * r) +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return Math.acos(Math.max(-1, Math.min(1, c))) / r;
}

interface Props {
  map: mapboxgl.Map;
  zoom: number;
  mapCenter: [number, number];
  markers: MapMarker[];
  visibleKinds: Set<MarkerKind>;
  onPick?: (m: MapMarker) => void;
}

export default function MapMarkersLayer({ map, zoom, mapCenter, markers, visibleKinds, onPick }: Props) {
  const container = map.getContainer();
  const W = container.clientWidth;
  const H = container.clientHeight;
  const labelOpacity = clamp01((5 - zoom) / (5 - 3.2)); // 地球档显示城市名
  const dot = Math.round(7 + clamp01((zoom - 2) / (13 - 2)) * 7); // 7~14px，远小近大
  const CELL = Math.max(dot + 6, 16); // 聚合网格：同格只显示一个

  // 先按可见类型过滤，再投影 / 背面隐藏 / 视口裁剪 / 重合聚合
  const seen = new Set<string>();
  const shown: { m: MapMarker; x: number; y: number }[] = [];
  for (const m of markers) {
    if (!visibleKinds.has(m.kind)) continue;
    if (centralAngleDeg(mapCenter, [m.lng, m.lat]) > 85) continue;
    const p = map.project([m.lng, m.lat]);
    if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) continue;
    const key = Math.round(p.x / CELL) + ',' + Math.round(p.y / CELL);
    if (seen.has(key)) continue;
    seen.add(key);
    shown.push({ m, x: p.x, y: p.y });
  }

  // 单根 div 容器，key 随可见类型变化：切换图层时整层替换，不残留旧点
  return (
    <div key={[...visibleKinds].sort().join('|')} className="absolute inset-0 z-[5] pointer-events-none">
      {shown.map(({ m, x, y }) => {
        const color = KIND_COLOR[m.kind];
        const inner = Math.max(2, Math.round(dot * 0.45));
        return (
          <div key={m.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}px`, top: `${y}px` }}>
            <div
              onClick={onPick ? () => onPick(m) : undefined}
              className={`bg-black border border-black flex items-center justify-center ${onPick ? 'pointer-events-auto cursor-pointer' : ''}`}
              style={{ width: `${dot}px`, height: `${dot}px`, boxShadow: `1px 1px 0 ${color}` }}
            >
              <div style={{ width: `${inner}px`, height: `${inner}px`, background: color }} />
            </div>
            {m.kind === 'music' && labelOpacity > 0.01 && m.label && (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap font-pixel text-[6px] leading-none mt-0.5"
                style={{ color, opacity: labelOpacity, textShadow: '0 0 2px #000,0 0 2px #000' }}
              >
                {m.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
