// 端侧模型层 · 统一接口
// 端侧（手机 / 本机）跑小模型做「挑和找」：选歌 / 选图 / 选书 / 意图分类 / 嵌入 / 视觉打标。
// 对齐 v2.0「端侧 Selector + 云 Brain」双速架构：端侧管选择，云管生成。
// 可插拔后端：
//   - ollama   本机 demo：ollama 跑 Qwen3-0.6B（文本）/ Qwen-VL（视觉），HTTP 直连
//   - mnn      手机 / PC 生产：MNN-LLM 跑 MNN 格式的 Qwen3 / Qwen3-VL（见 README）
//   - stub     无模型时的规则兜底（返回空 / 均匀分），调用方自动降级
// 前端通过 /api/edge 调用，密钥 / 模型只在服务端（与 frost-llm 同思路）。

export interface EdgeChatOpts {
  system?: string;
  json?: boolean;
}

/** 端侧模型统一能力。文本任务用 Qwen3 文本模型，视觉任务用 Qwen3-VL。 */
export interface EdgeModel {
  /** 后端是否就绪（非 stub）。 */
  available(): Promise<boolean>;
  /** 自由对话 / 生成（小模型，端侧）。 */
  chat(prompt: string, opts?: EdgeChatOpts): Promise<string>;
  /** 从候选标签里选一个（意图分类等）。 */
  classify(text: string, labels: string[]): Promise<string>;
  /** 给候选打相关度分（0-1，与 candidates 等长），用于选歌 / 选图 / 选书排序。 */
  rank(query: string, candidates: string[]): Promise<number[]>;
  /** 文本向量（语义检索 / 个人记忆）。 */
  embed(texts: string[]): Promise<number[][]>;
  /** 视觉感知：给一张图（url 或 base64）+ 提示，返回结构化结果（Qwen3-VL）。 */
  vision(image: string, prompt: string): Promise<string>;
}

/** /api/edge 的请求体（判别联合）。 */
export type EdgeRequest =
  | { task: 'ping' }
  | { task: 'chat'; prompt: string; system?: string; json?: boolean }
  | { task: 'classify'; text: string; labels: string[] }
  | { task: 'rank'; query: string; candidates: string[] }
  | { task: 'embed'; texts: string[] }
  | { task: 'vision'; image: string; prompt: string };

/** /api/edge 的响应体。backend 标明真实走了哪条后端（stub 表示无模型、调用方应走规则兜底）。 */
export interface EdgeResponse {
  backend: 'ollama' | 'mnn' | 'stub';
  model?: string;
  text?: string;        // chat / vision / classify 结果
  scores?: number[];    // rank
  vectors?: number[][]; // embed
  error?: string;
}

// v2.0 的 Selector：端侧「挑和找」三件套，是 EdgeModel 的子集。
export interface Selector {
  rank(query: string, candidates: string[]): Promise<number[]>;
  classify(text: string, labels: string[]): Promise<string>;
  embed(texts: string[]): Promise<number[][]>;
}
