import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { saldoInicialApi, planoContasApi, type SaldoInicial, type SaldoInicialCreate } from '@/api/contabilidade'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'
import { ContaSearch } from '@/components/contabilidade/ContaSearch'

function fmt(val: number) {
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type FormState = {
  conta_id: string
  natureza: string
  valor: string
  observacao: string
}

const emptyForm = (): FormState => ({ conta_id: '', natureza: 'D', valor: '', observacao: '' })

export function SaldoInicialPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [dataFiltro, setDataFiltro] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SaldoInicial | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState('')

  const { data: saldos = [], isLoading } = useQuery({
    queryKey: ['saldos-iniciais', company?.id, dataFiltro],
    queryFn: () => saldoInicialApi.list(company!.id, dataFiltro || undefined).then(r => r.data),
    enabled: !!company,
  })

  const { data: totalizador } = useQuery({
    queryKey: ['saldos-iniciais-total', company?.id, dataFiltro],
    queryFn: () => saldoInicialApi.totalizador(company!.id, dataFiltro || undefined).then(r => r.data),
    enabled: !!company,
  })

  const { data: contas = [] } = useQuery({
    queryKey: ['plano-contas', company?.id],
    queryFn: () => planoContasApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const contasAnaliticas = contas.filter(c => c.tipo === 'analitica')

  const createMut = useMutation({
    mutationFn: (data: SaldoInicialCreate) => saldoInicialApi.create(company!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saldos-iniciais'] })
      qc.invalidateQueries({ queryKey: ['saldos-iniciais-total'] })
      closeForm()
    },
    onError: (e: any) => setError(e?.response?.data?.detail || 'Erro ao salvar'),
  })

  const updateMut = useMutation({
    mutationFn: (data: Partial<SaldoInicialCreate>) => saldoInicialApi.update(editing!.id, company!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saldos-iniciais'] })
      qc.invalidateQueries({ queryKey: ['saldos-iniciais-total'] })
      closeForm()
    },
    onError: (e: any) => setError(e?.response?.data?.detail || 'Erro ao salvar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => saldoInicialApi.delete(id, company!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saldos-iniciais'] })
      qc.invalidateQueries({ queryKey: ['saldos-iniciais-total'] })
    },
  })

  function openNew() { setEditing(null); setForm(emptyForm()); setError(''); setShowForm(true) }

  function openEdit(s: SaldoInicial) {
    setEditing(s)
    setForm({
      conta_id: String(s.conta_id),
      natureza: s.natureza,
      valor: String(s.valor),
      observacao: s.observacao ?? '',
    })
    setError('')
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditing(null) }

  function handleSave() {
    if (!form.conta_id || !form.valor) { setError('Conta e valor são obrigatórios.'); return }
    const payload: SaldoInicialCreate = {
      data: dataFiltro || new Date().toISOString().slice(0, 10),
      conta_id: Number(form.conta_id),
      natureza: form.natureza,
      valor: Number(form.valor),
      observacao: form.observacao || undefined,
    }
    if (editing) updateMut.mutate(payload)
    else createMut.mutate(payload)
  }

  const contaNome = (id: number) => {
    const c = contas.find(c => c.id === id)
    return c ? `${c.codigo_reduzido ?? c.classificacao} — ${c.descricao}` : String(id)
  }

  const isPending = createMut.isPending || updateMut.isPending
  const diferenca = totalizador ? Number(totalizador.diferenca) : 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Saldos Iniciais</h1>
        <button
          onClick={() => company && openNew()}
          disabled={!company}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          <Plus size={16} /> Novo Saldo
        </button>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <>
          {/* Filtro de data e totalizador */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Data de referência</label>
              <input
                type="date"
                value={dataFiltro}
                onChange={e => setDataFiltro(e.target.value)}
                className="input w-44"
              />
            </div>
            {totalizador && (
              <div className="flex gap-6 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
                <span>Débito: <span className="font-medium text-gray-700">R$ {fmt(Number(totalizador.total_debito))}</span></span>
                <span>Crédito: <span className="font-medium text-gray-700">R$ {fmt(Number(totalizador.total_credito))}</span></span>
                {Math.abs(diferenca) > 0.01 ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle size={14} /> Diferença: R$ {fmt(Math.abs(diferenca))}
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">✓ Balanceado</span>
                )}
              </div>
            )}
          </div>

          <p className="mb-3 text-xs text-gray-400">
            Débitos e créditos devem estar iguais ao finalizar. Informe o saldo de abertura do balanço para cada conta analítica.
          </p>

          <div className="rounded-xl border border-gray-200 bg-white">
            {isLoading ? (
              <p className="p-6 text-sm text-gray-400">Carregando...</p>
            ) : saldos.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Nenhum saldo lançado{dataFiltro ? ' para esta data' : ''}.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                    <th className="px-5 py-3">Conta</th>
                    <th className="px-5 py-3 text-center">Nat.</th>
                    <th className="px-5 py-3 text-right">Valor</th>
                    <th className="px-5 py-3">Observação</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {saldos.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-800">{contaNome(s.conta_id)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.natureza === 'D' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {s.natureza === 'D' ? 'Débito' : 'Crédito'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">R$ {fmt(Number(s.valor))}</td>
                      <td className="px-5 py-3 text-xs text-gray-400">{s.observacao || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEdit(s)}
                            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
                          >
                            <Pencil size={12} /> Editar
                          </button>
                          <button
                            onClick={() => deleteMut.mutate(s.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editing ? 'Editar Saldo Inicial' : 'Novo Saldo Inicial'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Data de referência</label>
                <input
                  type="date"
                  value={dataFiltro || new Date().toISOString().slice(0, 10)}
                  onChange={e => setDataFiltro(e.target.value)}
                  className="input w-full"
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Conta Contábil * <span className="text-gray-400">(somente analíticas)</span></label>
                <ContaSearch
                  contas={contasAnaliticas}
                  value={form.conta_id}
                  onChange={id => setForm(f => ({ ...f, conta_id: id }))}
                  disabled={!!editing}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Natureza *</label>
                  <select
                    value={form.natureza}
                    onChange={e => setForm(f => ({ ...f, natureza: e.target.value }))}
                    className="input"
                  >
                    <option value="D">D — Débito</option>
                    <option value="C">C — Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    className="input"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Observação</label>
                <input
                  value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  className="input"
                  placeholder="Opcional"
                />
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
