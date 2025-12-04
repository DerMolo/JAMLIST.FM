'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Playlist {
  id: string
  name: string
  description?: string
  imageUrl?: string
  isPublic: boolean
  isCollaborative: boolean
  createdAt: string
  trackCount: number
  likeCount: number
  forkCount: number
}

interface Contribution {
  role: string
  addedAt: string
  playlist: {
    id: string
    name: string
    description?: string
    imageUrl?: string
    isPublic: boolean
    ownerName: string
    ownerId: string
    trackCount: number
    likeCount: number
  }
}

interface UserProfile {
  id: string
  displayName: string
  bio?: string
  avatarUrl?: string
  bannerUrl?: string
  memberSince: string
  isOwnProfile: boolean
  stats: {
    publicPlaylists: number
    totalPlaylists: number
    contributions: number
    mergedPullRequests: number
  }
  playlists: Playlist[]
  contributions: Contribution[]
}

type TabType = 'playlists' | 'contributions'

export default function PublicProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('playlists')

  useEffect(() => {
    if (userId) {
      fetchProfile()
    }
  }, [userId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found')
        } else {
          setError('Failed to load profile')
        }
        return
      }
      
      const data = await response.json()
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="spotify-spinner w-12 h-12 border-4"></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-2">{error || 'User not found'}</h1>
          <p className="text-gray-400 mb-6">This profile doesn't exist or is private.</p>
          <Link href="/browse" className="spotify-button inline-block">
            Browse Playlists
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* Profile Header */}
      <div 
        className="relative h-64 bg-gradient-to-b from-spotify-green/30 to-transparent"
        style={profile.bannerUrl ? { 
          backgroundImage: `url(${profile.bannerUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900" />
      </div>

      <div className="px-8 -mt-32 relative z-10">
        <div className="spotify-container">
          {/* Profile Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8">
            <div className="w-40 h-40 rounded-full bg-zinc-800 flex items-center justify-center text-6xl font-bold shadow-2xl border-4 border-zinc-900 overflow-hidden flex-shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-spotify-green">
                  {profile.displayName[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <div className="text-sm font-semibold text-gray-400 mb-1">PROFILE</div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-2">{profile.displayName}</h1>
              {profile.bio && (
                <p className="text-gray-300 mb-3 max-w-2xl">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-400 justify-center sm:justify-start flex-wrap">
                <span>{profile.stats.publicPlaylists} public playlist{profile.stats.publicPlaylists !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{profile.stats.contributions} contribution{profile.stats.contributions !== 1 ? 's' : ''}</span>
                {profile.stats.mergedPullRequests > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-spotify-green">{profile.stats.mergedPullRequests} merged PR{profile.stats.mergedPullRequests !== 1 ? 's' : ''}</span>
                  </>
                )}
                <span>•</span>
                <span>Member since {new Date(profile.memberSince).toLocaleDateString()}</span>
              </div>
            </div>

            {profile.isOwnProfile && (
              <Link 
                href="/profile" 
                className="spotify-button-secondary px-6 py-2"
              >
                Edit Profile
              </Link>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-spotify-green">{profile.stats.publicPlaylists}</div>
              <div className="text-sm text-gray-400">Playlists</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{profile.stats.contributions}</div>
              <div className="text-sm text-gray-400">Contributions</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{profile.stats.mergedPullRequests}</div>
              <div className="text-sm text-gray-400">Merged PRs</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {profile.playlists.reduce((sum, p) => sum + p.likeCount, 0)}
              </div>
              <div className="text-sm text-gray-400">Total Likes</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-zinc-800 mb-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('playlists')}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'playlists' 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Playlists
                {activeTab === 'playlists' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-spotify-green" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('contributions')}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'contributions' 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Contributions
                {activeTab === 'contributions' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-spotify-green" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'playlists' && (
            <div>
              {profile.playlists.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-gray-400 text-lg">No public playlists yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {profile.playlists.map(playlist => (
                    <Link
                      key={playlist.id}
                      href={`/playlists/${playlist.id}`}
                      className="group bg-zinc-800/30 rounded-lg p-4 hover:bg-zinc-800/50 transition-all duration-200"
                    >
                      <div className="aspect-square bg-zinc-700 rounded-md mb-3 overflow-hidden relative">
                        {playlist.imageUrl ? (
                          <img 
                            src={playlist.imageUrl} 
                            alt={playlist.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}
                        {/* Play button overlay */}
                        <div className="absolute bottom-2 right-2 w-10 h-10 bg-spotify-green rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="font-semibold text-white truncate mb-1">{playlist.name}</h3>
                      <p className="text-sm text-gray-400">
                        {playlist.trackCount} track{playlist.trackCount !== 1 ? 's' : ''}
                        {playlist.likeCount > 0 && ` • ${playlist.likeCount} ❤️`}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {playlist.isCollaborative && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                            Collab
                          </span>
                        )}
                        {playlist.forkCount > 0 && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                            {playlist.forkCount} fork{playlist.forkCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contributions' && (
            <div>
              {profile.contributions.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-400 text-lg">No contributions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.contributions.map((contribution, idx) => (
                    <Link
                      key={`${contribution.playlist.id}-${idx}`}
                      href={`/playlists/${contribution.playlist.id}`}
                      className="flex items-center gap-4 p-4 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="w-16 h-16 bg-zinc-700 rounded flex-shrink-0 overflow-hidden">
                        {contribution.playlist.imageUrl ? (
                          <img 
                            src={contribution.playlist.imageUrl} 
                            alt={contribution.playlist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{contribution.playlist.name}</h3>
                        <p className="text-sm text-gray-400">
                          by {contribution.playlist.ownerName} • {contribution.playlist.trackCount} tracks
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            contribution.role === 'OWNER' 
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : contribution.role === 'COLLABORATOR'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {contribution.role}
                          </span>
                          <span className="text-xs text-gray-500">
                            Joined {new Date(contribution.addedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

