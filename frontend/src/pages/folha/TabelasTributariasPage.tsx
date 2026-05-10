import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  tabelasINSSApi, tabelasIRRFApi,
  TabelaINSS, TabelaIRRF, TabelaINSSCreate, TabelaIRRFCreate,
  FaixaINSS, FaixaIRRF,
} from '../../api/folha'

// ── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const fmtPct = (v: number) => `${v}%`


// ── tipos de formulário ──────────────────────────────────────────────────────

type FormINSS = {
  competencia_inicio: string
  competencia_fim: string
  teto_contribuicao: string
  faixas: { limite: string; aliquota: string }[]
}

type FormIRRF = {
  competencia_inicio: string
  competencia_fim: string
  valor_dependente: string
  desconto_simplificado: string
  faixas: { limite: string; aliquota: string; parcela_deduzir: string }[]
}

const emptyFormINSS = (): FormINSS => ({
  competencia_inicio: '',
  competencia_fim: '',
  teto_contribuicao: '',
  faixas: [{ limite: '', aliquota: '' }],
})

const emptyFormIRRF = (): FormIRRF => ({
  competencia_inicio: '',
  competencia_fim: '',
  valor_dependente: '',
  desconto_simplificado: '',
  faixas: [{ limite: '', aliquota: '', parcela_deduzir: '' }],
})

// ── componente principal ─────────────────────────────────────────────────────

export default function TabelasTributariasPage() {
  const [tab, setTab] = useState<'inss' | 'irrf'>('inss')

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Tabelas Tributárias</h1>
      <p className="text-sm text-gray-500">
        Tabelas progressivas de INSS e IRRF vigentes para cálculo da folha de pagamentos.
        O FGTS é fixo em 8% sobre a remuneração bruta.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['inss', 'irrf'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'inss' ? 'INSS' : 'IRRF'}
          </button>
        ))}
      </div>

      {tab === 'inss' ? <TabelaINSSPanel /> : <TabelaIRRFPanel />}
    </div>
  )
}

// ── Painel INSS ──────────────────────────────────────────────────────────────

