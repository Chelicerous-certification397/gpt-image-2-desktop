import type { AspectRatio } from '@shared/types'
import { useComposer } from '../state/useComposer'

const ASPECTS: AspectRatio[] = ['21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16']

export function AspectSelect() {
  const { state, setParam } = useComposer()
  const params = state.params
  return (
    <div className="chip-grid" role="radiogroup" aria-label="比例">
      {ASPECTS.map((a) => (
        <button
          key={a}
          type="button"
          role="radio"
          aria-checked={params.aspect === a}
          className={params.aspect === a ? 'is-active' : ''}
          onClick={() => setParam('aspect', a)}
        >
          {a}
        </button>
      ))}
    </div>
  )
}
