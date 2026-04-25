import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, RotateCcw, AlertCircle, Trash } from 'lucide-react'
import { lancamentosApi, planoContasApi, historicoPadraoApi, centroCustoApi, type Lancamento, type LancamentoCreate } from '@/api/contabilidade'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'
import { ContaSearch } from '@/components/contabilidade/ContaSearch'

const ORIGEM_LABEL: Record<string, string> = {
  manual: 'MAN', fiscal: 'FIS', folha: 'FOL',
  importado: 'IMP', ofx: 'OFX', zeramento: 'ZER', estorno: 'EST',
}

const ORIGEM_COLOR: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-600',
  fiscal: 'bg-blue-100 text-blue-700',
  folha: 'bg-purple-100 text-purple-700',
  importado: 'bg-yellow-100 text-yellow-700',
  ofx: 'bg-teal-100 text-teal-700',
  zeramento: 'bg-orange-100 text-orange-700',
  estorno: 'bg-red-100 text-red-600',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type FormState = {
  data: string
  conta_debito_id: string
  conta_credito_id: string
  historico_padrao_id: string
  historico_complemento: string
  valor: string
  centro_custo_id: string
}

const emptyForm = (): FormState => ({
  data: today(), conta_debito_id: '', conta_credito_id: '',
  historico_padrao_id: '', historico_complemento: '', valor: '', centro_custo_id: '',
})

