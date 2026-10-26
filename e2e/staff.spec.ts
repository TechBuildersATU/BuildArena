import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { expectTouchTarget, scanA11y } from './helpers.ts'

// Staff menu: PIN, lockout, logo hold, top-3 export, end-of-day summary, settings, archive and
// reset (scenario doc §3.8, full prototype §7, document §12.8 (7) and the §16.5 staff rows).
// ?demo=1 loads the 36-game sample day: Async Ahtapot 97, Kuantum Koala 96, Turbo Kaplumbağa 95
// (no consent), Piksel Panda 86 (no consent), Hızlı Kartal 84.

const BOARD = '/leaderboard?skipTutorial=1&demo=1'

async function enterPin(page: Page, pin: string) {
  for (const d of pin) await page.getByTestId(`pin-key-${d}`).tap()
}

async function openStaffMenu(page: Page) {
  await page.goto(BOARD)
  await expect(page.getByTestId('podium-1')).toContainText('Async Ahtapot')
  await page.getByTestId('btn-staff').tap()
  await enterPin(page, '1234')
  await expect(page.getByTestId('admin')).toBeVisible()
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(buffer: Buffer): { width: number; height: number } {
  expect(buffer.subarray(1, 4).toString('ascii')).toBe('PNG')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

async function expectDownload(page: Page, id: string, name: string, size: object) {
  await expectTouchTarget(page.getByTestId(id))
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId(id).tap()])
  expect(download.suggestedFilename()).toBe(name)
  expect(pngSize(await readFile(await download.path()))).toEqual(size)
  await expect(page.getByTestId('toast')).toContainText(`${name} indirildi`)
}

function countStore(page: Page, store: string) {
  return page.evaluate(
    (name) =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('buildarena')
        req.onsuccess = () => {
          const count = req.result.transaction(name).objectStore(name).count()
          count.onsuccess = () => resolve(count.result)
        }
      }),
    store,
  )
}

test('wrong PIN shakes and stays locked; the right PIN opens the menu', async ({ page }) => {
  await page.goto(BOARD)
  await page.getByTestId('btn-staff').tap()
  for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'del', 'close']) {
    await expectTouchTarget(page.getByTestId(d.length === 1 ? `pin-key-${d}` : `pin-${d}`))
  }
  await enterPin(page, '9999')
  await expect(page.getByTestId('pin-dots')).toHaveAttribute('data-error', 'true')
  await expect(page.getByTestId('pin-dots')).toHaveAttribute('data-error', 'false')
  await expect(page.getByTestId('admin')).toHaveCount(0)
  await enterPin(page, '1234')
  await expect(page.getByTestId('admin')).toBeVisible()
  await expect(page).toHaveURL(/\/admin$/)
})

test('the settings icon on Home asks for the PIN too', async ({ page }) => {
  await page.goto('/?skipTutorial=1')
  await page.getByTestId('btn-settings').tap()
  await enterPin(page, '1234')
  await expect(page.getByTestId('admin')).toBeVisible()
})

test('5 wrong PINs lock the keypad for 5 minutes', async ({ page }) => {
  await page.clock.install()
  await page.goto('/admin?skipTutorial=1')
  for (let i = 0; i < 5; i++) {
    await enterPin(page, '0000')
    await page.clock.runFor(600)
  }
  await expect(page.getByTestId('pin-locked')).toContainText('5 dakika sonra tekrar dene')
  await expect(page.getByTestId('pin-key-1')).toBeDisabled()
  await page.reload()
  await expect(page.getByTestId('pin-key-1')).toBeDisabled() // the lockout survives a reload
  await page.clock.runFor(5 * 60 * 1000)
  await expect(page.getByTestId('pin-key-1')).toBeEnabled()
  await enterPin(page, '1234')
  await page.clock.runFor(500)
  await expect(page.getByTestId('admin')).toBeVisible()
})

test('holding the logo for 3 s opens the PIN; 2.9 s does nothing', async ({ page }) => {
  await page.clock.install()
  await page.goto('/scenario?skipTutorial=1')
  const logo = page.getByTestId('logo')
  await logo.dispatchEvent('pointerdown')
  await page.clock.runFor(2_900)
  await logo.dispatchEvent('pointerup')
  await page.clock.runFor(500)
  await expect(page.getByTestId('pin-dialog')).toHaveCount(0)

  await logo.dispatchEvent('pointerdown')
  await page.clock.runFor(3_050)
  await expect(page.getByTestId('pin-dialog')).toBeVisible()
  await expect(page).toHaveURL(/\/admin/)
})

test('İlk 3 lists consenting players only and names the skipped ones', async ({ page }) => {
  await openStaffMenu(page)
  for (const id of ['tab-top', 'tab-stats', 'tab-set', 'btn-home'])
    await expectTouchTarget(page.getByTestId(id))
  const rows = page.getByTestId('admin-top3-row')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('Async Ahtapot')
  await expect(rows.nth(1)).toContainText('Kuantum Koala')
  await expect(rows.nth(2)).toContainText('Hızlı Kartal')
  await expect(page.getByTestId('admin-skipped')).toHaveText(
    'Turbo Kaplumbağa, Piksel Panda paylaşım izni vermediği için listeye alınmadı.',
  )
  await page.waitForTimeout(800)
  expect(await scanA11y(page)).toEqual([])
})

