import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { accountantsApi, type AccountantCreate } from '@/api/accountants'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  cpf: z.string().optional(),
  crc: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export function AccountantsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data: accountants = [], isLoading } = useQuery({
    queryKey: ['accountants'],
    queryFn: () => accountantsApi.list().then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createMut = useMutation({
    mutationFn: (data: AccountantCreate) => accountantsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accountants'] }); closeForm() },
  })

  const updateMut = useMutation({
    mutationFn: (data: FormData) => accountantsApi.update(editingId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accountants'] }); closeForm() },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => accountantsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accountants'] }),
  })

  function openCreate() {
    setEditingId(null)
    reset({ name: '', cpf: '', crc: '', phone: '', email: '' })
    setShowForm(true)
  }

  function openEdit(a: typeof accountants[0]) {
    setEditingId(a.id)
    reset({ name: a.name, cpf: a.cpf ?? '', crc: a.crc ?? '', phone: a.phone ?? '', email: a.email ?? '' })
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditingId(null); reset() }

  const onSubmit = (data: FormData) => {
    if (editingId) updateMut.mutate(data)
    else createMut.mutate(data as AccountantCreate)
  }

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Contadores</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Novo contador
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-400">Carregando...</p>
        ) : accountants.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">Nenhum contador cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">CPF</th>
                <th className="px-5 py-3">CRC</th>
                <th className="px-5 py-3">Telefone</th>
                <th className="px-5 py-3">E-mail</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {accountants.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{a.name}</td>
                  <td className="px-5 py-3 text-gray-500">{a.cpf || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{a.crc || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{a.phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{a.email || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(a)} className="text-brand-600 hover:text-brand-800"><Pencil size={14} /></button>
                      <button
                        onClick={() => { if (confirm('Inativar este contador?')) deleteMut.mutate(a.id) }}
                        className="text-red-400 hover:text-red-600"
                      ><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {editingId ? 'Editar Contador' : 'Novo Contador'}
              </h2>
              <button onClick={closeForm}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nome *</label>
                  <input {...register('name')} className="input" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">CPF</label>
                  <input {...register('cpf')} className="input" placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">CRC</label>
                  <input {...register('crc')} className="input" placeholder="PR-123456/O-1" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Telefone</label>
                  <input {...register('phone')} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">E-mail</label>
                  <input {...register('email')} className="input" type="email" />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
