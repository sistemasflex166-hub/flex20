import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { cfopsApi, type CFOPCreate } from '@/api/fiscalBase'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  code: z.string().min(1, 'Código obrigatório').max(5),
  description: z.string().min(1, 'Descrição obrigatória'),
  is_input: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function CFOPsPage() {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const tenantId = user?.role === 'platform_admin' ? 1 : undefined

  const { data: cfops = [], isLoading } = useQuery({
    queryKey: ['cfops', tenantId],
    queryFn: () => cfopsApi.list(tenantId).then((r) => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_input: true },
  })

  const createMutation = useMutation({
    mutationFn: (data: CFOPCreate) => cfopsApi.create(data, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cfops'] })
      setShowForm(false)
      reset()
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => cfopsApi.deactivate(id, tenantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cfops'] }),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">CFOPs</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-400">Carregando...</p>
        ) : cfops.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">Nenhum CFOP cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cfops.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono font-medium text-gray-800">{c.code}</td>
                  <td className="px-5 py-3 text-gray-700">{c.description}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.is_input ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                      {c.is_input ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => deactivateMutation.mutate(c.id)} className="text-xs text-red-400 hover:text-red-600">Inativar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Novo CFOP</h2>
              <button onClick={() => { setShowForm(false); reset() }}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d as CFOPCreate))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Código *</label>
                  <input {...register('code')} className="input" maxLength={5} placeholder="1.101" />
                  {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input {...register('is_input')} type="checkbox" className="rounded" />
                    Entrada
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
                  <input {...register('description')} className="input" />
                  {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
                </div>
              </div>
              {createMutation.isError && <p className="text-sm text-red-500">Erro ao cadastrar.</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); reset() }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                  {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
