'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AddTrackModal from '@/app/components/AddTrackModal'
import EditPlaylistModal from '@/app/components/EditPlaylistModal'

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

interface Playlist {
  id: string
  name: string
  description?: string
  imageUrl?: string
  isPublic: boolean
  isCollaborative: boolean
  version: number
  spotifyId?: string | null
  forkedFromId?: string | null
  forkedFrom?: {
    id: string
    name: string
    owner: {
      id: string
      profile: {
        displayName: string
      }
    }
  }
  owner: {
    id: string
    spotifyId?: string
    profile: {
      displayName: string
    }
  }
  tracks: Track[]
  _count?: {
    likes: number
    comments: number
    forks?: number
    branches?: number
  }
}

interface Branch {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'SUBMITTED' | 'MERGED' | 'ABANDONED'
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
  }
  pullRequest?: {
    id: string
    status: string
  }
}

interface PlaylistDiff {
  inSync: boolean
  spotifyPlaylistExists: boolean
  spotifyPlaylistInLibrary: boolean
  localTrackCount: number
  spotifyTrackCount: number
  tracksOnlyInLocal: Array<{
    id: string
    spotifyId: string
    title: string
    artist: string
  }>
  tracksOnlyInSpotify: Array<{
    spotifyId: string
    title: string
    artist: string
  }>
  metadataChanges: {
    name: boolean
    description: boolean
  }
  // Changes detected since last sync
  spotifyHasChanges?: {
    name: boolean
    description: boolean
    tracks: boolean
  }
  localHasChanges?: {
    name: boolean
    description: boolean
    tracks: boolean
  }
  spotifyPlaylistName?: string
  spotifyPlaylistDescription?: string
  lastSyncedAt?: string
}

