import { app, protocol } from 'electron'
import { join } from 'node:path'
import * as fs from 'node:fs/promises'

export function registerImageProtocol(): void {
  // Must be called after app.whenReady().
  protocol.handle('img', async (req) => {
    try {
      // Note: WHATWG URL parses `img://filename.png` as authority=`filename.png`,
      // pathname=`/` — `new URL(...).pathname` would drop the filename into the
      // authority. Strip scheme manually and trim trailing slashes; the remainder
      // is the safe filename. We do NOT support subdirectories.
      const stripped = req.url.replace(/^img:\/\//, '').replace(/\/+$/, '')
      if (!stripped || stripped.includes('..') || stripped.includes('\\') || stripped.includes('/')) {
        return new Response('bad path', { status: 400 })
      }
      const file = stripped
      const abs = join(app.getPath('userData'), 'images', file)
      const buf = await fs.readFile(abs)
      const ext = file.split('.').pop()?.toLowerCase()
      const mime =
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'webp' ? 'image/webp' :
        'image/png'
      return new Response(buf, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(buf.length),
          'Cache-Control': 'no-cache',
        },
      })
    } catch (e) {
      console.error('[img://] error for', req.url, e)
      return new Response(`img error: ${(e as Error).message}`, { status: 500 })
    }
  })
}
