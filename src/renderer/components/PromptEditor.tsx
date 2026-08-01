import { useEffect, useRef, useState } from 'react'
import { useComposer } from '../state/useComposer'
import { GenerateButton } from './GenerateButton'

// ----------------------- HTML <-> 纯文本 -----------------------
// 我们让 contenteditable 的内容是 HTML（用于给 @图N 着色），
// 而 state.prompt 始终是纯文本（用于 resolvePrompt / 写入历史 / 发到中转站）。

const PLACEHOLDER = '描述你想生成的画面… 输入 @ 引用已上传的参考图，点击上方模板快速填充'

/** 把纯文本里的 `@图N` (N 是数字) 替换成高亮 HTML。其它字符 escaped。 */
export function mentionizeMarkup(plain: string): string {
  if (!plain) return ''
  const escaped = plain
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(
    /@(?:参考图|图)(\d+)/g,
    (_m, n) => `<span class="mention" data-mention="${n}">@图${n}</span>`,
  )
}

/** 从 contenteditable 的 innerHTML 提取纯文本。
 *
 *  IMPORTANT: this is the canonical text model — the concatenation of text
 *  nodes ONLY. Chromium's Range.toString() (used for live caret offsets) does
 *  NOT include `<br>` elements NOR div boundaries, and the SHOW_TEXT
 *  TreeWalker (used to map offsets back onto DOM positions) agrees with it.
 *  The previous version translated `<br>` into `\n` — desyncing the three
 *  views by one char per `<br>` and causing off-by-N errors: after the first
 *  mention (which inserts a `<br>`), every later `@图X` was anchored at the
 *  wrong offset and the chip ended up appended at the END of the whole prompt
 *  on a new line, no matter where the user typed `@`. */
export function htmlToText(html: string): string {
  if (!html) return ''
  let s = html.replace(/<br\s*\/?>/gi, '')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return s
}

/** Map an absolute character index (canonical text model: text nodes only) to
 *  the DOM text node + offset containing it. Falls back to the last text
 *  node's end for indices at/after the total length. */
function findTextPos(el: HTMLElement, abs: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let acc = 0
  let node: Node | null
  while ((node = walker.nextNode())) {
    const tn = node as Text
    const len = tn.data.length
    if (acc + len >= abs) return { node: tn, offset: abs - acc }
    acc += len
  }
  // abs may equal total length — fall back to last text node, end offset.
  const all: Text[] = []
  const w2 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let n: Node | null
  while ((n = w2.nextNode())) all.push(n as Text)
  const last = all[all.length - 1]
  if (last) return { node: last, offset: last.data.length }
  return null
}

/** The text node that follows `node` in document order, or null. */
function nextTextNodeAfter(el: HTMLElement, node: Node): Text | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let n: Node | null
  let seen = false
  while ((n = walker.nextNode())) {
    if (seen) return n as Text
    if (n === node) seen = true
  }
  return null
}

/** Live caret offset in the canonical text model, or -1 when unavailable. */
function caretTextOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return -1
  try {
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer)) return -1
    const pre = document.createRange()
    pre.selectNodeContents(el)
    pre.setEnd(range.startContainer, range.startOffset)
    return pre.toString().length
  } catch {
    return -1
  }
}

/** True when the '@' at character index `idx` belongs to an EXISTING mention
 *  chip (an old @图N), not to a fresh query the user is typing. */
function isMentionChipAt(el: HTMLElement, text: string, idx: number): boolean {
  if (text[idx] !== '@') return false
  let node = findTextPos(el, idx)
  if (!node) return false
  // idx may sit on a node boundary (end of a text node); the '@' then starts
  // the NEXT text node (e.g. a chip that begins a new line).
  if (node.offset >= node.node.data.length) {
    const next = nextTextNodeAfter(el, node.node)
    if (!next) return false
    node = { node: next, offset: 0 }
  }
  if (node.node.data[node.offset] !== '@') return false
  const parent = node.node.parentElement
  return !!parent && !!parent.closest('.mention')
}

