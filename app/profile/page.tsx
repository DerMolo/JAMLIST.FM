'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ActivityLog {
  id: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: {
    playlistName?: string
    trackTitle?: string
    [key: string]: unknown
  }
  createdAt: string
}

interface SpotifyConnection {
  connected: boolean
  verified: boolean
  needsReconnect: boolean
  spotifyDisplayName?: string
}

interface UserProfile {
  id: string
  email: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  hasSpotifyConnected: boolean
  spotifyConnection?: SpotifyConnection
  createdAt: string
  stats?: {
    totalPlaylists: number
    totalTracks: number
    contributions: number
    pullRequests: number
  }
  activity?: ActivityLog[]
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status])

  useEffect(() => {
    // Check for Spotify connection success/error
    const spotifyParam = searchParams.get('spotify')
    const errorParam = searchParams.get('error')
    
    if (spotifyParam === 'connected') {
      setMessage('Spotify account connected successfully!')
      setTimeout(() => setMessage(''), 5000)
      fetchProfile()
    } else if (errorParam) {
      setMessage('Failed to connect Spotify account. Please try again.')
      setTimeout(() => setMessage(''), 5000)
    }
  }, [searchParams])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectSpotify = async () => {
    try {
      const response = await fetch('/api/user/connect-spotify')
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error connecting Spotify:', error)
      setMessage('Failed to connect Spotify. Please try again.')
    }
  }

  const handleDisconnectSpotify = async () => {
    if (!confirm('Are you sure you want to disconnect your Spotify account? Your playlists will remain, but you won\'t be able to sync them to Spotify.')) {
      return
    }
    
    try {
      const response = await fetch('/api/user/verify-spotify', {
        method: 'DELETE',
      })
      if (response.ok) {
        setMessage('Spotify account disconnected successfully.')
        fetchProfile()
        setTimeout(() => setMessage(''), 5000)
      } else {
        setMessage('Failed to disconnect Spotify account.')
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error disconnecting Spotify:', error)
      setMessage('Failed to disconnect Spotify. Please try again.')
    }
  }

  // Helper to get Spotify connection status display
  const getSpotifyStatus = () => {
    const conn = profile?.spotifyConnection
    if (!conn?.connected) {
      return { status: 'not_connected', label: 'Not Connected', color: 'yellow' }
    }
    if (conn.needsReconnect) {
      return { status: 'needs_reconnect', label: 'Needs Reconnection', color: 'red' }
    }
    if (conn.verified) {
      return { status: 'verified', label: 'Verified', color: 'green' }
    }
    return { status: 'unverified', label: 'Connected', color: 'yellow' }
  }

  const spotifyStatus = getSpotifyStatus()

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spotify-spinner w-12 h-12 border-4"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen spotify-gradient-dark text-white p-8">
      <div className="spotify-container">
        <Link href="/dashboard" className="spotify-link-muted mb-6 inline-block animate-fade-in">
          ← Back to Dashboard
        </Link>

        {message && (
          <div className={`spotify-alert ${message.includes('success') ? 'spotify-alert-success' : 'spotify-alert-error'} mb-6 animate-slide-down`}>
            {message}
          </div>
        )}

        <div className="spotify-card-lg mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-spotify-green flex items-center justify-center text-4xl font-bold shadow-lg shadow-spotify-green/30 animate-scale-in">
              {profile?.displayName?.[0]?.toUpperCase() || session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="spotify-header">{profile?.displayName || session?.user?.name || 'User'}</h1>
              <p className="spotify-description">{profile?.email || session?.user?.email}</p>
              {profile?.bio && (
                <p className="text-gray-400 mt-2 italic">{profile.bio}</p>
              )}
              <div className="flex gap-2 mt-3 justify-center sm:justify-start flex-wrap">
                <div className="spotify-badge spotify-badge-green">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Active User
                </div>
                {spotifyStatus.status === 'verified' ? (
                  <div className="spotify-badge spotify-badge-green">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2z" />
                    </svg>
                    Spotify Connected
                    {profile?.spotifyConnection?.spotifyDisplayName && (
                      <span className="ml-1 text-xs opacity-80">
                        ({profile.spotifyConnection.spotifyDisplayName})
                      </span>
                    )}
                  </div>
                ) : spotifyStatus.status === 'needs_reconnect' ? (
                  <div className="spotify-badge bg-red-500/20 text-red-400">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Spotify Needs Reconnection
                  </div>
                ) : (
                  <div className="spotify-badge bg-yellow-500/20 text-yellow-400">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    No Spotify
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="spotify-stats-card spotify-hover-lift">
              <h3 className="text-lg font-semibold mb-2 text-spotify-green">Spotify Status</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  spotifyStatus.status === 'verified' ? 'bg-green-500' :
                  spotifyStatus.status === 'needs_reconnect' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`} />
                <p className="spotify-description">
                  {spotifyStatus.status === 'verified' && 'Connected & Verified'}
                  {spotifyStatus.status === 'needs_reconnect' && 'Needs Reconnection'}
                  {spotifyStatus.status === 'not_connected' && 'Not Connected'}
                  {spotifyStatus.status === 'unverified' && 'Connected (Unverified)'}
                </p>
              </div>
              {profile?.spotifyConnection?.spotifyDisplayName && (
                <p className="text-sm text-gray-500 mt-1">
                  as {profile.spotifyConnection.spotifyDisplayName}
                </p>
              )}
            </div>
            <div className="spotify-stats-card spotify-hover-lift">
              <h3 className="text-lg font-semibold mb-2 text-spotify-green">Member Since</h3>
              <p className="spotify-description">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently Joined'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Spotify Connection Warning Banner */}
            {spotifyStatus.status === 'needs_reconnect' && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-2">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium text-red-400">Spotify Connection Expired</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Your Spotify connection has expired or been revoked. Please reconnect to continue syncing playlists.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Spotify Connect/Reconnect Button */}
            {(spotifyStatus.status === 'not_connected' || spotifyStatus.status === 'needs_reconnect') && (
              <button 
                onClick={handleConnectSpotify}
                className="w-full spotify-button"
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2z" />
                </svg>
                {spotifyStatus.status === 'needs_reconnect' ? 'Reconnect Spotify' : 'Connect Spotify Account'}
              </button>
            )}
            
            {/* Spotify Disconnect Button */}
            {spotifyStatus.status === 'verified' && (
              <button 
                onClick={handleDisconnectSpotify}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded-full transition-all duration-200"
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2z" />
                </svg>
                Disconnect Spotify
              </button>
            )}
            
            <button onClick={() => setShowEditModal(true)} className="w-full spotify-button-secondary">
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
            <button onClick={() => setShowSettings(true)} className="w-full spotify-button-secondary">
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-100 shadow-lg"
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="spotify-card-lg animate-slide-up">
            <h2 className="spotify-subheader">
              <svg className="w-6 h-6 inline-block mr-2 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Statistics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-lg">
                <span className="spotify-description">Playlists Created</span>
                <span className="text-xl font-bold text-spotify-green">{profile?.stats?.totalPlaylists || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-lg">
                <span className="spotify-description">Collaborations</span>
                <span className="text-xl font-bold text-spotify-green">{profile?.stats?.contributions || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-lg">
                <span className="spotify-description">Pull Requests</span>
                <span className="text-xl font-bold text-spotify-green">{profile?.stats?.pullRequests || 0}</span>
              </div>
            </div>
          </div>

          <div className="spotify-card-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="spotify-subheader">
              <svg className="w-6 h-6 inline-block mr-2 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Activity
            </h2>
            {profile?.activity && profile.activity.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {profile.activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-spotify-green/20 flex items-center justify-center flex-shrink-0">
                      {item.action === 'created_playlist' && (
                        <svg className="w-4 h-4 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                      {item.action === 'added_track' && (
                        <svg className="w-4 h-4 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      )}
                      {item.action === 'updated_playlist' && (
                        <svg className="w-4 h-4 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                      {!['created_playlist', 'added_track', 'updated_playlist'].includes(item.action) && (
                        <svg className="w-4 h-4 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        {item.action === 'created_playlist' && (
                          <>Created playlist <span className="text-spotify-green">{item.metadata?.playlistName || 'Untitled'}</span></>
                        )}
                        {item.action === 'added_track' && (
                          <>Added <span className="text-spotify-green">{item.metadata?.trackTitle || 'a track'}</span> to playlist</>
                        )}
                        {item.action === 'updated_playlist' && (
                          <>Updated playlist settings</>
                        )}
                        {item.action === 'removed_track' && (
                          <>Removed a track from playlist</>
                        )}
                        {!['created_playlist', 'added_track', 'updated_playlist', 'removed_track'].includes(item.action) && (
                          <>{item.action.replace(/_/g, ' ')}</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="spotify-description">No recent activity</p>
                <p className="text-sm text-gray-500 mt-2">Start creating playlists to see your activity here!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchProfile()
            setMessage('Profile updated successfully!')
            setTimeout(() => setMessage(''), 5000)
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function EditProfileModal({
  profile,
  onClose,
  onSuccess,
}: {
  profile: UserProfile | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          bio,
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="spotify-modal-backdrop">
      <div className="spotify-modal animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="spotify-modal-header">Edit Profile</h2>
          <button
            onClick={onClose}
            className="spotify-button-icon text-2xl text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="spotify-alert spotify-alert-error">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="spotify-input"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="spotify-textarea"
              rows={4}
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 spotify-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 spotify-button"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="spotify-modal-backdrop">
      <div className="spotify-modal-lg animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="spotify-modal-header">Settings</h2>
          <button
            onClick={onClose}
            className="spotify-button-icon text-2xl text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account Settings
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-400">Receive updates about your playlists</p>
                </div>
                <input type="checkbox" className="spotify-checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="font-medium">Public Profile</p>
                  <p className="text-sm text-gray-400">Make your profile visible to others</p>
                </div>
                <input type="checkbox" className="spotify-checkbox" defaultChecked />
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Privacy
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="font-medium">Show Activity</p>
                  <p className="text-sm text-gray-400">Let others see what you're listening to</p>
                </div>
                <input type="checkbox" className="spotify-checkbox" />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="font-medium">Private Session</p>
                  <p className="text-sm text-gray-400">Hide your activity temporarily</p>
                </div>
                <input type="checkbox" className="spotify-checkbox" />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-red-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Danger Zone
            </h3>
            <div className="space-y-3">
              <button className="w-full p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-left hover:bg-red-500/20 transition-colors">
                <p className="font-medium text-red-400">Delete Account</p>
                <p className="text-sm text-gray-400">Permanently delete your account and all data</p>
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button onClick={onClose} className="w-full spotify-button">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

