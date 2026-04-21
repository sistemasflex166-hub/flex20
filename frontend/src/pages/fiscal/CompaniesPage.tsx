import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil } from 'lucide-react'
import { companiesApi, type Company, type CompanyCreate } from '@/api/companies'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  name: z.string().min(1, 'Razão social obrigatória'),
  trade_name: z.string().optional(),
  cnpj: z.string().optional(),
  company_type: z.enum(['ltda', 'eireli', 'sa', 'mei', 'autonomo', 'outros']),
  regime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'mei']),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

const regimeLabels: Record<string, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  mei: 'MEI',
}

const typeLabels: Record<string, string> = {
  ltda: 'LTDA',
  eireli: 'EIRELI',
  sa: 'S/A',
  mei: 'MEI',
  autonomo: 'Autônomo',
  outros: 'Outros',
}

type ModalMode = 'create' | 'edit'

export function CompaniesPage() {
  const [showForm, setShowForm] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isPlatformAdmin = user?.role === 'platform_admin'
  const tenantId = isPlatformAdmin ? 1 : undefined

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', tenantId],
    queryFn: () => companiesApi.list(tenantId).then((r) => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { company_type: 'ltda', regime: 'simples_nacional' },
  })

  const createMutation = useMutation({
    mutationFn: (data: CompanyCreate) => companiesApi.create(data, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      closeForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => companiesApi.update(editingCompany!.id, data, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      closeForm()
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => companiesApi.deactivate(id, tenantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  })

  function openCreate() {
    setModalMode('create')
    setEditingCompany(null)
    reset({ company_type: 'ltda', regime: 'simples_nacional' })
    setShowForm(true)
  }

  function openEdit(c: Company) {
    setModalMode('edit')
    setEditingCompany(c)
    reset({
      name: c.name,
      trade_name: c.trade_name ?? '',
      cnpj: c.cnpj ?? '',
      company_type: c.company_type as FormData['company_type'],
      regime: c.regime as FormData['regime'],
      city: c.city ?? '',
      state: c.state ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingCompany(null)
    reset()
  }

  const onSubmit = (data: FormData) => {
    if (modalMode === 'edit') {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data as CompanyCreate)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Empresas</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} />
          Nova empresa
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-400">Carregando...</p>
        ) : companies.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">Nenhuma empresa cadastrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-5 py-3">Cód.</th>
                <th className="px-5 py-3">Razão Social</th>
                <th className="px-5 py-3">CNPJ</th>
                <th className="px-5 py-3">Regime</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Cidade/UF</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-500">{String(c.code).padStart(4, '0')}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.cnpj || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{regimeLabels[c.regime] ?? c.regime}</td>
                  <td className="px-5 py-3 text-gray-500">{typeLabels[c.company_type] ?? c.company_type}</td>
                  <td className="px-5 py-3 text-gray-500">{c.city && c.state ? `${c.city}/${c.state}` : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs text-brand-600 hover:text-brand-800"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deactivateMutation.mutate(c.id)}
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

      {/* Modal criar / editar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {modalMode === 'edit'
                  ? `Editar Empresa — ${String(editingCompany!.code).padStart(4, '0')}`
                  : 'Nova Empresa'}
              </h2>
              <button onClick={closeForm}>
                <X size={18} className="text-gray-400 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Razão Social *</label>
                  <input {...register('name')} className="input" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nome Fantasia</label>
                  <input {...register('trade_name')} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">CNPJ</label>
                  <input {...register('cnpj')} className="input" placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tipo *</label>
                  <select {...register('company_type')} className="input">
                    {Object.entries(typeLabels).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Regime Tributário *</label>
                  <select {...register('regime')} className="input">
                    {Object.entries(regimeLabels).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Cidade</label>
                  <input {...register('city')} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">UF</label>
                  <input {...register('state')} className="input" maxLength={2} placeholder="SP" />
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

              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-sm text-red-500">Erro ao salvar empresa.</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isSaving}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
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
