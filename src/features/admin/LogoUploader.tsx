import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

export default function LogoUploader() {
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchOrganization()
  }, [])

  const fetchOrganization = async () => {
    try {
      setLoading(true)

      // Try selecting logo_url from organizations
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setOrganizationId(data.id)
        if (data.logo_url) {
          setCurrentLogoUrl(data.logo_url)
          return
        }
      }

      // If logo_url column does not exist or is null, try settings table or localStorage
      const { data: orgSimple } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1)
        .maybeSingle()

      if (orgSimple) setOrganizationId(orgSimple.id)

      const { data: settingData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'hospital_logo')
        .maybeSingle()

      if (settingData?.value?.url) {
        setCurrentLogoUrl(settingData.value.url)
      } else {
        const localLogo = localStorage.getItem('mithra_logo_url')
        if (localLogo) setCurrentLogoUrl(localLogo)
      }

    } catch (err) {
      console.warn('Error fetching organization/logo:', err)
      const localLogo = localStorage.getItem('mithra_logo_url')
      if (localLogo) setCurrentLogoUrl(localLogo)
    } finally {
      setLoading(false)
    }
  }

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload PNG, JPG, SVG, or WebP.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 2MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`
    }
    return null
  }

  const handleFileSelect = (file: File) => {
    setError(null)
    setSuccess(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      setError(null)

      let publicUrl = ''

      // Attempt upload to Supabase Storage bucket
      try {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `hospital-logo-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: true,
          })

        if (!uploadError) {
          const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
          publicUrl = data.publicUrl
        } else {
          throw uploadError
        }
      } catch (storageErr: any) {
        console.warn('Storage bucket upload failed, using Data URL fallback:', storageErr?.message)
        // Fallback to Data URL (base64) so logo upload works even without bucket setup
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = (e) => reject(e)
          reader.readAsDataURL(selectedFile)
        })
      }

      // Always save to localStorage & settings as fallback
      localStorage.setItem('mithra_logo_url', publicUrl)
      await supabase.from('settings').upsert(
        {
          key: 'hospital_logo',
          category: 'general',
          value: { url: publicUrl },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

      // Update organization record in DB if logo_url column exists
      if (organizationId) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ logo_url: publicUrl })
          .eq('id', organizationId)

        if (updateError) {
          console.warn('Organization logo_url column update notice:', updateError.message)
        }
      } else {
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({ name: 'Mithra Hospital' })
          .select()
          .single()

        if (!createError && newOrg) {
          setOrganizationId(newOrg.id)
          await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', newOrg.id)
        }
      }

      setCurrentLogoUrl(publicUrl)
      setSelectedFile(null)
      setPreviewUrl(null)
      window.dispatchEvent(new Event('logo_updated'))
      setSuccess('Logo updated and saved successfully! It will appear across navigation headers and printed receipts.')

      // Clear success after 5s
      setTimeout(() => setSuccess(null), 5000)

    } catch (err: any) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    try {
      setRemoving(true)
      setError(null)

      localStorage.removeItem('mithra_logo_url')
      await supabase.from('settings').delete().eq('key', 'hospital_logo')

      if (organizationId) {
        await supabase
          .from('organizations')
          .update({ logo_url: null })
          .eq('id', organizationId)
      }

      setCurrentLogoUrl(null)
      window.dispatchEvent(new Event('logo_updated'))
      setSuccess('Logo removed. Default icon will be shown.')
      setTimeout(() => setSuccess(null), 5000)

    } catch (err: any) {
      setError('Remove failed: ' + err.message)
    } finally {
      setRemoving(false)
    }
  }

  const cancelPreview = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Hospital Logo & Branding</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Upload your hospital logo. It will be displayed in the sidebar navigation and printed on receipts.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:bg-red-100 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Logo Preview */}
        <div className="space-y-3">
          <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Current Logo</label>
          <div className="w-full aspect-square max-w-[200px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden">
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt="Hospital Logo"
                className="w-full h-full object-contain p-4"
                onError={() => setCurrentLogoUrl(null)}
              />
            ) : (
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400">No logo uploaded</p>
                <p className="text-[10px] text-gray-300 mt-0.5">Default icon is used</p>
              </div>
            )}
          </div>

          {currentLogoUrl && (
            <button
              onClick={handleRemoveLogo}
              disabled={removing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {removing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  Remove Logo
                </>
              )}
            </button>
          )}
        </div>

        {/* Upload Area */}
        <div className="space-y-3">
          <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Upload New Logo</label>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full aspect-square max-w-[200px] border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-center ${
              dragActive
                ? 'border-teal-500 bg-teal-50/60 scale-[1.02]'
                : previewUrl
                  ? 'border-teal-300 bg-teal-50/30'
                  : 'border-gray-200 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/30'
            }`}
          >
            {previewUrl ? (
              <div className="relative w-full h-full">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain p-4"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); cancelPreview() }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow border border-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="text-center p-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors ${
                  dragActive ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-gray-600">
                  {dragActive ? 'Drop your logo here' : 'Drag & drop or click'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, SVG, WebP • Max 2MB</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.webp"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-600">
                <span className="font-medium">Selected:</span> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </p>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-95"
              >
                {uploading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload Logo
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
        <p className="text-[11px] text-blue-800 font-medium">📌 Where your logo appears:</p>
        <ul className="text-[11px] text-blue-700 mt-1 space-y-0.5 list-disc list-inside">
          <li>Sidebar navigation header (replaces the default teal icon)</li>
          <li>Pharmacy thermal receipts (80mm receipt header)</li>
          <li>Hospital billing invoices (A4 print header)</li>
        </ul>
      </div>
    </div>
  )
}