/** Find the active "@query" segment the caret sits inside.
 *
 *  The query is anchored AT THE CARET: scan backward from the caret across
 *  non-whitespace, non-'@' characters until we hit a fresh '@' (that's the
 *  anchor). The scan stops — no menu — at whitespace, at an old mention chip,
 *  or at the start of the text. Anchoring at the caret (instead of at the
 *  LAST '@' in the text) is what keeps the popup correct when older @图N
 *  chips exist later in the prompt: previously the query was anchored at the
 *  last chip, the wrong range got deleted, and the new chip was appended at
 *  the end of the whole prompt on a new line.
 *
 *  `fallbackCaret` is used only when the live selection is unavailable (React
 *  re-render / IME); handleInput keeps it fresh from the last known caret. */
function findActiveQuery(el: HTMLElement, text: string, fallbackCaret: number): { atStart: number; atEnd: number; query: string } {
  const live = caretTextOffset(el)
  const caretPos = live >= 0 ? Math.min(live, text.length) : Math.min(fallbackCaret, text.length)
  if (caretPos <= 0) return { atStart: -1, atEnd: -1, query: '' }

  for (let i = caretPos; i > 0; i--) {
    const ch = text[i - 1]
    if (ch === '@') {
      if (isMentionChipAt(el, text, i - 1)) return { atStart: -1, atEnd: -1, query: '' }
      return { atStart: i - 1, atEnd: caretPos, query: text.slice(i, caretPos) }
    }
    if (/\s/.test(ch ?? '')) return { atStart: -1, atEnd: -1, query: '' }
  }
  return { atStart: -1, atEnd: -1, query: '' }
}

function plainToInnerHTML(plain: string): string {
  const lines = plain.split('\n')
  return lines.map((line, i) => {
    const html = i === lines.length - 1 && line === ''
      ? '<br>'
      : (line === '' ? '<br>' : mentionizeMarkup(line))
    return `<div>${html}</div>`
  }).join('') || '<div><br></div>'
}

// ----------------------- 组件 -----------------------

