import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { edgeSafe } from '../../../frost-agent/edge/contract';
import { getProfileSummary } from '../../../frost-agent/harness/profile';
import { HUMAN_VOICE, cleanVoice } from '../../../frost-agent/harness/persona';
import { streamText } from '../../../frost-agent/sync/stream';
import AgentLuIcon from './AgentLuIcon';
import UserZhaIcon from './UserZhaIcon';

// 通用「对话层」：各 agent（读书 / 观影 / 城市播客）共用的对话框。
// 端侧先对用户这句话做意图分类（端侧「挑」），云大脑(/api/frost-llm → DeepSeek)结合用户数据作答（云「写」）。
// 数据接地：每次发送把用户该领域的记录(context)注入 system，让回答基于「你的书/你的观影/你的城市」。

export interface AgentChatConfig {
  accent: string;
  persona: string;            // system 人设
  context: () => string;      // 用户数据摘要（每次发送时取最新）
  placeholder: string;
  suggestions: string[];
  intentLabels?: string[];    // 端侧意图分类标签（可选）
}

interface Turn { role: 'user' | 'agent'; text: string; intent?: string }

export default function AgentChat({ config }: { config: AgentChatConfig }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns.length, busy]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setInput('');
    const history = turns.slice(-6).map((t) => `${t.role === 'user' ? '用户' : '我'}：${t.text}`).join('\n');
    setTurns((t) => [...t, { role: 'user', text }]);
    setBusy(true);

    // 端侧意图分类（端侧「挑」），失败/空则跳过
    let intent = '';
    if (config.intentLabels?.length) {
      intent = await edgeSafe.classify(text, config.intentLabels);  // 契约入口：带兜底+健康追踪，失败返回''
    }

    // 长期口味画像（跨会话）注入云脑 system —— 只进云端，端侧 classify 不接触
    const taste = getProfileSummary();
    const system = `${config.persona}\n\n${taste ? taste + '\n' : ''}【用户数据】\n${config.context()}\n\n${HUMAN_VOICE}\n\n要求：结合用户的长期口味画像与本领域数据回答，具体、有判断、像懂行的朋友，不超过 180 字。`;
    const prompt = `${history ? history + '\n' : ''}用户：${text}`;
    let reply = '';
    try {
      const r = await fetch('/api/frost-llm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, system }) });
      if (r.ok) { const d = await r.json(); reply = cleanVoice(typeof d?.text === 'string' ? d.text : ''); }
    } catch { /* 降级 */ }
    if (!reply) reply = '我这边大脑暂时连不上（需要 DeepSeek key）。不过你的数据都在左边「数据层」里，可以先翻翻。';
    // 流式渲染（P2-J）：先放空气泡，再按打字机逐字填充（StreamEvent 节奏；未来接 SSE 真流只换吐字源）
    setTurns((t) => [...t, { role: 'agent', text: '', intent: intent || undefined }]);
    let acc = '';
    await streamText(reply, (e) => {
      if (e.phase === 'delta' && e.delta) {
        acc += e.delta;
        const cur = acc;
        setTurns((t) => { const n = [...t]; const li = n.length - 1; if (n[li]?.role === 'agent') n[li] = { ...n[li], text: cur }; return n; });
      } else if (e.phase === 'end') {
        setTurns((t) => { const n = [...t]; const li = n.length - 1; if (n[li]?.role === 'agent') n[li] = { ...n[li], text: reply }; return n; });
      }
    }).done;
    setBusy(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#EAEAEA] min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">
        {turns.length === 0 && (
          <div className="text-[11px] text-black/50 leading-relaxed bg-white border-2 border-black p-3 shadow-[2px_2px_0_rgba(0,0,0,0.85)]">
            试试问它：
            <div className="flex flex-wrap gap-1.5 mt-2">
              {config.suggestions.map((s) => (
                <button key={s} onClick={() => ask(s)} className="text-[11px] px-2 py-0.5 border-2 border-black bg-[#EAEAEA] hover:bg-black/5 active:translate-y-px">{s}</button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => t.role === 'user' ? (
          <div key={i} className="self-end flex flex-row-reverse items-start gap-2 max-w-[88%]">
            <div className="shrink-0 mt-0.5"><UserZhaIcon size={26} ring="#111" /></div>
            <div className="text-white border-2 border-black px-3 py-2 text-[12px] leading-relaxed shadow-[2px_2px_0_rgba(0,0,0,0.85)]" style={{ background: '#111' }}>{t.text}</div>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-2 max-w-[94%]">
            <div className="shrink-0 mt-0.5"><AgentLuIcon size={26} /></div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="font-pixel text-[7px] tracking-[0.2em] flex items-center gap-1.5" style={{ color: config.accent }}>
                AGENT
                {t.intent && <span className="not-italic" style={{ color: config.accent }}>· 端侧识别意图：{t.intent}</span>}
              </div>
              <div className="bg-white border-2 border-black px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap shadow-[2px_2px_0_rgba(0,0,0,0.85)]">{t.text}</div>
            </div>
          </div>
        ))}
        {busy && <div className="font-pixel text-[8px] text-black/45 tracking-widest animate-pulse">⋯ 端侧识别 + 云端作答 ⋯</div>}
        <div ref={endRef} />
      </div>

      <div className="px-3 py-3 border-t-2 border-black bg-white shrink-0">
        <form className="flex gap-2 items-center" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
            placeholder={config.placeholder}
            className="flex-1 h-10 border-2 border-black bg-[#EAEAEA] text-[12px] px-3 outline-none focus:bg-white transition-colors min-w-0 disabled:opacity-50"
          />
          <button type="submit" disabled={busy || !input.trim()} className="w-10 h-10 border-2 border-black flex items-center justify-center active:translate-y-px shrink-0 disabled:opacity-30 text-black" style={{ background: config.accent }}>
            <ArrowUp className="w-4 h-4" strokeWidth={3} />
          </button>
        </form>
      </div>
    </div>
  );
}
