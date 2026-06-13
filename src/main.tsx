import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { setFrostBrain } from "../frost-agent/harness/brain";
import { httpBrain } from "../frost-agent/harness/httpBrain";

// 接入真实大脑（DeepSeek，经 /api/frost-llm 代理）；无 key 时 agent 自动走规则 fallback
setFrostBrain(httpBrain);

createRoot(document.getElementById("root")!).render(<App />);
