import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finances',
  description: 'Household financial tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Finances',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
