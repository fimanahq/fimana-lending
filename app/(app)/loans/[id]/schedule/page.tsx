import { LoanScheduleDetail } from '@/components/loan-schedule-detail'

export default async function LoanSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <LoanScheduleDetail loanId={id} />
}
