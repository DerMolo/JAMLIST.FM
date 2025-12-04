import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/playlists/[id]/fork - Fork a playlist
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

    // Get the original playlist with tracks
    const originalPlaylist = await prisma.internalPlaylist.findUnique({
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
        owner: {
          include: {
            profile: true,
          },
        },
      },
    })

    if (!originalPlaylist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Can't fork your own playlist
    if (originalPlaylist.ownerId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot fork your own playlist' },
        { status: 400 }
      )
    }

    // Must be public or collaborative to fork
    if (!originalPlaylist.isPublic && !originalPlaylist.isCollaborative) {
      return NextResponse.json(
        { error: 'This playlist cannot be forked' },
        { status: 403 }
      )
    }

    // Check if user has already forked this playlist
    const existingFork = await prisma.internalPlaylist.findFirst({
      where: {
        ownerId: session.user.id,
        forkedFromId: originalPlaylist.id,
      },
    })

    if (existingFork) {
      // User has already forked this playlist - offer to update or return existing
      // For now, we'll allow creating another fork with a unique name
      // This enables users to have multiple versions of a forked playlist
    }

    // Count existing forks by this user to make unique names
    const userForkCount = await prisma.internalPlaylist.count({
      where: {
        ownerId: session.user.id,
        forkedFromId: originalPlaylist.id,
      },
    })

    // Generate unique fork name
    const forkSuffix = userForkCount > 0 ? ` (Fork ${userForkCount + 1})` : ' (Fork)'

    // Create forked playlist
    const forkedPlaylist = await prisma.internalPlaylist.create({
      data: {
        name: `${originalPlaylist.name}${forkSuffix}`,
        description: originalPlaylist.description 
          ? `Forked from ${originalPlaylist.owner.profile?.displayName || 'Unknown'}'s playlist. ${originalPlaylist.description}`
          : `Forked from ${originalPlaylist.owner.profile?.displayName || 'Unknown'}'s playlist.`,
        imageUrl: originalPlaylist.imageUrl,
        isPublic: false, // Forked playlists start as private
        isCollaborative: false,
        ownerId: session.user.id,
        forkedFromId: originalPlaylist.id,
        tracks: {
          create: originalPlaylist.tracks.map((pt) => ({
            trackId: pt.trackId,
            position: pt.position,
          })),
        },
      },
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
        },
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
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'forked_playlist',
        entityType: 'playlist',
        entityId: forkedPlaylist.id,
        metadata: {
          originalPlaylistId: originalPlaylist.id,
          originalPlaylistName: originalPlaylist.name,
        },
      },
    })

    // Notify original playlist owner (if they have notifications enabled)
    await prisma.notification.create({
      data: {
        userId: originalPlaylist.ownerId,
        type: 'FORK_ALERT',
        title: 'Playlist Forked',
        message: `${session.user.name || 'Someone'} forked your playlist "${originalPlaylist.name}"`,
        relatedId: forkedPlaylist.id,
      },
    })

    // Update user stats
    await prisma.userStats.upsert({
      where: { userId: session.user.id },
      update: {
        totalPlaylists: { increment: 1 },
        lastUpdated: new Date(),
      },
      create: {
        userId: session.user.id,
        totalPlaylists: 1,
        totalTracks: 0,
        totalListeningTime: 0,
      },
    })

    return NextResponse.json(forkedPlaylist, { status: 201 })
  } catch (error) {
    console.error('Error forking playlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

