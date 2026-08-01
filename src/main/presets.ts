import { randomUUID } from 'node:crypto'
import { DEFAULT_SETTINGS, type AppSettings, type Preset } from '../shared/types'

export type { Preset }

function ensureActive(s: AppSettings): AppSettings {
  // 兼容旧版 settings.json：保留字段已废弃时回到默认；预设列表为空时塞一条默认
  if (!Array.isArray(s.presets) || s.presets.length === 0) {
    const first = DEFAULT_SETTINGS.presets[0]!
    return { ...DEFAULT_SETTINGS, presets: [first], activePresetId: first.id }
  }
  if (!s.presets.find((p) => p.id === s.activePresetId)) {
    return { ...s, activePresetId: s.presets[0]!.id }
  }
  return s
}

export function newPresetId(): string {
  return randomUUID()
}

export function normalizePreset(p: Preset): Preset {
  return {
    id: p.id,
    name: p.name?.trim() || '未命名预设',
    baseUrl: p.baseUrl?.trim().replace(/\/$/, '') || '',
    apiKey: p.apiKey ?? '',
    pricePerImage: Number.isFinite(p.pricePerImage) ? Math.max(0, p.pricePerImage) : 0,
    model: p.model || 'gpt-image-2',
    imageFieldName: p.imageFieldName,
    sizeMode: p.sizeMode,
    sendAspectRatio: !!p.sendAspectRatio,
  }
}

export function activePreset(s: AppSettings): Preset {
  return s.presets.find((p) => p.id === s.activePresetId) ?? s.presets[0]!
}

export type { AppSettings }
export { DEFAULT_SETTINGS, ensureActive }
