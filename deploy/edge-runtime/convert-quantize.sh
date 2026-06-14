#!/usr/bin/env bash
# 自己把原始 Qwen 转换 + 量化为 MNN 格式（仅当官方没有现成 MNN 包时才需要）。
# 走 MNN-LLM 的 export 工具：原始 Qwen(safetensors) → ONNX/计算图 → MNN，并做权重量化(默认 4bit)。
set -euo pipefail

MNN_DIR="${MNN_DIR:-$HOME/mnn-src/MNN}"
SRC_REPO="${SRC_REPO:-Qwen/Qwen3-0.6B}"            # 原始模型(modelscope.cn/organization/Qwen)
WORK="${WORK:-$HOME/mnn-export}"
QUANT_BIT="${QUANT_BIT:-4}"                         # 量化位宽：4 省内存，8 更精
mkdir -p "$WORK"; cd "$WORK"

EXPORT_DIR="$MNN_DIR/transformers/llm/export"
[ -d "$EXPORT_DIR" ] || { echo "找不到 $EXPORT_DIR，先 bash build-mnn.sh 克隆 MNN" >&2; exit 1; }

echo "[convert] 安装导出依赖"
pip install -r "$EXPORT_DIR/requirements.txt"

echo "[convert] 下载原始模型 $SRC_REPO"
modelscope download "$SRC_REPO" --local_dir "$WORK/$(basename "$SRC_REPO")"

echo "[convert] 导出为 MNN（${QUANT_BIT}bit 量化）"
# 具体参数名以你这版 MNN 的 llmexport.py --help 为准；下面是常见形态：
python "$EXPORT_DIR/llmexport.py" \
  --path "$WORK/$(basename "$SRC_REPO")" \
  --export mnn \
  --quant_bit "$QUANT_BIT" \
  --dst_path "$WORK/$(basename "$SRC_REPO")-MNN"

echo "[convert] 完成：$WORK/$(basename "$SRC_REPO")-MNN/（应含 config.json / llm.mnn / llm.mnn.weight）"
