'use client'

import { EmptyState } from '@/components/shared'

export function PaymentsWorkspace() {
  return (
    <div className="stack">
      <EmptyState
        title="Open Loans to post a payment"
        description="Choose a loan record, then use the payment action in the table to open the posting modal."
      />
    </div>
  )
}
