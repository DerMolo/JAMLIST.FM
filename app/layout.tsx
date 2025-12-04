import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from './components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JamList - Collaborative Playlists',
  description: 'A collaborative music network built around playlist sharing, editing, and discovery',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
            <Navbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}

