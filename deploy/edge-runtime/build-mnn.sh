#!/usr/bin/env bash
# 编译 MNN 端侧推理引擎(含 LLM 模块) —— 本机(macOS / Linux / WSL)
# 产出 llm_demo(命令行推理验证)与模型转换工具。这是端侧链路的第一步。
# 依赖：git、cmake、make、C++ 工具链。MNN 是开源端侧推理引擎(github.com/alibaba/MNN)。
set -euo pipefail

MNN_DIR="${MNN_DIR:-$HOME/mnn-src/MNN}"
JOBS="${JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 8)}"

if [ ! -d "$MNN_DIR" ]; then
  echo "[build-mnn] 克隆 MNN 源码到 $MNN_DIR"
  git clone --depth 1 https://github.com/alibaba/MNN "$MNN_DIR"
fi

cd "$MNN_DIR"
mkdir -p build && cd build

echo "[build-mnn] cmake 配置(开启 LLM / 多模态 / 转换器)"
cmake \
  -DMNN_BUILD_LLM=ON \
  -DMNN_BUILD_LLM_OMNI=ON \
  -DMNN_BUILD_CONVERTER=ON \
  -DMNN_LOW_MEMORY=ON \
  -DMNN_CPU_WEIGHT_DEQUANT_GEMM=ON \
  -DMNN_SUPPORT_TRANSFORMER_FUSE=ON \
  -DCMAKE_BUILD_TYPE=Release \
  ..

echo "[build-mnn] 编译(-j$JOBS)"
make -j"$JOBS"

echo "[build-mnn] 完成。校验关键产物："
for bin in llm_demo; do
  if find "$MNN_DIR/build" -name "$bin" -type f | grep -q .; then
    echo "  OK  $bin -> $(find "$MNN_DIR/build" -name "$bin" -type f | head -1)"
  else
    echo "  缺失 $bin —— 检查 -DMNN_BUILD_LLM=ON 是否生效" >&2; exit 1
  fi
done
echo "[build-mnn] 下一步：bash fetch-models.sh 取 MNN 格式 Qwen 模型，再 ./llm_demo <config.json> <prompt.txt> 验证。"
