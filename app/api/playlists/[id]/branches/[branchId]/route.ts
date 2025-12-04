import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateBranchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  tracks: z.array(z.object({
    trackId: z.string(),
    position: z.number(),
  })).optional(),
})

// GET /api/playlists/[id]/branches/[branchId] - Get a specific branch
export async function GET(
  request: Request,
  { params }: { params: { id: string; branchId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { branchId } = params

    const branch = await prisma.playlistBranch.findUnique({
      where: { id: branchId },
      include: {
        playlist: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            isPublic: true,
            isCollaborative: true,
            ownerId: true,
            owner: {
              include: {
                profile: true,
              },
            },
          },
        },
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
        pullRequest: {
          select: {
            id: true,
            status: true,
            title: true,
          },
        },
      },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Check access
    const isOwner = session?.user?.id === branch.ownerId
    const isPlaylistOwner = session?.user?.id === branch.playlist.ownerId
    
    if (!isOwner && !isPlaylistOwner && !branch.playlist.isPublic && !branch.playlist.isCollaborative) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(branch)
  } catch (error) {
    console.error('Error fetching branch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/playlists/[id]/branches/[branchId] - Update a branch
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; branchId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { branchId } = params
    const body = await request.json()
    const { name, description, tracks } = updateBranchSchema.parse(body)

    // Get existing branch
    const branch = await prisma.playlistBranch.findUnique({
      where: { id: branchId },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Only branch owner can update
    if (branch.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can't update a submitted branch
    if (branch.status === 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Cannot modify a submitted branch' },
        { status: 400 }
      )
    }

    // Update branch
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    // If tracks are provided, replace them all
    if (tracks) {
      // Delete existing tracks and create new ones
      await prisma.branchTrack.deleteMany({
        where: { branchId },
      })

      await prisma.branchTrack.createMany({
        data: tracks.map((t) => ({
          branchId,
          trackId: t.trackId,
          position: t.position,
        })),
      })
    }

    const updatedBranch = await prisma.playlistBranch.update({
      where: { id: branchId },
      data: updateData,
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

    return NextResponse.json(updatedBranch)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating branch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/playlists/[id]/branches/[branchId] - Delete a branch
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; branchId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { branchId } = params

    const branch = await prisma.playlistBranch.findUnique({
      where: { id: branchId },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Only branch owner can delete
    if (branch.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.playlistBranch.delete({
      where: { id: branchId },
    })

    return NextResponse.json({ message: 'Branch deleted successfully' })
  } catch (error) {
    console.error('Error deleting branch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

