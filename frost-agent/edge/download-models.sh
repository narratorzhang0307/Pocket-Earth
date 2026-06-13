#!/usr/bin/env bash
# 拉取本机 demo 的端侧模型（ollama 后端）。手机 / PC 生产用 MNN，见 README.md。
set -e

if ! command -v ollama >/dev/null 2>&1; then
  echo "未检测到 ollama。请先安装：https://ollama.com （macOS 可用官方 App 或 brew install ollama）"
  exit 1
fi

echo "拉取文本模型 qwen3:0.6b（选歌 / 选书 / 分类 / 嵌入）…"
ollama pull qwen3:0.6b

echo "拉取视觉模型 qwen2.5vl:3b（照片打标 / 场景分析）…"
ollama pull qwen2.5vl:3b

echo "完成。确保 'ollama serve' 在运行，然后 npm run dev —— /api/edge 会自动接入端侧模型。"
