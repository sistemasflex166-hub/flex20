import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ChevronRight, ChevronDown, Settings, Eye, EyeOff } from 'lucide-react'
import { planoContasApi, type PlanoContas } from '@/api/contabilidade'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const NATUREZA_OPTIONS = [
  { value: 'D', label: 'D — Devedora' },
  { value: 'C', label: 'C — Credora' },
]

const GRUPO_DRE_OPTIONS = [
  { value: '', label: 'Nenhum' },
  { value: 'receita_bruta', label: 'Receita Bruta' },
  { value: 'deducoes', label: 'Deduções' },
  { value: 'custos', label: 'Custos' },
  { value: 'despesas', label: 'Despesas' },
  { value: 'resultado_financeiro', label: 'Resultado Financeiro' },
  { value: 'outras_receitas', label: 'Outras Receitas' },
  { value: 'outras_despesas', label: 'Outras Despesas' },
]

function sortByClassificacao(a: PlanoContas, b: PlanoContas) {
  const partsA = a.classificacao.split(/[.\-]/).map(Number)
  const partsB = b.classificacao.split(/[.\-]/).map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function buildTree(contas: PlanoContas[]) {
  const map = new Map<number | null, PlanoContas[]>()
  for (const c of contas) {
    const key = c.parent_id ?? null
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  // garante ordem numérica correta em cada grupo de filhos
  for (const [key, children] of map) {
    map.set(key, children.sort(sortByClassificacao))
  }
  return map
}

function TreeRow({
  conta, tree, depth, onEdit, onDeactivate, onHardDelete,
}: {
  conta: PlanoContas
  tree: Map<number | null, PlanoContas[]>
  depth: number
  onEdit: (c: PlanoContas) => void
  onDeactivate: (id: number) => void
  onHardDelete: (id: number) => void
}) {
  const [open, setOpen] = useState(depth === 0)
  const children = tree.get(conta.id) ?? []
  const hasChildren = children.length > 0
  const isInativa = !conta.ativo

  return (
    <>
      <tr className={`border-b border-gray-50 hover:bg-gray-50 ${isInativa ? 'opacity-50' : ''}`}>
        <td className="px-4 py-2">
          <div className="flex items-center" style={{ paddingLeft: depth * 20 }}>
            {hasChildren ? (
              <button onClick={() => setOpen(!open)} className="mr-1 text-gray-400">
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="mr-1 inline-block w-3" />
            )}
            <span className={`font-mono text-xs ${conta.tipo === 'sintetica' ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>{conta.classificacao}</span>
          </div>
        </td>
        <td className={`px-4 py-2 text-sm ${conta.tipo === 'sintetica' ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>{conta.descricao}</td>
        <td className="px-4 py-2 text-center text-xs text-gray-500">{conta.nivel}</td>
        <td className="px-4 py-2 text-center text-xs">
          <span className={`rounded-full px-2 py-0.5 ${conta.tipo === 'analitica' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {conta.tipo === 'analitica' ? 'Analítica' : 'Sintética'}
          </span>
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-500">{conta.natureza}</td>
        <td className="px-4 py-2 font-mono text-xs text-gray-400">{conta.codigo_reduzido || '—'}</td>
        <td className="px-4 py-2 text-xs text-gray-400">{conta.grupo_dre || '—'}</td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-3">
            {!isInativa && (
              <>
                <button onClick={() => onEdit(conta)} className="text-brand-600 hover:text-brand-800"><Pencil size={13} /></button>
                <button onClick={() => onDeactivate(conta.id)} className="text-xs text-red-400 hover:text-red-600">Inativar</button>
              </>
            )}
            {isInativa && (
              <>
                <span className="text-xs text-gray-300">Inativa</span>
                <button
                  onClick={() => { if (window.confirm(`Excluir definitivamente a conta "${conta.classificacao} — ${conta.descricao}"? Esta ação é irreversível.`)) onHardDelete(conta.id) }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Excluir
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {open && children.map(c => (
        <TreeRow key={c.id} conta={c} tree={tree} depth={depth + 1} onEdit={onEdit} onDeactivate={onDeactivate} onHardDelete={onHardDelete} />
      ))}
    </>
  )
}

type FormState = {
  classificacao: string
  descricao: string
  natureza: string
  codigo_reduzido: string
  titulo_dre: string
  grupo_dre: string
  codigo_ecf: string
}

const emptyForm: FormState = {
  classificacao: '', descricao: '', natureza: 'D',
  codigo_reduzido: '', titulo_dre: '', grupo_dre: '', codigo_ecf: '',
}

export function PlanoContasPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showMascara, setShowMascara] = useState(false)
  const [editing, setEditing] = useState<PlanoContas | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [mascaraInput, setMascaraInput] = useState('')
  const [error, setError] = useState('')
  const [mostrarInativas, setMostrarInativas] = useState(false)

  const { data: mascara } = useQuery({
    queryKey: ['mascara-plano-contas', company?.id],
    queryFn: () => planoContasApi.getMascara(company!.id).then(r => r.data),
    enabled: !!company,
  })

  // busca sempre todas (ativas + inativas) para mostrar hierarquia completa quando filtro ligado
  const { data: todasContas = [], isLoading } = useQuery({
    queryKey: ['plano-contas-todas', company?.id],
    queryFn: async () => {
      const [ativas, inativas] = await Promise.all([
        planoContasApi.list(company!.id).then(r => r.data),
        planoContasApi.listInativas(company!.id).then(r => r.data),
      ])
      const map = new Map(ativas.map(c => [c.id, c]))
      inativas.forEach(c => { if (!map.has(c.id)) map.set(c.id, c) })
      return Array.from(map.values()).sort(sortByClassificacao)
    },
    enabled: !!company,
  })

  const contas = mostrarInativas ? todasContas : todasContas.filter(c => c.ativo)
  const tree = useMemo(() => buildTree(contas), [contas])
  const roots = tree.get(null) ?? []

  // nível calculado em tempo real pela classificação digitada
  const nivelAtual = useMemo(() => {
    if (!form.classificacao) return null
    const sep = mascara?.separador ?? '.'
    return form.classificacao.split(sep).length
  }, [form.classificacao, mascara])

  // tipo inferido: último nível = analítica
  const tipoInferido = useMemo(() => {
    if (!nivelAtual || !mascara) return null
    return nivelAtual === mascara.quantidade_niveis ? 'analitica' : 'sintetica'
  }, [nivelAtual, mascara])

  const saveMascaraMut = useMutation({
    mutationFn: () => planoContasApi.saveMascara(company!.id, mascaraInput),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mascara-plano-contas', company?.id] }); setShowMascara(false) },
  })

  const createMut = useMutation({
    mutationFn: () => planoContasApi.create(company!.id, {
      classificacao: form.classificacao,
      descricao: form.descricao,
      natureza: form.natureza,
      tipo: tipoInferido ?? 'sintetica',
      codigo_reduzido: form.codigo_reduzido || undefined,
      titulo_dre: form.titulo_dre || undefined,
      grupo_dre: form.grupo_dre || undefined,
      codigo_ecf: form.codigo_ecf || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plano-contas-todas', company?.id] }); closeForm() },
    onError: (e: any) => setError(e?.response?.data?.detail || 'Erro ao salvar'),
  })

  const updateMut = useMutation({
    mutationFn: () => planoContasApi.update(editing!.id, company!.id, {
      descricao: form.descricao,
      natureza: form.natureza,
      tipo: tipoInferido ?? editing!.tipo,
      codigo_reduzido: form.codigo_reduzido || undefined,
      titulo_dre: form.titulo_dre || undefined,
      grupo_dre: form.grupo_dre || undefined,
      codigo_ecf: form.codigo_ecf || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plano-contas-todas', company?.id] }); closeForm() },
    onError: (e: any) => setError(e?.response?.data?.detail || 'Erro ao salvar'),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: number) => planoContasApi.deactivate(id, company!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plano-contas-todas', company?.id] }),
  })

  const hardDeleteMut = useMutation({
    mutationFn: (id: number) => planoContasApi.hardDelete(id, company!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plano-contas-todas', company?.id] }),
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      alert(e?.response?.data?.detail || 'Erro ao excluir conta.'),
  })

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true) }
  function openEdit(c: PlanoContas) {
    setEditing(c)
    setForm({
      classificacao: c.classificacao,
      descricao: c.descricao,
      natureza: c.natureza,
      codigo_reduzido: c.codigo_reduzido ?? '',
      titulo_dre: c.titulo_dre ?? '',
      grupo_dre: c.grupo_dre ?? '',
      codigo_ecf: c.codigo_ecf ?? '',
    })
    setError('')
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null) }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Plano de Contas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarInativas(v => !v)}
            disabled={!company}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            title={mostrarInativas ? 'Ocultar inativas' : 'Mostrar inativas'}
          >
            {mostrarInativas ? <EyeOff size={14} /> : <Eye size={14} />}
            {mostrarInativas ? 'Ocultar inativas' : 'Ver inativas'}
          </button>
          <button
            onClick={() => { setMascaraInput(mascara?.mascara ?? ''); setShowMascara(true) }}
            disabled={!company}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <Settings size={14} /> Máscara
          </button>
          <button
            onClick={() => company && openCreate()}
            disabled={!company}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            <Plus size={16} /> Nova Conta
          </button>
        </div>
      </div>

      {mascara && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
          Máscara: <span className="font-mono font-medium text-gray-700">{mascara.mascara}</span>
          <span>• {mascara.quantidade_niveis} níveis</span>
        </div>
      )}

      {!company ? <NoCompanyBanner /> : (
        <div className="rounded-xl border border-gray-200 bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Carregando...</p>
          ) : contas.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Nenhuma conta cadastrada. Defina a máscara e comece a cadastrar.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="px-4 py-3">Classificação</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-center">Nível</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-center">Nat.</th>
                  <th className="px-4 py-3">Cód. Reduzido</th>
                  <th className="px-4 py-3">Grupo DRE</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {roots.map(c => (
                  <TreeRow key={c.id} conta={c} tree={tree} depth={0}
                    onEdit={openEdit}
                    onDeactivate={(id) => deactivateMut.mutate(id)}
                    onHardDelete={(id) => hardDeleteMut.mutate(id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal máscara */}
      {showMascara && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Configurar Máscara</h2>
            <p className="mb-3 text-xs text-gray-500">Ex: <span className="font-mono">X.XX.XX.XX.XXXX</span></p>
            <input
              value={mascaraInput}
              onChange={e => setMascaraInput(e.target.value)}
              placeholder="X.XX.XX.XXXX"
              className="input mb-4 w-full"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowMascara(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={() => saveMascaraMut.mutate()}
                disabled={!mascaraInput || saveMascaraMut.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal conta */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editing ? 'Editar Conta' : 'Nova Conta Contábil'}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Classificação *</label>
                  <input
                    value={form.classificacao}
                    onChange={e => setForm(f => ({ ...f, classificacao: e.target.value }))}
                    disabled={!!editing}
                    className="input disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder={mascara?.mascara ?? '1.01.01'}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nível</label>
                  <input
                    value={nivelAtual ?? (editing?.nivel ?? '')}
                    disabled
                    className="input bg-gray-50 text-gray-400"
                  />
                </div>
              </div>

              {/* Tipo inferido — informativo */}
              {(nivelAtual || editing) && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  Tipo automático:{' '}
                  <span className={`font-medium ${(tipoInferido ?? editing?.tipo) === 'analitica' ? 'text-blue-600' : 'text-gray-700'}`}>
                    {(tipoInferido ?? editing?.tipo) === 'analitica' ? 'Analítica (último nível — recebe lançamentos)' : 'Sintética (agrupa contas)'}
                  </span>
                  {editing && tipoInferido && tipoInferido !== editing.tipo && (
                    <span className="ml-2 text-amber-600">← será alterado ao salvar</span>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Natureza *</label>
                <select value={form.natureza} onChange={e => setForm(f => ({ ...f, natureza: e.target.value }))} className="input">
                  {NATUREZA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Código Reduzido {(tipoInferido ?? editing?.tipo) === 'analitica' && <span className="text-red-400">*</span>}
                  </label>
                  <input value={form.codigo_reduzido} onChange={e => setForm(f => ({ ...f, codigo_reduzido: e.target.value }))} className="input" placeholder="ex: 1101" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Código ECF</label>
                  <input value={form.codigo_ecf} onChange={e => setForm(f => ({ ...f, codigo_ecf: e.target.value }))} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Grupo DRE</label>
                  <select value={form.grupo_dre} onChange={e => setForm(f => ({ ...f, grupo_dre: e.target.value }))} className="input">
                    {GRUPO_DRE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Título DRE</label>
                  <input value={form.titulo_dre} onChange={e => setForm(f => ({ ...f, titulo_dre: e.target.value }))} className="input" />
                </div>
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
                disabled={!form.classificacao || !form.descricao || createMut.isPending || updateMut.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {createMut.isPending || updateMut.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
