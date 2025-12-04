'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Playlist {
  id: string
  name: string
  description?: string
  imageUrl?: string
  isPublic: boolean
  isCollaborative: boolean
  owner: {
    profile: {
      displayName: string
    }
  }
  _count: {
    tracks: number
    likes: number
    comments: number
  }
  updatedAt: string
}

interface SpotifyPlaylist {
  id: string
  spotifyId: string
  name: string
  description: string
  imageUrl: string | null
  isPublic: boolean
  isCollaborative: boolean
  tracksCount: number
  owner: {
    id: string
    displayName: string
  }
  externalUrl: string
  isSpotifyPlaylist: boolean
}

type TabType = 'local' | 'spotify'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([])
  const [loading, setLoading] = useState(true)
  const [spotifyLoading, setSpotifyLoading] = useState(true)
  const [spotifyConnected, setSpotifyConnected] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('local')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPlaylists()
      fetchSpotifyPlaylists()
    }
  }, [status])

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('/api/playlists')
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data)
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSpotifyPlaylists = async () => {
    try {
      const response = await fetch('/api/spotify/playlists')
      if (response.ok) {
        const data = await response.json()
        setSpotifyPlaylists(data)
        setSpotifyConnected(true)
      } else {
        const error = await response.json()
        if (error.needsSpotifyConnection) {
          setSpotifyConnected(false)
        }
      }
    } catch (error) {
      console.error('Error fetching Spotify playlists:', error)
      setSpotifyConnected(false)
    } finally {
      setSpotifyLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Welcome, {session?.user?.name || 'Music Lover'}
            </h1>
            <p className="text-gray-400">Manage your playlists and collaborations</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="spotify-button"
          >
            + Create Playlist
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700">
            <div className="text-3xl font-bold text-spotify-green mb-2">
              {playlists.length}
            </div>
            <div className="text-sm text-gray-400">Local Playlists</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700">
            <div className="text-3xl font-bold text-spotify-green mb-2">
              {spotifyConnected ? spotifyPlaylists.length : '-'}
            </div>
            <div className="text-sm text-gray-400">Spotify Playlists</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700">
            <div className="text-3xl font-bold text-spotify-green mb-2">
              {playlists.filter(p => p.isCollaborative).length}
            </div>
            <div className="text-sm text-gray-400">Collaborative</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700">
            <div className="text-3xl font-bold text-spotify-green mb-2">
              {playlists.reduce((sum, p) => sum + p._count.likes, 0)}
            </div>
            <div className="text-sm text-gray-400">Total Likes</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-zinc-700">
          <button
            onClick={() => setActiveTab('local')}
            className={`pb-4 px-2 font-semibold transition-colors relative ${
              activeTab === 'local'
                ? 'text-spotify-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Your Playlists ({playlists.length})
            {activeTab === 'local' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-spotify-green" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('spotify')}
            className={`pb-4 px-2 font-semibold transition-colors relative flex items-center gap-2 ${
              activeTab === 'spotify'
                ? 'text-spotify-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Spotify Playlists {spotifyConnected ? `(${spotifyPlaylists.length})` : ''}
            {activeTab === 'spotify' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-spotify-green" />
            )}
          </button>
        </div>

        {/* Local Playlists Tab */}
        {activeTab === 'local' && (
          <div className="mb-6">
            {playlists.length === 0 ? (
              <div className="text-center py-12 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <p className="text-gray-400 mb-4">You haven't created any playlists yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="spotify-button"
                >
                  Create Your First Playlist
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {playlists.map((playlist) => (
                  <Link
                    key={playlist.id}
                    href={`/playlists/${playlist.id}`}
                    className="spotify-card group"
                  >
                    <div className="aspect-square bg-zinc-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                      {playlist.imageUrl ? (
                        <img
                          src={playlist.imageUrl}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-16 h-16 text-gray-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-spotify-green">
                      {playlist.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                      {playlist.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{playlist._count.tracks} tracks</span>
                      <span>{playlist._count.likes} likes</span>
                      <span>{playlist._count.comments} comments</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {playlist.isPublic && (
                        <span className="text-xs bg-spotify-green/20 text-spotify-green px-2 py-1 rounded">
                          Public
                        </span>
                      )}
                      {playlist.isCollaborative && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          Collaborative
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spotify Playlists Tab */}
        {activeTab === 'spotify' && (
          <div className="mb-6">
            {!spotifyConnected ? (
              <div className="text-center py-12 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <svg className="w-16 h-16 mx-auto mb-4 text-spotify-green" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <p className="text-gray-400 mb-4">Connect your Spotify account to see your playlists</p>
                <Link href="/profile" className="spotify-button inline-block">
                  Connect Spotify
                </Link>
              </div>
            ) : spotifyLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-spotify-green mx-auto mb-4"></div>
                <p className="text-gray-400">Loading Spotify playlists...</p>
              </div>
            ) : spotifyPlaylists.length === 0 ? (
              <div className="text-center py-12 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <p className="text-gray-400">No playlists found in your Spotify account</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spotifyPlaylists.map((playlist) => (
                  <a
                    key={playlist.id}
                    href={playlist.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="spotify-card group"
                  >
                    <div className="aspect-square bg-zinc-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                      {playlist.imageUrl ? (
                        <img
                          src={playlist.imageUrl}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-16 h-16 text-gray-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      )}
                      {/* Spotify badge */}
                      <div className="absolute top-2 right-2 bg-spotify-green rounded-full p-1">
                        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-spotify-green">
                      {playlist.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                      {playlist.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{playlist.tracksCount} tracks</span>
                      <span>By {playlist.owner.displayName}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {playlist.isPublic && (
                        <span className="text-xs bg-spotify-green/20 text-spotify-green px-2 py-1 rounded">
                          Public
                        </span>
                      )}
                      {playlist.isCollaborative && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          Collaborative
                        </span>
                      )}
                      <span className="text-xs bg-zinc-700 text-gray-300 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open in Spotify
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Link href="/browse" className="spotify-card group border border-purple-500/30 hover:border-purple-500/60">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🌍</span>
              <h3 className="text-xl font-semibold group-hover:text-purple-400 transition-colors">Browse</h3>
            </div>
            <p className="text-gray-400">
              Discover playlists from the community, fork and collaborate
            </p>
          </Link>
          <Link href="/pull-requests" className="spotify-card">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📥</span>
              <h3 className="text-xl font-semibold">Pull Requests</h3>
            </div>
            <p className="text-gray-400">
              View and manage collaboration requests
            </p>
          </Link>
          <Link href="/profile" className="spotify-card">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">👤</span>
              <h3 className="text-xl font-semibold">Profile</h3>
            </div>
            <p className="text-gray-400">
              Manage your profile and settings
            </p>
          </Link>
        </div>
      </div>

      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchPlaylists()
          }}
        />
      )}
    </div>
  )
}

function CreatePlaylistModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isCollaborative, setIsCollaborative] = useState(false)
  const [syncToSpotify, setSyncToSpotify] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create playlist on the website
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          isPublic,
          isCollaborative,
        }),
      })

      if (response.ok) {
        const playlist = await response.json()
        
        // If sync to Spotify is enabled, sync the playlist
        if (syncToSpotify && playlist.id) {
          try {
            await fetch('/api/spotify/sync-playlist', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ playlistId: playlist.id }),
            })
          } catch (syncError) {
            console.error('Failed to sync to Spotify:', syncError)
            // Don't fail the whole operation if sync fails
          }
        }
        
        onSuccess()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create playlist')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Create New Playlist</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="spotify-input w-full"
              placeholder="My Awesome Playlist"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="spotify-input w-full"
              rows={3}
              placeholder="What's this playlist about?"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-spotify-green"
              />
              <span className="text-sm text-gray-300">Make playlist public</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="w-4 h-4 accent-spotify-green"
              />
              <span className="text-sm text-gray-300">
                Enable collaborations (allows pull requests)
              </span>
            </label>

            <div className="pt-2 border-t border-zinc-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToSpotify}
                  onChange={(e) => setSyncToSpotify(e.target.checked)}
                  className="w-4 h-4 accent-spotify-green"
                />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-spotify-green" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  <span className="text-sm text-gray-300">
                    Also create on Spotify
                  </span>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Requires connected Spotify account
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-full border border-gray-600 text-gray-300 font-semibold hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 spotify-button disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
