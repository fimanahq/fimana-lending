import Link from 'next/link'
import { BorrowerForm } from '@/components/borrowers/borrower-form'
import { Card, PageContainer } from '@/components/shared'

export default function NewBorrowerPage() {
  return (
    <PageContainer>
      <Card
        title="Borrower details"
        description="Email and phone are required before a loan can be issued."
        actions={<Link href="/borrowers" className="button-secondary">Back to borrowers</Link>}
      >
        <BorrowerForm mode="create" />
      </Card>
    </PageContainer>
  )
}
