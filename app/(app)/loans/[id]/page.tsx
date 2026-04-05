import { LoanDetail } from '@/components/loan-detail'

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <LoanDetail loanId={id} />
}
