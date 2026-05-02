import { redirect } from 'next/navigation'

export default async function LoanSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await params
  redirect('/loan-applications')
}
