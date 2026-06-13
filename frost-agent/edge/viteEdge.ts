import type { Plugin } from 'vite'

// 端侧推理中间件：/api/edge → 探测本机 ollama → 路由到 Qwen3（文本）/ Qwen-VL（视觉）。
// 无 ollama 时返回 stub（规则兜底），前端调用方自动降级，demo 照常工作。
// 生产手机端改走 MNN-LLM（见 frost-agent/edge/README.md）；本机 demo 用 ollama。
// 模型 / 地址只在服务端，从 .env 读：OLLAMA_URL / EDGE_MODEL / EDGE_VISION_MODEL。
export function frostEdge(env: Record<string, string>): Plugin {
  const OLLAMA = env.OLLAMA_URL || 'http://localhost:11434'
  const MODEL = env.EDGE_MODEL || 'qwen3:0.6b'
  const VMODEL = env.EDGE_VISION_MODEL || 'qwen2.5vl:3b'

  let up: boolean | null = null
  let upAt = 0
  async function probe(): Promise<boolean> {
    const now = Date.now()
    if (up !== null && now - upAt < 10000) return up
    try {
      const r = await fetch(OLLAMA + '/api/tags', { signal: AbortSignal.timeout(1500) })
      up = r.ok
    } catch {
      up = false
    }
    upAt = now
    return !!up
  }

  type Msg = { role: string; content: string; images?: string[] }
  async function chat(messages: Msg[], opts?: { json?: boolean; think?: boolean; model?: string }): Promise<string> {
    const r = await fetch(OLLAMA + '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: opts?.model || MODEL,
        messages,
        stream: false,
        think: opts?.think ?? false,
        ...(opts?.json ? { format: 'json' } : {}),
      }),
    })
    const d = await r.json()
    return d?.message?.content || ''
  }

  async function embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = []
    for (const t of texts) {
      try {
        const r = await fetch(OLLAMA + '/api/embeddings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: MODEL, prompt: t }),
        })
        const d = await r.json()
        out.push(Array.isArray(d?.embedding) ? d.embedding : [])
      } catch {
        out.push([])
      }
    }
    return out
  }

  async function toBase64(image: string): Promise<string> {
    if (image.startsWith('data:')) return image.split(',')[1] || ''
    if (image.startsWith('http')) {
      const ab = await (await fetch(image)).arrayBuffer()
      return Buffer.from(ab).toString('base64')
    }
    return image
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handle(raw: string): Promise<any> {
    const b = JSON.parse(raw || '{}')
    if (!(await probe())) return stub(b)
    switch (b.task) {
      case 'ping':
        return { backend: 'ollama', model: MODEL }
      case 'chat': {
        const msgs: Msg[] = []
        if (b.system) msgs.push({ role: 'system', content: b.system })
        msgs.push({ role: 'user', content: b.prompt })
        return { backend: 'ollama', model: MODEL, text: await chat(msgs, { json: b.json }) }
      }
      case 'classify': {
        const t = await chat(
          [
            { role: 'system', content: '你是分类器。只输出给定选项中的一个，不要任何多余文字。' },
            { role: 'user', content: `文本：${b.text}\n选项：${(b.labels || []).join(' / ')}\n答：` },
          ],
          { think: false }
        )
        const pick = (b.labels || []).find((l: string) => t.includes(l)) || (b.labels || [])[0] || ''
        return { backend: 'ollama', text: pick }
      }
      case 'rank': {
        const t = await chat(
          [
            { role: 'system', content: '给每个候选打 0-100 的相关度分。只返回一个 JSON 数组（仅数字，长度与候选一致）。' },
            { role: 'user', content: `查询：${b.query}\n候选：\n${(b.candidates || []).map((c: string, i: number) => `${i}. ${c}`).join('\n')}\nJSON：` },
          ],
          { json: true, think: false }
        )
        let scores: number[]
        try {
          const arr = JSON.parse(t)
          const list = Array.isArray(arr) ? arr : arr.scores || []
          scores = (b.candidates || []).map((_: string, i: number) => (Number(list[i]) || 0) / 100)
        } catch {
          scores = (b.candidates || []).map(() => 0.5)
        }
        return { backend: 'ollama', scores }
      }
      case 'embed':
        return { backend: 'ollama', vectors: await embed(b.texts || []) }
      case 'vision': {
        const b64 = await toBase64(b.image)
        const text = await chat([{ role: 'user', content: b.prompt, images: [b64] }], { model: VMODEL, think: false })
        return { backend: 'ollama', model: VMODEL, text }
      }
      default:
        return stub(b)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function stub(b: any): any {
    switch (b?.task) {
      case 'rank': {
        const n = (b.candidates || []).length
        return { backend: 'stub', scores: (b.candidates || []).map((_: string, i: number) => (n > 1 ? 1 - i / (n - 1) : 1)) }
      }
      case 'embed':
        return { backend: 'stub', vectors: (b.texts || []).map(() => []) }
      case 'classify':
        return { backend: 'stub', text: (b.labels || [])[0] || '' }
      default:
        return { backend: 'stub', text: '' }
    }
  }

  return {
    name: 'frost-edge',
    configureServer(server) {
      server.middlewares.use('/api/edge', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          try { res.end(JSON.stringify(await handle(body))) } catch (e) { res.end(JSON.stringify({ backend: 'stub', error: String(e) })) }
        })
      })
    },
  }
}
