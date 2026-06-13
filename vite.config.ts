import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { frostEdge } from './frost-agent/edge/viteEdge'

// LLM 代理：dev 中间件，把 /api/frost-llm 转给 DeepSeek。
// 密钥只在服务端（从 .env 读），永不进前端 bundle；无 key / 出错时返回空串，
// 各子 agent 自动回退到规则 fallback。
function frostLlm(env: Record<string, string>): Plugin {
  const KEY = env.DEEPSEEK_API_KEY || ''
  return {
    name: 'frost-llm-proxy',
    configureServer(server) {
      server.middlewares.use('/api/frost-llm', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          const send = (obj: unknown) => {
            res.statusCode = 200
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(obj))
          }
          try {
            if (!KEY) return send({ text: '', error: 'no_key' })
            const { prompt, system, json } = JSON.parse(body || '{}')
            const messages: { role: string; content: string }[] = []
            if (system) messages.push({ role: 'system', content: system })
            messages.push({ role: 'user', content: prompt })
            const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages,
                temperature: 0.7,
                ...(json ? { response_format: { type: 'json_object' } } : {}),
              }),
            })
            const data = await r.json()
            send({ text: data?.choices?.[0]?.message?.content || '' })
          } catch (e) {
            send({ text: '', error: String(e) })
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
    },
    plugins: [react(), tailwindcss(), frostLlm(env), frostEdge(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'frost-agent': path.resolve(__dirname, './frost-agent'),
      },
    },
  }
})
