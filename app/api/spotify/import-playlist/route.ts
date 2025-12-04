import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to get valid Spotify access token (refreshes if expired)
async function getValidAccessToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      spotifyId: true,
      spotifyAccessToken: true,
      spotifyRefreshToken: true,
      spotifyTokenExpiresAt: true,
    },
  })

  if (!user?.spotifyAccessToken) {
    return null
  }

  let accessToken = user.spotifyAccessToken

  // Check if token is expired
  if (user.spotifyTokenExpiresAt && new Date(user.spotifyTokenExpiresAt) < new Date()) {
    if (!user.spotifyRefreshToken) {
      return null
    }

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
        where: { id: userId },
        data: {
          spotifyAccessToken: tokens.access_token,
          spotifyTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      })
    } else {
      return null
    }
  }

  return { accessToken, spotifyId: user.spotifyId }
}

// POST /api/spotify/import-playlist - Import changes FROM Spotify TO local
// This implements "Spotify trumps local" by pulling in Spotify's current state
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playlistId, importOptions } = body

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID required' }, { status: 400 })
    }

    // Get the local playlist
    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: playlistId },
      include: {
        tracks: {
          include: {
            track: true,
          },
        },
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    if (playlist.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!playlist.spotifyId) {
      return NextResponse.json(
        { error: 'Playlist has not been synced to Spotify yet' },
        { status: 400 }
      )
    }

    // Get Spotify access token
    const tokenData = await getValidAccessToken(session.user.id)
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Spotify not connected', needsSpotifyConnection: true },
        { status: 403 }
      )
    }

    const { accessToken } = tokenData

    // Fetch the current Spotify playlist
    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.spotifyId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!spotifyResponse.ok) {
      if (spotifyResponse.status === 404) {
        return NextResponse.json(
          { error: 'Playlist no longer exists on Spotify' },
          { status: 404 }
        )
      }
      console.error('Error fetching Spotify playlist:', await spotifyResponse.text())
      return NextResponse.json(
        { error: 'Failed to fetch Spotify playlist' },
        { status: 500 }
      )
    }

    const spotifyPlaylist = await spotifyResponse.json()

    // Options for what to import
    const importMetadata = importOptions?.metadata !== false
    const importTracks = importOptions?.tracks !== false

    let updatedName = playlist.name
    let updatedDescription = playlist.description
    let tracksAdded = 0
    let tracksRemoved = 0
    let metadataUpdated = false

    // Import metadata from Spotify
    if (importMetadata) {
      const shouldUpdateName = spotifyPlaylist.name !== playlist.name
      const shouldUpdateDesc = (spotifyPlaylist.description || '') !== (playlist.description || '')

      if (shouldUpdateName || shouldUpdateDesc) {
        await prisma.internalPlaylist.update({
          where: { id: playlistId },
          data: {
            name: spotifyPlaylist.name,
            description: spotifyPlaylist.description || '',
          },
        })
        updatedName = spotifyPlaylist.name
        updatedDescription = spotifyPlaylist.description
        metadataUpdated = true
      }
    }

    // Import tracks from Spotify
    if (importTracks) {
      const spotifyTracks = spotifyPlaylist.tracks?.items || []
      
      // Get current local track spotify IDs
      const localTrackSpotifyIds = new Set(
        playlist.tracks.map((t) => t.track.spotifyId).filter(Boolean)
      )

      // Process Spotify tracks
      for (let i = 0; i < spotifyTracks.length; i++) {
        const item = spotifyTracks[i]
        if (!item.track || !item.track.id) continue

        const spotifyTrackId = item.track.id

        // Skip if already in local playlist
        if (localTrackSpotifyIds.has(spotifyTrackId)) continue

        // Create or get the internal track
        const internalTrack = await prisma.internalTrack.upsert({
          where: { spotifyId: spotifyTrackId },
          update: {},
          create: {
            spotifyId: spotifyTrackId,
            title: item.track.name,
            artist: item.track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
            album: item.track.album?.name || null,
            duration: Math.floor(item.track.duration_ms / 1000),
            imageUrl: item.track.album?.images?.[0]?.url || null,
            previewUrl: item.track.preview_url || null,
          },
        })

        // Add to playlist
        await prisma.playlistTrack.create({
          data: {
            playlistId,
            trackId: internalTrack.id,
            position: i,
          },
        })

        tracksAdded++
      }

      // Optionally remove tracks that are not on Spotify anymore
      const spotifyTrackIds = new Set(
        spotifyTracks
          .filter((item: any) => item.track && item.track.id)
          .map((item: any) => item.track.id)
      )

      for (const pt of playlist.tracks) {
        if (pt.track.spotifyId && !spotifyTrackIds.has(pt.track.spotifyId)) {
          await prisma.playlistTrack.delete({
            where: { id: pt.id },
          })
          tracksRemoved++
        }
      }

      // Reorder tracks to match Spotify's order
      if (tracksAdded > 0 || tracksRemoved > 0) {
        const allPlaylistTracks = await prisma.playlistTrack.findMany({
          where: { playlistId },
          include: { track: true },
        })

        // Create a map of spotify ID to desired position
        const spotifyOrderMap = new Map<string, number>()
        spotifyTracks.forEach((item: any, index: number) => {
          if (item.track?.id) {
            spotifyOrderMap.set(item.track.id, index)
          }
        })

        // Update positions
        for (const pt of allPlaylistTracks) {
          const desiredPosition = spotifyOrderMap.get(pt.track.spotifyId)
          if (desiredPosition !== undefined && desiredPosition !== pt.position) {
            await prisma.playlistTrack.update({
              where: { id: pt.id },
              data: { position: desiredPosition },
            })
          }
        }
      }
    }

    // Get the final track list from Spotify for saving synced state
    const finalTrackIds = (spotifyPlaylist.tracks?.items || [])
      .filter((item: any) => item.track?.id)
      .map((item: any) => item.track.id)

    // Update the last synced state
    await prisma.internalPlaylist.update({
      where: { id: playlistId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncedName: updatedName,
        lastSyncedDesc: updatedDescription || '',
        lastSyncedTracks: finalTrackIds,
        updatedAt: new Date(),
      },
    })

    // Build response message
    const changes: string[] = []
    if (metadataUpdated) changes.push('metadata updated')
    if (tracksAdded > 0) changes.push(`${tracksAdded} track(s) added`)
    if (tracksRemoved > 0) changes.push(`${tracksRemoved} track(s) removed`)

    const message = changes.length > 0
      ? `Imported from Spotify: ${changes.join(', ')}`
      : 'Already in sync with Spotify'

    return NextResponse.json({
      success: true,
      message,
      changes: {
        metadataUpdated,
        tracksAdded,
        tracksRemoved,
      },
      spotifyPlaylistName: spotifyPlaylist.name,
      spotifyPlaylistDescription: spotifyPlaylist.description,
    })
  } catch (error) {
    console.error('Error importing from Spotify:', error)
    return NextResponse.json(
      { error: 'Failed to import from Spotify' },
      { status: 500 }
    )
  }
}

