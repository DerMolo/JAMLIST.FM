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

// Helper to normalize description for comparison
// Spotify can return null, empty string, or have trailing whitespace
function normalizeDescription(desc: string | null | undefined): string {
  if (!desc) return ''
  // Trim whitespace and normalize line endings
  return desc.trim().replace(/\r\n/g, '\n')
}

// Helper to check if descriptions are effectively equal
function descriptionsMatch(local: string | null | undefined, spotify: string | null | undefined): boolean {
  const normalizedLocal = normalizeDescription(local)
  const normalizedSpotify = normalizeDescription(spotify)
  return normalizedLocal === normalizedSpotify
}

export interface PlaylistDiff {
  inSync: boolean
  spotifyPlaylistExists: boolean
  spotifyPlaylistInLibrary: boolean
  localTrackCount: number
  spotifyTrackCount: number
  tracksOnlyInLocal: Array<{
    id: string
    spotifyId: string
    title: string
    artist: string
  }>
  tracksOnlyInSpotify: Array<{
    spotifyId: string
    title: string
    artist: string
  }>
  // Changes detected between local and Spotify (relative to last sync if available)
  metadataChanges: {
    name: boolean
    description: boolean
  }
  // Indicates if Spotify has changes we should pull in (Spotify trumps local)
  spotifyHasChanges: {
    name: boolean
    description: boolean
    tracks: boolean
  }
  // Indicates if local has changes to push to Spotify
  localHasChanges: {
    name: boolean
    description: boolean
    tracks: boolean
  }
  spotifyPlaylistName?: string
  spotifyPlaylistDescription?: string
  // Last synced state info
  lastSyncedAt?: string
}

