import './globals.css'

export const metadata = {
  title: 'Ledger — Clear money, clearly.',
  description: 'A calm, clear place to manage your accounts and transfers.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
