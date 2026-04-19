import { ModuleScaffoldPage } from '@/modules/module-scaffold'

export function ReportsModulePage() {
  return (
    <ModuleScaffoldPage
      eyebrow="Reports"
      title="Portfolio reports"
      description="A reporting area for portfolio summaries, borrower exposure, collections, and profitability views."
      emptyTitle="Reporting views are ready to extend."
      emptyDescription="Report cards should consume backend-provided aggregates or clearly labeled API fields before displaying financial totals."
      nextSteps={[
        'Define report sections around backend metrics and existing loan statuses.',
        'Add export and date-filter controls after report data contracts are available.',
        'Keep currency formatting centralized and avoid premature rounding.',
      ]}
    />
  )
}
