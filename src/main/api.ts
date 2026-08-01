import axios, { type AxiosError, type AxiosResponse } from 'axios'
import type { GenerateRequest, GenerateResult } from '../shared/types'
import { sizeString } from '../shared/size'
import { loadSettings } from './settings'
import { activePreset } from './presets'
import { normalizeResponse } from './normalize'

const CONTROLLERS = new Map<string, AbortController>()

function bodySnippet(s: string): string {
  return s.length > 2000 ? s.slice(0, 2000) + '…' : s
}

export async function generate(req: GenerateRequest): Promise<GenerateResult> {
  const settings = loadSettings()
  const preset = activePreset(settings)
  if (!preset.baseUrl) return { ok: false, code: 'config', message: '当前预设未配置 API Base URL，请到设置中编辑预设' }
  if (!preset.apiKey) return { ok: false, code: 'config', message: '当前预设未配置 API Key，请到设置中编辑预设' }

  // Payload size check (base64 strings are the heavy part).
  const payloadBytes = req.images.reduce((sum, s) => sum + Math.floor(s.length * 0.75), 0)
  if (payloadBytes > 20 * 1024 * 1024) {
    return { ok: false, code: 'payload', message: `参考图总体积 ${(payloadBytes / 1024 / 1024).toFixed(1)}MB 过大（建议 ≤ 20MB）` }
  }

  const body: Record<string, unknown> = {
    model: preset.model,
    prompt: req.promptResolved,
    n: req.params.count,
    quality: req.params.quality,
  }
  const size = sizeString(req.params.aspect, req.params.resolution, preset.sizeMode)
  if (size) body.size = size
  if (preset.sendAspectRatio) body.aspect_ratio = req.params.aspect
  if (req.images.length > 0) {
    const v = req.images.length === 1 ? req.images[0] : req.images
    body[preset.imageFieldName] = v
  }

  const url = `${preset.baseUrl}/v1/images/generations`
  const ctrl = new AbortController()
  CONTROLLERS.set(req.requestId, ctrl)

  try {
    const resp: AxiosResponse = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${preset.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: settings.timeoutMs,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      signal: ctrl.signal,
      responseType: 'json',
    })
    return await normalizeResponse(req, resp.data)
  } catch (e) {
    const ax = e as AxiosError
    if (ax.name === 'CanceledError' || ax.code === 'ERR_CANCELED') {
      return { ok: false, code: 'canceled', message: '已取消' }
    }
    if (ax.code === 'ECONNABORTED') {
      return { ok: false, code: 'timeout', message: `请求超时（${settings.timeoutMs}ms）` }
    }
    if (ax.response) {
      const status = ax.response.status
      const data = ax.response.data
      const bodyStr = typeof data === 'string' ? data : (() => { try { return JSON.stringify(data) } catch { return String(data) } })()
      return { ok: false, code: 'http', status, message: `HTTP ${status}`, body: bodySnippet(bodyStr) }
    }
    return { ok: false, code: 'network', message: ax.message || '网络错误' }
  } finally {
    CONTROLLERS.delete(req.requestId)
  }
}

export function cancel(requestId: string): void {
  const c = CONTROLLERS.get(requestId)
  if (c) {
    c.abort()
    CONTROLLERS.delete(requestId)
  }
}
