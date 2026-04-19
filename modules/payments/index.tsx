import { ModuleScaffoldPage } from '@/modules/module-scaffold'

export function PaymentsModulePage() {
  return (
    <ModuleScaffoldPage
      eyebrow="Payments"
      title="Payment tracking"
      description="A future collection queue for scheduled payments, partial payments, receipts, and overdue follow-up."
      emptyTitle="Payment operations are scaffolded."
      emptyDescription="Use existing lending installment APIs before adding any new payment contract or calculation in the frontend."
      nextSteps={[
        'List due, overdue, partial, and paid installments from existing endpoints.',
        'Reuse the shared table and state patterns for loading, empty, and error states.',
        'Route collection actions through services and preserve backend-provided totals.',
      ]}
    />
  )
}