export function PromptEditor() {
  const { state, setPrompt } = useComposer()
  const prompt = state.prompt
  const refImages = state.refImages
  const rootRef = useRef<HTMLDivElement | null>(null)
  const lastWrittenRef = useRef(prompt)
  // Last known caret offset in the canonical text model. Used by findActiveQuery
  // only when the live selection is unavailable (React re-render / IME).
  const lastCaretRef = useRef(0)
  const [mentionMenu, setMentionMenu] = useState<{
    open: boolean
    atStart: number
    atEnd: number
    top: number; left: number
    query: string
  }>({ open: false, atStart: -1, atEnd: -1, top: 0, left: 0, query: '' })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (lastWrittenRef.current === prompt) return
    el.innerHTML = plainToInnerHTML(prompt)
    lastWrittenRef.current = prompt
    placeCaretAtEnd(el)
  }, [prompt])

  const menuRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!mentionMenu.open) return
    const closeIfOutside = (e: MouseEvent) => {
      const t = e.target as Node | null
      if (menuRef.current && t && menuRef.current.contains(t)) return
      if (rootRef.current && t && rootRef.current.contains(t)) return
      setMentionMenu((m) => ({ ...m, open: false }))
    }
    window.addEventListener('mousedown', closeIfOutside, true)
    return () => window.removeEventListener('mousedown', closeIfOutside, true)
  }, [mentionMenu.open])

  const isEmpty = prompt.length === 0

  // -------------------- 输入处理 --------------------
  // Find the active "@query" segment the caret sits inside — see the module
  // level findActiveQuery(): it anchors at the CARET (walking backward), not
  // at the last '@' in the text, so older @图N chips elsewhere never hijack
  // the popup anchor.

  const handleInput = () => {
    const el = rootRef.current
    if (!el) return
    const text = htmlToText(el.innerHTML)
    lastWrittenRef.current = text
    setPrompt(text)

    if (refImages.length === 0) {
      setMentionMenu((m2) => ({ ...m2, open: false }))
      return
    }

    const live = caretTextOffset(el)
    if (live >= 0) lastCaretRef.current = live

    const { atStart, atEnd, query } = findActiveQuery(el, text, lastCaretRef.current)
    if (atStart < 0) {
      setMentionMenu((m2) => ({ ...m2, open: false }))
      return
    }

    // Position the popup near the caret if we can; otherwise near the editor.
    let topPx = 0; let leftPx = 0
    try {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0).getBoundingClientRect()
        if (r.width > 0 || r.height > 0) {
          topPx = r.bottom + window.scrollY + 4
          leftPx = r.left + window.scrollX + 12
        }
      }
    } catch { /* ignore */ }
    if (topPx === 0 && leftPx === 0) {
      const rect = el.getBoundingClientRect()
      topPx = rect.bottom + window.scrollY + 4
      leftPx = rect.left + window.scrollX + 12
    }

    setMentionMenu({
      open: true,
      atStart,
      atEnd,
      top: topPx,
      left: leftPx,
      query,
    })
  }

  // -------------------- 插入 mention --------------------
  // Use the character offsets stored when the popup opened (atStart/atEnd in
  // text). Locate them in the DOM via TreeWalker so we never depend on the
  // live selection — that selection is gone by the time the user clicks a
  // popup button (the click moved focus to the button).
  const insertMention = (indexOneBased: number) => {
    const el = rootRef.current
    if (!el) return
    const { atStart, atEnd, query } = mentionMenu
    if (atStart < 0 || atEnd < atStart) return

    // Verify the range still represents an @query in the current text — the
    // user might have edited between popup open and click. If so, fall back
    // to recomputing from current text using the live caret.
    let realStart = atStart
    let realEnd = atEnd
    const text = htmlToText(el.innerHTML)
    if (text[atStart] !== '@' || text.slice(atStart + 1, atEnd) !== query) {
      const r = findActiveQuery(el, text, lastCaretRef.current)
      if (r.atStart < 0) return
      realStart = r.atStart
      realEnd = r.atEnd
    }

    const start = findTextPos(el, realStart)
    const end = findTextPos(el, realEnd)
    if (!start || !end) return

    el.focus()

    // `container`/`containerEl` are the caret's text node + its parent
    // block. `originalEndLen` captures the text length BEFORE we delete
    // the @query below, so we can still tell afterwards whether the caret
    // sat at the end of the line.
    const container = end.node
    const containerEl = container.parentElement
    const originalEndLen = container.data.length

    const deleteRange = document.createRange()
    deleteRange.setStart(start.node, start.offset)
    deleteRange.setEnd(end.node, end.offset)
    deleteRange.deleteContents()

    // Drop a <br> BEFORE the chip when the caret sat at the END of a text
    // node that is the LAST child of its containing line (no non-whitespace
    // content follows on the same line). Without this, a long line + chip
    // overflows and the browser wraps the whole chip onto a new line — which
    // reads as "the chip landed somewhere else". Forcing the <br> makes the
    // wrap explicit: the caret's line ends cleanly, and the chip starts a
    // fresh line directly under the caret.
    //
    // IMPORTANT: this check must run BEFORE we insert the chip + space below,
    // because those inserts change the container's children and would
    // invalidate `lastChild === container` / `nextSibling === null`.
    //
    // The container must also live DIRECTLY in a line block (the editor root
    // or a line <div>) — never inside a mention <span>: a <br> inserted there
    // would split the chip in two.
    const inLineBlock = containerEl === el || (containerEl !== null && containerEl.tagName === 'DIV')
    const needBr = (
      container.nodeType === 3 &&
      inLineBlock &&
      end.offset === originalEndLen &&
      containerEl !== null &&
      containerEl.lastChild === container &&
      container.nextSibling === null
    )

    const mention = document.createElement('span')
    mention.className = 'mention'
    mention.setAttribute('data-mention', String(indexOneBased))
    mention.textContent = `@图${indexOneBased}`
    // The trailing space keeps the chip from gluing onto the next word and
    // gives the caret a real text position to sit in AFTER the chip — a caret
    // anchored "after the span" makes Chromium push the next keystroke INSIDE
    // the chip (`@图1banana`).
    const space1 = document.createTextNode(' ')

    const insertRange = document.createRange()
    insertRange.setStart(deleteRange.endContainer, deleteRange.endOffset)
    insertRange.collapse(true)
    // Range.insertNode inserts at the range's start offset each call; the LAST
    // inserted node ends up FIRST in document order (each new insert pushes
    // earlier inserts forward). To end up with [<br>] <chip> <space> in
    // document order, call them in reverse: space, chip, br.
    insertRange.insertNode(space1)
    insertRange.insertNode(mention)
    if (needBr) {
      insertRange.insertNode(document.createElement('br'))
    }

    // Place the caret AFTER the trailing space: the next keystroke lands just
    // after the chip (outside it) instead of inside the <span>.
    const newRange = document.createRange()
    newRange.setStart(space1, space1.data.length)
    newRange.collapse(true)
    const sel = window.getSelection()
    if (sel) { sel.removeAllRanges(); sel.addRange(newRange) }

    const ev = new Event('input', { bubbles: true })
    el.dispatchEvent(ev)
    setMentionMenu((m) => ({ ...m, open: false }))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && mentionMenu.open) {
      setMentionMenu((m) => ({ ...m, open: false }))
    }
  }

  const handlePaste: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
  }

  return (
    <div className="ce-wrap">
      <div className="ce-stage">
        <div
          ref={rootRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          role="textbox"
          aria-label="提示词输入"
          data-placeholder={PLACEHOLDER}
          className={isEmpty ? 'ce-editor empty' : 'ce-editor'}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: 290,                                   // matches .ce-stage
            overflowY: 'auto',
            padding: '16px 18px 16px 18px',
            paddingRight: 110,                             // 给右下角悬浮 Generate 按钮腾位置
            color: 'var(--text-1)',
            background: 'var(--bg-card)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r-sm)',
            outline: 'none',
            userSelect: 'text',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            transition: 'border-color 160ms ease, box-shadow 160ms ease',
          }}
        />
        {/* Generate button — floats on top of the prompt editor's bottom-right.
            Not part of the flow: doesn't push text down, doesn't add to stage height. */}
        <div className="ce-action">
          <GenerateButton />
        </div>
      </div>
      {mentionMenu.open && (
        <div ref={menuRef}
          className="mention-menu"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          style={{ top: mentionMenu.top, left: mentionMenu.left }}
        >
          <div className="menu-eyebrow">选择参考图 · Pick a plate</div>
          {refImages.map((r, i) => (
            <button key={r.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => { e.stopPropagation(); insertMention(i + 1) }}
            >
              <img src={r.dataUrl} alt="" style={{
                width: 32, height: 32, borderRadius: 'var(--r-xs)', objectFit: 'cover',
                border: '1px solid var(--line)',
              }} />
              <span className="num">#{String(i + 1).padStart(2, '0')}</span>
              <span className="name">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// -------------------- helpers --------------------

function placeCaretAtEnd(el: HTMLElement): void {
  el.focus()
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(range)
}

function getCaretOffset(el: HTMLElement): { offset: number } | null {
  // Kept exported in case future code wants live-caret math. Currently the
  // mention popup finds its anchor purely from text — see handleInput.
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!el.contains(range.startContainer)) return null
  const pre = document.createRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.startContainer, range.startOffset)
  return { offset: pre.toString().length }
}
