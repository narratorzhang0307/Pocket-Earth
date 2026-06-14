// 播客全屏视图（电台翻到播客时覆盖音乐界面）：城市大图 + 现场 LIVE + 城市/CH + 播放进度
// + 稿子随音频逐字浮现（不整篇透露）+ 与 frost 对话。像素风改写。
import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Play, Pause } from 'lucide-react';
import { formatTime } from '../../../../frost-agent/data/radio';
import { RadioChat, ChatMsg } from './RadioChat';

interface RadioPodcastViewProps {
  cityNameZh: string;
  stationFreq: number;
  cover: string;
  title: string;
  text: string;
  playSec: number;
  durSec: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClose: () => void; // 返回音乐
  chat: ChatMsg[];
  chatInput: string;
  onChatInput: (v: string) => void;
  onSendChat: () => void;
}

export function RadioPodcastView({ cityNameZh, stationFreq, cover, title, text, playSec, durSec, isPlaying, onTogglePlay, onSeek, onClose, chat, chatInput, onChatInput, onSendChat }: RadioPodcastViewProps) {
  // 拆段 + 记每段全局起始字符偏移（按音频进度逐字揭示）
  const { paras, totalChars } = useMemo(() => {
    const ps = (text || '').split(/\n{2,}|\n/).map((s) => s.trim()).filter(Boolean);
    let acc = 0;
    const paras = ps.map((p) => { const start = acc; acc += p.length; return { text: p, start }; });
    return { paras, totalChars: acc || 1 };
  }, [text]);

  const curChar = durSec > 0 ? Math.floor((playSec / durSec) * totalChars) : 0;
  const curRef = useRef<HTMLDivElement>(null);
  useEffect(() => { curRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [Math.floor(curChar / 18)]);

  const hasText = paras.length > 0;

  return (
    <motion.div
      key="radio-podcast-view"
      initial={{ opacity: 0, rotateY: 80 }}
      animate={{ opacity: 1, rotateY: 0 }}
      exit={{ opacity: 0, rotateY: 80 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      style={{ transformOrigin: 'center', perspective: 1400 }}
      className="absolute inset-0 z-30 flex flex-col bg-[#0a0a0a]"
    >
      {/* 顶 banner：城市大图 + LIVE + 城市/CH + 关闭 */}
      <div className="relative shrink-0 h-[150px] overflow-hidden border-b-2 border-[#00ff88]/30">
        <img src={cover} alt={cityNameZh} className="absolute inset-0 w-full h-full object-cover grayscale opacity-60" draggable={false} referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
        <button onClick={onClose} className="absolute top-2.5 right-2.5 w-7 h-7 border border-[#00ff88]/40 flex items-center justify-center text-white/70 hover:text-[#00ff88] hover:bg-[#00ff88]/10 transition-colors" aria-label="back to music"><X size={14} strokeWidth={2.5} /></button>
        <div className="absolute top-3 left-3 flex items-center gap-1.5 font-pixel text-[8px] tracking-[0.3em] uppercase text-[#00ff88]">
          <div className="w-1.5 h-1.5 bg-[#00ff88] animate-pulse" />
          城市观察员 · LIVE
        </div>
        <div className="absolute left-3 right-12 bottom-2.5">
          <div className="text-[20px] text-white font-bold leading-tight drop-shadow truncate">{cityNameZh}</div>
          <div className="font-pixel text-[7px] tracking-widest uppercase text-white/55 mt-1 truncate">{title} · CH {stationFreq.toFixed(1)}</div>
        </div>
      </div>

      {/* 进度 + 播放/暂停 */}
      <div className="px-4 py-3 border-b border-[#00ff88]/15 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onTogglePlay} className="w-9 h-9 border-2 border-[#00ff88] flex items-center justify-center text-[#00ff88] hover:bg-[#00ff88]/10 active:scale-95 transition-all shrink-0" aria-label="play/pause">
            {isPlaying ? <Pause size={14} fill="currentColor" strokeWidth={0} /> : <Play size={14} fill="currentColor" strokeWidth={0} className="ml-0.5" />}
          </button>
          <div className="flex-1 flex flex-col gap-1">
            <div className="h-[3px] bg-white/10 overflow-hidden cursor-pointer" onClick={onSeek}>
              <div className="h-full bg-[#00ff88]" style={{ width: `${durSec > 0 ? (playSec / durSec) * 100 : 0}%` }} />
            </div>
            <div className="flex justify-between font-pixel text-[7px] text-white/40 tabular-nums">
              <span>{formatTime(playSec)}</span>
              <span>{formatTime(durSec)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 稿子：随音频逐字浮现（不整篇透露），还没念到的不显示 */}
      <div className="flex-1 min-h-[80px] overflow-y-auto px-4 py-3">
        {!hasText ? (
          <div className="text-[11px] text-white/40 italic">这一集的文字稿还在路上，先闭上眼睛听吧。</div>
        ) : curChar <= 0 ? (
          <div className="text-[11px] text-white/30 italic">城市观察员准备开口……</div>
        ) : (
          paras.map((p, pi) => {
            const revealed = Math.max(0, Math.min(curChar - p.start, p.text.length));
            if (revealed <= 0) return null;
            const active = revealed < p.text.length;
            return (
              <div key={pi} ref={active ? curRef : null} className="mb-4 text-[12.5px] leading-[1.75] text-white">
                {p.text.slice(0, revealed)}
                {active && <span className="text-[#00ff88] animate-pulse">▌</span>}
              </div>
            );
          })
        )}
      </div>

      {/* 与 frost 对话（与音乐界面共享同一段对话） */}
      <RadioChat chat={chat} chatInput={chatInput} onInputChange={onChatInput} onSend={onSendChat} className="shrink-0 h-[170px] border-t-2 border-[#00ff88]/20 px-3 bg-black/40" />
    </motion.div>
  );
}
