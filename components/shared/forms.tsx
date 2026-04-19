import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { classNames } from '@/utils/class-names'

type FieldLabelProps =
  | {
      id: string
      label: string
    }
  | {
      id?: string
      label?: undefined
    }

type FieldMessagingProps = {
  className?: string
  error?: string
  hint?: string
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

type InputProps = FieldLabelProps &
  FieldMessagingProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    inputClassName?: string
  }

type SelectProps = FieldLabelProps &
  FieldMessagingProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
    selectClassName?: string
  }

type TextareaProps = FieldLabelProps &
  FieldMessagingProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
    textareaClassName?: string
  }

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  id: string
  label: ReactNode
  description?: string
  error?: string
}

function getButtonClassName(variant: ButtonVariant, size: ButtonSize, fullWidth?: boolean, className?: string) {
  const variantClassName = {
    danger: 'button-secondary ui-button--danger',
    ghost: 'button-ghost',
    primary: 'button',
    secondary: 'button-secondary',
  }[variant]

  return classNames(
    variantClassName,
    'ui-button',
    size === 'sm' && 'ui-button--sm',
    fullWidth && 'ui-button--full',
    className,
  )
}

function getDescribedBy(id: string | undefined, hint?: string, error?: string) {
  if (!id) {
    return undefined
  }

  return [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(' ') || undefined
}

function FieldMessages({ error, hint, id }: { error?: string; hint?: string; id?: string }) {
  return (
    <>
      {hint && id ? <p id={`${id}-hint`} className="ui-field__hint">{hint}</p> : null}
      {error && id ? <p id={`${id}-error`} className="ui-field__error">{error}</p> : null}
    </>
  )
}

export function Button({
  className,
  fullWidth,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={getButtonClassName(variant, size, fullWidth, className)}
      type={type}
      {...props}
    />
  )
}

export function Input({
  className,
  error,
  hint,
  id,
  inputClassName,
  label,
  ...props
}: InputProps) {
  return (
    <div className={classNames('field ui-field', className)}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <input
        id={id}
        aria-describedby={getDescribedBy(id, hint, error)}
        aria-invalid={error ? true : undefined}
        className={inputClassName}
        {...props}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  )
}

export function Select({
  children,
  className,
  error,
  hint,
  id,
  label,
  selectClassName,
  ...props
}: SelectProps) {
  return (
    <div className={classNames('field ui-field', className)}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <select
        id={id}
        aria-describedby={getDescribedBy(id, hint, error)}
        aria-invalid={error ? true : undefined}
        className={selectClassName}
        {...props}
      >
        {children}
      </select>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  )
}

export function Textarea({
  children,
  className,
  error,
  hint,
  id,
  label,
  textareaClassName,
  ...props
}: TextareaProps) {
  return (
    <div className={classNames('field ui-field', className)}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <textarea
        id={id}
        aria-describedby={getDescribedBy(id, hint, error)}
        aria-invalid={error ? true : undefined}
        className={textareaClassName}
        {...props}
      >
        {children}
      </textarea>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  )
}

export function Checkbox({
  className,
  description,
  error,
  id,
  label,
  ...props
}: CheckboxProps) {
  return (
    <div className={classNames('ui-checkbox', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={description || error ? `${id}-details` : undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      <label htmlFor={id}>
        <span>{label}</span>
        {description ? <small id={`${id}-details`}>{description}</small> : null}
        {error && !description ? <small id={`${id}-details`} className="ui-field__error">{error}</small> : null}
        {error && description ? <small className="ui-field__error">{error}</small> : null}
      </label>
    </div>
  )
}
