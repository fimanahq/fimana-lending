import { ModuleScaffoldPage } from '@/modules/module-scaffold'

export function CollectionsModulePage() {
  return (
    <ModuleScaffoldPage
      eyebrow="Collections"
      title="Collections queue"
      description="A focused workspace for due follow-ups, overdue installments, promise-to-pay notes, and collection outcomes."
      emptyTitle="Collections workflow is scaffolded."
      emptyDescription="Use backend installment and reminder data as the source of truth before adding collector actions."
      nextSteps={[
        'Load due and overdue installments through the service layer.',
        'Keep collection actions separate from loan application review.',
        'Display backend-provided balances, dates, and payment statuses without recomputing financial values.',
      ]}
    />
  )
}
