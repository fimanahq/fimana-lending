import { Card, PageContainer, Skeleton, TableShell } from '@/components/shared'
import { classNames } from '@/utils/class-names'
import toolbarStyles from '@/components/shared/list-toolbar.module.css'

export default function AppSectionLoading() {
  return (
    <PageContainer className="stack" aria-busy="true" aria-live="polite">
      <div className={classNames('card panel', toolbarStyles.toolbar)}>
        <Skeleton lines={2} />
        <Skeleton lines={1} />
      </div>

      <Card>
        <Skeleton lines={4} />
      </Card>

      <TableShell label="Loading workspace data">
        <Skeleton lines={8} />
      </TableShell>
    </PageContainer>
  )
}