export default function PlaylistPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const playlistId = params?.id as string

  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddTrackModal, setShowAddTrackModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Spotify sync state
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Change detection state
  const [diff, setDiff] = useState<PlaylistDiff | null>(null)
  const [comparingChanges, setComparingChanges] = useState(false)
  const [showDiffDetails, setShowDiffDetails] = useState(false)

  // Branch and fork state
  const [branches, setBranches] = useState<Branch[]>([])
  const [showBranches, setShowBranches] = useState(false)
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false)
  const [forking, setForking] = useState(false)

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Like state
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [liking, setLiking] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (playlistId && status === 'authenticated') {
      fetchPlaylist()
      fetchBranches()
      fetchLikeStatus()
    }
  }, [playlistId, status])

  const fetchLikeStatus = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/like`)
      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.liked)
        setLikeCount(data.likeCount)
      }
    } catch (err) {
      console.error('Error fetching like status:', err)
    }
  }

  const handleLikeToggle = async () => {
    if (liking) return
    
    setLiking(true)
    try {
      const response = await fetch(`/api/playlists/${playlistId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.liked)
        setLikeCount(data.likeCount)
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    } finally {
      setLiking(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/branches`)
      if (response.ok) {
        const data = await response.json()
        setBranches(data)
      }
    } catch (err) {
      console.error('Error fetching branches:', err)
    }
  }

  const handleFork = async () => {
    if (!playlistId) return

    setForking(true)
    try {
      const response = await fetch(`/api/playlists/${playlistId}/fork`, {
        method: 'POST',
      })

      if (response.ok) {
        const forkedPlaylist = await response.json()
        router.push(`/playlists/${forkedPlaylist.id}`)
      } else {
        const data = await response.json()
        setSyncMessage({
          type: 'error',
          text: data.error || 'Failed to fork playlist',
        })
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: 'Something went wrong while forking',
      })
    } finally {
      setForking(false)
    }
  }

  const handleDelete = async (deleteFromSpotify: boolean) => {
    if (!playlistId) return

    setDeleting(true)
    try {
      const response = await fetch(
        `/api/playlists/${playlistId}?deleteFromSpotify=${deleteFromSpotify}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setSyncMessage({
          type: 'error',
          text: data.error || 'Failed to delete playlist',
        })
        setShowDeleteModal(false)
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: 'Something went wrong while deleting',
      })
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}`)
      if (response.ok) {
        const data = await response.json()
        setPlaylist(data)
        // After loading playlist, check for changes if it has a Spotify ID
        if (data.spotifyId) {
          compareWithSpotify()
        }
      } else {
        setError('Failed to load playlist')
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

  // Compare local playlist with Spotify
  const compareWithSpotify = useCallback(async () => {
    if (!playlistId) return

    setComparingChanges(true)
    try {
      const response = await fetch('/api/spotify/compare-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId }),
      })

      if (response.ok) {
        const diffData = await response.json()
        setDiff(diffData)
      }
    } catch (err) {
      console.error('Error comparing playlists:', err)
    } finally {
      setComparingChanges(false)
    }
  }, [playlistId])

  // Import FROM Spotify (pull changes)
  const importFromSpotify = async () => {
    if (!playlistId) return

    setImporting(true)
    setSyncMessage(null)

    try {
      const response = await fetch('/api/spotify/import-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId }),
      })

      const data = await response.json()

      if (response.ok) {
        setSyncMessage({
          type: 'success',
          text: data.message || 'Changes imported from Spotify!',
        })
        // Refresh playlist and re-compare
        await fetchPlaylist()
        await compareWithSpotify()
      } else {
        setSyncMessage({
          type: 'error',
          text: data.error || 'Failed to import from Spotify',
        })
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: 'Something went wrong while importing',
      })
    } finally {
      setImporting(false)
    }
  }

  // Sync to Spotify (manual)
  const syncToSpotify = async () => {
    if (!playlistId) return

    setSyncing(true)
    setSyncMessage(null)

    try {
      const response = await fetch('/api/spotify/sync-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId }),
      })

      const data = await response.json()

      if (response.ok) {
        let successMessage = data.message
        if (data.wasRecreated) {
          successMessage = `Playlist was created on Spotify with ${data.tracksSync} tracks.`
          if (data.imageUploaded) {
            successMessage += ' Image updated.'
          }
        }
        
        setSyncMessage({
          type: 'success',
          text: successMessage || 'Playlist synced to Spotify!',
        })
        // Refresh playlist and re-compare
        await fetchPlaylist()
        await compareWithSpotify()
      } else {
        if (data.needsSpotifyConnection) {
          setSyncMessage({
            type: 'error',
            text: 'Please connect your Spotify account first.',
          })
        } else {
          setSyncMessage({
            type: 'error',
            text: data.error || 'Failed to sync playlist',
          })
        }
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error || 'Playlist not found'}</div>
          <Link href="/dashboard" className="spotify-button">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = session?.user?.id === playlist.owner.id
  const totalDuration = playlist.tracks.reduce((sum, t) => sum + t.track.duration, 0)

  // Determine sync status
  const getSyncStatus = () => {
    if (!playlist.spotifyId) {
      return { status: 'not_synced', label: 'Not on Spotify', color: 'gray' }
    }
    if (comparingChanges) {
      return { status: 'checking', label: 'Checking...', color: 'blue' }
    }
    if (!diff) {
      return { status: 'unknown', label: 'Unknown', color: 'gray' }
    }
    if (!diff.spotifyPlaylistExists) {
      return { status: 'deleted', label: 'Deleted on Spotify', color: 'red' }
    }
    if (!diff.spotifyPlaylistInLibrary) {
      return { status: 'removed', label: 'Removed from library', color: 'yellow' }
    }
    if (diff.inSync) {
      return { status: 'synced', label: 'In Sync', color: 'green' }
    }
    return { status: 'out_of_sync', label: 'Changes detected', color: 'yellow' }
  }

  const syncStatus = getSyncStatus()
  const hasChanges = diff && !diff.inSync

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-spotify-green/20 to-transparent p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard" className="text-gray-400 hover:text-white mb-4 inline-block">
            ← Back to Dashboard
          </Link>

          <div className="flex gap-8 items-end">
            <div className="w-48 h-48 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {playlist.imageUrl ? (
                <img
                  src={playlist.imageUrl}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
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
            </div>

            <div className="flex-1">
              <div className="text-sm font-semibold mb-2">PLAYLIST</div>
              <h1 className="text-5xl font-bold mb-4">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-gray-300 mb-4">{playlist.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Link 
                  href={`/users/${playlist.owner.id}`}
                  className="font-semibold hover:underline hover:text-spotify-green transition-colors"
                >
                  {playlist.owner.profile.displayName}
                </Link>
                <span>•</span>
                <span>{playlist.tracks.length} songs</span>
                <span>•</span>
                <span>{formatDuration(totalDuration)}</span>
              </div>
              {playlist.forkedFrom && (
                <div className="flex items-center gap-2 mt-2 text-sm text-purple-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>
                    Forked from{' '}
                    <Link href={`/playlists/${playlist.forkedFrom.id}`} className="hover:underline">
                      {playlist.forkedFrom.name}
                    </Link>
                    {' '}by{' '}
                    <Link href={`/users/${playlist.forkedFrom.owner.id}`} className="hover:underline">
                      {playlist.forkedFrom.owner.profile.displayName}
                    </Link>
                  </span>
                </div>
              )}
              <div className="flex gap-2 mt-4 flex-wrap">
                {playlist.isPublic && (
                  <span className="text-xs bg-spotify-green/20 text-spotify-green px-3 py-1 rounded-full">
                    Public
                  </span>
                )}
                {playlist.isCollaborative && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                    Collaborative
                  </span>
                )}
                {/* Sync status badge */}
                <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${
                  syncStatus.color === 'green' ? 'bg-green-500/20 text-green-400' :
                  syncStatus.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                  syncStatus.color === 'red' ? 'bg-red-500/20 text-red-400' :
                  syncStatus.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-zinc-700 text-gray-400'
                }`}>
                  {syncStatus.status === 'checking' && (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {syncStatus.status === 'synced' && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z" />
                    </svg>
                  )}
                  {syncStatus.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Like Button - available to everyone */}
          <button
            onClick={handleLikeToggle}
            disabled={liking}
            className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
              isLiked
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'border border-gray-600 text-gray-300 hover:bg-zinc-800 hover:border-red-500 hover:text-red-400'
            } disabled:opacity-50`}
            title={isLiked ? 'Unlike this playlist' : 'Like this playlist'}
          >
            {liking ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg 
                className="w-5 h-5" 
                fill={isLiked ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                />
              </svg>
            )}
            {likeCount > 0 ? likeCount : ''} {isLiked ? 'Liked' : 'Like'}
          </button>

          {isOwner && (
            <>
              <button 
                onClick={() => setShowEditModal(true)}
                className="spotify-button"
              >
                Edit Playlist
              </button>
              <button 
                onClick={() => setShowAddTrackModal(true)}
                className="px-6 py-3 rounded-full border border-gray-600 text-gray-300 font-semibold hover:bg-zinc-800 transition-colors"
              >
                Add Tracks
              </button>
              <button
                onClick={syncToSpotify}
                disabled={syncing}
                className={`px-6 py-3 rounded-full font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  hasChanges 
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                    : 'bg-spotify-green text-black hover:bg-green-400'
                }`}
                title={playlist.spotifyId 
                  ? 'Sync changes to Spotify. If the playlist was deleted on Spotify, it will be re-created automatically.'
                  : 'Create this playlist on your Spotify account'}
              >
                {syncing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    {playlist.spotifyId ? (hasChanges ? 'Sync Changes' : 'Sync to Spotify') : 'Save to Spotify'}
                  </>
                )}
              </button>
              {playlist.spotifyId && (
                <>
                  <button
                    onClick={() => compareWithSpotify()}
                    disabled={comparingChanges}
                    className="px-4 py-3 rounded-full border border-gray-600 text-gray-300 font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    title="Check for changes between local and Spotify"
                  >
                    {comparingChanges ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    Refresh
                  </button>
                  <a
                    href={`https://open.spotify.com/playlist/${playlist.spotifyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full border border-spotify-green text-spotify-green font-semibold hover:bg-spotify-green/10 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in Spotify
                  </a>
                </>
              )}
              {/* Delete button */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 rounded-full border border-red-500 text-red-400 font-semibold hover:bg-red-500/10 transition-colors flex items-center gap-2"
                title="Delete this playlist"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </>
          )}
          {!isOwner && (playlist.isPublic || playlist.isCollaborative) && (
            <>
              <button
                onClick={handleFork}
                disabled={forking}
                className="px-6 py-3 rounded-full border border-purple-500 text-purple-400 font-semibold hover:bg-purple-500/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="Create your own independent copy of this playlist"
              >
                {forking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Forking...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Fork Playlist
                  </>
                )}
              </button>
              {playlist.isCollaborative && (
                <button
                  onClick={() => setShowCreateBranchModal(true)}
                  className="px-6 py-3 rounded-full border border-blue-500 text-blue-400 font-semibold hover:bg-blue-500/10 transition-colors flex items-center gap-2"
                  title="Create a branch with your changes to suggest"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Create Branch
                </button>
              )}
            </>
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
            {syncMessage.type === 'error' && syncMessage.text.includes('connect') && (
              <Link href="/profile" className="ml-2 underline hover:no-underline">
                Go to Profile
              </Link>
            )}
            <button
              onClick={() => setSyncMessage(null)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Change Detection Panel */}
        {isOwner && diff && !diff.inSync && (
          <div className="mt-4 bg-zinc-800/50 rounded-lg border border-yellow-500/30">
            <button
              onClick={() => setShowDiffDetails(!showDiffDetails)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-700/30 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-yellow-400">
                    {!diff.spotifyPlaylistExists ? 'Playlist deleted on Spotify' :
                     !diff.spotifyPlaylistInLibrary ? 'Playlist removed from your Spotify library' :
                     'Changes detected between local and Spotify'}
                  </div>
                  <div className="text-sm text-gray-400">
                    {!diff.spotifyPlaylistExists || !diff.spotifyPlaylistInLibrary ? (
                      'Click "Sync to Spotify" to recreate the playlist'
                    ) : (
                      <>
                        {diff.tracksOnlyInLocal.length > 0 && `${diff.tracksOnlyInLocal.length} track(s) to push`}
                        {diff.tracksOnlyInLocal.length > 0 && diff.tracksOnlyInSpotify.length > 0 && ' • '}
                        {diff.tracksOnlyInSpotify.length > 0 && `${diff.tracksOnlyInSpotify.length} track(s) to pull`}
                        {(diff.metadataChanges.name || diff.metadataChanges.description) && 
                          (diff.tracksOnlyInLocal.length > 0 || diff.tracksOnlyInSpotify.length > 0 ? ' • ' : '') + 
                          'Metadata differs'}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${showDiffDetails ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDiffDetails && diff.spotifyPlaylistExists && diff.spotifyPlaylistInLibrary && (
              <div className="px-4 pb-4 space-y-4">
                {/* Spotify has changes - show import option prominently */}
                {(diff.spotifyHasChanges?.name || diff.spotifyHasChanges?.description || diff.tracksOnlyInSpotify.length > 0) && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z" />
                        </svg>
                        Changes on Spotify
                      </h4>
                      <button
                        onClick={importFromSpotify}
                        disabled={importing}
                        className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {importing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Import from Spotify
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      Spotify has updates. Import them to keep your local playlist in sync.
                      <strong className="text-blue-400"> Spotify changes take precedence.</strong>
                    </p>
                    
                    {/* Spotify metadata changes */}
                    {(diff.spotifyHasChanges?.name || diff.spotifyHasChanges?.description) && (
                      <div className="text-sm text-gray-400 mb-2">
                        {diff.spotifyHasChanges?.name && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Name changed to: "{diff.spotifyPlaylistName}"
                          </div>
                        )}
                        {diff.spotifyHasChanges?.description && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Description updated on Spotify
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tracks only on Spotify */}
                    {diff.tracksOnlyInSpotify.length > 0 && (
                      <div className="space-y-1">
                        {diff.tracksOnlyInSpotify.slice(0, 3).map((track) => (
                          <div key={track.spotifyId} className="text-sm text-gray-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            {track.title} - {track.artist}
                          </div>
                        ))}
                        {diff.tracksOnlyInSpotify.length > 3 && (
                          <div className="text-sm text-gray-500">
                            and {diff.tracksOnlyInSpotify.length - 3} more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata changes (general) */}
                {(diff.metadataChanges.name || diff.metadataChanges.description) && 
                 !(diff.spotifyHasChanges?.name || diff.spotifyHasChanges?.description) && (
                  <div className="bg-zinc-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Metadata Differences</h4>
                    {diff.metadataChanges.name && (
                      <div className="text-sm text-gray-400">
                        <span className="text-yellow-400">Name:</span> Local: "{playlist.name}" / Spotify: "{diff.spotifyPlaylistName}"
                      </div>
                    )}
                    {diff.metadataChanges.description && (
                      <div className="text-sm text-gray-400 mt-1">
                        <span className="text-yellow-400">Description:</span> Differs between local and Spotify
                      </div>
                    )}
                  </div>
                )}

                {/* Tracks only in local - these will be pushed */}
                {diff.tracksOnlyInLocal.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Local tracks to push to Spotify ({diff.tracksOnlyInLocal.length})
                    </h4>
                    <div className="space-y-2">
                      {diff.tracksOnlyInLocal.map((track) => (
                        <div key={track.id} className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          {track.title} - {track.artist}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tracks only on Spotify - but not if already shown above */}
                {diff.tracksOnlyInSpotify.length > 0 && 
                 !(diff.spotifyHasChanges?.name || diff.spotifyHasChanges?.description || diff.spotifyHasChanges?.tracks) && (
                  <div className="bg-zinc-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z" />
                      </svg>
                      Tracks only on Spotify ({diff.tracksOnlyInSpotify.length})
                    </h4>
                    <div className="space-y-2">
                      {diff.tracksOnlyInSpotify.map((track) => (
                        <div key={track.spotifyId} className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          {track.title} - {track.artist}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Note: These tracks were added on Spotify. Click &quot;Import from Spotify&quot; to add them locally, or &quot;Sync to Spotify&quot; to replace Spotify with your local tracks.
                    </p>
                  </div>
                )}

                {/* Track counts & last sync info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>Local: {diff.localTrackCount} tracks</span>
                  <span>•</span>
                  <span>Spotify: {diff.spotifyTrackCount} tracks</span>
                  {diff.lastSyncedAt && (
                    <>
                      <span>•</span>
                      <span>Last synced: {new Date(diff.lastSyncedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Branches Section */}
      {(branches.length > 0 || isOwner) && (
        <div className="max-w-7xl mx-auto px-8 mb-6">
          <button
            onClick={() => setShowBranches(!showBranches)}
            className="w-full bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 flex items-center justify-between hover:bg-zinc-800/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-blue-400 text-left">
                  {branches.length} Branch{branches.length !== 1 ? 'es' : ''}
                </div>
                <div className="text-sm text-gray-400 text-left">
                  User variations of this playlist
                </div>
              </div>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${showBranches ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showBranches && (
            <div className="mt-4 space-y-3">
              {branches.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No branches yet</p>
                  {!isOwner && playlist.isCollaborative && (
                    <button
                      onClick={() => setShowCreateBranchModal(true)}
                      className="mt-4 spotify-button-sm"
                    >
                      Create the first branch
                    </button>
                  )}
                </div>
              ) : (
                branches.map((branch) => (
                  <Link
                    key={branch.id}
                    href={`/playlists/${playlistId}/branches/${branch.id}`}
                    className="block bg-zinc-900/50 rounded-lg p-4 border border-zinc-700 hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {branch.owner.profile?.avatarUrl ? (
                          <img
                            src={branch.owner.profile.avatarUrl}
                            alt={branch.owner.profile.displayName}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm text-gray-400">
                            {branch.owner.profile?.displayName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white">
                            {branch.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            by {branch.owner.profile?.displayName} • {branch._count.tracks} tracks
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          branch.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                          branch.status === 'SUBMITTED' ? 'bg-yellow-500/20 text-yellow-400' :
                          branch.status === 'MERGED' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {branch.status}
                        </span>
                        {branch.pullRequest && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                            PR #{branch.pullRequest.id.slice(-4)}
                          </span>
                        )}
                      </div>
                    </div>
                    {branch.description && (
                      <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                        {branch.description}
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Tracks */}
      <div className="max-w-7xl mx-auto px-8 pb-8">
        <div className="bg-zinc-900/50 rounded-lg">
          {playlist.tracks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="mb-4">No tracks in this playlist yet</p>
              {isOwner && (
                <button 
                  onClick={() => setShowAddTrackModal(true)}
                  className="spotify-button"
                >
                  Add Your First Track
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-gray-400 border-b border-zinc-800">
                <div className="col-span-1">#</div>
                <div className="col-span-6">TITLE</div>
                <div className="col-span-3">ALBUM</div>
                <div className="col-span-2 text-right">DURATION</div>
              </div>

              {/* Tracks */}
              {playlist.tracks.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="col-span-1 flex items-center text-gray-400">
                    {index + 1}
                  </div>
                  <div className="col-span-6 flex items-center gap-3">
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
                      <div className="font-semibold truncate group-hover:text-spotify-green">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Track Modal */}
      {showAddTrackModal && (
        <AddTrackModal
          playlistId={playlistId}
          onClose={() => setShowAddTrackModal(false)}
          onSuccess={() => {
            setShowAddTrackModal(false)
            fetchPlaylist()
            // Re-compare after adding track
            if (playlist.spotifyId) {
              setTimeout(() => compareWithSpotify(), 500)
            }
          }}
        />
      )}

      {/* Edit Playlist Modal */}
      {showEditModal && playlist && (
        <EditPlaylistModal
          playlist={playlist}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchPlaylist()
            // Re-compare after editing
            if (playlist.spotifyId) {
              setTimeout(() => compareWithSpotify(), 500)
            }
          }}
        />
      )}

      {/* Create Branch Modal */}
      {showCreateBranchModal && (
        <CreateBranchModal
          playlistId={playlistId}
          onClose={() => setShowCreateBranchModal(false)}
          onSuccess={() => {
            setShowCreateBranchModal(false)
            fetchBranches()
          }}
        />
      )}

      {/* Delete Playlist Modal */}
      {showDeleteModal && playlist && (
        <DeletePlaylistModal
          playlist={playlist}
          deleting={deleting}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function CreateBranchModal({
  playlistId,
  onClose,
  onSuccess,
}: {
  playlistId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/playlists/${playlistId}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      })

      if (response.ok) {
        const branch = await response.json()
        onSuccess()
        router.push(`/playlists/${playlistId}/branches/${branch.id}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create branch')
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
          <h2 className="text-2xl font-bold">Create Branch</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          A branch lets you create your own version of this playlist with your preferred track order 
          and additions. You can later submit your changes as a pull request for the owner to review.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Branch Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="spotify-input w-full"
              placeholder="e.g., My Custom Order"
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
              placeholder="What changes are you planning to make?"
            />
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
              disabled={loading || !name.trim()}
              className="flex-1 px-6 py-3 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeletePlaylistModal({
  playlist,
  deleting,
  onClose,
  onDelete,
}: {
  playlist: Playlist
  deleting: boolean
  onClose: () => void
  onDelete: (deleteFromSpotify: boolean) => void
}) {
  const [deleteFromSpotify, setDeleteFromSpotify] = useState(true)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-500">Delete Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            disabled={deleting}
          >
            ×
          </button>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {playlist.imageUrl ? (
                <img src={playlist.imageUrl} alt={playlist.name} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              )}
            </div>
            <div>
              <div className="font-semibold text-white">{playlist.name}</div>
              <div className="text-sm text-gray-400">{playlist.tracks.length} tracks</div>
            </div>
          </div>
        </div>

        <p className="text-gray-300 mb-6">
          Are you sure you want to delete this playlist? This action cannot be undone.
        </p>

        {playlist.spotifyId && (
          <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteFromSpotify}
                onChange={(e) => setDeleteFromSpotify(e.target.checked)}
                className="w-5 h-5 accent-red-500 rounded mt-0.5"
              />
              <div>
                <span className="text-sm text-gray-300 font-medium">
                  Also remove from Spotify
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  This will unfollow the playlist from your Spotify library. 
                  Note: Spotify doesn't permanently delete playlists, but it will be removed from your library.
                </p>
              </div>
            </label>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-6 py-3 rounded-full border border-gray-600 text-gray-300 font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(deleteFromSpotify)}
            disabled={deleting}
            className="flex-1 px-6 py-3 rounded-full bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Playlist
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
