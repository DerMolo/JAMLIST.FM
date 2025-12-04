import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/spotify/playlists - Fetch user's playlists from Spotify
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Spotify access token from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        spotifyAccessToken: true,
        spotifyRefreshToken: true,
        spotifyTokenExpiresAt: true,
      },
    })

    if (!user?.spotifyAccessToken) {
      return NextResponse.json(
        { error: 'Spotify not connected', needsSpotifyConnection: true },
        { status: 403 }
      )
    }

    // Check if token is expired and needs refresh
    let accessToken = user.spotifyAccessToken
    if (user.spotifyTokenExpiresAt && new Date(user.spotifyTokenExpiresAt) < new Date()) {
      if (!user.spotifyRefreshToken) {
        return NextResponse.json(
          { error: 'Token expired', needsSpotifyConnection: true },
          { status: 403 }
        )
      }

      try {
        // Refresh the token
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
            where: { id: session.user.id },
            data: {
              spotifyAccessToken: tokens.access_token,
              spotifyTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            },
          })
        } else {
          throw new Error('Token refresh failed')
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError)
        return NextResponse.json(
          { error: 'Token refresh failed', needsSpotifyConnection: true },
          { status: 403 }
        )
      }
    }

    // Fetch playlists from Spotify API
    const playlistsResponse = await fetch(
      'https://api.spotify.com/v1/me/playlists?limit=50',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!playlistsResponse.ok) {
      console.error('Failed to fetch Spotify playlists:', await playlistsResponse.text())
      return NextResponse.json(
        { error: 'Failed to fetch playlists from Spotify' },
        { status: 500 }
      )
    }

    const playlistsData = await playlistsResponse.json()

    // Transform Spotify playlists to our format
    const playlists = playlistsData.items.map((playlist: any) => ({
      id: playlist.id,
      spotifyId: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      imageUrl: playlist.images?.[0]?.url || null,
      isPublic: playlist.public,
      isCollaborative: playlist.collaborative,
      tracksCount: playlist.tracks?.total || 0,
      owner: {
        id: playlist.owner.id,
        displayName: playlist.owner.display_name,
      },
      externalUrl: playlist.external_urls?.spotify,
      isSpotifyPlaylist: true,
    }))

    return NextResponse.json(playlists)
  } catch (error) {
    console.error('Error fetching Spotify playlists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    )
  }
}

