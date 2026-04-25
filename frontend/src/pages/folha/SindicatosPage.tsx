import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X } from 'lucide-react'
import { sindicatosApi, type Sindicato, type SindicatoCreate } from '@/api/folha'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const empty: SindicatoCreate = { nome: '', cnpj: '', data_base: '', percentual_contribuicao: 0 }

export function SindicatosPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Sindicato | null>(null)
  const [form, setForm] = useState<SindicatoCreate>(empty)

  const { data: items = [] } = useQuery({
    queryKey: ['sindicatos', company?.id],
    queryFn: () => sindicatosApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const save = useMutation({
    mutationFn: () =>
      editing
        ? sindicatosApi.update(company!.id, editing.id, form).then(r => r.data)
        : sindicatosApi.create(company!.id, form).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sindicatos'] }); closeModal() },
  })

  const inativar = useMutation({
    mutationFn: (id: number) => sindicatosApi.inativar(company!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sindicatos'] }),
  })

  function openNew() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(s: Sindicato) {
    setEditing(s)
    setForm({ nome: s.nome, cnpj: s.cnpj ?? '', data_base: s.data_base ?? '', percentual_contribuicao: Number(s.percentual_contribuicao) })
    setModal(true)
  }
  function closeModal() { setModal(false); setEditing(null) }

  const f = (field: keyof SindicatoCreate, val: string | number) => setForm(p => ({ ...p, [field]: val }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Sindicatos</h1>
        {company && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus size={15} /> Novo Sindicato
          </button>
        )}
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-4 py-3 w-16">Cód.</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3 text-right">% Contribuição</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum sindicato cadastrado.</td></tr>
              )}
              {items.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{String(s.codigo).padStart(3, '0')}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{s.nome}</td>
                  <td className="px-4 py-2 text-gray-500">{s.cnpj ?? '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{Number(s.percentual_contribuicao).toFixed(2)}%</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(s)} className="flex items-center gap-1 text-xs text-brand-600 hover:underline"><Pencil size={12} /> Editar</button>
                      <button onClick={() => inativar.mutate(s.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline"><X size={12} /> Inativar</button>
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
            <h2 className="mb-4 text-base font-semibold text-gray-900">{editing ? 'Editar Sindicato' : 'Novo Sindicato'}</h2>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">Nome *</label>
              <input className="input w-full" value={form.nome} onChange={e => f('nome', e.target.value)} />
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">CNPJ</label>
                <input className="input w-full" value={form.cnpj ?? ''} onChange={e => f('cnpj', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">% Contribuição</label>
                <input type="number" step="0.01" className="input w-full" value={form.percentual_contribuicao ?? 0} onChange={e => f('percentual_contribuicao', Number(e.target.value))} />
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-1 block text-xs font-medium text-gray-700">Data Base (convenção)</label>
              <input type="date" className="input w-full" value={form.data_base ?? ''} onChange={e => f('data_base', e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => save.mutate()} disabled={!form.nome || save.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                {save.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
