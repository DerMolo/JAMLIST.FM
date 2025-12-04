'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PullRequest {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED'
  createdAt: string
  creator: {
    profile: {
      displayName: string
    }
  }
  playlist: {
    id: string
    name: string
    imageUrl?: string
  }
}

export default function PullRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'received' | 'created'>('received')
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPullRequests()
    }
  }, [status, tab])

  const fetchPullRequests = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/pull-requests?type=${tab}`)
      if (response.ok) {
        const data = await response.json()
        setPullRequests(data)
      }
    } catch (error) {
      console.error('Error fetching pull requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'spotify-badge-yellow'
      case 'APPROVED':
        return 'spotify-badge-blue'
      case 'MERGED':
        return 'spotify-badge-green'
      case 'REJECTED':
        return 'spotify-badge-red'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      case 'APPROVED':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'MERGED':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'REJECTED':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

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

        <div className="flex items-center gap-4 mb-8 animate-slide-up">
          <svg className="w-10 h-10 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h1 className="spotify-header">Pull Requests</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-zinc-800 animate-slide-up">
          <button
            onClick={() => setTab('received')}
            className={`spotify-nav-item px-6 py-3 -mb-px ${
              tab === 'received'
                ? 'spotify-nav-item-active border-b-2 border-spotify-green'
                : ''
            }`}
          >
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Received
          </button>
          <button
            onClick={() => setTab('created')}
            className={`spotify-nav-item px-6 py-3 -mb-px ${
              tab === 'created'
                ? 'spotify-nav-item-active border-b-2 border-spotify-green'
                : ''
            }`}
          >
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Created by Me
          </button>
        </div>

        {/* Pull Requests List */}
        {pullRequests.length === 0 ? (
          <div className="text-center py-16 spotify-card-lg animate-scale-in">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="spotify-description text-lg mb-2">
              {tab === 'received'
                ? 'No pull requests received yet'
                : "You haven't created any pull requests yet"}
            </p>
            <p className="text-sm text-gray-500">
              {tab === 'received'
                ? 'Pull requests for your playlists will appear here'
                : 'Collaborate on playlists by creating pull requests'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pullRequests.map((pr, index) => (
              <Link
                key={pr.id}
                href={`/pull-requests/${pr.id}`}
                className="block spotify-card spotify-hover-lift animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="spotify-image-container w-16 h-16 flex-shrink-0">
                    {pr.playlist.imageUrl ? (
                      <img
                        src={pr.playlist.imageUrl}
                        alt={pr.playlist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-8 h-8 text-gray-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold hover:text-spotify-green transition-colors">
                        {pr.title}
                      </h3>
                      <span className={`spotify-badge ${getStatusColor(pr.status)} flex items-center gap-1`}>
                        {getStatusIcon(pr.status)}
                        {pr.status}
                      </span>
                    </div>
                    <p className="spotify-description text-sm mb-2 truncate-2">
                      {pr.description || 'No description provided'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        {pr.playlist.name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {pr.creator.profile.displayName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(pr.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400 flex-shrink-0">
                    <svg
                      className="w-6 h-6 group-hover:text-spotify-green transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

