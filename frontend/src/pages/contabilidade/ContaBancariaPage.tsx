import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Settings } from 'lucide-react'
import {
  contaBancariaApi, historicoBancarioApi, planoContasApi, historicoPadraoApi,
  type ContaBancaria, type ContaBancariaCreate,
  type HistoricoBancario, type HistoricoBancarioCreate,
} from '@/api/contabilidade'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'
import { ContaSearch } from '@/components/contabilidade/ContaSearch'

const TIPO_CONTA = [
  { value: 'corrente', label: 'Corrente' },
  { value: 'poupanca', label: 'Poupança' },
]

type ContaForm = ContaBancariaCreate & { digito: string }

const emptyContaForm = (): ContaForm => ({
  banco: '', agencia: '', conta: '', digito: '', tipo_conta: 'corrente',
  descricao: '', saldo_inicial: 0, data_saldo_inicial: new Date().toISOString().slice(0, 10),
  conta_contabil_id: undefined,
})

type HistoricoForm = {
  texto_historico: string
  conta_debito_id: string
  conta_credito_id: string
  historico_padrao_id: string
}

const emptyHistoricoForm = (): HistoricoForm => ({
  texto_historico: '', conta_debito_id: '', conta_credito_id: '', historico_padrao_id: '',
})

export function ContaBancariaPage() {
  const { company } = useCompany()
  const qc = useQueryClient()

  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null)
  const [contaForm, setContaForm] = useState<ContaForm>(emptyContaForm())
  const [showContaForm, setShowContaForm] = useState(false)
  const [contaContabilId, setContaContabilId] = useState('')

  const [selectedConta, setSelectedConta] = useState<ContaBancaria | null>(null)
  const [editingHistorico, setEditingHistorico] = useState<HistoricoBancario | null>(null)
  const [historicoForm, setHistoricoForm] = useState<HistoricoForm>(emptyHistoricoForm())
  const [showHistoricoForm, setShowHistoricoForm] = useState(false)

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ['contas-bancarias', company?.id],
    queryFn: () => contaBancariaApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const { data: historicos = [] } = useQuery({
    queryKey: ['historicos-bancarios', company?.id, selectedConta?.id],
    queryFn: () => historicoBancarioApi.list(company!.id, selectedConta!.id).then(r => r.data),
    enabled: !!company && !!selectedConta,
  })

  const { data: planoContas = [] } = useQuery({
    queryKey: ['plano-contas', company?.id],
    queryFn: () => planoContasApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const { data: historicosPadrao = [] } = useQuery({
    queryKey: ['historicos-padrao', company?.id],
    queryFn: () => historicoPadraoApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const contasAnaliticas = planoContas.filter(c => c.tipo === 'analitica')

  // — Conta bancária mutations —
  const createContaMut = useMutation({
    mutationFn: (data: ContaBancariaCreate) => contaBancariaApi.create(company!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-bancarias'] }); closeContaForm() },
  })

  const updateContaMut = useMutation({
    mutationFn: (data: Partial<ContaBancariaCreate>) => contaBancariaApi.update(editingConta!.id, company!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-bancarias'] }); closeContaForm() },
  })

  const deactivateContaMut = useMutation({
    mutationFn: (id: number) => contaBancariaApi.deactivate(id, company!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas-bancarias'] }),
  })

  // — Histórico bancário mutations —
  const createHistoricoMut = useMutation({
    mutationFn: (data: HistoricoBancarioCreate) => historicoBancarioApi.create(company!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['historicos-bancarios'] }); closeHistoricoForm() },
  })

  const updateHistoricoMut = useMutation({
    mutationFn: (data: Partial<HistoricoBancarioCreate>) => historicoBancarioApi.update(editingHistorico!.id, company!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['historicos-bancarios'] }); closeHistoricoForm() },
  })

  const deactivateHistoricoMut = useMutation({
    mutationFn: (id: number) => historicoBancarioApi.deactivate(id, company!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['historicos-bancarios'] }),
  })

  // — Conta bancária handlers —
  function openNewConta() {
    setEditingConta(null)
    setContaForm(emptyContaForm())
    setContaContabilId('')
    setShowContaForm(true)
  }

  function openEditConta(c: ContaBancaria) {
    setEditingConta(c)
    setContaForm({
      banco: c.banco, agencia: c.agencia, conta: c.conta, digito: c.digito ?? '',
      tipo_conta: c.tipo_conta, descricao: c.descricao,
      saldo_inicial: c.saldo_inicial, data_saldo_inicial: c.data_saldo_inicial,
      conta_contabil_id: c.conta_contabil_id ?? undefined,
    })
    setContaContabilId(c.conta_contabil_id ? String(c.conta_contabil_id) : '')
    setShowContaForm(true)
  }

  function closeContaForm() { setShowContaForm(false); setEditingConta(null) }

  function handleSaveConta() {
    const payload: ContaBancariaCreate = {
      ...contaForm,
      digito: contaForm.digito || undefined,
      conta_contabil_id: contaContabilId ? Number(contaContabilId) : undefined,
    }
    if (editingConta) updateContaMut.mutate(payload)
    else createContaMut.mutate(payload)
  }

  // — Histórico bancário handlers —
  function openNewHistorico() {
    setEditingHistorico(null)
    setHistoricoForm(emptyHistoricoForm())
    setShowHistoricoForm(true)
  }

  function openEditHistorico(h: HistoricoBancario) {
    setEditingHistorico(h)
    setHistoricoForm({
      texto_historico: h.texto_historico,
      conta_debito_id: h.conta_debito_id ? String(h.conta_debito_id) : '',
      conta_credito_id: h.conta_credito_id ? String(h.conta_credito_id) : '',
      historico_padrao_id: h.historico_padrao_id ? String(h.historico_padrao_id) : '',
    })
    setShowHistoricoForm(true)
  }

  function closeHistoricoForm() { setShowHistoricoForm(false); setEditingHistorico(null) }

  function handleSaveHistorico() {
    const payload: HistoricoBancarioCreate = {
      conta_bancaria_id: selectedConta!.id,
      texto_historico: historicoForm.texto_historico,
      conta_debito_id: historicoForm.conta_debito_id ? Number(historicoForm.conta_debito_id) : undefined,
      conta_credito_id: historicoForm.conta_credito_id ? Number(historicoForm.conta_credito_id) : undefined,
      historico_padrao_id: historicoForm.historico_padrao_id ? Number(historicoForm.historico_padrao_id) : undefined,
    }
    if (editingHistorico) updateHistoricoMut.mutate(payload)
    else createHistoricoMut.mutate(payload)
  }

  const isContaPending = createContaMut.isPending || updateContaMut.isPending
  const isHistoricoPending = createHistoricoMut.isPending || updateHistoricoMut.isPending

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Contas Bancárias</h1>
        <button
          onClick={() => company && openNewConta()}
          disabled={!company}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          <Plus size={16} /> Nova Conta
        </button>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Lista de contas */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3 text-xs font-medium uppercase text-gray-400">Contas Cadastradas</div>
            {isLoading ? (
              <p className="p-6 text-sm text-gray-400">Carregando...</p>
            ) : contas.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Nenhuma conta bancária cadastrada.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {contas.map(c => (
                  <li
                    key={c.id}
                    onClick={() => setSelectedConta(c)}
                    className={`flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-gray-50 ${selectedConta?.id === c.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.descricao}</p>
                      <p className="text-xs text-gray-400">{c.banco} — Ag. {c.agencia} / C. {c.conta}{c.digito ? `-${c.digito}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); openEditConta(c) }}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deactivateContaMut.mutate(c.id) }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Inativar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Históricos bancários da conta selecionada */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase text-gray-400">
                <Settings size={13} />
                {selectedConta ? `Históricos — ${selectedConta.descricao}` : 'Históricos Bancários (OFX)'}
              </div>
              {selectedConta && (
                <button
                  onClick={openNewHistorico}
                  className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                >
                  <Plus size={12} /> Novo
                </button>
              )}
            </div>

            {!selectedConta ? (
              <p className="p-6 text-sm text-gray-400">Selecione uma conta para ver os históricos.</p>
            ) : historicos.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Nenhum histórico configurado para esta conta.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                    <th className="px-4 py-3">Texto OFX</th>
                    <th className="px-4 py-3">Débito</th>
                    <th className="px-4 py-3">Crédito</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {historicos.map(h => {
                    const debConta = planoContas.find(c => c.id === h.conta_debito_id)
                    const credConta = planoContas.find(c => c.id === h.conta_credito_id)
                    return (
                      <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-700">{h.texto_historico}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-400">
                          {debConta ? (debConta.codigo_reduzido ?? debConta.classificacao) : '—'}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-400">
                          {credConta ? (credConta.codigo_reduzido ?? credConta.classificacao) : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openEditHistorico(h)}
                              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
                            >
                              <Pencil size={12} /> Editar
                            </button>
                            <button
                              onClick={() => deactivateHistoricoMut.mutate(h.id)}
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
          </div>
        </div>
      )}

      {/* Modal conta bancária */}
      {showContaForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editingConta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Descrição / Nome *</label>
                <input
                  value={contaForm.descricao}
                  onChange={e => setContaForm(f => ({ ...f, descricao: e.target.value }))}
                  className="input w-full"
                  placeholder="ex: Banco do Brasil — Conta Principal"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Banco *</label>
                  <input
                    value={contaForm.banco}
                    onChange={e => setContaForm(f => ({ ...f, banco: e.target.value }))}
                    className="input"
                    placeholder="ex: Banco do Brasil"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tipo *</label>
                  <select value={contaForm.tipo_conta} onChange={e => setContaForm(f => ({ ...f, tipo_conta: e.target.value }))} className="input">
                    {TIPO_CONTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Agência *</label>
                  <input value={contaForm.agencia} onChange={e => setContaForm(f => ({ ...f, agencia: e.target.value }))} className="input" placeholder="0000" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Conta *</label>
                  <input value={contaForm.conta} onChange={e => setContaForm(f => ({ ...f, conta: e.target.value }))} className="input" placeholder="00000" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Dígito</label>
                  <input value={contaForm.digito} onChange={e => setContaForm(f => ({ ...f, digito: e.target.value }))} className="input" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Saldo Inicial</label>
                  <input
                    type="number" step="0.01"
                    value={contaForm.saldo_inicial}
                    onChange={e => setContaForm(f => ({ ...f, saldo_inicial: Number(e.target.value) }))}
                    className="input"
                    disabled={!!editingConta}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Data Saldo Inicial</label>
                  <input
                    type="date"
                    value={contaForm.data_saldo_inicial}
                    onChange={e => setContaForm(f => ({ ...f, data_saldo_inicial: e.target.value }))}
                    className="input"
                    disabled={!!editingConta}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Conta Contábil (vinculada)</label>
                <ContaSearch
                  contas={contasAnaliticas}
                  value={contaContabilId}
                  onChange={setContaContabilId}
                  placeholder="Buscar conta contábil do banco"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={closeContaForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={handleSaveConta}
                disabled={!contaForm.descricao || !contaForm.banco || !contaForm.agencia || !contaForm.conta || isContaPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {isContaPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal histórico bancário */}
      {showHistoricoForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editingHistorico ? 'Editar Histórico Bancário' : 'Novo Histórico Bancário'}
            </h2>
            <p className="mb-3 text-xs text-gray-400">
              Configure as contas contábeis para um texto que aparece no extrato OFX. O sistema fará a correspondência automática na importação.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Texto do Histórico OFX *</label>
                <input
                  value={historicoForm.texto_historico}
                  onChange={e => setHistoricoForm(f => ({ ...f, texto_historico: e.target.value }))}
                  className="input w-full"
                  placeholder="ex: PAGAMENTO FORNECEDOR"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Conta Débito</label>
                <ContaSearch
                  contas={contasAnaliticas}
                  value={historicoForm.conta_debito_id}
                  onChange={id => setHistoricoForm(f => ({ ...f, conta_debito_id: id }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Conta Crédito</label>
                <ContaSearch
                  contas={contasAnaliticas}
                  value={historicoForm.conta_credito_id}
                  onChange={id => setHistoricoForm(f => ({ ...f, conta_credito_id: id }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Histórico Padrão</label>
                <select
                  value={historicoForm.historico_padrao_id}
                  onChange={e => setHistoricoForm(f => ({ ...f, historico_padrao_id: e.target.value }))}
                  className="input"
                >
                  <option value="">— Nenhum —</option>
                  {historicosPadrao.map(h => (
                    <option key={h.id} value={h.id}>{String(h.codigo).padStart(3, '0')} — {h.descricao}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={closeHistoricoForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={handleSaveHistorico}
                disabled={!historicoForm.texto_historico || isHistoricoPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {isHistoricoPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
