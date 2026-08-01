import type { RefImage } from '@shared/types'

const TOKEN_RE = /@(?:参考图|图)\s*(\d+)?/g

export interface ResolveResult {
  text: string
  referenced: number[]
  errors: string[]
  warnings: string[]
}

/**
 * Resolve @图N tokens in the user prompt.
 *
 * - Always send every uploaded image, in index order (positional alignment invariant).
 * - 1 image: strip tokens (no disambiguation needed; the model gets one image).
 * - 2+ images: replace `@图N` with `第N张参考图` so multi-image referents stay
 *   disambiguated in natural prose — and the literal sigil doesn't get baked
 *   into the generated image.
 */
export function resolvePrompt(raw: string, refs: RefImage[]): ResolveResult {
  const errors: string[] = []
  const warnings: string[] = []
  const referenced = new Set<number>()

  if (refs.length === 0) {
    // No images uploaded; just strip any stray tokens and report errors.
    const cleaned = raw.replace(TOKEN_RE, '').replace(/\s{2,}/g, ' ').trim()
    if (/@(参考图|图)/.test(raw)) {
      errors.push('提示词包含 @图N 但未上传参考图')
    }
    return { text: cleaned, referenced: [], errors, warnings }
  }

  if (refs.length === 1) {
    // Strip tokens; collapse whitespace.
    let cleaned = raw.replace(TOKEN_RE, (m, n) => {
      const idx = n ? parseInt(n, 10) : 1
      if (idx !== 1) {
        errors.push(`提示词引用了 @图${idx}，但只上传了 1 张参考图`)
      } else {
        referenced.add(1)
      }
      return ''
    })
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').replace(/([一-龥]) ([一-龥])/g, '$1$2').trim()
    return { text: cleaned, referenced: Array.from(referenced), errors, warnings }
  }

  // 2+ images: substitute with `第N张参考图`.
  let text = raw.replace(TOKEN_RE, (_m, n) => {
    const idx = n ? parseInt(n, 10) : 1
    if (idx < 1 || idx > refs.length) {
      errors.push(`提示词引用了 @图${idx}，但只上传了 ${refs.length} 张参考图`)
      return ''
    }
    referenced.add(idx)
    return `第${idx}张参考图`
  })

  // Tidy stray spaces.
  text = text.replace(/[ \t]{2,}/g, ' ').trim()

  // Warn about un-referenced images.
  for (let i = 1; i <= refs.length; i++) {
    if (!referenced.has(i)) warnings.push(`图${i} 未在提示词中引用`)
  }

  return { text, referenced: Array.from(referenced), errors, warnings }
}
