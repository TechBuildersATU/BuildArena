import { useEffect, useRef, useState } from 'react'

// The tablet's on-screen keyboard opens over the game; the 1280×800 stage keeps its size. When
// the field being typed in would end up under the keyboard, the stage slides up just far enough
// to keep it in view, and slides back when the keyboard closes.
//
// Keyboard height (CSS px) comes from the APK (MainActivity → window event "ba:keyboard") or,
// in Chrome, from the VirtualKeyboard API with the keyboard set to overlay the content.

/** Space kept between the field and the top of the keyboard (CSS px). */
export const KEYBOARD_GAP = 24

/**
 * How far the stage must move up so the focused field sits above the keyboard; 0 when it is
 * already visible. `fieldBottom` is the field's bottom edge without any lift (viewport CSS px).
 */
export function keyboardLift(
  fieldBottom: number,
  viewportHeight: number,
  keyboardHeight: number,
): number {
  if (keyboardHeight <= 0) return 0
  return Math.max(0, Math.ceil(fieldBottom + KEYBOARD_GAP - (viewportHeight - keyboardHeight)))
}

interface VirtualKeyboard extends EventTarget {
  overlaysContent: boolean
  boundingRect: DOMRect
}

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'tel', 'url', 'password', 'number'])

function typingTarget(): HTMLElement | null {
  const el = document.activeElement
  if (el instanceof HTMLTextAreaElement) return el
  if (el instanceof HTMLInputElement && TEXT_INPUTS.has(el.type)) return el
  return null
}

/** Current lift of the stage in viewport CSS px (0 when no keyboard is in the way). */
export function useKeyboardLift(): number {
  const [lift, setLift] = useState(0)
  const current = useRef(0)

  useEffect(() => {
    let keyboard = 0
    const update = () => {
      const field = typingTarget()
      let next = 0
      if (field && keyboard > 0) {
        // the field's own box, or a larger box around it marked as the keyboard anchor
        const anchor = field.closest<HTMLElement>('[data-keyboard-anchor]') ?? field
        const bottom = anchor.getBoundingClientRect().bottom + current.current
        next = keyboardLift(bottom, window.innerHeight, keyboard)
      }
      current.current = next
      setLift(next)
    }

    const onNative = (e: Event) => {
      keyboard = (e as CustomEvent<{ height: number }>).detail?.height ?? 0
      update()
    }
    // focus moving to another field (or away) is settled one tick later
    const onFocus = () => window.setTimeout(update, 0)
    window.addEventListener('ba:keyboard', onNative)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onFocus)

    const vk = (navigator as Navigator & { virtualKeyboard?: VirtualKeyboard }).virtualKeyboard
    const onGeometry = () => {
      keyboard = vk?.boundingRect.height ?? 0
      update()
    }
    if (vk) {
      vk.overlaysContent = true
      vk.addEventListener('geometrychange', onGeometry)
    }

    return () => {
      window.removeEventListener('ba:keyboard', onNative)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onFocus)
      vk?.removeEventListener('geometrychange', onGeometry)
    }
  }, [])

  return lift
}
