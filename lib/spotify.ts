import SpotifyWebApi from 'spotify-web-api-node'

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.NEXTAUTH_URL + '/api/auth/callback/spotify',
})

export default spotifyApi

export async function refreshAccessToken(refreshToken: string) {
  try {
    spotifyApi.setRefreshToken(refreshToken)
    const data = await spotifyApi.refreshAccessToken()
    return {
      accessToken: data.body.access_token,
      expiresAt: Date.now() + data.body.expires_in * 1000,
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)
    throw error
  }
}

export async function getUserPlaylists(accessToken: string) {
  spotifyApi.setAccessToken(accessToken)
  const data = await spotifyApi.getUserPlaylists()
  return data.body.items
}

export async function getPlaylist(playlistId: string, accessToken: string) {
  spotifyApi.setAccessToken(accessToken)
  const data = await spotifyApi.getPlaylist(playlistId)
  return data.body
}

export async function searchTracks(query: string, accessToken: string) {
  spotifyApi.setAccessToken(accessToken)
  const data = await spotifyApi.searchTracks(query, { limit: 20 })
  return data.body.tracks?.items || []
}

export async function getTrackAudioFeatures(trackId: string, accessToken: string) {
  spotifyApi.setAccessToken(accessToken)
  const data = await spotifyApi.getAudioFeaturesForTrack(trackId)
  return data.body
}

export async function createPlaylist(
  userId: string,
  name: string,
  description: string,
  isPublic: boolean,
  accessToken: string
) {
  spotifyApi.setAccessToken(accessToken)
  const data = await spotifyApi.createPlaylist(name, {
    description,
    public: isPublic,
  })
  return data.body
}

export async function addTracksToPlaylist(
  playlistId: string,
  trackUris: string[],
  accessToken: string
) {
  spotifyApi.setAccessToken(accessToken)
  const data = await spotifyApi.addTracksToPlaylist(playlistId, trackUris)
  return data.body
}

export async function removeTracksFromPlaylist(
  playlistId: string,
  trackUris: string[],
  accessToken: string
) {
  spotifyApi.setAccessToken(accessToken)
  const tracks = trackUris.map(uri => ({ uri }))
  const data = await spotifyApi.removeTracksFromPlaylist(playlistId, tracks)
  return data.body
}

