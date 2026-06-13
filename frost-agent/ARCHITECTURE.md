# Frost Agent · 架构设计

本文定义 frost-agent 的目标分层架构与演进方向。frost-agent 是 Pocket Earth 的内核：一个面向世界探索的 agent 框架。给定一个对象（城市 / 书 / 画家 / 展览 / 音乐 / 地点 / 人物 / 神话 / 建筑），它去探索资料、整理知识、读取用户长期记忆、生成结构化内容，并发布到 Notion / 前端 / 地图。radio 只是它的第一个 skill。

设计原则：**把地球作为方法** —— 城市、书籍、音乐、艺术、历史与个人记忆，都被重新挂回地球上的某个地点；地图是这套知识的统一索引。

## 1. 现状：一套自带降级的 mini harness

当前实现由六个部件组成：

| 部件 | 文件 | 作用 |
|---|---|---|
| Shell | `harness/persona.ts` | 统一对外人格与声音；用户始终听见同一个声音，而非内部子 agent |
| Brain | `harness/brain.ts`, `httpBrain.ts` | 可插拔 `FrostBrain.complete()`；stub 返回空串，全链路无 LLM 也能跑；密钥只在服务端 |
| Router | `harness/router.ts`, `llmRoute.ts` | 混合路由：规则秒回 → LLM 抽意图 + 城市 → 规则兜底 |
| Memory | `harness/memory.ts` | 会话级记忆（最近若干轮） |
| Boundary | `harness/validator.ts` | 子 agent 只「建议」动作，过校验才落地 |
| Sub-agents | `agents/*` | 每个 = `contract.md`（职责契约）+ 实现；分运行时 agent 与离线流水线 |

需要保留的设计资产：

1. **契约式子 agent**：`contract.md` 写清 Who / What / Where / Output 与 tools / llm / permissionMode。
2. **「只建议、后校验」边界**：子 agent 产出动作建议，`validator` 决定是否执行。
3. **全链路降级**：Brain 返回空串即走规则 fallback，不依赖任何模型也能运行。
4. **混合路由**：便宜的规则挡掉明确指令，LLM 只接自然语言长尾。
5. **trace 一等输出**：路由 / 委派 / 策展过程对用户可见。

## 2. 现状约束：三处把框架绑定在单一领域上的硬编码

要从单一领域走向通用探索框架，需要解开三处绑定：

1. **意图是写死的枚举** `FrostIntent`（`harness/types.ts`），同时被 `router` 与 `llmRoute` 的 prompt 依赖 —— 新增能力要改内核。
2. **动作词表只有 `RadioAction`**，`validator` 也只认这一套 —— 其它领域（地图 / 阅读 / 馆藏）没有自己的动作集。
3. **领域数据只有 `RADIO_CITIES`**，被 router / llmRoute / validator 及多数 agent 直接 `import`。

另有两个缺口：`contract.md` 里的 `tools:` 目前只是文档，没有真正的工具注册表；`memory` 只有会话级，没有跨会话的长期个人记忆。

## 3. 目标分层架构

```
Router  路由
  └─ Skill  技能（可插拔 manifest）
       └─ Sub-agent  子 agent（契约式）
            └─ Tool  工具（注册表）

跨层能力（贯穿四层）：云 Brain · 端侧 Selector · 长期记忆 · Boundary
```

### 3.1 Router · 路由

由「选意图」升级为「先选 Skill，再在 skill 内路由」。意图枚举不再写死在内核，而是各 skill 自己声明。规则快路由 → 意图路由（可走端侧分类器）→ 委派到目标 skill。

### 3.2 Skill · 技能（可插拔 manifest）

每个 skill 自带一份 manifest，声明：

- 领域对象类型（城市 / 书 / 画作 / 地点 …）与数据源；
- 意图集（取代写死的全局枚举）；
- 自己的子 agent 列表；
- **自己的动作词表 + 校验器**（取代单一 `RadioAction` / `validator`）；
- 可选的 persona 覆盖。

