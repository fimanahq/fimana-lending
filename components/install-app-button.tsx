'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { useToast } from '@/components/shared'
import styles from './install-app-button.module.css'

type InstallPromptOutcome = 'accepted' | 'dismissed'
type InstallPreparationIssueReason = 'non-production' | 'insecure-context' | 'service-worker-unsupported' | 'registration-failed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallPromptOutcome }>
}

interface InstallPreparationIssue {
  reason: InstallPreparationIssueReason
  error?: unknown
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function isIosDevice() {
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIpadOsDesktopMode = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  return /iphone|ipad|ipod/.test(userAgent) || isIpadOsDesktopMode
}

function isAndroidDevice() {
  return window.navigator.userAgent.toLowerCase().includes('android')
}

function isSafariBrowser() {
  const userAgent = window.navigator.userAgent.toLowerCase()
  return userAgent.includes('safari') && !/crios|fxios|edgios|opios/.test(userAgent)
}

function getInstallButtonLabel() {
  return isIosDevice() ? 'Add to Home Screen' : 'Install app'
}

function getManualInstallTitle(installPreparationIssue: InstallPreparationIssue | null = null) {
  if (isIosDevice()) {
    return 'Add to Home Screen'
  }

  if (installPreparationIssue && isAndroidDevice()) {
    return 'Install unavailable'
  }

  return isAndroidDevice() ? 'Install not ready' : 'Install FiMana'
}

function getManualInstallMessage() {
  if (isIosDevice()) {
    if (isSafariBrowser()) {
      return 'Tap Share, then choose Add to Home Screen.'
    }

    return 'Use the browser Share menu and choose Add to Home Screen. If you do not see that option, open this page in Safari.'
  }

  if (isAndroidDevice()) {
    return 'Android Chrome has not made the install prompt available yet. Keep this page open briefly, then tap Install app again. You can also use Chrome menu > Install app.'
  }

  return 'Open your browser menu and choose Install app or Add to Home Screen.'
}

function getInstallUnavailableMessage(installPreparationIssue: InstallPreparationIssue | null) {
  if (!installPreparationIssue || !isAndroidDevice()) {
    return getManualInstallMessage()
  }

  if (installPreparationIssue.reason === 'non-production') {
    return 'App installation is not available in this local development build. Test an HTTPS production build, or use Chrome menu > Install app on a deployed site.'
  }

  if (installPreparationIssue.reason === 'insecure-context') {
    return 'App installation requires a secure HTTPS connection. Open the HTTPS site and try again.'
  }

  if (installPreparationIssue.reason === 'service-worker-unsupported') {
    return 'This browser cannot prepare app installation. Open this page in Android Chrome and try again.'
  }

  return 'FiMana could not prepare app installation. Reload this page and try again. You can also use Chrome menu > Install app.'
}

async function prepareInstallServiceWorker(): Promise<InstallPreparationIssue | null> {
  if (process.env.NODE_ENV !== 'production') {
    return { reason: 'non-production' }
  }

  if (typeof window === 'undefined') {
    return null
  }

  if (!window.isSecureContext) {
    return { reason: 'insecure-context' }
  }

  if (!('serviceWorker' in navigator)) {
    return { reason: 'service-worker-unsupported' }
  }

  try {
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return null
  } catch (error) {
    return { reason: 'registration-failed', error }
  }
}

export function InstallAppButton() {
  const toast = useToast()
  const [isInstalled, setIsInstalled] = useState(false)
  const [buttonLabel, setButtonLabel] = useState('Install app')
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const installPreparationIssueRef = useRef<InstallPreparationIssue | null>(null)
  const toastRef = useRef(toast)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  useEffect(() => {
    setIsInstalled(isStandaloneDisplay())
    setButtonLabel(getInstallButtonLabel())

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      const nextInstallPrompt = event as BeforeInstallPromptEvent
      installPromptRef.current = nextInstallPrompt
      installPreparationIssueRef.current = null
    }

    function handleAppInstalled() {
      installPromptRef.current = null
      setIsInstalled(true)
      toastRef.current.success('FiMana is ready to open from your device.', 'App installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    void prepareInstallServiceWorker()
      .then((issue) => {
        installPreparationIssueRef.current = issue

        if (issue?.reason === 'registration-failed') {
          console.warn('[install-app] service worker registration failed', issue.error)
        } else if (issue) {
          console.warn('[install-app] app installation unavailable', issue.reason)
        }
      })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (isStandaloneDisplay()) {
      setIsInstalled(true)
      toast.success('FiMana is already installed on this device.', 'App installed')
      return
    }

    const promptEvent = installPromptRef.current

    if (!promptEvent) {
      toast.show(getInstallUnavailableMessage(installPreparationIssueRef.current), {
        title: getManualInstallTitle(installPreparationIssueRef.current),
        tone: 'info',
      })
      return
    }

    try {
      await promptEvent.prompt()
    } catch {
      toast.show(getInstallUnavailableMessage(installPreparationIssueRef.current), {
        title: getManualInstallTitle(installPreparationIssueRef.current),
        tone: 'info',
      })
      return
    }

    const choice = await promptEvent.userChoice

    if (choice.outcome === 'accepted') {
      toast.success('FiMana is being added to your device.', 'Installing app')
    } else {
      toast.show('You can install FiMana later from this button.', {
        title: 'Install canceled',
        tone: 'info',
      })
    }

    installPromptRef.current = null
  }, [toast])

  if (isInstalled) {
    return null
  }

  return (
    <span className={styles.shell}>
      <button
        type="button"
        className={`${styles.button} landing-homepage__button landing-homepage__button--secondary`}
        onClick={handleInstall}
      >
        {buttonLabel === 'Add to Home Screen' ? (
          <Share2 aria-hidden="true" size={20} strokeWidth={2.4} />
        ) : (
          <Download aria-hidden="true" size={20} strokeWidth={2.4} />
        )}
        {buttonLabel}
      </button>
    </span>
  )
}
