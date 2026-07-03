'use client'

import { HandCoins, ListChecks, PlusCircle, RefreshCw, RotateCcw, Save, Scale, SquarePen, X } from 'lucide-react'
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
  Pagination,
  ProtectedLink,
  SearchableSelect,
  TableShell,
  Textarea,
  useToast,
} from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Treasury, TreasuryMovement } from '@/lib/types/shared'
import {
  createTreasuryAdjustment,
  createTreasuryPosting,
  getTreasury,
  getTreasuryMovements,
  reverseTreasuryInterest,
  updateTreasury,
} from '@/services/treasury'
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

interface AdjustmentFormState {
  direction: 'credit' | 'debit'
  amount: string
  occurredAt: string
  reason: string
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

function buildInitialAdjustmentForm(): AdjustmentFormState {
  return { direction: 'credit', amount: '', occurredAt: toDateInputValue(new Date()), reason: '' }
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

function parsePositiveAmount(value: string, label = 'Interest amount') {
  const trimmed = value.trim()
  if (!trimmed) {
    return { error: `${label} is required.` }
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return { error: `Enter a valid ${label.toLowerCase()}.` }
  }

  if (parsed <= 0) {
    return { error: `${label} must be greater than zero.` }
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
  if (movement.type === 'treasury_profit_reclassification') {
    return movement.reversalOfTransactionId
      ? 'Excess profit reversal'
      : 'Excess profit reclassification'
  }
  if (movement.type === 'lending_disbursement') {
    return 'Loan disbursement'
  }

  if (movement.type === 'lending_payment' && movement.reversalOfTransactionId) {
    return 'Payment reversal'
  }

  if (movement.type === 'lending_payment') {
    return 'Loan payment'
  }

  if (movement.type === 'treasury_adjustment') {
    return movement.adjustmentDirection === 'debit' ? 'Reconciliation debit' : 'Reconciliation credit'
  }

  if (movement.type === 'treasury_interest_earned' && movement.reversalOfTransactionId) {
    return 'Interest reversal'
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
  if (movement.type === 'treasury_profit_reclassification') {
    if (movement.reversalOfTransactionId) return 'Reversal posted'
    if (movement.reversedByTransactionId) return 'Reversed'
    return 'Reclassified'
  }
  if (movement.type === 'lending_disbursement') {
    return 'Completed'
  }

  if (movement.type === 'lending_payment' && movement.reversalOfTransactionId) {
    return 'Reversed'
  }

  if (movement.type === 'lending_payment') {
    return 'Settled'
  }

  if (movement.type === 'treasury_interest_earned' && movement.reversalOfTransactionId) {
    return 'Reversal posted'
  }

  if (movement.type === 'treasury_interest_earned' && movement.reversedByTransactionId) {
    return 'Reversed'
  }

  return 'Posted'
}

function canReverseInterest(movement: TreasuryMovement) {
  return movement.type === 'treasury_interest_earned'
    && !movement.reversalOfTransactionId
    && !movement.reversedByTransactionId
}

export function TreasuryWorkspace() {
  const { dismiss, loading: showLoading, update } = useToast()
  const [treasury, setTreasury] = useState<Treasury | null>(null)
  const [movements, setMovements] = useState<TreasuryMovement[]>([])
  const [movementPage, setMovementPage] = useState(1)
  const [movementTotal, setMovementTotal] = useState(0)
  const [movementTotalPages, setMovementTotalPages] = useState(0)
  const [form, setForm] = useState<TreasuryFormState>(() => buildInitialForm(null))
  const [interestForm, setInterestForm] = useState<InterestFormState>(() => buildInitialInterestForm())
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>(() => buildInitialAdjustmentForm())
  const [selectedInterest, setSelectedInterest] = useState<TreasuryMovement | null>(null)
  const [reversalReason, setReversalReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [reversing, setReversing] = useState(false)
  const [editAccountOpen, setEditAccountOpen] = useState(false)
  const [postInterestOpen, setPostInterestOpen] = useState(false)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [postingError, setPostingError] = useState('')
  const [adjustmentError, setAdjustmentError] = useState('')
  const [reversalError, setReversalError] = useState('')
  const [nameError, setNameError] = useState('')
  const [openingBalanceError, setOpeningBalanceError] = useState('')
  const [interestAmountError, setInterestAmountError] = useState('')
  const [interestDateError, setInterestDateError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const loadTreasuryData = useCallback(async () => {
    const nextTreasury = await getTreasury()
    const movementResult = nextTreasury.isConfigured && nextTreasury.account
      ? await getTreasuryMovements(movementPage)
      : { items: [], total: 0, totalPages: 0 }

    setTreasury(nextTreasury)
    setMovements(movementResult.items)
    setMovementTotal(movementResult.total)
    setMovementTotalPages(movementResult.totalPages)
    setForm(buildInitialForm(nextTreasury))
    setNameError('')
    setOpeningBalanceError('')
  }, [movementPage])

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

  const handleAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAmount = parsePositiveAmount(adjustmentForm.amount, 'Adjustment amount')
    const parsedDate = parsePostingDate(adjustmentForm.occurredAt)
    if (parsedAmount.error || parsedDate.error || !adjustmentForm.reason.trim()) {
      setAdjustmentError(parsedAmount.error || parsedDate.error || 'Adjustment reason is required.')
      return
    }
    setAdjusting(true)
    setAdjustmentError('')
    const toastId = showLoading('Posting reconciliation adjustment...')
    try {
      await createTreasuryAdjustment({
        direction: adjustmentForm.direction,
        amount: parsedAmount.value!,
        occurredAt: parsedDate.value!,
        reason: adjustmentForm.reason.trim(),
      })
      await loadTreasuryData()
      setAdjustmentForm(buildInitialAdjustmentForm())
      setAdjustmentOpen(false)
      update(toastId, 'Reconciliation adjustment posted.', { tone: 'success', title: 'Success' })
    } catch (caughtError) {
      dismiss(toastId)
      setAdjustmentError(caughtError instanceof Error ? caughtError.message : 'Unable to post adjustment.')
    } finally {
      setAdjusting(false)
    }
  }

  const openAdjustment = () => {
    setAdjustmentForm(buildInitialAdjustmentForm())
    setAdjustmentError('')
    setAdjustmentOpen(true)
  }

  const closeAdjustment = () => {
    if (!adjusting) setAdjustmentOpen(false)
  }

  const openInterestReversal = (movement: TreasuryMovement) => {
    setSelectedInterest(movement)
    setReversalReason('')
    setReversalError('')
  }

  const closeInterestReversal = () => {
    if (!reversing) {
      setSelectedInterest(null)
      setReversalReason('')
      setReversalError('')
    }
  }

  const handleInterestReversal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedInterest) return
    const reason = reversalReason.trim()
    if (!reason) {
      setReversalError('Reversal reason is required.')
      return
    }

    setReversing(true)
    setReversalError('')
    const toastId = showLoading('Reversing Treasury interest...')
    try {
      await reverseTreasuryInterest(selectedInterest.id, reason)
      await loadTreasuryData()
      setSelectedInterest(null)
      setReversalReason('')
      update(toastId, 'Treasury interest reversed.', { tone: 'success', title: 'Success' })
    } catch (caughtError) {
      dismiss(toastId)
      setReversalError(caughtError instanceof Error ? caughtError.message : 'Unable to reverse Treasury interest.')
    } finally {
      setReversing(false)
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
              className={`${styles.bankActionButton} ${styles.bankActionEdit} ${styles.iconButton}`}
              onClick={openEditAccount}
              aria-label="Edit account"
              title="Edit account"
            >
              <SquarePen aria-hidden="true" size={16} />
            </Button>
            <Button
              className={`${styles.bankActionButton} ${styles.bankActionInterest} ${styles.iconButton}`}
              onClick={openPostInterest}
              aria-label="Post interest"
              title="Post interest"
            >
              <HandCoins aria-hidden="true" size={16} />
            </Button>
            <Button
              className={`${styles.bankActionButton} ${styles.bankActionAdjustment} ${styles.iconButton}`}
              onClick={openAdjustment}
              aria-label="Reconciliation adjustment"
              title="Reconciliation adjustment"
            >
              <Scale aria-hidden="true" size={16} />
            </Button>
            <ProtectedLink
              href="/treasury/historical-excess"
              className={`button-secondary ui-button ${styles.bankActionButton} ${styles.bankActionReview} ${styles.iconLink}`}
              aria-label="Historical excess review"
              title="Historical excess review"
            >
              <ListChecks aria-hidden="true" size={16} />
            </ProtectedLink>
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
                    <th>Action</th>
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
                        <Badge tone={movement.direction === 'neutral' ? 'neutral' : movement.direction === 'in' ? 'success' : 'warning'}>
                          {formatMovementType(movement)}
                        </Badge>
                      </td>
                      <td
                        className={
                          movement.direction === 'neutral'
                            ? styles.neutralAmount
                            : movement.direction === 'in' ? styles.positiveAmount : styles.negativeAmount
                        }
                      >
                        {movement.direction === 'neutral'
                          ? formatCurrency(movement.amount, account.currency)
                          : formatSignedCurrency(movement.signedAmount, account.currency)}
                      </td>
                      <td>
                        <span className={styles.statusText}>{getMovementStatus(movement)}</span>
                      </td>
                      <td>
                        {canReverseInterest(movement) ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openInterestReversal(movement)}
                            aria-label={`Reverse ${movement.description || 'interest posting'}`}
                            title="Reverse interest posting"
                          >
                            <RotateCcw aria-hidden="true" size={15} />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          )}

          {movementTotal > 0 ? (
            <Pagination
              page={movementPage}
              totalPages={movementTotalPages}
              totalItems={movementTotal}
              itemLabel="movements"
              loading={loading}
              onPageChange={setMovementPage}
            />
          ) : null}

          <Dialog
            id="treasury-interest-reversal-dialog"
            open={Boolean(selectedInterest)}
            title="Reverse interest posting?"
            description="This debits Treasury and removes the selected amount from recognized interest profit."
            onClose={closeInterestReversal}
          >
            <form className="stack" onSubmit={(event) => void handleInterestReversal(event)}>
              {reversalError ? <ErrorBanner title="Interest reversal failed" message={reversalError} /> : null}
              {selectedInterest ? (
                <div className="notice danger">
                  {formatCurrency(selectedInterest.amount, account.currency)} will be reversed with a linked audit entry.
                </div>
              ) : null}
              <Textarea
                id="treasury-interest-reversal-reason"
                label="Required reason"
                rows={3}
                value={reversalReason}
                onChange={(event) => setReversalReason(event.target.value)}
              />
              <div className={`ui-card__actions ${styles.modalActions}`}>
                <Button type="button" variant="secondary" disabled={reversing} onClick={closeInterestReversal}>Cancel</Button>
                <Button type="submit" disabled={reversing}>{reversing ? 'Reversing…' : 'Reverse interest'}</Button>
              </div>
            </form>
          </Dialog>

          <Dialog
            id="treasury-reconciliation-adjustment-dialog"
            open={adjustmentOpen}
            title="Reconciliation adjustment"
            description="Post an audited correction after verifying the real Treasury balance."
            onClose={closeAdjustment}
          >
            <form className="stack" onSubmit={(event) => void handleAdjustment(event)}>
              {adjustmentError ? <ErrorBanner title="Reconciliation action failed" message={adjustmentError} /> : null}
              <div className="grid two">
                <SearchableSelect
                  id="treasury-adjustment-direction"
                  label="Direction"
                  options={[{ value: 'credit', label: 'Credit Treasury' }, { value: 'debit', label: 'Debit Treasury' }]}
                  value={adjustmentForm.direction}
                  onChange={(value) => setAdjustmentForm((current) => ({ ...current, direction: value as 'credit' | 'debit' }))}
                />
                <Input
                  id="treasury-adjustment-amount"
                  label="Amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={adjustmentForm.amount}
                  onChange={(event) => setAdjustmentForm((current) => ({ ...current, amount: event.target.value }))}
                />
                <Input
                  id="treasury-adjustment-date"
                  label="Posting date"
                  type="date"
                  value={adjustmentForm.occurredAt}
                  onChange={(event) => setAdjustmentForm((current) => ({ ...current, occurredAt: event.target.value }))}
                />
              </div>
              <Textarea
                id="treasury-adjustment-reason"
                label="Required reason"
                rows={3}
                value={adjustmentForm.reason}
                onChange={(event) => setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))}
              />
              <div className={`ui-card__actions ${styles.modalActions}`}>
                <Button type="button" variant="secondary" disabled={adjusting} onClick={closeAdjustment}>Cancel</Button>
                <Button type="submit" disabled={adjusting}>{adjusting ? 'Posting…' : 'Post adjustment'}</Button>
              </div>
            </form>
          </Dialog>

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

              <div className={styles.postInterestIntro}>
                <div className={styles.postInterestBadge} aria-hidden="true">
                  <HandCoins size={18} />
                </div>
                <div className={styles.postInterestCopy}>
                  <strong>Direct Treasury credit</strong>
                  <p>Use this when the bank account has already earned interest and Treasury needs the matching ledger entry.</p>
                </div>
              </div>

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
                  className={styles.postInterestAction}
                  disabled={posting}
                  onClick={closePostInterest}
                  title="Cancel"
                >
                  <X aria-hidden="true" size={16} />
                  <span>Cancel</span>
                </Button>
                <Button
                  type="submit"
                  className={`${styles.postInterestAction} ${styles.postInterestActionPrimary}`}
                  disabled={posting}
                  title="Post interest"
                >
                  <HandCoins aria-hidden="true" size={16} />
                  <span>{posting ? 'Posting…' : 'Save interest'}</span>
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      ) : null}
    </PageContainer>
  )
}
