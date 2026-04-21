import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil } from 'lucide-react'
import { partnersApi, type Partner, type PartnerCreate } from '@/api/partners'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const partnerTypeLabels = { cliente: 'Cliente', fornecedor: 'Fornecedor', ambos: 'Cliente e Fornecedor' }
const personTypeLabels = { juridica: 'Pessoa Jurídica', fisica: 'Pessoa Física' }

const schema = z.object({
  partner_type: z.enum(['cliente', 'fornecedor', 'ambos']),
  person_type: z.enum(['juridica', 'fisica']),
  name: z.string().min(1, 'Nome obrigatório'),
  trade_name: z.string().optional(),
  cnpj_cpf: z.string().optional(),
  state_registration: z.string().optional(),
  municipal_registration: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>
type ModalMode = 'create' | 'edit'

export function PartnersPage() {
  const { company } = useCompany()
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<ModalMode>('create')
  const [editing, setEditing] = useState<Partner | null>(null)
  const queryClient = useQueryClient()

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners', company?.id],
    queryFn: () => partnersApi.list(company!.id).then((r) => r.data),
    enabled: !!company,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { partner_type: 'cliente', person_type: 'juridica' },
  })

  const createMutation = useMutation({
    mutationFn: (data: PartnerCreate) => partnersApi.create(company!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners', company?.id] }); closeForm() },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => partnersApi.update(company!.id, editing!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners', company?.id] }); closeForm() },
  })

  function openCreate() {
    setMode('create'); setEditing(null)
    reset({ partner_type: 'cliente', person_type: 'juridica' })
    setShowForm(true)
  }

  function openEdit(p: Partner) {
    setMode('edit'); setEditing(p)
    reset({
      partner_type: p.partner_type,
      person_type: p.person_type,
      name: p.name,
      trade_name: p.trade_name ?? '',
      cnpj_cpf: p.cnpj_cpf ?? '',
      state_registration: p.state_registration ?? '',
      municipal_registration: p.municipal_registration ?? '',
      city: p.city ?? '',
      state: p.state ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
    })
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditing(null); reset() }

  const onSubmit = (data: FormData) =>
    mode === 'edit' ? updateMutation.mutate(data) : createMutation.mutate(data as PartnerCreate)

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Clientes e Fornecedores</h1>
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
          ) : partners.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Nenhum cadastro encontrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Pessoa</th>
                  <th className="px-5 py-3">CNPJ/CPF</th>
                  <th className="px-5 py-3">Cidade/UF</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-5 py-3 text-gray-500">{partnerTypeLabels[p.partner_type] ?? p.partner_type}</td>
                    <td className="px-5 py-3 text-gray-500">{personTypeLabels[p.person_type] ?? p.person_type}</td>
                    <td className="px-5 py-3 text-gray-500">{p.cnpj_cpf || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{p.city && p.state ? `${p.city}/${p.state}` : '—'}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => openEdit(p)} className="text-brand-600 hover:text-brand-800" title="Editar"><Pencil size={14} /></button>
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
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{mode === 'edit' ? 'Editar Cliente/Fornecedor' : 'Novo Cliente/Fornecedor'}</h2>
              <button onClick={closeForm}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tipo *</label>
                  <select {...register('partner_type')} className="input">
                    {Object.entries(partnerTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Pessoa *</label>
                  <select {...register('person_type')} className="input">
                    {Object.entries(personTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nome / Razão Social *</label>
                  <input {...register('name')} className="input" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nome Fantasia</label>
                  <input {...register('trade_name')} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">CNPJ / CPF</label>
                  <input {...register('cnpj_cpf')} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Insc. Estadual</label>
                  <input {...register('state_registration')} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Insc. Municipal</label>
                  <input {...register('municipal_registration')} className="input" />
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
