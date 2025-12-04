import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import sharp from 'sharp'

// Spotify image requirements
const SPOTIFY_MAX_IMAGE_SIZE = 256 * 1024 // 256KB
const SPOTIFY_IMAGE_DIMENSION = 640 // Spotify recommends 640x640 for playlist images

// Helper function to convert image URL to base64 JPEG for Spotify
async function getImageBase64(imageUrl: string): Promise<string | null> {
  try {
    console.log('Processing image for Spotify upload:', imageUrl.substring(0, 100) + '...')
    
    let imageBuffer: Buffer

    // If it's already a data URL (base64), extract and decode it
    if (imageUrl.startsWith('data:image/')) {
      // Format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
      const base64Data = imageUrl.split(',')[1]
      imageBuffer = Buffer.from(base64Data, 'base64')
      console.log('Decoded data URL image, size:', imageBuffer.length, 'bytes')
    } else {
      // Fetch the image from URL
      console.log('Fetching image from URL...')
      const response = await fetch(imageUrl, {
        headers: {
          'Accept': 'image/jpeg,image/png,image/webp,image/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      
      if (!response.ok) {
        console.error('Failed to fetch image:', response.status, response.statusText)
        return null
      }

      const contentType = response.headers.get('content-type')
      console.log('Image content type:', contentType)

      const arrayBuffer = await response.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
      console.log('Fetched image size:', imageBuffer.length, 'bytes')
    }

    // Use sharp to convert to JPEG and optimize for Spotify
    console.log('Converting image to JPEG format with sharp...')
    
    // Start with high quality and reduce if needed to fit size limit
    let quality = 90
    let jpegBuffer: Buffer
    
    // Resize to square and convert to JPEG
    const sharpInstance = sharp(imageBuffer)
      .resize(SPOTIFY_IMAGE_DIMENSION, SPOTIFY_IMAGE_DIMENSION, {
        fit: 'cover',
        position: 'center',
      })
    
    // Try with decreasing quality until we fit under the size limit
    do {
      jpegBuffer = await sharpInstance
        .clone()
        .jpeg({ quality, mozjpeg: true })
        .toBuffer()
      
      console.log(`JPEG at quality ${quality}: ${jpegBuffer.length} bytes`)
      
      if (jpegBuffer.length <= SPOTIFY_MAX_IMAGE_SIZE) {
        break
      }
      
      quality -= 10
    } while (quality >= 30)
    
    if (jpegBuffer.length > SPOTIFY_MAX_IMAGE_SIZE) {
      console.error('Could not compress image to fit Spotify size limit (256KB)')
      return null
    }

    const base64 = jpegBuffer.toString('base64')
    console.log('Successfully converted image to JPEG base64, length:', base64.length, 'chars')
    
    return base64
  } catch (error) {
    console.error('Error processing image for Spotify:', error)
    return null
  }
}

// Helper function to upload image to Spotify playlist
async function uploadPlaylistImage(
  playlistId: string,
  imageBase64: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Uploading image to Spotify playlist:', playlistId)
    console.log('Image base64 length:', imageBase64.length, 'chars')
    
    // Spotify API expects just the raw base64 string, no data URL prefix
    // The base64 should already be clean from getImageBase64()
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    
    // Calculate approximate decoded size
    const approximateSize = Math.ceil(cleanBase64.length * 3 / 4)
    console.log('Approximate decoded image size:', approximateSize, 'bytes')
    
    if (approximateSize > SPOTIFY_MAX_IMAGE_SIZE) {
      console.error('Image too large for Spotify:', approximateSize, 'bytes (max 256KB)')
      return { success: false, error: 'Image too large (max 256KB)' }
    }
    
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/images`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg',
        },
        body: cleanBase64,
      }
    )

    console.log('Spotify image upload response status:', response.status)

    // Spotify returns 202 Accepted for successful image uploads
    if (response.status === 202 || response.ok) {
      console.log('Successfully uploaded image to Spotify')
      return { success: true }
    }

    const errorText = await response.text()
    console.error('Failed to upload playlist image to Spotify:', response.status, errorText)
    
    // Check for specific errors
    if (response.status === 403) {
      const errorMsg = '403 Forbidden - User needs to reconnect Spotify with ugc-image-upload permission'
      console.error(errorMsg)
      return { success: false, error: errorMsg }
    } else if (response.status === 413) {
      const errorMsg = '413 Payload Too Large - Image exceeds 256KB limit'
      console.error(errorMsg)
      return { success: false, error: errorMsg }
    } else if (response.status === 401) {
      const errorMsg = '401 Unauthorized - Access token may be expired'
      console.error(errorMsg)
      return { success: false, error: errorMsg }
    }
    
    return { success: false, error: `Spotify API error: ${response.status} - ${errorText}` }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error uploading playlist image:', error)
    return { success: false, error: errorMsg }
  }
}

// Helper function to get valid Spotify access token (refreshes if expired)
async function getValidAccessToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      spotifyId: true,
      spotifyAccessToken: true,
      spotifyRefreshToken: true,
      spotifyTokenExpiresAt: true,
    },
  })

  if (!user?.spotifyAccessToken) {
    return null
  }

  let accessToken = user.spotifyAccessToken

  // Check if token is expired
  if (user.spotifyTokenExpiresAt && new Date(user.spotifyTokenExpiresAt) < new Date()) {
    if (!user.spotifyRefreshToken) {
      return null
    }

    // Refresh the token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.spotifyRefreshToken,
      }),
    })

    if (tokenResponse.ok) {
      const tokens = await tokenResponse.json()
      accessToken = tokens.access_token

      // Update database with new token
      await prisma.user.update({
        where: { id: userId },
        data: {
          spotifyAccessToken: tokens.access_token,
          spotifyTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      })
    } else {
      return null
    }
  }

  return { accessToken, spotifyId: user.spotifyId }
}

// POST /api/spotify/sync-playlist - Sync a local playlist or branch to Spotify
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playlistId, branchId, name: customName, description: customDescription } = body

    // If syncing a branch
    if (branchId) {
      return await syncBranch(session.user.id, branchId, customName, customDescription)
    }

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID required' }, { status: 400 })
    }

    // Get the local playlist with tracks
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

    // Check if user owns the playlist
    if (playlist.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get Spotify access token
    const tokenData = await getValidAccessToken(session.user.id)
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Spotify not connected', needsSpotifyConnection: true },
        { status: 403 }
      )
    }

    const { accessToken, spotifyId } = tokenData

    let spotifyPlaylistId = playlist.spotifyId
    let needsCreate = !spotifyPlaylistId

    // If playlist has a Spotify ID, check if it's still in the user's library
    // Note: Spotify doesn't fully delete playlists, they just remove them from library
    // So we need to check if the user still has it in their library
    if (spotifyPlaylistId) {
      // First check if the playlist exists at all
      const checkResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (checkResponse.status === 404) {
        // Playlist truly doesn't exist - need to recreate it
        console.log(`Spotify playlist ${spotifyPlaylistId} not found, will recreate`)
        spotifyPlaylistId = null
        needsCreate = true
        
        // Clear the old Spotify ID from database
        await prisma.internalPlaylist.update({
          where: { id: playlistId },
          data: { spotifyId: null },
        })
      } else if (checkResponse.ok) {
        // Playlist exists, but check if user follows it (has it in their library)
        const followCheckResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/followers/contains?ids=${spotifyId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )

        if (followCheckResponse.ok) {
          const [userFollows] = await followCheckResponse.json()
          
          if (!userFollows) {
            // User removed the playlist from their library - recreate it
            console.log(`User no longer follows Spotify playlist ${spotifyPlaylistId}, will recreate`)
            spotifyPlaylistId = null
            needsCreate = true
            
            // Clear the old Spotify ID from database
            await prisma.internalPlaylist.update({
              where: { id: playlistId },
              data: { spotifyId: null },
            })
          }
        } else {
          console.error('Error checking playlist follow status:', await followCheckResponse.text())
        }
      } else {
        // Some other error - log it but try to continue
        console.error('Error checking Spotify playlist:', await checkResponse.text())
      }
    }

    // Create new playlist on Spotify if needed
    if (needsCreate) {
      const createResponse = await fetch(
        `https://api.spotify.com/v1/users/${spotifyId}/playlists`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: playlist.name,
            description: playlist.description || `Synced from JAMLIST.FM`,
            public: playlist.isPublic,
            collaborative: playlist.isCollaborative && !playlist.isPublic, // Spotify requires public=false for collaborative
          }),
        }
      )

      if (!createResponse.ok) {
        const error = await createResponse.text()
        console.error('Failed to create Spotify playlist:', error)
        return NextResponse.json(
          { error: 'Failed to create playlist on Spotify' },
          { status: 500 }
        )
      }

      const spotifyPlaylist = await createResponse.json()
      spotifyPlaylistId = spotifyPlaylist.id

      // Save the Spotify playlist ID to our database
      await prisma.internalPlaylist.update({
        where: { id: playlistId },
        data: { spotifyId: spotifyPlaylistId },
      })
    } else if (spotifyPlaylistId) {
      // Update existing Spotify playlist details
      const updateResponse = await fetch(`https://api.spotify.com/v1/playlists/${spotifyPlaylistId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlist.name,
          description: playlist.description || `Synced from JAMLIST.FM`,
          public: playlist.isPublic,
        }),
      })

      if (!updateResponse.ok) {
        const error = await updateResponse.text()
        console.error('Failed to update Spotify playlist:', error)
        // Don't fail entirely - continue with track sync
      }
    }

    // Upload playlist image if available
    let imageUploaded = false
    let imageError: string | undefined
    if (playlist.imageUrl && spotifyPlaylistId) {
      const imageBase64 = await getImageBase64(playlist.imageUrl)
      if (imageBase64) {
        const uploadResult = await uploadPlaylistImage(spotifyPlaylistId, imageBase64, accessToken)
        imageUploaded = uploadResult.success
        imageError = uploadResult.error
        if (imageUploaded) {
          console.log('Successfully uploaded playlist image to Spotify')
        } else {
          console.error('Failed to upload playlist image:', imageError)
        }
      } else {
        console.log('Could not process image for Spotify upload')
      }
    }

    // Get tracks with Spotify IDs
    const trackUris = playlist.tracks
      .filter((t) => t.track.spotifyId)
      .map((t) => `spotify:track:${t.track.spotifyId}`)

    if (trackUris.length > 0) {
      // Clear existing tracks and add new ones
      // First, replace all tracks (this clears and adds in one call)
      const replaceResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: trackUris.slice(0, 100), // Spotify limits to 100 tracks per request
          }),
        }
      )

      if (!replaceResponse.ok) {
        const error = await replaceResponse.text()
        console.error('Failed to sync tracks:', error)
        // Continue even if tracks fail - playlist was created
      }

      // If more than 100 tracks, add the rest in batches
      if (trackUris.length > 100) {
        for (let i = 100; i < trackUris.length; i += 100) {
          const batch = trackUris.slice(i, i + 100)
          await fetch(
            `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                uris: batch,
              }),
            }
          )
        }
      }
    }

    // Get the current Spotify track IDs for saving the synced state
    const syncedTrackIds = playlist.tracks
      .filter((t) => t.track.spotifyId)
      .map((t) => t.track.spotifyId)

    // Update sync timestamp AND save the synced state
    // This allows us to compare future changes against this baseline
    await prisma.internalPlaylist.update({
      where: { id: playlistId },
      data: { 
        spotifyId: spotifyPlaylistId,
        updatedAt: new Date(),
        // Save the synced state for future comparison
        lastSyncedAt: new Date(),
        lastSyncedName: playlist.name,
        lastSyncedDesc: playlist.description || '',
        lastSyncedTracks: syncedTrackIds,
      },
    })

    // Build descriptive message
    let message = needsCreate 
      ? `Playlist created on Spotify with ${trackUris.length} tracks`
      : `Playlist synced to Spotify with ${trackUris.length} tracks`
    
    if (imageUploaded) {
      message += ' (image updated)'
    } else if (playlist.imageUrl && imageError) {
      message += ` (image upload failed: ${imageError})`
    }

    return NextResponse.json({
      success: true,
      spotifyId: spotifyPlaylistId,
      spotifyUrl: `https://open.spotify.com/playlist/${spotifyPlaylistId}`,
      tracksSync: trackUris.length,
      wasRecreated: needsCreate,
      imageUploaded,
      imageError: imageError || undefined,
      message,
    })
  } catch (error) {
    console.error('Error syncing playlist to Spotify:', error)
    return NextResponse.json(
      { error: 'Failed to sync playlist' },
      { status: 500 }
    )
  }
}

