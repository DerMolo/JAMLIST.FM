'use client'

import { useEffect, useState } from 'react'

export default function DebugSpotify() {
  const [clientSide, setClientSide] = useState<any>({})
  
  useEffect(() => {
    // Get what's actually being sent from the browser
    setClientSide({
      origin: window.location.origin,
      expectedCallback: `${window.location.origin}/api/auth/callback/spotify`,
      currentUrl: window.location.href,
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🔍 Spotify OAuth Debug</h1>

        <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">🔴 Current Issue</h2>
          <p className="text-lg mb-2">Error: "INVALID_CLIENT: Insecure redirect URI"</p>
          <p className="text-gray-300">This means Spotify is rejecting your redirect URI.</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">📍 Your Redirect URI</h2>
          <div className="bg-zinc-800 p-4 rounded mb-4">
            <div className="font-mono text-spotify-green break-all">
              {clientSide.expectedCallback || 'Loading...'}
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Copy this EXACT URI to your Spotify Developer Dashboard
          </p>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">⚠️ Common Causes</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <div className="font-semibold">Redirect URI not in Spotify Dashboard</div>
                <div className="text-sm text-gray-300">
                  You must add the exact URI above to your app's settings
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <div className="font-semibold">Typo or trailing slash</div>
                <div className="text-sm text-gray-300">
                  Make sure there's NO trailing slash: <code className="text-red-400">...spotify/</code> ❌
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <div className="font-semibold">Wrong Client ID or Secret</div>
                <div className="text-sm text-gray-300">
                  Verify your credentials in .env match Spotify Dashboard
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">4️⃣</span>
              <div>
                <div className="font-semibold">Changes not saved</div>
                <div className="text-sm text-gray-300">
                  Click "Save" in Spotify Dashboard and wait 1-2 minutes
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">📋 Step-by-Step Fix</h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="text-spotify-green font-bold">Step 1:</span>
              <div>
                <div className="font-semibold mb-2">Open Spotify Developer Dashboard</div>
                <a 
                  href="https://developer.spotify.com/dashboard" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-spotify-green text-black px-4 py-2 rounded-full hover:scale-105 transition-transform"
                >
                  Open Dashboard →
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-spotify-green font-bold">Step 2:</span>
              <div>
                <div className="font-semibold">Click your app, then "Settings"</div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-spotify-green font-bold">Step 3:</span>
              <div>
                <div className="font-semibold mb-2">Scroll to "Redirect URIs"</div>
                <div className="bg-zinc-800 p-3 rounded font-mono text-sm text-spotify-green break-all mb-2">
                  {clientSide.expectedCallback || 'Loading...'}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(clientSide.expectedCallback || '')
                    alert('Copied to clipboard!')
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  📋 Copy URI
                </button>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-spotify-green font-bold">Step 4:</span>
              <div>
                <div className="font-semibold">Paste it and click "Add"</div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-spotify-green font-bold">Step 5:</span>
              <div>
                <div className="font-semibold text-red-400">IMPORTANT: Scroll down and click "Save"</div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-spotify-green font-bold">Step 6:</span>
              <div>
                <div className="font-semibold">Wait 1-2 minutes for changes to propagate</div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-spotify-green font-bold">Step 7:</span>
              <div>
                <div className="font-semibold">Test the login</div>
                <a 
                  href="/auth/signin"
                  className="inline-block bg-spotify-green text-black px-4 py-2 rounded-full hover:scale-105 transition-transform mt-2"
                >
                  Test Login →
                </a>
              </div>
            </li>
          </ol>
        </div>

        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">🔍 Verify Your Setup</h2>
          <div className="space-y-3">
            <div>
              <div className="font-semibold">Your App Origin:</div>
              <div className="font-mono text-sm text-gray-300">{clientSide.origin}</div>
            </div>
            <div>
              <div className="font-semibold">Expected Callback URL:</div>
              <div className="font-mono text-sm text-gray-300">{clientSide.expectedCallback}</div>
            </div>
            <div className="mt-4 p-4 bg-zinc-800 rounded">
              <div className="font-semibold mb-2">In Spotify Dashboard, your Redirect URIs should show:</div>
              <div className="font-mono text-sm text-spotify-green">
                ✓ {clientSide.expectedCallback}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">🧪 Alternative: Use 127.0.0.1</h2>
          <p className="text-gray-300 mb-4">
            If localhost still doesn't work, try using 127.0.0.1 instead:
          </p>
          <div className="bg-zinc-800 p-4 rounded mb-4">
            <div className="font-mono text-sm text-yellow-400">
              http://127.0.0.1:3000/api/auth/callback/spotify
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Add BOTH redirect URIs to Spotify Dashboard, then update NEXTAUTH_URL in .env to use 127.0.0.1
          </p>
        </div>
      </div>
    </div>
  )
}

