import { useToast } from '@/hooks/use-toast'
import { ToastIcon } from '@/components/ui/toast-icon'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <ToastIcon variant={props.variant} />
            {/* Radix sets user-select: none on the toast for the swipe gesture. Let the user
                select the text, and do not start a swipe from the text. */}
            <div
              className="grid flex-1 gap-1 p-4 pr-8 select-text cursor-text"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
