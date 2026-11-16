"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BoldIcon, ItalicIcon, UnderlineIcon, XIcon } from "lucide-react"

import { FileUploadCompact } from "./file-upload-compact"
import type { FileMetadata, FileWithPreview } from "./hooks/use-file-upload"
import { Button } from "./vendor/reui/button"
import { Toggle } from "./vendor/reui/toggle"

interface SignatureImage {
  dataUrl: string
  name: string
  type: string
  size: number
}

interface SignatureValue {
  text?: string
  html?: string
  images?: SignatureImage[]
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!)
}

function textHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br>")
}

function sanitizeSignatureHtml(value: string) {
  if (!value || typeof DOMParser === "undefined") return ""
  const documentValue = new DOMParser().parseFromString(value, "text/html")
  const allowed = new Set(["B", "STRONG", "I", "EM", "U", "BR", "DIV", "P", "SPAN"])
  documentValue.body.querySelectorAll("*").forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes))
      return
    }
    for (const attribute of Array.from(node.attributes)) node.removeAttribute(attribute.name)
  })
  return documentValue.body.innerHTML
}

function fileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("No se ha podido leer la imagen."))
    reader.readAsDataURL(file)
  })
}

export function MailSignature({ email, initialValue, onClose, onSave }: MailSignatureProps) {
  const initialHtml = useMemo(
    () => sanitizeSignatureHtml(initialValue?.html ?? textHtml(initialValue?.text ?? "")),
    [initialValue]
  )
  const initialImages = useMemo<FileWithPreview[]>(() => {
    const images = initialValue?.images?.length
      ? initialValue.images
      : initialValue?.imageDataUrl
        ? [{
            dataUrl: initialValue.imageDataUrl,
            name: initialValue.imageName ?? "firma.png",
            type: initialValue.imageType ?? "image/png",
            size: Number(initialValue.imageSize) || 0,
          }]
        : []
    return images.slice(0, 1).map((image, index) => ({
      id: `signature-image-${index}`,
      file: { name: image.name, size: image.size, type: image.type, url: image.dataUrl } satisfies FileMetadata,
      preview: image.dataUrl,
    }))
  }, [initialValue])
  const [html, setHtml] = useState(initialHtml)
  const [text, setText] = useState(initialValue?.text ?? "")
  const [files, setFiles] = useState<FileWithPreview[]>(initialImages)
  const [formats, setFormats] = useState({ bold: false, italic: false, underline: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const close = useRef<HTMLButtonElement>(null)
  const editor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    close.current?.focus()
    if (editor.current) editor.current.innerHTML = initialHtml
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [initialHtml, onClose])

  function refreshFormats() {
    const selection = document.getSelection()
    if (!selection?.anchorNode || !editor.current?.contains(selection.anchorNode)) return
    setFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    })
  }

  function syncEditor() {
    if (!editor.current) return
    const safeHtml = sanitizeSignatureHtml(editor.current.innerHTML)
    setHtml(safeHtml)
    setText(editor.current.innerText.replace(/\u00a0/g, " "))
    refreshFormats()
  }

  function format(command: "bold" | "italic" | "underline") {
    if (!editor.current) return
    const selection = document.getSelection()
    if (!selection?.anchorNode || !editor.current.contains(selection.anchorNode)) editor.current.focus()
    document.execCommand(command, false)
    syncEditor()
  }

  async function saveSignature() {
    if (saving) return
    setSaving(true)
    setError("")
    try {
      const images = await Promise.all(files.slice(0, 1).map(async (item) => {
        const metadata = item.file instanceof File
          ? { name: item.file.name, type: item.file.type, size: item.file.size }
          : item.file
        const dataUrl = item.file instanceof File ? await fileDataUrl(item.file) : String(item.preview ?? metadata.url ?? "")
        return { dataUrl, name: metadata.name, type: metadata.type, size: metadata.size }
      }))
      const first = images[0]
      onSave({
        text: text.trim(),
        html: sanitizeSignatureHtml(html),
        images,
        imageDataUrl: first?.dataUrl ?? "",
        imageName: first?.name ?? "",
        imageType: first?.type ?? "",
        imageSize: first?.size ?? 0,
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se ha podido guardar la firma.")
      setSaving(false)
    }
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
          void saveSignature()
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
          </aside>

          <main className="min-h-0 overflow-y-auto p-6">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label id="mail-signature-text-label" className="text-sm font-semibold">Texto de la firma</label>
                    <p className="mt-1 text-xs text-muted-foreground">Escribe el nombre, cargo, teléfono, web o cualquier información que quieras incluir.</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2" role="toolbar" aria-label="Formato de la firma">
                    <Toggle aria-label="Toggle bold" pressed={formats.bold} onMouseDown={(event) => event.preventDefault()} onPressedChange={() => format("bold")}>
                      <BoldIcon />
                    </Toggle>
                    <Toggle aria-label="Toggle italic" pressed={formats.italic} onMouseDown={(event) => event.preventDefault()} onPressedChange={() => format("italic")}>
                      <ItalicIcon />
                    </Toggle>
                    <Toggle aria-label="Toggle underline" pressed={formats.underline} onMouseDown={(event) => event.preventDefault()} onPressedChange={() => format("underline")}>
                      <UnderlineIcon />
                    </Toggle>
                  </div>
                </div>
                <div
                  ref={editor}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-labelledby="mail-signature-text-label"
                  aria-label="Texto de la firma"
                  data-placeholder="Nombre y apellidos · Cargo o estudio · Teléfono · Sitio web"
                  className="mail-signature-editor mt-3 min-h-40 w-full rounded-xl border bg-background p-4 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  onInput={syncEditor}
                  onKeyUp={refreshFormats}
                  onMouseUp={refreshFormats}
                  onPaste={(event) => {
                    event.preventDefault()
                    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"))
                  }}
                />
              </section>

              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold">Foto o logotipo</h3>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP u otro formato de imagen. Máximo 2 MB.</p>
                </div>
                <FileUploadCompact
                  maxFiles={1}
                  maxSize={MAX_IMAGE_SIZE}
                  accept="image/*"
                  multiple={false}
                  initialFiles={initialImages}
                  onFilesChange={setFiles}
                  className="max-w-none"
                />
                {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
              </section>

              <section className="rounded-xl border bg-muted/20 p-5" aria-label="Vista previa de la firma">
                <p className="text-xs font-medium text-muted-foreground">VISTA PREVIA</p>
                <div className="mt-4 min-h-28 rounded-lg bg-background p-4 text-sm shadow-sm">
                  {html ? <div className="leading-6" dangerouslySetInnerHTML={{ __html: sanitizeSignatureHtml(html) }} /> : <p className="text-muted-foreground">Tu firma aparecerá aquí.</p>}
                  {files[0]?.preview && <img src={files[0].preview} alt="Vista previa de la foto de firma" className="mt-4 max-h-28 max-w-64 object-contain" />}
                </div>
              </section>
            </div>
          </main>
        </div>

        <footer className="flex h-[72px] shrink-0 items-center justify-end gap-2 border-t px-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="mail-signature-save" disabled={saving}>{saving ? "Guardando…" : "Guardar firma"}</Button>
        </footer>
      </form>
    </div>
  )
}
