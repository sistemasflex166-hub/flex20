import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { relatoriosApi, planoContasApi, type RazaoResponse, type PlanoContas } from '@/api/contabilidade'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'
import { ContaSearch } from '@/components/contabilidade/ContaSearch'

function fmt(val: number) {
  const n = Number(val)
  if (n === 0) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtSaldo(val: number) {
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function primeiroDiaMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function RazaoPage() {
  const { company } = useCompany()
  const [contaId, setContaId] = useState('')
  const [dataIni, setDataIni] = useState(primeiroDiaMes())
  const [dataFim, setDataFim] = useState(today())
  const [gerado, setGerado] = useState(false)

  const { data: contas = [] } = useQuery({
    queryKey: ['plano-contas', company?.id],
    queryFn: () => planoContasApi.list(company!.id).then((r: { data: PlanoContas[] }) => r.data),
    enabled: !!company,
  })

  const contasAnaliticas = contas.filter(c => c.tipo === 'analitica')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['razao', company?.id, contaId, dataIni, dataFim],
    queryFn: () => relatoriosApi.razao(company!.id, Number(contaId), dataIni, dataFim).then((r: { data: RazaoResponse }) => r.data),
    enabled: false,
  })

  function gerar() {
    if (!contaId) return
    setGerado(true)
    refetch()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Razão Contábil</h1>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <>
          {/* Filtros */}
          <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="w-80">
              <label className="mb-1 block text-xs font-medium text-gray-700">Conta *</label>
              <ContaSearch
                contas={contasAnaliticas}
                value={contaId}
                onChange={id => setContaId(id)}
                placeholder="Buscar conta analítica..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Data Início *</label>
              <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className="input w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Data Fim *</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input w-40" />
            </div>
            <button
              onClick={gerar}
              disabled={!contaId || !dataIni || !dataFim}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
            >
              <FileText size={15} /> Gerar
            </button>
          </div>

          {isLoading && <p className="p-6 text-center text-sm text-gray-400">Calculando...</p>}

          {!isLoading && gerado && !data && (
            <p className="p-6 text-center text-sm text-gray-400">Nenhum dado encontrado para esta conta no período.</p>
          )}

          {!isLoading && data && (
            <>
              {/* Cabeçalho da conta */}
              <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <span className="font-mono font-semibold text-gray-700">{data.classificacao}</span>
                <span className="mx-2 text-gray-400">—</span>
                <span className="font-medium text-gray-900">{data.descricao}</span>
                <span className="ml-4 text-xs text-gray-400">Natureza: {data.natureza === 'D' ? 'Devedora' : 'Credora'}</span>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Nº</th>
                      <th className="px-4 py-3">Histórico</th>
                      <th className="px-4 py-3">Origem</th>
                      <th className="px-4 py-3 text-right">Débito</th>
                      <th className="px-4 py-3 text-right">Crédito</th>
                      <th className="px-4 py-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.linhas.map((l, idx) => {
                      const isSaldoAnterior = l.lancamento_id === null
                      const saldoNum = Number(l.saldo)
                      const saldoColor = saldoNum < 0 ? 'text-red-600' : 'text-gray-800'
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-gray-50 ${isSaldoAnterior ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-2 font-mono text-xs text-gray-500">
                            {l.data}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-400">
                            {l.codigo ?? ''}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className={isSaldoAnterior ? 'font-semibold text-gray-700' : 'text-gray-700'}>
                              {l.historico}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-400">{l.origem}</td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-blue-600">
                            {fmt(Number(l.debito))}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-purple-600">
                            {fmt(Number(l.credito))}
                          </td>
                          <td className={`px-4 py-2 text-right font-mono text-xs font-medium ${isSaldoAnterior ? `font-semibold ${saldoColor}` : saldoColor}`}>
                            {fmtSaldo(saldoNum)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totalizador final */}
              {data.linhas.length > 0 && (() => {
                const ultimaLinha = data.linhas[data.linhas.length - 1]
                const totalDeb = data.linhas.reduce((s, l) => s + Number(l.debito), 0)
                const totalCred = data.linhas.reduce((s, l) => s + Number(l.credito), 0)
                return (
                  <div className="mt-3 flex items-center gap-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
                    <span>Total Débitos: <span className="font-medium text-blue-600">R$ {fmtSaldo(totalDeb)}</span></span>
                    <span>Total Créditos: <span className="font-medium text-purple-600">R$ {fmtSaldo(totalCred)}</span></span>
                    <span className="ml-auto">Saldo Final: <span className={`font-semibold ${Number(ultimaLinha.saldo) < 0 ? 'text-red-600' : 'text-gray-800'}`}>R$ {fmtSaldo(Number(ultimaLinha.saldo))}</span></span>
                  </div>
                )
              })()}
            </>
          )}
        </>
      )}
    </div>
  )
}
