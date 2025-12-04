import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Hardcoded base URL for Spotify OAuth (required by Spotify's redirect URI policy)
const BASE_URL = 'http://127.0.0.1:3000'

// GET /api/user/spotify-callback?code=...&state=userId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const userId = searchParams.get('state')

    if (!code || !userId) {
      return NextResponse.redirect(new URL('/profile?error=invalid_request', request.url))
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${BASE_URL}/api/user/spotify-callback`,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(new URL('/profile?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // Get Spotify user info
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Failed to fetch Spotify user:', await userResponse.text())
      return NextResponse.redirect(new URL('/profile?error=user_fetch_failed', request.url))
    }

    const spotifyUser = await userResponse.json()

    // Check if this Spotify account is already connected to another user
    const existingUserWithSpotify = await prisma.user.findUnique({
      where: { spotifyId: spotifyUser.id },
      select: { id: true, email: true },
    })

    if (existingUserWithSpotify && existingUserWithSpotify.id !== userId) {
      // Spotify account is connected to a different user
      // Option 1: Transfer the Spotify connection to the current user
      // First, clear the Spotify connection from the old user
      await prisma.user.update({
        where: { id: existingUserWithSpotify.id },
        data: {
          spotifyId: null,
          spotifyAccessToken: null,
          spotifyRefreshToken: null,
          spotifyTokenExpiresAt: null,
        },
      })
      console.log(`Transferred Spotify account from user ${existingUserWithSpotify.id} to user ${userId}`)
    }

    // Update user in database with Spotify connection
    await prisma.user.update({
      where: { id: userId },
      data: {
        spotifyId: spotifyUser.id,
        spotifyAccessToken: tokens.access_token,
        spotifyRefreshToken: tokens.refresh_token,
        spotifyTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    })

    // Redirect to profile with success
    return NextResponse.redirect(new URL('/profile?spotify=connected', request.url))
  } catch (error) {
    console.error('Error in Spotify callback:', error)
    return NextResponse.redirect(new URL('/profile?error=unknown', request.url))
  }
}

