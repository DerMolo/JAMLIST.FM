'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Track {
  id: string
  position: number
  track: {
    id: string
    spotifyId?: string
    title: string
    artist: string
    album?: string
    duration: number
    imageUrl?: string
  }
}

interface Branch {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'SUBMITTED' | 'MERGED' | 'ABANDONED'
  spotifyId?: string
  createdAt: string
  updatedAt: string
  playlist: {
    id: string
    name: string
    description?: string
    imageUrl?: string
    isPublic: boolean
    isCollaborative: boolean
    ownerId: string
    owner: {
      profile: {
        displayName: string
      }
    }
  }
  owner: {
    id: string
    profile: {
      displayName: string
      avatarUrl?: string
    }
  }
  tracks: Track[]
  pullRequest?: {
    id: string
    status: string
    title: string
  }
}

export default function BranchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const playlistId = params?.id as string
  const branchId = params?.branchId as string

  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreatePRModal, setShowCreatePRModal] = useState(false)
  const [showAddTrackModal, setShowAddTrackModal] = useState(false)
  const [removingTrack, setRemovingTrack] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (branchId && status === 'authenticated') {
      fetchBranch()
    }
  }, [branchId, status])

  const fetchBranch = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/branches/${branchId}`)
      if (response.ok) {
        const data = await response.json()
        setBranch(data)
      } else {
        setError('Failed to load branch')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSyncToSpotify = async () => {
    if (!branch) return
    
    setSyncing(true)
    setSyncMessage(null)

    try {
      // Create a new playlist on Spotify with branch tracks
      const response = await fetch('/api/spotify/sync-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          branchId: branch.id,
          name: `${branch.playlist.name} - ${branch.name}`,
          description: branch.description || `Branch of "${branch.playlist.name}"`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSyncMessage({
          type: 'success',
          text: data.message || 'Branch synced to Spotify!',
        })
        fetchBranch()
      } else {
        const data = await response.json()
        setSyncMessage({
          type: 'error',
          text: data.error || 'Failed to sync branch',
        })
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: 'Something went wrong while syncing',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleRemoveTrack = async (trackId: string) => {
    if (!branch || branch.status === 'SUBMITTED') return
    
    setRemovingTrack(trackId)
    try {
      const response = await fetch(
        `/api/playlists/${playlistId}/branches/${branchId}/tracks?trackId=${trackId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setSyncMessage({
          type: 'success',
          text: 'Track removed from branch',
        })
        fetchBranch()
      } else {
        const data = await response.json()
        setSyncMessage({
          type: 'error',
          text: data.error || 'Failed to remove track',
        })
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: 'Something went wrong',
      })
    } finally {
      setRemovingTrack(null)
    }
  }

  const handleAddTrack = async (track: {
    spotifyId: string
    title: string
    artist: string
    album?: string
    duration: number
    imageUrl?: string
  }) => {
    if (!branch || branch.status === 'SUBMITTED') return

    try {
      const response = await fetch(
        `/api/playlists/${playlistId}/branches/${branchId}/tracks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(track),
        }
      )

      if (response.ok) {
        setSyncMessage({
          type: 'success',
          text: `Added "${track.title}" to branch`,
        })
        fetchBranch()
        return true
      } else {
        const data = await response.json()
        setSyncMessage({
          type: 'error',
          text: data.error || 'Failed to add track',
        })
        return false
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: 'Something went wrong',
      })
      return false
    }
  }

  const handleDeleteBranch = async () => {
    if (!branch || !confirm('Are you sure you want to delete this branch?')) return

    try {
      const response = await fetch(`/api/playlists/${playlistId}/branches/${branchId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push(`/playlists/${playlistId}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete branch')
      }
    } catch (err) {
      setError('Something went wrong')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error || !branch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error || 'Branch not found'}</div>
          <Link href={`/playlists/${playlistId}`} className="spotify-button">
            Back to Playlist
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = session?.user?.id === branch.owner.id
  const isPlaylistOwner = session?.user?.id === branch.playlist.ownerId
  const totalDuration = branch.tracks.reduce((sum, t) => sum + t.track.duration, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900/20 via-zinc-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-500/20 to-transparent p-8">
        <div className="max-w-7xl mx-auto">
          <Link href={`/playlists/${playlistId}`} className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {branch.playlist.name}
          </Link>

          <div className="flex gap-8 items-end mt-4">
            <div className="w-48 h-48 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 relative">
              {branch.playlist.imageUrl ? (
                <img
                  src={branch.playlist.imageUrl}
                  alt={branch.name}
                  className="w-full h-full object-cover opacity-60"
                />
              ) : (
                <svg
                  className="w-24 h-24 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              )}
              {/* Branch overlay */}
              <div className="absolute inset-0 bg-blue-500/40 flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                BRANCH
              </div>
              <h1 className="text-5xl font-bold mb-2">{branch.name}</h1>
              <p className="text-gray-300 mb-4">
                Branch of <Link href={`/playlists/${playlistId}`} className="text-blue-400 hover:underline">{branch.playlist.name}</Link>
              </p>
              {branch.description && (
                <p className="text-gray-400 mb-4">{branch.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Link 
                  href={`/users/${branch.owner.id}`}
                  className="font-semibold hover:underline hover:text-spotify-green transition-colors"
                >
                  {branch.owner.profile?.displayName}
                </Link>
                <span>•</span>
                <span>{branch.tracks.length} songs</span>
                <span>•</span>
                <span>{formatDuration(totalDuration)}</span>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <span className={`text-xs px-3 py-1 rounded-full ${
                  branch.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                  branch.status === 'SUBMITTED' ? 'bg-yellow-500/20 text-yellow-400' :
                  branch.status === 'MERGED' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {branch.status}
                </span>
                {branch.pullRequest && (
                  <Link 
                    href={`/pull-requests/${branch.pullRequest.id}`}
                    className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full hover:bg-purple-500/30"
                  >
                    PR: {branch.pullRequest.status}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex flex-wrap gap-4 items-center">
          {isOwner && branch.status === 'ACTIVE' && (
            <>
              <button
                onClick={() => setShowAddTrackModal(true)}
                className="px-6 py-3 rounded-full border border-blue-500 text-blue-400 font-semibold hover:bg-blue-500/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Tracks
              </button>
              <button
                onClick={() => setShowCreatePRModal(true)}
                className="spotify-button flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Submit as Pull Request
              </button>
              <button
                onClick={handleSyncToSpotify}
                disabled={syncing}
                className="px-6 py-3 rounded-full bg-spotify-green text-black font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z" />
                    </svg>
                    Save to My Spotify
                  </>
                )}
              </button>
              <button
                onClick={handleDeleteBranch}
                className="px-6 py-3 rounded-full border border-red-500 text-red-400 font-semibold hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Branch
              </button>
            </>
          )}
          {branch.spotifyId && (
            <a
              href={`https://open.spotify.com/playlist/${branch.spotifyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full border border-spotify-green text-spotify-green font-semibold hover:bg-spotify-green/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Spotify
            </a>
          )}
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div
            className={`mt-4 px-4 py-3 rounded-lg flex items-center gap-2 ${
              syncMessage.type === 'success'
                ? 'bg-green-500/10 border border-green-500 text-green-400'
                : 'bg-red-500/10 border border-red-500 text-red-400'
            }`}
          >
            {syncMessage.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {syncMessage.text}
            <button
              onClick={() => setSyncMessage(null)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Tracks */}
      <div className="max-w-7xl mx-auto px-8 pb-8">
        <div className="bg-zinc-900/50 rounded-lg">
          {branch.tracks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No tracks in this branch</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-gray-400 border-b border-zinc-800">
                <div className="col-span-1">#</div>
                <div className="col-span-5">TITLE</div>
                <div className="col-span-3">ALBUM</div>
                <div className="col-span-2 text-right">DURATION</div>
                <div className="col-span-1"></div>
              </div>

              {/* Tracks */}
              {branch.tracks.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="col-span-1 flex items-center text-gray-400">
                    {index + 1}
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 flex-shrink-0">
                      {item.track.imageUrl ? (
                        <img
                          src={item.track.imageUrl}
                          alt={item.track.title}
                          className="w-10 h-10 rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-zinc-700 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate group-hover:text-blue-400">
                        {item.track.title}
                      </div>
                      <div className="text-sm text-gray-400 truncate">{item.track.artist}</div>
                    </div>
                  </div>
                  <div className="col-span-3 flex items-center text-gray-400 text-sm truncate">
                    {item.track.album || '-'}
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="text-gray-400 text-sm">
                      {formatDuration(item.track.duration)}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {isOwner && branch.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRemoveTrack(item.track.id)}
                        disabled={removingTrack === item.track.id}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-400 transition-all disabled:opacity-50"
                        title="Remove from branch"
                      >
                        {removingTrack === item.track.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create PR Modal */}
      {showCreatePRModal && branch && (
        <CreatePRModal
          branch={branch}
          onClose={() => setShowCreatePRModal(false)}
          onSuccess={() => {
            setShowCreatePRModal(false)
            fetchBranch()
          }}
        />
      )}

      {/* Add Track Modal */}
      {showAddTrackModal && branch && (
        <AddTrackToBranchModal
          onClose={() => setShowAddTrackModal(false)}
          onAddTrack={handleAddTrack}
        />
      )}
    </div>
  )
}

// Add Track to Branch Modal
function AddTrackToBranchModal({
  onClose,
  onAddTrack,
}: {
  onClose: () => void
  onAddTrack: (track: {
    spotifyId: string
    title: string
    artist: string
    album?: string
    duration: number
    imageUrl?: string
  }) => Promise<boolean>
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const tracks = await response.json()
        setSearchResults(tracks)
      } else {
        const data = await response.json()
        if (data.needsSpotifyConnection) {
          setError(data.message + ' You can connect your Spotify account in your profile.')
        } else {
          setError(data.message || 'Failed to search tracks')
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTrack = async (track: any) => {
    setAdding(track.id)
    setError('')

    const success = await onAddTrack({
      spotifyId: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      duration: Math.floor(track.duration_ms / 1000),
      imageUrl: track.album.images[0]?.url,
    })

    if (success) {
      // Remove track from search results to indicate it was added
      setSearchResults(prev => prev.filter(t => t.id !== track.id))
    }
    
    setAdding(null)
  }

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-bold">Add Tracks to Branch</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for songs, artists, or albums..."
                className="flex-1 px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {searchResults.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-lg">Search for tracks to add to your branch</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Searching Spotify...</p>
            </div>
          )}

          <div className="space-y-2">
            {searchResults.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg transition-colors"
              >
                {track.album.images[0] && (
                  <img
                    src={track.album.images[0].url}
                    alt={track.album.name}
                    className="w-12 h-12 rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {track.name}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {track.artists.map((a: any) => a.name).join(', ')} • {track.album.name}
                  </div>
                </div>
                <div className="text-sm text-gray-400 hidden sm:block">
                  {formatDuration(track.duration_ms)}
                </div>
                <button
                  onClick={() => handleAddTrack(track)}
                  disabled={adding === track.id}
                  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {adding === track.id ? 'Adding...' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CreatePRModal({
  branch,
  onClose,
  onSuccess,
}: {
  branch: Branch
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState(`Changes from ${branch.name}`)
  const [description, setDescription] = useState(branch.description || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/pull-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId: branch.playlist.id,
          branchId: branch.id,
          title,
          description: description || undefined,
          trackChanges: {
            branchTracks: branch.tracks.map(t => ({
              trackId: t.track.id,
              spotifyId: t.track.spotifyId,
              position: t.position,
            })),
          },
        }),
      })

      if (response.ok) {
        const pr = await response.json()
        onSuccess()
        router.push(`/pull-requests/${pr.id}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create pull request')
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Submit Pull Request</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Submit your branch "{branch.name}" as a pull request to the playlist owner for review.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="spotify-input w-full"
              placeholder="e.g., Add summer vibes tracks"
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
              rows={4}
              placeholder="Describe your changes..."
            />
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4 text-sm">
            <div className="font-semibold text-gray-300 mb-2">Changes Summary</div>
            <div className="text-gray-400">
              • {branch.tracks.length} tracks in your branch
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
              disabled={loading || !title.trim()}
              className="flex-1 spotify-button disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit PR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

