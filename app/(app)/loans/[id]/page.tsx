import { LoanDetail } from '@/components/loan-list/loan-detail'
import { getLoanDetailBackNavigation } from '@/lib/loan-navigation'

export default async function LoanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ returnTo?: string | string[] }>
}) {
  const { id } = await params
  const { returnTo } = await searchParams ?? {}
  const backNavigation = getLoanDetailBackNavigation(returnTo)

  return <LoanDetail loanId={id} backNavigation={backNavigation} />
}
