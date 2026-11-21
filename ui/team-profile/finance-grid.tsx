"use client"

import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "./vendor/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "./vendor/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "./vendor/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "./vendor/reui/data-grid/data-grid-scroll-area"
import {
  DataGridTable,
  DataGridTableFootRow,
  DataGridTableFootRowCell,
} from "./vendor/reui/data-grid/data-grid-table"
import { Filters } from "./vendor/reui/filters/filters"
import type { FilterOperatorLabels } from "./vendor/reui/filters/filters-operators"
import {
  createFilterQuery,
  isFilterRule,
} from "./vendor/reui/filters/filters-query"
import type {
  FilterEditorProps,
  FilterField,
  FilterLabels,
  FilterNode,
  FilterOption,
  FilterOperator,
  FilterQuery,
  FilterValueDisplayContext,
} from "./vendor/reui/filters/filters-types"
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import {
  BanknoteIcon,
  CalendarDaysIcon,
  FileTextIcon,
  FolderKanbanIcon,
  SignpostIcon,
  UserIcon,
} from "lucide-react"

import { cn } from "cn"
import { Badge } from "./vendor/reui/badge"
import { Button } from "./vendor/reui/button"
import { Input } from "./vendor/reui/input"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./vendor/reui/card"
import { CalendarPortal } from "./calendar-ui/portal"

export interface FinanceGridRow {
  id: string
  ref: string
  date: string
  dueDate?: string
  status: string
  statusLabel: string
  statusTone: "paid" | "partial" | "overdue" | "pending"
  client: string
  projectId: string
  projectCode: string
  projectName: string
  total: number
}

interface FinanceGridProps {
  book: "sales" | "expenses"
  rows: FinanceGridRow[]
  currency?: string
  locale?: string
  container?: HTMLElement
  onProject?: (projectId: string) => void
}

const SEED = createFilterQuery<unknown>([], "and")
const GUTTER_START = "ps-4"
const GUTTER_END = "pe-4"
const MIN_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 100
const FALLBACK_ROW_HEIGHT = 48

function fitRowsToViewport(available: number, chrome: number, rowHeight: number) {
  const safeRowHeight = Math.max(1, rowHeight)
  return Math.max(
    MIN_PAGE_SIZE,
    Math.min(MAX_PAGE_SIZE, Math.floor((available - chrome) / safeRowHeight))
  )
}

const SPANISH_OPERATORS: FilterOperatorLabels = {
  contains: "contiene",
  not_contains: "no contiene",
  starts_with: "empieza por",
  ends_with: "termina en",
  is: "es",
  is_not: "no es",
  is_any_of: "es cualquiera de",
  is_none_of: "no es ninguno de",
  has_any_of: "contiene cualquiera de",
  has_all_of: "contiene todos",
  has_none_of: "no contiene ninguno",
  eq: "es igual a",
  neq: "no es igual a",
  gt: "es mayor que",
  gte: "es igual o mayor que",
  lt: "es menor que",
  lte: "es igual o menor que",
  between: "está entre",
  not_between: "no está entre",
  is_before: "es anterior a",
  is_after: "es posterior a",
  is_on_or_before: "es igual o anterior a",
  is_on_or_after: "es igual o posterior a",
  empty: "está vacío",
  not_empty: "no está vacío",
}

