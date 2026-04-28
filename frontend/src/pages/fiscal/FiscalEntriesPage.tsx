import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Trash2, RotateCcw, PlusCircle, Pencil, Filter, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react'
import { fiscalEntriesApi, type EntryType, type FiscalEntry } from '@/api/fiscalEntries'
import { partnersApi } from '@/api/partners'
import { serviceItemsApi } from '@/api/fiscalBase'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'
import { CurrencyInput } from '@/components/ui/CurrencyInput'

const entryTypeLabels: Record<EntryType, string> = {
  purchase: 'Compra',
  sale: 'Venda',
  service_provided: 'Serviço Prestado',
  service_taken: 'Serviço Tomado',
  transport: 'Conhecimento de Transporte',
  other: 'Outros',
}

// ─── schemas do formulário (inalterados) ────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  product_code: z.string().optional(),
  ncm: z.string().optional(),
  cfop: z.string().optional(),
  unit: z.string().default('UN'),
  quantity: z.coerce.number().min(0).default(1),
  unit_price: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0).default(0),
  icms_cst: z.string().optional(),
  icms_base: z.number().min(0).default(0),
  icms_rate: z.coerce.number().min(0).default(0),
  icms_value: z.number().min(0).default(0),
  pis_cst: z.string().optional(),
  pis_rate: z.coerce.number().min(0).default(0),
  pis_value: z.number().min(0).default(0),
  cofins_cst: z.string().optional(),
  cofins_rate: z.coerce.number().min(0).default(0),
  cofins_value: z.number().min(0).default(0),
})

const schema = z.object({
  entry_type: z.enum(['purchase', 'sale', 'service_provided', 'service_taken', 'transport', 'other']),
  entry_date: z.string().min(1, 'Data obrigatória'),
  competence_date: z.string().min(1, 'Competência obrigatória'),
  document_number: z.string().optional(),
  document_series: z.string().optional(),
  document_model: z.string().optional(),
  partner_id: z.coerce.number().optional(),
  partner_name: z.string().optional(),
  partner_cnpj_cpf: z.string().optional(),
  total_products: z.number().min(0).default(0),
  total_services: z.number().min(0).default(0),
  total_discount: z.number().min(0).default(0),
  total_gross: z.number().min(0).default(0),
  icms_base: z.number().min(0).default(0),
  icms_value: z.number().min(0).default(0),
  pis_value: z.number().min(0).default(0),
  cofins_value: z.number().min(0).default(0),
  iss_value: z.number().min(0).default(0),
  notes: z.string().optional(),
  access_key: z.string().max(44).optional(),
  items: z.array(itemSchema).default([]),
})

type FormData = z.infer<typeof schema>
type Tab = 'active' | 'trash'
type FormTab = 'header' | 'items'
type ModalMode = 'create' | 'edit'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 0] // 0 = todos

const emptyItem = (): z.infer<typeof itemSchema> => ({
  description: '', product_code: '', ncm: '', cfop: '', unit: 'UN',
  quantity: 1, unit_price: 0, discount: 0, total: 0,
  icms_cst: '', icms_base: 0, icms_rate: 0, icms_value: 0,
  pis_cst: '', pis_rate: 0, pis_value: 0,
  cofins_cst: '', cofins_rate: 0, cofins_value: 0,
})

const today = new Date().toISOString().slice(0, 10)

function entryToForm(e: FiscalEntry): FormData {
  return {
    entry_type: e.entry_type as EntryType,
    entry_date: String(e.entry_date),
    competence_date: String(e.competence_date),
    document_number: e.document_number ?? '',
    document_series: e.document_series ?? '',
    document_model: e.document_model ?? '',
    partner_id: e.partner_id ?? undefined,
    partner_name: e.partner_name ?? '',
    partner_cnpj_cpf: e.partner_cnpj_cpf ?? '',
    total_products: Number(e.total_products),
    total_services: Number(e.total_services),
    total_discount: Number(e.total_discount),
    total_gross: Number(e.total_gross),
    icms_base: Number(e.icms_base),
    icms_value: Number(e.icms_value),
    pis_value: Number(e.pis_value),
    cofins_value: Number(e.cofins_value),
    iss_value: Number(e.iss_value),
    notes: e.notes ?? '',
    access_key: e.access_key ?? '',
    items: e.items.map((i) => ({
      description: i.description,
      product_code: '',
      ncm: i.ncm ?? '',
      cfop: i.cfop_code ?? '',
      unit: i.unit,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      discount: Number(i.discount),
      total: Number(i.total),
      icms_cst: i.icms_cst ?? '',
      icms_base: Number(i.icms_base),
      icms_rate: Number(i.icms_rate),
      icms_value: Number(i.icms_value),
      pis_cst: i.pis_cst ?? '',
      pis_rate: Number(i.pis_rate),
      pis_value: Number(i.pis_value),
      cofins_cst: i.cofins_cst ?? '',
      cofins_rate: Number(i.cofins_rate),
      cofins_value: Number(i.cofins_value),
    })),
  }
}

