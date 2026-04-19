import { ModuleScaffoldPage } from '@/modules/module-scaffold'

export function BorrowersModulePage() {
  return (
    <ModuleScaffoldPage
      eyebrow="Borrowers"
      title="Borrower profiles"
      description="A dedicated workspace for borrower records, contact details, lending history, and account notes."
      emptyTitle="Borrower management is ready for service integration."
      emptyDescription="Connect this module to the contacts service when borrower list, profile, and archive flows are implemented."
      nextSteps={[
        'Load borrower records through the service layer.',
        'Add profile detail and edit forms with required field validation.',
        'Surface loan history without recalculating financial values in the UI.',
      ]}
    />
  )
}
