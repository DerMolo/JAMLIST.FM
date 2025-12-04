import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createBranchSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

// GET /api/playlists/[id]/branches - Get all branches for a playlist
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const playlistId = params.id

    // Get the playlist first
    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: playlistId },
      select: {
        id: true,
        isPublic: true,
        isCollaborative: true,
        ownerId: true,
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Check if user can view branches
    // Owner can see all branches, others can only see on public/collaborative playlists
    const isOwner = session?.user?.id === playlist.ownerId
    
    if (!isOwner && !playlist.isPublic && !playlist.isCollaborative) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get branches - show all if owner, otherwise only active branches
    const branches = await prisma.playlistBranch.findMany({
      where: {
        playlistId,
        ...(isOwner ? {} : { status: 'ACTIVE' }),
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
          },
        },
        pullRequest: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(branches)
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/playlists/[id]/branches - Create a new branch for a playlist
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
    const { name, description } = createBranchSchema.parse(body)

    // Get the playlist with its tracks
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

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Only allow branching on public or collaborative playlists (not your own)
    const isOwner = playlist.ownerId === session.user.id
    if (isOwner) {
      return NextResponse.json(
        { error: 'You cannot create a branch of your own playlist' },
        { status: 400 }
      )
    }

    if (!playlist.isPublic && !playlist.isCollaborative) {
      return NextResponse.json(
        { error: 'This playlist does not allow branches' },
        { status: 403 }
      )
    }

    // Check if user already has a branch with the same name
    const existingBranch = await prisma.playlistBranch.findUnique({
      where: {
        playlistId_ownerId_name: {
          playlistId,
          ownerId: session.user.id,
          name,
        },
      },
    })

    if (existingBranch) {
      return NextResponse.json(
        { error: 'You already have a branch with this name' },
        { status: 400 }
      )
    }

    // Create the branch with a copy of the playlist tracks
    const branch = await prisma.playlistBranch.create({
      data: {
        playlistId,
        ownerId: session.user.id,
        name,
        description,
        tracks: {
          create: playlist.tracks.map((pt) => ({
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
          orderBy: {
            position: 'asc',
          },
        },
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'created_branch',
        entityType: 'branch',
        entityId: branch.id,
        metadata: { playlistId, branchName: name },
      },
    })

    return NextResponse.json(branch, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating branch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