// ─── Barra de filtros ────────────────────────────────────────────────────────

interface Filters {
  entryType: string
  dateFrom: string
  dateTo: string
  cfop: string
  partner: string
}

const EMPTY_FILTERS: Filters = { entryType: '', dateFrom: '', dateTo: '', cfop: '', partner: '' }

function FiltersBar({
  filters, onChange, total, filtered,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  total: number
  filtered: number
}) {
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value })
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Tipo */}
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-gray-500">Tipo de nota</label>
          <select
            value={filters.entryType}
            onChange={(e) => set('entryType', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(entryTypeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Período de / até */}
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-xs text-gray-500">Data de</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-xs text-gray-500">Data até</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set('dateTo', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* CFOP */}
        <div className="min-w-[110px] flex-1">
          <label className="mb-1 block text-xs text-gray-500">CFOP</label>
          <input
            type="text"
            maxLength={5}
            placeholder="ex: 6102"
            value={filters.cfop}
            onChange={(e) => set('cfop', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Parceiro */}
        <div className="min-w-[180px] flex-[2]">
          <label className="mb-1 block text-xs text-gray-500">Parceiro</label>
          <input
            type="text"
            placeholder="Nome ou CNPJ/CPF"
            value={filters.partner}
            onChange={(e) => set('partner', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Limpar */}
        {hasFilters && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {hasFilters && total !== filtered && (
        <p className="mt-2 text-xs text-brand-600">
          <Filter size={11} className="mr-1 inline" />
          Exibindo {filtered} de {total} lançamentos
        </p>
      )}
    </div>
  )
}

// ─── Paginação ───────────────────────────────────────────────────────────────

function Pagination({
  total, pageSize, page, onPageSize, onPage,
}: {
  total: number
  pageSize: number
  page: number
  onPageSize: (n: number) => void
  onPage: (n: number) => void
}) {
  const totalPages = pageSize === 0 ? 1 : Math.ceil(total / pageSize)
  const from = pageSize === 0 ? 1 : page * pageSize + 1
  const to = pageSize === 0 ? total : Math.min((page + 1) * pageSize, total)

  return (
    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center gap-2">
        <span>Exibir</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(0) }}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n === 0 ? 'Todos' : n}</option>
          ))}
        </select>
        <span>por página</span>
        {total > 0 && (
          <span className="ml-2 text-gray-400">
            ({from}–{to} de {total})
          </span>
        )}
      </div>

      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 0}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
            .reduce<(number | 'gap')[]>((acc, i, idx, arr) => {
              if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('gap')
              acc.push(i)
              return acc
            }, [])
            .map((item, idx) =>
              item === 'gap' ? (
                <span key={`gap-${idx}`} className="px-1 text-gray-300">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => onPage(item as number)}
                  className={`min-w-[28px] rounded px-1.5 py-0.5 text-xs ${
                    page === item
                      ? 'bg-brand-600 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {(item as number) + 1}
                </button>
              )
            )}
          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export function FiscalEntriesPage() {
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<ModalMode>('create')
  const [editing, setEditing] = useState<FiscalEntry | null>(null)
  const [tab, setTab] = useState<Tab>('active')
  const [formTab, setFormTab] = useState<FormTab>('header')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(0)
  const [showColPicker, setShowColPicker] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [visibleCols, setVisibleCols] = useState({
    item: true,
    icms: true,
    pis: true,
    cofins: true,
    iss: false,
  })

  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { company } = useCompany()
  const isPlatformAdmin = user?.role === 'platform_admin'
  const tenantId = isPlatformAdmin ? 1 : undefined

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['fiscal-entries', tenantId, company?.id, tab],
    queryFn: () =>
      fiscalEntriesApi
        .list({ company_id: company?.id, include_inactive: tab === 'trash', tenant_id: tenantId })
        .then((r) => r.data.filter((e) => (tab === 'trash' ? !e.is_active : e.is_active))),
    enabled: !!company,
  })

  const { data: partners = [] } = useQuery({
    queryKey: ['partners', company?.id],
    queryFn: () => partnersApi.list(company!.id).then((r) => r.data),
    enabled: !!company,
  })

  const { data: serviceItems = [] } = useQuery({
    queryKey: ['service-items', company?.id],
    queryFn: () => serviceItemsApi.list(company!.id).then((r) => r.data),
    enabled: !!company,
  })
  const serviceItemMap = useMemo(() => {
    const m: Record<number, string> = {}
    for (const s of serviceItems) m[s.id] = s.code
    return m
  }, [serviceItems])

  // ── Filtragem client-side ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = entries

    if (filters.entryType)
      result = result.filter((e) => e.entry_type === filters.entryType)

    if (filters.dateFrom)
      result = result.filter((e) => String(e.entry_date) >= filters.dateFrom)

    if (filters.dateTo)
      result = result.filter((e) => String(e.entry_date) <= filters.dateTo)

    if (filters.cfop) {
      const cfopTerm = filters.cfop.trim()
      result = result.filter((e) =>
        e.items.some((i) => {
          // items podem ter cfop_id (número FK) — comparamos pela descrição do item
          // ou via o campo ncm que não existe; usamos icms_cst como proxy se cfop não estiver exposto
          // O ideal é comparar o cfop_id, mas como só temos o código no XML, filtramos pelo que temos
          return String(i.cfop_id ?? '').includes(cfopTerm) ||
            i.description?.toLowerCase().includes(cfopTerm)
        })
      )
    }

    if (filters.partner) {
      const term = filters.partner.toLowerCase()
      result = result.filter(
        (e) =>
          e.partner_name?.toLowerCase().includes(term) ||
          e.partner_cnpj_cpf?.includes(term)
      )
    }

    return result
  }, [entries, filters])

  // ── Paginação ──────────────────────────────────────────────────────────────
  const paginated = useMemo(() => {
    if (pageSize === 0) return filtered
    const start = page * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  // Volta para página 0 quando filtros mudam
  const handleFilterChange = (f: Filters) => {
    setFilters(f)
    setPage(0)
    setSelected(new Set())
  }

  // ── Totais do rodapé ───────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    gross: filtered.reduce((s, e) => s + Number(e.total_gross), 0),
    icms: filtered.reduce((s, e) => s + Number(e.icms_value), 0),
    pis: filtered.reduce((s, e) => s + Number(e.pis_value), 0),
    cofins: filtered.reduce((s, e) => s + Number(e.cofins_value), 0),
    iss: filtered.reduce((s, e) => s + Number(e.iss_value), 0),
  }), [filtered])

  // ── Formulário ─────────────────────────────────────────────────────────────
  const defaultValues: FormData = {
    entry_type: 'purchase',
    entry_date: today, competence_date: today,
    total_products: 0, total_services: 0, total_discount: 0, total_gross: 0,
    icms_base: 0, icms_value: 0, pis_value: 0, cofins_value: 0, iss_value: 0,
    items: [],
  }

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const createMutation = useMutation({
    mutationFn: (data: FormData & { company_id: number }) => fiscalEntriesApi.create(data as any, tenantId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-entries'] }); closeForm() },
  })
  const updateMutation = useMutation({
    mutationFn: (data: FormData) => fiscalEntriesApi.update(editing!.id, data as any, tenantId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-entries'] }); closeForm() },
  })
  const softDeleteMutation = useMutation({
    mutationFn: (id: number) => fiscalEntriesApi.softDelete(id, tenantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fiscal-entries'] }),
  })
  const bulkSoftDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => fiscalEntriesApi.bulkSoftDelete(ids, tenantId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-entries'] }); setSelected(new Set()) },
  })
  const bulkHardDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => fiscalEntriesApi.bulkHardDelete(ids, tenantId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-entries'] }); setSelected(new Set()) },
  })
  const clearTrashMutation = useMutation({
    mutationFn: () => fiscalEntriesApi.clearTrash(company!.id, tenantId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-entries'] }); setSelected(new Set()) },
  })
  const restoreMutation = useMutation({
    mutationFn: (id: number) => fiscalEntriesApi.restore(id, tenantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fiscal-entries'] }),
  })
  const hardDeleteMutation = useMutation({
    mutationFn: (id: number) => fiscalEntriesApi.hardDelete(id, tenantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fiscal-entries'] }),
  })

  function openCreate() {
    setFormMode('create'); setEditing(null); reset(defaultValues); setFormTab('header'); setShowForm(true)
  }
  function openEdit(e: FiscalEntry) {
    setFormMode('edit'); setEditing(e); reset(entryToForm(e)); setFormTab('header'); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null); setFormTab('header'); reset() }

  function handlePartnerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value)
    const partner = partners.find((p) => p.id === id)
    if (partner) {
      setValue('partner_id', id)
      setValue('partner_name', partner.name)
      setValue('partner_cnpj_cpf', partner.cnpj_cpf ?? '')
    } else {
      setValue('partner_id', undefined)
    }
  }

  const watchPartnerId = watch('partner_id')
  const onSubmit = (data: FormData) => {
    if (formMode === 'edit') updateMutation.mutate(data)
    else createMutation.mutate({ ...data, company_id: company!.id })
  }
  const isSaving = createMutation.isPending || updateMutation.isPending

  const moneyField = (name: keyof FormData, label: string) => (
    <div key={name}>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <CurrencyInput value={field.value as number} onChange={field.onChange} className="input" />
        )}
      />
    </div>
  )

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Lançamentos Fiscais</h1>
        {tab === 'active' && (
          <button
            onClick={() => company && openCreate()}
            disabled={!company}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Novo lançamento
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {(['active', 'trash'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(0) }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'active' ? 'Ativos' : 'Lixeira'}
          </button>
        ))}
      </div>

      {!company ? <NoCompanyBanner /> : (
        <>
          <FiltersBar
            filters={filters}
            onChange={handleFilterChange}
            total={entries.length}
            filtered={filtered.length}
          />

          {/* Totais + seletor de colunas */}
          {filtered.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="flex flex-1 flex-wrap gap-3">
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
                  <span className="text-xs text-gray-400">Total ({filtered.length} lanç.)</span>
                  <p className="font-semibold text-gray-900">{fmtBRL(totals.gross)}</p>
                </div>
                {visibleCols.icms && (
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
                    <span className="text-xs text-gray-400">ICMS</span>
                    <p className="font-medium text-gray-700">{fmtBRL(totals.icms)}</p>
                  </div>
                )}
                {visibleCols.pis && (
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
                    <span className="text-xs text-gray-400">PIS</span>
                    <p className="font-medium text-gray-700">{fmtBRL(totals.pis)}</p>
                  </div>
                )}
                {visibleCols.cofins && (
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
                    <span className="text-xs text-gray-400">COFINS</span>
                    <p className="font-medium text-gray-700">{fmtBRL(totals.cofins)}</p>
                  </div>
                )}
                {visibleCols.iss && (
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
                    <span className="text-xs text-gray-400">ISS</span>
                    <p className="font-medium text-gray-700">{fmtBRL(totals.iss)}</p>
                  </div>
                )}
              </div>

              {tab === 'active' && selected.size > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Mover ${selected.size} lançamento${selected.size !== 1 ? 's' : ''} para a lixeira?`))
                      bulkSoftDeleteMutation.mutate([...selected])
                  }}
                  disabled={bulkSoftDeleteMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <Trash2 size={13} /> Excluir {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
                </button>
              )}

              {/* Seletor de colunas */}
              <div className="relative">
                <button
                  onClick={() => setShowColPicker(v => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Columns3 size={13} /> Colunas
                </button>
                {showColPicker && (
                  <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                    <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Colunas visíveis</p>
                    {([
                      { key: 'item',   label: 'Item de Serviço' },
                      { key: 'icms',   label: 'ICMS' },
                      { key: 'pis',    label: 'PIS' },
                      { key: 'cofins', label: 'COFINS' },
                      { key: 'iss',    label: 'ISS' },
                    ] as { key: keyof typeof visibleCols; label: string }[]).map(({ key, label }) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={visibleCols[key]}
                          onChange={e => setVisibleCols(v => ({ ...v, [key]: e.target.checked }))}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'active' && selected.size > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm">
              <span className="text-red-700 font-medium">{selected.size} lançamento{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}</span>
              <button
                onClick={() => {
                  if (confirm(`Mover ${selected.size} lançamento${selected.size !== 1 ? 's' : ''} para a lixeira?`))
                    bulkSoftDeleteMutation.mutate([...selected])
                }}
                disabled={bulkSoftDeleteMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 size={13} /> Mover para lixeira
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto text-xs text-red-400 hover:text-red-600"
              >
                Cancelar seleção
              </button>
            </div>
          )}

          {tab === 'trash' && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
              {selected.size > 0 ? (
                <>
                  <span className="text-gray-700 font-medium">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir permanentemente ${selected.size} lançamento${selected.size !== 1 ? 's' : ''}? Esta ação é irreversível.`))
                        bulkHardDeleteMutation.mutate([...selected])
                    }}
                    disabled={bulkHardDeleteMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    <Trash2 size={13} /> Excluir permanentemente
                  </button>
                  <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600">
                    Cancelar seleção
                  </button>
                </>
              ) : (
                <span className="text-xs text-gray-400">{entries.length} lançamento{entries.length !== 1 ? 's' : ''} na lixeira</span>
              )}
              {entries.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Limpar lixeira? Todos os ${entries.length} lançamentos serão excluídos permanentemente. Esta ação é irreversível.`))
                      clearTrashMutation.mutate()
                  }}
                  disabled={clearTrashMutation.isPending}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 size={13} /> Limpar lixeira
                </button>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white">
            {isLoading ? (
              <p className="p-6 text-sm text-gray-400">Carregando...</p>
            ) : paginated.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">
                {filtered.length === 0 && entries.length > 0
                  ? 'Nenhum lançamento encontrado com os filtros aplicados.'
                  : 'Nenhum lançamento encontrado.'}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                    {tab === 'active' && (
                      <th className="pl-5 py-3 w-8">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600"
                          checked={paginated.length > 0 && paginated.every((e) => selected.has(e.id))}
                          onChange={(ev) => {
                            if (ev.target.checked) setSelected((s) => new Set([...s, ...paginated.map((e) => e.id)]))
                            else setSelected((s) => { const n = new Set(s); paginated.forEach((e) => n.delete(e.id)); return n })
                          }}
                        />
                      </th>
                    )}
                    <th className="px-5 py-3">Cód.</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3">Nº / Série</th>
                    <th className="px-5 py-3">Parceiro</th>
                    {visibleCols.item && <th className="px-5 py-3">Item</th>}
                    <th className="px-5 py-3 text-right">Total</th>
                    {visibleCols.icms   && <th className="px-5 py-3 text-right">ICMS</th>}
                    {visibleCols.pis    && <th className="px-5 py-3 text-right">PIS</th>}
                    {visibleCols.cofins && <th className="px-5 py-3 text-right">COFINS</th>}
                    {visibleCols.iss    && <th className="px-5 py-3 text-right">ISS</th>}
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e) => {
                    const firstSvcId = e.items.find(i => i.service_item_id)?.service_item_id
                    const itemCode = firstSvcId ? serviceItemMap[firstSvcId] : null
                    return (
                      <tr key={e.id} className={`border-b border-gray-50 hover:bg-gray-50 ${selected.has(e.id) ? 'bg-brand-50' : ''}`}>
                        {tab === 'active' && (
                          <td className="pl-5 py-3">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600"
                              checked={selected.has(e.id)}
                              onChange={(ev) => setSelected((s) => { const n = new Set(s); ev.target.checked ? n.add(e.id) : n.delete(e.id); return n })}
                            />
                          </td>
                        )}
                        <td className="px-5 py-3 font-mono text-xs text-gray-500">{String(e.code).padStart(6, '0')}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            e.entry_type === 'purchase'
                              ? 'bg-blue-100 text-blue-700'
                              : e.entry_type === 'sale'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {entryTypeLabels[e.entry_type] ?? e.entry_type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{String(e.entry_date)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-500">
                          {e.document_number ? `${e.document_number}${e.document_series ? ` / ${e.document_series}` : ''}` : '—'}
                        </td>
                        <td className="max-w-[180px] truncate px-5 py-3 text-gray-600" title={e.partner_name ?? ''}>
                          {e.partner_name || '—'}
                        </td>
                        {visibleCols.item && (
                          <td className="px-5 py-3 font-mono text-xs text-brand-600" title={itemCode ? `Item: ${itemCode}` : 'Sem item de serviço'}>
                            {itemCode || <span className="text-gray-300">—</span>}
                          </td>
                        )}
                        <td className="px-5 py-3 text-right font-medium text-gray-800">{fmtBRL(Number(e.total_gross))}</td>
                        {visibleCols.icms   && <td className="px-5 py-3 text-right text-gray-500">{fmtBRL(Number(e.icms_value))}</td>}
                        {visibleCols.pis    && <td className="px-5 py-3 text-right text-gray-500">{fmtBRL(Number(e.pis_value))}</td>}
                        {visibleCols.cofins && <td className="px-5 py-3 text-right text-gray-500">{fmtBRL(Number(e.cofins_value))}</td>}
                        {visibleCols.iss    && <td className="px-5 py-3 text-right text-gray-500">{fmtBRL(Number(e.iss_value))}</td>}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {tab === 'active' ? (
                              <>
                                <button onClick={() => openEdit(e)} className="text-brand-600 hover:text-brand-800" title="Editar"><Pencil size={14} /></button>
                                <button onClick={() => softDeleteMutation.mutate(e.id)} className="text-red-400 hover:text-red-600" title="Mover para lixeira"><Trash2 size={14} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => restoreMutation.mutate(e.id)} className="text-green-500 hover:text-green-700" title="Restaurar"><RotateCcw size={14} /></button>
                                <button
                                  onClick={() => { if (confirm('Excluir permanentemente? Esta ação é irreversível.')) hardDeleteMutation.mutate(e.id) }}
                                  className="text-red-400 hover:text-red-600" title="Excluir permanentemente"
                                ><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            total={filtered.length}
            pageSize={pageSize}
            page={page}
            onPageSize={setPageSize}
            onPage={setPage}
          />
        </>
      )}

      {/* Modal criar / editar — inalterado */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {formMode === 'edit'
                  ? `Editar Lançamento — ${String(editing!.code).padStart(6, '0')}`
                  : 'Novo Lançamento Fiscal'}
              </h2>
              <button onClick={closeForm}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
            </div>

            <div className="flex gap-1 px-6 border-b border-gray-100">
              {(['header', 'items'] as FormTab[]).map((t) => (
                <button key={t} type="button" onClick={() => setFormTab(t)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${formTab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t === 'header' ? 'Cabeçalho' : `Itens da Nota${fields.length > 0 ? ` (${fields.length})` : ''}`}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {formTab === 'header' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Tipo *</label>
                        <select {...register('entry_type')} className="input">
                          {Object.entries(entryTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Modelo</label>
                        <input {...register('document_model')} className="input" placeholder="55, NFS-e, 57..." />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Data *</label>
                        <input {...register('entry_date')} className="input" type="date" />
                        {errors.entry_date && <p className="mt-1 text-xs text-red-500">{errors.entry_date.message}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Competência *</label>
                        <input {...register('competence_date')} className="input" type="date" />
                        {errors.competence_date && <p className="mt-1 text-xs text-red-500">{errors.competence_date.message}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Nº Documento</label>
                        <input {...register('document_number')} className="input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Série</label>
                        <input {...register('document_series')} className="input" maxLength={5} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-700">Parceiro</label>
                        <select className="input" value={watchPartnerId ?? ''} onChange={handlePartnerChange}>
                          <option value="">— Selecione ou deixe em branco —</option>
                          {partners.map((p) => (
                            <option key={p.id} value={p.id}>{String(p.code).padStart(4, '0')} — {p.name}{p.cnpj_cpf ? ` (${p.cnpj_cpf})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Nome do Parceiro</label>
                        <input {...register('partner_name')} className="input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">CNPJ/CPF Parceiro</label>
                        <input {...register('partner_cnpj_cpf')} className="input" />
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Totais da Nota</p>
                      <div className="grid grid-cols-4 gap-3">
                        {moneyField('total_products', 'Total Produtos')}
                        {moneyField('total_services', 'Total Serviços')}
                        {moneyField('total_discount', 'Desconto')}
                        {moneyField('total_gross', 'Total Bruto')}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Tributos Totais</p>
                      <div className="grid grid-cols-5 gap-3">
                        {moneyField('icms_base', 'Base ICMS')}
                        {moneyField('icms_value', 'ICMS')}
                        {moneyField('pis_value', 'PIS')}
                        {moneyField('cofins_value', 'COFINS')}
                        {moneyField('iss_value', 'ISS')}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Chave de Acesso (NF-e)</label>
                      <input {...register('access_key')} className="input" maxLength={44} placeholder="44 dígitos" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Observações</label>
                      <textarea {...register('notes')} className="input min-h-[60px]" />
                    </div>
                  </div>
                )}

                {formTab === 'items' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Itens que compõem o total da nota fiscal</p>
                      <button type="button" onClick={() => append(emptyItem())}
                        className="flex items-center gap-1 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">
                        <PlusCircle size={13} /> Adicionar item
                      </button>
                    </div>
                    {fields.length === 0 && (
                      <p className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                        Nenhum item adicionado.
                      </p>
                    )}
                    {fields.map((field, idx) => (
                      <div key={field.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Item {idx + 1}</span>
                          <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Cód. Produto</label>
                            <input {...register(`items.${idx}.product_code`)} className="input text-xs" />
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-xs text-gray-600">Descrição *</label>
                            <input {...register(`items.${idx}.description`)} className="input text-xs" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">NCM</label>
                            <input {...register(`items.${idx}.ncm`)} className="input text-xs" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">CFOP</label>
                            <input {...register(`items.${idx}.cfop`)} className="input text-xs" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Unidade</label>
                            <input {...register(`items.${idx}.unit`)} className="input text-xs" />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Qtd.</label>
                            <input {...register(`items.${idx}.quantity`)} className="input text-xs" type="number" step="0.0001" min="0" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Vl. Unit.</label>
                            <Controller control={control} name={`items.${idx}.unit_price`}
                              render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="input text-xs" />} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Desconto</label>
                            <Controller control={control} name={`items.${idx}.discount`}
                              render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="input text-xs" />} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Total</label>
                            <Controller control={control} name={`items.${idx}.total`}
                              render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="input text-xs" />} />
                          </div>
                        </div>
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none">Tributos do item ▸</summary>
                          <div className="mt-2 grid grid-cols-3 gap-3">
                            <div><label className="mb-1 block text-xs text-gray-600">CST ICMS</label><input {...register(`items.${idx}.icms_cst`)} className="input text-xs" /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">Base ICMS</label>
                              <Controller control={control} name={`items.${idx}.icms_base`} render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="input text-xs" />} /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">ICMS %</label><input {...register(`items.${idx}.icms_rate`)} className="input text-xs" type="number" step="0.01" min="0" /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">Vl. ICMS</label>
                              <Controller control={control} name={`items.${idx}.icms_value`} render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="input text-xs" />} /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">CST PIS</label><input {...register(`items.${idx}.pis_cst`)} className="input text-xs" /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">PIS %</label><input {...register(`items.${idx}.pis_rate`)} className="input text-xs" type="number" step="0.01" min="0" /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">Vl. PIS</label>
                              <Controller control={control} name={`items.${idx}.pis_value`} render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="input text-xs" />} /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">CST COFINS</label><input {...register(`items.${idx}.cofins_cst`)} className="input text-xs" /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">COFINS %</label><input {...register(`items.${idx}.cofins_rate`)} className="input text-xs" type="number" step="0.01" min="0" /></div>
                            <div><label className="mb-1 block text-xs text-gray-600">Vl. COFINS</label>
                              <Controller control={control} name={`items.${idx}.cofins_value`} render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="input text-xs" />} /></div>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
                {(createMutation.isError || updateMutation.isError) && <p className="text-sm text-red-500">Erro ao salvar lançamento.</p>}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={isSubmitting || isSaving}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
