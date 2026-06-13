// Frost Harness · 领域模型（Domain）
// 框架自带的电台领域类型 + 可注入的城市数据源。
// 设计框架本身不绑定任何具体数据集：RADIO_CITIES 默认空数组，
// 接入方调用 setStations() 注入自己的城市/曲目数据即可驱动整条 agent 流水线。

export interface RadioTrack {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  audioUrl: string;       // 曲目音频
  introText: string;      // DJ 解说词
  introAudioUrl: string;  // DJ 解说音频
  // 跨城歌单专用：每首曲目可带自己城市的封面/名/时区。
  cityNameZh?: string;
  cityName?: string;
  cover?: string;
  ianaTz?: string | null;
  tzOffset?: number;
}

export interface PodcastSegment {
  id: string;
  title: string;
  subtitle: string;       // 城市 / 作者
  text: string;           // 文稿
  audioUrl: string;
}

export interface RadioCity {
  slug: string;
  cityName: string;
  cityNameZh: string;
  ianaTz: string | null;  // 有则用 Intl 精确算当地时间
  tzOffset: number;       // 退化方案：按时区偏移粗算
  station: { freq: number; name: string };
  cover: string;
  tracks: RadioTrack[];
  podcast: PodcastSegment[];
  lat?: number;
  lng?: number;
  description?: string;
}

// 框架默认不内置任何数据集；由接入方注入。
export let RADIO_CITIES: RadioCity[] = [];

/** 注入城市/曲目数据源，驱动 agent 流水线。 */
export function setStations(cities: RadioCity[]): void {
  RADIO_CITIES = cities;
}
