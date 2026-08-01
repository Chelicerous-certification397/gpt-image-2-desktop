import { useState, useCallback, type DragEvent } from 'react'
import { useComposer } from '../state/useComposer'
import { fileToRefImage } from '../lib/imageFile'
import type { RefImage } from '@shared/types'

export function RefImageUploader() {
  const { state, setRefs } = useComposer()
  const refImages = state.refImages
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setError(null)
    setBusy(true)
    try {
      const next: RefImage[] = [...refImages]
      for (const f of Array.from(files)) {
        try {
          const ref = await fileToRefImage(f)
          next.push(ref)
        } catch (e) {
          setError(e instanceof Error ? e.message : '上传失败')
        }
      }
      setRefs(renumber(next))
    } finally {
      setBusy(false)
    }
  }, [refImages, setRefs])

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  const remove = (id: string) => {
    setRefs(renumber(refImages.filter((r) => r.id !== id)))
  }

  return (
    <div className="plates">
      <div
        className={`plate-drop ${dragging ? 'is-drag' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => document.getElementById('ref-file-input')?.click()}
      >
        <div className="plate-drop-text">
          {busy ? '正在处理' : dragging ? '放下以加入' : '拖入或点击 · JPG / PNG / WebP'}
        </div>
        <input
          id="ref-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {error && <div className="plate-err">{error}</div>}
      {refImages.length > 0 && (
        <div className="plate-grid">
          {refImages.map((r) => (
            <div key={r.id} className="plate">
              <img src={r.dataUrl} alt={r.name} />
              <span className="plate-idx">{String(r.index).padStart(2, '0')}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); remove(r.id) }}
                className="plate-rm" aria-label="移除">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function renumber(refs: RefImage[]): RefImage[] {
  return refs.map((r, i) => ({ ...r, index: i + 1 }))
}
