# Pocket Earth · 口袋地球

> 一个**本地空间知识库**：把你的书、电影、音乐、照片、行程，全部钉回它们在地球上的那个地点，让一颗地球长成只属于你的知识地图。
>
> 内核是 **frost-agent**——一套「把地球作为方法」的多智能体编排框架（Harness）。架构与术语系统性参考《Claude Code 实战 · Harness 工程之道》第 4 章（子智能体工程）。

---

## 一、它是什么

市面上的知识工具用**双向链接**（Obsidian）或**数据库**（Notion）组织信息。Pocket Earth 换了一根索引轴——**地理坐标**。

人脑记「在哪」往往比记「哪天 / 叫什么」更牢。所以这里的每一条记录都被重新挂回它的地点：

- 一本书钉到它的**故事发生地**（《百年孤独》→ 马孔多 / 阿拉卡塔卡）；
- 一部电影钉到它的**国别 / 取景地**（按豆瓣观影记录落到电影之都）；
- 一首歌钉到**歌手出身地 / 歌曲所写的城市**；
- 一张照片按**经纬度**归位，高价值的才留下；
- 一段行程走完，每个停留点变成地球上的**私人足迹**；
- 你甚至可以一句话造一颗**主题星球**（「日落星球」「鸟类星球」）。

> 一句话：**把地球作为方法，让空间成为记忆的索引。**

---

## 二、三个 Tab

应用是一个手机尺寸的像素风界面，底部三个 Tab：

| Tab | 名称 | 内容 |
|---|---|---|
| 左 | **PHOTOS · 照片** | 同一批照片以「时间 / 日历 / 杂志」三种方式呈现（缩略图灰度、点开彩色） |
| 中 | **🌐 地球** | Mapbox 地球；五类标记 + 用户星球叠加；点开看详情，放大看缩略预览 |
| 右 | **AGENTS · FROST-AGENT** | 多智能体控制台：6 curator + 自定义星球 + 多 agent 圆桌议事，全部可运行 |

中间的地球是**统一索引**——所有 agent 的产出最终都落在这里。

---

## 三、Agent 机制（核心）

frost-agent 不是一个聊天机器人，而是一套**主智能体编排子智能体**的 Harness。下面用《Harness 工程之道》的工程语言讲清它的机制。

### 3.1 CEO 委派模型：主智能体 → 子智能体（curator）

一个**总 frost-agent** 扮演 CEO：它不亲自吞下所有原始数据，而是把不同类型的对象**委派**给专门的 curator 子智能体；每个 curator 在**独立上下文**里完成「整理 → 定位 → 产出落点建议」，只把**结论**回流，而非过程中的全部细节。

这套机制的三重价值，对应软件工程的三条原则：

- **隔离（Isolation）** — 整理一整本相册、抓取一整批网页的噪声，被封锁在 curator 自己的上下文里，主对话只接收结构化结论。如同操作系统的进程隔离 / 舱壁模式，从根上解决信噪比问题。
- **约束（Constraint）** — 每个 curator 只拿它真正需要的工具（最小权限）；写入 / 落点类动作必须经 Boundary 校验。工具白名单即物理边界。
- **复用（Reuse）** — curator 是契约化的、可独立调用、可并行委派的单元，互相之间没有共享状态。

> 详见内核文档 [`frost-agent/ARCHITECTURE.md`](frost-agent/ARCHITECTURE.md) 与 [`frost-agent/HARNESS-PRINCIPLES.md`](frost-agent/HARNESS-PRINCIPLES.md)。

### 3.2 自带降级的 mini-harness（六个部件）

| 部件 | 文件 | 作用 |
|---|---|---|
| **Shell** 人格 | `frost-agent/harness/persona.ts` | 统一对外声音；用户始终面对同一个「人」，而非内部子 agent |
| **Brain** 云脑 | `harness/brain.ts` · `httpBrain.ts` | 可插拔 `FrostBrain.complete()`；stub 返回空串 → **全链路无 LLM 也能跑**；密钥只在服务端 |
| **Router** 路由 | `harness/router.ts` · `llmRoute.ts` | 混合路由（见 3.3） |
| **Memory** 记忆 | `harness/memory.ts` | 会话级记忆（最近若干轮注入提示） |
| **Boundary** 边界 | `harness/validator.ts` | 子 agent 只**建议**动作，过校验才落地（suggest-then-validate） |
| **Sub-agents** 子智能体 | `agents/*` | 每个 = 职责契约 + 实现 |

