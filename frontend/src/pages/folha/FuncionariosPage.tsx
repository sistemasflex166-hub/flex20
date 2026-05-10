import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X, ChevronLeft } from 'lucide-react'
import {
  funcionariosApi, cargosApi, departamentosApi, sindicatosApi,
  type Funcionario, type FuncionarioCreate, type DependenteCreate,
} from '@/api/folha'
import { useCompany } from '@/contexts/CompanyContext'
import { NoCompanyBanner } from '@/components/fiscal/NoCompanyBanner'

// ── Tabelas de domínio E-Social ───────────────────────────────────────────────

const RACAS_COR = [
  { v: '1', l: '1 — Branca' }, { v: '2', l: '2 — Preta' }, { v: '3', l: '3 — Parda' },
  { v: '4', l: '4 — Amarela' }, { v: '5', l: '5 — Indígena' }, { v: '6', l: '6 — Não informado' },
]
const GRAUS_INSTRUCAO = [
  { v: '01', l: '01 — Analfabeto' }, { v: '02', l: '02 — Até 5ª incompleto' },
  { v: '03', l: '03 — 5ª completo fundamental' }, { v: '04', l: '04 — 6ª a 9ª fundamental' },
  { v: '05', l: '05 — Fundamental completo' }, { v: '06', l: '06 — Médio incompleto' },
  { v: '07', l: '07 — Médio completo' }, { v: '08', l: '08 — Superior incompleto' },
  { v: '09', l: '09 — Superior completo' }, { v: '10', l: '10 — Pós-graduação completa' },
  { v: '11', l: '11 — Mestrado completo' }, { v: '12', l: '12 — Doutorado completo' },
]
const ESTADOS_CIVIS = [
  { v: '1', l: '1 — Solteiro(a)' }, { v: '2', l: '2 — Casado(a)' },
  { v: '3', l: '3 — Divorciado(a)' }, { v: '4', l: '4 — Separado(a)' },
  { v: '5', l: '5 — Viúvo(a)' }, { v: '6', l: '6 — União estável' }, { v: '9', l: '9 — Outros' },
]
const TIPOS_ADMISSAO = [
  { v: '1', l: '1 — Admissão' },
  { v: '2', l: '2 — Transferência (mesmo grupo econômico)' },
  { v: '3', l: '3 — Transferência (consorciada / consórcio)' },
  { v: '4', l: '4 — Transferência (sucessão / incorporação / cisão / fusão)' },
  { v: '5', l: '5 — Transferência (empregado doméstico)' },
  { v: '6', l: '6 — Transferência (servidor — órgão de destino)' },
]
const TIPOS_REGIME_TRABALHO = [
  { v: '1', l: '1 — CLT' }, { v: '2', l: '2 — Estatutário e outras legislações' },
]
const REGIMES_PREV = [
  { v: '1', l: '1 — RGPS' }, { v: '2', l: '2 — RPPS' }, { v: '3', l: '3 — Regime próprio (militares)' },
]
const NATUREZAS_ATIVIDADE = [{ v: '1', l: '1 — Trabalho urbano' }, { v: '2', l: '2 — Trabalho rural' }]
const TIPOS_JORNADA = [
  { v: '1', l: '1 — Horário diário e semanal fixos' },
  { v: '2', l: '2 — Jornada 12×36' },
  { v: '3', l: '3 — Horário diário fixo / folga variável (escala)' },
  { v: '4', l: '4 — Turno ininterrupto de revezamento' },
  { v: '5', l: '5 — Horário diário variável (carga definida)' },
  { v: '6', l: '6 — Trabalhador externo — jornada não controlada' },
  { v: '7', l: '7 — Teletrabalho — jornada não controlada' },
]
const JORNADA_SEM_HORAS = new Set(['5', '6', '7'])
const CODIGOS_CATEGORIA = [
  { v: '101', l: '101 — Empregado geral (incl. emp. público CLT)' },
  { v: '102', l: '102 — Empregado rural por pequeno prazo' },
  { v: '103', l: '103 — Aprendiz' },
  { v: '104', l: '104 — Doméstico' },
  { v: '105', l: '105 — Prazo determinado — Lei 9.601/98' },
  { v: '106', l: '106 — Contrato intermitente' },
  { v: '111', l: '111 — Verde e amarelo (sem acordo parcial)' },
  { v: '301', l: '301 — Servidor efetivo / magistrado / ministro' },
  { v: '303', l: '303 — Cargo em comissão sem vínculo efetivo' },
  { v: '305', l: '305 — Indicado para conselho / órgão deliberativo' },
  { v: '401', l: '401 — Contribuinte individual — autônomo geral' },
  { v: '721', l: '721 — Estagiário — nível superior' },
  { v: '722', l: '722 — Estagiário — nível médio' },
  { v: '731', l: '731 — Contrib. ind. — desenvolvimento software' },
  { v: '734', l: '734 — Contrib. ind. — obras' },
  { v: '738', l: '738 — Contrib. ind. — demais' },
]
const TIPOS_CONTRATO = [
  { v: 'clt', l: 'CLT' }, { v: 'estagio', l: 'Estágio' },
  { v: 'aprendiz', l: 'Jovem Aprendiz' }, { v: 'autonomo', l: 'Autônomo' },
]
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const CNH_CATS = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']
const BRASIL = '105'

