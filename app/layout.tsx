import type React from "react"
export const metadata = {
  title: "Sushi Run Club",
  description: "Track your running progress with the Sushi Run Club treadmill simulator",
  keywords: ["sushi", "running", "treadmill", "fitness", "exercise", "3D", "simulator"],
  authors: [{ name: "Sushi Run Club" }],
  creator: "Sushi Run Club",
  openGraph: {
    title: "Sushi Run Club",
    description: "Track your running progress with the Sushi Run Club treadmill simulator",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sushi Run Club",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sushi Run Club",
    description: "Track your running progress with the Sushi Run Club treadmill simulator",
    images: ["/og-image.png"],
    creator: "@sushirunclub",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


import './globals.css'