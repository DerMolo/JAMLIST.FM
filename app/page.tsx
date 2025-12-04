import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-spotify-green to-emerald-400 bg-clip-text text-transparent">
            Spotify Collaborative Playlists
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Build, share, and discover music together through collaborative playlist management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="spotify-card">
            <h3 className="text-xl font-semibold mb-2">🎵 Create Playlists</h3>
            <p className="text-gray-400">
              Build your perfect playlists with an intuitive interface
            </p>
          </div>

          <div className="spotify-card">
            <h3 className="text-xl font-semibold mb-2">🤝 Collaborate</h3>
            <p className="text-gray-400">
              Submit pull requests to contribute to community playlists
            </p>
          </div>

          <div className="spotify-card">
            <h3 className="text-xl font-semibold mb-2">📊 Discover</h3>
            <p className="text-gray-400">
              Find new music through taste profiles and recommendations
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <Link href="/auth/signin" className="spotify-button">
            Sign In with Spotify
          </Link>
          <Link
            href="/auth/signup"
            className="px-6 py-3 rounded-full border border-spotify-green text-spotify-green font-semibold hover:bg-spotify-green hover:text-white transition-colors"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-spotify-green">∞</div>
            <div className="text-sm text-gray-400 mt-2">Playlists</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-spotify-green">PR</div>
            <div className="text-sm text-gray-400 mt-2">System</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-spotify-green">🎧</div>
            <div className="text-sm text-gray-400 mt-2">Sync</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-spotify-green">📈</div>
            <div className="text-sm text-gray-400 mt-2">Stats</div>
          </div>
        </div>
      </div>
    </main>
  )
}