const SPANISH_FILTER_LABELS: Partial<FilterLabels> = {
  addFilter: "Añadir filtro",
  advancedFilter: "Filtro avanzado",
  showRecords: "Mostrar facturas",
  builderEmpty: "Todavía no hay filtros",
  builderEmptyHint: "Añade un filtro para concretar las facturas que quieres ver.",
  addCondition: "Añadir filtro",
  addConditionGroup: "Añadir grupo",
  addToGroup: "Añadir filtro a este grupo",
  removeGroup: "Eliminar grupo",
  wrapInGroup: "Agrupar",
  ungroup: "Desagrupar",
  moveToTopLevel: "Mover al nivel principal",
  moveToGroup: (position) => `Mover al grupo ${position}`,
  reorder: "Reordenar",
  reorderHint: "Pulsa Alt y las flechas arriba o abajo para reordenar",
  groupAll: "Se cumplen todas las condiciones…",
  groupAny: "Se cumple cualquiera de las condiciones…",
  groupPlaceholder: "Arrastra filtros aquí",
  rowLabel: (condition, depth) => `${condition}, nivel ${depth}`,
  groupLabel: (description, depth) => `${description}, nivel ${depth}`,
  groupAnnouncement: (added) => (added ? "Grupo añadido" : "Grupo eliminado"),
  reorderAnnouncement: (label, position, total) =>
    `${label} movido a la posición ${position} de ${total}`,
  moveAnnouncement: (label, destination, position, total) =>
    `${label} movido a ${destination}, posición ${position} de ${total}`,
  clearAll: "Borrar todo",
  groupMenu: "Opciones del grupo",
  searchFields: "Buscar filtros…",
  searchOperators: "Buscar condiciones…",
  searchOptions: "Buscar…",
  back: "Volver",
  clear: "Borrar",
  apply: "Aplicar",
  discard: "Descartar cambios",
  empty: "Sin resultados",
  loading: "Cargando…",
  loadingMore: "Cargando más…",
  loadMore: "Cargar más",
  error: "No se ha podido cargar",
  retry: "Reintentar",
  where: "Donde",
  and: "Y",
  or: "O",
  combinator: "Cambiar combinación",
  combinatorLabel: (word) => `${word}, cambiar combinación`,
  duplicate: "Duplicar",
  negate: "Negar",
  convertToAdvanced: "Editor avanzado",
  remove: "Eliminar",
  chipMenu: (fieldLabel) => `Opciones del filtro ${fieldLabel}`,
  filtersLabel: "Filtros",
  filterLabel: (condition) => condition,
  readOnly: "Solo lectura. Estos filtros no se pueden modificar.",
  pathSeparator: " > ",
  valuePlaceholder: "Escribe un valor…",
  selectPlaceholder: "Seleccionar…",
  noValue: "sin valor",
  selectCondition: "Seleccionar condición",
  incomplete: "filtro incompleto",
  branchAffordance: "abre una lista",
  exclusiveHint: "no se puede combinar con otras opciones",
  exclusiveAnnouncement: (label, cleared) =>
    `${label} seleccionado. ${cleared} ${cleared === 1 ? "selección eliminada" : "selecciones eliminadas"}.`,
  itemCount: (count) => `${count} ${count === 1 ? "elemento" : "elementos"}`,
  fieldsLabel: "Filtros disponibles",
  resultsAnnouncement: (count) => `${count} ${count === 1 ? "resultado" : "resultados"}`,
  actionsLabel: "Acciones",
  stepAnnouncement: (step, label) =>
    step === "field"
      ? `Elige un filtro. ${label}`
      : step === "operator"
        ? `Elige una condición para ${label}`
        : `Introduce un valor para ${label}`,
  countAnnouncement: (count) =>
    `${count} ${count === 1 ? "filtro aplicado" : "filtros aplicados"}`,
  valueCount: (count) => `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`,
  valueDetail: (summary, values) => `${summary}: ${values.join(", ")}`,
  valueRange: (from, to) => `${from} a ${to}`,
  rangeFrom: (fieldLabel) => `${fieldLabel}, desde`,
  rangeTo: (fieldLabel) => `${fieldLabel}, hasta`,
  rangeSeparator: "a",
  negated: (operatorLabel) => `no ${operatorLabel}`,
  issueOperator: "Elige una condición",
  issueValue: "Introduce un valor",
  issueRange: "Completa los dos extremos del intervalo",
  issueRangeOrder: "La fecha o cantidad final es anterior a la inicial",
  issueEmptyGroup: "Este grupo todavía no tiene condiciones",
  issueSummary: (count) =>
    `${count} ${count === 1 ? "fila necesita" : "filas necesitan"} revisión`,
}

const DATE_OPERATORS: FilterOperator[] = [
  { value: "is", label: SPANISH_OPERATORS.is, inverse: "is_not" },
  { value: "is_not", label: SPANISH_OPERATORS.is_not, inverse: "is" },
  { value: "is_before", label: SPANISH_OPERATORS.is_before },
  { value: "is_after", label: SPANISH_OPERATORS.is_after },
  { value: "is_on_or_before", label: SPANISH_OPERATORS.is_on_or_before },
  { value: "is_on_or_after", label: SPANISH_OPERATORS.is_on_or_after },
  { value: "between", label: SPANISH_OPERATORS.between, arity: "range", inverse: "not_between" },
  { value: "not_between", label: SPANISH_OPERATORS.not_between, arity: "range", inverse: "between" },
  { value: "empty", label: SPANISH_OPERATORS.empty, arity: "none", inverse: "not_empty" },
  { value: "not_empty", label: SPANISH_OPERATORS.not_empty, arity: "none", inverse: "empty" },
]

