'use client'

import { useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PickedPhoto {
  file: File
  previewUrl: string
}

interface PhotoUploadProps {
  photos: PickedPhoto[]
  onChange: (photos: PickedPhoto[]) => void
  max?: number
}

export function PhotoUpload({ photos, onChange, max = 5 }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const remaining = max - photos.length
    const picked = Array.from(files).slice(0, remaining).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    onChange([...photos, ...picked])
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(index: number) {
    const next = [...photos]
    URL.revokeObjectURL(next[index].previewUrl)
    next.splice(index, 1)
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-3">
      {photos.map((photo, i) => (
        <div key={photo.previewUrl} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.previewUrl} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {photos.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1',
            'text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors',
          )}
        >
          <Camera className="h-5 w-5" />
          <span className="text-[10px]">{photos.length}/{max}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
