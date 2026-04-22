import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil } from 'lucide-react'
import { operationNaturesApi, cfopsApi, type OperationNature, type OperationNatureCreate } from '@/api/fiscalBase'
import { useCompany } from '@/contexts/CompanyContext'
import { useAuth } from '@/contexts/AuthContext'
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
  cfop_id: z.coerce.number().optional(),
  simples_anexo: z.string().optional(),
  pis_rate: z.number().min(0).max(100).optional(),
  cofins_rate: z.number().min(0).max(100).optional(),
  account_code: z.string().optional(),
  is_billing: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>
type ModalMode = 'create' | 'edit'

function RateInput({ label, name, control }: { label: string; name: 'pis_rate' | 'cofins_rate'; control: any }) {
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

export function OperationNaturesPage() {
  const { company } = useCompany()
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<ModalMode>('create')
  const [editing, setEditing] = useState<OperationNature | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const tenantId = user?.role === 'platform_admin' ? 1 : undefined

  const { data: natures = [], isLoading } = useQuery({
    queryKey: ['operation-natures', company?.id],
    queryFn: () => operationNaturesApi.list(company!.id).then((r) => r.data),
    enabled: !!company,
  })

  const { data: cfops = [] } = useQuery({
    queryKey: ['cfops', tenantId],
    queryFn: () => cfopsApi.list(tenantId).then((r) => r.data),
  })

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createMutation = useMutation({
    mutationFn: (data: OperationNatureCreate) => operationNaturesApi.create(company!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operation-natures', company?.id] }); closeForm() },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => operationNaturesApi.update(editing!.id, company!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operation-natures', company?.id] }); closeForm() },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => operationNaturesApi.deactivate(id, company!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operation-natures', company?.id] }),
  })

  function openCreate() {
    setMode('create'); setEditing(null); reset(); setShowForm(true)
  }

  function openEdit(n: OperationNature) {
    setMode('edit'); setEditing(n)
    reset({
      code: n.code,
      name: n.name,
      cfop_id: n.cfop_id ?? undefined,
      simples_anexo: n.simples_anexo ?? '',
      pis_rate: n.pis_rate ?? undefined,
      cofins_rate: n.cofins_rate ?? undefined,
      account_code: n.account_code ?? '',
      is_billing: n.is_billing ?? false,
    })
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditing(null); reset() }

  const onSubmit = (data: FormData) => {
    const payload = { ...data, simples_anexo: data.simples_anexo || undefined }
    return mode === 'edit' ? updateMutation.mutate(payload as FormData) : createMutation.mutate(payload as OperationNatureCreate)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  function simplexLabel(val: string | null) {
    return SIMPLES_OPTIONS.find((o) => o.value === val)?.label ?? '—'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Natureza de Operação</h1>
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
          ) : natures.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Nenhuma natureza de operação cadastrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3">CFOP</th>
                  <th className="px-5 py-3">Simples Nacional</th>
                  <th className="px-5 py-3 text-right">PIS %</th>
                  <th className="px-5 py-3 text-right">COFINS %</th>
                  <th className="px-5 py-3">Conta Contábil</th>
                  <th className="px-5 py-3 text-center">Faturamento</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {natures.map((n) => (
                  <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-gray-500">{n.code}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{n.name}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {n.cfop_id ? (cfops.find((c) => c.id === n.cfop_id)?.code ?? n.cfop_id) : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{simplexLabel(n.simples_anexo)}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{n.pis_rate != null ? `${n.pis_rate}%` : '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{n.cofins_rate != null ? `${n.cofins_rate}%` : '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{n.account_code || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {n.is_billing
                        ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Sim</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(n)} className="text-brand-600 hover:text-brand-800" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => deactivateMutation.mutate(n.id)} className="text-xs text-red-400 hover:text-red-600">Inativar</button>
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
                {mode === 'edit' ? 'Editar Natureza de Operação' : 'Nova Natureza de Operação'}
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">CFOP</label>
                  <select {...register('cfop_id')} className="input">
                    <option value="">Nenhum</option>
                    {cfops.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.description}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
                  <input {...register('name')} className="input" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
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
                  <input {...register('account_code')} placeholder="ex: 1.1.1.01" className="input" />
                </div>
                <div className="col-span-2">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      {...register('is_billing')}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Faturamento</span>
                    <span className="text-xs text-gray-400">(considera este lançamento no relatório de faturamento)</span>
                  </label>
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
