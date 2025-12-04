export default function TestSpotify() {
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const hasClientSecret = !!process.env.SPOTIFY_CLIENT_SECRET
  
  const expectedRedirectUri = `${nextAuthUrl}/api/auth/callback/spotify`

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🔧 Spotify Configuration Test</h1>
        
        <div className="bg-zinc-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Environment Variables</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`text-2xl ${nextAuthUrl ? 'text-green-500' : 'text-red-500'}`}>
                {nextAuthUrl ? '✅' : '❌'}
              </div>
              <div className="flex-1">
                <div className="font-semibold">NEXTAUTH_URL</div>
                <div className="text-gray-400 font-mono text-sm">
                  {nextAuthUrl || 'Not set'}
                </div>
                {nextAuthUrl && !nextAuthUrl.startsWith('http://localhost') && (
                  <div className="text-yellow-500 text-sm mt-1">
                    ⚠️ Should be: http://localhost:3000
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`text-2xl ${spotifyClientId ? 'text-green-500' : 'text-red-500'}`}>
                {spotifyClientId ? '✅' : '❌'}
              </div>
              <div className="flex-1">
                <div className="font-semibold">SPOTIFY_CLIENT_ID</div>
                <div className="text-gray-400 font-mono text-sm">
                  {spotifyClientId ? `${spotifyClientId.substring(0, 8)}...` : 'Not set'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`text-2xl ${hasClientSecret ? 'text-green-500' : 'text-red-500'}`}>
                {hasClientSecret ? '✅' : '❌'}
              </div>
              <div className="flex-1">
                <div className="font-semibold">SPOTIFY_CLIENT_SECRET</div>
                <div className="text-gray-400 font-mono text-sm">
                  {hasClientSecret ? '••••••••' : 'Not set'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Expected Redirect URI</h2>
          <div className="bg-zinc-800 p-4 rounded font-mono text-sm text-spotify-green break-all">
            {expectedRedirectUri}
          </div>
          <div className="mt-4 text-gray-400 text-sm">
            Copy this EXACT URI and add it to your Spotify Developer Dashboard
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">📝 Checklist</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" />
              <span>Spotify Dashboard → Settings → Redirect URIs contains the URI above</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" />
              <span>Redirect URI starts with <code className="text-spotify-green">http://</code> (NOT https://)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" />
              <span>No trailing slash at the end of the URI</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" />
              <span>Clicked "Save" in Spotify Dashboard</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" />
              <span>Waited 1-2 minutes after saving</span>
            </label>
          </div>
        </div>

        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-3">💡 Quick Links</h3>
          <div className="space-y-2">
            <a 
              href="https://developer.spotify.com/dashboard" 
              target="_blank"
              rel="noopener noreferrer"
              className="block text-spotify-green hover:underline"
            >
              → Open Spotify Developer Dashboard
            </a>
            <a 
              href="/auth/signin"
              className="block text-spotify-green hover:underline"
            >
              → Test Spotify Login
            </a>
            <a 
              href="/"
              className="block text-spotify-green hover:underline"
            >
              → Go to Home Page
            </a>
          </div>
        </div>

        {(!spotifyClientId || !hasClientSecret || !nextAuthUrl) && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">⚠️ Configuration Incomplete</h3>
            <p className="text-gray-300">
              Some required environment variables are missing. Please update your .env file and restart the server.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

