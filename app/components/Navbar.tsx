'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isActive = (path: string) => pathname === path

  if (status === 'loading') {
    return (
      <nav className="bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16" />
        </div>
      </nav>
    )
  }

  if (!session) {
    return null
  }

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
            <span className="font-bold text-lg group-hover:text-spotify-green transition-colors">
              JamList
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" active={isActive('/dashboard')}>
              Dashboard
            </NavLink>
            <NavLink href="/browse" active={isActive('/browse')}>
              <span className="flex items-center gap-1.5">
                <span className="text-purple-400">🌍</span>
                Browse
              </span>
            </NavLink>
            <NavLink href="/pull-requests" active={isActive('/pull-requests')}>
              Pull Requests
            </NavLink>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                {session.user?.image ? (
                  <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold">
                    {session.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium">
                {session.user?.name || 'User'}
              </span>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 py-2 z-50 animate-scale-in">
                  <div className="px-4 py-2 border-b border-zinc-700">
                    <p className="text-sm font-semibold">{session.user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                  </div>
                  
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-zinc-700 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-zinc-700 transition-colors md:hidden"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </Link>
                  
                  <Link 
                    href="/browse" 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-zinc-700 transition-colors md:hidden"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="text-purple-400">🌍</span>
                    Browse Playlists
                  </Link>
                  
                  <div className="border-t border-zinc-700 my-2" />
                  
                  <button 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700 transition-colors w-full"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ 
  href, 
  active, 
  children 
}: { 
  href: string
  active: boolean
  children: React.ReactNode 
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-zinc-800 text-white'
          : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
      }`}
    >
      {children}
    </Link>
  )
}