`radio` 收敛为 skill #1。`city-walk`、`common-reader`、`museum-curator`、`poem-camera` 等注册即用，**不改内核**。这一步同时解开第 2 节的三处硬编码。

### 3.3 Sub-agent · 子 agent（契约式，保留）

把契约式子 agent 泛化成四种角色：

| 角色 | 职责 | 现状对应 |
|---|---|---|
| `research` | 探索并整理资料（web / PDF / 公开与授权素材）→ 知识库 | `writer-book` 流水线 |
| `curate` | 在候选集上选择 / 排序（选歌 / 选图 / 选书） | `open-dj-director` |
| `script` | 生成结构化内容与播报稿 | `script-tts-pipeline` |
| `publish` | 发布到 Notion / 前端 / 地图 | 待补 |

### 3.4 Tool · 工具（注册表，做实）

把 `contract.md` 里的 `tools:` 声明变成真实函数注册表，按 `permissionMode` 授权：

- `web/PDF` 检索；
- `user-memory` 读取（长期画像）；
- `edge-select` 端侧选择 / 排序 / 嵌入；
- `notion` / `map` 写入。

## 4. 跨层能力

### 4.1 双速模型：云 Brain + 端侧 Selector

- **云 `Brain`**：负责「生成」——文化抽象、叙事、播报串词等质量敏感任务（沿用现有 `FrostBrain` 接口）。
- **端侧 `Selector`**：负责「选择 / 排序 / 嵌入 / 分类」——选歌、选图、选书、意图预分类、RAG 检索。建议新增一个与 `FrostBrain` 平行的接口：

```ts
interface Selector {
  rank(query: string, candidates: Item[]): Promise<Item[]>;
  embed(texts: string[]): Promise<number[][]>;
  classify(text: string, labels: string[]): Promise<string>;
}
```

落点：

| 任务 | 端侧 | 云 |
|---|---|---|
| 选歌 / 选书 | 候选池排序 / 匹配（embedding + 相似度 / 小 reranker） | — |
| 选图 | 端侧图文匹配（CLIP 类） | — |
| 意图预分类 | 小分类器，挡在云路由之前 | 长尾兜底 |
| 个人记忆 / RAG 检索 | 端侧 embedding（数据不出端） | — |
| 叙事 / 抽象 / 串词 | — | 生成 |

一句话：**端侧管「挑和找」，云管「写」。** 端侧路径还带来隐私（个人偏好与相册不出端）、成本与离线三重收益。

### 4.2 长期记忆

`memory` 从「会话级」扩展为「会话 + 画像」：个人偏好、阅读史、收藏与其向量表示。`curate` 与 `script` 都查询画像，使内容是为「这个人」编排的，而非通用生成。

### 4.3 Boundary

「只建议、后校验」边界保留并泛化：每个 skill 注册自己的动作校验器，内核统一在动作落地前调用。

## 5. 演进路径（增量，不重写）

1. 抽出 `Skill` 注册表，把电台收敛为 `radio` skill（intent / action / validator / data 都挂其名下），内核不再 `import RADIO_CITIES`。
2. 把 `tools:` 做成真 Tool 注册表（先落地 `read_kb` / `user-memory` / `notion` 三个）。
3. 新增 `Selector` 接口（先用云 stub 占位），把 `open-dj-director` 的选歌改走 `Selector`。
4. 泛化 `research`（`writer-book` → 通用检索流水线）并补 `publish`（notion）。
5. 上第二个 skill（如 `common-reader` 或 `city-walk`）验证可插拔性。

## 6. 边界与口径

- 前端不保存模型密钥；密钥只从服务端环境变量读取。
- 子 agent 只输出动作建议，所有动作必过校验器。
- 模型不可用时，核心体验仍能通过规则与确定性逻辑运行。
- 知识库语料不默认打包进前端，规避体积 / 版权 / 隐私风险。
- 资料层只检索整理合法、公开或授权素材；音乐层生成风格标签、候选歌单与播报串词，产品化时可接 Apple MusicKit、授权音乐库或用户自有音乐源。
