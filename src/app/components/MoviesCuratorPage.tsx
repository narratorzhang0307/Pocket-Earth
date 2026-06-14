import CuratorTabsPage from './CuratorTabsPage';
import MoviesRunPage from './MoviesRunPage';
import { movieRecords, movieTotal } from '../data/movies';

// 观影 curator：左「片库·我的观影」(电影票根) + 右「对话·观影」(懂你豆瓣口味的观影 agent)。

// 口味摘要（静态预计算，避免每次发送遍历 2000+ 条）
const countryCount: Record<string, number> = {};
for (const m of movieRecords) if (m.country) countryCount[m.country] = (countryCount[m.country] || 0) + 1;
const topCountries = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, n]) => `${c}(${n})`).join('、');
const topRated = [...movieRecords]
  .filter((m) => m.rating != null)
  .sort((a, b) => (b.rating! - a.rating!) || (b.date || '').localeCompare(a.date || ''))
  .slice(0, 20)
  .map((m) => `《${m.title}》${m.director || ''}${m.year ? '·' + m.year : ''}·${m.rating}★`)
  .join('；');
const MOVIE_CONTEXT = `共看过 ${movieTotal} 部；常看国家/地区：${topCountries}；高分代表：${topRated}`;

export default function MoviesCuratorPage({ onBack }: { onBack: () => void }) {
  return (
    <CuratorTabsPage
      onBack={onBack}
      title="MOVIES-CURATOR"
      sub="观影名录 + 观影对话"
      leftLabel="片库 · 我的观影"
      rightLabel="Frost_Movie"
      left={<MoviesRunPage onBack={onBack} embedded />}
      chat={{
        accent: '#ffb000',
        persona: '你是「观影」agent，熟悉影史、能读懂用户的豆瓣观影口味，据此推荐与讨论电影；推荐时尽量贴合用户已看的导演/国别/类型偏好。',
        context: () => MOVIE_CONTEXT,
        placeholder: '聊电影 / 想看什么…',
        suggestions: ['根据我的口味推荐三部', '我看过的高分片里最像《路边野餐》的', '推荐周末适合看的'],
        intentLabels: ['推荐', '讨论', '找片', '其他'],
      }}
    />
  );
}
