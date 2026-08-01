import { useMemo } from 'react'
import { useComposer } from '../state/useComposer'
import { resolvePrompt } from '../lib/refTokens'

export function GenerateButton() {
  const { state, runGenerate } = useComposer()
  const { prompt, refImages, status } = state
  const loading = status === 'loading'

  const { hasErrors, resolved } = useMemo(() => {
    const r = resolvePrompt(prompt, refImages)
    return { hasErrors: r.errors.length > 0, resolved: r.text }
  }, [prompt, refImages])

  const trimmed = prompt.trim()
  const disabled = loading || trimmed.length === 0 || hasErrors
  const reason = loading
    ? 'Exposing…'
    : trimmed.length === 0
    ? 'Write a prompt first'
    : hasErrors
    ? 'Resolve the @ mentions first'
    : undefined

  return (
    <button
      type="button"
      className="generate-btn"
      disabled={disabled}
      onClick={() => void runGenerate(resolved)}
      title={reason}
    >
      <span className="glyph">↳</span>
      <span>{loading ? 'Exposing' : 'Generate'}</span>
      {loading && <Spinner />}
    </button>
  )
}

function Spinner() {
  return (
    <div aria-hidden style={{
      width: 12, height: 12,
      border: '1.5px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'gptimg2-spin 800ms linear infinite',
    }} />
  )
}