整套架构的灵魂是**优雅降级**：云脑不可用 → 规则兜底；端侧未就绪 → 走规则；OSS 不可达 → 回落示例资源。任何一环断了，产品依然能跑。

### 3.3 Router：混合路由（省钱省延迟 + 接得住没预料的问法）

```
用户自然语言
   │
   ├─① 明确指令？ → switch-handler 正则秒回（不动用大脑）
   │
   ├─② 否 → 云脑读懂意图 + 抽取实体（LLM intent，泛化长尾）
   │
   └─③ 大脑不可用 → 正则兜底
                    │
                    ▼  委派对应子 agent → Boundary 校验动作 → 返回（带 trace 轨迹）
```

每一步的判断都进入 **trace**（思考轨迹），在 UI 里可见——委派过程天然透明。

### 3.4 端云双脑：端侧「挑和找」，云端「写」

这是 Pocket Earth 把「本地」二字落到实处的关键，也是 Token 经济学与隐私的杠杆：

| | 端侧 Selector（`/api/edge`） | 云端 Brain（`/api/frost-llm`） |
|---|---|---|
| 角色 | **挑 / 找 / 分类 / 排序 / 视觉打标** | **写 / 叙事 / 推荐 / 作答** |
| 模型 | MNN × Qwen3 / Qwen3-VL（本地，ollama 可跑） | DeepSeek（服务端代理，密钥不入前端） |
| 接口 | `httpEdge.classify / rank / embed / vision / chat` | `complete()` |
| 用在哪 | 选歌排序、对话意图分类、照片价值打分与标签、行程喜好排序、主题翻译、截图识别 | DJ 串词、读书 / 观影 / 城市对话作答 |
| 隐私 | **原图与相册不出端**，只有元数据 / 标签 / 坐标进入知识库 | 只接收已脱敏的结构化输入 |

端侧未安装时，所有端侧调用安全返回空值，调用方自动走规则兜底（见 `frost-agent/edge/`）。

### 3.5 五种子智能体类型 → 映射到本项目

《Harness 工程之道》归纳的五种子 agent 形态，在 Pocket Earth 里都有对应：

| 类型 | 含义 | 本项目实例 |
|---|---|---|
| **执行型** | 高噪声海量输入 → 极少高价值输出 | `photos-curator`：扫描整本相册（几千张）→ 仅过阈值的高价值照片钉地球 |
| **流水线型** | 串行处理链 + 交接契约 | music / books：读记录 → 端侧挑选 → geocode 定位 → mark 落点 |
| **并行型** | MapReduce，多专家同时跑 | 流派归类用 12 个子 agent 并行分类 619 位艺人；多 curator 可并行委派 |
| **只读型** | 安全的观察者（只读不写） | 探查 / 检索类委派（如代码探查用 Explore agent） |
| **团队型** | 自组织协作 | 总 frost-agent 编排多 curator 协同；**圆桌议事**让一群 agent 同台辩论（见第五节）|

---

## 四、七个 Agent（数据层 + 对话层）

控制台（右 Tab）里全部 agent 都可点击运行。其中四个采用**双 Tab 结构**——左「数据层」（你的名录），右「对话层」（懂你数据的领域 agent）：

