import { CardWrapper, EmptyState, PageContainer, SectionHeader } from '@/components/shared'

interface ModuleScaffoldPageProps {
  description: string
  emptyDescription: string
  emptyTitle: string
  eyebrow: string
  nextSteps: string[]
  title: string
}

export function ModuleScaffoldPage({
  description,
  emptyDescription,
  emptyTitle,
  eyebrow,
  nextSteps,
  title,
}: ModuleScaffoldPageProps) {
  return (
    <PageContainer>
      <CardWrapper>
        <SectionHeader eyebrow={eyebrow} title={title} description={description} />
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
