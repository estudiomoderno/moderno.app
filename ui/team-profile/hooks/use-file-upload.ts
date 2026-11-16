"use client"

import { useEffect, useRef, useState } from "react"

export interface FileMetadata {
  name: string
  size: number
  type: string
  url?: string
}

export interface FileWithPreview {
  id: string
  file: File | FileMetadata
  preview?: string
}

interface UseFileUploadOptions {
  maxFiles?: number
  maxSize?: number
  accept?: string
  multiple?: boolean
  initialFiles?: FileWithPreview[]
  onFilesChange?: (files: FileWithPreview[]) => void
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** unit).toLocaleString("es-ES", { maximumFractionDigits: 1 })} ${units[unit]}`
}

export function useFileUpload({
  maxFiles = 3,
  maxSize = 2 * 1024 * 1024,
  accept = "image/*",
  multiple = true,
  initialFiles = [],
  onFilesChange,
}: UseFileUploadOptions = {}) {
  const [files, setFiles] = useState<FileWithPreview[]>(initialFiles)
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const input = useRef<HTMLInputElement>(null)
  const currentFiles = useRef(files)
  currentFiles.current = files

  useEffect(() => () => {
    for (const item of currentFiles.current) if (item.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview)
  }, [])

  function commit(next: FileWithPreview[]) {
    setFiles(next)
    onFilesChange?.(next)
  }

  function addFiles(incoming: File[]) {
    const nextErrors: string[] = []
    const accepted = incoming.filter((file) => {
      if (accept === "image/*" && !file.type.startsWith("image/")) {
        nextErrors.push(`${file.name}: selecciona un archivo de imagen.`)
        return false
      }
      if (file.size > maxSize) {
        nextErrors.push(`${file.name}: supera el máximo de ${formatBytes(maxSize)}.`)
        return false
      }
      return true
    })
    const base = multiple ? files : []
    const available = Math.max(0, maxFiles - base.length)
    if (accepted.length > available) nextErrors.push(`Puedes añadir un máximo de ${maxFiles} archivo${maxFiles === 1 ? "" : "s"}.`)
    const additions = accepted.slice(0, available).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }))
    if (!multiple) for (const item of files) if (item.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview)
    if (additions.length) commit([...base, ...additions])
    setErrors(nextErrors)
    if (input.current) input.current.value = ""
  }

  function removeFile(id: string) {
    const item = files.find((entry) => entry.id === id)
    if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview)
    commit(files.filter((entry) => entry.id !== id))
    setErrors([])
  }

  function handleDragEnter(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault()
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false)
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(event.dataTransfer.files))
  }

  return [
    { files, isDragging, errors },
    {
      removeFile,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog: () => input.current?.click(),
      getInputProps: () => ({
        ref: input,
        type: "file" as const,
        accept,
        multiple,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => addFiles(Array.from(event.target.files ?? [])),
      }),
    },
  ] as const
}
