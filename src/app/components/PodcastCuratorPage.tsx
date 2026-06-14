import CuratorTabsPage from './CuratorTabsPage';
import PodcastRunPage from './PodcastRunPage';
import { RADIO_CITIES } from '../../../frost-agent/data/radio';

// 城市播客 curator：左「城市·播客」(各城播客 + 播放) + 右「对话·城市」(城市文化 agent)。

const PODCAST_CITIES = RADIO_CITIES.filter((c) => c.podcast && c.podcast.length > 0).map((c) => c.cityNameZh);
const PODCAST_CONTEXT = `有深度播客的城市：${PODCAST_CITIES.join('、') || '（暂无）'}`;

export default function PodcastCuratorPage({ onBack }: { onBack: () => void }) {
  return (
    <CuratorTabsPage
      onBack={onBack}
      title="PODCAST-CURATOR"
      sub="城市播客库 + 城市对话"
      leftLabel="城市 · 播客"
      rightLabel="Frost_City"
      left={<PodcastRunPage onBack={onBack} embedded />}
      chat={{
        accent: '#00aa55',
        persona: '你是「城市」agent，擅长讲一座城市的夜晚、声音与文化气质；用户问哪座城就讲它，并可引导去左边收听该城的深度播客。语气像深夜电台主播，克制有画面感。',
        context: () => PODCAST_CONTEXT,
        placeholder: '想了解哪座城市…',
        suggestions: ['讲讲东京的夜晚', '哪些城市有播客？', '推荐一座适合深夜的城市'],
        intentLabels: ['讲城市', '找播客', '推荐', '其他'],
      }}
    />
  );
}