const SPANISH_DATA_GRID_LABELS = {
  sortAscending: "Ascendente",
  sortDescending: "Descendente",
  pinColumnStart: "Fijar a la izquierda",
  pinColumnEnd: "Fijar a la derecha",
  moveColumnStart: "Mover a la izquierda",
  moveColumnEnd: "Mover a la derecha",
  columnsMenu: "Columnas",
  unpinColumn: (title: string) => `Dejar de fijar la columna ${title}`,
  toggleColumns: "Mostrar u ocultar columnas",
  rowCreate: "Añadir fila",
  pinRow: "Fijar fila",
  unpinRow: "Dejar de fijar fila",
  selectRow: "Seleccionar fila",
  selectAll: "Seleccionar todo",
  expandRow: "Desplegar fila",
  collapseRow: "Replegar fila",
  dragToReorder: "Arrastrar para reordenar",
  dragToReorderRow: "Arrastrar para reordenar la fila",
  reorderingUnavailable: "No se puede reordenar",
  loading: "Cargando…",
  empty: "No hay datos disponibles",
  allRowsLoaded: "Todos los registros están cargados",
  rowsPerPage: "Facturas por página",
  paginationInfo: ({ from, to, count }: { from: number; to: number; count: number }) =>
    `${from} - ${to} de ${count}`,
  previousPage: "Ir a la página anterior",
  nextPage: "Ir a la página siguiente",
  goToPage: (page: number) => `Ir a la página ${page}`,
  paginationEllipsis: "…",
  filterSelectedCount: (count: number) =>
    `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`,
  filterNoResults: "No se han encontrado resultados.",
  filterClear: "Borrar filtros",
}

function toneClass(tone: FinanceGridRow["statusTone"]) {
  return {
    paid: "bg-emerald-500",
    partial: "bg-amber-500",
    overdue: "bg-destructive",
    pending: "bg-zinc-400",
  }[tone]
}

function Dot({ className }: { className: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", className)} />
}

function FilterDateEditor({
  value,
  onValueChange,
  commit,
  cancel,
  autoFocusProps,
  labels,
  host,
  field,
  operator,
}: FilterEditorProps) {
  const range = operator.arity === "range"
  const tuple = (Array.isArray(value) ? value : []) as unknown[]
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commit()
    } else if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      cancel()
    }
  }
  const input = (index: 0 | 1, autofocus = false) => (
    <Input
      {...(autofocus ? autoFocusProps : {})}
      type="date"
      value={String(tuple[index] ?? "")}
      aria-label={index === 0 ? labels.rangeFrom(field.label) : labels.rangeTo(field.label)}
      onChange={(event) => {
        const next = [tuple[0], tuple[1]]
        next[index] = event.target.value || undefined
        onValueChange(next)
      }}
      onKeyDown={onKeyDown}
    />
  )
  return (
    <div data-slot="filter-editor" className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 p-2">
      {range ? (
        <div className="flex items-center gap-1.5">
          {input(0, true)}
          <span className="text-muted-foreground text-xs">{labels.rangeSeparator}</span>
          {input(1)}
        </div>
      ) : (
        <Input
          {...autoFocusProps}
          type="date"
          value={String(value ?? "")}
          aria-label={field.label}
          onChange={(event) => onValueChange(event.target.value || undefined)}
          onKeyDown={onKeyDown}
        />
      )}
      {host === "create" ? null : (
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <Button variant="ghost" onClick={cancel}>{labels.discard}</Button>
          <Button onClick={() => commit()}>{labels.apply}</Button>
        </div>
      )}
    </div>
  )
}

function StackedTones({
  options,
  empty,
  tones,
}: {
  options: FilterOption[]
  empty: string
  tones: Map<string, string>
}) {
  const tone = (value: string) => tones.get(value) ?? "bg-muted-foreground"
  if (options.length === 0) return <>{empty}</>
  if (options.length === 1) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <Dot className={tone(options[0].value)} />
        <span className="truncate">{options[0].label}</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center">
        {options.slice(0, 4).map((option) => (
          <span
            key={option.value}
            className={cn(
              "ring-background -ml-1 size-2.5 rounded-full ring-2 first:ml-0",
              tone(option.value)
            )}
          />
        ))}
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">
        {options.length}
      </span>
    </span>
  )
}

