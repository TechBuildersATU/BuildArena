import { beforeEach, describe, expect, it, vi } from 'vitest'

// The APK saves the staff PNGs through Android's share sheet (its WebView can't download).
// The Capacitor plugins are mocked; on the web (jsdom) the app is not native.

const writeFile = vi.fn<(options: unknown) => Promise<{ uri: string }>>()
const share = vi.fn<(options: unknown) => Promise<unknown>>()
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: (o: unknown) => writeFile(o) },
  Directory: { Cache: 'CACHE' },
}))
vi.mock('@capacitor/share', () => ({ Share: { share: (o: unknown) => share(o) } }))

const { isNativeApp, sharePng } = await import('@/app/native')

beforeEach(() => {
  writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/ilk3.png' })
  share.mockReset().mockResolvedValue({})
})

describe('APK helpers', () => {
  it('the browser build is not the native app', () => {
    expect(isNativeApp()).toBe(false)
  })

  it('writes the PNG to the app cache and opens the share sheet with it', async () => {
    expect(await sharePng('iVBORw0KGgo=', 'ilk3.png')).toBe('saved')
    expect(writeFile).toHaveBeenCalledWith({
      path: 'ilk3.png',
      data: 'iVBORw0KGgo=',
      directory: 'CACHE',
    })
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///cache/ilk3.png'] }),
    )
  })

  it('closing the share sheet is not an error; a failed write is', async () => {
    share.mockRejectedValueOnce(new Error('Share canceled'))
    expect(await sharePng('x', 'a.png')).toBe('cancelled')
    writeFile.mockRejectedValueOnce(new Error('disk full'))
    expect(await sharePng('x', 'a.png')).toBe('failed')
  })
})
