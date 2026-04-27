import { LoanApplicationDetail } from '@/components/loan-applications/loan-application-detail'

export default async function LoanApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <LoanApplicationDetail applicationId={id} />
}
