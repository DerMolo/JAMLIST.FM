import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  isCollaborative: z.boolean().default(false),
})

// GET /api/playlists - Get all playlists or user's playlists
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isPublic = searchParams.get('public') === 'true'

    let playlists

    if (userId) {
      // Get specific user's playlists
      playlists = await prisma.internalPlaylist.findMany({
        where: {
          ownerId: userId,
          ...(isPublic ? { isPublic: true } : {}),
        },
        include: {
          owner: {
            include: {
              profile: true,
            },
          },
          _count: {
            select: {
              tracks: true,
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    } else if (isPublic) {
      // Get public playlists
      playlists = await prisma.internalPlaylist.findMany({
        where: { isPublic: true },
        include: {
          owner: {
            include: {
              profile: true,
            },
          },
          _count: {
            select: {
              tracks: true,
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 50,
      })
    } else if (session?.user) {
      // Get authenticated user's playlists
      playlists = await prisma.internalPlaylist.findMany({
        where: {
          OR: [
            { ownerId: session.user.id },
            {
              contributors: {
                some: {
                  userId: session.user.id,
                },
              },
            },
          ],
        },
        include: {
          owner: {
            include: {
              profile: true,
            },
          },
          _count: {
            select: {
              tracks: true,
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(playlists)
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/playlists - Create a new playlist
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, isPublic, isCollaborative } =
      createPlaylistSchema.parse(body)

    const playlist = await prisma.internalPlaylist.create({
      data: {
        name,
        description,
        isPublic,
        isCollaborative,
        ownerId: session.user.id,
      },
      include: {
        owner: {
          include: {
            profile: true,
          },
        },
      },
    })

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'created_playlist',
        entityType: 'playlist',
        entityId: playlist.id,
        metadata: { playlistName: name },
      },
    })

    // Update user stats (upsert to create if doesn't exist)
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

    return NextResponse.json(playlist, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating playlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