// Helper function to sync a branch to Spotify
async function syncBranch(
  userId: string, 
  branchId: string, 
  customName?: string,
  customDescription?: string
) {
  try {
    // Get the branch with its tracks and parent playlist
    const branch = await prisma.playlistBranch.findUnique({
      where: { id: branchId },
      include: {
        playlist: true,
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

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Verify ownership
    if (branch.ownerId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get Spotify access token
    const tokenData = await getValidAccessToken(userId)
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Spotify not connected', needsSpotifyConnection: true },
        { status: 403 }
      )
    }

    const { accessToken, spotifyId: userSpotifyId } = tokenData

    let spotifyPlaylistId = branch.spotifyId
    let needsCreate = !spotifyPlaylistId

    // Check if existing playlist is still valid
    if (spotifyPlaylistId) {
      const checkResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (checkResponse.status === 404) {
        spotifyPlaylistId = null
        needsCreate = true
        
        await prisma.playlistBranch.update({
          where: { id: branchId },
          data: { spotifyId: null },
        })
      }
    }

    const playlistName = customName || `${branch.playlist.name} - ${branch.name}`
    const playlistDescription = customDescription || 
      `Branch by ${branch.playlist.name}. ${branch.description || ''}`

    // Create new playlist on Spotify if needed
    if (needsCreate) {
      const createResponse = await fetch(
        `https://api.spotify.com/v1/users/${userSpotifyId}/playlists`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: playlistName,
            description: playlistDescription.substring(0, 300),
            public: false,
          }),
        }
      )

      if (!createResponse.ok) {
        const error = await createResponse.text()
        console.error('Failed to create Spotify playlist for branch:', error)
        return NextResponse.json(
          { error: 'Failed to create playlist on Spotify' },
          { status: 500 }
        )
      }

      const spotifyPlaylist = await createResponse.json()
      spotifyPlaylistId = spotifyPlaylist.id

      await prisma.playlistBranch.update({
        where: { id: branchId },
        data: { spotifyId: spotifyPlaylistId },
      })
    } else if (spotifyPlaylistId) {
      // Update existing playlist details
      await fetch(`https://api.spotify.com/v1/playlists/${spotifyPlaylistId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,
          description: playlistDescription.substring(0, 300),
        }),
      })
    }

    // Upload playlist image if parent has one
    let imageUploaded = false
    if (branch.playlist.imageUrl && spotifyPlaylistId) {
      const imageBase64 = await getImageBase64(branch.playlist.imageUrl)
      if (imageBase64) {
        const uploadResult = await uploadPlaylistImage(spotifyPlaylistId, imageBase64, accessToken)
        imageUploaded = uploadResult.success
        if (!imageUploaded) {
          console.error('Failed to upload branch playlist image:', uploadResult.error)
        }
      }
    }

    // Get tracks with Spotify IDs
    const trackUris = branch.tracks
      .filter((t) => t.track.spotifyId)
      .map((t) => `spotify:track:${t.track.spotifyId}`)

    if (trackUris.length > 0) {
      // Replace all tracks
      await fetch(
        `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: trackUris.slice(0, 100),
          }),
        }
      )

      // Add remaining tracks if more than 100
      if (trackUris.length > 100) {
        for (let i = 100; i < trackUris.length; i += 100) {
          const batch = trackUris.slice(i, i + 100)
          await fetch(
            `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                uris: batch,
              }),
            }
          )
        }
      }
    }

    // Update branch
    await prisma.playlistBranch.update({
      where: { id: branchId },
      data: { 
        spotifyId: spotifyPlaylistId,
        updatedAt: new Date(),
      },
    })

    const message = needsCreate 
      ? `Branch playlist created on Spotify with ${trackUris.length} tracks`
      : `Branch playlist synced to Spotify with ${trackUris.length} tracks`

    return NextResponse.json({
      success: true,
      spotifyId: spotifyPlaylistId,
      spotifyUrl: `https://open.spotify.com/playlist/${spotifyPlaylistId}`,
      tracksSync: trackUris.length,
      wasRecreated: needsCreate,
      imageUploaded,
      message,
    })
  } catch (error) {
    console.error('Error syncing branch to Spotify:', error)
    return NextResponse.json(
      { error: 'Failed to sync branch' },
      { status: 500 }
    )
  }
}

