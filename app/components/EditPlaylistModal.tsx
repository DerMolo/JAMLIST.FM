'use client'

import { useState, useRef } from 'react'

interface EditPlaylistModalProps {
  playlist: {
    id: string
    name: string
    description?: string | null
    imageUrl?: string | null
    isPublic: boolean
    isCollaborative: boolean
  }
  onClose: () => void
  onSuccess: () => void
}

export default function EditPlaylistModal({
  playlist,
  onClose,
  onSuccess,
}: EditPlaylistModalProps) {
  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description || '')
  const [imageUrl, setImageUrl] = useState(playlist.imageUrl || '')
  const [isPublic, setIsPublic] = useState(playlist.isPublic)
  const [isCollaborative, setIsCollaborative] = useState(playlist.isCollaborative)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePreviewError, setImagePreviewError] = useState(false)
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url')
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null)
  const [imageUploadLoading, setImageUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || null,
          imageUrl: imageUrl || null,
          isPublic,
          isCollaborative,
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update playlist')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url)
    setImagePreviewError(false)
    setUploadedImagePreview(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB for local storage, we'll compress for Spotify)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setImageUploadLoading(true)
    setError('')

    try {
      // Create a preview and convert to base64/data URL
      const reader = new FileReader()
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string
        
        // Create an image to resize if needed
        const img = new Image()
        img.onload = () => {
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 640 // Spotify recommends 640x640
          
          let { width, height } = img
          
          // Maintain aspect ratio while fitting within MAX_SIZE
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width)
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height)
              height = MAX_SIZE
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            
            // Convert to JPEG with quality compression
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
            
            setUploadedImagePreview(compressedDataUrl)
            setImageUrl(compressedDataUrl)
            setImagePreviewError(false)
          }
          
          setImageUploadLoading(false)
        }
        
        img.onerror = () => {
          setError('Failed to process image')
          setImageUploadLoading(false)
        }
        
        img.src = dataUrl
      }
      
      reader.onerror = () => {
        setError('Failed to read image file')
        setImageUploadLoading(false)
      }
      
      reader.readAsDataURL(file)
    } catch (err) {
      setError('Failed to process image')
      setImageUploadLoading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const clearImage = () => {
    setImageUrl('')
    setUploadedImagePreview(null)
    setImagePreviewError(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Image Preview & Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Image
            </label>
            
            {/* Image Input Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setImageInputMode('upload')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  imageInputMode === 'upload'
                    ? 'bg-spotify-green text-black'
                    : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                }`}
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => setImageInputMode('url')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  imageInputMode === 'url'
                    ? 'bg-spotify-green text-black'
                    : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                }`}
              >
                Use URL
              </button>
            </div>

            <div className="flex gap-4">
              {/* Image Preview */}
              <div className="w-32 h-32 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                {imageUploadLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400">Processing...</span>
                  </div>
                ) : (uploadedImagePreview || imageUrl) && !imagePreviewError ? (
                  <img
                    src={uploadedImagePreview || imageUrl}
                    alt="Playlist cover"
                    className="w-full h-full object-cover"
                    onError={() => setImagePreviewError(true)}
                  />
                ) : (
                  <svg
                    className="w-12 h-12 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {imageInputMode === 'upload' ? (
                  <>
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      disabled={imageUploadLoading}
                      className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-zinc-700 hover:border-spotify-green text-gray-400 hover:text-spotify-green transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {imageUploadLoading ? 'Processing...' : 'Choose Image'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: Square image, at least 300x300 pixels. Max 5MB.
                      <br />
                      Images will be automatically resized and optimized.
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      type="url"
                      value={uploadedImagePreview ? '' : imageUrl}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      className="spotify-input w-full"
                      placeholder="https://example.com/image.jpg"
                      disabled={!!uploadedImagePreview}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter a URL to an image. Recommended size: 300x300 pixels.
                    </p>
                  </>
                )}

                {imagePreviewError && imageUrl && (
                  <p className="text-xs text-red-400 mt-1">
                    Unable to load image from this URL
                  </p>
                )}
                
                {(imageUrl || uploadedImagePreview) && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="text-xs text-red-400 hover:text-red-300 mt-2 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="spotify-input w-full"
              placeholder="My Awesome Playlist"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="spotify-input w-full"
              rows={3}
              placeholder="What's this playlist about?"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 accent-spotify-green rounded"
              />
              <div>
                <span className="text-sm text-gray-300">Make playlist public</span>
                <p className="text-xs text-gray-500">Anyone can find and view this playlist</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="w-5 h-5 accent-spotify-green rounded"
              />
              <div>
                <span className="text-sm text-gray-300">Enable collaborations</span>
                <p className="text-xs text-gray-500">Others can submit pull requests to add tracks</p>
              </div>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-full border border-gray-600 text-gray-300 font-semibold hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 spotify-button disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

