import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Image as ImageIcon, Trash2, Download, MapPin } from 'lucide-react';
import { curated, dupGroups, curationStats, VERDICT_LABEL, VERDICT_COLOR, type CuratedPhoto } from '../data/photoCuration';
import { edgeSafe } from '../../../frost-agent/edge/contract';

// photos-curator 运行页 —— 端侧照片整理 agent（Keep One 思路）。
// 端侧模型持续扫描相册 → 打分 / 打标签(城市·类别·经纬度) / 判定保留-待定-可删 → 输出整理报告；
// 重复组可一键清理（仅标记，不删原图）；高价值照片即 tab1 地球与日历上的那批（两 tab 联动）。

interface Props { onBack: () => void }

const SEGMENTS = ['整理报告', '重复清理', '高价值'] as const;
type Segment = (typeof SEGMENTS)[number];
const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.opacity = '0'; };

const CLEAN_KEY = 'pe.photoCleaned.v1';
function loadCleaned(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CLEAN_KEY) || '[]')); } catch { return new Set(); }
}

export default function PhotosCuratorRunPage({ onBack }: Props) {
  const [segment, setSegment] = useState<Segment>('整理报告');
  const [scanned, setScanned] = useState(0);
  const [cleaned, setCleaned] = useState<Set<string>>(loadCleaned);
  // 端侧看图打分：调端侧视觉模型(MNN×Qwen-VL)真看图、给收藏价值打分（端侧未就绪则安全降级）
  const [edgeScored, setEdgeScored] = useState<Record<string, { score?: number; reason: string; busy?: boolean }>>({});
  const [edgeRunning, setEdgeRunning] = useState(false);

  const total = curationStats.total;
  const done = scanned >= total;

  // 端侧「持续扫描」：进度逐步推进，给出 agent 一直在工作的体感
  useEffect(() => {
    if (scanned >= total) return;
    const t = window.setInterval(() => setScanned((s) => Math.min(total, s + Math.max(3, Math.round(total / 40)))), 90);
    return () => window.clearInterval(t);
  }, [scanned, total]);

  const persistCleaned = (next: Set<string>) => {
    setCleaned(next);
    try { localStorage.setItem(CLEAN_KEY, JSON.stringify([...next])); } catch { /* 隐私模式忽略 */ }
  };
  const cleanGroup = (g: typeof dupGroups[number]) => {
    const next = new Set(cleaned);
    g.photos.forEach((p) => { if (p.id !== g.keepId) next.add(p.id); });
    persistCleaned(next);
  };
  const cleanAllDups = () => {
    const next = new Set(cleaned);
    dupGroups.forEach((g) => g.photos.forEach((p) => { if (p.id !== g.keepId) next.add(p.id); }));
    persistCleaned(next);
  };

  // 端侧真看图打分：挑报告里前 N 张有网络图源的照片，逐张交给端侧视觉模型(MNN×Qwen-VL)评分
  const runEdgeScore = async () => {
    if (edgeRunning) return;
    const picks = report.filter((c) => c.thumb && /^https?:/.test(c.thumb) && !edgeScored[c.id]).slice(0, 3);
    if (!picks.length) return;
    setEdgeRunning(true);
    for (const c of picks) {
      setEdgeScored((m) => ({ ...m, [c.id]: { reason: '端侧看图中…', busy: true } }));
      let score: number | undefined; let reason = '';
      try {
        const out = await edgeSafe.vision(c.thumb!, '看这张照片，判断收藏价值。只回 JSON：{"score":0到100的整数,"reason":"一句不超过18字的中文理由"}');
        try { const j = JSON.parse((out || '').replace(/```json|```/g, '').trim()); score = Math.round(Number(j.score)); reason = String(j.reason || '').slice(0, 24); } catch { /* 宽松解析 */ }
        if (score === undefined || Number.isNaN(score)) { const mt = (out || '').match(/(\d{1,3})/); if (mt) score = Math.min(100, Number(mt[1])); if (!reason) reason = (out || '').replace(/\s+/g, ' ').slice(0, 24); }
      } catch { /* 端侧不可用 */ }
      setEdgeScored((m) => ({ ...m, [c.id]: { score, reason: reason || '端侧未就绪', busy: false } }));
    }
    setEdgeRunning(false);
  };

  // 报告流：按分数高→低；扫描进度内的才显示（边扫边出）
  const report = useMemo(() => [...curated].sort((a, b) => b.score - a.score), []);
  const shown = report.slice(0, Math.max(scanned, done ? total : 0));
  const keeps = useMemo(() => curated.filter((c) => c.verdict === 'keep'), []);
  const cleanedCount = cleaned.size;

  // 导出本地整理 JSON（用户点击触发；记录高价值照片的分数 / 标签 / 经纬度）
  const exportJSON = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      stats: { ...curationStats, cleaned: cleanedCount },
      photos: curated.map((c) => ({ id: c.id, city: c.city, lat: c.lat, lng: c.lng, score: c.score, verdict: c.verdict, category: c.category, tags: c.tags })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pocket-earth-photo-curation.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const Card = (c: CuratedPhoto) => {
    const isClean = cleaned.has(c.id);
    return (
      <div key={c.id} className={`flex gap-2.5 border-2 border-black bg-white p-2 shadow-[2px_2px_0_rgba(0,0,0,0.85)] ${isClean ? 'opacity-45' : ''}`}>
        <div className="w-16 h-16 shrink-0 bg-[#d8d8d6] border border-black/40 overflow-hidden relative">
          <img src={c.thumb} onError={onImgErr} loading="lazy" className={`w-full h-full object-cover ${c.verdict === 'keep' ? '' : 'grayscale'}`} />
          <span className="absolute top-0 left-0 font-pixel text-[8px] text-white bg-black/70 px-1 leading-tight">{c.score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-pixel text-[7px] px-1.5 py-0.5 text-white" style={{ background: VERDICT_COLOR[c.verdict] }}>{VERDICT_LABEL[c.verdict]}</span>
            <span className="text-[12px] font-bold truncate">{c.city || '未知地点'}</span>
            {isClean && <span className="font-pixel text-[7px] text-[#d23b3b]">已标记清理</span>}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {c.tags.map((t, i) => (
              <span key={i} className="font-pixel text-[6px] border border-black/30 px-1 py-0.5 text-black/60 bg-[#EAEAEA]">{t}</span>
            ))}
          </div>
          <div className="text-[10px] text-black/55 leading-snug mt-1">{c.reason}</div>
          {edgeScored[c.id] && (
            <div className="mt-1 flex items-center gap-1.5 text-[10px]">
              <span className="font-pixel text-[6px] px-1 py-0.5 text-black shrink-0" style={{ background: '#00ff88' }}>端侧实判</span>
              {edgeScored[c.id].busy
                ? <span className="text-black/45 animate-pulse">端侧看图中…</span>
                : <span className="text-black/70 leading-snug">{edgeScored[c.id].score != null ? <b>{edgeScored[c.id].score} 分</b> : null} · {edgeScored[c.id].reason}</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#EAEAEA] font-sans relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b-2 border-black bg-white shrink-0">
        <button onClick={onBack} className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0_#000] active:translate-y-px">
          <ChevronLeft className="w-4 h-4" strokeWidth={3} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[11px] tracking-wider truncate">PHOTOS-CURATOR</div>
          <div className="text-[9px] text-black/45 truncate flex items-center gap-1">
            <span className={`inline-block w-1.5 h-1.5 ${done ? 'bg-[#00aa55] animate-pulse' : 'bg-[#c08a00] animate-pulse'}`} />
            端侧 · {done ? '持续监测中' : `扫描中 ${scanned}/${total}`}
          </div>
        </div>
        <ImageIcon className="w-4 h-4 text-black/50" strokeWidth={2.5} />
      </div>

      {/* Stat strip */}
      <div className="px-4 py-2.5 border-b-2 border-black bg-black text-[#00ff88] shrink-0">
        <div className="font-pixel text-[8px] flex justify-between items-center tracking-wider">
          <span>高价值 {curationStats.highValue}</span><span className="opacity-40">|</span>
          <span>待定 {curationStats.review}</span><span className="opacity-40">|</span>
          <span>重复 {curationStats.dupGroups} 组</span><span className="opacity-40">|</span>
          <span>可清理 {curationStats.cleanable}</span>
        </div>
      </div>

      {/* 段切换 + 导出 */}
      <div className="px-3 py-2 border-b-2 border-black bg-white flex items-center gap-2 shrink-0">
        <div className="flex border-2 border-black bg-[#EAEAEA] p-0.5 flex-1">
          {SEGMENTS.map((s) => (
            <button key={s} onClick={() => setSegment(s)}
              className={`flex-1 py-1 text-[10px] font-bold ${segment === s ? 'bg-black text-[#7CFF6B]' : 'text-black hover:bg-black/5'}`}>{s}</button>
          ))}
        </div>
        <button onClick={exportJSON} title="导出整理 JSON" className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0_#000] active:translate-y-px">
          <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {segment === '整理报告' && (
          <>
            <button onClick={runEdgeScore} disabled={edgeRunning}
              className="w-full flex items-center justify-center gap-1.5 border-2 border-black bg-[#00ff88] text-black px-2 py-1.5 text-[11px] font-bold shadow-[2px_2px_0_#000] active:translate-y-px disabled:opacity-50">
              {edgeRunning ? '端侧看图打分中…' : '▶ 端侧看图打分 · 真模型看 3 张'}
            </button>
            {shown.map(Card)}
            {!done && <div className="text-center font-pixel text-[8px] text-black/40 py-2 tracking-widest animate-pulse">端侧整理中… {scanned}/{total}</div>}
            {done && <div className="text-center font-pixel text-[8px] text-black/30 py-1 tracking-widest">端侧管「挑和找」· 高价值已钉地球与日历</div>}
          </>
        )}

        {segment === '重复清理' && (
          <>
            <div className="flex items-center justify-between bg-white border-2 border-black p-2.5 shadow-[2px_2px_0_rgba(0,0,0,0.85)]">
              <div className="text-[11px]"><b>{dupGroups.length}</b> 组重复 · 已标记清理 <b>{cleanedCount}</b></div>
              <button onClick={cleanAllDups} className="flex items-center gap-1 border-2 border-black bg-[#d23b3b] text-white px-2 py-1 text-[10px] font-bold shadow-[1px_1px_0_#000] active:translate-y-px">
                <Trash2 className="w-3 h-3" strokeWidth={2.5} /> 一键清理重复
              </button>
            </div>
            <div className="font-pixel text-[7px] text-black/40 px-1">清理仅做标记，不会删除你的原图</div>
            {dupGroups.slice(0, 30).map((g) => (
              <div key={g.key} className="border-2 border-black bg-white p-2 shadow-[2px_2px_0_rgba(0,0,0,0.85)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-pixel text-[8px] text-black/55">{g.photos.length} 张重复 · 保留最高分</span>
                  <button onClick={() => cleanGroup(g)} className="font-pixel text-[7px] border border-black px-1.5 py-0.5 active:translate-y-px">清理本组</button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto">
                  {g.photos.map((p) => {
                    const keep = p.id === g.keepId;
                    const isClean = cleaned.has(p.id);
                    return (
                      <div key={p.id} className="relative shrink-0">
                        <div className={`w-14 h-14 border-2 overflow-hidden ${keep ? 'border-[#00aa55]' : 'border-black/40'} ${isClean ? 'opacity-40' : ''}`}>
                          <img src={p.thumb} onError={onImgErr} loading="lazy" className={`w-full h-full object-cover ${keep ? '' : 'grayscale'}`} />
                        </div>
                        <span className="absolute top-0 left-0 font-pixel text-[7px] text-white bg-black/70 px-0.5">{p.score}</span>
                        {keep && <span className="absolute bottom-0 inset-x-0 font-pixel text-[6px] text-center text-white bg-[#00aa55]">保留</span>}
                        {!keep && isClean && <span className="absolute bottom-0 inset-x-0 font-pixel text-[6px] text-center text-white bg-[#d23b3b]">清理</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {segment === '高价值' && (
          <>
            <div className="bg-white border-2 border-black p-2.5 shadow-[2px_2px_0_rgba(0,0,0,0.85)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#00e5ff]" strokeWidth={2.5} />
              <div className="text-[11px] leading-snug"><b>{keeps.length}</b> 张高价值照片已钉到地球（tab1）与日历，按城市与经纬度归位。</div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {keeps.map((c) => (
                <div key={c.id} className="aspect-square border-2 border-black overflow-hidden shadow-[1px_1px_0_#000] relative bg-[#d8d8d6]">
                  <img src={c.thumb} onError={onImgErr} loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute top-0 left-0 font-pixel text-[7px] text-white bg-black/70 px-0.5">{c.score}</span>
                  <span className="absolute bottom-0 inset-x-0 font-pixel text-[6px] text-center text-white bg-black/60 truncate px-0.5">{c.city}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
