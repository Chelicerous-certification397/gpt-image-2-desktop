import { ModelDisplay } from './ModelDisplay'
import { PresetPicker } from './PresetPicker'
import { AspectSelect } from './AspectSelect'
import { ResolutionSegments } from './ResolutionSegments'
import { CountStepper } from './CountStepper'
import { RefImageUploader } from './RefImageUploader'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="eyebrow">Issue  № 01</div>
        <ModelDisplay />
        <PresetPicker />
      </div>

      <div className="sidebar-section">
        <div className="eyebrow">Format</div>
        <AspectSelect />
        <ResolutionSegments />
      </div>

      <div className="sidebar-section">
        <div className="eyebrow">Quantity</div>
        <CountStepper />
      </div>

      <div className="sidebar-section">
        <div className="eyebrow">Reference Plates</div>
        <RefImageUploader />
      </div>
    </aside>
  )
}
