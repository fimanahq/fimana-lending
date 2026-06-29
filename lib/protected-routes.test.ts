import { describe, expect, it } from 'vitest'
import { isProtectedPath } from './protected-routes'

describe('collections access', () => {
  it('protects the collections route and descendants', () => {
    expect(isProtectedPath('/collections')).toBe(true)
    expect(isProtectedPath('/collections/history')).toBe(true)
  })
})
