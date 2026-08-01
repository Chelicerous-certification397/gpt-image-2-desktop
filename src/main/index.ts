import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import { join } from 'node:path'
import { CH } from '../shared/ipc'
import {
  loadSettings, saveSettings,
  addPreset, updatePreset, deletePreset, setActivePreset,
} from './settings'
import { generate, cancel } from './api'
import {
  appendHistory, deleteHistory, listHistory, clearHistory, downloadHistoryFile, downloadHistoryFiles,
} from './history'
import { registerImageProtocol } from './protocol'

// img:// scheme registration MUST run before app.whenReady().
protocol.registerSchemesAsPrivileged([
  { scheme: 'img', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 660,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    transparent: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win.once('ready-to-show', () => win.show())
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle(CH.settingsGet, async () => loadSettings())
ipcMain.handle(CH.settingsSet, async (_e, patch) => saveSettings(patch))
ipcMain.handle(CH.presetsAdd, async (_e, p) => addPreset(p))
ipcMain.handle(CH.presetsUpdate, async (_e, p) => updatePreset(p))
ipcMain.handle(CH.presetsDelete, async (_e, id) => deletePreset(id))
ipcMain.handle(CH.presetsSetActive, async (_e, id) => setActivePreset(id))
ipcMain.handle(CH.generateRun, async (_e, req) => {
  const r = await generate(req)
  if (r.ok) appendHistory(r.entry)
  return r
})
ipcMain.handle(CH.generateCancel, async (_e, { requestId }) => { cancel(requestId) })
ipcMain.handle(CH.historyList, async () => listHistory())
ipcMain.handle(CH.historyDelete, async (_e, { id }) => deleteHistory(id))
ipcMain.handle(CH.historyClear, async () => clearHistory())
ipcMain.handle(CH.historyDownload, async (_e, filename) => {
  try { await downloadHistoryFile(filename) } catch (e) { console.error('download failed', e) }
})
ipcMain.handle(CH.historyDownloadAll, async (_e, filenames) => {
  try { await downloadHistoryFiles(filenames) } catch (e) { console.error('download-all failed', e) }
})

app.whenReady().then(() => {
  registerImageProtocol()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