function StackedValues({ options, empty }: { options: FilterOption[]; empty: string }) {
  if (options.length === 0) return <>{empty}</>
  const shown = options.slice(0, 2)
  const overflow = options.length - shown.length
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">{shown.map((option) => option.label).join(", ")}</span>
      {overflow > 0 ? (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">+{overflow}</span>
      ) : null}
    </span>
  )
}

const list = (value: unknown) => (Array.isArray(value) ? value.map(String) : [])
const text = (value: unknown) => String(value ?? "").toLocaleLowerCase("es")
const isIsoDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))
const compare = (actual: unknown, expected: unknown) =>
  isIsoDate(actual) && isIsoDate(expected)
    ? String(actual).localeCompare(String(expected))
    : Number(actual) - Number(expected)
const TESTS: Record<string, (actual: unknown, value: unknown) => boolean> = {
  is: (actual, value) => String(actual) === String(value),
  is_not: (actual, value) => String(actual) !== String(value),
  is_any_of: (actual, value) => list(value).includes(String(actual)),
  is_none_of: (actual, value) => !list(value).includes(String(actual)),
  contains: (actual, value) => text(actual).includes(text(value)),
  not_contains: (actual, value) => !text(actual).includes(text(value)),
  starts_with: (actual, value) => text(actual).startsWith(text(value)),
  ends_with: (actual, value) => text(actual).endsWith(text(value)),
  eq: (actual, value) => Number(actual) === Number(value),
  neq: (actual, value) => Number(actual) !== Number(value),
  gt: (actual, value) => compare(actual, value) > 0,
  gte: (actual, value) => compare(actual, value) >= 0,
  lt: (actual, value) => compare(actual, value) < 0,
  lte: (actual, value) => compare(actual, value) <= 0,
  is_before: (actual, value) => compare(actual, value) < 0,
  is_after: (actual, value) => compare(actual, value) > 0,
  is_on_or_before: (actual, value) => compare(actual, value) <= 0,
  is_on_or_after: (actual, value) => compare(actual, value) >= 0,
  between: (actual, value) => {
    const [from, to] = list(value)
    return compare(actual, from) >= 0 && compare(actual, to) <= 0
  },
  not_between: (actual, value) => {
    const [from, to] = list(value)
    return !(compare(actual, from) >= 0 && compare(actual, to) <= 0)
  },
  empty: (actual) => actual === undefined || actual === null || actual === "",
  not_empty: (actual) => !(actual === undefined || actual === null || actual === ""),
}

function filterRecord(row: FinanceGridRow) {
  return {
    status: row.status,
    client: row.client,
    total: row.total,
    projectId: row.projectId || "__none__",
    invoice: { ref: row.ref, date: row.date, dueDate: row.dueDate || "" },
  }
}

function read(row: FinanceGridRow, path: string[]): unknown {
  return path.reduce<unknown>(
    (value, key) =>
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)[key]
        : undefined,
    filterRecord(row)
  )
}

function isIncomplete(operator: string, value: unknown): boolean {
  if (operator === "empty" || operator === "not_empty") return false
  if (value === undefined || value === null || value === "") return true
  if (!Array.isArray(value)) return false
  return (
    value.length === 0 ||
    value.some((entry) => entry === undefined || entry === null || entry === "")
  )
}

function matches(row: FinanceGridRow, node: FilterNode): boolean {
  if (!isFilterRule(node)) {
    if (node.rules.length === 0) return true
    return node.combinator === "and"
      ? node.rules.every((child) => matches(row, child))
      : node.rules.some((child) => matches(row, child))
  }
  const test = TESTS[node.operator]
  if (!test || isIncomplete(node.operator, node.value)) return true
  const result = test(read(row, node.path), node.value)
  return node.negated ? !result : result
}

function PatternEllipsis() {
  return <span className="text-muted-foreground shrink-0">...</span>
}

