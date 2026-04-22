import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil } from 'lucide-react'
import { serviceItemsApi, type ServiceItem, type ServiceItemCreate } from '@/api/fiscalBase'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const SIMPLES_OPTIONS = [
  { value: '', label: 'Não se aplica' },
  { value: 'anexo_i', label: 'Simples Nacional: Anexo I' },
  { value: 'anexo_ii', label: 'Simples Nacional: Anexo II' },
  { value: 'anexo_iii', label: 'Simples Nacional: Anexo III' },
  { value: 'anexo_iv', label: 'Simples Nacional: Anexo IV' },
  { value: 'anexo_v', label: 'Simples Nacional: Anexo V' },
]

const schema = z.object({
  code: z.string().min(1, 'Código obrigatório'),
  name: z.string().min(1, 'Descrição obrigatória'),
  service_code: z.string().optional(),
  cnae: z.string().optional(),
  iss_rate: z.number().min(0).max(100).optional(),
  simples_anexo: z.string().optional(),
  pis_rate: z.number().min(0).max(100).optional(),
  cofins_rate: z.number().min(0).max(100).optional(),
  account_code: z.string().optional(),
})

type FormData = z.infer<typeof schema>
type ModalMode = 'create' | 'edit'

function RateInput({ label, name, control }: { label: string; name: 'iss_rate' | 'pis_rate' | 'cofins_rate'; control: any }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label} (%)</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <input
            type="number"
            step="0.0001"
            min="0"
            max="100"
            className="input"
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        )}
      />
    </div>
  )
}

export function ServicesPage() {
  const { company } = useCompany()
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<ModalMode>('create')
  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const queryClient = useQueryClient()

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['service-items', company?.id],
    queryFn: () => serviceItemsApi.list(company!.id).then((r) => r.data),
    enabled: !!company,
  })

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createMutation = useMutation({
    mutationFn: (data: ServiceItemCreate) => serviceItemsApi.create(company!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['service-items', company?.id] }); closeForm() },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => serviceItemsApi.update(editing!.id, company!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['service-items', company?.id] }); closeForm() },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => serviceItemsApi.deactivate(id, company!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-items', company?.id] }),
  })

  function openCreate() {
    setMode('create'); setEditing(null); reset(); setShowForm(true)
  }

  function openEdit(s: ServiceItem) {
    setMode('edit'); setEditing(s)
    reset({
      code: s.code,
      name: s.name,
      service_code: s.service_code ?? '',
      cnae: s.cnae ?? '',
      iss_rate: s.iss_rate ?? undefined,
      simples_anexo: s.simples_anexo ?? '',
      pis_rate: s.pis_rate ?? undefined,
      cofins_rate: s.cofins_rate ?? undefined,
      account_code: s.account_code ?? '',
    })
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditing(null); reset() }

  const onSubmit = (data: FormData) => {
    const payload = { ...data, simples_anexo: data.simples_anexo || undefined }
    return mode === 'edit' ? updateMutation.mutate(payload as FormData) : createMutation.mutate(payload as ServiceItemCreate)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  function simplexLabel(val: string | null) {
    return SIMPLES_OPTIONS.find((o) => o.value === val)?.label ?? '—'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Serviços</h1>
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
          ) : services.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Nenhum serviço cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3">Cód. Serviço</th>
                  <th className="px-5 py-3">CNAE</th>
                  <th className="px-5 py-3 text-right">ISS %</th>
                  <th className="px-5 py-3">Simples Nacional</th>
                  <th className="px-5 py-3 text-right">PIS %</th>
                  <th className="px-5 py-3 text-right">COFINS %</th>
                  <th className="px-5 py-3">Conta Contábil</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-gray-500">{s.code}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-5 py-3 text-gray-500">{s.service_code || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{s.cnae || '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{s.iss_rate != null ? `${s.iss_rate}%` : '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{simplexLabel(s.simples_anexo)}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{s.pis_rate != null ? `${s.pis_rate}%` : '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{s.cofins_rate != null ? `${s.cofins_rate}%` : '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.account_code || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(s)} className="text-brand-600 hover:text-brand-800" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => deactivateMutation.mutate(s.id)} className="text-xs text-red-400 hover:text-red-600">Inativar</button>
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {mode === 'edit' ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button onClick={closeForm}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Código *</label>
                  <input {...register('code')} className="input" />
                  {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
                </div>
                <RateInput label="ISS" name="iss_rate" control={control} />
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
                  <input {...register('name')} className="input" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Cód. do Serviço</label>
                  <input {...register('service_code')} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">CNAE</label>
                  <input {...register('cnae')} className="input" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Simples Nacional</label>
                  <select {...register('simples_anexo')} className="input">
                    {SIMPLES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <RateInput label="Alíquota PIS" name="pis_rate" control={control} />
                <RateInput label="Alíquota COFINS" name="cofins_rate" control={control} />
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Conta Contábil</label>
                  <input {...register('account_code')} placeholder="ex: 3.1.1.01" className="input" />
                </div>
              </div>
              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-sm text-red-500">Erro ao salvar.</p>
              )}
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