function TabelaINSSPanel() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormINSS>(emptyFormINSS())
  const [error, setError] = useState('')

  const { data: tabelas = [], isLoading } = useQuery({
    queryKey: ['tabelas-inss'],
    queryFn: () => tabelasINSSApi.list().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: TabelaINSSCreate) => tabelasINSSApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tabelas-inss'] }); fechar() },
    onError: (e: any) => setError(e.response?.data?.detail || 'Erro ao salvar'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<TabelaINSSCreate> }) => tabelasINSSApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tabelas-inss'] }); fechar() },
    onError: (e: any) => setError(e.response?.data?.detail || 'Erro ao salvar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => tabelasINSSApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabelas-inss'] }),
    onError: (e: any) => setError(e.response?.data?.detail || 'Erro ao excluir'),
  })

  function fechar() {
    setShowForm(false); setEditId(null); setForm(emptyFormINSS()); setError('')
  }

  function abrir(t?: TabelaINSS) {
    if (t) {
      setEditId(t.id)
      setForm({
        competencia_inicio: t.competencia_inicio,
        competencia_fim: t.competencia_fim ?? '',
        teto_contribuicao: String(t.teto_contribuicao),
        faixas: t.faixas.map(f => ({ limite: f.limite == null ? '' : String(f.limite), aliquota: String(f.aliquota) })),
      })
    } else {
      setEditId(null); setForm(emptyFormINSS())
    }
    setError(''); setShowForm(true)
  }

  function salvar() {
    setError('')
    const faixas: FaixaINSS[] = form.faixas.map(f => ({
      limite: f.limite === '' ? null : parseFloat(f.limite),
      aliquota: parseFloat(f.aliquota),
    }))
    const payload: TabelaINSSCreate = {
      competencia_inicio: form.competencia_inicio,
      competencia_fim: form.competencia_fim || undefined,
      teto_contribuicao: parseFloat(form.teto_contribuicao),
      faixas,
    }
    if (editId) updateMut.mutate({ id: editId, d: payload })
    else createMut.mutate(payload)
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Tabela progressiva com alíquotas por faixa — desconto mensal máximo limitado ao teto.
        </p>
        <button
          onClick={() => abrir()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Nova Tabela
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : tabelas.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma tabela cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {tabelas.map(t => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-medium text-gray-800">
                    A partir de {t.competencia_inicio}
                  </span>
                  {t.competencia_fim && (
                    <span className="text-gray-500 text-sm ml-2">até {t.competencia_fim}</span>
                  )}
                  {!t.competencia_fim && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Vigente</span>
                  )}
                  <div className="text-sm text-gray-500 mt-0.5">
                    Teto de contribuição: <strong>R$ {fmt(t.teto_contribuicao)}</strong>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrir(t)} className="text-sm text-blue-600 hover:underline">Editar</button>
                  <button
                    onClick={() => {
                      if (confirm('Excluir esta tabela?')) deleteMut.mutate(t.id)
                    }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <th className="px-3 py-2 text-left">Faixa salarial até</th>
                    <th className="px-3 py-2 text-right">Alíquota</th>
                  </tr>
                </thead>
                <tbody>
                  {t.faixas.map((f, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700">
                        {f.limite == null ? 'Acima do teto' : `R$ ${fmt(f.limite)}`}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{fmtPct(f.aliquota)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Nova'} Tabela INSS</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competência início *</label>
                  <input
                    type="date"
                    value={form.competencia_inicio}
                    onChange={e => setForm(f => ({ ...f, competencia_inicio: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competência fim</label>
                  <input
                    type="date"
                    value={form.competencia_fim}
                    onChange={e => setForm(f => ({ ...f, competencia_fim: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teto de contribuição (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.teto_contribuicao}
                  onChange={e => setForm(f => ({ ...f, teto_contribuicao: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="0,00"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Faixas</label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, faixas: [...f.faixas, { limite: '', aliquota: '' }] }))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Adicionar faixa
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                    <span className="col-span-6">Limite até (R$) — vazio = sem limite</span>
                    <span className="col-span-5">Alíquota (%)</span>
                  </div>
                  {form.faixas.map((f, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="number"
                        step="0.01"
                        value={f.limite}
                        onChange={e => {
                          const faixas = [...form.faixas]
                          faixas[i] = { ...faixas[i], limite: e.target.value }
                          setForm(fm => ({ ...fm, faixas }))
                        }}
                        className="col-span-6 border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="sem limite"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={f.aliquota}
                        onChange={e => {
                          const faixas = [...form.faixas]
                          faixas[i] = { ...faixas[i], aliquota: e.target.value }
                          setForm(fm => ({ ...fm, faixas }))
                        }}
                        className="col-span-5 border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="0"
                      />
                      {form.faixas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm(fm => ({ ...fm, faixas: fm.faixas.filter((_, j) => j !== i) }))}
                          className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
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
    </div>
  )
}

// ── Painel IRRF ──────────────────────────────────────────────────────────────

function TabelaIRRFPanel() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormIRRF>(emptyFormIRRF())
  const [error, setError] = useState('')

  const { data: tabelas = [], isLoading } = useQuery({
    queryKey: ['tabelas-irrf'],
    queryFn: () => tabelasIRRFApi.list().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: TabelaIRRFCreate) => tabelasIRRFApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tabelas-irrf'] }); fechar() },
    onError: (e: any) => setError(e.response?.data?.detail || 'Erro ao salvar'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<TabelaIRRFCreate> }) => tabelasIRRFApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tabelas-irrf'] }); fechar() },
    onError: (e: any) => setError(e.response?.data?.detail || 'Erro ao salvar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => tabelasIRRFApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabelas-irrf'] }),
    onError: (e: any) => setError(e.response?.data?.detail || 'Erro ao excluir'),
  })

  function fechar() {
    setShowForm(false); setEditId(null); setForm(emptyFormIRRF()); setError('')
  }

  function abrir(t?: TabelaIRRF) {
    if (t) {
      setEditId(t.id)
      setForm({
        competencia_inicio: t.competencia_inicio,
        competencia_fim: t.competencia_fim ?? '',
        valor_dependente: String(t.valor_dependente),
        desconto_simplificado: String(t.desconto_simplificado),
        faixas: t.faixas.map(f => ({
          limite: f.limite == null ? '' : String(f.limite),
          aliquota: String(f.aliquota),
          parcela_deduzir: String(f.parcela_deduzir),
        })),
      })
    } else {
      setEditId(null); setForm(emptyFormIRRF())
    }
    setError(''); setShowForm(true)
  }

  function salvar() {
    setError('')
    const faixas: FaixaIRRF[] = form.faixas.map(f => ({
      limite: f.limite === '' ? null : parseFloat(f.limite),
      aliquota: parseFloat(f.aliquota),
      parcela_deduzir: parseFloat(f.parcela_deduzir || '0'),
    }))
    const payload: TabelaIRRFCreate = {
      competencia_inicio: form.competencia_inicio,
      competencia_fim: form.competencia_fim || undefined,
      valor_dependente: parseFloat(form.valor_dependente),
      desconto_simplificado: parseFloat(form.desconto_simplificado),
      faixas,
    }
    if (editId) updateMut.mutate({ id: editId, d: payload })
    else createMut.mutate(payload)
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Tabela progressiva com alíquota, parcela a deduzir, dedução por dependente e desconto simplificado.
        </p>
        <button
          onClick={() => abrir()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Nova Tabela
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : tabelas.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma tabela cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {tabelas.map(t => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-medium text-gray-800">
                    A partir de {t.competencia_inicio}
                  </span>
                  {t.competencia_fim && (
                    <span className="text-gray-500 text-sm ml-2">até {t.competencia_fim}</span>
                  )}
                  {!t.competencia_fim && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Vigente</span>
                  )}
                  <div className="text-sm text-gray-500 mt-0.5 flex gap-4">
                    <span>Dedução por dependente: <strong>R$ {fmt(t.valor_dependente)}</strong></span>
                    <span>Desconto simplificado: <strong>R$ {fmt(t.desconto_simplificado)}</strong></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrir(t)} className="text-sm text-blue-600 hover:underline">Editar</button>
                  <button
                    onClick={() => {
                      if (confirm('Excluir esta tabela?')) deleteMut.mutate(t.id)
                    }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <th className="px-3 py-2 text-left">Base de cálculo até</th>
                    <th className="px-3 py-2 text-right">Alíquota</th>
                    <th className="px-3 py-2 text-right">Parcela a deduzir</th>
                  </tr>
                </thead>
                <tbody>
                  {t.faixas.map((f, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700">
                        {f.limite == null ? 'Acima' : `R$ ${fmt(f.limite)}`}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{fmtPct(f.aliquota)}</td>
                      <td className="px-3 py-2 text-right">R$ {fmt(f.parcela_deduzir)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Nova'} Tabela IRRF</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competência início *</label>
                  <input
                    type="date"
                    value={form.competencia_inicio}
                    onChange={e => setForm(f => ({ ...f, competencia_inicio: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competência fim</label>
                  <input
                    type="date"
                    value={form.competencia_fim}
                    onChange={e => setForm(f => ({ ...f, competencia_fim: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dedução por dependente (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.valor_dependente}
                    onChange={e => setForm(f => ({ ...f, valor_dependente: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto simplificado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.desconto_simplificado}
                    onChange={e => setForm(f => ({ ...f, desconto_simplificado: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Faixas</label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, faixas: [...f.faixas, { limite: '', aliquota: '', parcela_deduzir: '' }] }))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Adicionar faixa
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                    <span className="col-span-4">Limite (R$)</span>
                    <span className="col-span-3">Alíquota (%)</span>
                    <span className="col-span-4">Parcela deduzir (R$)</span>
                  </div>
                  {form.faixas.map((f, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="number"
                        step="0.01"
                        value={f.limite}
                        onChange={e => {
                          const faixas = [...form.faixas]
                          faixas[i] = { ...faixas[i], limite: e.target.value }
                          setForm(fm => ({ ...fm, faixas }))
                        }}
                        className="col-span-4 border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="sem limite"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={f.aliquota}
                        onChange={e => {
                          const faixas = [...form.faixas]
                          faixas[i] = { ...faixas[i], aliquota: e.target.value }
                          setForm(fm => ({ ...fm, faixas }))
                        }}
                        className="col-span-3 border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="0"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={f.parcela_deduzir}
                        onChange={e => {
                          const faixas = [...form.faixas]
                          faixas[i] = { ...faixas[i], parcela_deduzir: e.target.value }
                          setForm(fm => ({ ...fm, faixas }))
                        }}
                        className="col-span-4 border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="0,00"
                      />
                      {form.faixas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm(fm => ({ ...fm, faixas: fm.faixas.filter((_, j) => j !== i) }))}
                          className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
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
    </div>
  )
}
