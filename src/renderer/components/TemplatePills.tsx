import { TEMPLATES } from '../data/templates'
import { useComposer } from '../state/useComposer'

export function TemplatePills() {
  const { applyTemplate } = useComposer()
  return (
    <div className="toc">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          className="toc-item"
          onClick={() => applyTemplate(t.id)}
        >
          <span className="toc-num">{t.index}</span>
          <span className="toc-text">
            <span className="toc-label">{t.label}</span>
            <span className="toc-en">{t.en}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
