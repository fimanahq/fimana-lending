import { ModuleScaffoldPage } from '@/modules/module-scaffold'

export function SettingsModulePage() {
  return (
    <ModuleScaffoldPage
      eyebrow="Settings"
      title="Workspace settings"
      description="A place for account, notification, lending policy, and display preferences as the app grows."
      emptyTitle="Settings structure is in place."
      emptyDescription="Add settings forms only after the backend exposes stable preference fields and validation rules."
      nextSteps={[
        'Group settings by account, notifications, policy, and display preferences.',
        'Keep form state local and submit through dedicated services.',
        'Show clear save, loading, and error feedback for every form section.',
      ]}
    />
  )
}
