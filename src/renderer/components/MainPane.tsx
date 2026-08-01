import { PromptEditor } from './PromptEditor'
import { TemplatePills } from './TemplatePills'
import { PreviewBox } from './PreviewBox'
import { HistoryPanel } from './HistoryPanel'

export function MainPane() {
  return (
    <main className="main">
      <section className="main-row-top">
        <div className="editor-col">
          <div className="eyebrow">
            <span>Composition</span>
          </div>
          <PromptEditor />
        </div>
        <div className="templates-col">
          <div className="eyebrow">
            <span>Presets</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>5</span>
          </div>
          <TemplatePills />
        </div>
      </section>

      <section className="main-row-bottom">
        <div className="print-col">
          <div className="eyebrow">
            <span>Output</span>
          </div>
          <PreviewBox />
        </div>
        <div className="archive-col">
          <HistoryPanel />
        </div>
      </section>
    </main>
  )
}