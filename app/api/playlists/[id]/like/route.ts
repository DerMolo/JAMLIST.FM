import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/playlists/[id]/like - Like a playlist
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

    // Check if playlist exists and is accessible
    const playlist = await prisma.internalPlaylist.findUnique({
      where: { id: playlistId },
      select: {
        id: true,
        isPublic: true,
        ownerId: true,
        contributors: {
          select: { userId: true },
        },
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Check access - must be public, or user is owner/contributor
    const isOwner = playlist.ownerId === session.user.id
    const isContributor = playlist.contributors.some(c => c.userId === session.user.id)
    
    if (!playlist.isPublic && !isOwner && !isContributor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if already liked
    const existingLike = await prisma.playlistLike.findUnique({
      where: {
        playlistId_userId: {
          playlistId,
          userId: session.user.id,
        },
      },
    })

    if (existingLike) {
      return NextResponse.json({ 
        error: 'Already liked',
        liked: true,
      }, { status: 400 })
    }

    // Create like
    await prisma.playlistLike.create({
      data: {
        playlistId,
        userId: session.user.id,
      },
    })

    // Get updated like count
    const likeCount = await prisma.playlistLike.count({
      where: { playlistId },
    })

    return NextResponse.json({ 
      success: true,
      liked: true,
      likeCount,
    })
  } catch (error) {
    console.error('Error liking playlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/playlists/[id]/like - Unlike a playlist
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

    // Check if like exists
    const existingLike = await prisma.playlistLike.findUnique({
      where: {
        playlistId_userId: {
          playlistId,
          userId: session.user.id,
        },
      },
    })

    if (!existingLike) {
      return NextResponse.json({ 
        error: 'Not liked',
        liked: false,
      }, { status: 400 })
    }

    // Delete like
    await prisma.playlistLike.delete({
      where: {
        playlistId_userId: {
          playlistId,
          userId: session.user.id,
        },
      },
    })

    // Get updated like count
    const likeCount = await prisma.playlistLike.count({
      where: { playlistId },
    })

    return NextResponse.json({ 
      success: true,
      liked: false,
      likeCount,
    })
  } catch (error) {
    console.error('Error unliking playlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/playlists/[id]/like - Check if user has liked a playlist
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ liked: false, likeCount: 0 })
    }

    const playlistId = params.id

    // Check if liked
    const existingLike = await prisma.playlistLike.findUnique({
      where: {
        playlistId_userId: {
          playlistId,
          userId: session.user.id,
        },
      },
    })

    // Get like count
    const likeCount = await prisma.playlistLike.count({
      where: { playlistId },
    })

    return NextResponse.json({ 
      liked: !!existingLike,
      likeCount,
    })
  } catch (error) {
    console.error('Error checking like status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

