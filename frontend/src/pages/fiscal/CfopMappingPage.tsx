import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  listCfopMappings,
  createCfopMapping,
  deleteCfopMapping,
  type CfopMapping,
  type CfopMappingCreate,
} from '@/api/nfeImport'

const EMPTY: CfopMappingCreate = {
  cfop_origin: '',
  cfop_destination: '',
  company_id: null,
  description: '',
}

export function CfopMappingPage() {
  const { user } = useAuth()
  const tenantId = user?.role === 'platform_admin' ? 1 : undefined
  const qc = useQueryClient()
  const [form, setForm] = useState<CfopMappingCreate>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['cfop-mappings', tenantId],
    queryFn: () => listCfopMappings(undefined, tenantId),
  })

  const createMutation = useMutation({
    mutationFn: (body: CfopMappingCreate) => createCfopMapping(body, tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cfop-mappings'] })
      setForm(EMPTY)
      setFormError(null)
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.detail ?? 'Erro ao salvar.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCfopMapping(id, tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cfop-mappings'] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cfop_origin || !form.cfop_destination) {
      setFormError('Preencha o CFOP de origem e o CFOP de destino.')
      return
    }
    createMutation.mutate({
      ...form,
      company_id: form.company_id || null,
      description: form.description || null,
    })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold text-gray-800">Mapeamento de CFOP</h1>
      <p className="mb-6 text-sm text-gray-500">
        De-para entre o CFOP do fornecedor (saída dele) e o CFOP de entrada que será usado no
        lançamento. Aplica-se somente a notas de entrada.
      </p>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Novo mapeamento</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">CFOP de origem (fornecedor)</label>
            <input
              type="text"
              maxLength={5}
              placeholder="ex: 6102"
              value={form.cfop_origin}
              onChange={(e) => setForm({ ...form, cfop_origin: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <ArrowRight size={18} className="mb-2.5 shrink-0 text-gray-400" />

          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">CFOP de entrada (destino)</label>
            <input
              type="text"
              maxLength={5}
              placeholder="ex: 2102"
              value={form.cfop_destination}
              onChange={(e) => setForm({ ...form, cfop_destination: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex-[2]">
            <label className="mb-1 block text-xs text-gray-500">Descrição (opcional)</label>
            <input
              type="text"
              placeholder="ex: Compra de mercadoria para revenda"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus size={15} />
            Adicionar
          </button>
        </div>

        {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
      </form>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-gray-400">Carregando...</p>
        ) : mappings.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            Nenhum mapeamento cadastrado. Adicione um acima.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">CFOP Origem</th>
                <th className="px-5 py-3 text-left"></th>
                <th className="px-5 py-3 text-left">CFOP Destino</th>
                <th className="px-5 py-3 text-left">Descrição</th>
                <th className="px-5 py-3 text-left">Escopo</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m: CfopMapping) => (
                <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono font-semibold text-gray-800">
                    {m.cfop_origin}
                  </td>
                  <td className="px-1 text-gray-300">
                    <ArrowRight size={14} />
                  </td>
                  <td className="px-5 py-3 font-mono font-semibold text-brand-700">
                    {m.cfop_destination}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{m.description ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {m.company_id ? `Empresa #${m.company_id}` : 'Escritório (geral)'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(m.id)}
                      className="text-gray-400 hover:text-red-500"
                      title="Remover"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