test('downloads the top-3 post (1080×1350) and story (1080×1920) as PNG', async ({ page }) => {
  await openStaffMenu(page)
  await expectDownload(page, 'dl-post', 'buildarena-ilk3-gonderi.png', {
    width: 1080,
    height: 1350,
  })
  await expectDownload(page, 'dl-story', 'buildarena-ilk3-hikaye.png', {
    width: 1080,
    height: 1920,
  })
})

test('Gün sonu: counts, highlights and both summary images', async ({ page }) => {
  await openStaffMenu(page)
  await page.getByTestId('tab-stats').tap()
  await expect(page.getByTestId('stat-0')).toContainText('36')
  await expect(page.getByTestId('stat-0')).toContainText('kriz çözüldü')
  await expect(page.getByTestId('stat-1')).toContainText('16')
  await expect(page.getByTestId('stat-facts')).toContainText('En zor karar')
  await expect(page.getByTestId('stat-facts')).toContainText('En çok düşülen tuzak')
  await expect(page.getByTestId('stat-facts')).toContainText('97/100')
  await expectDownload(page, 'dl-stats', 'buildarena-gun-sonu-ozeti.png', {
    width: 1080,
    height: 1350,
  })
  await expectDownload(page, 'dl-stats-story', 'buildarena-gun-sonu-hikaye.png', {
    width: 1080,
    height: 1920,
  })
  await page.waitForTimeout(500)
  expect(await scanA11y(page)).toEqual([])
})

test('Ayarlar: times, music and vibration take effect and are remembered', async ({ page }) => {
  await openStaffMenu(page)
  await page.getByTestId('tab-set').tap()
  for (const id of ['set-duelSec-60', 'set-stepSec-15', 'set-sfx', 'set-music', 'set-haptics'])
    await expectTouchTarget(page.getByTestId(id))
  await page.getByTestId('set-duelSec-60').tap()
  await page.getByTestId('set-stepSec-15').tap()
  await expect(page.getByTestId('set-duelSec-60')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('set-music').tap()
  await expect(page.getByTestId('set-music')).toHaveAttribute('aria-checked', 'false')
  await page.getByTestId('set-haptics').tap()
  await expect(page.getByTestId('set-haptics')).toHaveAttribute('aria-checked', 'false')
  // the volume slider here is the same setting as on the home screen
  await expectTouchTarget(page.getByTestId('set-volume-box'))
  await page.getByTestId('set-volume').focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('set-volume-value')).toHaveText('%70')
  expect(await scanA11y(page)).toEqual([])

  await page.getByTestId('btn-home').tap()
  await expect(page.getByTestId('home-duel-sec')).toContainText('60')
  await expect(page.getByTestId('btn-music')).toHaveAttribute('data-music', 'false')
  await page.getByTestId('btn-music').tap()
  await expect(page.getByTestId('volume-slider')).toHaveValue('70')
  await expect(page.getByTestId('music-toggle')).toHaveAttribute('aria-checked', 'false')
  await page.getByTestId('btn-music').tap()
  await page.getByTestId('btn-scenario').tap()
  await expect(page.getByTestId('scenario-nickname')).toContainText('15 sn / karar')
  await page.goto('/scenario?skipTutorial=1') // a fresh start keeps the settings
  await expect(page.getByTestId('scenario-nickname')).toContainText('15 sn / karar')
})

test('Tutorial reset shows the tutorial again on the next launch', async ({ page }) => {
  await openStaffMenu(page)
  await page.getByTestId('tab-set').tap()
  await page.getByTestId('admin-reset-tutorial').tap()
  await expect(page.getByTestId('toast')).toContainText('Tutorial bir sonraki açılışta')
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
})

test('archive and reset asks first; cancelling keeps the scores', async ({ page }) => {
  await openStaffMenu(page)
  await page.getByTestId('tab-set').tap()
  await page.getByTestId('admin-reset').tap()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-cancel').tap()
  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0)
  expect(await countStore(page, 'scores')).toBe(36)

  await page.getByTestId('admin-reset').tap()
  await page.getByTestId('confirm-ok').tap()
  await expect(page.getByTestId('toast')).toContainText('Gün arşivlendi, tablolar sıfırlandı')
  await expect.poll(() => countStore(page, 'scores')).toBe(0)
  expect(await countStore(page, 'duels')).toBe(0)
  expect(await countStore(page, 'archive')).toBe(36)
  expect(await countStore(page, 'duelArchive')).toBe(16)

  await page.getByTestId('tab-top').tap()
  await expect(page.getByTestId('admin-top3')).toContainText('Paylaşım izni veren oyuncu yok.')
  await page.goto('/leaderboard?skipTutorial=1')
  await expect(page.getByTestId('leaderboard-empty')).toHaveText(
    'Henüz oyun yok. İlk krizi sen çöz!',
  )

  // and the sample day can be loaded again from the settings
  await page.getByTestId('btn-staff').tap()
  await enterPin(page, '1234')
  await page.getByTestId('tab-set').tap()
  await page.getByTestId('admin-demo').tap()
  await expect(page.getByTestId('toast')).toContainText('Örnek veriler yüklendi')
  await expect.poll(() => countStore(page, 'scores')).toBe(36)
})

test('leaving the staff menu locks it again', async ({ page }) => {
  await openStaffMenu(page)
  await page.getByTestId('btn-home').tap()
  await expect(page.getByTestId('home')).toBeVisible()
  // browser Back returns to /admin without a reload: the PIN must be asked again
  await page.goBack()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByTestId('pin-dialog')).toBeVisible()
  await expect(page.getByTestId('admin')).toHaveCount(0)
})
