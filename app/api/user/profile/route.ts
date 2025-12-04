import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to verify Spotify connection is still valid
async function verifySpotifyConnection(user: {
  spotifyId: string | null
  spotifyAccessToken: string | null
  spotifyRefreshToken: string | null
  spotifyTokenExpiresAt: Date | null
}, userId: string): Promise<{
  connected: boolean
  verified: boolean
  needsReconnect: boolean
  spotifyDisplayName?: string
}> {
  // Not connected at all
  if (!user.spotifyId || !user.spotifyAccessToken) {
    return { connected: false, verified: false, needsReconnect: false }
  }

  let accessToken = user.spotifyAccessToken

  // Check if token is expired
  const isExpired = user.spotifyTokenExpiresAt && new Date(user.spotifyTokenExpiresAt) < new Date()
  
  if (isExpired && user.spotifyRefreshToken) {
    // Try to refresh the token
    try {
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: user.spotifyRefreshToken,
        }),
      })

      if (tokenResponse.ok) {
        const tokens = await tokenResponse.json()
        accessToken = tokens.access_token
        
        // Update database with new token
        await prisma.user.update({
          where: { id: userId },
          data: {
            spotifyAccessToken: tokens.access_token,
            spotifyTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            ...(tokens.refresh_token && { spotifyRefreshToken: tokens.refresh_token }),
          },
        })
      } else {
        // Refresh failed - needs reconnection
        return { connected: true, verified: false, needsReconnect: true }
      }
    } catch {
      return { connected: true, verified: false, needsReconnect: true }
    }
  } else if (isExpired) {
    // No refresh token available
    return { connected: true, verified: false, needsReconnect: true }
  }

  // Verify token with Spotify API
  try {
    const verifyResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (verifyResponse.ok) {
      const spotifyUser = await verifyResponse.json()
      return {
        connected: true,
        verified: true,
        needsReconnect: false,
        spotifyDisplayName: spotifyUser.display_name,
      }
    } else if (verifyResponse.status === 401) {
      // Token invalid - needs reconnection
      return { connected: true, verified: false, needsReconnect: true }
    }
  } catch {
    // API error - assume still connected but couldn't verify
    return { connected: true, verified: false, needsReconnect: false }
  }

  return { connected: true, verified: false, needsReconnect: false }
}

// GET /api/user/profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        spotifyId: true,
        spotifyAccessToken: true,
        spotifyRefreshToken: true,
        spotifyTokenExpiresAt: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
            avatarUrl: true,
          },
        },
        stats: {
          select: {
            totalPlaylists: true,
            totalTracks: true,
            totalListeningTime: true,
          },
        },
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify Spotify connection
    const spotifyStatus = await verifySpotifyConnection({
      spotifyId: user.spotifyId,
      spotifyAccessToken: user.spotifyAccessToken,
      spotifyRefreshToken: user.spotifyRefreshToken,
      spotifyTokenExpiresAt: user.spotifyTokenExpiresAt,
    }, session.user.id)

    // Get activity logs (last 10)
    const activityLogs = await prisma.activityLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    })

    // Count playlists for stats if UserStats doesn't exist
    const playlistCount = await prisma.internalPlaylist.count({
      where: { ownerId: session.user.id },
    })

    // Count contributions
    const contributionCount = await prisma.playlistContributor.count({
      where: { userId: session.user.id },
    })

    // Count pull requests
    const pullRequestCount = await prisma.pullRequest.count({
      where: { creatorId: session.user.id },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.profile?.displayName || null,
      bio: user.profile?.bio || null,
      avatarUrl: user.profile?.avatarUrl || null,
      // Enhanced Spotify connection info
      hasSpotifyConnected: spotifyStatus.connected && spotifyStatus.verified,
      spotifyConnection: {
        connected: spotifyStatus.connected,
        verified: spotifyStatus.verified,
        needsReconnect: spotifyStatus.needsReconnect,
        spotifyDisplayName: spotifyStatus.spotifyDisplayName,
      },
      createdAt: user.createdAt,
      stats: {
        totalPlaylists: user.stats?.totalPlaylists || playlistCount,
        totalTracks: user.stats?.totalTracks || 0,
        totalListeningTime: user.stats?.totalListeningTime || 0,
        contributions: contributionCount,
        pullRequests: pullRequestCount,
      },
      activity: activityLogs,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PATCH /api/user/profile
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { displayName, bio, avatarUrl } = body

    // Update profile
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      update: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      create: {
        userId: session.user.id,
        displayName: displayName || session.user.email || 'User',
        bio: bio || null,
        avatarUrl: avatarUrl || null,
      },
    })

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

