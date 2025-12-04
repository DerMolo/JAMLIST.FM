import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePRStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'MERGED']),
})

// GET /api/pull-requests/[id] - Get a specific pull request
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prId = params.id

    const pullRequest = await prisma.pullRequest.findUnique({
      where: { id: prId },
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
          include: {
            tracks: {
              include: {
                track: true,
              },
            },
          },
        },
        diff: true,
      },
    })

    if (!pullRequest) {
      return NextResponse.json(
        { error: 'Pull request not found' },
        { status: 404 }
      )
    }

    // Check if user has access
    if (
      pullRequest.creatorId !== session.user.id &&
      pullRequest.ownerId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(pullRequest)
  } catch (error) {
    console.error('Error fetching pull request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/pull-requests/[id] - Approve/Reject/Merge a pull request
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prId = params.id
    const body = await request.json()
    const { status } = updatePRStatusSchema.parse(body)

    const pullRequest = await prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        playlist: true,
        diff: true,
        creator: {
          include: {
            profile: true,
          },
        },
      },
    })

    if (!pullRequest) {
      return NextResponse.json(
        { error: 'Pull request not found' },
        { status: 404 }
      )
    }

    // Only owner can approve/reject/merge
    if (pullRequest.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update PR status
    const updatedPR = await prisma.pullRequest.update({
      where: { id: prId },
      data: { status },
    })

    // If approved or merged, apply changes
    if (status === 'APPROVED' || status === 'MERGED') {
      const diff = pullRequest.diff

      if (diff?.trackChanges) {
        const trackChanges = diff.trackChanges as any
        
        // Handle track additions
        if (trackChanges.additions) {
          for (const track of trackChanges.additions) {
            const internalTrack = await prisma.internalTrack.upsert({
              where: { spotifyId: track.spotifyId },
              update: {},
              create: {
                spotifyId: track.spotifyId,
                title: track.title,
                artist: track.artist,
                album: track.album,
                duration: track.duration,
                imageUrl: track.imageUrl,
                previewUrl: track.previewUrl,
              },
            })

            await prisma.playlistTrack.create({
              data: {
                playlistId: pullRequest.playlistId,
                trackId: internalTrack.id,
                position: track.position || 0,
              },
            })
          }
        }

        // Handle track removals
        if (trackChanges.removals) {
          for (const trackId of trackChanges.removals) {
            await prisma.playlistTrack.deleteMany({
              where: {
                playlistId: pullRequest.playlistId,
                trackId,
              },
            })
          }
        }
      }

      // Update playlist version
      await prisma.internalPlaylist.update({
        where: { id: pullRequest.playlistId },
        data: { version: { increment: 1 } },
      })
    }

    // Create notification for PR creator
    await prisma.notification.create({
      data: {
        userId: pullRequest.creatorId,
        type: status === 'APPROVED' || status === 'MERGED' ? 'PR_APPROVED' : 'PR_REJECTED',
        title: `Pull Request ${status}`,
        message: `Your pull request to "${pullRequest.playlist.name}" was ${status.toLowerCase()}`,
        relatedId: prId,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: `${status.toLowerCase()}_pull_request`,
        entityType: 'pull_request',
        entityId: prId,
      },
    })

    return NextResponse.json(updatedPR)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating pull request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

