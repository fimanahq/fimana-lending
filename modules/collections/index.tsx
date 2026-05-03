import { ModuleScaffoldPage } from '@/modules/module-scaffold'

export function CollectionsModulePage() {
  return (
    <ModuleScaffoldPage
      title="Collections queue"
      emptyTitle="Collections workflow is scaffolded."
      emptyDescription="Payment posting now starts from Loans. Keep Collections for reminder and follow-up actions only."
      nextSteps={[
        'Load due and overdue installments through the service layer.',
        'Keep follow-up actions separate from payment posting and loan application review.',
        'Display backend-provided balances, dates, and payment statuses without recomputing financial values.',
      ]}
    />
  )
}
