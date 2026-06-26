'use client'

import { CircleDollarSign, PlusCircle, RefreshCw, Save, SquarePen, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Input,
  LoadingState,
  PageContainer,
  TableShell,
  Textarea,
  useToast,
} from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Treasury, TreasuryMovement } from '@/lib/types/shared'
import { createTreasuryPosting, getTreasury, getTreasuryMovements, updateTreasury } from '@/services/treasury'
import styles from './treasury-workspace.module.css'

interface TreasuryFormState {
  name: string
  openingBalance: string
}

interface InterestFormState {
  amount: string
  occurredAt: string
  description: string
}

function buildInitialForm(treasury: Treasury | null): TreasuryFormState {
  return {
    name: treasury?.account?.name ?? 'FiMana Lending Treasury',
    openingBalance: '',
  }
}

function buildInitialInterestForm(): InterestFormState {
  return {
    amount: '',
    occurredAt: toDateInputValue(new Date()),
    description: '',
  }
}

function toDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function parseAmount(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return { error: 'Opening balance is required.' }
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return { error: 'Enter a valid opening balance.' }
  }

  if (parsed < 0) {
    return { error: 'Opening balance cannot be negative.' }
  }

  return { value: Number(parsed.toFixed(2)) }
}

function parsePositiveAmount(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return { error: 'Interest amount is required.' }
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return { error: 'Enter a valid interest amount.' }
  }

  if (parsed <= 0) {
    return { error: 'Interest amount must be greater than zero.' }
  }

  return { value: Number(parsed.toFixed(2)) }
}

function parsePostingDate(value: string) {
  if (!value) {
    return { error: 'Posting date is required.' }
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return { error: 'Enter a valid posting date.' }
  }

  return { value: date.toISOString() }
}

function formatMovementType(movement: TreasuryMovement) {
  if (movement.type === 'lending_disbursement') {
    return 'Loan disbursement'
  }

  if (movement.type === 'lending_payment' && movement.reversalOfTransactionId) {
    return 'Payment reversal'
  }

  if (movement.type === 'lending_payment') {
    return 'Loan payment'
  }

  return 'Interest earned'
}

function formatSignedCurrency(value: number, currency: string) {
  if (value > 0) {
    return `+${formatCurrency(value, currency)}`
  }

  return formatCurrency(value, currency)
}

function getMovementStatus(movement: TreasuryMovement) {
  if (movement.type === 'lending_disbursement') {
    return 'Completed'
  }

  if (movement.type === 'lending_payment' && movement.reversalOfTransactionId) {
    return 'Reversed'
  }

  if (movement.type === 'lending_payment') {
    return 'Settled'
  }

  return 'Posted'
}

