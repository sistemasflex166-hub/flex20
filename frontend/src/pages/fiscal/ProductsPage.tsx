import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil } from 'lucide-react'
import { productsApi, type Product, type ProductCreate } from '@/api/fiscalBase'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'
import { CurrencyInput } from '@/components/ui/CurrencyInput'

const units = ['UN', 'KG', 'MT', 'LT', 'CX', 'PC', 'HR', 'DZ']

const schema = z.object({
  code: z.string().min(1, 'Código obrigatório'),
  name: z.string().min(1, 'Descrição obrigatória'),
  ncm: z.string().optional(),
  unit: z.string().default('UN'),
  price: z.number().min(0).optional(),
})

type FormData = z.infer<typeof schema>
type ModalMode = 'create' | 'edit'

export function ProductsPage() {
  const { company } = useCompany()
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<ModalMode>('create')
  const [editing, setEditing] = useState<Product | null>(null)
  const queryClient = useQueryClient()

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', company?.id],
    queryFn: () => productsApi.list(company!.id).then((r) => r.data),
    enabled: !!company,
  })

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit: 'UN', price: 0 },
  })

  const createMutation = useMutation({
    mutationFn: (data: ProductCreate) => productsApi.create(company!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products', company?.id] }); closeForm() },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => productsApi.update(editing!.id, company!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products', company?.id] }); closeForm() },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => productsApi.deactivate(id, company!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', company?.id] }),
  })

  function openCreate() {
    setMode('create'); setEditing(null)
    reset({ unit: 'UN', price: 0 })
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setMode('edit'); setEditing(p)
    reset({ code: p.code, name: p.name, ncm: p.ncm ?? '', unit: p.unit, price: p.price ?? 0 })
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditing(null); reset() }

  const onSubmit = (data: FormData) =>
    mode === 'edit' ? updateMutation.mutate(data) : createMutation.mutate(data as ProductCreate)

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Produtos</h1>
        <button
          onClick={() => company && openCreate()}
          disabled={!company}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="rounded-xl border border-gray-200 bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Carregando...</p>
          ) : products.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Nenhum produto cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3">NCM</th>
                  <th className="px-5 py-3">Unidade</th>
                  <th className="px-5 py-3 text-right">Preço</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-gray-500">{p.code}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-5 py-3 text-gray-500">{p.ncm || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{p.unit}</td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {p.price != null ? Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(p)} className="text-brand-600 hover:text-brand-800" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => deactivateMutation.mutate(p.id)} className="text-xs text-red-400 hover:text-red-600">Inativar</button>
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{mode === 'edit' ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={closeForm}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Código *</label>
                  <input {...register('code')} className="input" />
                  {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Unidade</label>
                  <select {...register('unit')} className="input">
                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
                  <input {...register('name')} className="input" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">NCM</label>
                  <input {...register('ncm')} className="input" placeholder="00000000" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Preço (R$)</label>
                  <Controller
                    control={control}
                    name="price"
                    render={({ field }) => (
                      <CurrencyInput value={field.value} onChange={field.onChange} className="input" />
                    )}
                  />
                </div>
              </div>
              {(createMutation.isError || updateMutation.isError) && <p className="text-sm text-red-500">Erro ao salvar.</p>}
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
