import type { Metadata, Viewport } from 'next'
import './globals.css'

const APP_NAME = 'FiMana Lending'
const APP_DESCRIPTION = 'Lending operations, payment schedules, reminders, and borrower tracking for FiMana.'
const THEME_COLOR = '#924b10'

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
