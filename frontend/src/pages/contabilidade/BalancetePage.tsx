import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, AlertCircle } from 'lucide-react'
import { relatoriosApi, type LinhaBalancete } from '@/api/contabilidade'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

function fmt(val: number) {
  const n = Number(val)
  if (n === 0) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtSaldo(val: number) {
  const n = Number(val)
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function primeiroDiaMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function BalancetePage() {
  const { company } = useCompany()
  const [dataIni, setDataIni] = useState(primeiroDiaMes())
  const [dataFim, setDataFim] = useState(today())
  const [nivelMaximo, setNivelMaximo] = useState('')
  const [apenasComMovimento, setApenasComMovimento] = useState(false)
  const [gerado, setGerado] = useState(false)

  const { data: linhas = [], isLoading, refetch } = useQuery({
    queryKey: ['balancete', company?.id, dataIni, dataFim, nivelMaximo, apenasComMovimento],
    queryFn: () =>
      relatoriosApi.balancete(
        company!.id, dataIni, dataFim,
        nivelMaximo ? Number(nivelMaximo) : undefined,
        apenasComMovimento,
      ).then(r => r.data),
    enabled: false,
  })

  function gerar() {
    setGerado(true)
    refetch()
  }

  const totalDeb = linhas.filter(l => l.nivel === 1).reduce((s, l) => s + Number(l.debitos), 0)
  const totalCred = linhas.filter(l => l.nivel === 1).reduce((s, l) => s + Number(l.creditos), 0)
  const diferenca = Math.abs(totalDeb - totalCred)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Balancete</h1>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <>
          {/* Filtros */}
          <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Data Início *</label>
              <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className="input w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Data Fim *</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Nível máximo</label>
              <select value={nivelMaximo} onChange={e => setNivelMaximo(e.target.value)} className="input w-36">
                <option value="">Todos</option>
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>Até nível {n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="apenas-mov"
                checked={apenasComMovimento}
                onChange={e => setApenasComMovimento(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <label htmlFor="apenas-mov" className="text-sm text-gray-600">Apenas com movimento</label>
            </div>
            <button
              onClick={gerar}
              disabled={!dataIni || !dataFim}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
            >
              <FileText size={15} /> Gerar
            </button>
          </div>

          {/* Resultado */}
          {isLoading && <p className="p-6 text-center text-sm text-gray-400">Calculando...</p>}

          {!isLoading && gerado && linhas.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">Nenhuma conta com movimento no período.</p>
          )}

          {!isLoading && linhas.length > 0 && (
            <>
              {/* Totalizador geral */}
              <div className="mb-3 flex items-center gap-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
                <span>Total Débitos: <span className="font-medium text-gray-700">R$ {fmtSaldo(totalDeb)}</span></span>
                <span>Total Créditos: <span className="font-medium text-gray-700">R$ {fmtSaldo(totalCred)}</span></span>
                {diferenca > 0.01 ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle size={14} /> Diferença: R$ {fmtSaldo(diferenca)}
                  </span>
                ) : (
                  <span className="font-medium text-green-600">✓ Balancete equilibrado</span>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                      <th className="px-4 py-3">Classificação</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3 text-center">Nat.</th>
                      <th className="px-4 py-3 text-right">Saldo Anterior</th>
                      <th className="px-4 py-3 text-right">Débitos</th>
                      <th className="px-4 py-3 text-right">Créditos</th>
                      <th className="px-4 py-3 text-right">Saldo Atual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map(l => (
                      <LinhaRow key={l.conta_id} linha={l} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function LinhaRow({ linha }: { linha: LinhaBalancete }) {
  const isSintetica = linha.tipo === 'sintetica'
  const indent = (linha.nivel - 1) * 16

  const saldoAtualNum = Number(linha.saldo_atual)
  const saldoColor = saldoAtualNum < 0 ? 'text-red-600' : 'text-gray-800'

  return (
    <tr className={`border-b border-gray-50 ${isSintetica ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
      <td className="px-4 py-2">
        <span
          className={`font-mono text-xs ${isSintetica ? 'font-semibold text-gray-700' : 'text-gray-500'}`}
          style={{ paddingLeft: indent }}
        >
          {linha.classificacao}
        </span>
      </td>
      <td className="px-4 py-2" style={{ paddingLeft: 16 + indent }}>
        <span className={`text-sm ${isSintetica ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
          {linha.descricao}
        </span>
      </td>
      <td className="px-4 py-2 text-center text-xs text-gray-400">{linha.natureza}</td>
      <td className="px-4 py-2 text-right font-mono text-xs text-gray-500">{fmt(linha.saldo_anterior)}</td>
      <td className="px-4 py-2 text-right font-mono text-xs text-blue-600">{fmt(linha.debitos)}</td>
      <td className="px-4 py-2 text-right font-mono text-xs text-purple-600">{fmt(linha.creditos)}</td>
      <td className={`px-4 py-2 text-right font-mono text-xs font-medium ${isSintetica ? `font-semibold ${saldoColor}` : saldoColor}`}>
        {fmtSaldo(saldoAtualNum)}
      </td>
    </tr>
  )
}
