import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPRSchema = z.object({
  playlistId: z.string(),
  branchId: z.string().optional(), // Optional link to source branch
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  trackChanges: z.any().optional(),
  metadataChanges: z.any().optional(),
  commentChanges: z.any().optional(),
  ratingChanges: z.any().optional(),
  noteChanges: z.any().optional(),
  likeChanges: z.any().optional(),
})

// GET /api/pull-requests - Get pull requests
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get('playlistId')
    const status = searchParams.get('status')
    const type = searchParams.get('type') // 'created' or 'received'

    let whereClause: any = {}

    if (playlistId) {
      whereClause.playlistId = playlistId
    }

    if (status) {
      whereClause.status = status
    }

    if (type === 'created') {
      whereClause.creatorId = session.user.id
    } else if (type === 'received') {
      whereClause.ownerId = session.user.id
    }

    const pullRequests = await prisma.pullRequest.findMany({
      where: whereClause,
      include: {
        creator: {
          include: {
            profile: true,
          },
        },
        owner: {
          include: {
            profile: true,
          },
        },
        playlist: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        diff: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(pullRequests)
  } catch (error) {
    console.error('Error fetching pull requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/pull-requests - Create a pull request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createPRSchema.parse(body)

    // Get playlist and owner
    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: data.playlistId },
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    if (!playlist.isCollaborative && !playlist.isPublic) {
      return NextResponse.json(
        { error: 'This playlist does not accept pull requests' },
        { status: 403 }
      )
    }

    // If branch provided, verify ownership and status
    if (data.branchId) {
      const branch = await prisma.playlistBranch.findUnique({
        where: { id: data.branchId },
      })

      if (!branch) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
      }

      if (branch.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only create PRs from your own branches' },
          { status: 403 }
        )
      }

      if (branch.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'This branch has already been submitted' },
          { status: 400 }
        )
      }
    }

    // Create pull request with diff
    const pullRequest = await prisma.pullRequest.create({
      data: {
        playlistId: data.playlistId,
        creatorId: session.user.id,
        ownerId: playlist.ownerId,
        branchId: data.branchId || null,
        title: data.title,
        description: data.description,
        status: 'PENDING',
        diff: {
          create: {
            trackChanges: data.trackChanges,
            metadataChanges: data.metadataChanges,
            commentChanges: data.commentChanges,
            ratingChanges: data.ratingChanges,
            noteChanges: data.noteChanges,
            likeChanges: data.likeChanges,
          },
        },
      },
      include: {
        creator: {
          include: {
            profile: true,
          },
        },
        playlist: true,
        diff: true,
        branch: true,
      },
    })

    // Update branch status if linked
    if (data.branchId) {
      await prisma.playlistBranch.update({
        where: { id: data.branchId },
        data: { status: 'SUBMITTED' },
      })
    }

    // Create notification for playlist owner
    await prisma.notification.create({
      data: {
        userId: playlist.ownerId,
        type: 'PR_OPENED',
        title: 'New Pull Request',
        message: `${session.user.name || 'Someone'} submitted a pull request to "${playlist.name}"`,
        relatedId: pullRequest.id,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'created_pull_request',
        entityType: 'pull_request',
        entityId: pullRequest.id,
        metadata: { playlistId: data.playlistId, title: data.title },
      },
    })

    return NextResponse.json(pullRequest, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating pull request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

