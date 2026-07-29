'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button, CardWrapper, Checkbox, ErrorBanner, ErrorState, Input, LoadingState, PageContainer, SearchableSelect, Switch, useToast } from '@/components/shared'
import { CheckIcon, CopyIcon } from '@/components/shared/table-icons'
import { settingsCurrencyValues, type Settings, type SettingsCurrency } from '@/lib/types/shared'
import { getSettings, updateSettings } from '@/services'

interface SettingsFormState {
  defaultCurrency: SettingsCurrency
  startingCapital: string
  defaultPenaltyRate: string
  publicLoanRequestSlug: string
  ownerLoanMobileNumber: string
  excludeOwnerLoanInterestFromProfit: boolean
  includeLoanPaymentsInTreasuryByDefault: boolean
}

type SettingsFormErrors = Partial<Record<keyof SettingsFormState, string>>

function buildFormState(settings: Settings): SettingsFormState {
  return {
    defaultCurrency: settings.defaultCurrency,
    startingCapital: settings.startingCapital.toString(),
    defaultPenaltyRate: ((settings.defaultPenaltyRateBps ?? 0) / 100).toString(),
    publicLoanRequestSlug: settings.publicLoanRequestSlug ?? '',
    ownerLoanMobileNumber: settings.ownerLoanMobileNumber ?? '+63',
    excludeOwnerLoanInterestFromProfit: settings.excludeOwnerLoanInterestFromProfit ?? false,
    includeLoanPaymentsInTreasuryByDefault: settings.includeLoanPaymentsInTreasuryByDefault ?? true,
  }
}

function parseStartingCapital(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return { error: 'Starting capital is required.' }
  }

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed)) {
    return { error: 'Enter a valid amount for starting capital.' }
  }

  if (parsed < 0) {
    return { error: 'Starting capital cannot be negative.' }
  }

  return { value: parsed }
}

function parseDefaultPenaltyRate(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return { value: 0 }
  }

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed)) {
    return { error: 'Enter a valid default penalty percentage.' }
  }

  if (parsed < 0) {
    return { error: 'Default penalty percentage cannot be negative.' }
  }

  return { value: Math.round(parsed * 100) }
}

function validateForm(form: SettingsFormState): SettingsFormErrors {
  const nextErrors: SettingsFormErrors = {}
  const startingCapitalResult = parseStartingCapital(form.startingCapital)
  const defaultPenaltyRateResult = parseDefaultPenaltyRate(form.defaultPenaltyRate)
  const slug = form.publicLoanRequestSlug.trim()

  if (startingCapitalResult.error) {
    nextErrors.startingCapital = startingCapitalResult.error
  }

  if (defaultPenaltyRateResult.error) {
    nextErrors.defaultPenaltyRate = defaultPenaltyRateResult.error
  }

  if (!settingsCurrencyValues.includes(form.defaultCurrency)) {
    nextErrors.defaultCurrency = 'Choose a supported workspace currency.'
  }

  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    nextErrors.publicLoanRequestSlug = 'Use lowercase letters, numbers, and single hyphens.'
  }

  return nextErrors
}

