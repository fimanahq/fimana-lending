import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { classNames } from '@/utils/class-names'
import styles from './forms.module.css'

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

export type SwitchProps = CheckboxProps

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
      {hint && id ? <p id={`${id}-hint`} className={styles.fieldHint}>{hint}</p> : null}
      {error && id ? <p id={`${id}-error`} className={styles.fieldError}>{error}</p> : null}
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
    <div className={classNames('field', className)}>
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
    <div className={classNames('field', className)}>
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
    <div className={classNames('field', className)}>
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
    <div className={classNames(styles.checkbox, className)}>
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
        {error && !description ? <small id={`${id}-details`} className={styles.fieldError}>{error}</small> : null}
        {error && description ? <small className={styles.fieldError}>{error}</small> : null}
      </label>
    </div>
  )
}

export function Switch({
  className,
  description,
  error,
  id,
  label,
  ...props
}: SwitchProps) {
  return (
    <div className={classNames(styles.switch, className)}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-describedby={description || error ? `${id}-details` : undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      <label htmlFor={id}>
        <span className={styles.switchTrack} aria-hidden="true">
          <span className={styles.switchThumb} />
        </span>
        <span className={styles.switchCopy}>
          <span>{label}</span>
          {description ? <small id={`${id}-details`}>{description}</small> : null}
          {error && !description ? <small id={`${id}-details`} className={styles.fieldError}>{error}</small> : null}
          {error && description ? <small className={styles.fieldError}>{error}</small> : null}
        </span>
      </label>
    </div>
  )
}
