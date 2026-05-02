import Image from 'next/image'
import { classNames } from '@/utils/class-names'

type AppLogoProps = {
  className?: string
  suffix?: string
}

export function AppLogo({ className, suffix }: AppLogoProps) {
  return (
    <span className={classNames('app-logo', className)}>
      <Image
        className="app-logo__mark"
        src="/brand/fimana-mark.svg"
        alt=""
        aria-hidden="true"
        width={1024}
        height={1024}
      />

      <span className="app-logo__wordmark">
        <span className="app-logo__name">FiMana</span>
        {suffix ? <span className="app-logo__suffix">{suffix}</span> : null}
      </span>
    </span>
  )
}
