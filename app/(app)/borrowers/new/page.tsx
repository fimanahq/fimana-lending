import Link from 'next/link'
import { BorrowerForm } from '@/components/borrowers/borrower-form'
import { Card, PageContainer, SectionHeader } from '@/components/shared'

export default function NewBorrowerPage() {
  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Borrowers"
        title="Add borrower"
        description="Create a borrower contact record for lending workflows."
        actions={<Link href="/borrowers" className="button-secondary">Back to borrowers</Link>}
      />

      <Card title="Borrower details" description="Email and phone are required before a loan can be issued.">
        <BorrowerForm mode="create" />
      </Card>
    </PageContainer>
  )
}
