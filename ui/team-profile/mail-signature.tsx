"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlusIcon, Trash2Icon, XIcon } from "lucide-react"

import { Button } from "./vendor/reui/button"

interface SignatureValue {
  text?: string
  imageDataUrl?: string
  imageName?: string
  imageType?: string
  imageSize?: number
}

interface MailSignatureProps {
  email: string
  initialValue?: SignatureValue
  onClose: () => void
  onSave: (value: SignatureValue) => void
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024

export function MailSignature({ email, initialValue, onClose, onSave }: MailSignatureProps) {
  const [text, setText] = useState(initialValue?.text ?? "")
  const [imageDataUrl, setImageDataUrl] = useState(initialValue?.imageDataUrl ?? "")
  const [imageName, setImageName] = useState(initialValue?.imageName ?? "")
  const [imageType, setImageType] = useState(initialValue?.imageType ?? "")
  const [imageSize, setImageSize] = useState(Number(initialValue?.imageSize) || 0)
  const [error, setError] = useState("")
  const close = useRef<HTMLButtonElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    close.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  function chooseImage(file?: File) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.")
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("La imagen no puede superar 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageDataUrl(String(reader.result ?? ""))
      setImageName(file.name)
      setImageType(file.type)
      setImageSize(file.size)
      setError("")
    }
    reader.onerror = () => setError("No se ha podido leer la imagen.")
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageDataUrl("")
    setImageName("")
    setImageType("")
    setImageSize(0)
    setError("")
    if (fileInput.current) fileInput.current.value = ""
  }

  return (
    <div
      className="fixed inset-0 z-[40002] grid place-items-center bg-black/35 p-6 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      data-mail-signature-backdrop="true"
    >
      <form
        className="flex h-[min(720px,calc(100dvh-48px))] w-[min(1080px,calc(100vw-48px))] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mail-signature-title"
        onSubmit={(event) => {
          event.preventDefault()
          onSave({ text: text.trim(), imageDataUrl, imageName, imageType, imageSize })
        }}
      >
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b px-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">CORREO</p>
            <h2 id="mail-signature-title" className="mt-1 text-lg font-semibold">Diseñar/Editar firma</h2>
          </div>
          <button ref={close} type="button" className="grid size-9 place-items-center rounded-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" onClick={onClose} aria-label="Cerrar editor de firma">
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[256px_minmax(0,1fr)]">
          <aside className="border-r bg-muted/20 p-5">
            <p className="text-xs font-medium text-muted-foreground">CUENTA</p>
            <p className="mt-2 truncate text-sm font-medium" title={email}>{email}</p>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">La firma se añadirá automáticamente al redactar correos desde esta cuenta.</p>
          </aside>

          <main className="min-h-0 overflow-y-auto p-6">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
              <section>
                <label htmlFor="mail-signature-text" className="text-sm font-semibold">Texto de la firma</label>
                <p className="mt-1 text-xs text-muted-foreground">Escribe el nombre, cargo, teléfono, web o cualquier información que quieras incluir.</p>
                <textarea
                  id="mail-signature-text"
                  aria-label="Texto de la firma"
                  className="mt-3 min-h-40 w-full resize-y rounded-xl border bg-background p-4 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Nombre y apellidos&#10;Cargo o estudio&#10;Teléfono · Sitio web"
                />
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Foto o logotipo</h3>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP u otro formato de imagen. Máximo 2 MB.</p>
                  </div>
                  <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => chooseImage(event.target.files?.[0])} />
                  <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
                    <ImagePlusIcon aria-hidden="true" />
                    Adjuntar foto
                  </Button>
                </div>
                {imageDataUrl && (
                  <div className="mt-3 flex items-center gap-4 rounded-xl border p-3">
                    <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                      <img src={imageDataUrl} alt="Vista previa de la foto de firma" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={imageName}>{imageName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{Math.max(imageSize / 1024, 0.1).toLocaleString("es-ES", { maximumFractionDigits: 1 })} KB</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label="Eliminar foto de la firma" onClick={removeImage}>
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                )}
                {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
              </section>

              <section className="rounded-xl border bg-muted/20 p-5" aria-label="Vista previa de la firma">
                <p className="text-xs font-medium text-muted-foreground">VISTA PREVIA</p>
                <div className="mt-4 min-h-28 rounded-lg bg-background p-4 text-sm shadow-sm">
                  {text ? <p className="whitespace-pre-wrap leading-6">{text}</p> : <p className="text-muted-foreground">Tu firma aparecerá aquí.</p>}
                  {imageDataUrl && <img src={imageDataUrl} alt="" className="mt-4 max-h-28 max-w-64 object-contain" />}
                </div>
              </section>
            </div>
          </main>
        </div>

        <footer className="flex h-[72px] shrink-0 items-center justify-end gap-2 border-t px-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="mail-signature-save">Guardar firma</Button>
        </footer>
      </form>
    </div>
  )
}
