/// <reference lib="webworker" />

import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const staticAssetCache: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith('/api/'),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ request, sameOrigin, url: { pathname } }) => sameOrigin && request.mode === 'navigate' && !pathname.startsWith('/api/'),
    handler: new NetworkOnly(),
  },
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
  {
    matcher: /.*/i,
    handler: new NetworkOnly(),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
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
