import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import SpotifyProvider from 'next-auth/providers/spotify'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-library-modify',
  'user-top-read',
  'ugc-image-upload', // Required for uploading playlist cover images
].join(' ')

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { profile: true },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.displayName || user.email,
        }
      },
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        url: 'https://accounts.spotify.com/authorize',
        params: {
          scope: SPOTIFY_SCOPES,
          show_dialog: true,
          redirect_uri: 'http://127.0.0.1:3000/api/auth/callback/spotify',
        },
      },
      token: {
        url: 'https://accounts.spotify.com/api/token',
        params: {
          redirect_uri: 'http://127.0.0.1:3000/api/auth/callback/spotify',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        if (account.provider === 'spotify') {
          // Handle Spotify sign-in with proper conflict resolution
          let dbUser = null

          // First, check if there's already a user with this Spotify ID
          const existingSpotifyUser = await prisma.user.findUnique({
            where: { spotifyId: account.providerAccountId },
          })

          if (existingSpotifyUser) {
            // User already has this Spotify account connected - just update tokens
            dbUser = await prisma.user.update({
              where: { id: existingSpotifyUser.id },
              data: {
                spotifyAccessToken: account.access_token,
                spotifyRefreshToken: account.refresh_token,
                spotifyTokenExpiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
              },
            })
          } else {
            // No user with this Spotify ID - check if there's a user with matching email
            const existingEmailUser = await prisma.user.findUnique({
              where: { email: user.email! },
            })

            if (existingEmailUser) {
              // User exists with this email - connect Spotify to their account
              dbUser = await prisma.user.update({
                where: { id: existingEmailUser.id },
                data: {
                  spotifyId: account.providerAccountId,
                  spotifyAccessToken: account.access_token,
                  spotifyRefreshToken: account.refresh_token,
                  spotifyTokenExpiresAt: account.expires_at
                    ? new Date(account.expires_at * 1000)
                    : null,
                },
              })
            } else {
              // No existing user - create a new one
              dbUser = await prisma.user.create({
                data: {
                  email: user.email!,
                  spotifyId: account.providerAccountId,
                  spotifyAccessToken: account.access_token,
                  spotifyRefreshToken: account.refresh_token,
                  spotifyTokenExpiresAt: account.expires_at
                    ? new Date(account.expires_at * 1000)
                    : null,
                  passwordHash: '', // No password for OAuth users
                  profile: {
                    create: {
                      displayName: user.name || user.email!,
                    },
                  },
                },
              })
            }
          }

          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
            userId: dbUser.id,
          }
        }

        // For credentials provider, user.id is already set
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          userId: user.id,
        }
      }

      // If token doesn't have userId yet (existing session), fetch from DB
      if (!token.userId && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true },
        })
        if (dbUser) {
          token.userId = dbUser.id
        }
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, try to refresh it
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
      }
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Enable debug mode if needed
  debug: process.env.NODE_ENV === 'development',
}

