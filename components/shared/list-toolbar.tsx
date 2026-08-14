'use client'

import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Input } from './forms'
import styles from './list-toolbar.module.css'

export interface ListToolbarFilter<TValue extends string> {
  label: string
  value: TValue
}

export interface ListToolbarProps<TValue extends string> {
  actions?: ReactNode
  activeFilter: TValue
  filterLabel: string
  filters: Array<ListToolbarFilter<TValue>>
  onFilterChange: (value: TValue) => void
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  searchId: string
  searchLabel: string
  searchPlaceholder: string
  searchValue: string
}

export function ListToolbar<TValue extends string>({
  actions,
  activeFilter,
  filterLabel,
  filters,
  onFilterChange,
  onSearchChange,
  onSearchSubmit,
  searchId,
  searchLabel,
  searchPlaceholder,
  searchValue,
}: ListToolbarProps<TValue>) {
  return (
    <section className={styles.listToolbar} aria-label={`${filterLabel} and search`}>
      <div className={styles.filters} role="group" aria-label={filterLabel}>
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={filter.value === activeFilter ? styles.filterActive : styles.filter}
            aria-pressed={filter.value === activeFilter}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <form
        className={styles.searchForm}
        role="search"
        aria-label={searchLabel}
        onSubmit={(event) => {
          event.preventDefault()
          onSearchSubmit()
        }}
      >
        <div className={styles.searchControl}>
          <Search className={styles.searchIcon} aria-hidden="true" size={17} />
          <Input
            id={searchId}
            className={styles.searchField}
            inputClassName={styles.searchInput}
            type="search"
            aria-label={searchLabel}
            autoComplete="off"
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <Button type="submit" size="sm" className={styles.searchButton}>
          Search
        </Button>
      </form>

      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  )
}
