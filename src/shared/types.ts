// Single source of truth for all data shapes crossing the process boundary.

export type AspectRatio = '21:9' | '16:9' | '3:2' | '4:3' | '1:1' | '3:4' | '2:3' | '9:16'
export type Resolution = '1K' | '2K' | '4K'
export type Quality    = 'low' | 'medium' | 'high'
export type Count = 1 | 2 | 3 | 4
export type ImageFieldName = 'image' | 'images' | 'image_url'
export type SizeMode = 'computed' | 'square' | 'omit'

export interface Preset {
  id: string
  name: string                            // 显示名，例如 "主力中转 / ClaudeCode 站"
  baseUrl: string
  apiKey: string
  pricePerImage: number                   // 元/张；用户手动填，可为 0
  // 模型 + 字段名 + 尺寸模式也跟随预设走；同一用户可能用不同预设调不同模型
  model: string
  imageFieldName: ImageFieldName
  sizeMode: SizeMode
  sendAspectRatio: boolean
}

export interface AppSettings {
  presets: Preset[]                       // 至少 1 条
  activePresetId: string                  // 等于 presets 中某条 id
  // 兼容旧版：保留 model 默认值；新 UI 已经搬到 preset 上
  defaultModel: string
  timeoutMs: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  presets: [
    {
      id: 'default',
      name: '默认预设',
      baseUrl: '',
      apiKey: '',
      pricePerImage: 0,
      model: 'gpt-image-2',
      imageFieldName: 'image',
      sizeMode: 'computed',
      sendAspectRatio: true,
    },
  ],
  activePresetId: 'default',
  defaultModel: 'gpt-image-2',
  timeoutMs: 600_000,
}

export interface RefImage {
  id: string
  index: number
  name: string
  mime: 'image/jpeg' | 'image/png' | 'image/webp'
  dataUrl: string
  width: number
  height: number
  bytes: number
}

export interface GenerateParams {
  aspect: AspectRatio
  resolution: Resolution
  quality: Quality
  count: Count
}

export interface GenerateRequest {
  requestId: string
  promptRaw: string
  promptResolved: string
  params: GenerateParams
  images: string[]
}

export interface GeneratedImage {
  file: string
  url: string
  width?: number
  height?: number
}

export interface HistoryEntry {
  id: string
  createdAt: number
  presetName: string                      // 用哪个预设出的（历史展示用）
  model: string
  promptRaw: string
  promptResolved: string
  params: GenerateParams
  size: string
  refImageFiles: string[]
  images: GeneratedImage[]
}

export type GenerateErrorCode =
  | 'config'
  | 'payload'
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'http'
  | 'parse'
  | 'io'

export type GenerateResult =
  | { ok: true; entry: HistoryEntry }
  | {
      ok: false
      code: GenerateErrorCode
      status?: number
      message: string
      body?: string
    }
