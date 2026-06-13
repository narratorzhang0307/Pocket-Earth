// Frost Harness · Boundary（动作校验器）
// 子 agent 只「建议」动作，必须过这道校验才会落到播放器。
// 第一版只校验前端命令面 + 资源库城市是否存在；后续可加电台状态检查。
import { RADIO_CITIES } from './domain';
import { RadioAction } from './types';

const VALID_TYPES = new Set(['switch_city', 'play', 'pause', 'next_track', 'prev_track', 'set_playlist']);

export interface ValidationResult {
  valid: RadioAction[];
  rejected: { action: RadioAction; reason: string }[];
}

export function validateActions(actions: RadioAction[]): ValidationResult {
  const slugs = new Set(RADIO_CITIES.map((c) => c.slug));
  const valid: RadioAction[] = [];
  const rejected: { action: RadioAction; reason: string }[] = [];
  for (const a of actions || []) {
    if (!VALID_TYPES.has(a.type)) { rejected.push({ action: a, reason: '未知动作类型' }); continue; }
    if (a.type === 'switch_city' && !slugs.has(a.slug)) { rejected.push({ action: a, reason: `资源库无此城市: ${a.slug}` }); continue; }
    if (a.type === 'set_playlist' && (!a.trackIds || a.trackIds.length === 0)) { rejected.push({ action: a, reason: '空歌单' }); continue; }
    valid.push(a);
  }
  return { valid, rejected };
}
