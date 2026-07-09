'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useToast } from '@/components/shared'
import styles from './install-app-button.module.css'

type InstallPromptOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallPromptOutcome }>
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export function InstallAppButton() {
  const toast = useToast()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    setIsInstalled(isStandaloneDisplay())

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setInstallPrompt(null)
      setIsInstalled(true)
      toast.success('FiMana is ready to open from your device.', 'App installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [toast])

  const handleInstall = useCallback(async () => {
    if (isStandaloneDisplay()) {
      setIsInstalled(true)
      toast.success('FiMana is already installed on this device.', 'App installed')
      return
    }

    if (!installPrompt) {
      toast.show('Open your browser menu and choose Install app or Add to Home Screen.', {
        title: 'Install FiMana',
        tone: 'info',
      })
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice

    if (choice.outcome === 'accepted') {
      toast.success('FiMana is being added to your device.', 'Installing app')
    } else {
      toast.show('You can install FiMana later from this button.', {
        title: 'Install canceled',
        tone: 'info',
      })
    }

    setInstallPrompt(null)
  }, [installPrompt, toast])

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
        <Download aria-hidden="true" size={20} strokeWidth={2.4} />
        Install app
      </button>
    </span>
  )
}
