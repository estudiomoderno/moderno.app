"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  XIcon,
} from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./vendor/reui/empty"
import {
  FileType,
  getFileType,
  getFileTypeCategory,
  type FileTypeCategory,
} from "./vendor/reui/file-type"

interface ProjectFile {
  index: number
  name: string
  type?: string
  size?: number
  source?: string
  modified?: string
}

interface MailProject {
  id: string
  name: string
  status?: string
  recentRank?: number
  files?: ProjectFile[]
}

interface MailProjectPickerProps {
  kind: "file" | "image"
  projects: MailProject[]
  initialProjectId?: string
  onClose: () => void
  onSelect: (projectId: string, fileIndex: number) => void
}

type SortKey = "name" | "type" | "size" | "modified"
type ProjectView = "recent" | "all" | "archived"

const FAMILY_LABELS: Record<FileTypeCategory, string> = {
  archive: "Archivo comprimido",
  audio: "Audio",
  code: "Código y datos",
  design: "Diseño",
  document: "Documento",
  empty: "Archivo",
  executable: "Aplicación",
  file: "Archivo",
  folder: "Carpeta",
  font: "Fuente",
  image: "Imagen",
  presentation: "Presentación",
  spreadsheet: "Hoja de cálculo",
  video: "Vídeo",
}

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" })
const sizeNumber = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function BoardIllustration() {
  return (
    <svg width="180" height="160" viewBox="0 0 180 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="90" cy="148" rx="60" ry="8" className="fill-muted-foreground/8 dark:fill-muted-foreground/5" />
      <path d="M30 40 L90 10 L160 45 L100 75 Z" className="fill-muted/80 stroke-border dark:fill-muted/40" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 40 L100 75 L100 110 L30 75 Z" className="fill-muted stroke-border dark:fill-muted/60" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M100 75 L160 45 L160 80 L100 110 Z" className="fill-background stroke-border" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="62" cy="35" r="4" className="fill-primary/20" />
      <line x1="72" y1="33" x2="105" y2="17" className="stroke-muted-foreground/20" strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="15" x2="130" y2="5" className="stroke-muted-foreground/15" strokeWidth="4" strokeLinecap="round" />
      <circle cx="55" cy="50" r="4" className="fill-primary/30" />
      <line x1="65" y1="48" x2="100" y2="31" className="stroke-muted-foreground/20" strokeWidth="4" strokeLinecap="round" />
      <line x1="105" y1="29" x2="135" y2="14" className="stroke-muted-foreground/12" strokeWidth="4" strokeLinecap="round" />
      <circle cx="48" cy="65" r="4" className="fill-destructive/25" />
      <line x1="58" y1="63" x2="88" y2="48" className="stroke-muted-foreground/18" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function formatMegabytes(bytes?: number) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return "—"
  return `${sizeNumber.format(Math.max(value / 1024 / 1024, 0.01))} MB`
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date)
}

function fileKind(file: ProjectFile) {
  return FAMILY_LABELS[getFileTypeCategory(getFileType(file.name))]
}

function compatibleFiles(project: MailProject | undefined, kind: "file" | "image") {
  return (project?.files ?? []).filter((file) => {
    const isImage = String(file.type ?? "").toLowerCase().startsWith("image/") || getFileTypeCategory(getFileType(file.name)) === "image"
    return kind === "image" ? isImage : !isImage
  })
}

function compareFiles(a: ProjectFile, b: ProjectFile, key: SortKey) {
  if (key === "size") return (Number(a.size) || 0) - (Number(b.size) || 0)
  if (key === "modified") return collator.compare(a.modified ?? "", b.modified ?? "")
  if (key === "type") return collator.compare(fileKind(a), fileKind(b))
  return collator.compare(String(a[key] ?? ""), String(b[key] ?? ""))
}

