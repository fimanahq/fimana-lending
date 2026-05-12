'use client'

import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { useEffect, useMemo, useState } from 'react'
import { classNames } from '@/utils/class-names'
import formStyles from './forms.module.css'
import styles from './searchable-select.module.css'

export interface SearchableSelectOption {
  label: string
  value: string
}

export interface SearchableSelectProps {
  className?: string
  disabled?: boolean
  emptyMessage?: string
  error?: string
  hint?: string
  id: string
  label: string
  loading?: boolean
  onAction?: () => void
  onChange: (value: string) => void
  onQueryChange?: (query: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchable?: boolean
  value: string
  actionLabel?: string
}

function getDescribedBy(id: string, hint?: string, error?: string) {
  return [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(' ') || undefined
}

function FieldMessages({ error, hint, id }: { error?: string; hint?: string; id: string }) {
  return (
    <>
      {hint ? <p id={`${id}-hint`} className={formStyles.fieldHint}>{hint}</p> : null}
      {error ? <p id={`${id}-error`} className={formStyles.fieldError}>{error}</p> : null}
    </>
  )
}

export function SearchableSelect({
  actionLabel,
  className,
  disabled = false,
  emptyMessage = 'No matching options',
  error,
  hint,
  id,
  label,
  loading = false,
  onAction,
  onChange,
  onQueryChange,
  options,
  placeholder = 'Select an option',
  searchable = true,
  value,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const isAsync = searchable && typeof onQueryChange === 'function'
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )
  const filteredOptions = useMemo(() => {
    if (isAsync) {
      return options
    }

    const normalizedQuery = searchable ? query.trim().toLowerCase() : ''
    if (!normalizedQuery) {
      return options
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
  }, [isAsync, options, query, searchable])
  const shouldShowAction = Boolean(actionLabel && onAction)
  const describedBy = getDescribedBy(id, hint, error)

  useEffect(() => {
    if (!searchable || !onQueryChange) {
      return
    }

    onQueryChange(query)
  }, [onQueryChange, query, searchable])

  return (
    <div className={classNames('field', className)}>
      <label htmlFor={id}>{label}</label>
      <Combobox
        value={selectedOption}
        disabled={disabled}
        onClose={() => setQuery('')}
        onChange={(nextOption: SearchableSelectOption | null) => {
          onChange(nextOption?.value ?? '')
          setQuery('')
        }}
      >
        <div className={styles.root}>
          <ComboboxInput
            id={id}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={styles.input}
            displayValue={(option: SearchableSelectOption | null) => option?.label ?? ''}
            readOnly={!searchable}
            onChange={(event) => {
              if (searchable) {
                setQuery(event.target.value)
              }
            }}
            placeholder={placeholder}
          />
          <ComboboxButton className={styles.button} aria-label={`Toggle ${label}`}>
            <span aria-hidden="true">▾</span>
          </ComboboxButton>
          <ComboboxOptions className={styles.options}>
            {loading ? (
              <li className={styles.empty}>Loading options...</li>
            ) : null}
            {!loading && filteredOptions.length === 0 ? (
              <li className={styles.empty}>{emptyMessage}</li>
            ) : null}
            {!loading ? filteredOptions.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option}
                className={({ active }) => classNames(styles.option, active && styles.active)}
              >
                {({ selected }) => (
                  <span className={classNames(styles.optionLabel, selected && styles.selected)}>
                    {option.label}
                  </span>
                )}
              </ComboboxOption>
            )) : null}
            {!loading && shouldShowAction ? (
              <li className={styles.actionWrap}>
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    setQuery('')
                    onAction?.()
                  }}
                >
                  {actionLabel}
                </button>
              </li>
            ) : null}
          </ComboboxOptions>
        </div>
      </Combobox>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  )
}
