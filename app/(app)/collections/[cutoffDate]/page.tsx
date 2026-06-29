import { CollectionCutoffDetail } from '@/components/collections/collection-cutoff-detail'
import { parseCollectionSection } from '@/components/collections/collections-data'
import { authorizedBackendRequestWithCurrentAccess } from '@/lib/server/backend'
import type { CollectionCutoffDetailResponse } from '@/lib/types/lending'

export default async function CollectionCutoffPage({
  params,
  searchParams,
}: {
  params: Promise<{ cutoffDate: string }>
  searchParams: Promise<{ currency?: string; page?: string; section?: string }>
}) {
  const [{ cutoffDate }, query] = await Promise.all([params, searchParams])
  const section = parseCollectionSection(query.section ?? null)
  const requestedPage = Number(query.page)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 1 ? requestedPage : 1
  const returnQuery = new URLSearchParams({ section })
  if (page > 1) returnQuery.set('page', String(page))
  if (query.currency) returnQuery.set('currency', query.currency)
  const returnPath = `/collections?${returnQuery.toString()}`
  const detailQuery = new URLSearchParams(returnQuery)
  const detailPath = `/collections/${encodeURIComponent(cutoffDate)}?${detailQuery.toString()}`

  try {
    const apiQuery = new URLSearchParams()
    if (query.currency) apiQuery.set('currency', query.currency)
    const endpoint = `/loans/collections-summary/cutoffs/${encodeURIComponent(cutoffDate)}${apiQuery.size ? `?${apiQuery.toString()}` : ''}`
    const data = await authorizedBackendRequestWithCurrentAccess<CollectionCutoffDetailResponse>(endpoint)
    return <CollectionCutoffDetail currency={data.currency} cutoff={data.cutoff} detailPath={detailPath} returnPath={returnPath} />
  } catch (error) {
    return (
      <CollectionCutoffDetail
        currency="PHP"
        cutoff={null}
        detailPath={detailPath}
        error={error instanceof Error ? error.message : 'Cutoff detail is unavailable.'}
        returnPath={returnPath}
      />
    )
  }
}