| Agent | 数据层（左 Tab） | 对话层（右 Tab） | 落到地球 |
|---|---|---|---|
| **music-curator** | 曲库：621 首按 **地域 / 城市 / 歌手 / 流派** 四维归类 | 与 FROST 电台 DJ 对话，端侧排序选歌、云写串词 | 歌手出身地 / 歌曲城市（绿） |
| **books-curator** | 书架：EX LIBRIS 藏书票名录 | 读书 agent，基于你读过的书推荐 / 串主题 | 故事发生地（紫） |
| **movies-curator** | 片库：ADMIT ONE 电影票根流（豆瓣 2124 部） | 观影 agent，懂你的豆瓣口味 | 国别 / 电影之都（琥珀） |
| **podcast-curator** | 城市播客库（可播放） | 城市 agent，讲一座城的夜晚与文化 | —（叙事为主） |
| **photos-curator** | 端侧持续整理：整理报告 / 重复清理 / 高价值（单页·执行型） | — | 经纬度归位（青） |
| **travel-curator** | 端侧按喜好规划逐日行程（单页） | — | 完成行程 → 私人足迹（玫红） |
| **planet-builder** | 自定义 agent：一句话造主题星球（Unsplash 抓图） | — | 按主题纬度带散布成新图层 |

每个对话层都**数据接地**——把你该领域的记录注入提示，所以「我读过的书里哪些讲孤独」会真的引用你书架上的《百年孤独》《雪国》《老人与海》逐一点评，而不是泛泛而谈。

---

## 五、多 Agent 圆桌议事（COUNCIL）

除了「各司其职的 curator」，还有第二种协作形态：让一群 agent **同台讨论**。圆桌议事（控制台 → COUNCIL）是一个**与各 curator 解耦**的独立模块，机制借鉴 openhanako 的「频道群聊」，UI 是 Pocket Earth 自己的像素风。

**你来组局**：8 个独立 agent（读书官 / 影评人 / 选曲师 / 摄影眼 / 旅人 / 造星者 / 庭长 / 抬杠侠），各有领域人设、像素头像与口头梗。点头像选谁入场，出一个议题，挑一种模式：

- 🪑 **圆桌** — 各抒己见、出谋划策
- 🗣️ **自由辩论** — 针锋相对、互相反驳
- ⚖️ **法庭** — 正方 / 反方举证质证，最后庭长裁断
- 💡 **头脑风暴** — 放飞脑洞、互相接梗

**机制（仿 openhanako 频道群聊的纯前端回合引擎，见 `src/app/council/engine.ts`）**：

- **频道即真相** → 内存里的 transcript；每个 agent 发言前，把最近若干条群聊上下文注入它的 prompt（标明谁说了什么），独立生成发言。
- **有序轮转** → 一个发言序列（轮流 / 法庭正反交替 + 庭长收尾），一次发言 = 一次 LLM 调用，串行推进。
- **收敛** → 固定轮数 + 用户随时**喊停**（AbortSignal），从机制上避免 agent 之间无限互相回复。

**云端 / 端侧可切**：☁ 云端用 DeepSeek（辩论质量最好）；🖥 端侧用本地 Qwen（**离线可用、隐私不出端**），端侧未就绪时自动回落云端。

解耦体现在：独立目录 `src/app/council/`（`agents` 花名册 + `engine` 回合引擎）+ 独立组件（`PixelAvatar` / `CouncilPage`），只复用已有的 `/api/frost-llm` 与 `/api/edge`，不碰任何 curator 代码。

---

## 六、联动与地图

### 5.1 tab1 ⇄ tab2 实时联动

```
各 agent 产出落点 ──► userMarks / planets （localStorage 发布订阅 store）
                              │  subscribe
                              ▼
                     MyMapTab 合并：静态标记 + 用户落点 + 星球图层
                              │  source.setData()
                              ▼
                       地球图层实时刷新（无需刷新页面）
```

在「观影」里记一部电影、在「读书」里记一本书、走完一段行程、造一颗星球——地球上立刻多出对应的点。

### 5.2 地图标记系统

- **五类基础标记**（mapbox symbol 方块图层，碰撞合并、缩小只显其一、放大散开）：音乐 `#00ff88` / 照片 `#00e5ff` / 电影 `#ffb000` / 书 `#b388ff` / 行程 `#ff3b6b`。
- **用户星球**（mapbox circle 圆点图层，每颗一色）：与基础方块在**形状上**就可区分。
- **点击看详情**：照片灯箱 / 电影票根 / 藏书票 / 行程足迹 / 城市；星球照片含 Unsplash 署名。
- **放大看预览**：缩放到一定级别，照片以真实缩略图叠在地球上，点开看大图。
- **图例**：左下角两段式（基础类 + 星球），可逐层开关 / 删除。

