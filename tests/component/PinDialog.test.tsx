import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { hasCustomPin, MAX_FAILURES, verifyPin } from '@/app/staffPin'
import { PinDialog, PinSetDialog } from '@/components/PinDialog'

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

describe('new PIN keypad (staff settings)', () => {
  function setupSet() {
    const onDone = vi.fn<() => void>()
    const onClose = vi.fn<() => void>()
    render(<PinSetDialog onDone={onDone} onClose={onClose} />)
    const enter = async (digits: string) => {
      for (const d of digits) await userEvent.click(screen.getByTestId(`pin-key-${d}`))
    }
    const hint = () => screen.getByTestId('pin-set-hint')
    return { onDone, onClose, enter, hint }
  }

  it('asks twice, then saves the PIN on this device only', async () => {
    const { enter, hint, onDone } = setupSet()
    expect(hint()).toHaveAttribute('data-step', 'new')
    await enter('2580')
    await waitFor(() => expect(hint()).toHaveAttribute('data-step', 'repeat'))
    expect(hint()).toHaveTextContent("Aynı PIN'i bir kez daha gir")
    await enter('2580')
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(hasCustomPin()).toBe(true)
    expect(verifyPin('2580')).toBe('ok')
    expect(verifyPin('1234')).toBe('wrong')
  })

  it('a different second PIN shakes, saves nothing and starts over', async () => {
    const { enter, hint, onDone } = setupSet()
    await enter('2580')
    await waitFor(() => expect(hint()).toHaveAttribute('data-step', 'repeat'))
    await enter('2581')
    await waitFor(() => expect(hint()).toHaveAttribute('data-step', 'mismatch'))
    expect(screen.getByTestId('pin-dots')).toHaveAttribute('data-error', 'true')
    expect(hasCustomPin()).toBe(false)
    // after the shake the next PIN counts as a new first entry
    await waitFor(() =>
      expect(screen.getByTestId('pin-dots')).toHaveAttribute('data-error', 'false'),
    )
    await enter('3690')
    await waitFor(() => expect(hint()).toHaveAttribute('data-step', 'repeat'))
    await enter('3690')
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(verifyPin('3690')).toBe('ok')
  })

  it('refuses the public default 1234', async () => {
    const { enter, hint, onDone } = setupSet()
    await enter('1234')
    await waitFor(() => expect(hint()).toHaveAttribute('data-step', 'default'))
    expect(hint()).toHaveTextContent('herkesin bildiği varsayılan PIN')
    expect(onDone).not.toHaveBeenCalled()
    expect(hasCustomPin()).toBe(false)
  })

  it('X closes without changing anything', async () => {
    const { enter, onClose, onDone } = setupSet()
    await enter('25')
    await userEvent.click(screen.getByTestId('pin-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()
    expect(hasCustomPin()).toBe(false)
  })
})