// POST /api/spotify/compare-playlist - Compare local playlist with Spotify version
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playlistId } = body

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID required' }, { status: 400 })
    }

    // Get the local playlist with tracks and sync state
    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: playlistId },
      include: {
        tracks: {
          include: {
            track: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    })

    // Helper to get last synced tracks as a Set of spotify IDs
    const getLastSyncedTrackIds = (): Set<string> => {
      if (!playlist?.lastSyncedTracks) return new Set()
      try {
        const tracks = playlist.lastSyncedTracks as string[]
        return new Set(tracks)
      } catch {
        return new Set()
      }
    }

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Check if user owns the playlist
    if (playlist.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // If no Spotify ID, playlist hasn't been synced yet
    if (!playlist.spotifyId) {
      const diff: PlaylistDiff = {
        inSync: false,
        spotifyPlaylistExists: false,
        spotifyPlaylistInLibrary: false,
        localTrackCount: playlist.tracks.length,
        spotifyTrackCount: 0,
        tracksOnlyInLocal: playlist.tracks.map((t) => ({
          id: t.track.id,
          spotifyId: t.track.spotifyId,
          title: t.track.title,
          artist: t.track.artist,
        })),
        tracksOnlyInSpotify: [],
        metadataChanges: {
          name: true,
          description: true,
        },
        spotifyHasChanges: {
          name: false,
          description: false,
          tracks: false,
        },
        localHasChanges: {
          name: true,
          description: !!playlist.description,
          tracks: playlist.tracks.length > 0,
        },
      }
      return NextResponse.json(diff)
    }

    // Get Spotify access token
    const tokenData = await getValidAccessToken(session.user.id)
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Spotify not connected', needsSpotifyConnection: true },
        { status: 403 }
      )
    }

    const { accessToken, spotifyId } = tokenData

    // Fetch the Spotify playlist
    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.spotifyId}?fields=id,name,description,tracks.items(track(id,name,artists))`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (spotifyResponse.status === 404) {
      // Spotify playlist doesn't exist anymore
      const diff: PlaylistDiff = {
        inSync: false,
        spotifyPlaylistExists: false,
        spotifyPlaylistInLibrary: false,
        localTrackCount: playlist.tracks.length,
        spotifyTrackCount: 0,
        tracksOnlyInLocal: playlist.tracks.map((t) => ({
          id: t.track.id,
          spotifyId: t.track.spotifyId,
          title: t.track.title,
          artist: t.track.artist,
        })),
        tracksOnlyInSpotify: [],
        metadataChanges: {
          name: true,
          description: true,
        },
        spotifyHasChanges: {
          name: false,
          description: false,
          tracks: false,
        },
        localHasChanges: {
          name: true,
          description: !!playlist.description,
          tracks: playlist.tracks.length > 0,
        },
        lastSyncedAt: playlist.lastSyncedAt?.toISOString(),
      }
      return NextResponse.json(diff)
    }

    if (!spotifyResponse.ok) {
      console.error('Error fetching Spotify playlist:', await spotifyResponse.text())
      return NextResponse.json(
        { error: 'Failed to fetch Spotify playlist' },
        { status: 500 }
      )
    }

    const spotifyPlaylist = await spotifyResponse.json()

    // Check if user still follows the playlist
    const followCheckResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.spotifyId}/followers/contains?ids=${spotifyId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    let userFollowsPlaylist = true
    if (followCheckResponse.ok) {
      const [follows] = await followCheckResponse.json()
      userFollowsPlaylist = follows
    }

    // Get track IDs from both sides
    const localTrackIds = new Set(
      playlist.tracks.map((t) => t.track.spotifyId).filter(Boolean)
    )
    
    const spotifyTrackIds = new Set(
      spotifyPlaylist.tracks.items
        .filter((item: any) => item.track && item.track.id)
        .map((item: any) => item.track.id)
    )

    // Get last synced state for proper change detection
    const lastSyncedTrackIds = getLastSyncedTrackIds()
    const hasLastSyncedState = playlist.lastSyncedAt !== null

    // Find differences between local and Spotify
    const tracksOnlyInLocal = playlist.tracks
      .filter((t) => t.track.spotifyId && !spotifyTrackIds.has(t.track.spotifyId))
      .map((t) => ({
        id: t.track.id,
        spotifyId: t.track.spotifyId,
        title: t.track.title,
        artist: t.track.artist,
      }))

    const tracksOnlyInSpotify = spotifyPlaylist.tracks.items
      .filter((item: any) => item.track && item.track.id && !localTrackIds.has(item.track.id))
      .map((item: any) => ({
        spotifyId: item.track.id,
        title: item.track.name,
        artist: item.track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
      }))

    // Check metadata differences using normalized comparison
    // This fixes the issue where empty vs null descriptions trigger false positives
    const metadataChanges = {
      name: playlist.name !== spotifyPlaylist.name,
      description: !descriptionsMatch(playlist.description, spotifyPlaylist.description),
    }

    // Determine what changed on Spotify side (since last sync)
    // These are changes we should pull IN from Spotify (Spotify trumps local)
    const spotifyHasChanges = {
      name: hasLastSyncedState && playlist.lastSyncedName !== spotifyPlaylist.name,
      description: hasLastSyncedState && !descriptionsMatch(playlist.lastSyncedDesc, spotifyPlaylist.description),
      tracks: hasLastSyncedState && tracksOnlyInSpotify.some(t => !lastSyncedTrackIds.has(t.spotifyId)),
    }

    // Determine what changed on local side (since last sync)
    // These are changes we want to push OUT to Spotify (only if Spotify hasn't changed)
    const localHasChanges = {
      name: hasLastSyncedState && playlist.lastSyncedName !== playlist.name && !spotifyHasChanges.name,
      description: hasLastSyncedState && !descriptionsMatch(playlist.lastSyncedDesc, playlist.description) && !spotifyHasChanges.description,
      tracks: hasLastSyncedState && tracksOnlyInLocal.some(t => !lastSyncedTrackIds.has(t.spotifyId)),
    }

    const inSync = 
      tracksOnlyInLocal.length === 0 && 
      tracksOnlyInSpotify.length === 0 && 
      !metadataChanges.name && 
      !metadataChanges.description &&
      userFollowsPlaylist

    const diff: PlaylistDiff = {
      inSync,
      spotifyPlaylistExists: true,
      spotifyPlaylistInLibrary: userFollowsPlaylist,
      localTrackCount: playlist.tracks.length,
      spotifyTrackCount: spotifyPlaylist.tracks.items.filter((i: any) => i.track).length,
      tracksOnlyInLocal,
      tracksOnlyInSpotify,
      metadataChanges,
      spotifyHasChanges,
      localHasChanges,
      spotifyPlaylistName: spotifyPlaylist.name,
      spotifyPlaylistDescription: spotifyPlaylist.description,
      lastSyncedAt: playlist.lastSyncedAt?.toISOString(),
    }

    return NextResponse.json(diff)
  } catch (error) {
    console.error('Error comparing playlists:', error)
    return NextResponse.json(
      { error: 'Failed to compare playlists' },
      { status: 500 }
    )
  }
}

