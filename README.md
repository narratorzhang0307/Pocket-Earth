# Pocket Earth

一个可独立运行的 **My Map** 地图屏（解耦自「上街去 / Hit the Streets」的 My City），外加一套独立的多 agent 编排设计框架 **[`frost-agent/`](frost-agent/)**。

## My Map（应用）

- 顶部 **MAP / GARDEN** 分段切换（像素风 UI）
- **MAP**：Mapbox 杭州西湖街区底图（绿地浅绿主题 + 中文标注），诗歌照片标记随缩放显隐，状态条（TREES / CITY LIT / DISTRICTS）
- **GARDEN**：环境数据面板（LUX / TEMP / FLUX / GRAV）、已种植 / 已收藏诗歌树

### 运行

```bash
# 1. 安装依赖
npm install

# 2. 配置 Mapbox token
cp .env.example .env
# 编辑 .env，填入 VITE_MAPBOX_TOKEN（申请：https://account.mapbox.com/access-tokens/）

# 3. 启动
npm run dev
```

## frost-agent（初始设计框架）

`frost-agent/` 是一套可插拔的多 agent Harness 编排框架的初始设计：统一接收自然语言 → 混合路由（规则秒回 / LLM 意图 / 正则兜底）→ 委派子 agent → Boundary 校验动作。零运行时 npm 依赖、数据与模型均可注入。详见 [`frost-agent/README.md`](frost-agent/README.md)。

> 这是设计框架代码 + 契约文档，独立于上面的 My Map 应用，不参与其构建。

## 结构

```
src/
  main.tsx                 入口，全屏渲染 <MyCityTab />
  styles/                  全局样式（Tailwind v4 + 像素字体 + 主题变量）
  app/
    components/MyCityTab.tsx 等   My Map（MAP / GARDEN）
    lib/                   mapbox token / 绿地主题
  imports/                 地图照片标记图片
frost-agent/               多 agent 编排设计框架
  harness/                 router / brain / llmRoute / validator / memory / persona / domain
  agents/<name>/           contract.md（职责契约）+ index.ts / pipeline.mjs
```

> mock 数据内置在各组件中，可按需替换为真实数据源。
