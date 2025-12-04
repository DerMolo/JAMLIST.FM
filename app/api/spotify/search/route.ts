import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchTracks } from '@/lib/spotify'
import { prisma } from '@/lib/prisma'

// GET /api/spotify/search?q=query
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to search for tracks.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
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
        {
          error: 'Spotify not connected',
          message: 'Please connect your Spotify account in your profile to search for tracks.',
          needsSpotifyConnection: true,
        },
        { status: 403 }
      )
    }

    // Check if token is expired and needs refresh
    let accessToken = user.spotifyAccessToken
    if (user.spotifyTokenExpiresAt && new Date(user.spotifyTokenExpiresAt) < new Date()) {
      // Token expired, need to refresh
      if (!user.spotifyRefreshToken) {
        return NextResponse.json(
          {
            error: 'Token expired',
            message: 'Your Spotify connection has expired. Please reconnect your Spotify account.',
            needsSpotifyConnection: true,
          },
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
          {
            error: 'Token refresh failed',
            message: 'Failed to refresh Spotify connection. Please reconnect your Spotify account.',
            needsSpotifyConnection: true,
          },
          { status: 403 }
        )
      }
    }

    const tracks = await searchTracks(query, accessToken)
    
    return NextResponse.json(tracks)
  } catch (error) {
    console.error('Error searching tracks:', error)
    return NextResponse.json(
      { error: 'Failed to search tracks', message: 'An error occurred while searching. Please try again.' },
      { status: 500 }
    )
  }
}

