import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X, ChevronLeft } from 'lucide-react'
import {
  funcionariosApi, cargosApi, departamentosApi, sindicatosApi,
  type Funcionario, type FuncionarioCreate, type DependenteCreate,
} from '@/api/folha'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

const TIPOS_CONTRATO = ['clt', 'estagio', 'aprendiz', 'autonomo']
const REGIMES = ['clt', 'pro_labore']
const ESTADOS_CIVIS = ['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel']
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

type Tab = 'dados' | 'contrato' | 'banco' | 'dependentes'

const emptyForm = (): FuncionarioCreate => ({
  nome: '', cpf: '', pis_pasep: '', data_nascimento: '', sexo: '', estado_civil: '',
  grau_instrucao: '', logradouro: '', numero: '', complemento: '', bairro: '',
  cidade: '', uf: '', cep: '', data_admissao: '', tipo_contrato: 'clt',
  regime_trabalho: 'clt', matricula: '', cargo_id: undefined, departamento_id: undefined,
  sindicato_id: undefined, salario_base: 0, banco: '', agencia: '', conta_bancaria: '', tipo_conta: '',
  dependentes: [],
})

function fmtSalario(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FuncionariosPage() {
  const { company } = useCompany()
  const qc = useQueryClient()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<Funcionario | null>(null)
  const [form, setForm] = useState<FuncionarioCreate>(emptyForm())
  const [tab, setTab] = useState<Tab>('dados')
  const [showInativos, setShowInativos] = useState(false)
  const [inativarModal, setInativarModal] = useState<Funcionario | null>(null)
  const [motivo, setMotivo] = useState('')

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios', company?.id, showInativos],
    queryFn: () => funcionariosApi.list(company!.id, !showInativos).then(r => r.data),
    enabled: !!company,
  })

  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos', company?.id],
    queryFn: () => cargosApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos', company?.id],
    queryFn: () => departamentosApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const { data: sindicatos = [] } = useQuery({
    queryKey: ['sindicatos', company?.id],
    queryFn: () => sindicatosApi.list(company!.id).then(r => r.data),
    enabled: !!company,
  })

  const save = useMutation({
    mutationFn: () =>
      editing
        ? funcionariosApi.update(company!.id, editing.id, form).then(r => r.data)
        : funcionariosApi.create(company!.id, form).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); setView('list') },
  })

  const inativar = useMutation({
    mutationFn: () => funcionariosApi.inativar(company!.id, inativarModal!.id, motivo || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); setInativarModal(null); setMotivo('') },
  })

  function openNew() {
    setEditing(null)
    setForm(emptyForm())
    setTab('dados')
    setView('form')
  }

  function openEdit(f: Funcionario) {
    setEditing(f)
    setForm({
      nome: f.nome, cpf: f.cpf, pis_pasep: f.pis_pasep ?? '', data_nascimento: f.data_nascimento ?? '',
      sexo: f.sexo ?? '', estado_civil: f.estado_civil ?? '', grau_instrucao: f.grau_instrucao ?? '',
      logradouro: f.logradouro ?? '', numero: f.numero ?? '', complemento: f.complemento ?? '',
      bairro: f.bairro ?? '', cidade: f.cidade ?? '', uf: f.uf ?? '', cep: f.cep ?? '',
      data_admissao: f.data_admissao, tipo_contrato: f.tipo_contrato, regime_trabalho: f.regime_trabalho,
      matricula: f.matricula ?? '', cargo_id: f.cargo_id ?? undefined,
      departamento_id: f.departamento_id ?? undefined, sindicato_id: f.sindicato_id ?? undefined,
      salario_base: Number(f.salario_base), banco: f.banco ?? '', agencia: f.agencia ?? '',
      conta_bancaria: f.conta_bancaria ?? '', tipo_conta: f.tipo_conta ?? '',
      dependentes: f.dependentes.map(d => ({
        nome: d.nome, data_nascimento: d.data_nascimento ?? '', parentesco: d.parentesco ?? '',
        cpf: d.cpf ?? '', deduz_irrf: d.deduz_irrf,
      })),
    })
    setTab('dados')
    setView('form')
  }

  const set = (k: keyof FuncionarioCreate, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  function addDependente() {
    setForm(f => ({ ...f, dependentes: [...(f.dependentes ?? []), { nome: '', data_nascimento: '', parentesco: '', cpf: '', deduz_irrf: true }] }))
  }

  function updateDependente(idx: number, k: keyof DependenteCreate, v: unknown) {
    setForm(f => {
      const deps = [...(f.dependentes ?? [])]
      deps[idx] = { ...deps[idx], [k]: v } as DependenteCreate
      return { ...f, dependentes: deps }
    })
  }

  function removeDependente(idx: number) {
    setForm(f => ({ ...f, dependentes: (f.dependentes ?? []).filter((_, i) => i !== idx) }))
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dados', label: 'Dados Pessoais' },
    { key: 'contrato', label: 'Contrato & Salário' },
    { key: 'banco', label: 'Dados Bancários' },
    { key: 'dependentes', label: `Dependentes (${form.dependentes?.length ?? 0})` },
  ]

  if (view === 'form') {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft size={16} /> Funcionários
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold text-gray-900">{editing ? `Editar — ${editing.nome}` : 'Novo Funcionário'}</h1>
        </div>

        {editing && (
          <div className="mb-4 flex gap-4 text-xs text-gray-400">
            <span>Cód.: <span className="font-mono">{String(editing.codigo).padStart(4, '0')}</span></span>
            <span>Admissão: {editing.data_admissao}</span>
          </div>
        )}

        {/* Abas */}
        <div className="mb-5 flex gap-1 border-b border-gray-200">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          {/* Aba: Dados Pessoais */}
          {tab === 'dados' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Nome completo *</label>
                <input className="input w-full" value={form.nome} onChange={e => set('nome', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">CPF *</label>
                <input className="input w-full" placeholder="000.000.000-00" value={form.cpf} onChange={e => set('cpf', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">PIS/PASEP</label>
                <input className="input w-full" value={form.pis_pasep ?? ''} onChange={e => set('pis_pasep', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Data de Nascimento</label>
                <input type="date" className="input w-full" value={form.data_nascimento ?? ''} onChange={e => set('data_nascimento', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Sexo</label>
                <select className="input w-full" value={form.sexo ?? ''} onChange={e => set('sexo', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Estado Civil</label>
                <select className="input w-full" value={form.estado_civil ?? ''} onChange={e => set('estado_civil', e.target.value)}>
                  <option value="">Selecione</option>
                  {ESTADOS_CIVIS.map(ec => <option key={ec} value={ec}>{ec.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-2 border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Endereço</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Logradouro</label>
                    <input className="input w-full" value={form.logradouro ?? ''} onChange={e => set('logradouro', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Número</label>
                    <input className="input w-full" value={form.numero ?? ''} onChange={e => set('numero', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Complemento</label>
                    <input className="input w-full" value={form.complemento ?? ''} onChange={e => set('complemento', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Bairro</label>
                    <input className="input w-full" value={form.bairro ?? ''} onChange={e => set('bairro', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">CEP</label>
                    <input className="input w-full" placeholder="00000-000" value={form.cep ?? ''} onChange={e => set('cep', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Cidade</label>
                    <input className="input w-full" value={form.cidade ?? ''} onChange={e => set('cidade', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">UF</label>
                    <select className="input w-full" value={form.uf ?? ''} onChange={e => set('uf', e.target.value)}>
                      <option value="">UF</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Contrato */}
          {tab === 'contrato' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Data de Admissão *</label>
                <input type="date" className="input w-full" value={form.data_admissao} onChange={e => set('data_admissao', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Matrícula</label>
                <input className="input w-full" value={form.matricula ?? ''} onChange={e => set('matricula', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Tipo de Contrato</label>
                <select className="input w-full" value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)}>
                  {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Regime de Trabalho</label>
                <select className="input w-full" value={form.regime_trabalho} onChange={e => set('regime_trabalho', e.target.value)}>
                  {REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Cargo</label>
                <select className="input w-full" value={form.cargo_id ?? ''} onChange={e => set('cargo_id', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Selecione</option>
                  {cargos.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Departamento</label>
                <select className="input w-full" value={form.departamento_id ?? ''} onChange={e => set('departamento_id', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Selecione</option>
                  {departamentos.map(d => <option key={d.id} value={d.id}>{d.descricao}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Sindicato</label>
                <select className="input w-full" value={form.sindicato_id ?? ''} onChange={e => set('sindicato_id', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Nenhum</option>
                  {sindicatos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Salário Base (R$) *</label>
                <input type="number" step="0.01" className="input w-full" value={form.salario_base || ''} onChange={e => set('salario_base', Number(e.target.value))} />
              </div>
            </div>
          )}

          {/* Aba: Dados Bancários */}
          {tab === 'banco' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Banco</label>
                <input className="input w-full" placeholder="001" value={form.banco ?? ''} onChange={e => set('banco', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Agência</label>
                <input className="input w-full" value={form.agencia ?? ''} onChange={e => set('agencia', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Conta</label>
                <input className="input w-full" value={form.conta_bancaria ?? ''} onChange={e => set('conta_bancaria', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Tipo de Conta</label>
                <select className="input w-full" value={form.tipo_conta ?? ''} onChange={e => set('tipo_conta', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                </select>
              </div>
            </div>
          )}

          {/* Aba: Dependentes */}
          {tab === 'dependentes' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Dependentes para dedução de IRRF e E-Social.</p>
                <button onClick={addDependente} className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
                  <Plus size={14} /> Adicionar
                </button>
              </div>
              {(form.dependentes ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">Nenhum dependente cadastrado.</p>
              )}
              {(form.dependentes ?? []).map((dep, idx) => (
                <div key={idx} className="mb-4 rounded-lg border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Dependente {idx + 1}</span>
                    <button onClick={() => removeDependente(idx)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">Nome *</label>
                      <input className="input w-full" value={dep.nome} onChange={e => updateDependente(idx, 'nome', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Parentesco</label>
                      <input className="input w-full" value={dep.parentesco ?? ''} onChange={e => updateDependente(idx, 'parentesco', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">CPF</label>
                      <input className="input w-full" value={dep.cpf ?? ''} onChange={e => updateDependente(idx, 'cpf', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Data Nascimento</label>
                      <input type="date" className="input w-full" value={dep.data_nascimento ?? ''} onChange={e => updateDependente(idx, 'data_nascimento', e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={dep.deduz_irrf ?? true} onChange={e => updateDependente(idx, 'deduz_irrf', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                        Deduz IRRF
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setView('list')} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => save.mutate()} disabled={!form.nome || !form.cpf || !form.data_admissao || !form.salario_base || save.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
            {save.isPending ? 'Salvando...' : 'Salvar Funcionário'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Funcionários</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input type="checkbox" checked={showInativos} onChange={e => setShowInativos(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Ver inativos
          </label>
          {company && (
            <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              <Plus size={15} /> Novo Funcionário
            </button>
          )}
        </div>
      </div>

      {!company ? <NoCompanyBanner /> : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-4 py-3 w-16">Cód.</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Admissão</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3 text-right">Salário</th>
                <th className="px-4 py-3 w-36"></th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum funcionário {showInativos ? '' : 'ativo '}cadastrado.</td></tr>
              )}
              {funcionarios.map(f => (
                <tr key={f.id} className={`border-b border-gray-50 ${f.ativo ? 'hover:bg-gray-50' : 'opacity-50'}`}>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{String(f.codigo).padStart(4, '0')}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {f.nome}
                    {!f.ativo && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">Inativo</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{f.cpf}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{f.data_admissao}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {cargos.find(c => c.id === f.cargo_id)?.descricao ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-gray-600">{fmtSalario(Number(f.salario_base))}</td>
                  <td className="px-4 py-2">
                    {f.ativo && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(f)} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                          <Pencil size={12} /> Editar
                        </button>
                        <button onClick={() => { setInativarModal(f); setMotivo('') }} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                          <X size={12} /> Inativar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Inativar */}
      {inativarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-semibold text-gray-900">Inativar Funcionário</h2>
            <p className="mb-4 text-sm text-gray-500">{inativarModal.nome}</p>
            <div className="mb-5">
              <label className="mb-1 block text-xs font-medium text-gray-700">Motivo (opcional)</label>
              <input className="input w-full" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: pedido de demissão, rescisão..." />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setInativarModal(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => inativar.mutate()} disabled={inativar.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40">
                {inativar.isPending ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
