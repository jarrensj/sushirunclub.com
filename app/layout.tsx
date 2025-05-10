import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'sushi run club',
  description: 'sushi run club',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
