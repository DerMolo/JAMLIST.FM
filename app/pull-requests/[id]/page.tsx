'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Track {
  id: string
  spotifyId: string
  title: string
  artist: string
  album?: string
  duration: number
  imageUrl?: string
}

interface PullRequest {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED'
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    profile: {
      displayName: string
      avatarUrl?: string
    }
  }
  owner: {
    id: string
    profile: {
      displayName: string
    }
  }
  playlist: {
    id: string
    name: string
    imageUrl?: string
    tracks: Array<{
      id: string
      position: number
      track: Track
    }>
  }
  branch?: {
    id: string
    name: string
  }
  diff?: {
    id: string
    trackChanges?: {
      additions?: Track[]
      removals?: string[]
      branchTracks?: Array<{
        trackId: string
        spotifyId: string
        position: number
      }>
    }
    metadataChanges?: {
      name?: { from: string; to: string }
      description?: { from: string; to: string }
    }
  }
}

export default function PullRequestDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const prId = params?.id as string

  const [pullRequest, setPullRequest] = useState<PullRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (prId && status === 'authenticated') {
      fetchPullRequest()
    }
  }, [prId, status])

  const fetchPullRequest = async () => {
    try {
      const response = await fetch(`/api/pull-requests/${prId}`)
      if (response.ok) {
        const data = await response.json()
        setPullRequest(data)
      } else if (response.status === 404) {
        setError('Pull request not found')
      } else if (response.status === 403) {
        setError('You do not have access to this pull request')
      } else {
        setError('Failed to load pull request')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'APPROVED' | 'REJECTED' | 'MERGED') => {
    if (!pullRequest) return

    setActionLoading(action)
    setActionMessage(null)

    try {
      const response = await fetch(`/api/pull-requests/${prId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: action }),
      })

      if (response.ok) {
        const actionLabels = {
          APPROVED: 'approved',
          REJECTED: 'rejected',
          MERGED: 'merged',
        }
        setActionMessage({
          type: 'success',
          text: `Pull request ${actionLabels[action]} successfully!`,
        })
        fetchPullRequest()
      } else {
        const data = await response.json()
        setActionMessage({
          type: 'error',
          text: data.error || `Failed to ${action.toLowerCase()} pull request`,
        })
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: 'Something went wrong',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'APPROVED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'MERGED':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      case 'APPROVED':
      case 'MERGED':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'REJECTED':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="spotify-spinner w-12 h-12 border-4"></div>
      </div>
    )
  }

  if (error || !pullRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-2">{error || 'Pull request not found'}</h1>
          <p className="text-gray-400 mb-6">This pull request doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/pull-requests" className="spotify-button inline-block">
            Back to Pull Requests
          </Link>
        </div>
      </div>
    )
  }

  const isCreator = session?.user?.id === pullRequest.creator.id
  const isOwner = session?.user?.id === pullRequest.owner.id
  const canTakeAction = isOwner && pullRequest.status === 'PENDING'

  // Calculate diff summary
  const trackAdditions = pullRequest.diff?.trackChanges?.additions?.length || 0
  const trackRemovals = pullRequest.diff?.trackChanges?.removals?.length || 0
  const branchTracks = pullRequest.diff?.trackChanges?.branchTracks || []
  const hasMetadataChanges = pullRequest.diff?.metadataChanges && 
    (pullRequest.diff.metadataChanges.name || pullRequest.diff.metadataChanges.description)
  const hasNoChanges = trackAdditions === 0 && trackRemovals === 0 && branchTracks.length === 0 && !hasMetadataChanges

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900/20 via-zinc-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-500/20 to-transparent p-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/pull-requests" className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Pull Requests
          </Link>

          <div className="flex gap-6 items-start mt-4">
            <div className="w-24 h-24 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {pullRequest.playlist.imageUrl ? (
                <img
                  src={pullRequest.playlist.imageUrl}
                  alt={pullRequest.playlist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-12 h-12 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-purple-400 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                PULL REQUEST
              </div>
              <h1 className="text-3xl font-bold mb-2">{pullRequest.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
                <Link 
                  href={`/users/${pullRequest.creator.id}`}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  {pullRequest.creator.profile?.avatarUrl ? (
                    <img 
                      src={pullRequest.creator.profile.avatarUrl} 
                      alt="" 
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                      {pullRequest.creator.profile?.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  {pullRequest.creator.profile?.displayName}
                </Link>
                <span>wants to merge into</span>
                <Link 
                  href={`/playlists/${pullRequest.playlist.id}`}
                  className="text-purple-400 hover:underline"
                >
                  {pullRequest.playlist.name}
                </Link>
              </div>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${getStatusColor(pullRequest.status)}`}>
                  {getStatusIcon(pullRequest.status)}
                  {pullRequest.status}
                </span>
                {pullRequest.branch && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                    from branch: {pullRequest.branch.name}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Created {new Date(pullRequest.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Action Message */}
        {actionMessage && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${
              actionMessage.type === 'success'
                ? 'bg-green-500/10 border border-green-500 text-green-400'
                : 'bg-red-500/10 border border-red-500 text-red-400'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {actionMessage.text}
            <button
              onClick={() => setActionMessage(null)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Actions */}
        {canTakeAction && (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Review Actions</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleAction('MERGED')}
                disabled={actionLoading !== null}
                className="px-6 py-3 rounded-full bg-green-600 text-white font-semibold hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === 'MERGED' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Merge
              </button>
              <button
                onClick={() => handleAction('APPROVED')}
                disabled={actionLoading !== null}
                className="px-6 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === 'APPROVED' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                )}
                Approve
              </button>
              <button
                onClick={() => handleAction('REJECTED')}
                disabled={actionLoading !== null}
                className="px-6 py-3 rounded-full border border-red-500 text-red-400 font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === 'REJECTED' ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        {pullRequest.description && (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{pullRequest.description}</p>
          </div>
        )}

        {/* No Changes Warning */}
        {hasNoChanges && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-semibold text-yellow-400">No Changes Detected</h4>
                <p className="text-sm text-gray-400">This pull request contains the same tracks as the main playlist. No changes will be applied if merged.</p>
              </div>
            </div>
          </div>
        )}

        {/* Changes Summary */}
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Changes</h3>
          
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">+{trackAdditions}</div>
              <div className="text-sm text-gray-400">Additions</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">-{trackRemovals}</div>
              <div className="text-sm text-gray-400">Removals</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{branchTracks.length}</div>
              <div className="text-sm text-gray-400">Branch Tracks</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{hasMetadataChanges ? '✓' : '—'}</div>
              <div className="text-sm text-gray-400">Metadata Changes</div>
            </div>
          </div>

          {/* Track Additions */}
          {pullRequest.diff?.trackChanges?.additions && pullRequest.diff.trackChanges.additions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tracks to Add ({pullRequest.diff.trackChanges.additions.length})
              </h4>
              <div className="space-y-2">
                {pullRequest.diff.trackChanges.additions.map((track) => (
                  <div key={track.id || track.spotifyId} className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    {track.imageUrl && (
                      <img src={track.imageUrl} alt="" className="w-10 h-10 rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{track.title}</div>
                      <div className="text-sm text-gray-400 truncate">{track.artist}</div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDuration(track.duration)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Track Removals */}
          {pullRequest.diff?.trackChanges?.removals && pullRequest.diff.trackChanges.removals.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Tracks to Remove ({pullRequest.diff.trackChanges.removals.length})
              </h4>
              <div className="space-y-2">
                {pullRequest.diff.trackChanges.removals.map((trackId) => {
                  const track = pullRequest.playlist.tracks.find(t => t.track.id === trackId)?.track
                  return (
                    <div key={trackId} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                      {track?.imageUrl && (
                        <img src={track.imageUrl} alt="" className="w-10 h-10 rounded opacity-50" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate text-gray-400">{track?.title || trackId}</div>
                        <div className="text-sm text-gray-500 truncate">{track?.artist}</div>
                      </div>
                      {track?.duration && (
                        <div className="text-sm text-gray-500">
                          {formatDuration(track.duration)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Metadata Changes */}
          {hasMetadataChanges && (
            <div>
              <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Metadata Changes
              </h4>
              <div className="space-y-2">
                {pullRequest.diff?.metadataChanges?.name && (
                  <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Name</div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 line-through">{pullRequest.diff.metadataChanges.name.from}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-green-400">{pullRequest.diff.metadataChanges.name.to}</span>
                    </div>
                  </div>
                )}
                {pullRequest.diff?.metadataChanges?.description && (
                  <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Description</div>
                    <div className="text-sm">
                      <div className="text-red-400 line-through mb-1">{pullRequest.diff.metadataChanges.description.from || '(empty)'}</div>
                      <div className="text-green-400">{pullRequest.diff.metadataChanges.description.to || '(empty)'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current Playlist Tracks */}
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
          <h3 className="text-lg font-semibold mb-4">Current Playlist Tracks ({pullRequest.playlist.tracks.length})</h3>
          <div className="divide-y divide-zinc-700/50">
            {pullRequest.playlist.tracks.slice(0, 10).map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="w-8 text-center text-gray-500 text-sm">{index + 1}</div>
                {item.track.imageUrl && (
                  <img src={item.track.imageUrl} alt="" className="w-10 h-10 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{item.track.title}</div>
                  <div className="text-sm text-gray-400 truncate">{item.track.artist}</div>
                </div>
                <div className="text-sm text-gray-400">
                  {formatDuration(item.track.duration)}
                </div>
              </div>
            ))}
            {pullRequest.playlist.tracks.length > 10 && (
              <div className="py-4 text-center text-gray-400 text-sm">
                and {pullRequest.playlist.tracks.length - 10} more tracks...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