export function LancamentosContabeisPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showLixeira, setShowLixeira] = useState(false)
  const [editing, setEditing] = useState<Lancamento | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [filterData, setFilterData] = useState(today().slice(0, 7))
  const [error, setError] = useState('')
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const dataIni = filterData ? `${filterData}-01` : undefined
  const dataFim = filterData
    ? new Date(Number(filterData.slice(0, 4)), Number(filterData.slice(5, 7)), 0)
        .toISOString().slice(0, 10)
    : undefined

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['lancamentos-contabeis', company?.id, filterData],
    queryFn: () => lancamentosApi.list(company!.id, dataIni, dataFim).then(r => r.data),
    enabled: !!company,
  })

  const { data: lixeira = [] } = useQuery({
    queryKey: ['lancamentos-lixeira', company?.id],
    queryFn: () => lancamentosApi.list(company!.id, undefined, undefined, true).then(r => r.data.filter(l => l.excluido)),
    enabled: !!company && showLixeira,
  })

  const { data: totalizador } = useQuery({
    queryKey: ['totalizador-dia', company?.id, form.data],
    queryFn: () => lancamentosApi.totalizador(company!.id, form.data).then(r => r.data),
    enabled: !!company && !!form.data && showForm,
  })

  const { data: contas = [] } = useQuery({
    queryKey: ['plano-contas', company?.id],
    queryFn: () => planoContasApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const { data: historicos = [] } = useQuery({
    queryKey: ['historicos-padrao', company?.id],
    queryFn: () => historicoPadraoApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const { data: centros = [] } = useQuery({
    queryKey: ['centros-custo', company?.id],
    queryFn: () => centroCustoApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const contasAnaliticas = contas.filter(c => c.tipo === 'analitica')

  const createMut = useMutation({
    mutationFn: (data: LancamentoCreate) => lancamentosApi.create(company!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos-contabeis'] }); closeForm() },
    onError: (e: any) => setError(e?.response?.data?.detail || 'Erro ao salvar'),
  })

  const updateMut = useMutation({
    mutationFn: (data: Partial<LancamentoCreate>) => lancamentosApi.update(editing!.id, company!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos-contabeis'] }); closeForm() },
    onError: (e: any) => setError(e?.response?.data?.detail || 'Erro ao salvar'),
  })

  const excluirMut = useMutation({
    mutationFn: (id: number) => lancamentosApi.excluir(id, company!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos-contabeis'] }),
  })

  const hardDeleteMut = useMutation({
    mutationFn: (id: number) => lancamentosApi.hardDelete(id, company!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-lixeira'] })
      setHardDeleteId(null)
      setConfirmText('')
    },
  })

  const estornarMut = useMutation({
    mutationFn: (id: number) => lancamentosApi.estornar(id, company!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos-contabeis'] }),
  })

  function openCreate() { setEditing(null); setForm(emptyForm()); setError(''); setShowForm(true) }
  function openEdit(l: Lancamento) {
    if (l.origem !== 'manual') return
    setEditing(l)
    setForm({
      data: l.data,
      conta_debito_id: l.conta_debito_id ? String(l.conta_debito_id) : '',
      conta_credito_id: l.conta_credito_id ? String(l.conta_credito_id) : '',
      historico_padrao_id: l.historico_padrao_id ? String(l.historico_padrao_id) : '',
      historico_complemento: l.historico_complemento ?? '',
      valor: String(l.valor),
      centro_custo_id: l.centro_custo_id ? String(l.centro_custo_id) : '',
    })
    setError('')
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null) }

  function buildPayload(): LancamentoCreate {
    return {
      data: form.data,
      conta_debito_id: form.conta_debito_id ? Number(form.conta_debito_id) : undefined,
      conta_credito_id: form.conta_credito_id ? Number(form.conta_credito_id) : undefined,
      historico_padrao_id: form.historico_padrao_id ? Number(form.historico_padrao_id) : undefined,
      historico_complemento: form.historico_complemento || undefined,
      valor: Number(form.valor),
      centro_custo_id: form.centro_custo_id ? Number(form.centro_custo_id) : undefined,
    }
  }

  const totalDeb = lancamentos.reduce((s, l) => l.conta_debito_id ? s + Number(l.valor) : s, 0)
  const totalCred = lancamentos.reduce((s, l) => l.conta_credito_id ? s + Number(l.valor) : s, 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Lançamentos Contábeis</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLixeira(true)}
            disabled={!company}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          >
            <Trash size={14} /> Lixeira
          </button>
          <button
            onClick={() => company && openCreate()}
            disabled={!company}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <>
          <div className="mb-4 flex items-center gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Competência</label>
              <input
                type="month"
                value={filterData}
                onChange={e => setFilterData(e.target.value)}
                className="input w-44"
              />
            </div>
            <div className="flex gap-6 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
              <span>Débito: <span className="font-medium text-gray-700">R$ {fmt(totalDeb)}</span></span>
              <span>Crédito: <span className="font-medium text-gray-700">R$ {fmt(totalCred)}</span></span>
              {Math.abs(totalDeb - totalCred) > 0.01 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle size={14} /> Diferença: R$ {fmt(Math.abs(totalDeb - totalCred))}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            {isLoading ? (
              <p className="p-6 text-sm text-gray-400">Carregando...</p>
            ) : lancamentos.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Nenhum lançamento no período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                    <th className="px-4 py-3">Nº</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Débito</th>
                    <th className="px-4 py-3">Crédito</th>
                    <th className="px-4 py-3">Histórico</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-center">Orig.</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-400">{String(l.codigo).padStart(6, '0')}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{l.data}</td>
                      <td className="px-4 py-2 text-xs text-gray-700">
                        {l.conta_debito
                          ? <span><span className="font-mono text-gray-400">{l.conta_debito.codigo_reduzido ?? l.conta_debito.classificacao}</span> {l.conta_debito.descricao}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700">
                        {l.conta_credito
                          ? <span><span className="font-mono text-gray-400">{l.conta_credito.codigo_reduzido ?? l.conta_credito.classificacao}</span> {l.conta_credito.descricao}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{l.historico_complemento || '—'}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">R$ {fmt(Number(l.valor))}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${ORIGEM_COLOR[l.origem] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ORIGEM_LABEL[l.origem] ?? l.origem}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {l.origem === 'manual' && (
                            <button onClick={() => openEdit(l)} className="text-brand-600 hover:text-brand-800"><Pencil size={13} /></button>
                          )}
                          <button onClick={() => estornarMut.mutate(l.id)} title="Estornar" className="text-orange-400 hover:text-orange-600"><RotateCcw size={13} /></button>
                          <button onClick={() => excluirMut.mutate(l.id)} title="Excluir (lixeira)" className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              {editing ? 'Editar Lançamento' : 'Novo Lançamento Contábil'}
            </h2>

            {totalizador && (
              <div className="mb-3 flex gap-4 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span>Débito do dia: <span className="font-medium">R$ {fmt(Number(totalizador.total_debito))}</span></span>
                <span>Crédito do dia: <span className="font-medium">R$ {fmt(Number(totalizador.total_credito))}</span></span>
                {Math.abs(Number(totalizador.diferenca)) > 0.01 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle size={12} /> Dif: R$ {fmt(Math.abs(Number(totalizador.diferenca)))}
                  </span>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Data *</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Valor *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="input" placeholder="0,00" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Conta Débito</label>
                <ContaSearch
                  contas={contasAnaliticas}
                  value={form.conta_debito_id}
                  onChange={id => setForm(f => ({ ...f, conta_debito_id: id }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Conta Crédito</label>
                <ContaSearch
                  contas={contasAnaliticas}
                  value={form.conta_credito_id}
                  onChange={id => setForm(f => ({ ...f, conta_credito_id: id }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Histórico Padrão</label>
                <select value={form.historico_padrao_id} onChange={e => setForm(f => ({ ...f, historico_padrao_id: e.target.value }))} className="input">
                  <option value="">— Nenhum —</option>
                  {historicos.map(h => (
                    <option key={h.id} value={h.id}>{String(h.codigo).padStart(3, '0')} — {h.descricao}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Complemento do Histórico</label>
                <input value={form.historico_complemento} onChange={e => setForm(f => ({ ...f, historico_complemento: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Centro de Custo</label>
                <select value={form.centro_custo_id} onChange={e => setForm(f => ({ ...f, centro_custo_id: e.target.value }))} className="input">
                  <option value="">— Nenhum —</option>
                  {centros.map(c => (
                    <option key={c.id} value={c.id}>{String(c.codigo).padStart(3, '0')} — {c.descricao}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            {(!form.conta_debito_id || !form.conta_credito_id) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle size={12} /> Lançamento incompleto — débito ou crédito não informado
              </p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={() => editing ? updateMut.mutate(buildPayload()) : createMut.mutate(buildPayload())}
                disabled={!form.valor || createMut.isPending || updateMut.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {createMut.isPending || updateMut.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lixeira */}
      {showLixeira && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Lixeira — Lançamentos Excluídos</h2>
              <button onClick={() => setShowLixeira(false)} className="text-sm text-gray-400 hover:text-gray-600">Fechar</button>
            </div>
            {lixeira.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Nenhum lançamento na lixeira.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                    <th className="px-3 py-2">Nº</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Histórico</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lixeira.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">{String(l.codigo).padStart(6, '0')}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{l.data}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">{l.historico_complemento || '—'}</td>
                      <td className="px-3 py-2 text-right text-xs font-medium text-gray-700">R$ {fmt(Number(l.valor))}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => { setHardDeleteId(l.id); setConfirmText('') }}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={12} /> Excluir definitivamente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmação hard delete */}
      {hardDeleteId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-semibold text-red-600">Exclusão Definitiva</h2>
            <p className="mb-4 text-sm text-gray-600">
              Esta ação é <strong>irreversível</strong>. O número do lançamento ficará como gap permanente na sequência.
              <br /><br />
              Digite <span className="font-mono font-bold">EXCLUIR</span> para confirmar:
            </p>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="input mb-4 w-full"
              placeholder="EXCLUIR"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setHardDeleteId(null); setConfirmText('') }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => hardDeleteMut.mutate(hardDeleteId)}
                disabled={confirmText !== 'EXCLUIR' || hardDeleteMut.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {hardDeleteMut.isPending ? 'Excluindo...' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
