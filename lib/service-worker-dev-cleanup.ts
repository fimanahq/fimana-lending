'use client'

const DEV_SERVICE_WORKER_RELOAD_KEY = 'fimana-dev-service-worker-cleanup-reloaded'

export async function cleanupDevelopmentServiceWorker() {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    const hadController = Boolean(navigator.serviceWorker.controller)

    await Promise.all(registrations.map((registration) => registration.unregister()))

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
    }

    if (hadController && window.sessionStorage.getItem(DEV_SERVICE_WORKER_RELOAD_KEY) !== '1') {
      window.sessionStorage.setItem(DEV_SERVICE_WORKER_RELOAD_KEY, '1')
      window.location.reload()
      return
    }

    if (!hadController) {
      window.sessionStorage.removeItem(DEV_SERVICE_WORKER_RELOAD_KEY)
    }
  } catch {
    // Best-effort dev cleanup only. Avoid replacing stale-worker errors with cleanup errors.
  }
}
