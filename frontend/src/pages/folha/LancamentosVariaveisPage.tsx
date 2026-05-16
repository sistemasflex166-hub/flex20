import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCompany } from '../../contexts/CompanyContext'
import {
  lancamentosVariaveisApi, funcionariosApi, eventosApi,
  LancamentoVariavel, LancamentoVariavelCreate,
} from '../../api/folha'

// ── helpers ─────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const anoAtual = new Date().getFullYear()
const mesAtual = new Date().getMonth() + 1
const ANOS = Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i)

const fmt = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// ── tipos ────────────────────────────────────────────────────────────────────

type FormLanc = {
  funcionario_id: string
  evento_id: string
  quantidade: string
  valor: string
  observacao: string
}

const emptyForm = (): FormLanc => ({
  funcionario_id: '', evento_id: '', quantidade: '', valor: '', observacao: '',
})

// ── componente principal ─────────────────────────────────────────────────────

export default function LancamentosVariaveisPage() {
  const { company } = useCompany()
  const companyId = company?.id ?? 0

  const [mes, setMes] = useState(mesAtual)
  const [ano, setAno] = useState(anoAtual)
  const [tab, setTab] = useState<'lancamentos' | 'lixeira'>('lancamentos')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormLanc>(emptyForm())
  const [erro, setErro] = useState('')
  const [confirmExcluirId, setConfirmExcluirId] = useState<number | null>(null)
  const [confirmDefinitivoId, setConfirmDefinitivoId] = useState<number | null>(null)
  const [confirmTexto, setConfirmTexto] = useState('')

  const qc = useQueryClient()

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['lancamentos-variaveis', companyId, mes, ano],
    queryFn: () => lancamentosVariaveisApi.list(companyId, { competencia_mes: mes, competencia_ano: ano }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: lixeira = [] } = useQuery({
    queryKey: ['lancamentos-variaveis-lixeira', companyId, mes, ano],
    queryFn: () => lancamentosVariaveisApi.lixeira(companyId, { competencia_mes: mes, competencia_ano: ano }).then(r => r.data),
    enabled: !!companyId && tab === 'lixeira',
  })

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios', companyId],
    queryFn: () => funcionariosApi.list(companyId).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos', companyId],
    queryFn: () => eventosApi.list(companyId).then(r => r.data),
    enabled: !!companyId,
  })

  const eventoSelecionado = useMemo(
    () => eventos.find(e => e.id === parseInt(form.evento_id)),
    [form.evento_id, eventos]
  )

  const createMut = useMutation({
    mutationFn: (d: LancamentoVariavelCreate) => lancamentosVariaveisApi.create(companyId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos-variaveis', companyId] }); fechar() },
    onError: (e: any) => setErro(e.response?.data?.detail || 'Erro ao salvar'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<LancamentoVariavelCreate> }) =>
      lancamentosVariaveisApi.update(companyId, id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos-variaveis', companyId] }); fechar() },
    onError: (e: any) => setErro(e.response?.data?.detail || 'Erro ao salvar'),
  })

  const excluirMut = useMutation({
    mutationFn: (id: number) => lancamentosVariaveisApi.excluir(companyId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-variaveis', companyId] })
      setConfirmExcluirId(null)
    },
  })

  const restaurarMut = useMutation({
    mutationFn: (id: number) => lancamentosVariaveisApi.restaurar(companyId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos-variaveis', companyId] }),
  })

  const definitivoMut = useMutation({
    mutationFn: (id: number) => lancamentosVariaveisApi.excluirDefinitivo(companyId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-variaveis-lixeira', companyId] })
      setConfirmDefinitivoId(null)
      setConfirmTexto('')
    },
  })

  function fechar() {
    setShowForm(false); setEditId(null); setForm(emptyForm()); setErro('')
  }

  function abrir(l?: LancamentoVariavel) {
    if (l) {
      setEditId(l.id)
      setForm({
        funcionario_id: String(l.funcionario_id),
        evento_id: String(l.evento_id),
        quantidade: l.quantidade != null ? String(l.quantidade) : '',
        valor: l.valor != null ? String(l.valor) : '',
        observacao: l.observacao ?? '',
      })
    } else {
      setEditId(null); setForm(emptyForm())
    }
    setErro(''); setShowForm(true)
  }

  function salvar() {
    setErro('')
    const payload: LancamentoVariavelCreate = {
      funcionario_id: parseInt(form.funcionario_id),
      evento_id: parseInt(form.evento_id),
      competencia_mes: mes,
      competencia_ano: ano,
      quantidade: form.quantidade ? parseFloat(form.quantidade) : undefined,
      valor: form.valor ? parseFloat(form.valor) : undefined,
      observacao: form.observacao || undefined,
    }
    if (!payload.funcionario_id || !payload.evento_id) {
      setErro('Selecione funcionário e evento'); return
    }
    if (editId) updateMut.mutate({ id: editId, d: payload })
    else createMut.mutate(payload)
  }

  const loading = createMut.isPending || updateMut.isPending

  // agrupar lançamentos por funcionário
  const agrupados = useMemo(() => {
    const map = new Map<number, { nome: string; codigo: number; items: LancamentoVariavel[] }>()
    for (const l of lancamentos) {
      if (!map.has(l.funcionario_id)) {
        map.set(l.funcionario_id, { nome: l.funcionario.nome, codigo: l.funcionario.codigo, items: [] })
      }
      map.get(l.funcionario_id)!.items.push(l)
    }
    return [...map.entries()].sort((a, b) => a[1].codigo - b[1].codigo)
  }, [lancamentos])

  const totalProventos = lancamentos
    .filter(l => l.evento.tipo === 'provento' && l.valor != null)
    .reduce((s, l) => s + Number(l.valor ?? 0), 0)

  const totalDescontos = lancamentos
    .filter(l => l.evento.tipo === 'desconto' && l.valor != null)
    .reduce((s, l) => s + Number(l.valor ?? 0), 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Lançamentos Variáveis</h1>
        <button
          onClick={() => abrir()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Novo Lançamento
        </button>
      </div>

      {/* Filtros de competência */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
        <span className="text-sm font-medium text-gray-600">Competência:</span>
        <select
          value={mes}
          onChange={e => setMes(parseInt(e.target.value))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={ano}
          onChange={e => setAno(parseInt(e.target.value))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-500">
          {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['lancamentos', 'lixeira'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              t === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'lancamentos' ? 'Lançamentos' : `Lixeira${lixeira.length ? ` (${lixeira.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'lancamentos' ? (
        <>
          {/* Totalizadores */}
          {lancamentos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 font-medium uppercase">Proventos</div>
                <div className="text-lg font-bold text-green-700">R$ {fmt(totalProventos)}</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="text-xs text-red-600 font-medium uppercase">Descontos</div>
                <div className="text-lg font-bold text-red-700">R$ {fmt(totalDescontos)}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 font-medium uppercase">Saldo variáveis</div>
                <div className="text-lg font-bold text-blue-700">R$ {fmt(totalProventos - totalDescontos)}</div>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : agrupados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Nenhum lançamento para {MESES[mes - 1]}/{ano}.</p>
              <p className="text-xs mt-1">Clique em "+ Novo Lançamento" para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agrupados.map(([funcId, grupo]) => (
                <div key={funcId} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                    <span className="text-xs font-mono text-gray-400">#{grupo.codigo}</span>
                    <span className="font-medium text-gray-800 text-sm">{grupo.nome}</span>
                    <span className="ml-auto text-xs text-gray-500">{grupo.items.length} evento{grupo.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="px-4 py-2 text-left">Evento</th>
                        <th className="px-4 py-2 text-center">Tipo</th>
                        <th className="px-4 py-2 text-right">Quantidade</th>
                        <th className="px-4 py-2 text-right">Valor</th>
                        <th className="px-4 py-2 text-left">Observação</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.items.map(l => (
                        <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700">
                            <span className="text-xs text-gray-400 mr-1">#{l.evento.codigo}</span>
                            {l.evento.descricao}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              l.evento.tipo === 'provento'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {l.evento.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600">
                            {l.quantidade != null ? l.quantidade : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {l.valor != null ? `R$ ${fmt(l.valor)}` : '—'}
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-xs">{l.observacao ?? ''}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => abrir(l)} className="text-blue-500 hover:underline text-xs mr-2">Editar</button>
                            <button onClick={() => setConfirmExcluirId(l.id)} className="text-red-400 hover:underline text-xs">Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Lixeira */
        <div className="space-y-2">
          {lixeira.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Lixeira vazia para esta competência.</p>
          ) : lixeira.map(l => (
            <div key={l.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-white">
              <div>
                <span className="text-sm font-medium text-gray-700">{l.funcionario.nome}</span>
                <span className="mx-2 text-gray-300">·</span>
                <span className="text-sm text-gray-600">{l.evento.descricao}</span>
                {l.valor != null && <span className="ml-2 text-sm text-gray-500">R$ {fmt(l.valor)}</span>}
                <div className="text-xs text-gray-400 mt-0.5">
                  Excluído em {l.data_exclusao ? new Date(l.data_exclusao).toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => restaurarMut.mutate(l.id)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Restaurar
                </button>
                <button
                  onClick={() => { setConfirmDefinitivoId(l.id); setConfirmTexto('') }}
                  className="text-sm text-red-500 hover:underline"
                >
                  Excluir definitivamente
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal novo/editar lançamento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Novo'} Lançamento</h2>
              <p className="text-sm text-gray-500 mt-0.5">{MESES[mes - 1]}/{ano}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário *</label>
                <select
                  value={form.funcionario_id}
                  onChange={e => setForm(f => ({ ...f, funcionario_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>#{f.codigo} — {f.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evento *</label>
                <select
                  value={form.evento_id}
                  onChange={e => setForm(f => ({ ...f, evento_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {eventos.map(e => (
                    <option key={e.id} value={e.id}>
                      #{e.codigo} — {e.descricao} ({e.tipo})
                    </option>
                  ))}
                </select>
                {eventoSelecionado && (
                  <p className="text-xs text-gray-400 mt-1">
                    Natureza: <strong>{eventoSelecionado.natureza}</strong> ·
                    INSS: {eventoSelecionado.incide_inss ? 'sim' : 'não'} ·
                    IRRF: {eventoSelecionado.incide_irrf ? 'sim' : 'não'} ·
                    FGTS: {eventoSelecionado.incide_fgts ? 'sim' : 'não'}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.quantidade}
                    onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="ex: 10 horas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <input
                  type="text"
                  value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Opcional"
                  maxLength={300}
                />
              </div>
              {erro && <p className="text-sm text-red-600">{erro}</p>}
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={fechar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
              <button
                onClick={salvar}
                disabled={loading}
                className="px-5 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação exclusão (lixeira) */}
      {confirmExcluirId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Mover para lixeira?</h3>
            <p className="text-sm text-gray-500">O lançamento ficará na lixeira e poderá ser restaurado.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmExcluirId(null)} className="text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
              <button
                onClick={() => excluirMut.mutate(confirmExcluirId!)}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Mover para lixeira
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação exclusão definitiva */}
      {confirmDefinitivoId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-red-700">Exclusão definitiva</h3>
            <p className="text-sm text-gray-500">
              Esta ação é <strong>irreversível</strong>. Digite <strong>EXCLUIR</strong> para confirmar.
            </p>
            <input
              type="text"
              value={confirmTexto}
              onChange={e => setConfirmTexto(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="Digite EXCLUIR"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDefinitivoId(null); setConfirmTexto('') }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                disabled={confirmTexto !== 'EXCLUIR' || definitivoMut.isPending}
                onClick={() => definitivoMut.mutate(confirmDefinitivoId!)}
                className="px-4 py-2 bg-red-700 text-white text-sm rounded hover:bg-red-800 disabled:opacity-40"
              >
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
