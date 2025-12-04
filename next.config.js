/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.scdn.co', 'mosaic.scdn.co', 'image-cdn-ak.spotifycdn.com'],
  },
  env: {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
}

module.exports = nextConfig

