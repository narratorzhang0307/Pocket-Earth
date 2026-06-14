#!/usr/bin/env python3
# 端侧推理 sidecar：把 MNN-LLM 跑起来的本地 HTTP 端点，给上层应用的 /api/edge 适配层调用。
# OpenAI 兼容最小面：/health、/v1/chat(文本+图片)、/v1/embeddings(可降级)。
# 设计要点：
#   - 文本模型(Qwen3.5 小尺寸)与视觉模型(Qwen3-VL)各加载一份，按请求里 model=text|vision 选。
#   - 防输出截断坑：强制纯 JSON、剥掉 Markdown 代码围栏(```)——预编译 MNN 在 step decode
#     遇到 ``` 前缀会误触发假结束符导致提前停，做结构化输出(classify/rank/vision)时必须规避。
#   - 全程离线本地推理；模型路径由环境变量传入。
#
# 运行：python3 server.py  （或用 serve.sh 带调优参数）
# 依赖：pymnn(含 LLM 运行时)。安装/编译见 build-mnn.sh 与 README；不同 MNN 版本的 python API
#       可能略有差异，下方 _load / _infer 两处是唯一需要按你这版 MNN 适配的地方。
import json, os, re, sys, gc
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TEXT_CONFIG = os.environ.get('MNN_TEXT_CONFIG', '')      # 文本模型 config.json 绝对路径
VISION_CONFIG = os.environ.get('MNN_VISION_CONFIG', '')  # 视觉模型 config.json 绝对路径
PORT = int(os.environ.get('MNN_PORT', '8000'))
THREAD_NUM = int(os.environ.get('MNN_THREAD_NUM', '4'))  # 绑大核数量
PRECISION = os.environ.get('MNN_PRECISION', 'low')       # low 换速度
USE_MMAP = os.environ.get('MNN_USE_MMAP', 'true')        # 防大模型加载闪退
# 视觉打分提速：发图前缩图(降 prefill) + 视觉每次全新实例(防多模态重用串味/失控) + 截掉失控尾巴
VISION_MAX_PX = int(os.environ.get('MNN_VISION_MAX_PX', '448'))  # 视觉图最长边上限，越小越快

_FENCE = re.compile(r'^\s*```[a-zA-Z]*\s*|\s*```\s*$')   # 去 Markdown 代码围栏
_THINK = re.compile(r'<think>.*?</think>', re.S)         # 去思考块(Qwen3 思考模式残留)
_EOS = re.compile(r'<\|endoftext\|>|<\|im_end\|>')       # 终止符：之后内容一律是失控尾巴
_RUNAWAY = re.compile(r'(?:\s*\*+\s*-+\s*){3,}.*$', re.S)  # 失控复读尾巴(** --- ** ---…)

_models = {}  # name -> handle


def _load(config_path: str):
    """加载一份 MNN-LLM 模型：create(config) → set_config(端侧调优) → load()。"""
    import MNN.llm as mnnllm          # pymnn 的 LLM 运行时(pip install MNN 即含)
    m = mnnllm.create(config_path)
    try:
        m.set_config({'precision': PRECISION, 'thread_num': THREAD_NUM, 'memory': 'low'})
    except Exception:
        pass
    m.load()
    return m


def _downscale(raw: bytes) -> bytes:
    """发图前缩图：最长边压到 VISION_MAX_PX、转 JPEG，显著降低视觉 prefill。无 Pillow / 失败时原样返回。"""
    if VISION_MAX_PX <= 0:
        return raw
    try:
        import io
        from PIL import Image
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        w, h = im.size
        longest = max(w, h)
        if longest > VISION_MAX_PX:
            s = VISION_MAX_PX / float(longest)
            im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
        buf = io.BytesIO(); im.save(buf, format='JPEG', quality=82)
        return buf.getvalue()
    except Exception:
        return raw  # 缩图失败不挡推理


