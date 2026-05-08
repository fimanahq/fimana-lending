'use client'

import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { useEffect, useMemo, useState } from 'react'
import { classNames } from '@/utils/class-names'

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
      {hint ? <p id={`${id}-hint`} className="ui-field__hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="ui-field__error">{error}</p> : null}
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
  value,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const isAsync = typeof onQueryChange === 'function'
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )
  const filteredOptions = useMemo(() => {
    if (isAsync) {
      return options
    }

    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return options
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
  }, [isAsync, options, query])
  const shouldShowAction = Boolean(actionLabel && onAction)
  const describedBy = getDescribedBy(id, hint, error)

  useEffect(() => {
    if (!onQueryChange) {
      return
    }

    onQueryChange(query)
  }, [onQueryChange, query])

  return (
    <div className={classNames('field ui-field', className)}>
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
        <div className="ui-searchable-select">
          <ComboboxInput
            id={id}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className="ui-searchable-select__input"
            displayValue={(option: SearchableSelectOption | null) => option?.label ?? ''}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <ComboboxButton className="ui-searchable-select__button" aria-label={`Toggle ${label}`}>
            <span aria-hidden="true">▾</span>
          </ComboboxButton>
          <ComboboxOptions className="ui-searchable-select__options">
            {loading ? (
              <li className="ui-searchable-select__empty">Loading options...</li>
            ) : null}
            {!loading && filteredOptions.length === 0 ? (
              <li className="ui-searchable-select__empty">{emptyMessage}</li>
            ) : null}
            {!loading ? filteredOptions.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option}
                className={({ active }) => classNames('ui-searchable-select__option', active && 'is-active')}
              >
                {({ selected }) => (
                  <span className={classNames('ui-searchable-select__optionLabel', selected && 'is-selected')}>
                    {option.label}
                  </span>
                )}
              </ComboboxOption>
            )) : null}
            {!loading && shouldShowAction ? (
              <li className="ui-searchable-select__actionWrap">
                <button
                  type="button"
                  className="ui-searchable-select__action"
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
