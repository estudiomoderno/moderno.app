"use client"

import { useMemo, useState } from "react"
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
  createFilterGroup,
  createFilterQuery,
  createFilterRule,
  isFilterRule,
} from "./vendor/reui/filters/filters-query"
import type {
  FilterField,
  FilterNode,
  FilterOption,
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
  FileTextIcon,
  FolderKanbanIcon,
  SignpostIcon,
  UserIcon,
} from "lucide-react"

import { cn } from "cn"
import { Badge } from "./vendor/reui/badge"
import { Button } from "./vendor/reui/button"
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

const SEED = createFilterQuery<unknown>(
  [
    createFilterRule({
      id: "seed-1",
      path: ["status"],
      operator: "not_empty",
    }),
    createFilterGroup<unknown>({
      id: "seed-group",
      combinator: "or",
      rules: [
        createFilterRule({
          id: "seed-2",
          path: ["total"],
          operator: "gte",
          value: 0,
        }),
        createFilterRule({
          id: "seed-3",
          path: ["client"],
          operator: "not_empty",
        }),
      ],
    }),
    createFilterRule({
      id: "seed-4",
      path: ["invoice", "ref"],
      operator: "not_empty",
    }),
  ],
  "and"
)
const GUTTER_START = "ps-4"
const GUTTER_END = "pe-4"

const COMPACT_OPERATORS: FilterOperatorLabels = {
  gt: "over",
  gte: "at least",
  lt: "under",
  lte: "at most",
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
  gt: (actual, value) => Number(actual) > Number(value),
  gte: (actual, value) => Number(actual) >= Number(value),
  lt: (actual, value) => Number(actual) < Number(value),
  lte: (actual, value) => Number(actual) <= Number(value),
  between: (actual, value) => {
    const [from, to] = list(value)
    return Number(actual) >= Number(from) && Number(actual) <= Number(to)
  },
  not_between: (actual, value) => {
    const [from, to] = list(value)
    return !(Number(actual) >= Number(from) && Number(actual) <= Number(to))
  },
  empty: (actual) => actual === undefined || actual === null || actual === "",
  not_empty: (actual) => !(actual === undefined || actual === null || actual === ""),
}

function filterRecord(row: FinanceGridRow) {
  return {
    status: row.status,
    client: row.client,
    total: row.total,
    invoice: { ref: row.ref, date: row.date, projectId: row.projectId },
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
  if (value === undefined) return true
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
  rows: sourceRows,
  currency = "EUR",
  locale = "es-ES",
  onProject,
}: FinanceGridProps) {
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

  const fields = useMemo<FilterField[]>(() => {
    const statuses = Array.from(new Map(sourceRows.map((row) => [row.status, row])).values())
    const clients = Array.from(new Set(sourceRows.map((row) => row.client))).sort()
    const projects = Array.from(
      new Map(
        sourceRows
          .filter((row) => row.projectId)
          .map((row) => [row.projectId, { value: row.projectId, label: row.projectCode || row.projectName }])
      ).values()
    )
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
        label: "Cliente",
        type: "select",
        defaultOperator: "is_any_of",
        options: clients.map((client) => ({ value: client, label: client })),
        pinSelected: true,
        sortSelected: "label",
        renderValue: ({ options }) => <StackedValues options={options} empty="cualquier cliente" />,
        icon: <UserIcon />,
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
          { id: "date", label: "Fecha", type: "text" },
          {
            id: "projectId",
            label: "Proyecto",
            type: "select",
            defaultOperator: "is_any_of",
            options: projects,
            renderValue: ({ options }) => (
              <StackedValues options={options} empty="cualquier proyecto" />
            ),
            icon: <FolderKanbanIcon />,
          },
        ],
      },
    ]
  }, [formatter, sourceRows])

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
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  })

  const footer = (
    <DataGridTableFootRow>
      <DataGridTableFootRowCell colSpan={4} className={GUTTER_START}>
        <span className="text-muted-foreground">Filtered total</span>
      </DataGridTableFootRowCell>
      <DataGridTableFootRowCell className={`text-right font-medium tabular-nums rtl:text-left ${GUTTER_END}`}>
        {formatter.format(total)}
      </DataGridTableFootRowCell>
    </DataGridTableFootRow>
  )

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      emptyMessage="No invoices match these filters"
      tableLayout={{ dense: true }}
    >
      <Card className="w-full gap-0 p-0">
        <CardHeader className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle className="truncate text-sm font-medium">Facturas</CardTitle>
            <CardDescription className="truncate text-xs tabular-nums">
              {rows.length} of {sourceRows.length} facturas
            </CardDescription>
          </div>
          <CardAction className="flex shrink-0 items-center gap-2">
            <Filters
              variant="advanced"
              advancedMode="popover"
              advancedAlign="end"
              reorderable
              fields={fields}
              operatorLabels={COMPACT_OPERATORS}
              pathCollapse="start"
              maxPathSegments={1}
              className="[--filter-field-width:9rem] [--filter-operator-width:6.5rem] [--filter-value-width:10.5rem]"
              query={query}
              onQueryChange={applyQuery}
            />
            <Button
              variant="ghost"
              disabled={query === SEED}
              onClick={() => applyQuery(SEED)}
            >
              Reset
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
            sizes={[5, 10, 25]}
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
