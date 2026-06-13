// 行程数据源（解耦）：目的地 + 兴趣点(POI)知识库，给「行程 agent」按喜好规划路线用。
// 规划走端侧「挑」：edgeSelector.rank 按喜好给候选 POI 排序；端侧未就绪则按喜好标签命中度本地排序。
// 行程完成后，每个停留点作为用户落点(travel)钉到地球（见 userMarks）。

export type Pref = '美食' | '历史' | '自然' | '艺术' | '夜生活' | '小众' | '购物';
export const PREFERENCES: Pref[] = ['美食', '历史', '自然', '艺术', '夜生活', '小众', '购物'];

export interface POI { name: string; tag: Pref; note: string; lng: number; lat: number }
export interface Destination { name: string; lng: number; lat: number; pois: POI[] }

export const DESTINATIONS: Destination[] = [
  { name: '京都', lng: 135.77, lat: 35.01, pois: [
    { name: '伏见稻荷大社', tag: '历史', note: '千本鸟居一路上山，清晨最静。', lng: 135.77, lat: 34.97 },
    { name: '锦市场', tag: '美食', note: '「京都的厨房」，边走边吃。', lng: 135.76, lat: 35.00 },
    { name: '岚山竹林', tag: '自然', note: '风过竹海，被列入「日本声音风景」。', lng: 135.67, lat: 35.01 },
    { name: '祇园花见小路', tag: '小众', note: '黄昏可能遇见赶场的艺伎。', lng: 135.77, lat: 35.00 },
    { name: '京都国立博物馆', tag: '艺术', note: '看一场和风与佛教美术。', lng: 135.77, lat: 34.99 },
    { name: '先斗町', tag: '夜生活', note: '鸭川边窄巷，居酒屋亮起灯笼。', lng: 135.77, lat: 35.00 },
  ]},
  { name: '巴黎', lng: 2.35, lat: 48.85, pois: [
    { name: '卢浮宫', tag: '艺术', note: '从蒙娜丽莎到胜利女神。', lng: 2.34, lat: 48.86 },
    { name: '拉丁区小馆', tag: '美食', note: '可丽饼与红酒，慢慢坐一下午。', lng: 2.34, lat: 48.85 },
    { name: '蒙马特高地', tag: '小众', note: '画家广场与圣心堂的台阶。', lng: 2.34, lat: 48.89 },
    { name: '塞纳河左岸', tag: '历史', note: '旧书摊与莎士比亚书店。', lng: 2.34, lat: 48.85 },
    { name: '卢森堡公园', tag: '自然', note: '坐在绿椅上看孩子放帆船。', lng: 2.34, lat: 48.85 },
    { name: '玛黑区', tag: '购物', note: '老城里的小众设计店。', lng: 2.36, lat: 48.86 },
  ]},
  { name: '罗马', lng: 12.49, lat: 41.90, pois: [
    { name: '斗兽场', tag: '历史', note: '两千年的回声还在石头里。', lng: 12.49, lat: 41.89 },
    { name: '特拉斯提弗列', tag: '美食', note: '河对岸的老餐馆，正宗罗马面。', lng: 12.47, lat: 41.89 },
    { name: '梵蒂冈博物馆', tag: '艺术', note: '西斯廷礼拜堂的天顶。', lng: 12.45, lat: 41.91 },
    { name: '万神殿', tag: '历史', note: '穹顶中央的圆洞漏下光。', lng: 12.48, lat: 41.90 },
    { name: '博尔盖塞别墅', tag: '自然', note: '城中的大花园，租辆自行车。', lng: 12.49, lat: 41.91 },
    { name: '蒙蒂区', tag: '小众', note: '文艺小巷与古着店。', lng: 12.49, lat: 41.89 },
  ]},
  { name: '伊斯坦布尔', lng: 28.98, lat: 41.01, pois: [
    { name: '圣索菲亚大教堂', tag: '历史', note: '教堂与清真寺在此重叠千年。', lng: 28.98, lat: 41.01 },
    { name: '大巴扎', tag: '购物', note: '四千家店的迷宫，记得砍价。', lng: 28.97, lat: 41.01 },
    { name: '博斯普鲁斯海峡', tag: '自然', note: '一程渡轮，左欧洲右亚洲。', lng: 29.00, lat: 41.04 },
    { name: '卡拉柯伊鱼三明治', tag: '美食', note: '码头边现烤青花鱼夹面包。', lng: 28.97, lat: 41.02 },
    { name: '苏莱曼尼耶清真寺', tag: '艺术', note: '锡南的杰作，黄昏看金角湾。', lng: 28.96, lat: 41.02 },
    { name: '巴拉特彩色街区', tag: '小众', note: '斜坡上的彩色老房子。', lng: 28.95, lat: 41.03 },
  ]},
  { name: '曼谷', lng: 100.50, lat: 13.76, pois: [
    { name: '大皇宫', tag: '历史', note: '玉佛寺的金顶在阳光下发烫。', lng: 100.49, lat: 13.75 },
    { name: '中国城耀华力路', tag: '美食', note: '入夜后的街边大排档。', lng: 100.51, lat: 13.74 },
    { name: '恰图恰周末市场', tag: '购物', note: '上万摊位，什么都有。', lng: 100.55, lat: 13.80 },
    { name: '湄南河夜游', tag: '夜生活', note: '坐船看两岸灯火。', lng: 100.49, lat: 13.74 },
    { name: '律实水上市场', tag: '小众', note: '清晨划船买热带水果。', lng: 100.11, lat: 13.52 },
    { name: '隆比尼公园', tag: '自然', note: '城中绿肺，傍晚有巨蜥散步。', lng: 100.54, lat: 13.73 },
  ]},
  { name: '成都', lng: 104.07, lat: 30.66, pois: [
    { name: '宽窄巷子', tag: '历史', note: '青砖老巷里喝盖碗茶。', lng: 104.06, lat: 30.67 },
    { name: '玉林路苍蝇馆子', tag: '美食', note: '一桌火锅与串串，麻辣鲜香。', lng: 104.07, lat: 30.63 },
    { name: '大熊猫基地', tag: '自然', note: '清晨看滚滚啃竹子。', lng: 104.14, lat: 30.74 },
    { name: '东郊记忆', tag: '艺术', note: '老厂房改的艺术区。', lng: 104.13, lat: 30.66 },
    { name: '九眼桥', tag: '夜生活', note: '锦江边的酒吧一条街。', lng: 104.09, lat: 30.64 },
    { name: '崇德里', tag: '小众', note: '巷子深处的咖啡与书店。', lng: 104.08, lat: 30.66 },
  ]},
];

export const destination = (name: string) => DESTINATIONS.find((d) => d.name === name);

export interface DayPlan { day: number; stops: POI[] }

// 行程规划：按喜好给 POI 打分排序（端侧打分优先，否则本地命中度），再按每天若干站切分
export function planTrip(dest: Destination, prefs: Pref[], days: number, edgeScores?: number[]): DayPlan[] {
  const scored = dest.pois.map((p, i) => {
    const edge = edgeScores && edgeScores.length === dest.pois.length ? edgeScores[i] : 0;
    const local = prefs.includes(p.tag) ? 2 : 0;
    return { p, s: edge * 3 + local + (dest.pois.length - i) * 0.01 };
  }).sort((a, b) => b.s - a.s);
  const perDay = 3;
  const picked = scored.slice(0, Math.max(perDay, Math.min(dest.pois.length, days * perDay))).map((x) => x.p);
  const plans: DayPlan[] = [];
  for (let d = 0; d < days; d++) {
    const stops = picked.slice(d * perDay, d * perDay + perDay);
    if (stops.length) plans.push({ day: d + 1, stops });
  }
  return plans;
}
