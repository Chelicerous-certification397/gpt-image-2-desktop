import {
  createContext, useContext, useEffect, useMemo, useReducer,
} from 'react'
import type { ReactNode } from 'react'
import type {
  AspectRatio, Count, GeneratedImage, GenerateParams, GenerateRequest,
  HistoryEntry, Preset, Quality, RefImage, Resolution,
} from '@shared/types'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types'
import { TEMPLATES, type TemplateId } from '../data/templates'

type Status = 'idle' | 'loading' | 'error'

interface ComposerState {
  prompt: string
  params: GenerateParams
  refImages: RefImage[]
  status: Status
  error?: { code: string; message: string; body?: string }
  results: GeneratedImage[]
  history: HistoryEntry[]
  settings: AppSettings
  // 当前预览条目（生成的新结果，或历史回填）。previewEntry.images 决定 PreviewBox 渲染哪些图
  previewEntry?: HistoryEntry
}

type Action =
  | { type: 'set-prompt'; value: string }
  | { type: 'set-param'; key: keyof GenerateParams; value: GenerateParams[keyof GenerateParams] }
  | { type: 'apply-template'; id: TemplateId }
  | { type: 'set-refs'; refs: RefImage[] }
  | { type: 'set-status'; status: Status; error?: ComposerState['error'] }
  | { type: 'set-results'; results: GeneratedImage[]; entry?: HistoryEntry }
  | { type: 'set-history'; history: HistoryEntry[] }
  | { type: 'set-settings'; settings: AppSettings }
  | { type: 'set-preview'; entry: HistoryEntry | undefined }

const INITIAL_PARAMS: GenerateParams = { aspect: '1:1', resolution: '1K', quality: 'medium', count: 1 }

const initialState: ComposerState = {
  prompt: '',
  params: INITIAL_PARAMS,
  refImages: [],
  status: 'idle',
  error: undefined,
  results: [],
  history: [],
  settings: DEFAULT_SETTINGS,
}

function reducer(state: ComposerState, action: Action): ComposerState {
  switch (action.type) {
    case 'set-prompt': return { ...state, prompt: action.value }
    case 'set-param': return { ...state, params: { ...state.params, [action.key]: action.value } }
    case 'apply-template': {
      const t = TEMPLATES.find((x) => x.id === action.id)
      return t ? { ...state, prompt: t.text } : state
    }
    case 'set-refs': return { ...state, refImages: action.refs }
    case 'set-status': return { ...state, status: action.status, error: action.error }
    case 'set-results': return { ...state, results: action.results, previewEntry: action.entry }
    case 'set-history': return { ...state, history: action.history }
    case 'set-settings': return { ...state, settings: action.settings }
    case 'set-preview': return { ...state, previewEntry: action.entry, results: action.entry?.images ?? [] }
    default: return state
  }
}

interface ComposerApi {
  state: ComposerState
  setPrompt(v: string): void
  setParam(key: keyof GenerateParams, value: AspectRatio | Resolution | Quality | Count): void
  applyTemplate(id: TemplateId): void
  setRefs(refs: RefImage[]): void
  runGenerate(promptResolved: string): Promise<void>
  refreshHistory(): Promise<void>
  reloadSettings(): Promise<void>
  setActivePreset(id: string): Promise<void>
  saveSettings(patch: Partial<AppSettings>): Promise<void>
  refillFromHistory(h: HistoryEntry): void
}

const ComposerContext = createContext<ComposerApi | null>(null)

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!window.api) return
    void window.api.getSettings().then((s) => dispatch({ type: 'set-settings', settings: s }))
    void window.api.listHistory().then((h) => dispatch({ type: 'set-history', history: h }))
  }, [])

  const api: ComposerApi = useMemo(() => ({
    state,
    setPrompt(v) { dispatch({ type: 'set-prompt', value: v }) },
    setParam(key, value) { dispatch({ type: 'set-param', key: key as keyof GenerateParams, value: value as never }) },
    applyTemplate(id) { dispatch({ type: 'apply-template', id }) },
    setRefs(refs) { dispatch({ type: 'set-refs', refs }) },
    async runGenerate(promptResolved: string) {
      const req: GenerateRequest = {
        requestId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        promptRaw: state.prompt,
        promptResolved,
        params: state.params,
        images: state.refImages.map((r) => r.dataUrl),
      }
      dispatch({ type: 'set-status', status: 'loading' })
      const r = await window.api.generate(req)
      if (r.ok) {
        dispatch({ type: 'set-results', results: r.entry.images, entry: r.entry })
        const h = await window.api.listHistory()
        dispatch({ type: 'set-history', history: h })
        dispatch({ type: 'set-status', status: 'idle' })
      } else {
        dispatch({ type: 'set-status', status: 'error', error: { code: r.code, message: r.message, body: r.body } })
      }
    },
    refillFromHistory(h) {
      dispatch({ type: 'set-prompt', value: h.promptRaw })
      dispatch({ type: 'set-param', key: 'aspect', value: h.params.aspect })
      dispatch({ type: 'set-param', key: 'resolution', value: h.params.resolution })
      // Old history rows (pre-quality field) lack `quality`; fall back to medium.
      dispatch({ type: 'set-param', key: 'quality', value: h.params.quality ?? 'medium' })
      dispatch({ type: 'set-param', key: 'count', value: h.params.count })
      dispatch({ type: 'set-preview', entry: h })
      dispatch({ type: 'set-status', status: 'idle', error: undefined })
    },
    async refreshHistory() {
      const h = await window.api.listHistory()
      dispatch({ type: 'set-history', history: h })
    },
    async reloadSettings() {
      const s = await window.api.getSettings()
      dispatch({ type: 'set-settings', settings: s })
    },
    async setActivePreset(id) {
      const s = await window.api.setActivePreset(id)
      dispatch({ type: 'set-settings', settings: s })
    },
    async saveSettings(patch) {
      const s = await window.api.saveSettings(patch)
      dispatch({ type: 'set-settings', settings: s })
    },
  }), [state])

  return <ComposerContext.Provider value={api}>{children}</ComposerContext.Provider>
}

export function useComposer(): ComposerApi {
  const v = useContext(ComposerContext)
  if (!v) throw new Error('useComposer must be used inside ComposerProvider')
  return v
}

export function useActivePreset(): Preset {
  const { state } = useComposer()
  return state.settings.presets.find((p) => p.id === state.settings.activePresetId) ?? state.settings.presets[0]!
}
