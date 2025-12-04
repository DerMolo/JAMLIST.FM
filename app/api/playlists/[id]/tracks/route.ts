import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addTrackSchema = z.object({
  spotifyId: z.string(),
  title: z.string(),
  artist: z.string(),
  album: z.string().optional(),
  duration: z.number(),
  imageUrl: z.string().optional(),
  previewUrl: z.string().optional(),
  position: z.number().optional(),
})

// POST /api/playlists/[id]/tracks - Add track to playlist
export async function POST(
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
    const trackData = addTrackSchema.parse(body)

    // Check if user has permission to add tracks
    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: playlistId },
      include: {
        contributors: true,
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    const isOwner = playlist.ownerId === session.user.id
    const isContributor = playlist.contributors.some(
      (c) => c.userId === session.user.id
    )

    if (!isOwner && !isContributor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create or find track
    const track = await prisma.internalTrack.upsert({
      where: { spotifyId: trackData.spotifyId },
      update: {},
      create: {
        spotifyId: trackData.spotifyId,
        title: trackData.title,
        artist: trackData.artist,
        album: trackData.album,
        duration: trackData.duration,
        imageUrl: trackData.imageUrl,
        previewUrl: trackData.previewUrl,
      },
    })

    // Get the last position
    const lastTrack = await prisma.playlistTrack.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' },
    })

    const position = trackData.position ?? (lastTrack?.position ?? -1) + 1

    // Add track to playlist
    const playlistTrack = await prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId: track.id,
        position,
      },
      include: {
        track: true,
      },
    })

    // Update playlist version
    await prisma.internalPlaylist.update({
      where: { id: playlistId },
      data: { version: { increment: 1 } },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'added_track',
        entityType: 'playlist',
        entityId: playlistId,
        metadata: { trackId: track.id, trackTitle: track.title },
      },
    })

    return NextResponse.json(playlistTrack, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error adding track:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/playlists/[id]/tracks?trackId=xxx - Remove track from playlist
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
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      )
    }

    // Check permissions
    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: playlistId },
      include: {
        contributors: true,
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    const isOwner = playlist.ownerId === session.user.id
    const isContributor = playlist.contributors.some(
      (c) => c.userId === session.user.id
    )

    if (!isOwner && !isContributor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove track
    await prisma.playlistTrack.deleteMany({
      where: {
        playlistId,
        trackId,
      },
    })

    // Update playlist version
    await prisma.internalPlaylist.update({
      where: { id: playlistId },
      data: { version: { increment: 1 } },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'removed_track',
        entityType: 'playlist',
        entityId: playlistId,
        metadata: { trackId },
      },
    })

    return NextResponse.json({ message: 'Track removed successfully' })
  } catch (error) {
    console.error('Error removing track:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

