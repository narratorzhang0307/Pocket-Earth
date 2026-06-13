// Frost Harness · 领域数据入口
// 真实城市/曲目库由 data/radio 经 import.meta.glob 从本地资源库加载。
// 这里统一再导出，保持各子 agent / validator / llmRoute 的旧 import 路径不变。
// 资源库缺失时（纯代码 clone）RADIO_CITIES 为空数组，agent 自动走规则 fallback。
export * from '../data/radio';
