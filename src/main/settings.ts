import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { type AppSettings, DEFAULT_SETTINGS, ensureActive, newPresetId, normalizePreset, type Preset } from './presets'

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function loadSettings(): AppSettings {
  const p = settingsPath()
  if (!existsSync(p)) return ensureActive({ ...DEFAULT_SETTINGS })
  try {
    const raw = readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      baseUrl?: string; apiKey?: string; model?: string
      imageFieldName?: 'image' | 'images' | 'image_url'
      sizeMode?: 'computed' | 'square' | 'omit'
      sendAspectRatio?: boolean
    }
    // 兼容 v1 单字段：把旧版 baseUrl/apiKey/model 全部塞到默认预设里
    if (parsed.presets == null && (parsed.baseUrl || parsed.apiKey)) {
      const legacy: Preset = normalizePreset({
        id: 'default',
        name: '默认预设',
        baseUrl: parsed.baseUrl ?? '',
        apiKey: parsed.apiKey ?? '',
        pricePerImage: 0,
        model: parsed.model || 'gpt-image-2',
        imageFieldName: (parsed.imageFieldName ?? 'image') as Preset['imageFieldName'],
        sizeMode: (parsed.sizeMode ?? 'computed') as Preset['sizeMode'],
        sendAspectRatio: parsed.sendAspectRatio ?? true,
      })
      return ensureActive({ ...DEFAULT_SETTINGS, presets: [legacy], activePresetId: legacy.id })
    }
    return ensureActive({ ...DEFAULT_SETTINGS, ...parsed })
  } catch {
    return ensureActive({ ...DEFAULT_SETTINGS })
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = ensureActive({ ...loadSettings(), ...patch })
  writeSettings(next)
  return next
}

export function addPreset(input: Omit<Preset, 'id'>): AppSettings {
  const cur = loadSettings()
  const p: Preset = normalizePreset({ ...input, id: newPresetId() })
  const next: AppSettings = ensureActive({ ...cur, presets: [...cur.presets, p] })
  writeSettings(next)
  return next
}

export function updatePreset(p: Preset): AppSettings {
  const cur = loadSettings()
  const normalized = normalizePreset(p)
  const next: AppSettings = ensureActive({
    ...cur,
    presets: cur.presets.map((x) => (x.id === normalized.id ? normalized : x)),
  })
  writeSettings(next)
  return next
}export function deletePreset(id: string): AppSettings {
  const cur = loadSettings()
  if (cur.presets.length <= 1) return cur   // 至少保留一条，避免空表
  const presets = cur.presets.filter((p) => p.id !== id)
  const activePresetId = cur.activePresetId === id ? presets[0]!.id : cur.activePresetId
  const next: AppSettings = ensureActive({ ...cur, presets, activePresetId })
  writeSettings(next)
  return next
}

export function setActivePreset(id: string): AppSettings {
  const cur = loadSettings()
  if (!cur.presets.find((p) => p.id === id)) return cur
  const next: AppSettings = ensureActive({ ...cur, activePresetId: id })
  writeSettings(next)
  return next
}

function writeSettings(s: AppSettings): void {
  if (!existsSync(app.getPath('userData'))) mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(settingsPath(), JSON.stringify(s, null, 2), 'utf-8')
}
