'use client'

import { getWebPushPublicKey, saveWebPushSubscription } from '@/services/notifications'

const configuredWebPushPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim()

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function isPushServiceRegistrationError(error: unknown) {
  return getErrorMessage(error, '').toLowerCase().includes('push service error')
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export function getPushNotificationSupportMessage() {
  if (typeof window === 'undefined') {
    return 'Notifications are unavailable.'
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'Notifications are disabled in local development.'
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'Notifications are not supported on this device.'
  }

  if (!window.isSecureContext) {
    return 'Notifications require a secure connection.'
  }

  return ''
}

export async function enablePushNotifications() {
  const unsupportedMessage = getPushNotificationSupportMessage()
  if (unsupportedMessage) {
    throw new Error(unsupportedMessage)
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked in your browser settings.')
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('Notifications were not enabled.')
  }

  let publicKey: string
  try {
    if (configuredWebPushPublicKey) {
      publicKey = configuredWebPushPublicKey
    } else {
      const response = await getWebPushPublicKey()
      publicKey = response.publicKey
    }
  } catch (error) {
    throw new Error(`Unable to load notification settings. ${getErrorMessage(error, 'Please try again.')}`)
  }

  let registration: ServiceWorkerRegistration
  try {
    await navigator.serviceWorker.register('/sw.js')
    registration = await navigator.serviceWorker.ready
  } catch (error) {
    throw new Error(`Unable to start notification service worker. ${getErrorMessage(error, 'Please reload and try again.')}`)
  }

  const existingSubscription = await registration.pushManager.getSubscription()
  let subscription = existingSubscription

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    } catch (error) {
      if (isPushServiceRegistrationError(error)) {
        throw new Error('Chrome could not register this device with its push service. Reset this site permission, make sure browser and system notifications are allowed, then try again.')
      }

      throw new Error(`Unable to subscribe this device for notifications. ${getErrorMessage(error, 'Please try again.')}`)
    }
  }

  try {
    await saveWebPushSubscription(subscription.toJSON())
  } catch (error) {
    throw new Error(`Unable to save notification subscription. ${getErrorMessage(error, 'Please try again.')}`)
  }

  return subscription
}

export async function syncExistingPushNotificationSubscription() {
  const unsupportedMessage = getPushNotificationSupportMessage()
  if (unsupportedMessage || Notification.permission !== 'granted') {
    return null
  }

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription() ?? null
  if (!subscription) {
    return null
  }

  await saveWebPushSubscription(subscription.toJSON())
  return subscription
}
