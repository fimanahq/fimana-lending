import { LoansList } from '@/components/loan-list/loans-list'
import { parseLoanListState } from '@/lib/loan-navigation'

interface LoansPageProps {
  searchParams?: Promise<{
    page?: string | string[]
    status?: string | string[]
    search?: string | string[]
  }>
}

export default async function LoansPage({ searchParams }: LoansPageProps) {
  const listState = parseLoanListState(await searchParams)

  return <LoansList listState={listState} />
}
