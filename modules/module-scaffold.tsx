import { CardWrapper, EmptyState, PageContainer, SectionHeader } from '@/components/shared'

interface ModuleScaffoldPageProps {
  emptyDescription: string
  emptyTitle: string
  nextSteps: string[]
  title: string
}

export function ModuleScaffoldPage({
  emptyDescription,
  emptyTitle,
  nextSteps,
  title,
}: ModuleScaffoldPageProps) {
  return (
    <PageContainer>
      <CardWrapper>
        <SectionHeader title={title} />
      </CardWrapper>

      <CardWrapper title="Foundation">
        <div className="module-scaffold">
          <EmptyState title={emptyTitle} description={emptyDescription} />

          <div className="module-scaffold__steps">
            <h3 className="subsection-title">Next build steps</h3>
            <ul>
              {nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardWrapper>
    </PageContainer>
  )
}
