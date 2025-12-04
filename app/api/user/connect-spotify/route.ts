import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Hardcoded base URL for Spotify OAuth (required by Spotify's redirect URI policy)
const BASE_URL = 'http://127.0.0.1:3000'

// GET /api/user/connect-spotify
// Returns the URL to connect Spotify account
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate Spotify OAuth URL
    const scopes = [
      'user-read-email',
      'user-read-private',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'user-library-modify',
      'user-top-read',
      'ugc-image-upload', // Required for uploading playlist cover images
    ].join(' ')

    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: `${BASE_URL}/api/user/spotify-callback`,
      scope: scopes,
      state: session.user.id, // Pass user ID as state
      show_dialog: 'true',
    })

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('Error generating Spotify auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}