export function TreasuryWorkspace() {
  const { dismiss, loading: showLoading, update } = useToast()
  const [treasury, setTreasury] = useState<Treasury | null>(null)
  const [movements, setMovements] = useState<TreasuryMovement[]>([])
  const [form, setForm] = useState<TreasuryFormState>(() => buildInitialForm(null))
  const [interestForm, setInterestForm] = useState<InterestFormState>(() => buildInitialInterestForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)
  const [editAccountOpen, setEditAccountOpen] = useState(false)
  const [postInterestOpen, setPostInterestOpen] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [postingError, setPostingError] = useState('')
  const [nameError, setNameError] = useState('')
  const [openingBalanceError, setOpeningBalanceError] = useState('')
  const [interestAmountError, setInterestAmountError] = useState('')
  const [interestDateError, setInterestDateError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const loadTreasuryData = useCallback(async () => {
    const nextTreasury = await getTreasury()
    const nextMovements = nextTreasury.isConfigured && nextTreasury.account
      ? await getTreasuryMovements()
      : []

    setTreasury(nextTreasury)
    setMovements(nextMovements)
    setForm(buildInitialForm(nextTreasury))
    setNameError('')
    setOpeningBalanceError('')
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setLoadError('')

      try {
        await loadTreasuryData()
      } catch (caughtError) {
        if (!cancelled) {
          setLoadError(caughtError instanceof Error ? caughtError.message : 'Unable to load Treasury.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [loadTreasuryData, reloadToken])

  const updateField = (field: keyof TreasuryFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setSubmitError('')
    if (field === 'name') {
      setNameError('')
    }
    if (field === 'openingBalance') {
      setOpeningBalanceError('')
    }
  }

  const updateInterestField = (field: keyof InterestFormState, value: string) => {
    setInterestForm((current) => ({ ...current, [field]: value }))
    setPostingError('')
    if (field === 'amount') {
      setInterestAmountError('')
    }
    if (field === 'occurredAt') {
      setInterestDateError('')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = form.name.trim()
    if (!name) {
      setNameError('Treasury name is required.')
      return
    }

    const isConfigured = treasury?.isConfigured && treasury.account
    const parsedOpeningBalance = isConfigured ? null : parseAmount(form.openingBalance)
    if (parsedOpeningBalance?.error) {
      setOpeningBalanceError(parsedOpeningBalance.error)
      return
    }

    setSaving(true)
    setSubmitError('')
    const toastId = showLoading(isConfigured ? 'Saving Treasury...' : 'Creating Treasury...')

    try {
      const nextTreasury = await updateTreasury({
        name,
        openingBalance: isConfigured ? undefined : parsedOpeningBalance?.value,
      })
      setTreasury(nextTreasury)
      setForm(buildInitialForm(nextTreasury))
      if (isConfigured) {
        setEditAccountOpen(false)
      }
      update(toastId, isConfigured ? 'Treasury updated.' : 'Treasury created.', { tone: 'success', title: 'Success' })
    } catch (caughtError) {
      dismiss(toastId)
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to save Treasury.')
    } finally {
      setSaving(false)
    }
  }

  const handlePostInterest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedAmount = parsePositiveAmount(interestForm.amount)
    if (parsedAmount.error) {
      setInterestAmountError(parsedAmount.error)
      return
    }

    const parsedDate = parsePostingDate(interestForm.occurredAt)
    if (parsedDate.error) {
      setInterestDateError(parsedDate.error)
      return
    }

    setPosting(true)
    setPostingError('')
    const toastId = showLoading('Posting interest...')

    try {
      await createTreasuryPosting({
        kind: 'interest_earned',
        amount: parsedAmount.value!,
        occurredAt: parsedDate.value!,
        description: interestForm.description.trim() || undefined,
      })
      await loadTreasuryData()
      setInterestForm(buildInitialInterestForm())
      setPostInterestOpen(false)
      update(toastId, 'Interest posted.', { tone: 'success', title: 'Success' })
    } catch (caughtError) {
      dismiss(toastId)
      setPostingError(caughtError instanceof Error ? caughtError.message : 'Unable to post interest.')
    } finally {
      setPosting(false)
    }
  }

  const openPostInterest = () => {
    setInterestForm(buildInitialInterestForm())
    setPostingError('')
    setInterestAmountError('')
    setInterestDateError('')
    setPostInterestOpen(true)
  }

  const openEditAccount = () => {
    setForm(buildInitialForm(treasury))
    setSubmitError('')
    setNameError('')
    setEditAccountOpen(true)
  }

  const closeEditAccount = () => {
    if (saving) {
      return
    }

    setEditAccountOpen(false)
  }

  const closePostInterest = () => {
    if (posting) {
      return
    }

    setPostInterestOpen(false)
  }

  if (loading) {
    return (
      <PageContainer className="stack">
        <LoadingState title="Loading Treasury" description="Fetching the lending fund account." />
      </PageContainer>
    )
  }

  if (loadError) {
    return (
      <PageContainer className="stack">
        <ErrorState
          title="Unable to load Treasury"
          description={loadError}
          action={(
            <Button
              className={styles.iconButton}
              onClick={() => setReloadToken((current) => current + 1)}
              aria-label="Try again"
              title="Try again"
            >
              <RefreshCw aria-hidden="true" size={16} />
            </Button>
          )}
        />
      </PageContainer>
    )
  }

  const isConfigured = Boolean(treasury?.isConfigured && treasury.account)
  const account = treasury?.account ?? null
  const hasNameChange = isConfigured && account ? form.name.trim() !== account.name : true

  return (
    <PageContainer className="stack">
      {isConfigured && account ? (
        <section className={styles.bankTile} aria-label="Treasury fund account">
          <div className={styles.bankTileContent}>
            <div>
              <span className={styles.balanceLabel}>Available balance</span>
              <strong className={styles.balanceValue}>{formatCurrency(account.balance, account.currency)}</strong>
            </div>

            <dl className={styles.bankMetaGrid}>
              <div>
                <dt>Reference ID</dt>
                <dd>**** {account.id.slice(-4).toUpperCase()}</dd>
              </div>
              <div>
                <dt>Account type</dt>
                <dd>{account.type}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{account.currency}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.bankActions}>
            <Button
              className={`${styles.bankButtonSecondary} ${styles.iconButton}`}
              onClick={openEditAccount}
              aria-label="Edit account"
              title="Edit account"
            >
              <SquarePen aria-hidden="true" size={16} />
            </Button>
            <Button
              className={`${styles.bankButtonPrimary} ${styles.iconButton}`}
              onClick={openPostInterest}
              aria-label="Post interest"
              title="Post interest"
            >
              <CircleDollarSign aria-hidden="true" size={16} />
            </Button>
          </div>

          <div className={styles.bankDecoration} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      ) : (
        <Card
          title="Set up fund account"
          description="Create the internal bank account used for lending cash movement."
        >
            {submitError ? <ErrorBanner title="Unable to save Treasury" message={submitError} /> : null}

            <div className="notice">
              Treasury is not configured. Loan approvals and payments require a Treasury account.
            </div>

            <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid two">
                <Input
                  id="treasury-name"
                  label="Treasury name"
                  value={form.name}
                  error={nameError}
                  onChange={(event) => updateField('name', event.target.value)}
                />
                <Input
                  id="treasury-opening-balance"
                  label="Opening balance"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.openingBalance}
                  error={openingBalanceError}
                  onChange={(event) => updateField('openingBalance', event.target.value)}
                />
              </div>

              <div className={`ui-card__actions ${styles.formActions}`}>
                <Button
                  type="submit"
                  className={styles.iconButton}
                  disabled={saving}
                  aria-label="Create Treasury"
                  title="Create Treasury"
                >
                  <PlusCircle aria-hidden="true" size={16} />
                </Button>
              </div>
            </form>
        </Card>
      )}

      {isConfigured && account ? (
        <>
          {movements.length === 0 ? (
            <EmptyState
              title="No Treasury movements yet"
              description="Disbursements, payments, reversals, and earned interest will appear here."
            />
          ) : (
            <TableShell label="Treasury transaction ledger" title="Transaction Ledger">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th className={styles.amountColumn}>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDate(movement.occurredAt)}</td>
                      <td>
                        <div className={styles.movementDescription}>
                          {movement.description || formatMovementType(movement)}
                        </div>
                        {movement.reversalOfTransactionId ? (
                          <div className="muted micro-copy">Reversal movement</div>
                        ) : null}
                      </td>
                      <td>
                        <Badge tone={movement.direction === 'in' ? 'success' : 'warning'}>
                          {formatMovementType(movement)}
                        </Badge>
                      </td>
                      <td
                        className={
                          movement.direction === 'in'
                            ? styles.positiveAmount
                            : styles.negativeAmount
                        }
                      >
                        {formatSignedCurrency(movement.signedAmount, account.currency)}
                      </td>
                      <td>
                        <span className={styles.statusText}>{getMovementStatus(movement)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          )}

          <Dialog
            id="treasury-edit-account-dialog"
            open={editAccountOpen}
            title="Edit account"
            description="Update the Treasury account name shown on this fund tile."
            onClose={closeEditAccount}
          >
            <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
              {submitError ? <ErrorBanner title="Unable to save Treasury" message={submitError} /> : null}

              <Input
                id="treasury-edit-name"
                label="Account name"
                value={form.name}
                error={nameError}
                onChange={(event) => updateField('name', event.target.value)}
              />

              <div className={`ui-card__actions ${styles.modalActions}`}>
                <Button
                  type="button"
                  variant="secondary"
                  className={styles.iconButton}
                  disabled={saving}
                  onClick={closeEditAccount}
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <X aria-hidden="true" size={16} />
                </Button>
                <Button
                  type="submit"
                  className={styles.iconButton}
                  disabled={saving || !hasNameChange}
                  aria-label="Save account"
                  title="Save account"
                >
                  <Save aria-hidden="true" size={16} />
                </Button>
              </div>
            </form>
          </Dialog>

          <Dialog
            id="treasury-post-interest-dialog"
            open={postInterestOpen}
            title="Post interest"
            description="Record earned interest from the real digital bank account."
            onClose={closePostInterest}
          >
            <form className="stack" onSubmit={(event) => void handlePostInterest(event)}>
              {postingError ? <ErrorBanner title="Unable to post interest" message={postingError} /> : null}

              <div className="grid two">
                <Input
                  id="treasury-interest-amount"
                  label="Interest amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={interestForm.amount}
                  error={interestAmountError}
                  onChange={(event) => updateInterestField('amount', event.target.value)}
                />
                <Input
                  id="treasury-interest-date"
                  label="Posting date"
                  type="date"
                  value={interestForm.occurredAt}
                  error={interestDateError}
                  onChange={(event) => updateInterestField('occurredAt', event.target.value)}
                />
              </div>

              <Textarea
                id="treasury-interest-description"
                label="Description"
                rows={3}
                value={interestForm.description}
                onChange={(event) => updateInterestField('description', event.target.value)}
              />

              <div className={`ui-card__actions ${styles.modalActions}`}>
                <Button
                  type="button"
                  variant="secondary"
                  className={styles.iconButton}
                  disabled={posting}
                  onClick={closePostInterest}
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <X aria-hidden="true" size={16} />
                </Button>
                <Button
                  type="submit"
                  className={styles.iconButton}
                  disabled={posting}
                  aria-label="Post interest"
                  title="Post interest"
                >
                  <CircleDollarSign aria-hidden="true" size={16} />
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      ) : null}
    </PageContainer>
  )
}
