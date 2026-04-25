import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X } from 'lucide-react'
import { departamentosApi, type Departamento } from '@/api/folha'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

export function DepartamentosPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Departamento | null>(null)
  const [descricao, setDescricao] = useState('')

  const { data: items = [] } = useQuery({
    queryKey: ['departamentos', company?.id],
    queryFn: () => departamentosApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const save = useMutation({
    mutationFn: () =>
      editing
        ? departamentosApi.update(company!.id, editing.id, { descricao }).then(r => r.data)
        : departamentosApi.create(company!.id, { descricao }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departamentos'] }); closeModal() },
  })

  const inativar = useMutation({
    mutationFn: (id: number) => departamentosApi.inativar(company!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  })

  function openNew() { setEditing(null); setDescricao(''); setModal(true) }
  function openEdit(d: Departamento) { setEditing(d); setDescricao(d.descricao); setModal(true) }
  function closeModal() { setModal(false); setEditing(null) }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Departamentos</h1>
        {company && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus size={15} /> Novo Departamento
          </button>
        )}
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-4 py-3 w-16">Cód.</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum departamento cadastrado.</td></tr>
              )}
              {items.map(d => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{String(d.codigo).padStart(3, '0')}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{d.descricao}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(d)} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => inativar.mutate(d.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                        <X size={12} /> Inativar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{editing ? 'Editar Departamento' : 'Novo Departamento'}</h2>
            {editing && <p className="mb-3 text-xs text-gray-400">Cód.: {String(editing.codigo).padStart(3, '0')}</p>}
            <div className="mb-5">
              <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
              <input className="input w-full" value={descricao} onChange={e => setDescricao(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => save.mutate()} disabled={!descricao || save.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                {save.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
