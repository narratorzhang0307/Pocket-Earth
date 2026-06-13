// 读书数据源（解耦）：把读过的书钉到「故事发生地 / 作者之地」，在地球上铺成一张阅读地图。
// 豆瓣「书.csv」当前为空，这里先给一组有明确地理归属的文学作品做种子；
// 用户在「读书 agent」里记一本/截图书后，会作为用户落点实时并入地球（见 userMarks）。

export interface BookSeed {
  id: string; title: string; author: string;
  place: string; lng: number; lat: number;   // 故事/作者之地
  year?: number; note?: string;               // 一句短评，比纯笔记更像「藏书票」
}

// 故事之地优先（马孔多→阿拉卡塔卡、雪国→越后汤泽），让地球上的点指向书里的世界
export const SEED_BOOKS: BookSeed[] = [
  { id: 'b01', title: '百年孤独', author: '加西亚·马尔克斯', place: '阿拉卡塔卡 · 哥伦比亚', lng: -74.19, lat: 10.59, year: 1967, note: '马孔多的雨下了四年十一个月零两天。' },
  { id: 'b02', title: '霍乱时期的爱情', author: '加西亚·马尔克斯', place: '卡塔赫纳 · 哥伦比亚', lng: -75.51, lat: 10.39, year: 1985, note: '爱情在等待里发酵了半个世纪。' },
  { id: 'b03', title: '老人与海', author: '海明威', place: '哈瓦那 · 古巴', lng: -82.38, lat: 23.13, year: 1952, note: '人可以被毁灭，但不能被打败。' },
  { id: 'b04', title: '了不起的盖茨比', author: '菲茨杰拉德', place: '长岛 · 纽约', lng: -73.50, lat: 40.79, year: 1925, note: '码头尽头那盏绿灯。' },
  { id: 'b05', title: '麦田里的守望者', author: 'J.D.塞林格', place: '纽约', lng: -73.97, lat: 40.78, year: 1951, note: '我只想做个麦田里的守望者。' },
  { id: 'b06', title: '挪威的森林', author: '村上春树', place: '东京', lng: 139.70, lat: 35.69, year: 1987, note: '每个人都有属于自己的一片森林。' },
  { id: 'b07', title: '白夜行', author: '东野圭吾', place: '大阪', lng: 135.50, lat: 34.69, year: 1999, note: '我的天空里没有太阳，总是黑夜。' },
  { id: 'b08', title: '雪国', author: '川端康成', place: '越后汤泽 · 新潟', lng: 138.81, lat: 36.93, year: 1948, note: '穿过县界长长的隧道，便是雪国。' },
  { id: 'b09', title: '追忆似水年华', author: '普鲁斯特', place: '巴黎', lng: 2.35, lat: 48.85, year: 1913, note: '一块玛德琳点心唤回整个童年。' },
  { id: 'b10', title: '局外人', author: '加缪', place: '阿尔及尔', lng: 3.06, lat: 36.75, year: 1942, note: '今天，妈妈死了。也许是昨天。' },
  { id: 'b11', title: '尤利西斯', author: '詹姆斯·乔伊斯', place: '都柏林', lng: -6.26, lat: 53.35, year: 1922, note: '一座城市的一天，一部小说的一生。' },
  { id: 'b12', title: '罪与罚', author: '陀思妥耶夫斯基', place: '圣彼得堡', lng: 30.34, lat: 59.93, year: 1866, note: '一桩谋杀背后的良心审判。' },
  { id: 'b13', title: '城堡', author: '卡夫卡', place: '布拉格', lng: 14.42, lat: 50.09, year: 1926, note: '永远到不了的城堡。' },
  { id: 'b14', title: '1984', author: '乔治·奥威尔', place: '伦敦', lng: -0.12, lat: 51.51, year: 1949, note: '老大哥在看着你。' },
  { id: 'b15', title: '围城', author: '钱锺书', place: '上海', lng: 121.47, lat: 31.23, year: 1947, note: '城外的人想进去，城里的人想出来。' },
  { id: 'b16', title: '边城', author: '沈从文', place: '湘西凤凰', lng: 109.60, lat: 27.95, year: 1934, note: '这个人也许永远不回来了，也许明天回来。' },
  { id: 'b17', title: '活着', author: '余华', place: '江南乡村', lng: 120.15, lat: 30.27, year: 1993, note: '活着本身就是活着的意义。' },
  { id: 'b18', title: '三体', author: '刘慈欣', place: '北京', lng: 116.40, lat: 39.90, year: 2008, note: '不要回答，不要回答，不要回答。' },
];

// 阅读地图坐标点（给 mapMarkers / 地球用）
export interface BookPoint extends BookSeed { /* 已含 lng/lat */ }
export const bookPoints: BookPoint[] = SEED_BOOKS;
export const bookTotal = SEED_BOOKS.length;

// 给「读书 agent」记一本时选地点用：常见文学之地（含上面用到的城市 + 几个补充）
export const BOOK_PLACES: { name: string; lng: number; lat: number }[] = [
  { name: '北京', lng: 116.40, lat: 39.90 }, { name: '上海', lng: 121.47, lat: 31.23 },
  { name: '杭州', lng: 120.15, lat: 30.27 }, { name: '湘西凤凰', lng: 109.60, lat: 27.95 },
  { name: '东京', lng: 139.70, lat: 35.69 }, { name: '大阪', lng: 135.50, lat: 34.69 },
  { name: '京都', lng: 135.77, lat: 35.01 }, { name: '首尔', lng: 126.97, lat: 37.56 },
  { name: '巴黎', lng: 2.35, lat: 48.85 }, { name: '伦敦', lng: -0.12, lat: 51.51 },
  { name: '都柏林', lng: -6.26, lat: 53.35 }, { name: '布拉格', lng: 14.42, lat: 50.09 },
  { name: '圣彼得堡', lng: 30.34, lat: 59.93 }, { name: '莫斯科', lng: 37.62, lat: 55.75 },
  { name: '纽约', lng: -73.97, lat: 40.78 }, { name: '哈瓦那', lng: -82.38, lat: 23.13 },
  { name: '波哥大', lng: -74.07, lat: 4.71 }, { name: '布宜诺斯艾利斯', lng: -58.38, lat: -34.60 },
  { name: '伊斯坦布尔', lng: 28.98, lat: 41.01 }, { name: '柏林', lng: 13.40, lat: 52.52 },
];
export const bookPlace = (name: string) => BOOK_PLACES.find((p) => p.name === name);