def _infer(model, prompt: str, images=None) -> str:
    """单轮推理。视觉先缩图、再写临时文件、用 <img> 标签喂给 Qwen-VL。
    注意：多模态模型这版 MNN 不能跨调用重用(reset/reuse_kv 都会串味/复读/失控)，
    视觉每次用全新实例，见 do_POST。"""
    if images:
        import base64, tempfile
        tmp, tags = [], ''
        try:
            for img in images:
                raw = img.split(',', 1)[1] if (img.strip().startswith('data:') and ',' in img) else img
                data = _downscale(base64.b64decode(raw))
                fd, path = tempfile.mkstemp(suffix='.jpg')
                with os.fdopen(fd, 'wb') as f:
                    f.write(data)
                tmp.append(path); tags += f'<img>{path}</img>'
            return str(model.response(tags + prompt, stream=False))
        finally:
            for p in tmp:
                try: os.remove(p)
                except OSError: pass
    return str(model.response(prompt, stream=False))


def _ensure(name: str):
    cfg = VISION_CONFIG if name == 'vision' else TEXT_CONFIG
    if not cfg or not os.path.isfile(cfg):
        raise RuntimeError(f'模型 {name} 未配置或 config 不存在: {cfg}')
    if cfg in _models:           # 按 config 路径缓存：文本/视觉指向同一多模态模型时只载一份
        return _models[cfg]
    _models[cfg] = _load(cfg)
    return _models[cfg]


def _strip_fence(t: str) -> str:
    t = _THINK.sub('', t or '')              # 先去思考块
    t = _EOS.split(t)[0]                      # 砍掉终止符之后的失控尾巴
    t = _RUNAWAY.sub('', t)                   # 砍掉 ** --- 复读尾巴
    return _FENCE.sub('', t.strip()).strip()  # 再去代码围栏


class H(BaseHTTPRequestHandler):
    def _send(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(body))); self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):  # 静音默认访问日志
        pass

    def do_GET(self):
        if self.path == '/health':
            ready = {'text': os.path.isfile(TEXT_CONFIG or ''), 'vision': os.path.isfile(VISION_CONFIG or '')}
            return self._send({'status': 'ok', 'backend': 'mnn', 'models': ready})
        self._send({'error': 'not found'}, 404)

    def do_POST(self):
        ln = int(self.headers.get('content-length', 0))
        try:
            req = json.loads(self.rfile.read(ln) or b'{}')
        except Exception:
            return self._send({'error': 'bad json'}, 400)
        try:
            if self.path == '/v1/chat':
                name = 'vision' if req.get('model') == 'vision' or req.get('images') else 'text'
                sys_p = (req.get('system') or '').strip()
                # 防截断：要 JSON 时显式要求纯 JSON、禁代码围栏
                if req.get('json'):
                    sys_p = (sys_p + '\n只输出纯 JSON，不要 Markdown 代码块、不要 ``` 包裹。').strip()
                prompt = (sys_p + '\n' + req.get('prompt', '')).strip() if sys_p else req.get('prompt', '')
                if name == 'vision':
                    # 多模态模型不能跨调用重用：每次全新实例(mmap 重载很快)、用完释放，保证稳定无失控
                    cfg = VISION_CONFIG if (VISION_CONFIG and os.path.isfile(VISION_CONFIG)) else TEXT_CONFIG
                    if not (cfg and os.path.isfile(cfg)):
                        raise RuntimeError('vision 模型未配置')
                    model = _load(cfg)
                    try:
                        out = _infer(model, prompt, req.get('images'))
                    finally:
                        del model; gc.collect()
                else:
                    out = _infer(_ensure(name), prompt, req.get('images'))
                return self._send({'backend': 'mnn', 'model': name, 'text': _strip_fence(out)})
            if self.path == '/v1/embeddings':
                # MNN-LLM 主线给 chat；嵌入若无专用头，由上层适配层降级为确定性向量。
                return self._send({'backend': 'mnn', 'vectors': None,
                                   'note': 'no embedding head; caller should fallback'})
            self._send({'error': 'not found'}, 404)
        except Exception as e:
            self._send({'backend': 'stub', 'error': str(e)}, 200)  # 出错回 stub 语义，上层自动降级


def main():
    if not TEXT_CONFIG and not VISION_CONFIG:
        print('[server] 未设置 MNN_TEXT_CONFIG / MNN_VISION_CONFIG，先 fetch-models.sh 再用 serve.sh 传入', file=sys.stderr)
    print(f'[server] MNN sidecar 监听 127.0.0.1:{PORT}  text={bool(TEXT_CONFIG)} vision={bool(VISION_CONFIG)}')
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()


if __name__ == '__main__':
    main()
