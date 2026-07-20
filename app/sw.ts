/// <reference lib="webworker" />

import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'
import { CacheFirst, ExpirationPlugin, Serwist, StaleWhileRevalidate } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

interface PushNotificationPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

function getPushPayload(event: PushEvent): PushNotificationPayload {
  if (!event.data) {
    return {}
  }

  try {
    return event.data.json() as PushNotificationPayload
  } catch {
    return { body: event.data.text() }
  }
}

self.addEventListener('push', (event) => {
  const payload = getPushPayload(event)
  const title = payload.title || 'FiMana Lending'
  const options: NotificationOptions = {
    body: payload.body || 'You have a new FiMana update.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'fimana-notification',
    data: {
      url: payload.url || '/portal',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notificationData = event.notification.data as { url?: string } | undefined
  const targetPath = notificationData?.url || '/portal'
  const targetUrl = new URL(targetPath, self.location.origin).href

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    for (const client of windowClients) {
      if ('focus' in client && client.url.startsWith(self.location.origin)) {
        await client.navigate(targetUrl)
        return client.focus()
      }
    }

    return self.clients.openWindow(targetUrl)
  })())
})

const staticAssetCache: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static-assets',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 96,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && /\.(?:css|js|woff2?)$/i.test(pathname),
    handler: new StaleWhileRevalidate({
      cacheName: 'static-code-assets',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && /\.(?:png|jpg|jpeg|svg|webp|ico)$/i.test(pathname),
    handler: new StaleWhileRevalidate({
      cacheName: 'static-image-assets',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname === '/manifest.webmanifest',
    handler: new StaleWhileRevalidate({
      cacheName: 'pwa-manifest',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 4,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: staticAssetCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.mode === 'navigate' || request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()
