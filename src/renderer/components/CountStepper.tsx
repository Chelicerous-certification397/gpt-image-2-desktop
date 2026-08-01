import type { Count } from '@shared/types'
import { useComposer } from '../state/useComposer'

const OPTIONS: Count[] = [1, 2, 3, 4]

export function CountStepper() {
  const { state, setParam } = useComposer()
  const value = state.params.count
  return (
    <div className="field">
      <span className="field-label">张数</span>
      <div className="chip-grid">
        {OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={n === value ? 'is-active' : ''}
            onClick={() => setParam('count', n)}
            aria-label={`${n} 张`}
            aria-pressed={n === value}
          >{n}</button>
        ))}
      </div>
    </div>
  )
}