import { Icon } from '@/components/Icon'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  confirmIcon?: string
  onConfirm: () => void
  onCancel: () => void
}

/** In-app confirmation (a native confirm() looks out of place in the kiosk). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmIcon = 'archive',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className={s.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      data-testid="confirm-dialog"
    >
      <div className={cn(s.pinbox, s.confirmBox)}>
        <h3>
          <Icon name="triangle-alert" />
          {title}
        </h3>
        <p>{message}</p>
        <div className={s.confirmBtns}>
          <button type="button" className={s.btn} data-testid="confirm-cancel" onClick={onCancel}>
            Vazgeç
          </button>
          <button
            type="button"
            className={cn(s.btn, s.btnDanger)}
            data-testid="confirm-ok"
            onClick={onConfirm}
          >
            <Icon name={confirmIcon} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
