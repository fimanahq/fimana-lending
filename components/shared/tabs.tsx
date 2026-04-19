'use client'

import { useState } from 'react'
import { classNames } from '@/utils/class-names'

export interface TabItem {
  content: React.ReactNode
  label: React.ReactNode
  value: string
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  label: string
  className?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  value?: string
}

export function Tabs({
  className,
  defaultValue,
  items,
  label,
  onValueChange,
  value,
}: TabsProps) {
  const firstEnabledValue = items.find((item) => !item.disabled)?.value || items[0]?.value || ''
  const [internalValue, setInternalValue] = useState(defaultValue || firstEnabledValue)
  const selectedValue = value ?? internalValue
  const selectedItem = items.find((item) => item.value === selectedValue) || items.find((item) => !item.disabled)

  const handleSelect = (nextValue: string) => {
    setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  return (
    <div className={classNames('ui-tabs', className)}>
      <div className="ui-tabs__list" role="tablist" aria-label={label}>
        {items.map((item) => {
          const isSelected = item.value === selectedItem?.value
          const tabId = `tab-${item.value}`
          const panelId = `tab-panel-${item.value}`

          return (
            <button
              key={item.value}
              id={tabId}
              className={classNames('ui-tabs__tab', isSelected && 'is-active')}
              type="button"
              role="tab"
              aria-controls={panelId}
              aria-selected={isSelected}
              disabled={item.disabled}
              onClick={() => handleSelect(item.value)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {selectedItem ? (
        <div
          id={`tab-panel-${selectedItem.value}`}
          className="ui-tabs__panel"
          role="tabpanel"
          aria-labelledby={`tab-${selectedItem.value}`}
        >
          {selectedItem.content}
        </div>
      ) : null}
    </div>
  )
}
