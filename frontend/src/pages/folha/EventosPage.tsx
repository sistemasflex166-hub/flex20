import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X, Check } from 'lucide-react'
import { eventosApi, type Evento, type EventoCreate } from '@/api/folha'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const empty: EventoCreate = {
  descricao: '', tipo: 'provento', natureza: 'fixo',
  incide_inss: false, incide_irrf: false, incide_fgts: false,
  incide_ferias: false, incide_decimo_terceiro: false, incide_aviso_previo: false,
  gera_lancamento_contabil: true,
}

const INCIDENCIAS: { key: keyof EventoCreate; label: string }[] = [
  { key: 'incide_inss', label: 'INSS' },
  { key: 'incide_irrf', label: 'IRRF' },
  { key: 'incide_fgts', label: 'FGTS' },
  { key: 'incide_ferias', label: 'Férias' },
  { key: 'incide_decimo_terceiro', label: '13º' },
  { key: 'incide_aviso_previo', label: 'Aviso' },
]

function Dot({ val }: { val: boolean }) {
  return val
    ? <Check size={13} className="text-green-500" />
    : <span className="text-gray-300">—</span>
}

export function EventosPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Evento | null>(null)
  const [form, setForm] = useState<EventoCreate>(empty)

  const { data: items = [] } = useQuery({
    queryKey: ['eventos-folha', company?.id],
    queryFn: () => eventosApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const save = useMutation({
    mutationFn: () =>
      editing
        ? eventosApi.update(company!.id, editing.id, form).then(r => r.data)
        : eventosApi.create(company!.id, form).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eventos-folha'] }); closeModal() },
  })

  const inativar = useMutation({
    mutationFn: (id: number) => eventosApi.inativar(company!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventos-folha'] }),
  })

  function openNew() { setEditing(null); setForm(empty); setModal(true) }
  function openEdit(e: Evento) {
    setEditing(e)
    setForm({
      descricao: e.descricao, tipo: e.tipo, natureza: e.natureza,
      incide_inss: e.incide_inss, incide_irrf: e.incide_irrf, incide_fgts: e.incide_fgts,
      incide_ferias: e.incide_ferias, incide_decimo_terceiro: e.incide_decimo_terceiro,
      incide_aviso_previo: e.incide_aviso_previo, gera_lancamento_contabil: e.gera_lancamento_contabil,
    })
    setModal(true)
  }
  function closeModal() { setModal(false); setEditing(null) }

  const set = (k: keyof EventoCreate, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Eventos da Folha</h1>
        {company && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus size={15} /> Novo Evento
          </button>
        )}
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-3 py-3 w-14">Cód.</th>
                <th className="px-3 py-3">Descrição</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Natureza</th>
                <th className="px-3 py-3 text-center">INSS</th>
                <th className="px-3 py-3 text-center">IRRF</th>
                <th className="px-3 py-3 text-center">FGTS</th>
                <th className="px-3 py-3 text-center">Férias</th>
                <th className="px-3 py-3 text-center">13º</th>
                <th className="px-3 py-3 text-center">Aviso</th>
                <th className="px-3 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum evento cadastrado.</td></tr>
              )}
              {items.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">{String(e.codigo).padStart(4, '0')}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{e.descricao}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${e.tipo === 'provento' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {e.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{e.natureza}</td>
                  <td className="px-3 py-2 text-center"><Dot val={e.incide_inss} /></td>
                  <td className="px-3 py-2 text-center"><Dot val={e.incide_irrf} /></td>
                  <td className="px-3 py-2 text-center"><Dot val={e.incide_fgts} /></td>
                  <td className="px-3 py-2 text-center"><Dot val={e.incide_ferias} /></td>
                  <td className="px-3 py-2 text-center"><Dot val={e.incide_decimo_terceiro} /></td>
                  <td className="px-3 py-2 text-center"><Dot val={e.incide_aviso_previo} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(e)} className="flex items-center gap-1 text-xs text-brand-600 hover:underline"><Pencil size={12} /> Editar</button>
                      <button onClick={() => inativar.mutate(e.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline"><X size={12} /> Inativar</button>
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{editing ? 'Editar Evento' : 'Novo Evento'}</h2>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">Descrição *</label>
              <input className="input w-full" value={form.descricao} onChange={e => set('descricao', e.target.value)} />
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Tipo *</label>
                <select className="input w-full" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  <option value="provento">Provento</option>
                  <option value="desconto">Desconto</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Natureza *</label>
                <select className="input w-full" value={form.natureza} onChange={e => set('natureza', e.target.value)}>
                  <option value="fixo">Fixo</option>
                  <option value="variavel">Variável</option>
                  <option value="percentual">Percentual</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-gray-700">Incidências</p>
              <div className="grid grid-cols-3 gap-2">
                {INCIDENCIAS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={!!form[key]}
                      onChange={e => set(key, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={!!form.gera_lancamento_contabil}
                  onChange={e => set('gera_lancamento_contabil', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600"
                />
                Gera lançamento contábil
              </label>
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
