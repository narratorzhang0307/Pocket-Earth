---
name: music-pipeline
description: |
  音乐资产流水线（离线脚本，非浏览器运行时）。从城市音乐稿/歌曲目录出发，
  解析 YouTube URL → 下载音频 → 格式整理（时长/文件名）→ 上传阿里云 OSS →
  把可播放 URL 写回资源库 audio.db。城市增删只动数据，不动 UI。
type: pipeline
runtime: node
llm: false
io:
  in: "城市 slug + [{ trackId, title, artist, query }]"
  out: "audio.db tracks.audio_url 写入"
---

# 阶段（责任链）
1. resolve   歌名/艺人 → YouTube 视频 URL（需 yt-dlp / API）— 接入点
2. download  下载音频（需 yt-dlp）— 接入点
3. normalize 转码/统一格式/取时长（需 ffmpeg）— 接入点
4. upload    上传阿里云 OSS（需 ossutil / OSS SDK + 凭据）— 接入点
5. writeback 把 OSS URL 写回 audio.db（✅ 已实现）

# 边界
- 不在前端跑、不进 bundle。
- 外部步骤需要工具与凭据；本仓库不含任何 OSS 密钥。
- writeback 是真实可用步骤：拿到 OSS URL 后即可入库。

# 用法
```bash
# 已有 OSS URL → 直接写库（最常用）
node src/modules/frost-agent/agents/music-pipeline/pipeline.mjs \
  writeback --city <slug> --track <trackId> --url <oss_url>
# 查看完整流水线计划（不执行外部步骤）
node .../pipeline.mjs plan --city <slug>
# 之后：npm run radio:build
```
