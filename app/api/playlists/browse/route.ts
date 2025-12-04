import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/playlists/browse - Browse public/collaborative playlists
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // 'all', 'collaborative', 'popular', 'recent'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build the where clause
    const whereClause: any = {
      OR: [
        { isPublic: true },
        { isCollaborative: true },
      ],
      // Exclude user's own playlists
      ...(session?.user?.id ? { NOT: { ownerId: session.user.id } } : {}),
    }

    // Add search filter
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { owner: { profile: { displayName: { contains: search, mode: 'insensitive' } } } },
          ],
        },
      ]
    }

    // Apply filter
    if (filter === 'collaborative') {
      whereClause.isCollaborative = true
    }

    // Build orderBy based on filter
    let orderBy: any = { updatedAt: 'desc' }
    if (filter === 'popular') {
      orderBy = { likes: { _count: 'desc' } }
    } else if (filter === 'recent') {
      orderBy = { createdAt: 'desc' }
    }

    // Get playlists with counts
    const [playlists, total] = await Promise.all([
      prisma.internalPlaylist.findMany({
        where: whereClause,
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
              forks: true,
              branches: true,
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.internalPlaylist.count({ where: whereClause }),
    ])

    return NextResponse.json({
      playlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error browsing playlists:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