export function MailProjectPicker({ kind, projects, initialProjectId, onClose, onSelect }: MailProjectPickerProps) {
  const [projectView, setProjectView] = useState<ProjectView>("recent")
  const [query, setQuery] = useState("")
  const [activeId, setActiveId] = useState(String(initialProjectId ?? projects[0]?.id ?? ""))
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "name", desc: false })
  const [remoteSizes, setRemoteSizes] = useState<Record<string, number>>({})

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== "Archivado"),
    [projects]
  )
  const archivedProjects = useMemo(
    () => projects.filter((project) => project.status === "Archivado").sort((a, b) => collator.compare(a.name, b.name)),
    [projects]
  )
  const allProjects = useMemo(() => [...activeProjects].sort((a, b) => collator.compare(a.name, b.name)), [activeProjects])
  const recentProjects = useMemo(() => {
    const ranked = activeProjects
      .filter((project) => Number(project.recentRank) >= 0 && Number(project.recentRank) < 4)
      .sort((a, b) => Number(a.recentRank) - Number(b.recentRank))
    return (ranked.length ? ranked : activeProjects).slice(0, 4)
  }, [activeProjects])
  const navigationProjects = projectView === "archived" ? archivedProjects : projectView === "all" ? allProjects : recentProjects
  const searchableProjects = projectView === "archived" ? archivedProjects : allProjects
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es")
    if (!normalized) return []
    return searchableProjects.filter((project) => project.name.toLocaleLowerCase("es").includes(normalized)).slice(0, 8)
  }, [query, searchableProjects])

  const visibleProjects = projectView === "archived" ? archivedProjects : activeProjects
  const activeProject = visibleProjects.find((project) => String(project.id) === activeId) ?? navigationProjects[0] ?? visibleProjects[0]
  const rows = useMemo(() => compatibleFiles(activeProject, kind).sort((a, b) => compareFiles(a, b, sort.key) * (sort.desc ? -1 : 1)), [activeProject, kind, sort])
  const title = kind === "image" ? "Insertar imagen desde un proyecto" : "Adjuntar archivo desde un proyecto"
  const navigationTitle = projectView === "archived" ? "Proyectos archivados" : projectView === "all" ? "Todos los proyectos activos" : "Recientes"

  useEffect(() => {
    if (visibleProjects.some((project) => String(project.id) === activeId)) return
    setActiveId(String(navigationProjects[0]?.id ?? visibleProjects[0]?.id ?? ""))
  }, [activeId, navigationProjects, visibleProjects])

  function toggleProjectView(view: Exclude<ProjectView, "recent">) {
    setProjectView((current) => current === view ? "recent" : view)
    setQuery("")
  }

  function updateSort(key: SortKey) {
    setSort((current) => ({ key, desc: current.key === key ? !current.desc : false }))
  }

  useEffect(() => {
    const missing = rows.filter((file) => {
      const key = `${activeProject?.id ?? ""}:${file.index}`
      return !(Number(file.size) > 0) && remoteSizes[key] === undefined && /^https?:\/\//i.test(file.source ?? "")
    })
    if (!missing.length) return
    let cancelled = false
    Promise.all(missing.map(async (file) => {
      const key = `${activeProject?.id ?? ""}:${file.index}`
      try {
        const response = await fetch(file.source as string, { method: "HEAD" })
        const size = Number(response.headers.get("content-length"))
        return [key, Number.isFinite(size) && size > 0 ? size : -1] as const
      } catch {
        return [key, -1] as const
      }
    })).then((sizes) => {
      if (!cancelled) setRemoteSizes((current) => ({ ...current, ...Object.fromEntries(sizes) }))
    })
    return () => { cancelled = true }
  }, [activeProject?.id, remoteSizes, rows])

  return (
    <div className="fixed inset-0 z-[40002] grid place-items-center bg-black/35 p-6 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flex h-[min(720px,calc(100dvh-48px))] w-[min(1080px,calc(100vw-48px))] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="mail-project-picker-title">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b px-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">PROYECTOS</p>
            <h2 id="mail-project-picker-title" className="mt-1 text-lg font-semibold">{title}</h2>
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" onClick={onClose} aria-label="Cerrar">
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[256px_minmax(0,1fr)]">
          <aside className="mail-project-nav" aria-label="Navegación de proyectos">
            <div className="mail-project-nav-header"><h2>Proyectos</h2></div>
            <button type="button" className={`mail-project-nav-link${projectView === "all" ? " is-active" : ""}`} onClick={() => toggleProjectView("all")} aria-expanded={projectView === "all"} aria-label="Ver todos los proyectos">
              <img src="/brand/sidebar-icons/ver-todos.svg?v=36602" alt="" aria-hidden="true" />
              <span>Ver todos</span>
            </button>
            <h3 aria-live="polite">{navigationTitle}</h3>
            <div className={`mail-project-nav-list${projectView !== "recent" ? " is-all" : ""}`} aria-label={navigationTitle}>
              {navigationProjects.map((project) => {
                const selected = String(project.id) === String(activeProject?.id)
                return <button key={project.id} type="button" className={`mail-project-nav-link${selected ? " is-active" : ""}`} onClick={() => setActiveId(String(project.id))} title={project.name}>
                  <img src="/brand/sidebar-icons/proyectos-recientes.svg?v=36602" alt="" aria-hidden="true" />
                  <strong>{project.name}</strong>
                </button>
              })}
            </div>
            <div className={`mail-project-nav-search${query ? " is-open" : ""}`}>
              <div>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyecto" aria-label="Buscar proyecto" autoComplete="off" />
                {query && <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda de proyectos">×</button>}
              </div>
              {query && <div className="mail-project-nav-results" role="listbox" aria-label="Proyectos encontrados">
                {searchResults.map((project) => <button key={project.id} type="button" role="option" aria-selected={String(project.id) === String(activeProject?.id)} onClick={() => { setActiveId(String(project.id)); setQuery("") }}>
                  <img src="/brand/sidebar-icons/proyectos-recientes.svg?v=36602" alt="" aria-hidden="true" />
                  <span>{project.name}</span>
                </button>)}
                {!searchResults.length && <p>No se encontraron proyectos.</p>}
              </div>}
            </div>
            <button type="button" className={`mail-project-nav-link mail-project-nav-archive${projectView === "archived" ? " is-active" : ""}`} onClick={() => toggleProjectView("archived")} aria-expanded={projectView === "archived"} aria-label="Ver proyectos archivados">
              <img src="/brand/sidebar-icons/archive-light.svg?v=36742" alt="" aria-hidden="true" />
              <span>Archivados</span>
            </button>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col">
            <div className="flex h-16 shrink-0 items-center border-b px-5">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{activeProject?.name ?? (projectView === "archived" ? "Proyectos archivados" : "Proyecto")}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{activeProject ? (kind === "image" ? "Selecciona una imagen para insertarla" : "Selecciona un archivo para adjuntarlo") : "No hay proyectos en esta sección"}</p>
              </div>
            </div>
            {rows.length ? (
              <div className="min-h-0 flex-1 overflow-auto" data-slot="data-grid-scroll-area">
                <table className="w-full table-fixed border-collapse text-sm" data-slot="data-grid-table">
                  <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                    <tr className="border-b">
                      {([['name','Nombre','w-[45%]'],['type','Tipo','w-[20%]'],['size','Tamaño','w-[15%]'],['modified','Modificado','w-[20%]']] as Array<[SortKey,string,string]>).map(([key, label, width]) => (
                        <th key={key} className={`${width} px-4 py-3 text-left text-xs font-medium text-muted-foreground`}>
                          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => updateSort(key)}>
                            {label}{sort.key === key && (sort.desc ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />)}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((file) => (
                      <tr key={`${file.index}-${file.name}`} className="group border-b last:border-0 hover:bg-accent/50" onDoubleClick={() => onSelect(String(activeProject?.id ?? ""), file.index)}>
                        <td className="px-4 py-2.5">
                          <button type="button" className="flex min-w-0 items-center gap-2 text-left" aria-label={file.name} onClick={() => onSelect(String(activeProject?.id ?? ""), file.index)}>
                            <FileType type={getFileType(file.name)} variant="outline" size="mini" aria-hidden="true" />
                            <span className="truncate font-medium" title={file.name}>{file.name}</span>
                          </button>
                        </td>
                        <td className="truncate px-4 py-2.5 text-muted-foreground">{fileKind(file)}</td>
                        <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{formatMegabytes(Number(file.size) > 0 ? file.size : remoteSizes[`${activeProject?.id ?? ""}:${file.index}`])}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(file.modified)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                <Empty className="py-12">
                  <EmptyHeader>
                    <EmptyMedia><BoardIllustration /></EmptyMedia>
                    <EmptyTitle>{activeProject ? (kind === "image" ? "No hay imágenes" : "No hay archivos") : "No hay proyectos archivados"}</EmptyTitle>
                    <EmptyDescription>{activeProject ? (kind === "image" ? "Este proyecto no tiene imágenes disponibles para insertar." : "Este proyecto no tiene archivos disponibles para adjuntar.") : "Cuando archives un proyecto aparecerá aquí."}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  )
}
