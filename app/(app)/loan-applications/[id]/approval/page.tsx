import { redirect } from 'next/navigation'

export default async function LoanApplicationApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  redirect(`/loan-applications/${id}`)
}
