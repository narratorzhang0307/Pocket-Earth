// Frost Harness · LLM 意图路由（泛化层）
// 明确指令由 switch-handler 正则秒回；其余交给大脑读懂自然语言、判断意图 + 抽城市。
// 大脑不可用（stub/无 key/出错）时返回 null，调用方回退到规则路由。
import { FrostContext, FrostIntent } from './types';
import { getFrostBrain } from './brain';
import { formatHistory } from './memory';
import { RADIO_CITIES } from './domain';

export interface LlmRoute {
  intent: FrostIntent;   // switch | tour | open_dj | city_culture | general
  city?: string;         // 抽到的城市中文名（供 switch / city_culture）
  reason?: string;       // 给思考痕迹用
}

const ALLOWED = new Set<FrostIntent>(['switch', 'tour', 'open_dj', 'city_culture', 'general']);
const CITY_NAMES = RADIO_CITIES.map((c) => c.cityNameZh).join('、');

const buildPrompt = (text: string, history: string) =>
  `你是电台总控的「意图路由」。读用户这句话和最近对话，判断属于哪一类，并抽出城市（若有）。\n` +
  (history ? history : '') +
  `类别（intent 只能取其一）：\n` +
  `- switch：想切到/播放某座具体城市的电台（如"播放圣彼得堡的歌""切到东京""来点东京的"）\n` +
  `- tour：跟着日落走 / 现在哪座城在日落 / 想要一整夜的电台\n` +
  `- open_dj：按书/作家/心情/场景要一份歌单（"我在读卡夫卡""想要松弛点的""适合开车的"）\n` +
  `- city_culture：问某座城/某位歌手/某首作品背后的事、历史、文化\n` +
  `- general：其它任何（电台能做什么、世界常识、闲聊、说不清的）\n` +
  `城市候选（city 只能从这些中文名里选，选不到就留空）：${CITY_NAMES}\n` +
  `返回严格 JSON：{"intent":"switch|tour|open_dj|city_culture|general","city":"<中文城市名或空>","reason":"一句中文，为什么这样判断"}\n` +
  `用户：${text}`;

export async function llmRoute(ctx: FrostContext): Promise<LlmRoute | null> {
  const text = (ctx.userText || '').trim();
  if (!text) return null;
  let raw = '';
  try { raw = (await getFrostBrain().complete(buildPrompt(text, formatHistory(ctx.history)), { json: true })).trim(); } catch { raw = ''; }
  if (!raw) return null; // 大脑不可用 → 调用方回退正则
  try {
    const p = JSON.parse(raw) as { intent?: string; city?: string; reason?: string };
    const intent = (p.intent && ALLOWED.has(p.intent as FrostIntent) ? p.intent : 'general') as FrostIntent;
    const city = (p.city || '').trim() || undefined;
    return { intent, city, reason: (p.reason || '').trim() || undefined };
  } catch { return null; }
}
