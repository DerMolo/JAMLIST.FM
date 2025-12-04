import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to refresh Spotify access token
async function refreshSpotifyToken(userId: string, refreshToken: string): Promise<{
  success: boolean
  accessToken?: string
  error?: string
}> {
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
        refresh_token: refreshToken,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Failed to refresh Spotify token:', errorData)
      return { success: false, error: 'Failed to refresh token' }
    }

    const tokens = await tokenResponse.json()
    
    // Update database with new token
    await prisma.user.update({
      where: { id: userId },
      data: {
        spotifyAccessToken: tokens.access_token,
        spotifyTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        // Spotify may return a new refresh token
        ...(tokens.refresh_token && { spotifyRefreshToken: tokens.refresh_token }),
      },
    })

    return { success: true, accessToken: tokens.access_token }
  } catch (error) {
    console.error('Error refreshing Spotify token:', error)
    return { success: false, error: 'Token refresh failed' }
  }
}

// GET /api/user/verify-spotify - Verify Spotify connection is still valid
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        spotifyId: true,
        spotifyAccessToken: true,
        spotifyRefreshToken: true,
        spotifyTokenExpiresAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if Spotify was ever connected
    if (!user.spotifyId || !user.spotifyAccessToken) {
      return NextResponse.json({
        connected: false,
        verified: false,
        reason: 'not_connected',
        message: 'Spotify account has not been connected',
      })
    }

    let accessToken = user.spotifyAccessToken

    // Check if token is expired
    const isExpired = user.spotifyTokenExpiresAt && new Date(user.spotifyTokenExpiresAt) < new Date()
    
    if (isExpired) {
      console.log('Spotify token expired, attempting refresh...')
      
      if (!user.spotifyRefreshToken) {
        // No refresh token - connection is invalid
        await clearSpotifyConnection(session.user.id)
        return NextResponse.json({
          connected: false,
          verified: false,
          reason: 'no_refresh_token',
          message: 'Spotify session expired. Please reconnect your account.',
        })
      }

      // Try to refresh the token
      const refreshResult = await refreshSpotifyToken(session.user.id, user.spotifyRefreshToken)
      
      if (!refreshResult.success) {
        // Refresh failed - likely revoked
        await clearSpotifyConnection(session.user.id)
        return NextResponse.json({
          connected: false,
          verified: false,
          reason: 'refresh_failed',
          message: 'Spotify connection expired. Please reconnect your account.',
        })
      }
      
      accessToken = refreshResult.accessToken!
    }

    // Make a test API call to verify the token actually works
    const verifyResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!verifyResponse.ok) {
      const status = verifyResponse.status
      
      if (status === 401) {
        // Token is invalid - try refresh one more time if we haven't already
        if (!isExpired && user.spotifyRefreshToken) {
          const refreshResult = await refreshSpotifyToken(session.user.id, user.spotifyRefreshToken)
          
          if (refreshResult.success) {
            // Try verification again with new token
            const retryResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: {
                Authorization: `Bearer ${refreshResult.accessToken}`,
              },
            })
            
            if (retryResponse.ok) {
              const spotifyUser = await retryResponse.json()
              return NextResponse.json({
                connected: true,
                verified: true,
                spotifyId: user.spotifyId,
                spotifyDisplayName: spotifyUser.display_name,
                spotifyEmail: spotifyUser.email,
                tokenRefreshed: true,
              })
            }
          }
        }
        
        // All attempts failed - clear connection
        await clearSpotifyConnection(session.user.id)
        return NextResponse.json({
          connected: false,
          verified: false,
          reason: 'token_invalid',
          message: 'Spotify access was revoked. Please reconnect your account.',
        })
      }
      
      if (status === 403) {
        return NextResponse.json({
          connected: true,
          verified: false,
          reason: 'insufficient_permissions',
          message: 'Spotify permissions may have changed. Please reconnect to grant all permissions.',
        })
      }
      
      // Other errors - connection might still be valid
      return NextResponse.json({
        connected: true,
        verified: false,
        reason: 'api_error',
        message: 'Could not verify Spotify connection. Please try again later.',
      })
    }

    // Success! Token is valid
    const spotifyUser = await verifyResponse.json()
    
    return NextResponse.json({
      connected: true,
      verified: true,
      spotifyId: user.spotifyId,
      spotifyDisplayName: spotifyUser.display_name,
      spotifyEmail: spotifyUser.email,
      spotifyProduct: spotifyUser.product, // 'premium', 'free', etc.
      spotifyCountry: spotifyUser.country,
    })
  } catch (error) {
    console.error('Error verifying Spotify connection:', error)
    return NextResponse.json(
      { error: 'Failed to verify Spotify connection' },
      { status: 500 }
    )
  }
}

// Helper to clear invalid Spotify connection data
async function clearSpotifyConnection(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        spotifyAccessToken: null,
        spotifyRefreshToken: null,
        spotifyTokenExpiresAt: null,
        // Keep spotifyId so we can detect if they reconnect the same account
      },
    })
  } catch (error) {
    console.error('Error clearing Spotify connection:', error)
  }
}

// POST /api/user/verify-spotify - Disconnect Spotify account
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear all Spotify data
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        spotifyId: null,
        spotifyAccessToken: null,
        spotifyRefreshToken: null,
        spotifyTokenExpiresAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Spotify account disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting Spotify:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Spotify' },
      { status: 500 }
    )
  }
}