export function WorkspaceSettingsForm() {
  const { dismiss, loading: showLoading, update } = useToast()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState<SettingsFormState | null>(null)
  const [errors, setErrors] = useState<SettingsFormErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [origin, setOrigin] = useState('')
  const [requestUrlCopyStatus, setRequestUrlCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [requestUrlCopyTarget, setRequestUrlCopyTarget] = useState<'invitation' | 'application' | null>(null)
  const currencyOptions = settingsCurrencyValues.map((currency) => ({
    label: currency,
    value: currency,
  }))

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setLoadError('')

      try {
        const nextSettings = await getSettings()

        if (cancelled) {
          return
        }

        setSettings(nextSettings)
        setForm(buildFormState(nextSettings))
        setErrors({})
      } catch (caughtError) {
        if (cancelled) {
          return
        }

        setLoadError(caughtError instanceof Error ? caughtError.message : 'Unable to load workspace settings.')
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
  }, [reloadToken])

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (requestUrlCopyStatus === 'idle') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRequestUrlCopyStatus('idle')
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [requestUrlCopyStatus])

  const requestSlug = form?.publicLoanRequestSlug.trim() ?? ''
  const invitationRequestPath = requestSlug
    ? `/join/${requestSlug}`
    : ''
  const loanApplicationRequestPath = requestSlug
    ? `/request-loan/${requestSlug}`
    : ''
  const invitationRequestUrl = invitationRequestPath && origin
    ? `${origin}${invitationRequestPath}`
    : invitationRequestPath
  const loanApplicationRequestUrl = loanApplicationRequestPath && origin
    ? `${origin}${loanApplicationRequestPath}`
    : loanApplicationRequestPath

  useEffect(() => {
    setRequestUrlCopyStatus('idle')
    setRequestUrlCopyTarget(null)
  }, [invitationRequestUrl, loanApplicationRequestUrl])

  const getRequestUrlCopyLabel = (target: 'invitation' | 'application') => {
    if (requestUrlCopyTarget !== target) {
      return target === 'invitation' ? 'Copy invitation URL' : 'Copy loan application URL'
    }

    return requestUrlCopyStatus === 'success'
      ? 'Copied'
      : requestUrlCopyStatus === 'error'
        ? 'Copy failed'
        : target === 'invitation'
          ? 'Copy invitation URL'
          : 'Copy loan application URL'
  }

  const requestUrlCopyAnnouncement = requestUrlCopyStatus === 'success'
    ? `${requestUrlCopyTarget === 'application' ? 'Loan Application URL' : 'Invitation URL'} copied to clipboard.`
    : requestUrlCopyStatus === 'error'
      ? `Unable to copy ${requestUrlCopyTarget === 'application' ? 'Loan Application URL' : 'Invitation URL'}.`
      : ''

  const handleCopyRequestUrl = async (target: 'invitation' | 'application') => {
    const nextPath = target === 'invitation' ? invitationRequestPath : loanApplicationRequestPath
    if (!nextPath) {
      return
    }

    setRequestUrlCopyTarget(target)

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${nextPath}`)
      setRequestUrlCopyStatus('success')
    } catch {
      setRequestUrlCopyStatus('error')
    }
  }

  const requestUrlCards = requestSlug
    ? [
      {
        target: 'invitation' as const,
        title: 'Invitation URL',
        value: invitationRequestUrl,
      },
      {
        target: 'application' as const,
        title: 'Loan Application URL',
        value: loanApplicationRequestUrl,
      },
    ]
    : []

  const updateField = <Field extends keyof SettingsFormState>(field: Field, value: SettingsFormState[Field]) => {
    setForm((current) => (current ? { ...current, [field]: value } : current))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  if (loading) {
    return (
      <PageContainer className="stack">
        <LoadingState
          title="Loading settings"
          description="Fetching your workspace preferences and current capital baseline."
        />
      </PageContainer>
    )
  }

  if (loadError || !form || !settings) {
    return (
      <PageContainer className="stack">
        <ErrorState
          title="Unable to load settings"
          description={loadError || 'The settings record is not available right now.'}
          action={<Button onClick={() => setReloadToken((current) => current + 1)}>Try again</Button>}
        />
      </PageContainer>
    )
  }

  const parsedStartingCapital = parseStartingCapital(form.startingCapital)
  const parsedDefaultPenaltyRate = parseDefaultPenaltyRate(form.defaultPenaltyRate)
  const initialForm = buildFormState(settings)
  const hasChanges =
    form.defaultCurrency !== initialForm.defaultCurrency
    || form.startingCapital !== initialForm.startingCapital
    || form.defaultPenaltyRate !== initialForm.defaultPenaltyRate
    || form.publicLoanRequestSlug !== initialForm.publicLoanRequestSlug
    || form.ownerLoanMobileNumber !== initialForm.ownerLoanMobileNumber
    || form.excludeOwnerLoanInterestFromProfit !== initialForm.excludeOwnerLoanInterestFromProfit
    || form.includeLoanPaymentsInTreasuryByDefault !== initialForm.includeLoanPaymentsInTreasuryByDefault

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    setSubmitError('')
    const toastId = showLoading('Saving workspace settings...')
    const ownerLoanMobileNumber = form.ownerLoanMobileNumber.trim()

    try {
      const nextSettings = await updateSettings({
        defaultCurrency: form.defaultCurrency,
        startingCapital: parsedStartingCapital.value ?? settings.startingCapital,
        defaultPenaltyRateBps: parsedDefaultPenaltyRate.value ?? settings.defaultPenaltyRateBps,
        publicLoanRequestSlug: form.publicLoanRequestSlug.trim() || null,
        ownerLoanMobileNumber: ownerLoanMobileNumber && ownerLoanMobileNumber !== '+63' ? ownerLoanMobileNumber : null,
        excludeOwnerLoanInterestFromProfit: form.excludeOwnerLoanInterestFromProfit,
        includeLoanPaymentsInTreasuryByDefault: form.includeLoanPaymentsInTreasuryByDefault,
      })

      setSettings(nextSettings)
      setForm(buildFormState(nextSettings))
      setErrors({})
      update(toastId, 'Workspace settings saved.', { tone: 'success', title: 'Success' })
    } catch (caughtError) {
      dismiss(toastId)
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to save workspace settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="stack">
      <form className="stack" onSubmit={handleSubmit} noValidate>
        {submitError ? (
          <ErrorBanner title="Settings were not saved" message={submitError} />
        ) : null}

        <div className="grid two">
          <CardWrapper title="Capital baseline">
            <div className="stack">
              <SearchableSelect
                id="workspace-default-currency"
                label="Default currency"
                options={currencyOptions}
                value={form.defaultCurrency}
                error={errors.defaultCurrency}
                hint="Used to format dashboard totals and lending amounts by default."
                onChange={(nextValue) => updateField('defaultCurrency', nextValue as SettingsCurrency)}
              />

              <Input
                id="workspace-starting-capital"
                label="Starting capital"
                type="number"
                min="0"
                step="0.01"
                value={form.startingCapital}
                error={errors.startingCapital}
                hint="This is the original capital pool before any collected interest is added back."
                inputClassName="input-no-spinner"
                onChange={(event) => updateField('startingCapital', event.target.value)}
                required
              />

              <Input
                id="workspace-default-penalty-rate"
                label="Default penalty percentage"
                type="number"
                min="0"
                step="0.01"
                value={form.defaultPenaltyRate}
                error={errors.defaultPenaltyRate}
                hint="Used only to prefill manual schedule-row penalties. It never creates penalties automatically."
                inputClassName="input-no-spinner"
                onChange={(event) => updateField('defaultPenaltyRate', event.target.value)}
              />
            </div>
          </CardWrapper>

          <CardWrapper title="Request link">
            <div className="stack">
              <Input
                id="workspace-public-request-slug"
                label="Request slug"
                value={form.publicLoanRequestSlug}
                error={errors.publicLoanRequestSlug}
                hint="Use lowercase letters, numbers, and hyphens. This creates both the borrower invitation URL and public loan application URL."
                onChange={(event) => updateField('publicLoanRequestSlug', event.target.value.trim().toLowerCase())}
              />

              {requestUrlCards.map((requestUrlCard) => {
                const copyLabel = getRequestUrlCopyLabel(requestUrlCard.target)
                const isCurrentTarget = requestUrlCopyTarget === requestUrlCard.target

                return (
                  <div className="data-card" key={requestUrlCard.target}>
                    <div className="request-url-card__header">
                      <div className="subsection-title">{requestUrlCard.title}</div>
                      <button
                        type="button"
                        className={`button-ghost table-action-icon table-copy-button${isCurrentTarget && requestUrlCopyStatus === 'success' ? ' is-success' : ''}${isCurrentTarget && requestUrlCopyStatus === 'error' ? ' is-error' : ''}`}
                        aria-label={copyLabel}
                        title={copyLabel}
                        onClick={() => void handleCopyRequestUrl(requestUrlCard.target)}
                      >
                        {isCurrentTarget && requestUrlCopyStatus === 'success' ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                    <div className="muted request-url-card__value">{requestUrlCard.value}</div>
                  </div>
                )
              })}
              <span className="ui-sr-only" aria-live="polite">{requestUrlCopyAnnouncement}</span>
            </div>
          </CardWrapper>

          <CardWrapper title="Owner Loan Profit Exclusion">
            <div className="stack">
              <Input
                id="workspace-owner-loan-mobile-number"
                label="Owner borrower mobile number"
                value={form.ownerLoanMobileNumber}
                placeholder="+63"
                onChange={(event) => updateField('ownerLoanMobileNumber', event.target.value)}
              />

              <Checkbox
                id="workspace-exclude-owner-loan-interest-from-profit"
                label="Exclude owner loan interest from Profit Outlook"
                description="When enabled, Profit Outlook excludes interest and penalties from loans linked to this mobile number. Capital, active loans, and receivable metrics remain unchanged."
                checked={form.excludeOwnerLoanInterestFromProfit}
                onChange={(event) => updateField('excludeOwnerLoanInterestFromProfit', event.target.checked)}
              />
            </div>
          </CardWrapper>

          <CardWrapper title="Treasury payment defaults">
            <Switch
              id="workspace-include-loan-payments-in-treasury"
              label="Include posted payments in Treasury by default"
              description="When enabled, new payment forms start with Treasury inclusion selected. You can override this for each payment before posting."
              checked={form.includeLoanPaymentsInTreasuryByDefault}
              onChange={(event) => updateField('includeLoanPaymentsInTreasuryByDefault', event.target.checked)}
            />
          </CardWrapper>
        </div>

        <div className="inline-actions">
          <Button type="submit" disabled={saving || !hasChanges}>
            {saving ? 'Saving settings...' : 'Save settings'}
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
