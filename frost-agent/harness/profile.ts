// Frost Harness · 跨会话长期个人画像（与 memory.ts 平行）
// memory.ts 管「会话内最近几轮」；profile.ts 管「跨会话沉淀下来的口味」。
// 结构化脱敏画像：只存偏好标签的计数（导演 / 作者 / 艺人 / 流派 / 城市…），
// 不存任何原文 / 隐私内容。每个 curator 跑完一次就把信号追加进来，越用越懂你。
//
// 隐私边界（重要）：本模块只在【云脑侧】(httpBrain / 对话注入) 读取使用，
// 端侧 Selector（/api/edge）一律不接触本模块，画像不出端到端侧模型。

export type ProfileDomain = 'books' | 'movies' | 'music' | 'photos' | 'travel';

export interface TagCount { tag: string; n: number }
/** 一个领域下若干「字段 → 标签计数」，如 movies.directors / books.authors。 */
export type ProfileFields = Record<string, TagCount[]>;

export interface Profile {
  domains: Record<string, ProfileFields>;
  seedVersion: number;   // 基线播种版本（见 profileSeed.ts），用于幂等重播
  updatedAt: string;     // ISO
}

const KEY = 'pe.profile.v1';
const MAX_TAGS_PER_FIELD = 50;   // 每个字段最多留 50 个标签，按热度截断，限制体积

function empty(): Profile {
  return { domains: {}, seedVersion: 0, updatedAt: new Date().toISOString() };
}

function load(): Profile {
  try {
    if (typeof localStorage === 'undefined') return empty();
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Profile;
    if (!p || typeof p !== 'object' || !p.domains) return empty();
    return { domains: p.domains, seedVersion: p.seedVersion || 0, updatedAt: p.updatedAt || new Date().toISOString() };
  } catch { return empty(); }
}

let profile: Profile = load();
const subs = new Set<() => void>();

function persist() {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* 容量/隐私模式：内存仍可用 */ }
}
function emit() { subs.forEach((fn) => fn()); }

export function getProfile(): Profile { return profile; }
export function getProfileSeedVersion(): number { return profile.seedVersion; }

/** 累加一批信号：domain.field 下，把每个标签计数 +1（同标签合并、按热度排序、截断）。 */
export function recordSignals(domain: ProfileDomain, fields: Record<string, Array<string | null | undefined>>): void {
  const dom = (profile.domains[domain] ||= {});
  let changed = false;
  for (const [field, tags] of Object.entries(fields)) {
    if (!tags || !tags.length) continue;
    const list = (dom[field] ||= []);
    const index = new Map(list.map((tc) => [tc.tag, tc]));
    for (const raw of tags) {
      const tag = (raw || '').trim();
      if (!tag) continue;
      const hit = index.get(tag);
      if (hit) hit.n += 1;
      else { const tc = { tag, n: 1 }; list.push(tc); index.set(tag, tc); }
      changed = true;
    }
    list.sort((a, b) => b.n - a.n);
    if (list.length > MAX_TAGS_PER_FIELD) dom[field] = list.slice(0, MAX_TAGS_PER_FIELD);
  }
  if (changed) { profile.updatedAt = new Date().toISOString(); persist(); emit(); }
}

/** 标记基线已按某版本播种（幂等：profileSeed 用它避免重复累加同一批静态数据）。 */
export function setSeedVersion(v: number): void {
  if (profile.seedVersion === v) return;
  profile.seedVersion = v;
  profile.updatedAt = new Date().toISOString();
  persist(); emit();
}

export function clearProfile(): void {
  profile = empty();
  persist(); emit();
}

export function subscribeProfile(fn: () => void): () => void {
  subs.add(fn);
  return () => { subs.delete(fn); };
}