function PatternValue({
  value,
  operator,
  hits,
  total,
}: {
  value: unknown
  operator: string
  hits: number | null
  total: number
}) {
  const term = typeof value === "string" ? value.trim() : ""
  if (!term) return <>cualquier factura</>
  const loose = operator === "contains" || operator === "not_contains"
  const lead = loose || operator === "ends_with"
  const trail = loose || operator === "starts_with"
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="flex min-w-0 items-center">
        {lead ? <PatternEllipsis /> : null}
        <span className="truncate">{term}</span>
        {trail ? <PatternEllipsis /> : null}
      </span>
      <TermReach hits={hits} total={total} />
    </span>
  )
}

function TermReach({ hits, total }: { hits: number | null; total: number }) {
  if (hits === null) return null
  return (
    <span
      className={cn(
        "shrink-0 text-xs tabular-nums @max-[7rem]/cell:hidden",
        hits === 0 ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {hits}/{total}
    </span>
  )
}

function FinanceGrid({
  book,
  rows: sourceRows,
  currency = "EUR",
  locale = "es-ES",
  onProject,
}: FinanceGridProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const autoFit = useRef(true)
  const [query, setQuery] = useState<FilterQuery>(SEED)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "amount", desc: true },
  ])
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency]
  )
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }),
    [locale]
  )

  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card) return
    let animationFrame = 0
    const schedule = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(() => {
        if (!autoFit.current) return
        const cardRect = card.getBoundingClientRect()
        const rootNode = card.getRootNode()
        const host = rootNode instanceof ShadowRoot ? rootNode.host : null
        const main = host instanceof HTMLElement ? host.closest(".main") : null
        const mainBottom = main?.getBoundingClientRect().bottom ?? window.innerHeight
        const viewportBottom = Math.min(window.innerHeight, mainBottom)
        const heightOf = (selector: string) =>
          card.querySelector<HTMLElement>(selector)?.getBoundingClientRect().height ?? 0
        const sampleRow = card.querySelector<HTMLElement>(
          '[data-slot="data-grid-table-body"] > tr'
        )
        const rowHeight = sampleRow?.getBoundingClientRect().height || FALLBACK_ROW_HEIGHT
        const chrome =
          heightOf('[data-slot="card-header"]') +
          heightOf('[data-slot="data-grid-table"] thead') +
          heightOf('[data-slot="data-grid-table-foot"]') +
          heightOf('[data-slot="card-footer"]') +
          4
        const pageSize = fitRowsToViewport(
          Math.max(0, viewportBottom - cardRect.top - 12),
          chrome,
          rowHeight
        )
        setPagination((current) =>
          current.pageSize === pageSize
            ? current
            : { pageIndex: 0, pageSize }
        )
      })
    }
    schedule()
    window.addEventListener("resize", schedule)
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule)
    observer?.observe(card)
    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener("resize", schedule)
      observer?.disconnect()
    }
  }, [])

  const fields = useMemo<FilterField[]>(() => {
    const statuses = Array.from(new Map(sourceRows.map((row) => [row.status, row])).values())
    const clients = Array.from(new Set(sourceRows.map((row) => row.client))).sort()
    const projects: FilterOption[] = Array.from(
      new Map(
        sourceRows
          .filter((row) => row.projectId)
          .map((row) => [row.projectId, { value: row.projectId, label: row.projectCode || row.projectName }])
      ).values()
    )
    projects.push({ value: "__none__", label: "Sin proyecto", exclusive: true })
    const tones = new Map(statuses.map((row) => [row.status, toneClass(row.statusTone)]))
    const reach = (path: string[], context: FilterValueDisplayContext) => {
      const test = TESTS[context.operator.value]
      if (!test || isIncomplete(context.operator.value, context.value)) return null
      return sourceRows.filter((row) => test(read(row, path), context.value)).length
    }
    const moneyText = ({ value, labels }: FilterValueDisplayContext) => {
      const bound = (entry: unknown) => {
        if (entry === null || entry === "") return ""
        const amount = Number(entry)
        return Number.isFinite(amount) ? formatter.format(amount) : ""
      }
      const [from, to] = Array.isArray(value)
        ? [bound(value[0]), bound(value[1])]
        : [bound(value), ""]
      if (from && to) return labels.valueRange(from, to)
      return from || to || "cualquier importe"
    }
    const dateText = ({ value, labels }: FilterValueDisplayContext) => {
      const format = (entry: unknown) =>
        isIsoDate(entry)
          ? dateFormatter.format(new Date(`${String(entry)}T00:00:00Z`))
          : ""
      const [from, to] = Array.isArray(value)
        ? [format(value[0]), format(value[1])]
        : [format(value), ""]
      if (from && to) return labels.valueRange(from, to)
      return from || to || "cualquier fecha"
    }
    const dateField = (id: string, label: string): FilterField => ({
      id,
      label,
      type: "text",
      operators: DATE_OPERATORS,
      defaultOperator: "between",
      editor: FilterDateEditor,
      renderValue: (context) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate tabular-nums">{dateText(context)}</span>
          <TermReach hits={reach(["invoice", id], context)} total={sourceRows.length} />
        </span>
      ),
      valueText: dateText,
      icon: <CalendarDaysIcon />,
    })
    const partyLabel = book === "sales" ? "Cliente" : "Proveedor"
    return [
      {
        id: "status",
        label: "Estado",
        type: "select",
        defaultOperator: "is_any_of",
        options: statuses.map((row) => ({
          value: row.status,
          label: row.statusLabel,
          icon: <Dot className={toneClass(row.statusTone)} />,
        })),
        renderValue: ({ options }) => (
          <StackedTones options={options} empty="cualquier estado" tones={tones} />
        ),
        icon: <SignpostIcon />,
      },
      {
        id: "client",
        label: partyLabel,
        type: "select",
        defaultOperator: "is_any_of",
        options: clients.map((client) => ({ value: client, label: client })),
        pinSelected: true,
        sortSelected: "label",
        renderValue: ({ options }) => (
          <StackedValues options={options} empty={`cualquier ${partyLabel.toLocaleLowerCase("es")}`} />
        ),
        icon: <UserIcon />,
      },
      {
        id: "projectId",
        label: "Proyecto",
        type: "select",
        defaultOperator: "is_any_of",
        options: projects,
        pinSelected: true,
        sortSelected: "label",
        renderValue: ({ options }) => (
          <StackedValues options={options} empty="cualquier proyecto" />
        ),
        icon: <FolderKanbanIcon />,
      },
      {
        id: "total",
        label: "Importe",
        type: "number",
        defaultOperator: "gte",
        renderValue: (context) => (
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate tabular-nums">{moneyText(context)}</span>
            <TermReach hits={reach(["total"], context)} total={sourceRows.length} />
          </span>
        ),
        valueText: moneyText,
        icon: <BanknoteIcon />,
      },
      {
        id: "invoice",
        label: "Factura",
        icon: <FileTextIcon />,
        fields: [
          {
            id: "ref",
            label: "Número",
            type: "text",
            renderValue: (context) => (
              <PatternValue
                value={context.value}
                operator={context.operator.value}
                hits={reach(["invoice", "ref"], context)}
                total={sourceRows.length}
              />
            ),
          },
          dateField("date", "Fecha de emisión"),
          dateField("dueDate", "Fecha de vencimiento"),
        ],
      },
    ]
  }, [book, dateFormatter, formatter, sourceRows])

  const rows = useMemo(
    () => sourceRows.filter((row) => matches(row, query)),
    [sourceRows, query]
  )
  const total = useMemo(
    () => rows.reduce((sum, row) => sum + row.total, 0),
    [rows]
  )
  const applyQuery = (next: FilterQuery) => {
    setQuery(next)
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  const columns = useMemo<ColumnDef<DataGridFeatures, FinanceGridRow>[]>(
    () => [
      {
        id: "invoice",
        accessorFn: (row) => `${row.date} ${row.ref}`,
        header: ({ column }) => <DataGridColumnHeader title="Factura" column={column} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="text-foreground truncate font-medium">{row.original.ref}</div>
            <div className="text-muted-foreground truncate text-xs">
              {row.original.date ? row.original.date.split("-").reverse().join("/") : "Sin fecha"}
            </div>
          </div>
        ),
        size: 125,
        enableSorting: true,
        meta: { headerClassName: GUTTER_START, cellClassName: GUTTER_START },
      },
      {
        id: "status",
        accessorFn: (row) => row.statusLabel,
        header: ({ column }) => <DataGridColumnHeader title="Estado" column={column} />,
        cell: ({ row }) => (
          <Badge variant="outline" className="gap-1.5">
            <Dot className={toneClass(row.original.statusTone)} />
            {row.original.statusLabel}
          </Badge>
        ),
        size: 110,
        enableSorting: true,
      },
      {
        accessorKey: "client",
        id: "client",
        header: ({ column }) => <DataGridColumnHeader title="Cliente" column={column} />,
        cell: ({ row }) => <span className="block min-w-0 truncate">{row.original.client}</span>,
        size: 134,
        enableSorting: true,
      },
      {
        id: "project",
        accessorFn: (row) => row.projectName || row.projectCode,
        header: ({ column }) => <DataGridColumnHeader title="Proyecto" column={column} />,
        cell: ({ row }) => row.original.projectId ? (
          <Button
            variant="outline"
            className="h-7 max-w-full gap-1.5 px-2"
            onClick={() => onProject?.(row.original.projectId)}
          >
            <img src="/brand/finance-icons/folder-simple-star-light.svg" className="size-3.5" alt="" />
            <span className="truncate">{row.original.projectCode || row.original.projectName}</span>
          </Button>
        ) : <span className="text-muted-foreground">—</span>,
        size: 79,
        enableSorting: true,
      },
      {
        accessorKey: "total",
        id: "amount",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Importe (con IVA)"
            column={column}
            className="ms-auto -me-2"
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{formatter.format(row.original.total)}</span>
        ),
        size: 104,
        enableSorting: true,
        meta: {
          headerClassName: `text-right rtl:text-left ${GUTTER_END}`,
          cellClassName: `text-right rtl:text-left ${GUTTER_END}`,
        },
      },
    ],
    [formatter, onProject]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    pageCount: Math.ceil(rows.length / pagination.pageSize),
    getRowId: (row: FinanceGridRow) => row.id,
    state: { pagination, sorting },
    onPaginationChange: (updater) => {
      autoFit.current = false
      setPagination(updater)
    },
    onSortingChange: setSorting,
  })

  const footer = (
    <DataGridTableFootRow>
      <DataGridTableFootRowCell colSpan={4} className={GUTTER_START}>
        <span className="text-muted-foreground">Total filtrado</span>
      </DataGridTableFootRowCell>
      <DataGridTableFootRowCell className={`text-right font-medium tabular-nums rtl:text-left ${GUTTER_END}`}>
        {formatter.format(total)}
      </DataGridTableFootRowCell>
    </DataGridTableFootRow>
  )
  const pageSizes = Array.from(
    new Set([pagination.pageSize, 10, 25, 50, 100])
  ).sort((a, b) => a - b)

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      i18n={{ labels: SPANISH_DATA_GRID_LABELS }}
      emptyMessage="Ninguna factura coincide con estos filtros"
      tableLayout={{ dense: true }}
    >
      <Card className="w-full gap-0 p-0" ref={cardRef}>
        <CardHeader className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle className="truncate text-sm font-medium">Facturas</CardTitle>
            <CardDescription className="truncate text-xs tabular-nums">
              {rows.length} de {sourceRows.length} facturas
            </CardDescription>
          </div>
          <CardAction className="flex shrink-0 items-center gap-2">
            <Filters
              variant="advanced"
              advancedMode="popover"
              advancedAlign="end"
              reorderable
              fields={fields}
              labels={SPANISH_FILTER_LABELS}
              operatorLabels={SPANISH_OPERATORS}
              pathCollapse="start"
              maxPathSegments={1}
              className="[--filter-field-width:9rem] [--filter-operator-width:6.5rem] [--filter-value-width:10.5rem]"
              query={query}
              onQueryChange={applyQuery}
            />
            <Button
              variant="ghost"
              disabled={query.rules.length === 0}
              onClick={() => applyQuery(SEED)}
            >
              Restablecer
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="border-y px-0">
          <DataGridScrollArea>
            <DataGridTable footerContent={footer} />
          </DataGridScrollArea>
        </CardContent>
        <CardFooter className="border-t-0 px-4 py-2.5">
          <DataGridPagination
            sizes={pageSizes}
            className="flex-row py-0 *:py-0! **:order-none! *:last:flex-row!"
          />
        </CardFooter>
      </Card>
    </DataGrid>
  )
}

export function FinanceGridPattern(props: FinanceGridProps) {
  return (
    <CalendarPortal.Provider value={props.container}>
      <div className="w-full font-sans" dir="ltr">
        <FinanceGrid key={props.book} {...props} />
      </div>
    </CalendarPortal.Provider>
  )
}
