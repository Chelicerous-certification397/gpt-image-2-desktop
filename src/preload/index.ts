import { contextBridge, ipcRenderer } from 'electron'
import { CH } from '../shared/ipc'
import type { Api } from '../shared/ipc'

const api: Api = {
  getSettings: () => ipcRenderer.invoke(CH.settingsGet),
  saveSettings: (patch) => ipcRenderer.invoke(CH.settingsSet, patch),
  addPreset: (p) => ipcRenderer.invoke(CH.presetsAdd, p),
  updatePreset: (p) => ipcRenderer.invoke(CH.presetsUpdate, p),
  deletePreset: (id) => ipcRenderer.invoke(CH.presetsDelete, id),
  setActivePreset: (id) => ipcRenderer.invoke(CH.presetsSetActive, id),
  clearHistory: () => ipcRenderer.invoke(CH.historyClear),
  downloadHistoryFile: (filename) => ipcRenderer.invoke(CH.historyDownload, filename),
  downloadHistoryFiles: (filenames) => ipcRenderer.invoke(CH.historyDownloadAll, filenames),
  generate: (req) => ipcRenderer.invoke(CH.generateRun, req),
  cancel: (requestId) => ipcRenderer.invoke(CH.generateCancel, { requestId }),
  listHistory: () => ipcRenderer.invoke(CH.historyList),
  deleteHistory: (id) => ipcRenderer.invoke(CH.historyDelete, { id }),
}

contextBridge.exposeInMainWorld('api', api)
