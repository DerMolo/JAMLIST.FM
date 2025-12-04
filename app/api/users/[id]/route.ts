import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/users/[id] - Get a public user profile
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = params.id
    const isOwnProfile = session?.user?.id === userId

    // Fetch user with their profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
            avatarUrl: true,
            bannerUrl: true,
          },
        },
        // Get user's public playlists (or all if viewing own profile)
        playlists: {
          where: isOwnProfile ? {} : { isPublic: true },
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            isPublic: true,
            isCollaborative: true,
            createdAt: true,
            _count: {
              select: {
                tracks: true,
                likes: true,
                forks: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
        // Get playlists they contribute to
        contributions: {
          where: {
            playlist: isOwnProfile ? {} : { isPublic: true },
          },
          select: {
            role: true,
            addedAt: true,
            playlist: {
              select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                isPublic: true,
                owner: {
                  select: {
                    id: true,
                    profile: {
                      select: {
                        displayName: true,
                      },
                    },
                  },
                },
                _count: {
                  select: {
                    tracks: true,
                    likes: true,
                  },
                },
              },
            },
          },
          orderBy: {
            addedAt: 'desc',
          },
          take: 20,
        },
        // Stats
        stats: {
          select: {
            totalPlaylists: true,
            totalTracks: true,
          },
        },
        _count: {
          select: {
            playlists: true,
            contributions: true,
            pullRequestsCreated: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get additional stats
    const publicPlaylistCount = await prisma.internalPlaylist.count({
      where: {
        ownerId: userId,
        isPublic: true,
      },
    })

    const publicContributionCount = await prisma.playlistContributor.count({
      where: {
        userId: userId,
        playlist: {
          isPublic: true,
        },
      },
    })

    // Get merged PRs count
    const mergedPRCount = await prisma.pullRequest.count({
      where: {
        creatorId: userId,
        status: 'MERGED',
      },
    })

    return NextResponse.json({
      id: user.id,
      displayName: user.profile?.displayName || 'Anonymous User',
      bio: user.profile?.bio || null,
      avatarUrl: user.profile?.avatarUrl || null,
      bannerUrl: user.profile?.bannerUrl || null,
      memberSince: user.createdAt,
      isOwnProfile,
      stats: {
        publicPlaylists: publicPlaylistCount,
        totalPlaylists: isOwnProfile ? user._count.playlists : publicPlaylistCount,
        contributions: isOwnProfile ? user._count.contributions : publicContributionCount,
        mergedPullRequests: mergedPRCount,
      },
      playlists: user.playlists.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        isPublic: p.isPublic,
        isCollaborative: p.isCollaborative,
        createdAt: p.createdAt,
        trackCount: p._count.tracks,
        likeCount: p._count.likes,
        forkCount: p._count.forks,
      })),
      contributions: user.contributions
        .filter(c => c.playlist) // Filter out any null playlists
        .map(c => ({
          role: c.role,
          addedAt: c.addedAt,
          playlist: {
            id: c.playlist.id,
            name: c.playlist.name,
            description: c.playlist.description,
            imageUrl: c.playlist.imageUrl,
            isPublic: c.playlist.isPublic,
            ownerName: c.playlist.owner.profile?.displayName || 'Unknown',
            ownerId: c.playlist.owner.id,
            trackCount: c.playlist._count.tracks,
            likeCount: c.playlist._count.likes,
          },
        })),
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}

