import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Plus, Pencil, Trash2 } from 'lucide-react'
import { simplesNacionalApi } from '@/api/simplesNacional'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const ANEXOS = ['I', 'II', 'III', 'IV', 'V']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmt(v: number) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export function SimplesConfiguracaoPage() {
  const { company } = useCompany()
  const qc = useQueryClient()

  const [cfgForm, setCfgForm] = useState({ anexo_principal: 'I', usa_fator_r: false, data_inicio_simples: hoje() })
  const [editingCfg, setEditingCfg] = useState(false)

  const [recForm, setRecForm] = useState({ competencia_mes: new Date().getMonth() + 1, competencia_ano: new Date().getFullYear(), receita_bruta: '' })
  const [showRecForm, setShowRecForm] = useState(false)
  const [editingRec, setEditingRec] = useState<{ mes: number; ano: number } | null>(null)

  const { data: config, isLoading: loadingCfg } = useQuery({
    queryKey: ['simples-config', company?.id],
    queryFn: () => simplesNacionalApi.getConfiguracao(company!.id).then(r => r.data),
    enabled: !!company,
    onSuccess: (data) => {
      if (data) {
        setCfgForm({ anexo_principal: data.anexo_principal, usa_fator_r: data.usa_fator_r, data_inicio_simples: data.data_inicio_simples })
      }
    },
  })

  const { data: historico = [] } = useQuery({
    queryKey: ['simples-historico', company?.id],
    queryFn: () => simplesNacionalApi.listHistoricoReceita(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const cfgMut = useMutation({
    mutationFn: () => simplesNacionalApi.salvarConfiguracao(company!.id, cfgForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['simples-config', company?.id] }); setEditingCfg(false) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => simplesNacionalApi.deleteReceita(company!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['simples-historico', company?.id] }),
    onError: (e: { response?: { data?: { detail?: string } } }) => alert(e?.response?.data?.detail || 'Erro ao excluir receita.'),
  })

  const recMut = useMutation({
    mutationFn: () => simplesNacionalApi.salvarReceita(company!.id, {
      competencia_mes: recForm.competencia_mes,
      competencia_ano: recForm.competencia_ano,
      receita_bruta: Number(recForm.receita_bruta.replace(',', '.')),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['simples-historico', company?.id] }); setShowRecForm(false); setEditingRec(null) },
    onError: (e: { response?: { data?: { detail?: string } } }) => alert(e?.response?.data?.detail || 'Erro ao salvar receita.'),
  })

  function openEditRec(mes: number, ano: number, valor: number) {
    setRecForm({ competencia_mes: mes, competencia_ano: ano, receita_bruta: String(valor) })
    setEditingRec({ mes, ano })
    setShowRecForm(true)
  }

  const origemBadge = (origem: string) => {
    const map: Record<string, string> = {
      manual: 'bg-gray-100 text-gray-600',
      automatico: 'bg-green-100 text-green-700',
      importado: 'bg-blue-100 text-blue-700',
    }
    return map[origem] ?? 'bg-gray-100 text-gray-500'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Simples Nacional — Configuração</h1>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="space-y-6">

          {/* Configuração do regime */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Configuração do Regime</h2>
              {!editingCfg && (
                <button onClick={() => setEditingCfg(true)} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800">
                  <Pencil size={13} /> Editar
                </button>
              )}
            </div>

            {loadingCfg ? (
              <p className="text-sm text-gray-400">Carregando...</p>
            ) : editingCfg || !config ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Anexo Principal *</label>
                    <select
                      value={cfgForm.anexo_principal}
                      onChange={e => setCfgForm(f => ({ ...f, anexo_principal: e.target.value }))}
                      className="input"
                    >
                      {ANEXOS.map(a => <option key={a} value={a}>Anexo {a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Data de Início no Simples *</label>
                    <input
                      type="date"
                      value={cfgForm.data_inicio_simples}
                      onChange={e => setCfgForm(f => ({ ...f, data_inicio_simples: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={cfgForm.usa_fator_r}
                        onChange={e => setCfgForm(f => ({ ...f, usa_fator_r: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600"
                      />
                      Usa Fator R (Anexo III × V)
                    </label>
                  </div>
                </div>
                {cfgForm.usa_fator_r && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Fator R: a integração com o módulo Folha de Pagamentos será utilizada para calcular automaticamente se o anexo aplicável é o III ou o V.
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => cfgMut.mutate()}
                    disabled={!cfgForm.anexo_principal || !cfgForm.data_inicio_simples || cfgMut.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    <Save size={14} /> {cfgMut.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                  {config && (
                    <button onClick={() => setEditingCfg(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Anexo</p>
                  <p className="font-semibold text-gray-800">Anexo {config.anexo_principal}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Início no Simples</p>
                  <p className="font-medium text-gray-700">{new Date(config.data_inicio_simples + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Fator R</p>
                  <p className="font-medium text-gray-700">{config.usa_fator_r ? 'Sim (Anexo III × V)' : 'Não'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Histórico de receitas */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-800">Histórico de Receita Bruta</h2>
              <button
                onClick={() => { setRecForm({ competencia_mes: new Date().getMonth() + 1, competencia_ano: new Date().getFullYear(), receita_bruta: '' }); setEditingRec(null); setShowRecForm(true) }}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
              >
                <Plus size={13} /> Lançar Receita
              </button>
            </div>

            {historico.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">Nenhuma receita cadastrada. Informe as receitas dos últimos 12 meses para iniciar as apurações.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                    <th className="px-5 py-3">Competência</th>
                    <th className="px-5 py-3">Atividade</th>
                    <th className="px-5 py-3 text-right">Receita Bruta</th>
                    <th className="px-5 py-3 text-center">Origem</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(h => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-2 font-medium text-gray-700">
                        {MESES[h.competencia_mes - 1]}/{h.competencia_ano}
                      </td>
                      <td className="px-5 py-2 text-xs text-gray-500">
                        {h.simples_codigo === 'geral' ? 'Geral' : `Anexo ${h.simples_codigo}`}
                      </td>
                      <td className="px-5 py-2 text-right font-mono text-sm text-gray-800">R$ {fmt(h.receita_bruta)}</td>
                      <td className="px-5 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${origemBadge(h.origem)}`}>
                          {h.origem}
                        </span>
                      </td>
                      <td className="px-5 py-2">
                        {h.simples_codigo === 'geral' && h.origem !== 'automatico' && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditRec(h.competencia_mes, h.competencia_ano, h.receita_bruta)}
                              className="text-brand-600 hover:text-brand-800"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => { if (window.confirm('Excluir este registro de receita?')) deleteMut.mutate(h.id) }}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal receita */}
      {showRecForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editingRec ? 'Editar Receita' : 'Lançar Receita'}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Mês *</label>
                  <select
                    value={recForm.competencia_mes}
                    onChange={e => setRecForm(f => ({ ...f, competencia_mes: Number(e.target.value) }))}
                    disabled={!!editingRec}
                    className="input disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Ano *</label>
                  <input
                    type="number"
                    value={recForm.competencia_ano}
                    onChange={e => setRecForm(f => ({ ...f, competencia_ano: Number(e.target.value) }))}
                    disabled={!!editingRec}
                    className="input disabled:bg-gray-50 disabled:text-gray-400"
                    min={2000}
                    max={2099}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Receita Bruta (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={recForm.receita_bruta}
                  onChange={e => setRecForm(f => ({ ...f, receita_bruta: e.target.value }))}
                  className="input"
                  placeholder="0,00"
                  autoFocus
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setShowRecForm(false); setEditingRec(null) }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={() => recMut.mutate()}
                disabled={!recForm.receita_bruta || recMut.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {recMut.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
