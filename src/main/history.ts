import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { app, dialog, BrowserWindow } from 'electron'
import type { HistoryEntry } from '../shared/types'

function indexPath(): string {
  return join(app.getPath('userData'), 'history.json')
}

function imagesDir(): string {
  const d = join(app.getPath('userData'), 'images')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function readIndex(): HistoryEntry[] {
  const p = indexPath()
  if (!existsSync(p)) return []
  try {
    const raw = readFileSync(p, 'utf-8')
    const arr = JSON.parse(raw) as HistoryEntry[]
    if (!Array.isArray(arr)) return []
    return arr
  } catch {
    return []
  }
}

function writeIndex(arr: HistoryEntry[]): void {
  const p = indexPath()
  if (!existsSync(app.getPath('userData'))) mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(p, JSON.stringify(arr, null, 2), 'utf-8')
}

export function listHistory(): HistoryEntry[] {
  return readIndex().sort((a, b) => b.createdAt - a.createdAt)
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const arr = readIndex()
  arr.push(entry)
  writeIndex(arr)
  return listHistory()
}

export function deleteHistory(id: string): HistoryEntry[] {
  const arr = readIndex().filter((e) => e.id !== id)
  writeIndex(arr)
  return listHistory()
}

export function clearHistory(): HistoryEntry[] {
  const dir = imagesDir()
  try {
    for (const f of readdirSync(dir)) {
      try { unlinkSync(join(dir, f)) } catch { /* ignore */ }
    }
  } catch { /* dir 可能不存在，没问题 */ }
  writeIndex([])
  return []
}

// 弹原生保存框，把 userData/images/filename 拷一份到用户选的位置
export async function downloadHistoryFile(filename: string): Promise<void> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const src = join(imagesDir(), filename)
  if (!existsSync(src)) throw new Error('源文件不存在')
  const dot = filename.lastIndexOf('.')
  const ext = dot > 0 ? filename.slice(dot) : '.png'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const result = await dialog.showSaveDialog(win ?? undefined!, {
    title: '保存原图',
    defaultPath: `${filename.replace(/\.[^.]+$/, '')}_${stamp}${ext}`,
    filters: [{ name: '图片', extensions: [ext.replace('.', '')] }],
  })
  if (result.canceled || !result.filePath) return
  const bytes = readFileSync(src)
  writeFileSync(result.filePath, bytes)
}

// 用户一次下载当前生成的全部 plate。弹"选目录"对话框，把每一张
// plate 拷到那个目录下，文件名保持原 filename。Cancel 是 no-op。
//
// 冲突处理：先把任务分成"无冲突"和"有冲突"两组。
// - 全部不冲突 → 直接写，没打扰
// - 有冲突 → 弹原生「保留两者 / 替换 / 取消」对话框
//   - 保留两者：旧文件不动，新文件用 `image 2.png` 这种名字另存
//   - 替换：覆盖
//   - 取消：什么都不做（包括未冲突的也不写）
export async function downloadHistoryFiles(filenames: string[]): Promise<void> {
  if (filenames.length === 0) return
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showOpenDialog(win ?? undefined!, {
    title: `保存全部 ${filenames.length} 张图`,
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: undefined,
  })
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) return
  const dir = result.filePaths[0]
  if (!dir) return

  // 收集 (src, dest, exists) 任务列表
  const tasks: Array<{ src: string; dest: string; exists: boolean }> = []
  for (const fn of filenames) {
    const src = join(imagesDir(), fn)
    if (!existsSync(src)) continue
    const dest = join(dir, fn)
    tasks.push({ src, dest, exists: existsSync(dest) })
  }
  if (tasks.length === 0) return

  const conflicts = tasks.filter((t) => t.exists)
  const newFiles = tasks.filter((t) => !t.exists)

  // 全部不冲突 → 直接写入
  if (conflicts.length === 0) {
    for (const t of tasks) {
      writeFileSync(t.dest, readFileSync(t.src))
    }
    return
  }

  // 有冲突 → 询问「保留两者 / 替换 / 取消」
  const choice = await dialog.showMessageBox(win ?? undefined!, {
    type: 'question',
    title: '部分文件已存在',
    message: `目标目录中已有 ${conflicts.length} 张同名图片`,
    detail:
      `未冲突的 ${newFiles.length} 张会直接保存。\n\n` +
      `冲突文件:\n${conflicts.map((c) => '  • ' + basename(c.dest)).join('\n')}\n\n` +
      `选择「保留两者」会用新名字（如 "image 2.png"）保存，不覆盖旧文件。`,
    buttons: ['保留两者', '替换', '取消'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  })

  if (choice.response === 2) return  // 取消：什么都不做

  if (choice.response === 1) {
    // 替换：全部覆盖
    for (const t of tasks) {
      writeFileSync(t.dest, readFileSync(t.src))
    }
    return
  }

  // 保留两者：未冲突的直接写；冲突的写到新名字
  for (const t of newFiles) {
    writeFileSync(t.dest, readFileSync(t.src))
  }
  for (const t of conflicts) {
    const newDest = nextAvailableName(t.dest)
    writeFileSync(newDest, readFileSync(t.src))
  }
}

// 找一个不冲突的下一个文件名："foo.png" -> "foo 2.png" -> "foo 3.png" ...
// 仿 macOS Finder 的"保留两者"命名习惯。
function nextAvailableName(dest: string): string {
  if (!existsSync(dest)) return dest
  const ext = extname(dest)
  const base = dest.slice(0, dest.length - ext.length)
  for (let i = 2; i < 10000; i++) {
    const candidate = `${base} ${i}${ext}`
    if (!existsSync(candidate)) return candidate
  }
  // 极端兜底：10000 个都还在，收一个时间戳
  return `${base} ${Date.now()}${ext}`
}
