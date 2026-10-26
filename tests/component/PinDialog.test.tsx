import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_FAILURES } from '@/app/staffPin'
import { PinDialog } from '@/components/PinDialog'

function setup() {
  const onSuccess = vi.fn<() => void>()
  const onClose = vi.fn<() => void>()
  render(<PinDialog onSuccess={onSuccess} onClose={onClose} />)
  const enter = async (digits: string) => {
    for (const d of digits) await userEvent.click(screen.getByTestId(`pin-key-${d}`))
  }
  const filled = () =>
    screen.getByTestId('pin-dots').querySelectorAll('[data-filled="true"]').length
  return { onSuccess, onClose, enter, filled }
}

describe('staff PIN keypad', () => {
  it('fills a dot per digit and DEL removes one', async () => {
    const { enter, filled } = setup()
    await enter('12')
    expect(filled()).toBe(2)
    await userEvent.click(screen.getByTestId('pin-del'))
    expect(filled()).toBe(1)
  })

  it('the right PIN opens the menu', async () => {
    const { enter, onSuccess } = setup()
    await enter('1234')
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it('a wrong PIN shakes and clears without opening', async () => {
    const { enter, onSuccess, filled } = setup()
    await enter('9999')
    await waitFor(() =>
      expect(screen.getByTestId('pin-dots')).toHaveAttribute('data-error', 'true'),
    )
    await waitFor(() => expect(filled()).toBe(0))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('X closes the keypad', async () => {
    const { onClose } = setup()
    await userEvent.click(screen.getByTestId('pin-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it(`locks after ${MAX_FAILURES} wrong PINs; only X still works`, async () => {
    const { enter, onSuccess, onClose } = setup()
    for (let i = 0; i < MAX_FAILURES; i++) {
      await enter('0000')
      await waitFor(() =>
        expect(screen.getByTestId('pin-dots')).toHaveAttribute('data-error', 'false'),
      )
    }
    expect(screen.getByTestId('pin-locked')).toHaveTextContent('5 dakika sonra tekrar dene')
    expect(screen.getByTestId('pin-key-1')).toBeDisabled()
    expect(onSuccess).not.toHaveBeenCalled()
    await userEvent.click(screen.getByTestId('pin-close'))
    expect(onClose).toHaveBeenCalled()
    // five real PBKDF2 hashes and five shake animations: ~4 s alone, more when every test file
    // runs in parallel, so the default 5 s budget is too tight
  }, 20_000)
})
