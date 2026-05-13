'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button, CardWrapper, ErrorBanner, ErrorState, Input, LoadingState, PageContainer, SearchableSelect } from '@/components/shared'
import { settingsCurrencyValues, type Settings, type SettingsCurrency } from '@/lib/types'
import { getSettings, updateSettings } from '@/services'

interface SettingsFormState {
  defaultCurrency: SettingsCurrency
  startingCapital: string
  publicLoanRequestSlug: string
}

type SettingsFormErrors = Partial<Record<keyof SettingsFormState, string>>

function buildFormState(settings: Settings): SettingsFormState {
  return {
    defaultCurrency: settings.defaultCurrency,
    startingCapital: settings.startingCapital.toString(),
    publicLoanRequestSlug: settings.publicLoanRequestSlug ?? '',
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

function validateForm(form: SettingsFormState): SettingsFormErrors {
  const nextErrors: SettingsFormErrors = {}
  const startingCapitalResult = parseStartingCapital(form.startingCapital)
  const slug = form.publicLoanRequestSlug.trim()

  if (startingCapitalResult.error) {
    nextErrors.startingCapital = startingCapitalResult.error
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
  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState<SettingsFormState | null>(null)
  const [errors, setErrors] = useState<SettingsFormErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
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

  const updateField = <Field extends keyof SettingsFormState>(field: Field, value: SettingsFormState[Field]) => {
    setForm((current) => (current ? { ...current, [field]: value } : current))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
    setSaveMessage('')
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
  const initialForm = buildFormState(settings)
  const publicRequestPath = form.publicLoanRequestSlug.trim()
    ? `/request-loan/${form.publicLoanRequestSlug.trim()}`
    : ''
  const publicRequestUrl = publicRequestPath && typeof window !== 'undefined'
    ? `${window.location.origin}${publicRequestPath}`
    : publicRequestPath
  const hasChanges =
    form.defaultCurrency !== initialForm.defaultCurrency
    || form.startingCapital !== initialForm.startingCapital
    || form.publicLoanRequestSlug !== initialForm.publicLoanRequestSlug

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    setSubmitError('')
    setSaveMessage('')

    try {
      const nextSettings = await updateSettings({
        defaultCurrency: form.defaultCurrency,
        startingCapital: parsedStartingCapital.value ?? settings.startingCapital,
        publicLoanRequestSlug: form.publicLoanRequestSlug.trim() || null,
      })

      setSettings(nextSettings)
      setForm(buildFormState(nextSettings))
      setErrors({})
      setSaveMessage('Workspace settings saved.')
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to save workspace settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="stack">
      <div className="grid two">
        <CardWrapper title="Capital baseline">
          <form className="stack" onSubmit={handleSubmit} noValidate>
            {submitError ? (
              <ErrorBanner title="Settings were not saved" message={submitError} />
            ) : null}
            {saveMessage ? <div className="notice">{saveMessage}</div> : null}

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
              id="workspace-public-request-slug"
              label="Public request link"
              value={form.publicLoanRequestSlug}
              error={errors.publicLoanRequestSlug}
              hint="Use lowercase letters, numbers, and hyphens. Borrowers apply through this lender-specific link."
              onChange={(event) => updateField('publicLoanRequestSlug', event.target.value.trim().toLowerCase())}
            />

            {publicRequestUrl ? (
              <div className="data-card">
                <div className="subsection-title">Request URL</div>
                <div className="muted">{publicRequestUrl}</div>
              </div>
            ) : null}

            <div className="inline-actions">
              <Button type="submit" disabled={saving || !hasChanges}>
                {saving ? 'Saving settings...' : 'Save settings'}
              </Button>
            </div>
          </form>
        </CardWrapper>

        <CardWrapper title="How the dashboard computes capital">
          <div className="stack">
            <div className="data-card">
              <div className="subsection-title">Current capital</div>
              <div className="muted">Starting capital + collected interest</div>
            </div>

            <div className="data-card">
              <div className="subsection-title">Cash on hand</div>
              <div className="muted">Current capital - principal still with borrowers</div>
            </div>

            <div className="data-card">
              <div className="subsection-title">Money with borrowers</div>
              <div className="muted">Outstanding principal only, excluding projected and uncollected interest</div>
            </div>

            <div className="notice">
              Collected interest increases your current capital. Projected interest stays out of the cash position until it is actually collected.
            </div>
          </div>
        </CardWrapper>
      </div>
    </PageContainer>
  )
}
