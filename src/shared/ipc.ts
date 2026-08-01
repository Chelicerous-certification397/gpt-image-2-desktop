import type {
  AppSettings,
  GenerateRequest,
  GenerateResult,
  HistoryEntry,
  Preset,
} from './types'

export const CH = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  // 预设 CRUD + 激活切换
  presetsAdd: 'presets:add',
  presetsUpdate: 'presets:update',
  presetsDelete: 'presets:delete',
  presetsSetActive: 'presets:setActive',
  // 历史：清空 + 下载原图（单张或全部）
  historyClear: 'history:clear',
  historyDownload: 'history:download',
  historyDownloadAll: 'history:download-all',
  generateRun: 'generate:run',
  generateCancel: 'generate:cancel',
  historyList: 'history:list',
  historyDelete: 'history:delete',
} as const

export interface Api {
  getSettings(): Promise<AppSettings>
  saveSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  addPreset(p: Omit<Preset, 'id'>): Promise<AppSettings>
  updatePreset(p: Preset): Promise<AppSettings>
  deletePreset(id: string): Promise<AppSettings>
  setActivePreset(id: string): Promise<AppSettings>
  clearHistory(): Promise<HistoryEntry[]>
  downloadHistoryFile(filename: string): Promise<void>
  downloadHistoryFiles(filenames: string[]): Promise<void>
  generate(req: GenerateRequest): Promise<GenerateResult>
  cancel(requestId: string): Promise<void>
  listHistory(): Promise<HistoryEntry[]>
  deleteHistory(id: string): Promise<HistoryEntry[]>
}
