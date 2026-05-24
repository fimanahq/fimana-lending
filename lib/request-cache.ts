export function getOrCreateCachedRequest<T>(
  cache: Map<string, Promise<unknown>>,
  requestPath: string,
  createRequest: () => Promise<T>,
): Promise<T> {
  const inflightRequest = cache.get(requestPath)
  if (inflightRequest) {
    return inflightRequest as Promise<T>
  }

  const request = createRequest()
    .finally(() => {
      cache.delete(requestPath)
    })

  cache.set(requestPath, request)
  return request
}
