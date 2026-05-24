type QueryValue = string | number | boolean | null | undefined

export function buildQueryString(params: Record<string, QueryValue>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  return searchParams.toString()
}

export function buildPathWithQuery(
  path: string,
  query: string | Record<string, QueryValue>,
) {
  const queryString = typeof query === 'string' ? query : buildQueryString(query)
  return queryString ? `${path}?${queryString}` : path
}
