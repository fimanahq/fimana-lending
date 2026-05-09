import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FiMana Lending',
  description: 'Lending operations, payment schedules, reminders, and borrower tracking for FiMana.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
