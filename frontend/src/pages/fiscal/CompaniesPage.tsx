import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil, Trash2, UserPlus, Search, Building2, CheckCircle2, TrendingUp, Users } from 'lucide-react'
import { companiesApi, type Company, type CompanyCreate } from '@/api/companies'
import { accountantsApi } from '@/api/accountants'
import { companyPartnersApi, type CompanyPartner, type CompanyPartnerCreate } from '@/api/companyPartners'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'

// ── Schemas & tipos ────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Razão social obrigatória'),
  trade_name: z.string().optional(),
  cnpj: z.string().optional(),
  company_type: z.enum(['ltda', 'eireli', 'sa', 'mei', 'autonomo', 'outros']),
  regime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'mei']),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  cnae: z.string().optional(),
  opening_date: z.string().optional(),
  accountant_id: z.coerce.number().optional().nullable(),
  integracao_contabil_modo: z.enum(['conta_unica', 'conta_individual']),
})

type FormData = z.infer<typeof schema>
type ModalTab = 'principal' | 'complementar'
type ModalMode = 'create' | 'edit'

// ── Constantes de label ────────────────────────────────────────────────────────

const regimeLabels: Record<string, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  mei: 'MEI',
}

const regimeColors: Record<string, string> = {
  simples_nacional: 'bg-green-100 text-green-700',
  lucro_presumido:  'bg-blue-100 text-blue-700',
  lucro_real:       'bg-purple-100 text-purple-700',
  mei:              'bg-amber-100 text-amber-700',
}

const typeLabels: Record<string, string> = {
  ltda: 'LTDA', eireli: 'EIRELI', sa: 'S/A', mei: 'MEI', autonomo: 'Autônomo', outros: 'Outros',
}

const PAGE_SIZES = [10, 25, 50]

// ── Componente principal ───────────────────────────────────────────────────────

