interface JwtPayloadWithExpiry {
  exp?: unknown
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
  return atob(padded)
}

export function getJwtExpiresAtSeconds(token: string) {
  try {
    const [, payload] = token.split('.')
    if (!payload) {
      return null
    }

    const decoded = JSON.parse(decodeBase64Url(payload)) as JwtPayloadWithExpiry
    return typeof decoded.exp === 'number' ? decoded.exp : null
  } catch {
    return null
  }
}

export function getJwtMaxAgeSeconds(token: string) {
  const expiresAtSeconds = getJwtExpiresAtSeconds(token)
  if (!expiresAtSeconds) {
    return null
  }

  const maxAgeSeconds = expiresAtSeconds - Math.floor(Date.now() / 1000)
  return maxAgeSeconds > 0 ? maxAgeSeconds : null
}

export function isJwtExpiredOrNearExpiry(token: string, skewSeconds = 0) {
  const expiresAtSeconds = getJwtExpiresAtSeconds(token)
  return !expiresAtSeconds || expiresAtSeconds <= Math.floor(Date.now() / 1000) + skewSeconds
}
