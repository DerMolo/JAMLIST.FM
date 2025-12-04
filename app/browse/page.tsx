'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Playlist {
  id: string
  name: string
  description?: string
  imageUrl?: string
  isPublic: boolean
  isCollaborative: boolean
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    profile: {
      displayName: string
      avatarUrl?: string
    }
  }
  _count: {
    tracks: number
    likes: number
    comments: number
    forks: number
    branches: number
  }
  forkedFrom?: {
    id: string
    name: string
    owner: {
      profile: {
        displayName: string
      }
    }
  }
}

type FilterType = 'all' | 'collaborative' | 'popular' | 'recent'

export default function BrowsePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [filter, setFilter] = useState<FilterType>((searchParams.get('filter') as FilterType) || 'all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchPlaylists = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        filter,
        ...(search && { search }),
      })
      
      const response = await fetch(`/api/playlists/browse?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.playlists)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setLoading(false)
    }
  }, [page, filter, search])

  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPlaylists()
  }

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900/20 via-zinc-900 to-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-800/20 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-8 py-12">
          <Link href="/dashboard" className="text-gray-400 hover:text-white mb-6 inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mt-4">
            <div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Discover Playlists
              </h1>
              <p className="text-gray-300 text-lg max-w-2xl">
                Explore playlists from the community. Fork them to make your own version, 
                or create a branch to suggest changes.
              </p>
            </div>
            
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search playlists..."
                  className="w-full lg:w-80 px-5 py-3 pl-12 rounded-full bg-zinc-800/50 border border-zinc-700 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
                <svg 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-8">
            {[
              { value: 'all', label: 'All Playlists', icon: '🎵' },
              { value: 'collaborative', label: 'Collaborative', icon: '👥' },
              { value: 'popular', label: 'Most Popular', icon: '🔥' },
              { value: 'recent', label: 'Recently Updated', icon: '✨' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value as FilterType)}
                className={`px-5 py-2.5 rounded-full font-medium transition-all duration-200 flex items-center gap-2 ${
                  filter === f.value
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-zinc-800/50 text-gray-300 hover:bg-zinc-700/50 border border-zinc-700'
                }`}
              >
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          <div className="mt-6 text-sm text-gray-400">
            {loading ? 'Loading...' : `${total} playlist${total !== 1 ? 's' : ''} found`}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-zinc-800/30 rounded-xl p-4 animate-pulse">
                <div className="aspect-square bg-zinc-700/50 rounded-lg mb-4" />
                <div className="h-5 bg-zinc-700/50 rounded w-3/4 mb-2" />
                <div className="h-4 bg-zinc-700/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No playlists found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {search 
                ? `No playlists match "${search}". Try a different search term.`
                : 'No public or collaborative playlists are available yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {playlists.map((playlist, index) => (
                <PlaylistCard 
                  key={playlist.id} 
                  playlist={playlist} 
                  index={index}
                  currentUserId={session?.user?.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-gray-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-gray-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PlaylistCard({ 
  playlist, 
  index,
  currentUserId,
}: { 
  playlist: Playlist
  index: number
  currentUserId?: string
}) {
  const [forking, setForking] = useState(false)
  const router = useRouter()

  const handleFork = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!currentUserId) {
      router.push('/auth/signin')
      return
    }

    setForking(true)
    try {
      const response = await fetch(`/api/playlists/${playlist.id}/fork`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const forkedPlaylist = await response.json()
        router.push(`/playlists/${forkedPlaylist.id}`)
      }
    } catch (error) {
      console.error('Error forking playlist:', error)
    } finally {
      setForking(false)
    }
  }

  return (
    <div 
      className="group bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl p-4 transition-all duration-300 border border-transparent hover:border-zinc-700 hover:shadow-xl hover:shadow-purple-900/10"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link href={`/playlists/${playlist.id}`}>
        <div className="relative aspect-square bg-zinc-800 rounded-lg mb-4 overflow-hidden">
          {playlist.imageUrl ? (
            <img
              src={playlist.imageUrl}
              alt={playlist.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-zinc-800">
              <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}
          
          {/* Quick action buttons */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={handleFork}
              disabled={forking}
              className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white shadow-lg transform hover:scale-110 transition-all disabled:opacity-50"
              title="Fork this playlist"
            >
              {forking ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              )}
            </button>
            <button
              className="w-12 h-12 rounded-full bg-spotify-green hover:bg-green-400 flex items-center justify-center text-black shadow-lg transform hover:scale-110 transition-all"
              title="View playlist"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {playlist.isCollaborative && (
              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-500/80 text-white backdrop-blur-sm">
                👥 Collaborative
              </span>
            )}
            {playlist.forkedFrom && (
              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-500/80 text-white backdrop-blur-sm">
                🔀 Fork
              </span>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-purple-400 transition-colors">
          {playlist.name}
        </h3>
        
        <Link 
          href={`/users/${playlist.owner.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 mb-2 hover:text-spotify-green transition-colors"
        >
          {playlist.owner.profile?.avatarUrl ? (
            <img 
              src={playlist.owner.profile.avatarUrl} 
              alt={playlist.owner.profile.displayName}
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
              <span className="text-[10px] text-gray-400">
                {playlist.owner.profile?.displayName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <span className="text-sm text-gray-400 truncate hover:text-spotify-green">
            {playlist.owner.profile?.displayName || 'Unknown'}
          </span>
        </Link>

        {playlist.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {playlist.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
            {playlist._count.tracks}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            {playlist._count.likes}
          </span>
          {playlist._count.forks > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {playlist._count.forks}
            </span>
          )}
          {playlist._count.branches > 0 && (
            <span className="flex items-center gap-1" title="Active branches">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {playlist._count.branches}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}