export function CompaniesPage() {
  const [showForm, setShowForm]         = useState(false)
  const [modalMode, setModalMode]       = useState<ModalMode>('create')
  const [modalTab, setModalTab]         = useState<ModalTab>('principal')
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [search, setSearch]             = useState('')
  const [filterRegime, setFilterRegime] = useState('')
  const [page, setPage]                 = useState(0)
  const [pageSize, setPageSize]         = useState(10)

  const qc                = useQueryClient()
  const { user }          = useAuth()
  const { company: activeCompany, setCompany } = useCompany()
  const isPlatformAdmin   = user?.role === 'platform_admin'
  const tenantId          = isPlatformAdmin ? 1 : undefined

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', tenantId],
    queryFn: () => companiesApi.list(tenantId).then(r => r.data),
  })

  const { data: accountants = [] } = useQuery({
    queryKey: ['accountants', tenantId],
    queryFn: () => accountantsApi.list(tenantId).then(r => r.data),
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { company_type: 'ltda', regime: 'simples_nacional', integracao_contabil_modo: 'conta_unica' },
  })

  const createMutation = useMutation({
    mutationFn: (data: CompanyCreate) => companiesApi.create(data, tenantId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); closeForm() },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => companiesApi.update(editingCompany!.id, data as any, tenantId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      if (activeCompany?.id === editingCompany?.id) setCompany(res.data)
      closeForm()
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => companiesApi.deactivate(id, tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })

  // ── Quadro Societário ────────────────────────────────────────────────────────

  const [showPartnerForm, setShowPartnerForm]   = useState(false)
  const [editingPartner, setEditingPartner]     = useState<CompanyPartner | null>(null)
  const partnerForm = useForm<CompanyPartnerCreate>({ defaultValues: { is_responsible: false } })

  const { data: companyPartners = [] } = useQuery({
    queryKey: ['company-partners', editingCompany?.id],
    queryFn: () => companyPartnersApi.list(editingCompany!.id).then(r => r.data),
    enabled: !!editingCompany && modalTab === 'complementar',
  })

  const createPartnerMutation = useMutation({
    mutationFn: (data: CompanyPartnerCreate) => companyPartnersApi.create(editingCompany!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-partners', editingCompany?.id] }); setShowPartnerForm(false); partnerForm.reset({ is_responsible: false }) },
  })

  const updatePartnerMutation = useMutation({
    mutationFn: (data: CompanyPartnerCreate) => companyPartnersApi.update(editingPartner!.id, editingCompany!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-partners', editingCompany?.id] }); setShowPartnerForm(false); setEditingPartner(null); partnerForm.reset({ is_responsible: false }) },
  })

  const deletePartnerMutation = useMutation({
    mutationFn: (id: number) => companyPartnersApi.delete(id, editingCompany!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-partners', editingCompany?.id] }),
  })

  function openPartnerCreate() { setEditingPartner(null); partnerForm.reset({ is_responsible: false }); setShowPartnerForm(true) }

  function openPartnerEdit(p: CompanyPartner) {
    setEditingPartner(p)
    partnerForm.reset({
      name: p.name, cpf: p.cpf ?? '', rg: p.rg ?? '', rg_issuer: p.rg_issuer ?? '',
      birth_date: p.birth_date ?? '', phone: p.phone ?? '', email: p.email ?? '',
      equity_share: p.equity_share ?? undefined,
      address: p.address ?? '', address_number: p.address_number ?? '',
      complement: p.complement ?? '', neighborhood: p.neighborhood ?? '',
      city: p.city ?? '', state: p.state ?? '', zip_code: p.zip_code ?? '',
      is_responsible: p.is_responsible,
    })
    setShowPartnerForm(true)
  }

  function onPartnerSubmit(data: CompanyPartnerCreate) {
    if (editingPartner) updatePartnerMutation.mutate(data)
    else createPartnerMutation.mutate(data)
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setModalMode('create'); setModalTab('principal'); setEditingCompany(null)
    reset({ company_type: 'ltda', regime: 'simples_nacional', integracao_contabil_modo: 'conta_unica' })
    setShowForm(true)
  }

  function openEdit(c: Company) {
    setModalMode('edit'); setModalTab('principal'); setEditingCompany(c)
    reset({
      name: c.name, trade_name: c.trade_name ?? '', cnpj: c.cnpj ?? '',
      company_type: c.company_type as FormData['company_type'],
      regime: c.regime as FormData['regime'],
      city: c.city ?? '', state: c.state ?? '', phone: c.phone ?? '',
      email: c.email ?? '', cnae: c.cnae ?? '', opening_date: c.opening_date ?? '',
      accountant_id: c.accountant_id ?? null,
      integracao_contabil_modo: (c.integracao_contabil_modo ?? 'conta_unica') as FormData['integracao_contabil_modo'],
    })
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditingCompany(null); reset() }

  const onSubmit = (data: FormData) => {
    const payload = { ...data, accountant_id: data.accountant_id || null, opening_date: data.opening_date || undefined }
    if (modalMode === 'edit') updateMutation.mutate(payload)
    else createMutation.mutate(payload as CompanyCreate)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // ── Filtros e paginação ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = companies
    if (filterRegime) list = list.filter(c => c.regime === filterRegime)
    if (search) {
      const t = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(t) ||
        (c.trade_name ?? '').toLowerCase().includes(t) ||
        (c.cnpj ?? '').includes(t) ||
        String(c.code).padStart(4, '0').includes(t)
      )
    }
    return list
  }, [companies, search, filterRegime])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page, pageSize])

  function setFilter(s: string, r: string) { setSearch(s); setFilterRegime(r); setPage(0) }

  // ── Métricas ─────────────────────────────────────────────────────────────────

  const total   = companies.length
  const ativos  = companies.filter(c => c.is_active).length
  const simples = companies.filter(c => c.regime === 'simples_nacional').length
  const outros  = companies.filter(c => c.regime !== 'simples_nacional').length

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Breadcrumb + ação */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Configurações</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-0.5">Empresas</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm"
        >
          <Plus size={15} /> Nova empresa
        </button>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total de empresas', value: total,   icon: Building2,    color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Ativas',            value: ativos,  icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Simples Nacional',  value: simples, icon: TrendingUp,   color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Outros regimes',    value: outros,  icon: Users,        color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex items-center gap-4">
            <div className={`rounded-lg p-2.5 ${bg}`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white">

        {/* Barra de busca e filtros */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setFilter(e.target.value, filterRegime)}
              placeholder="Código, razão social, fantasia ou CNPJ..."
              className="input pl-8 text-sm"
            />
          </div>
          <select
            value={filterRegime}
            onChange={e => setFilter(search, e.target.value)}
            className="input w-48 text-sm"
          >
            <option value="">Todos os regimes</option>
            {Object.entries(regimeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {(search || filterRegime) && (
            <button onClick={() => setFilter('', '')} className="text-xs text-gray-400 hover:text-gray-600">
              Limpar
            </button>
          )}
        </div>

        {/* Corpo */}
        {isLoading ? (
          <p className="p-6 text-sm text-gray-400">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">
            {companies.length === 0 ? 'Nenhuma empresa cadastrada.' : 'Nenhum resultado para os filtros aplicados.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 w-16">Cód.</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">CNPJ</th>
                <th className="px-5 py-3">Regime</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(c => {
                const isActive = activeCompany?.id === c.id
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-50 transition-colors ${isActive ? 'bg-brand-50/60' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{String(c.code).padStart(4, '0')}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" title="Empresa ativa" />
                        )}
                        <div>
                          <p className={`font-medium ${isActive ? 'text-brand-700' : 'text-gray-800'}`}>{c.name}</p>
                          {(c.city || c.state) && (
                            <p className="text-xs text-gray-400">{[c.city, c.state].filter(Boolean).join('/')}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{c.cnpj || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${regimeColors[c.regime] ?? 'bg-gray-100 text-gray-600'}`}>
                        {regimeLabels[c.regime] ?? c.regime}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{typeLabels[c.company_type] ?? c.company_type}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        {!isActive && (
                          <button
                            onClick={() => setCompany(c)}
                            className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                            title="Definir como empresa ativa"
                          >
                            Selecionar
                          </button>
                        )}
                        <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-brand-600" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Inativar "${c.name}"?`)) deactivateMutation.mutate(c.id) }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Inativar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>Exibir</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
                className="rounded border border-gray-200 px-2 py-1 text-xs"
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span>de {filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i).map(i => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`rounded px-2 py-1 ${page === i ? 'bg-brand-600 text-white' : 'hover:bg-gray-100'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30">›</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de cadastro/edição ─────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                {modalMode === 'edit' && (
                  <p className="text-xs text-gray-400 mb-0.5">Código {String(editingCompany!.code).padStart(4, '0')}</p>
                )}
                <h2 className="text-base font-semibold text-gray-900">
                  {modalMode === 'edit' ? editingCompany!.name : 'Nova Empresa'}
                </h2>
              </div>
              <button onClick={closeForm}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
            </div>

            <div className="flex gap-1 px-6 border-b border-gray-100">
              {(['principal', 'complementar'] as ModalTab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setModalTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${modalTab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {t === 'principal' ? 'Dados Principais' : 'Informações Complementares'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5">

                {/* ── Aba Dados Principais ── */}
                {modalTab === 'principal' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-700">Razão Social *</label>
                        <input {...register('name')} className="input" />
                        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Nome Fantasia</label>
                        <input {...register('trade_name')} className="input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">CNPJ</label>
                        <input {...register('cnpj')} className="input" placeholder="00.000.000/0000-00" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Tipo *</label>
                        <select {...register('company_type')} className="input">
                          {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Regime Tributário *</label>
                        <select {...register('regime')} className="input">
                          {Object.entries(regimeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">CNAE</label>
                        <input {...register('cnae')} className="input" placeholder="ex: 6920601" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Data de Abertura</label>
                        <input {...register('opening_date')} className="input" type="date" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Cidade</label>
                        <input {...register('city')} className="input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">UF</label>
                        <input {...register('state')} className="input" maxLength={2} placeholder="SP" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Telefone</label>
                        <input {...register('phone')} className="input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">E-mail</label>
                        <input {...register('email')} className="input" type="email" />
                        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-700">Contador Responsável</label>
                        <select {...register('accountant_id')} className="input">
                          <option value="">— Nenhum —</option>
                          {accountants.map(a => <option key={a.id} value={a.id}>{a.name}{a.crc ? ` — CRC ${a.crc}` : ''}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-700">Modo de Integração Contábil</label>
                        <select {...register('integracao_contabil_modo')} className="input">
                          <option value="conta_unica">Conta Única (Clientes/Fornecedores Diversos)</option>
                          <option value="conta_individual">Conta Individual por Cliente/Fornecedor</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-400">
                          Conta Única: conta genérica definida na Natureza de Operação. Conta Individual: cada cliente/fornecedor tem sua própria conta.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Aba Informações Complementares ── */}
                {modalTab === 'complementar' && (
                  <div className="space-y-4">
                    {!editingCompany ? (
                      <p className="text-sm text-gray-400">Salve a empresa primeiro para cadastrar sócios.</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">Quadro Societário</p>
                          <button type="button" onClick={openPartnerCreate} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
                            <UserPlus size={13} /> Adicionar Sócio
                          </button>
                        </div>

                        {companyPartners.length === 0 ? (
                          <p className="text-sm text-gray-400">Nenhum sócio cadastrado.</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                                <th className="py-2 pr-4">Nome</th>
                                <th className="py-2 pr-4">CPF</th>
                                <th className="py-2 pr-4">Participação</th>
                                <th className="py-2 pr-4">Responsável</th>
                                <th className="py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {companyPartners.map(p => (
                                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                                  <td className="py-2 pr-4 font-medium text-gray-800">{p.name}</td>
                                  <td className="py-2 pr-4 text-gray-500">{p.cpf || '—'}</td>
                                  <td className="py-2 pr-4 text-gray-500">{p.equity_share != null ? `${p.equity_share}%` : '—'}</td>
                                  <td className="py-2 pr-4">
                                    {p.is_responsible && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Sim</span>}
                                  </td>
                                  <td className="py-2">
                                    <div className="flex items-center gap-2">
                                      <button type="button" onClick={() => openPartnerEdit(p)} className="text-brand-600 hover:text-brand-800"><Pencil size={13} /></button>
                                      <button type="button" onClick={() => { if (confirm(`Remover ${p.name}?`)) deletePartnerMutation.mutate(p.id) }} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {showPartnerForm && (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                            <p className="text-sm font-semibold text-gray-700">{editingPartner ? 'Editar Sócio' : 'Novo Sócio'}</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <label className="mb-1 block text-xs font-medium text-gray-700">Nome *</label>
                                <input {...partnerForm.register('name')} className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">CPF</label>
                                <input {...partnerForm.register('cpf')} className="input" placeholder="000.000.000-00" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Data de Nascimento</label>
                                <input {...partnerForm.register('birth_date')} type="date" className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">RG</label>
                                <input {...partnerForm.register('rg')} className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Órgão Expedidor</label>
                                <input {...partnerForm.register('rg_issuer')} className="input" placeholder="SSP/SP" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Telefone</label>
                                <input {...partnerForm.register('phone')} className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">E-mail</label>
                                <input {...partnerForm.register('email')} type="email" className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Participação (%)</label>
                                <input {...partnerForm.register('equity_share', { valueAsNumber: true })} type="number" step="0.01" min="0" max="100" className="input" />
                              </div>
                              <div className="flex items-center gap-2 pt-5">
                                <input {...partnerForm.register('is_responsible')} type="checkbox" id="is_responsible" className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                                <label htmlFor="is_responsible" className="text-xs text-gray-700">Sócio Responsável</label>
                              </div>
                              <div className="col-span-2 border-t border-gray-200 pt-3">
                                <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Endereço</p>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">CEP</label>
                                <input {...partnerForm.register('zip_code')} className="input" placeholder="00000-000" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Logradouro</label>
                                <input {...partnerForm.register('address')} className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Número</label>
                                <input {...partnerForm.register('address_number')} className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Complemento</label>
                                <input {...partnerForm.register('complement')} className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Bairro</label>
                                <input {...partnerForm.register('neighborhood')} className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Cidade</label>
                                <input {...partnerForm.register('city')} className="input" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">UF</label>
                                <input {...partnerForm.register('state')} className="input" maxLength={2} placeholder="SP" />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button type="button" onClick={() => { setShowPartnerForm(false); setEditingPartner(null); partnerForm.reset({ is_responsible: false }) }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">Cancelar</button>
                              <button type="button" onClick={partnerForm.handleSubmit(onPartnerSubmit)} disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                                {createPartnerMutation.isPending || updatePartnerMutation.isPending ? 'Salvando...' : 'Salvar Sócio'}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
                {(createMutation.isError || updateMutation.isError) && (
                  <p className="text-sm text-red-500">Erro ao salvar empresa.</p>
                )}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={isSubmitting || isSaving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
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
