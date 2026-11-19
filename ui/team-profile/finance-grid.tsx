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
  FilterQuery,
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
      path: ["ref"],
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

function Dot({ tone }: { tone: FinanceGridRow["statusTone"] }) {
  const color = {
    paid: "bg-emerald-500",
    partial: "bg-amber-500",
    overdue: "bg-destructive",
    pending: "bg-zinc-400",
  }[tone]
  return <span className={`size-2 shrink-0 rounded-full ${color}`} />
}

function valueAt(row: FinanceGridRow, path: string[]) {
  const key = path[0] as keyof FinanceGridRow
  return row[key]
}

function matchRule(row: FinanceGridRow, node: FilterNode): boolean {
  if (!isFilterRule(node)) {
    const values = node.rules.map((child) => matchRule(row, child))
    return node.combinator === "or" ? values.some(Boolean) : values.every(Boolean)
  }
  const current = valueAt(row, node.path)
  const raw = node.value
  const text = String(current ?? "").toLocaleLowerCase("es")
  const needle = String(raw ?? "").toLocaleLowerCase("es")
  const list = Array.isArray(raw) ? raw.map(String) : [String(raw ?? "")]
  const number = Number(current)
  const compare = Number(raw)
  const range = Array.isArray(raw) ? raw.map(Number) : []
  let result = true
  switch (node.operator) {
    case "contains": result = text.includes(needle); break
    case "not_contains": result = !text.includes(needle); break
    case "starts_with": result = text.startsWith(needle); break
    case "ends_with": result = text.endsWith(needle); break
    case "is": case "eq": result = String(current ?? "") === String(raw ?? ""); break
    case "is_not": case "neq": result = String(current ?? "") !== String(raw ?? ""); break
    case "is_any_of": result = list.includes(String(current ?? "")); break
    case "is_none_of": result = !list.includes(String(current ?? "")); break
    case "gt": result = number > compare; break
    case "gte": result = number >= compare; break
    case "lt": result = number < compare; break
    case "lte": result = number <= compare; break
    case "between": result = number >= range[0] && number <= range[1]; break
    case "not_between": result = !(number >= range[0] && number <= range[1]); break
    case "empty": result = current === null || current === undefined || current === ""; break
    case "not_empty": result = current !== null && current !== undefined && current !== ""; break
  }
  return node.negated ? !result : result
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
    return [
      { id: "ref", label: "Factura", type: "text", icon: <FileTextIcon /> },
      {
        id: "status",
        label: "Estado",
        type: "select",
        defaultOperator: "is_any_of",
        options: statuses.map((row) => ({
          value: row.status,
          label: row.statusLabel,
          icon: <Dot tone={row.statusTone} />,
        })),
        icon: <SignpostIcon />,
      },
      {
        id: "client",
        label: "Cliente",
        type: "select",
        defaultOperator: "is_any_of",
        options: clients.map((client) => ({ value: client, label: client })),
        icon: <UserIcon />,
      },
      {
        id: "projectId",
        label: "Proyecto",
        type: "select",
        defaultOperator: "is_any_of",
        options: projects,
        icon: <FolderKanbanIcon />,
      },
      {
        id: "total",
        label: "Importe",
        type: "number",
        defaultOperator: "gte",
        icon: <BanknoteIcon />,
      },
    ]
  }, [sourceRows])

  const rows = useMemo(
    () => sourceRows.filter((row) => matchRule(row, query)),
    [sourceRows, query]
  )
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency]
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
        size: 160,
        enableSorting: true,
        meta: { headerClassName: GUTTER_START, cellClassName: GUTTER_START },
      },
      {
        id: "status",
        accessorFn: (row) => row.statusLabel,
        header: ({ column }) => <DataGridColumnHeader title="Estado" column={column} />,
        cell: ({ row }) => (
          <Badge variant="outline" className="gap-1.5">
            <Dot tone={row.original.statusTone} />
            {row.original.statusLabel}
          </Badge>
        ),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: "client",
        id: "client",
        header: ({ column }) => <DataGridColumnHeader title="Cliente" column={column} />,
        cell: ({ row }) => <span className="block min-w-0 truncate">{row.original.client}</span>,
        size: 180,
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
        size: 180,
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
        size: 150,
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
