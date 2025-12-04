'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  }
  duration_ms: number
  uri: string
  preview_url: string | null
}

interface AddTrackModalProps {
  playlistId: string
  onClose: () => void
  onSuccess: () => void
}

export default function AddTrackModal({
  playlistId,
  onClose,
  onSuccess,
}: AddTrackModalProps) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Track[]>([])
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

  const handleAddTrack = async (track: Track) => {
    setAdding(track.id)
    setError('')

    try {
      const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spotifyId: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          album: track.album.name,
          duration: Math.floor(track.duration_ms / 1000),
          imageUrl: track.album.images[0]?.url,
          previewUrl: track.preview_url || undefined,
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add track')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setAdding(null)
    }
  }

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="spotify-modal-backdrop">
      <div className="spotify-modal-lg my-8 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="spotify-modal-header">Add Track from Spotify</h2>
          <button
            onClick={onClose}
            className="spotify-button-icon text-2xl text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for songs, artists, or albums..."
              className="spotify-input flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="spotify-button"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spotify-spinner w-4 h-4 border-2"></span>
                  Searching...
                </span>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="spotify-alert spotify-alert-error mb-4">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar">
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
              <p className="text-lg">Search for tracks to add to your playlist</p>
              <p className="text-sm mt-2">Try searching by song name, artist, or album</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="spotify-spinner w-12 h-12 border-4 mx-auto mb-4"></div>
              <p className="text-gray-400">Searching Spotify...</p>
            </div>
          )}

          <div className="space-y-2">
            {searchResults.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg transition-all duration-200 animate-slide-up"
              >
                {track.album.images[0] && (
                  <img
                    src={track.album.images[0].url}
                    alt={track.album.name}
                    className="w-12 h-12 rounded shadow-md"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate hover:text-spotify-green transition-colors">
                    {track.name}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {track.artists.map((a) => a.name).join(', ')} • {track.album.name}
                  </div>
                </div>
                <div className="text-sm text-gray-400 hidden sm:block">
                  {formatDuration(track.duration_ms)}
                </div>
                <button
                  onClick={() => handleAddTrack(track)}
                  disabled={adding === track.id}
                  className="spotify-button-sm"
                >
                  {adding === track.id ? (
                    <span className="flex items-center gap-2">
                      <span className="spotify-spinner w-3 h-3 border-2"></span>
                      Adding...
                    </span>
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

