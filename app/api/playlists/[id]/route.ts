import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional(),
  isCollaborative: z.boolean().optional(),
})

// GET /api/playlists/[id] - Get a specific playlist
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const playlistId = params.id

    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: playlistId },
      include: {
        owner: {
          include: {
            profile: true,
          },
        },
        tracks: {
          include: {
            track: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
        contributors: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        ratings: {
          select: {
            userId: true,
            rating: true,
          },
        },
        stats: true,
        forkedFrom: {
          select: {
            id: true,
            name: true,
            owner: {
              include: {
                profile: true,
              },
            },
          },
        },
        _count: {
          select: {
            forks: true,
            branches: true,
            likes: true,
            comments: true,
          },
        },
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Check access permissions
    if (!playlist.isPublic && playlist.ownerId !== session?.user?.id) {
      const isContributor = playlist.contributors.some(
        (c) => c.userId === session?.user?.id
      )
      if (!isContributor) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(playlist)
  } catch (error) {
    console.error('Error fetching playlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/playlists/[id] - Update a playlist
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const playlistId = params.id
    const body = await request.json()
    const updates = updatePlaylistSchema.parse(body)

    // Check if user owns the playlist
    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: playlistId },
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    if (playlist.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update playlist
    const updatedPlaylist = await prisma.internalPlaylist.update({
      where: { id: playlistId },
      data: {
        ...updates,
        version: { increment: 1 },
      },
      include: {
        owner: {
          include: {
            profile: true,
          },
        },
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'updated_playlist',
        entityType: 'playlist',
        entityId: playlistId,
        metadata: updates,
      },
    })

    return NextResponse.json(updatedPlaylist)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating playlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get valid Spotify access token
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

// DELETE /api/playlists/[id] - Delete a playlist
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const playlistId = params.id
    const { searchParams } = new URL(request.url)
    const deleteFromSpotify = searchParams.get('deleteFromSpotify') === 'true'

    // Check if user owns the playlist
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If playlist is synced to Spotify and user wants to delete from there too
    let spotifyDeleted = false
    let spotifyError: string | null = null
    
    if (playlist.spotifyId && deleteFromSpotify) {
      const tokenData = await getValidAccessToken(session.user.id)
      if (tokenData) {
        try {
          // Step 1: First, remove all tracks from the Spotify playlist
          // This ensures the playlist is cleared before unfollowing
          if (playlist.tracks.length > 0) {
            const trackUris = playlist.tracks
              .filter((t) => t.track.spotifyId)
              .map((t) => ({ uri: `spotify:track:${t.track.spotifyId}` }))

            if (trackUris.length > 0) {
              console.log(`Removing ${trackUris.length} tracks from Spotify playlist ${playlist.spotifyId}`)
              
              // Spotify allows removing up to 100 tracks per request
              for (let i = 0; i < trackUris.length; i += 100) {
                const batch = trackUris.slice(i, i + 100)
                const removeTracksResponse = await fetch(
                  `https://api.spotify.com/v1/playlists/${playlist.spotifyId}/tracks`,
                  {
                    method: 'DELETE',
                    headers: {
                      Authorization: `Bearer ${tokenData.accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ tracks: batch }),
                  }
                )

                if (!removeTracksResponse.ok) {
                  const errorText = await removeTracksResponse.text()
                  console.error(`Failed to remove tracks batch from Spotify playlist:`, errorText)
                  // Continue anyway - try to unfollow even if track removal fails
                }
              }
              console.log('Finished removing tracks from Spotify playlist')
            }
          }

          // Step 2: Unfollow the playlist on Spotify (this removes it from user's library)
          // Note: Spotify doesn't truly delete playlists, just unfollows them
          console.log(`Unfollowing Spotify playlist ${playlist.spotifyId}`)
          const unfollowResponse = await fetch(
            `https://api.spotify.com/v1/playlists/${playlist.spotifyId}/followers`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${tokenData.accessToken}`,
              },
            }
          )

          if (unfollowResponse.ok || unfollowResponse.status === 200) {
            spotifyDeleted = true
            console.log('Successfully unfollowed Spotify playlist')
          } else {
            spotifyError = await unfollowResponse.text()
            console.error('Failed to unfollow Spotify playlist:', spotifyError)
          }
        } catch (spotifyErr) {
          console.error('Error during Spotify deletion:', spotifyErr)
          spotifyError = spotifyErr instanceof Error ? spotifyErr.message : 'Unknown Spotify error'
        }
      } else {
        spotifyError = 'Could not get valid Spotify access token'
        console.error(spotifyError)
      }
    }

    // Delete playlist from our database (cascades to related data including tracks)
    await prisma.internalPlaylist.delete({
      where: { id: playlistId },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'deleted_playlist',
        entityType: 'playlist',
        entityId: playlistId,
        metadata: { 
          playlistName: playlist.name,
          trackCount: playlist.tracks.length,
          spotifyDeleted,
          spotifyError,
        },
      },
    })

    // Update user stats
    await prisma.userStats.upsert({
      where: { userId: session.user.id },
      update: {
        totalPlaylists: { decrement: 1 },
        lastUpdated: new Date(),
      },
      create: {
        userId: session.user.id,
        totalPlaylists: 0,
        totalTracks: 0,
        totalListeningTime: 0,
      },
    })

    return NextResponse.json({ 
      message: 'Playlist deleted successfully',
      spotifyDeleted,
      spotifyError: spotifyError || undefined,
      tracksRemoved: playlist.tracks.length,
    })
  } catch (error) {
    console.error('Error deleting playlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

