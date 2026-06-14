// Frost Harness · agent 主动性（P2-H）：后台 heartbeat
// 开着应用就定期跑一遍：读你的长期画像 → 产出一条「今日推荐 / 候选动作」。
// 关键原则 suggest-then-confirm：只给建议，你一键采纳才落地，绝不偷改你的数据。
// 纯前端 + localStorage pub/sub；无画像 / 无网络都安全降级（产不出建议就不产）。
import { getProfile } from './profile';
import { recordHealth } from './health';

export interface Suggestion {
  id: string;
  text: string;        // 给用户看的一句话建议
  target?: string;     // 采纳后导航到的可运行 agent 名（如 'movies-curator'）
  cta?: string;        // 采纳按钮文案
  createdAt: string;   // ISO
}

const KEY = 'pe.heartbeat.v1';
interface State { current: Suggestion | null; dismissed: string[]; cursor: number }

function load(): State {
  try {
    if (typeof localStorage !== 'undefined') {
      const r = localStorage.getItem(KEY);
      if (r) { const s = JSON.parse(r); return { current: s.current || null, dismissed: s.dismissed || [], cursor: s.cursor || 0 }; }
    }
  } catch { /* 隐私模式：内存仍可用 */ }
  return { current: null, dismissed: [], cursor: 0 };
}

let state: State = load();
const subs = new Set<() => void>();
function persist() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }
function emit() { subs.forEach((fn) => fn()); }

export function subscribeHeartbeat(fn: () => void): () => void { subs.add(fn); return () => { subs.delete(fn); }; }
export function getSuggestion(): Suggestion | null { return state.current; }

function topTag(domain: string, field: string): string | null {
  const list = getProfile().domains?.[domain]?.[field];
  return list && list.length ? list[0].tag : null;
}

// 候选建议池：按画像 top 标签生成（无该项就跳过），外加两条总在的通用项。
function candidates(): Suggestion[] {
  const out: Suggestion[] = [];
  const mk = (id: string, text: string, target: string, cta: string): Suggestion => ({ id, text, target, cta, createdAt: '' });
  const dir = topTag('movies', 'directors'); if (dir) out.push(mk('mv-dir', `你常看 ${dir}，去地球上重温你钉过的电影？`, 'movies-curator', '去看看'));
  const au = topTag('books', 'authors'); if (au) out.push(mk('bk-au', `你偏爱 ${au}，翻翻书架的故事地图？`, 'books-curator', '翻书架'));
  const ge = topTag('music', 'genres'); if (ge) out.push(mk('mu-ge', `深夜适合 ${ge}，让 frost 给你点一单？`, 'music-curator', '点一单'));
  if (topTag('photos', 'cities')) out.push(mk('ph-ci', '相册攒了不少，把高价值照片端侧打分、钉上地球？', 'photos-curator', '整理相册'));
  out.push(mk('planet', '说一个主题，造一颗只属于你的星球？', 'planet-builder', '造星球'));
  out.push(mk('mood', '此刻在世界某处的心情，记一条钉到地图？', 'mood-curator', '记心情'));
  return out;
}

/** 跑一次心跳：按 cursor 轮换选一条没被忽略过的建议，写进 store。 */
export function tick(): void {
  try {
    const cs = candidates();
    if (!cs.length) { state.current = null; persist(); emit(); recordHealth('heartbeat', true); return; }
    const fresh = cs.filter((c) => !state.dismissed.includes(c.id));
    const pool = fresh.length ? fresh : cs;             // 都忽略过就重新轮换
    const pick = pool[state.cursor % pool.length];
    state.current = { ...pick, createdAt: new Date().toISOString() };
    persist(); emit();
    recordHealth('heartbeat', true);
  } catch (e) {
    recordHealth('heartbeat', false, String(e));
  }
}

/** 采纳当前建议：清掉它并把它返回给调用方去执行（如导航到 target）。 */
export function adoptSuggestion(): Suggestion | null {
  const s = state.current;
  state.current = null; persist(); emit();
  return s;
}

/** 忽略当前建议：记入 dismissed、游标 +1，并立刻给下一条。 */
export function dismissSuggestion(): void {
  if (state.current && !state.dismissed.includes(state.current.id)) state.dismissed.push(state.current.id);
  state.cursor += 1;
  state.current = null;
  persist(); emit();
  tick();
}

let timer: ReturnType<typeof setInterval> | null = null;
/** 启动 heartbeat：先跑一次，再每隔 intervalMs 跑一次。重复调用安全（只起一个定时器）。 */
export function startHeartbeat(intervalMs = 120000): () => void {
  if (timer) return () => {};
  if (!state.current) tick();
  timer = setInterval(tick, intervalMs);
  return () => { if (timer) { clearInterval(timer); timer = null; } };
}
