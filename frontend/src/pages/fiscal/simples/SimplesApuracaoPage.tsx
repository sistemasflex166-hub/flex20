import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calculator, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { simplesNacionalApi, type PreviewSimples, type ApuracaoSimples } from '@/api/simplesNacional'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmt(v: number) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function perc(v: number) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

const STATUS_BADGE: Record<string, string> = {
  calculado: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-blue-100 text-blue-700',
  pgdas_gerado: 'bg-purple-100 text-purple-700',
  pago: 'bg-green-100 text-green-700',
}

function hoje() {
  const d = new Date()
  return { mes: d.getMonth() + 1, ano: d.getFullYear() }
}

export function SimplesApuracaoPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const { mes: mesAtual, ano: anoAtual } = hoje()

  const [form, setForm] = useState({
    competencia_mes: mesAtual,
    competencia_ano: anoAtual,
    receita_mes: '',
  })
  const [preview, setPreview] = useState<PreviewSimples | null>(null)
  const [showRbt12, setShowRbt12] = useState(false)
  const [error, setError] = useState('')

  const { data: apuracoes = [] } = useQuery({
    queryKey: ['simples-apuracoes', company?.id],
    queryFn: () => simplesNacionalApi.listApuracoes(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const previewMut = useMutation({
    mutationFn: () => simplesNacionalApi.preview(company!.id, {
      competencia_mes: form.competencia_mes,
      competencia_ano: form.competencia_ano,
      receita_mes: Number(form.receita_mes.replace(',', '.')),
    }),
    onSuccess: (r) => { setPreview(r.data); setError('') },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      setError(e?.response?.data?.detail || 'Erro ao calcular.')
      setPreview(null)
    },
  })

  const calcularMut = useMutation({
    mutationFn: () => simplesNacionalApi.calcular(company!.id, {
      competencia_mes: form.competencia_mes,
      competencia_ano: form.competencia_ano,
      receita_mes: Number(form.receita_mes.replace(',', '.')),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simples-apuracoes', company?.id] })
      setPreview(null)
      setError('')
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => setError(e?.response?.data?.detail || 'Erro ao salvar apuração.'),
  })

  const confirmarMut = useMutation({
    mutationFn: (id: number) => simplesNacionalApi.confirmar(company!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['simples-apuracoes', company?.id] }),
    onError: (e: { response?: { data?: { detail?: string } } }) => alert(e?.response?.data?.detail || 'Erro ao confirmar.'),
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Simples Nacional — Apuração Mensal</h1>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="space-y-6">

          {/* Painel de cálculo */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-800">Nova Apuração</h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Mês *</label>
                <select value={form.competencia_mes} onChange={e => { setForm(f => ({ ...f, competencia_mes: Number(e.target.value) })); setPreview(null) }} className="input w-36">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Ano *</label>
                <input type="number" value={form.competencia_ano} onChange={e => { setForm(f => ({ ...f, competencia_ano: Number(e.target.value) })); setPreview(null) }} className="input w-28" min={2000} max={2099} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Receita do Mês (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.receita_mes}
                  onChange={e => { setForm(f => ({ ...f, receita_mes: e.target.value })); setPreview(null) }}
                  className="input w-48"
                  placeholder="0,00"
                />
              </div>
              <button
                onClick={() => previewMut.mutate()}
                disabled={!form.receita_mes || previewMut.isPending}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
              >
                <Calculator size={15} /> {previewMut.isPending ? 'Calculando...' : 'Calcular Prévia'}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </div>

          {/* Prévia do cálculo */}
          {preview && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-brand-800">
                  Prévia — {MESES[preview.competencia_mes - 1]}/{preview.competencia_ano}
                </h2>
                {preview.meses_ausentes > 0 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                    ⚠ {preview.meses_ausentes} mês(es) sem receita registrada — considerado R$ 0,00
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                <div className="rounded-lg bg-white px-4 py-3">
                  <p className="text-xs text-gray-400">RBT12</p>
                  <p className="text-lg font-bold text-gray-800">R$ {fmt(preview.rbt12)}</p>
                  <p className="text-xs text-gray-400">Faixa {preview.faixa_aplicada} — Anexo {preview.anexo_aplicado}</p>
                </div>
                <div className="rounded-lg bg-white px-4 py-3">
                  <p className="text-xs text-gray-400">Alíquota Efetiva</p>
                  <p className="text-lg font-bold text-brand-700">{perc(preview.aliquota_efetiva)}</p>
                  <p className="text-xs text-gray-400">Nominal: {perc(preview.aliquota_nominal)} — Dedução: R$ {fmt(preview.valor_deduzir)}</p>
                </div>
                <div className="rounded-lg bg-white px-4 py-3">
                  <p className="text-xs text-gray-400">Receita do Mês</p>
                  <p className="text-lg font-bold text-gray-800">R$ {fmt(preview.receita_mes)}</p>
                  {preview.fator_r !== null && (
                    <p className="text-xs text-gray-400">Fator R: {perc(Number(preview.fator_r) * 100)}</p>
                  )}
                </div>
                <div className="rounded-lg bg-green-50 px-4 py-3">
                  <p className="text-xs text-gray-400">Valor do DAS</p>
                  <p className="text-2xl font-bold text-green-700">R$ {fmt(preview.valor_das)}</p>
                  <p className="text-xs text-gray-400">Vencimento: {new Date(preview.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Distribuição por tributo */}
              <div className="mt-4 rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                      <th className="px-4 py-2">Tributo</th>
                      <th className="px-4 py-2 text-right">Valor R$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { k: 'irpj',   label: 'IRPJ' },
                      { k: 'csll',   label: 'CSLL' },
                      { k: 'cofins', label: 'COFINS' },
                      { k: 'pis',    label: 'PIS' },
                      { k: 'cpp',    label: 'CPP', obs: !preview.inclui_cpp ? '(recolhido separadamente)' : '' },
                      { k: 'icms',   label: 'ICMS' },
                      { k: 'iss',    label: 'ISS' },
                    ].map(({ k, label, obs }) => {
                      const val = preview.distribuicao[k as keyof typeof preview.distribuicao]
                      if (Number(val) === 0) return null
                      return (
                        <tr key={k} className="border-b border-gray-50">
                          <td className="px-4 py-1.5 text-gray-700">
                            {label} {obs && <span className="text-xs text-amber-600">{obs}</span>}
                          </td>
                          <td className="px-4 py-1.5 text-right font-mono text-gray-800">R$ {fmt(Number(val))}</td>
                        </tr>
                      )
                    })}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-2 text-gray-800">Total DAS</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-900">R$ {fmt(preview.valor_das)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Detalhamento RBT12 */}
              <div className="mt-3">
                <button onClick={() => setShowRbt12(v => !v)} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800">
                  {showRbt12 ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  {showRbt12 ? 'Ocultar' : 'Ver'} composição do RBT12
                </button>
                {showRbt12 && (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-left font-medium uppercase text-gray-400">
                          <th className="px-4 py-2">Mês</th>
                          <th className="px-4 py-2 text-right">Receita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.detalhamento_rbt12.map(d => (
                          <tr key={`${d.ano}-${d.mes}`} className={`border-b border-gray-50 ${d.ausente ? 'bg-amber-50' : ''}`}>
                            <td className="px-4 py-1.5 text-gray-600">
                              {MESES_CURTO[d.mes - 1]}/{d.ano}
                              {d.ausente && <span className="ml-2 text-amber-600">sem registro</span>}
                            </td>
                            <td className="px-4 py-1.5 text-right font-mono text-gray-700">R$ {fmt(d.receita)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-4 py-1.5 text-gray-800">RBT12 Total</td>
                          <td className="px-4 py-1.5 text-right font-mono text-gray-900">R$ {fmt(preview.rbt12)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => calcularMut.mutate()}
                  disabled={calcularMut.isPending}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={15} /> {calcularMut.isPending ? 'Salvando...' : 'Confirmar e Salvar Apuração'}
                </button>
                <button onClick={() => setPreview(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Histórico de apurações */}
          {apuracoes.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-800">Histórico de Apurações</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                    <th className="px-5 py-3">Competência</th>
                    <th className="px-5 py-3">Anexo / Faixa</th>
                    <th className="px-5 py-3 text-right">RBT12</th>
                    <th className="px-5 py-3 text-right">Receita</th>
                    <th className="px-5 py-3 text-right">Alíq. Efetiva</th>
                    <th className="px-5 py-3 text-right">DAS</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {apuracoes.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-2 font-medium text-gray-700">
                        {MESES_CURTO[a.competencia_mes - 1]}/{a.competencia_ano}
                      </td>
                      <td className="px-5 py-2 text-xs text-gray-500">Anexo {a.anexo_aplicado} / Faixa {a.faixa_aplicada}</td>
                      <td className="px-5 py-2 text-right font-mono text-xs text-gray-600">R$ {fmt(a.rbt12)}</td>
                      <td className="px-5 py-2 text-right font-mono text-xs text-gray-600">R$ {fmt(a.receita_mes)}</td>
                      <td className="px-5 py-2 text-right font-mono text-xs text-brand-700">{perc(a.aliquota_efetiva)}</td>
                      <td className="px-5 py-2 text-right font-mono text-sm font-semibold text-green-700">R$ {fmt(a.valor_das)}</td>
                      <td className="px-5 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {a.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-2">
                        {a.status === 'calculado' && !a.bloqueado && (
                          <button
                            onClick={() => confirmarMut.mutate(a.id)}
                            disabled={confirmarMut.isPending}
                            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
                          >
                            Confirmar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