// Países mais comuns (E-Social)
const PAISES_COMUNS = [
  { v: '105', l: 'Brasil' }, { v: '149', l: 'EUA' }, { v: '175', l: 'Portugal' },
  { v: '032', l: 'Argentina' }, { v: '063', l: 'China' }, { v: '245', l: 'Venezuela' },
  { v: '119', l: 'Haiti' }, { v: '187', l: 'Paraguai' }, { v: '160', l: 'Colômbia' },
  { v: '158', l: 'Peru' }, { v: '039', l: 'Bolívia' }, { v: '230', l: 'Uruguai' },
]

type Tab = 'dados' | 'documentos' | 'contrato' | 'jornada' | 'banco' | 'dependentes'

const emptyForm = (): FuncionarioCreate => ({
  nome: '', nome_social: '', cpf: '', pis_pasep: '', data_nascimento: '', sexo: '',
  estado_civil: '', grau_instrucao: '', raca_cor: '', nome_mae: '', nome_pai: '',
  pais_nascimento: BRASIL, pais_nacionalidade: BRASIL, municipio_nascimento_ibge: '',
  rg: '', rg_orgao_emissor: '', rg_uf: '', rg_data_emissao: '',
  ctps_numero: '', ctps_serie: '', ctps_uf: '', ctps_data_emissao: '',
  titulo_eleitor: '', cnh: '', cnh_categoria: '', cnh_validade: '',
  possui_deficiencia: false, deficiencia_fisica: false, deficiencia_visual: false,
  deficiencia_auditiva: false, deficiencia_mental: false, deficiencia_intelectual: false,
  deficiencia_reabilitado: false, deficiencia_observacao: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
  codigo_municipio_ibge: '',
  data_admissao: '', tipo_admissao: '1', indicativo_admissao: '',
  tipo_contrato: 'clt', tipo_regime_trabalho: '1', matricula: '',
  codigo_categoria: '101', regime_previdenciario: '1', natureza_atividade: '1',
  opcao_fgts: true, data_opcao_fgts: '',
  tipo_jornada: '1', qtd_hrs_semanais: undefined, nr_dias_remuneracao: 30, desc_jornada: '',
  cargo_id: undefined, departamento_id: undefined, sindicato_id: undefined, salario_base: 0,
  banco: '', agencia: '', conta_bancaria: '', tipo_conta: '',
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

  const [saveError, setSaveError] = useState('')

  // Campos de data opcionais — string vazia deve virar undefined antes de enviar ao backend
  const DATE_FIELDS: (keyof FuncionarioCreate)[] = [
    'data_nascimento', 'rg_data_emissao', 'ctps_data_emissao',
    'cnh_validade', 'data_opcao_fgts',
  ]

  function sanitizeForm(f: FuncionarioCreate): FuncionarioCreate {
    const out = { ...f }
    for (const k of DATE_FIELDS) {
      if (out[k] === '') (out as any)[k] = undefined
    }
    // strings opcionais vazias → undefined para não poluir o payload
    const STR_OPT: (keyof FuncionarioCreate)[] = [
      'nome_social', 'pis_pasep', 'sexo', 'estado_civil', 'grau_instrucao', 'raca_cor',
      'nome_mae', 'nome_pai', 'municipio_nascimento_ibge',
      'rg', 'rg_orgao_emissor', 'rg_uf',
      'ctps_numero', 'ctps_serie', 'ctps_uf',
      'titulo_eleitor', 'cnh', 'cnh_categoria',
      'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep', 'codigo_municipio_ibge',
      'indicativo_admissao', 'matricula',
      'desc_jornada', 'deficiencia_observacao',
      'banco', 'agencia', 'conta_bancaria', 'tipo_conta',
    ]
    for (const k of STR_OPT) {
      if (out[k] === '') (out as any)[k] = undefined
    }
    return out
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = sanitizeForm(form)
      return editing
        ? funcionariosApi.update(company!.id, editing.id, payload).then(r => r.data)
        : funcionariosApi.create(company!.id, payload).then(r => r.data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); setView('list') },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      if (Array.isArray(detail)) {
        setSaveError(detail.map((d: any) => d.msg ?? d).join('; '))
      } else {
        setSaveError(detail ?? e?.message ?? 'Erro ao salvar funcionário')
      }
    },
  })

  const inativar = useMutation({
    mutationFn: () => funcionariosApi.inativar(company!.id, inativarModal!.id, motivo || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['funcionarios'] }); setInativarModal(null); setMotivo('') },
  })

  function openNew() { setEditing(null); setForm(emptyForm()); setTab('dados'); setView('form') }

  function openEdit(f: Funcionario) {
    setEditing(f)
    setForm({
      nome: f.nome, nome_social: f.nome_social ?? '', cpf: f.cpf,
      pis_pasep: f.pis_pasep ?? '', data_nascimento: f.data_nascimento ?? '',
      sexo: f.sexo ?? '', estado_civil: f.estado_civil ?? '',
      grau_instrucao: f.grau_instrucao ?? '', raca_cor: f.raca_cor ?? '',
      nome_mae: f.nome_mae ?? '', nome_pai: f.nome_pai ?? '',
      pais_nascimento: f.pais_nascimento ?? BRASIL,
      pais_nacionalidade: f.pais_nacionalidade ?? BRASIL,
      municipio_nascimento_ibge: f.municipio_nascimento_ibge ?? '',
      rg: f.rg ?? '', rg_orgao_emissor: f.rg_orgao_emissor ?? '',
      rg_uf: f.rg_uf ?? '', rg_data_emissao: f.rg_data_emissao ?? '',
      ctps_numero: f.ctps_numero ?? '', ctps_serie: f.ctps_serie ?? '',
      ctps_uf: f.ctps_uf ?? '', ctps_data_emissao: f.ctps_data_emissao ?? '',
      titulo_eleitor: f.titulo_eleitor ?? '', cnh: f.cnh ?? '',
      cnh_categoria: f.cnh_categoria ?? '', cnh_validade: f.cnh_validade ?? '',
      possui_deficiencia: f.possui_deficiencia, deficiencia_fisica: f.deficiencia_fisica,
      deficiencia_visual: f.deficiencia_visual, deficiencia_auditiva: f.deficiencia_auditiva,
      deficiencia_mental: f.deficiencia_mental, deficiencia_intelectual: f.deficiencia_intelectual,
      deficiencia_reabilitado: f.deficiencia_reabilitado,
      deficiencia_observacao: f.deficiencia_observacao ?? '',
      logradouro: f.logradouro ?? '', numero: f.numero ?? '',
      complemento: f.complemento ?? '', bairro: f.bairro ?? '',
      cidade: f.cidade ?? '', uf: f.uf ?? '', cep: f.cep ?? '',
      codigo_municipio_ibge: f.codigo_municipio_ibge ?? '',
      data_admissao: f.data_admissao, tipo_admissao: f.tipo_admissao,
      indicativo_admissao: f.indicativo_admissao ?? '',
      tipo_contrato: f.tipo_contrato, tipo_regime_trabalho: f.tipo_regime_trabalho,
      matricula: f.matricula ?? '', codigo_categoria: f.codigo_categoria,
      regime_previdenciario: f.regime_previdenciario,
      natureza_atividade: f.natureza_atividade,
      opcao_fgts: f.opcao_fgts, data_opcao_fgts: f.data_opcao_fgts ?? '',
      tipo_jornada: f.tipo_jornada,
      qtd_hrs_semanais: f.qtd_hrs_semanais ?? undefined,
      nr_dias_remuneracao: f.nr_dias_remuneracao ?? 30,
      desc_jornada: f.desc_jornada ?? '',
      cargo_id: f.cargo_id ?? undefined, departamento_id: f.departamento_id ?? undefined,
      sindicato_id: f.sindicato_id ?? undefined, salario_base: Number(f.salario_base),
      banco: f.banco ?? '', agencia: f.agencia ?? '',
      conta_bancaria: f.conta_bancaria ?? '', tipo_conta: f.tipo_conta ?? '',
      dependentes: f.dependentes.map(d => ({
        nome: d.nome, data_nascimento: d.data_nascimento ?? '',
        parentesco: d.parentesco ?? '', cpf: d.cpf ?? '', deduz_irrf: d.deduz_irrf,
      })),
    })
    setTab('dados'); setView('form')
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
    { key: 'documentos', label: 'Documentos' },
    { key: 'contrato', label: 'Contrato' },
    { key: 'jornada', label: 'Jornada' },
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
        <div className="mb-5 flex gap-1 border-b border-gray-200">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">

          {/* ── ABA: Dados Pessoais ── */}
          {tab === 'dados' && (
            <div className="space-y-6">
              {/* Identificação */}
              <div className="grid grid-cols-12 gap-3">
                {/* Nome completo — 7 colunas */}
                <div className="col-span-7">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nome completo *</label>
                  <input className="input w-full" value={form.nome} onChange={e => set('nome', e.target.value)} />
                </div>
                {/* CPF — 3 colunas */}
                <div className="col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700">CPF *</label>
                  <input className="input w-full" placeholder="000.000.000-00" value={form.cpf} onChange={e => set('cpf', e.target.value)} />
                </div>
                {/* PIS — 2 colunas */}
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">PIS/PASEP/NIT</label>
                  <input className="input w-full" value={form.pis_pasep ?? ''} onChange={e => set('pis_pasep', e.target.value)} />
                </div>
                {/* Nome social — 7 colunas */}
                <div className="col-span-7">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nome social</label>
                  <input className="input w-full" placeholder="Preencher somente se diferente do nome civil" value={form.nome_social ?? ''} onChange={e => set('nome_social', e.target.value)} />
                </div>
                {/* Data nascimento — 2 colunas */}
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nascimento</label>
                  <input type="date" className="input w-full" value={form.data_nascimento ?? ''} onChange={e => set('data_nascimento', e.target.value)} />
                </div>
                {/* Sexo — 1 coluna */}
                <div className="col-span-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Sexo</label>
                  <select className="input w-full" value={form.sexo ?? ''} onChange={e => set('sexo', e.target.value)}>
                    <option value="">—</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
                {/* Estado Civil — 2 colunas */}
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Estado Civil</label>
                  <select className="input w-full" value={form.estado_civil ?? ''} onChange={e => set('estado_civil', e.target.value)}>
                    <option value="">—</option>
                    {ESTADOS_CIVIS.map(ec => <option key={ec.v} value={ec.v}>{ec.l}</option>)}
                  </select>
                </div>
                {/* Grau instrução — 5 colunas */}
                <div className="col-span-5">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Grau de Instrução</label>
                  <select className="input w-full" value={form.grau_instrucao ?? ''} onChange={e => set('grau_instrucao', e.target.value)}>
                    <option value="">Selecione</option>
                    {GRAUS_INSTRUCAO.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
                  </select>
                </div>
                {/* Raça/Cor — 3 colunas */}
                <div className="col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Raça/Cor</label>
                  <select className="input w-full" value={form.raca_cor ?? ''} onChange={e => set('raca_cor', e.target.value)}>
                    <option value="">Selecione</option>
                    {RACAS_COR.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </div>
              </div>

              {/* Filiação */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Filiação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Nome da mãe</label>
                    <input className="input w-full" value={form.nome_mae ?? ''} onChange={e => set('nome_mae', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Nome do pai</label>
                    <input className="input w-full" value={form.nome_pai ?? ''} onChange={e => set('nome_pai', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Naturalidade */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Naturalidade</p>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <label className="mb-1 block text-xs font-medium text-gray-700">País de nascimento</label>
                    <select className="input w-full" value={form.pais_nascimento ?? BRASIL} onChange={e => set('pais_nascimento', e.target.value)}>
                      {PAISES_COMUNS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="mb-1 block text-xs font-medium text-gray-700">País de nacionalidade</label>
                    <select className="input w-full" value={form.pais_nacionalidade ?? BRASIL} onChange={e => set('pais_nacionalidade', e.target.value)}>
                      {PAISES_COMUNS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select>
                  </div>
                  {(form.pais_nascimento ?? BRASIL) === BRASIL && (
                    <div className="col-span-4">
                      <label className="mb-1 block text-xs font-medium text-gray-700">Município nascimento (IBGE) *</label>
                      <input className="input w-full" placeholder="0000000" value={form.municipio_nascimento_ibge ?? ''} onChange={e => set('municipio_nascimento_ibge', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>

              {/* Deficiência */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Deficiência / Reabilitação</p>
                <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.possui_deficiencia ?? false}
                    onChange={e => set('possui_deficiencia', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  Possui deficiência
                </label>
                {form.possui_deficiencia && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-4">
                      {([
                        { k: 'deficiencia_fisica', l: 'Física' }, { k: 'deficiencia_visual', l: 'Visual' },
                        { k: 'deficiencia_auditiva', l: 'Auditiva' }, { k: 'deficiencia_mental', l: 'Mental' },
                        { k: 'deficiencia_intelectual', l: 'Intelectual' },
                      ] as const).map(d => (
                        <label key={d.k} className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="checkbox"
                            checked={(form[d.k as keyof FuncionarioCreate] as boolean) ?? false}
                            onChange={e => set(d.k as keyof FuncionarioCreate, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300" />
                          {d.l}
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={form.deficiencia_reabilitado ?? false}
                        onChange={e => set('deficiencia_reabilitado', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                      Reabilitado pelo INSS
                    </label>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Observação</label>
                      <input className="input w-full" value={form.deficiencia_observacao ?? ''} onChange={e => set('deficiencia_observacao', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Endereço */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Endereço</p>
                <div className="grid grid-cols-12 gap-3">
                  {/* Logradouro — 7 colunas */}
                  <div className="col-span-7">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Logradouro</label>
                    <input className="input w-full" value={form.logradouro ?? ''} onChange={e => set('logradouro', e.target.value)} />
                  </div>
                  {/* Número — 2 colunas */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Número</label>
                    <input className="input w-full" value={form.numero ?? ''} onChange={e => set('numero', e.target.value)} />
                  </div>
                  {/* Complemento — 3 colunas */}
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Complemento</label>
                    <input className="input w-full" value={form.complemento ?? ''} onChange={e => set('complemento', e.target.value)} />
                  </div>
                  {/* Bairro — 4 colunas */}
                  <div className="col-span-4">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Bairro</label>
                    <input className="input w-full" value={form.bairro ?? ''} onChange={e => set('bairro', e.target.value)} />
                  </div>
                  {/* CEP — 2 colunas */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">CEP</label>
                    <input className="input w-full" placeholder="00000-000" value={form.cep ?? ''} onChange={e => set('cep', e.target.value)} />
                  </div>
                  {/* Cidade — 3 colunas */}
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Cidade</label>
                    <input className="input w-full" value={form.cidade ?? ''} onChange={e => set('cidade', e.target.value)} />
                  </div>
                  {/* UF — 1 coluna */}
                  <div className="col-span-1">
                    <label className="mb-1 block text-xs font-medium text-gray-700">UF</label>
                    <select className="input w-full" value={form.uf ?? ''} onChange={e => set('uf', e.target.value)}>
                      <option value="">—</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  {/* Cód IBGE residência — 2 colunas */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Cód. IBGE (residência)</label>
                    <input className="input w-full" placeholder="0000000" value={form.codigo_municipio_ibge ?? ''} onChange={e => set('codigo_municipio_ibge', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ── ABA: Documentos ── */}
          {tab === 'documentos' && (
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">RG</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Número</label>
                    <input className="input w-full" value={form.rg ?? ''} onChange={e => set('rg', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Órgão Emissor</label>
                    <input className="input w-full" placeholder="SSP" value={form.rg_orgao_emissor ?? ''} onChange={e => set('rg_orgao_emissor', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">UF</label>
                    <select className="input w-full" value={form.rg_uf ?? ''} onChange={e => set('rg_uf', e.target.value)}>
                      <option value="">UF</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Data de Emissão</label>
                    <input type="date" className="input w-full" value={form.rg_data_emissao ?? ''} onChange={e => set('rg_data_emissao', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">CTPS</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Número</label>
                    <input className="input w-full" value={form.ctps_numero ?? ''} onChange={e => set('ctps_numero', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Série</label>
                    <input className="input w-full" value={form.ctps_serie ?? ''} onChange={e => set('ctps_serie', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">UF</label>
                    <select className="input w-full" value={form.ctps_uf ?? ''} onChange={e => set('ctps_uf', e.target.value)}>
                      <option value="">UF</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Data de Emissão</label>
                    <input type="date" className="input w-full" value={form.ctps_data_emissao ?? ''} onChange={e => set('ctps_data_emissao', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Outros Documentos</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Título de Eleitor</label>
                    <input className="input w-full" value={form.titulo_eleitor ?? ''} onChange={e => set('titulo_eleitor', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">CNH</label>
                    <input className="input w-full" value={form.cnh ?? ''} onChange={e => set('cnh', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Categoria CNH</label>
                    <select className="input w-full" value={form.cnh_categoria ?? ''} onChange={e => set('cnh_categoria', e.target.value)}>
                      <option value="">—</option>
                      {CNH_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Validade CNH</label>
                    <input type="date" className="input w-full" value={form.cnh_validade ?? ''} onChange={e => set('cnh_validade', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA: Contrato ── */}
          {tab === 'contrato' && (
            <div className="space-y-6">
              {/* Admissão */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Data de Admissão *</label>
                  <input type="date" className="input w-full" value={form.data_admissao} onChange={e => set('data_admissao', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tipo de Admissão</label>
                  <select className="input w-full" value={form.tipo_admissao ?? '1'} onChange={e => set('tipo_admissao', e.target.value)}>
                    {TIPOS_ADMISSAO.map(i => <option key={i.v} value={i.v}>{i.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Indicativo de Admissão</label>
                  <select className="input w-full" value={form.indicativo_admissao ?? ''} onChange={e => set('indicativo_admissao', e.target.value || undefined)}>
                    <option value="">Nenhum</option>
                    <option value="1">1 — Demitido pelo mesmo empregador nos últimos 18 meses</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Matrícula</label>
                  <input className="input w-full" value={form.matricula ?? ''} onChange={e => set('matricula', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tipo de Contrato</label>
                  <select className="input w-full" value={form.tipo_contrato ?? 'clt'} onChange={e => set('tipo_contrato', e.target.value)}>
                    {TIPOS_CONTRATO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
              </div>

              {/* Regime e Categoria (E-Social) */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Regime e Categoria E-Social</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Código de Categoria</label>
                    <select className="input w-full" value={form.codigo_categoria ?? '101'} onChange={e => set('codigo_categoria', e.target.value)}>
                      {CODIGOS_CATEGORIA.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Regime de Trabalho</label>
                    <select className="input w-full" value={form.tipo_regime_trabalho ?? '1'} onChange={e => set('tipo_regime_trabalho', e.target.value)}>
                      {TIPOS_REGIME_TRABALHO.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Regime Previdenciário</label>
                    <select className="input w-full" value={form.regime_previdenciario ?? '1'} onChange={e => set('regime_previdenciario', e.target.value)}>
                      {REGIMES_PREV.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Natureza da Atividade</label>
                    <select className="input w-full" value={form.natureza_atividade ?? '1'} onChange={e => set('natureza_atividade', e.target.value)}>
                      {NATUREZAS_ATIVIDADE.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* FGTS */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">FGTS</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.opcao_fgts ?? true}
                        onChange={e => set('opcao_fgts', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                      Optante pelo FGTS
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Data da Opção FGTS</label>
                    <input type="date" className="input w-full" value={form.data_opcao_fgts ?? ''} onChange={e => set('data_opcao_fgts', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Lotação e salário */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Lotação e Remuneração</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Cargo</label>
                    <select className="input w-full" value={form.cargo_id ?? ''} onChange={e => set('cargo_id', e.target.value ? Number(e.target.value) : undefined)}>
                      <option value="">Selecione</option>
                      {cargos.map(c => <option key={c.id} value={c.id}>{c.descricao}{c.cbo ? ` — CBO ${c.cbo}` : ''}</option>)}
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
                    <input type="number" step="0.01" className="input w-full" value={form.salario_base || ''}
                      onChange={e => set('salario_base', Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA: Jornada ── */}
          {tab === 'jornada' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tipo de Jornada</label>
                  <select className="input w-full" value={form.tipo_jornada ?? '1'} onChange={e => set('tipo_jornada', e.target.value)}>
                    {TIPOS_JORNADA.map(j => <option key={j.v} value={j.v}>{j.l}</option>)}
                  </select>
                  {JORNADA_SEM_HORAS.has(form.tipo_jornada ?? '1') && (
                    <p className="mt-1 text-xs text-amber-600">Não informar horas semanais para este tipo de jornada.</p>
                  )}
                </div>
                {!JORNADA_SEM_HORAS.has(form.tipo_jornada ?? '1') && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Qtd. Horas Semanais</label>
                    <input type="number" step="0.5" className="input w-full" placeholder="44"
                      value={form.qtd_hrs_semanais ?? ''}
                      onChange={e => set('qtd_hrs_semanais', e.target.value ? Number(e.target.value) : undefined)} />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Número de Dias de Remuneração</label>
                  <input type="number" className="input w-full" placeholder="30"
                    value={form.nr_dias_remuneracao ?? ''}
                    onChange={e => set('nr_dias_remuneracao', e.target.value ? Number(e.target.value) : undefined)} />
                  <p className="mt-1 text-xs text-gray-400">30 para mensalistas. Diaristas/horistas: conforme contrato.</p>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Descrição do Horário Contratual</label>
                  <input className="input w-full" placeholder="Ex: Seg-Sex 08:00–12:00 / 13:00–17:00"
                    value={form.desc_jornada ?? ''} onChange={e => set('desc_jornada', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── ABA: Dados Bancários ── */}
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

          {/* ── ABA: Dependentes ── */}
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
                        <input type="checkbox" checked={dep.deduz_irrf ?? true}
                          onChange={e => updateDependente(idx, 'deduz_irrf', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                        Deduz IRRF
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {saveError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => { setView('list'); setSaveError('') }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { setSaveError(''); save.mutate() }}
            disabled={!form.nome || !form.cpf || !form.data_admissao || form.salario_base == null || save.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
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
              <button onClick={() => inativar.mutate()} disabled={inativar.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40">
                {inativar.isPending ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
