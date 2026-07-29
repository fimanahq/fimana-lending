import { apiRequest } from '@/lib/client-api'

export interface WebPushPublicKeyResponse {
  publicKey: string
}

export function getWebPushPublicKey() {
  return apiRequest<WebPushPublicKeyResponse>('/api/notifications/web-push/public-key')
}

export function saveWebPushSubscription(subscription: PushSubscriptionJSON) {
  return apiRequest<{ enabled: boolean }>('/api/notifications/web-push/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}

export function deleteWebPushSubscription(endpoint: string) {
  return apiRequest<{ deleted: boolean }>('/api/notifications/web-push/subscriptions', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  })
}
