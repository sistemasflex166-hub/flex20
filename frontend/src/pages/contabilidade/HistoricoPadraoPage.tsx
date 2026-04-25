import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { historicoPadraoApi, HistoricoPadrao } from '@/api/contabilidade'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

export function HistoricoPadraoPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<HistoricoPadrao | null>(null)
  const [descricao, setDescricao] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: historicos = [], isLoading } = useQuery({
    queryKey: ['historicos-padrao', company?.id],
    queryFn: () => historicoPadraoApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  function openNew() {
    setEditing(null)
    setDescricao('')
    setShowForm(true)
  }

  function openEdit(h: HistoricoPadrao) {
    setEditing(h)
    setDescricao(h.descricao)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setDescricao('')
  }

  const createMut = useMutation({
    mutationFn: () => historicoPadraoApi.create(company!.id, descricao),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['historicos-padrao'] }); closeForm() },
  })

  const updateMut = useMutation({
    mutationFn: () => historicoPadraoApi.update(editing!.id, company!.id, descricao),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['historicos-padrao'] }); closeForm() },
  })

  const deactivateMut = useMutation({
    mutationFn: (id: number) => historicoPadraoApi.deactivate(id, company!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['historicos-padrao'] }),
  })

  const isPending = createMut.isPending || updateMut.isPending

  function handleSave() {
    if (editing) updateMut.mutate()
    else createMut.mutate()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Histórico Padrão</h1>
        <button
          onClick={() => company && openNew()}
          disabled={!company}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="rounded-xl border border-gray-200 bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Carregando...</p>
          ) : historicos.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Nenhum histórico padrão cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {historicos.map(h => (
                  <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-gray-500">{String(h.codigo).padStart(3, '0')}</td>
                    <td className="px-5 py-3 text-gray-800">{h.descricao}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEdit(h)}
                          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          onClick={() => deactivateMut.mutate(h.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Inativar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editing ? 'Editar Histórico Padrão' : 'Novo Histórico Padrão'}
            </h2>
            {editing && (
              <p className="mb-3 text-xs text-gray-400">Código: {String(editing.codigo).padStart(3, '0')} — imutável</p>
            )}
            <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="input mb-4 w-full"
              placeholder="ex: Pagamento de fornecedor"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!descricao || isPending}
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
