import { classNames } from '@/utils/class-names'

type AppLogoProps = {
  className?: string
  suffix?: string
}

export function AppLogo({ className, suffix }: AppLogoProps) {
  return (
    <span className={classNames('app-logo', className)}>
      <span className="app-logo__mark" aria-hidden="true" />

      <span className="app-logo__wordmark">
        <span className="app-logo__name">FiMana</span>
        {suffix ? <span className="app-logo__suffix">{suffix}</span> : null}
      </span>
    </span>
  )
}
