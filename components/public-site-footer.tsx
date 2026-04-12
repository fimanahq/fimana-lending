type PublicSiteFooterProps = {
  footerClassName?: string
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function PublicSiteFooter({ footerClassName }: PublicSiteFooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={joinClasses('public-site-footer', footerClassName)}>
      <div className="public-site-footer__inner">
        <span className="public-site-footer__meta">&copy; {currentYear} FiMana Lending. All rights reserved.</span>
      </div>
    </footer>
  )
}
