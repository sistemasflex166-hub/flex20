import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X } from 'lucide-react'
import { cargosApi, type Cargo, type CargoCreate } from '@/api/folha'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const emptyForm: CargoCreate = { descricao: '', cbo: '', salario_normativo: undefined }

export function CargosPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Cargo | null>(null)
  const [form, setForm] = useState<CargoCreate>(emptyForm)

  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos', company?.id],
    queryFn: () => cargosApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const save = useMutation({
    mutationFn: () =>
      editing
        ? cargosApi.update(company!.id, editing.id, form).then(r => r.data)
        : cargosApi.create(company!.id, form).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cargos'] }); closeModal() },
  })

  const inativar = useMutation({
    mutationFn: (id: number) => cargosApi.inativar(company!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cargos'] }),
  })

  function openNew() { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(c: Cargo) { setEditing(c); setForm({ descricao: c.descricao, cbo: c.cbo ?? '', salario_normativo: c.salario_normativo ?? undefined }); setModal(true) }
  function closeModal() { setModal(false); setEditing(null) }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Cargos / Funções</h1>
        {company && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus size={15} /> Novo Cargo
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
                <th className="px-4 py-3">CBO</th>
                <th className="px-4 py-3 text-right">Salário Normativo</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {cargos.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum cargo cadastrado.</td></tr>
              )}
              {cargos.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{String(c.codigo).padStart(3, '0')}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{c.descricao}</td>
                  <td className="px-4 py-2 text-gray-500">{c.cbo ?? '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {c.salario_normativo ? `R$ ${Number(c.salario_normativo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => inativar.mutate(c.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{editing ? 'Editar Cargo' : 'Novo Cargo'}</h2>

            {editing && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-500">Código</label>
                <p className="font-mono text-sm text-gray-400">{String(editing.codigo).padStart(3, '0')}</p>
              </div>
            )}

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
              <input className="input w-full" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">CBO</label>
              <input className="input w-full" placeholder="000000" value={form.cbo ?? ''} onChange={e => setForm(f => ({ ...f, cbo: e.target.value }))} />
            </div>
            <div className="mb-5">
              <label className="mb-1 block text-xs font-medium text-gray-700">Salário Normativo (R$)</label>
              <input type="number" step="0.01" className="input w-full" value={form.salario_normativo ?? ''} onChange={e => setForm(f => ({ ...f, salario_normativo: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => save.mutate()} disabled={!form.descricao || save.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                {save.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
