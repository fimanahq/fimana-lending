import { CollectionsWorkspace } from '@/components/collections/collections-workspace'
import { parseCollectionSection } from '@/components/collections/collections-data'
import { authorizedBackendRequestWithCurrentAccess } from '@/lib/server/backend'
import type { CollectionsSummary } from '@/lib/types/lending'

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; page?: string; section?: string }>
}) {
  const { currency, page, section } = await searchParams
  const initialSection = parseCollectionSection(section ?? null)
  const requestedPage = Number(page)
  const initialPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

  try {
    const apiQuery = new URLSearchParams()
    if (currency) apiQuery.set('currency', currency)
    apiQuery.set('section', initialSection)
    apiQuery.set('page', String(initialPage))
    apiQuery.set('itemsPerPage', '20')
    const endpoint = `/loans/collections-summary${apiQuery.size ? `?${apiQuery.toString()}` : ''}`
    const data = await authorizedBackendRequestWithCurrentAccess<CollectionsSummary>(endpoint)
    return <CollectionsWorkspace data={data} initialPage={initialPage} initialSection={initialSection} />
  } catch (error) {
    return (
      <CollectionsWorkspace
        data={null}
        error={error instanceof Error ? error.message : 'Collections data is unavailable.'}
        initialPage={initialPage}
        initialSection={initialSection}
      />
    )
  }
}
