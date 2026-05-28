'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { classNames } from '@/utils/class-names'
import styles from './toast.module.css'

type ToastTone = 'success' | 'error'
type ExtendedToastTone = ToastTone | 'loading'

interface ToastRecord {
  id: string
  message: string
  title: string
  tone: ExtendedToastTone
}

interface ToastContextValue {
  dismiss: (id?: string) => void
  error: (message: string, title?: string) => void
  loading: (message: string, title?: string) => string
  show: (message: string, options?: { id?: string; title?: string; tone?: ExtendedToastTone }) => string
  success: (message: string, title?: string) => void
  update: (id: string, message: string, options?: { title?: string; tone?: ExtendedToastTone }) => void
}

const TOAST_LIMIT = 4
const TOAST_DURATION_MS = 4000

const toastTitles: Record<ExtendedToastTone, string> = {
  error: 'Action failed',
  loading: 'Working',
  success: 'Success',
}

const ToastContext = createContext<ToastContextValue | null>(null)

function ToastViewport({
  onDismiss,
  toasts,
}: {
  onDismiss: (id: string) => void
  toasts: ToastRecord[]
}) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className={styles.viewport} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={classNames(
            styles.toast,
            toast.tone === 'success' && styles.success,
            toast.tone === 'error' && styles.error,
            toast.tone === 'loading' && styles.loading,
          )}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          <span
            className={classNames(
              styles.indicator,
              toast.tone === 'loading' && styles.indicatorLoading,
              toast.tone === 'success' && styles.indicatorSuccess,
              toast.tone === 'error' && styles.indicatorError,
            )}
            aria-hidden="true"
          />
          <div className={styles.content}>
            <p className={styles.title}>{toast.title}</p>
            <p className={styles.message}>{toast.message}</p>
          </div>
          <button
            type="button"
            className={styles.dismiss}
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const sequenceRef = useRef(0)

  const dismiss = (id?: string) => {
    if (!id) {
      setToasts((current) => current.slice(1))
      return
    }

    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  const show = (message: string, options?: { id?: string; title?: string; tone?: ExtendedToastTone }) => {
    const tone = options?.tone ?? 'success'
    const nextToast: ToastRecord = {
      id: options?.id ?? `toast-${sequenceRef.current++}`,
      message,
      title: options?.title ?? toastTitles[tone],
      tone,
    }

    setToasts((current) => {
      const existingIndex = current.findIndex((toast) => toast.id === nextToast.id)
      if (existingIndex >= 0) {
        const next = [...current]
        next[existingIndex] = nextToast
        return next
      }

      return [...current, nextToast].slice(-TOAST_LIMIT)
    })

    return nextToast.id
  }

  const success = (message: string, title = toastTitles.success) => {
    show(message, { title, tone: 'success' })
  }

  const error = (message: string, title = toastTitles.error) => {
    show(message, { title, tone: 'error' })
  }

  const loading = (message: string, title = toastTitles.loading) => (
    show(message, { title, tone: 'loading' })
  )

  const update = (id: string, message: string, options?: { title?: string; tone?: ExtendedToastTone }) => {
    show(message, { id, title: options?.title, tone: options?.tone })
  }

  useEffect(() => {
    if (toasts.length === 0) {
      return
    }

    const timers = toasts
      .filter((toast) => toast.tone !== 'loading')
      .map((toast) => window.setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== toast.id))
      }, TOAST_DURATION_MS))

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [toasts])

  const value: ToastContextValue = {
    dismiss,
    error,
    loading,
    show,
    success,
    update,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
