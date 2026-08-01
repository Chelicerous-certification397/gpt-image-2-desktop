import { useComposer } from '../state/useComposer'
import type { HistoryEntry } from '@shared/types'

const MAX_H = 400

function formatWhen(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function idxLabel(i: number, total: number): string {
  // Show archive indices counting from oldest (=1) so the most recent is N.
  // We render newest first; compute its display index as the total - i.
  return String(total - i).padStart(4, '0')
}

export function HistoryPanel() {
  const { state, refillFromHistory, refreshHistory } = useComposer()
  const { history } = state

  const handleClear = async () => {
    if (!confirm(`确认清空全部 ${history.length} 条历史记录？\n\n历史图片也会一并删除，此操作不可恢复。`)) return
    await window.api.clearHistory()
    await refreshHistory()
  }

  return (
    <div className="archive">
      <div className="archive-head">
        <div className="archive-eyebrow">
          Archive <span className="count">· {String(history.length).padStart(3, '0')}</span>
        </div>
        {history.length > 0 && (
          <button type="button" className="pill danger" onClick={() => void handleClear()}>
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="archive-list" style={{
          height: 400,
          width: 400,
          aspectRatio: '1 / 1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 24, color: 'var(--text-3)',
          }}>empty archive</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: 'var(--track-loose)', textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}>Generate something to begin</div>
        </div>
      ) : (
        <div className="archive-list" style={{ height: 400, width: 400, aspectRatio: '1 / 1' }}>
          {history.map((h, i) => (
            <ArchiveRow
              key={h.id}
              entry={h}
              displayIdx={idxLabel(i, history.length)}
              onClick={() => refillFromHistory(h)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ArchiveRow({
  entry, displayIdx, onClick,
}: { entry: HistoryEntry; displayIdx: string; onClick: () => void }) {
  return (
    <div className="archive-item" onClick={onClick}>
      <div className="idx">
        №<br />
        <span className="n">{displayIdx}</span>
      </div>
      <div className="ts">
        {formatWhen(entry.createdAt)}
        <span className="preset">{entry.presetName}</span>
      </div>
      <div className="body">
        <div className="prompt">{entry.promptRaw || '(空提示词)'}</div>
        <div className="params">
          {entry.params.aspect} · {entry.params.resolution} · ×{entry.params.count} · {entry.images.length} plate{entry.images.length === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  )
}
