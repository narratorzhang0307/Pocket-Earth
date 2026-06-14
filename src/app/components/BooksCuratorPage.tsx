import CuratorTabsPage from './CuratorTabsPage';
import BooksRunPage from './BooksRunPage';
import { SEED_BOOKS } from '../data/books';
import { getUserMarksByKind } from '../data/userMarks';

// 读书 curator：左「书架·我的书」(藏书票名录) + 右「对话·读书」(基于你读过的书的读书 agent)。

const staticBooks = SEED_BOOKS.map((b) => `《${b.title}》${b.author}·${b.place}`).join('；');

export default function BooksCuratorPage({ onBack }: { onBack: () => void }) {
  return (
    <CuratorTabsPage
      onBack={onBack}
      title="BOOKS-CURATOR"
      leftLabel="书架"
      rightLabel="Frost_Book"
      left={<BooksRunPage onBack={onBack} embedded />}
      chat={{
        accent: '#b388ff',
        persona: '你是「读书」agent，懂文学、了解用户读过的书，按口味推荐、把读过的书串成主题、聊作者与故事之地。',
        context: () => {
          const user = getUserMarksByKind('book').map((m) => `《${m.label}》`).join('；');
          return `读过的书（种子）：${staticBooks}${user ? `\n用户新记录：${user}` : ''}`;
        },
        placeholder: '聊聊书 / 想读什么…',
        suggestions: ['根据我读过的书推荐三本', '我读过的书里哪些讲孤独？', '推荐适合雨夜读的书'],
        intentLabels: ['推荐', '讨论', '找书', '其他'],
      }}
    />
  );
}
