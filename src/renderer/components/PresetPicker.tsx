import { useComposer } from '../state/useComposer'

export function PresetPicker() {
  const { state, setActivePreset } = useComposer()
  const presets = state.settings.presets
  const activeId = state.settings.activePresetId
  const active = presets.find((p) => p.id === activeId) ?? presets[0]!

  return (
    <div className="preset">
      <select
        value={activeId}
        onChange={(e) => void setActivePreset(e.target.value)}
        aria-label="选择预设"
        className="preset-select"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {active.pricePerImage > 0 && (
        <div className="preset-price">
          <span className="amount">¥{active.pricePerImage.toFixed(2)}</span>
          <span className="unit">/ image</span>
        </div>
      )}
    </div>
  )
}
