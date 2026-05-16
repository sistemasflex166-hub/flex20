import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { folhasApi, FolhaPagamento, ResumoFuncionarioFolha } from '../../api/folha'
import { useCompany } from '../../contexts/CompanyContext'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtMoeda(v: number | string) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    aberta: 'bg-yellow-100 text-yellow-800',
    calculada: 'bg-blue-100 text-blue-800',
    fechada: 'bg-green-100 text-green-800',
  }
  const label: Record<string, string> = {
    aberta: 'Aberta',
    calculada: 'Calculada',
    fechada: 'Fechada',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label[status] ?? status}
    </span>
  )
}

// ── Modal nova folha ─────────────────────────────────────────────────────────
function ModalNovaFolha({ onClose, companyId }: { onClose: () => void; companyId: number }) {
  const qc = useQueryClient()
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [erro, setErro] = useState('')

  const criar = useMutation({
    mutationFn: () => folhasApi.create(companyId, { competencia_mes: mes, competencia_ano: ano }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folhas', companyId] }); onClose() },
    onError: (e: any) => setErro(e?.response?.data?.detail ?? 'Erro ao criar folha'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-80 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Nova Folha de Pagamento</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mês</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
            >
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ano</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
            />
          </div>
        </div>
        {erro && <p className="text-red-500 text-xs mb-3">{erro}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => criar.mutate()}
            disabled={criar.isPending}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {criar.isPending ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Painel de detalhes / holerite ────────────────────────────────────────────
function PainelFolha({ folha, companyId, onVoltar }: {
  folha: FolhaPagamento
  companyId: number
  onVoltar: () => void
}) {
  const qc = useQueryClient()

  const { data: resumos = [], isLoading } = useQuery({
    queryKey: ['folha-resumo', folha.id],
    queryFn: () => folhasApi.resumo(companyId, folha.id).then(r => r.data),
    enabled: folha.status !== 'aberta',
  })

  const calcular = useMutation({
    mutationFn: () => folhasApi.calcular(companyId, folha.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folhas', companyId] })
      qc.invalidateQueries({ queryKey: ['folha-resumo', folha.id] })
    },
  })

  const fechar = useMutation({
    mutationFn: () => folhasApi.fechar(companyId, folha.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folhas', companyId] }),
  })

  const reabrir = useMutation({
    mutationFn: () => folhasApi.reabrir(companyId, folha.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folhas', companyId] }),
  })

  const [expandido, setExpandido] = useState<number | null>(null)

  const competencia = `${String(folha.competencia_mes).padStart(2,'0')}/${folha.competencia_ano}`

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onVoltar} className="text-blue-600 hover:underline text-sm">← Voltar</button>
        <h2 className="text-base font-semibold text-gray-800">
          Folha de Pagamento — {competencia}
        </h2>
        {statusBadge(folha.status)}
      </div>

      {/* Cards totalizadores */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Proventos', value: folha.total_proventos, color: 'text-green-600' },
          { label: 'Descontos', value: folha.total_descontos, color: 'text-red-500' },
          { label: 'Líquido', value: folha.total_liquido, color: 'text-blue-600' },
          { label: 'FGTS', value: folha.total_fgts, color: 'text-orange-500' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`text-lg font-semibold ${c.color}`}>{fmtMoeda(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Ações */}
      <div className="flex gap-2 mb-5">
        {folha.status !== 'fechada' && (
          <button
            onClick={() => calcular.mutate()}
            disabled={calcular.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {calcular.isPending ? 'Calculando...' : folha.status === 'aberta' ? 'Calcular Folha' : 'Recalcular Folha'}
          </button>
        )}
        {folha.status === 'calculada' && (
          <button
            onClick={() => { if (confirm('Fechar a folha? Ela não poderá ser recalculada.')) fechar.mutate() }}
            disabled={fechar.isPending}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Fechar Folha
          </button>
        )}
        {folha.status === 'fechada' && (
          <button
            onClick={() => { if (confirm('Reabrir a folha?')) reabrir.mutate() }}
            disabled={reabrir.isPending}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Reabrir Folha
          </button>
        )}
      </div>

      {/* Lista de funcionários */}
      {folha.status === 'aberta' ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Folha aberta — clique em <strong>Calcular Folha</strong> para processar os salários e variáveis do mês.
        </div>
      ) : isLoading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : resumos.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum funcionário encontrado.</p>
      ) : (
        <div className="space-y-2">
          {resumos.map((r: ResumoFuncionarioFolha) => (
            <div key={r.funcionario_id} className="bg-white rounded-lg border border-gray-200">
              {/* Cabeçalho do funcionário */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg"
                onClick={() => setExpandido(expandido === r.funcionario_id ? null : r.funcionario_id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono w-8">{String(r.funcionario_codigo).padStart(3,'0')}</span>
                  <span className="text-sm font-medium text-gray-800">{r.funcionario_nome}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-green-600">{fmtMoeda(r.total_proventos)}</span>
                  <span className="text-red-500">−{fmtMoeda(r.total_descontos)}</span>
                  <span className="text-blue-600 font-semibold">{fmtMoeda(r.liquido)}</span>
                  <span className="text-gray-400 text-xs">{expandido === r.funcionario_id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Detalhe (holerite simplificado) */}
              {expandido === r.funcionario_id && (
                <div className="border-t border-gray-100 px-4 pb-3">
                  <table className="w-full text-sm mt-2">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left py-1 font-normal">Descrição</th>
                        <th className="text-right py-1 font-normal w-28">Referência</th>
                        <th className="text-right py-1 font-normal w-32">Proventos</th>
                        <th className="text-right py-1 font-normal w-32">Descontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.itens.map(item => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-1 text-gray-700">
                            {item.descricao}
                            {item.tipo === 'informativo' && (
                              <span className="ml-1 text-xs text-gray-400">(informativo)</span>
                            )}
                          </td>
                          <td className="py-1 text-right text-gray-500 text-xs">
                            {item.referencia != null ? Number(item.referencia).toLocaleString('pt-BR') : ''}
                          </td>
                          <td className="py-1 text-right text-green-700">
                            {item.tipo === 'provento' ? fmtMoeda(item.valor) : ''}
                          </td>
                          <td className="py-1 text-right text-red-600">
                            {item.tipo === 'desconto' ? fmtMoeda(item.valor) : ''}
                            {item.tipo === 'informativo' ? (
                              <span className="text-orange-500">{fmtMoeda(item.valor)}</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-semibold text-sm">
                        <td className="pt-2" colSpan={2}>Total / Líquido</td>
                        <td className="pt-2 text-right text-green-700">{fmtMoeda(r.total_proventos)}</td>
                        <td className="pt-2 text-right text-red-600">{fmtMoeda(r.total_descontos)}</td>
                      </tr>
                      <tr className="font-bold text-base">
                        <td colSpan={2} className="text-right text-blue-600 pt-1">Líquido a Pagar:</td>
                        <td colSpan={2} className="text-right text-blue-600 pt-1">{fmtMoeda(r.liquido)}</td>
                      </tr>
                      <tr className="text-xs text-gray-500">
                        <td colSpan={2} className="pt-1">FGTS (encargo patronal):</td>
                        <td colSpan={2} className="text-right pt-1 text-orange-500">{fmtMoeda(r.fgts)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function FolhaPagamentoPage() {
  const { company } = useCompany()
  const companyId = company?.id ?? 0

  const [modalNova, setModalNova] = useState(false)
  const [folhaSelecionada, setFolhaSelecionada] = useState<FolhaPagamento | null>(null)

  const { data: folhas = [], isLoading } = useQuery({
    queryKey: ['folhas', companyId],
    queryFn: () => folhasApi.list(companyId).then(r => r.data),
    enabled: !!companyId,
  })

  // Atualiza folhaSelecionada quando a lista recarregar
  const folhaAtual = folhaSelecionada
    ? (folhas.find(f => f.id === folhaSelecionada.id) ?? folhaSelecionada)
    : null

  if (!companyId) return <p className="p-6 text-sm text-gray-500">Selecione uma empresa.</p>

  if (folhaAtual) {
    return (
      <div className="p-6">
        <PainelFolha
          folha={folhaAtual}
          companyId={companyId}
          onVoltar={() => setFolhaSelecionada(null)}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-800">Folha de Pagamento</h1>
        <button
          onClick={() => setModalNova(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Nova Folha
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : folhas.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
          Nenhuma folha criada. Clique em <strong>+ Nova Folha</strong> para começar.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Cód.</th>
                <th className="px-4 py-3 text-left">Competência</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Proventos</th>
                <th className="px-4 py-3 text-right">Descontos</th>
                <th className="px-4 py-3 text-right">Líquido</th>
                <th className="px-4 py-3 text-right">FGTS</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {folhas.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-400">{String(f.codigo).padStart(3,'0')}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {MESES[f.competencia_mes - 1]}/{f.competencia_ano}
                  </td>
                  <td className="px-4 py-3">{statusBadge(f.status)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmtMoeda(f.total_proventos)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{fmtMoeda(f.total_descontos)}</td>
                  <td className="px-4 py-3 text-right text-blue-600 font-semibold">{fmtMoeda(f.total_liquido)}</td>
                  <td className="px-4 py-3 text-right text-orange-500">{fmtMoeda(f.total_fgts)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setFolhaSelecionada(f)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalNova && <ModalNovaFolha companyId={companyId} onClose={() => setModalNova(false)} />}
    </div>
  )
}
