import { LoanApplicationApproval } from '@/components/loan-applications/loan-application-approval'

export default async function LoanApplicationApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <LoanApplicationApproval applicationId={id} />
}
