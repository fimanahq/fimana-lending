import Image from 'next/image'
import Link from 'next/link'

const HERO_IMAGE_URL = 'https://www.figma.com/api/mcp/asset/bd91ea1a-8716-481b-80a0-0bcb19290174'

const primaryLinks = [
  { href: '#vision', label: 'Our Vision' },
  { href: '#lending-solutions', label: 'Lending Solutions' },
  { href: '#about', label: 'About Us' },
]

const footerLinks = [
  { href: '#privacy-policy', label: 'Privacy Policy', emphasized: true },
  { href: '#terms-of-service', label: 'Terms of Service' },
  { href: '#financial-security', label: 'Financial Security' },
  { href: '#regulatory-disclosure', label: 'Regulatory Disclosure' },
]

export default function LandingPage() {
  return (
    <div className="landing-homepage">
      <header className="landing-homepage__header" data-node-id="2003:45">
        <div className="page-wrap landing-homepage__container landing-homepage__headerContainer">
          <Link href="/" className="landing-homepage__brand" aria-label="FiMana Lending home" data-node-id="2003:47">
            FiMana Lending
          </Link>

          <nav className="landing-homepage__nav" aria-label="Primary" data-node-id="2003:49">
            {primaryLinks.map((link) => (
              <a key={link.href} href={link.href} className="landing-homepage__navLink">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="landing-homepage__headerActions" data-node-id="2003:56">
            <Link href="/login" className="landing-homepage__signIn">
              Sign in
            </Link>
            <Link href="/register" className="landing-homepage__createAccount" data-node-id="2003:60">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-homepage__main">
        <div className="page-wrap landing-homepage__container">
          <section className="landing-homepage__hero" id="vision" data-node-id="2003:4">
            <div className="landing-homepage__copy" data-node-id="2003:17">
              <div className="landing-homepage__eyebrow" data-node-id="2003:18">
                The Curated Ledger
              </div>

              <h1 className="landing-homepage__title" data-node-id="2003:20">
                <span>Request a</span>
                <span>loan online</span>
                <span>
                  with <em>FiMana</em>
                </span>
                <span className="landing-homepage__titleAccent">Lending.</span>
              </h1>

              <p className="landing-homepage__body" data-node-id="2003:22">
                Experience a sophisticated financial journey where modern lending meets artisanal precision. We
                transform the transaction into a guided path toward your aspirations.
              </p>

              <div className="landing-homepage__actions" data-node-id="2003:24">
                <Link
                  href="/request-loan"
                  className="landing-homepage__button landing-homepage__button--primary"
                  data-node-id="2003:25"
                >
                  Request loan
                </Link>
                <a href="#about" className="landing-homepage__button landing-homepage__button--secondary" data-node-id="2003:28">
                  View rates
                </a>
              </div>
            </div>

            <div className="landing-homepage__visual" id="lending-solutions" data-node-id="2003:5">
              <div className="landing-homepage__visualPlate" aria-hidden="true" data-node-id="2003:6" />
              <div className="landing-homepage__imageFrame" data-node-id="2003:7">
                <Image
                  src={HERO_IMAGE_URL}
                  alt="A sophisticated home office desk with a laptop, lamp, and wooden cabinetry."
                  className="landing-homepage__image"
                  width={552}
                  height={552}
                  priority
                  sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 1120px) 552px, 552px"
                />
              </div>
            </div>
          </section>

          <div className="landing-homepage__separator" aria-hidden="true" data-node-id="2003:30" />
        </div>
      </main>

      <footer className="landing-homepage__footer" id="about" data-node-id="2003:31">
        <div className="page-wrap landing-homepage__container landing-homepage__footerContainer">
          <div className="landing-homepage__footerBrand" data-node-id="2003:33">
            <strong>FiMana Lending</strong>
            <span>© 2024 FiMana Lending. All rights reserved.</span>
          </div>

          <nav className="landing-homepage__footerNav" aria-label="Footer" data-node-id="2003:36">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`landing-homepage__footerLink${link.emphasized ? ' landing-homepage__footerLink--emphasized' : ''}`}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