---

## 七、数据来源

| 数据 | 来源 | 是否入库 |
|---|---|---|
| 观影记录 | 豆瓣导出 2124 条 → `src/app/data/douban-movies.json` | ✅ 入库 |
| 音乐流派表 | 端侧并行分类 619 位艺人 → `src/app/data/music-genres.json` | ✅ 入库 |
| 电台资料库 | 96 城 621 曲（音频 / 封面 / 文稿） | ❌ 私有，`resource-library/` |
| 读书 | 18 部文学种子（豆瓣读书导出为空时的兜底） | ✅ 入库 |
| 照片 | 本地图池 + 真实城市坐标 | ❌ 私有 |
| 星球照片 | Unsplash 搜索（CDN 直链，不下载、不落 OSS，合规署名） | 运行时抓取 |

> 后端代理（dev 中间件，密钥只在服务端）：`/api/frost-llm`（DeepSeek）、`/api/edge`（端侧）、`/api/unsplash`（主题抓图）。

---

## 八、目录结构

```
src/app/
  components/        # 界面：三个 Tab + 各 agent 运行页 + 地图 + 详情弹层
    MyMapTab / MarkerDetail / MapLegend          # 地球与标记
    MusicCuratorPage / BooksCuratorPage / …      # 双 Tab 容器（数据层 + 对话层）
    CuratorTabsPage / AgentChat                  # 通用双 Tab 与通用对话层
    PhotosCuratorRunPage / TravelRunPage / PlanetBuilderRunPage
    CouncilPage / PixelAvatar                    # 多 agent 圆桌议事 + 像素头像
  council/          # 圆桌议事（解耦）：agents 花名册 + engine 回合引擎
  data/             # 解耦数据层：movies / books / musicCatalog / photos / travel
                    # userMarks / planets（联动 store）/ themePlanet / photoCuration / mapMarkers / photo-dates

frost-agent/        # 内核 Harness（详见其 ARCHITECTURE.md / HARNESS-PRINCIPLES.md）
  harness/          # persona / brain / router / llmRoute / memory / validator / types
  agents/           # 子 agent：switch-handler / tour-director / open-dj-director / …
  edge/             # 端侧 Selector：types / httpEdge / viteEdge（ollama 路由 + stub 兜底）
  planet/           # viteUnsplash（/api/unsplash 代理）
  data/radio.ts     # 电台资料库装载

resource-library/   # 私有资料库（城市 / 照片 / 音频，gitignore 不入库）
```

---

## 九、运行

```bash
npm install

# 配置密钥（均可选；不配则自动降级到规则 / 兜底资源）
cp .env.example .env
#   VITE_MAPBOX_TOKEN     地球底图
#   DEEPSEEK_API_KEY      云端 Brain（对话 / 串词）
#   UNSPLASH_ACCESS_KEY   星球抓图

npm run dev
```

可选：本地装 [ollama](https://ollama.com) 并拉取 `qwen3:0.6b` / `qwen2.5vl:3b`，端侧 Selector 即真跑（否则走 stub 兜底）。

---

## 十、设计原则（呼应 Harness 工程之道）

- **上下文隔离换信噪比**：海量输入的整理留在子 agent 内部，主对话只见结论（舱壁模式）。
- **工具白名单即边界**：最小权限；落点动作必经 Boundary 校验。
- **model 是成本 / 隐私杠杆**：端侧管挑和找、云端管写；隐私数据不出端。
- **报文传输而非共享内存**：curator 之间不直接通信，主 agent 显式搬运结论；trace 因此天然可见。
- **优雅降级是第一公民**：无 LLM / 无端侧 / 无网络，产品都还能跑。
- **数据与实现解耦**：换数据只换数据源，三视图、地图点、归类自动重排。

---

## 参考

架构与子智能体工程方法系统性借鉴《**Claude Code 实战 · Harness 工程之道**》第 4 章。本项目用自己的领域（个人空间知识库）落地了书中的工程原则。
