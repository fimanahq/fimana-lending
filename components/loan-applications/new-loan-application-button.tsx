'use client'

import { useState } from 'react'
import { Button, Dialog } from '@/components/shared'
import { LoanApplicationForm } from './loan-application-form'

interface NewLoanApplicationButtonProps {
  variant?: 'primary' | 'secondary'
}

export function NewLoanApplicationButton({ variant = 'primary' }: NewLoanApplicationButtonProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        New application
      </Button>
      <Dialog
        id="loan-application-create-dialog"
        title="New loan application"
        description="This creates an application-stage record, not a loan record."
        open={open}
        onClose={() => setOpen(false)}
        dismissDisabled={submitting}
        className="loan-application-edit-dialog"
      >
        <LoanApplicationForm
          mode="create"
          showCard={false}
          onSaved={() => setOpen(false)}
          onSubmittingChange={setSubmitting}
        />
      </Dialog>
    </>
  )
}
