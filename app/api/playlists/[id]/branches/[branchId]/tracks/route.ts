import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/playlists/[id]/branches/[branchId]/tracks - Add track to branch
export async function POST(
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
    const { spotifyId, title, artist, album, duration, imageUrl, previewUrl } = body

    if (!spotifyId || !title || !artist) {
      return NextResponse.json(
        { error: 'Missing required track fields (spotifyId, title, artist)' },
        { status: 400 }
      )
    }

    // Get branch and verify ownership
    const branch = await prisma.playlistBranch.findUnique({
      where: { id: branchId },
      include: {
        tracks: {
          orderBy: { position: 'desc' },
          take: 1,
        },
      },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Only branch owner can add tracks
    if (branch.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can't modify a submitted branch
    if (branch.status === 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Cannot modify a submitted branch' },
        { status: 400 }
      )
    }

    // Get or create the internal track
    let track = await prisma.internalTrack.findUnique({
      where: { spotifyId },
    })

    if (!track) {
      track = await prisma.internalTrack.create({
        data: {
          spotifyId,
          title,
          artist,
          album: album || null,
          duration: duration || 0,
          imageUrl: imageUrl || null,
          previewUrl: previewUrl || null,
        },
      })
    }

    // Check if track already exists in branch
    const existingBranchTrack = await prisma.branchTrack.findUnique({
      where: {
        branchId_trackId: {
          branchId,
          trackId: track.id,
        },
      },
    })

    if (existingBranchTrack) {
      return NextResponse.json(
        { error: 'Track already in branch' },
        { status: 400 }
      )
    }

    // Get next position
    const maxPosition = branch.tracks[0]?.position ?? -1
    const newPosition = maxPosition + 1

    // Add track to branch
    const branchTrack = await prisma.branchTrack.create({
      data: {
        branchId,
        trackId: track.id,
        position: newPosition,
      },
      include: {
        track: true,
      },
    })

    // Update branch timestamp
    await prisma.playlistBranch.update({
      where: { id: branchId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      track: branchTrack,
    })
  } catch (error) {
    console.error('Error adding track to branch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/playlists/[id]/branches/[branchId]/tracks?trackId=xxx - Remove track from branch
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
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      )
    }

    // Get branch and verify ownership
    const branch = await prisma.playlistBranch.findUnique({
      where: { id: branchId },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Only branch owner can remove tracks
    if (branch.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can't modify a submitted branch
    if (branch.status === 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Cannot modify a submitted branch' },
        { status: 400 }
      )
    }

    // Remove track from branch
    await prisma.branchTrack.deleteMany({
      where: {
        branchId,
        trackId,
      },
    })

    // Reorder remaining tracks
    const remainingTracks = await prisma.branchTrack.findMany({
      where: { branchId },
      orderBy: { position: 'asc' },
    })

    // Update positions
    for (let i = 0; i < remainingTracks.length; i++) {
      if (remainingTracks[i].position !== i) {
        await prisma.branchTrack.update({
          where: { id: remainingTracks[i].id },
          data: { position: i },
        })
      }
    }

    // Update branch timestamp
    await prisma.playlistBranch.update({
      where: { id: branchId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Track removed from branch',
    })
  } catch (error) {
    console.error('Error removing track from branch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

