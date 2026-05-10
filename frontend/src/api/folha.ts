import api from './client'

export interface Cargo {
  id: number
  company_id: number
  codigo: number
  descricao: string
  cbo: string | null
  salario_normativo: number | null
  ativo: boolean
}

export interface CargoCreate {
  descricao: string
  cbo?: string
  salario_normativo?: number
}

export interface Departamento {
  id: number
  company_id: number
  codigo: number
  descricao: string
  ativo: boolean
}

export interface Sindicato {
  id: number
  company_id: number
  codigo: number
  nome: string
  cnpj: string | null
  data_base: string | null
  percentual_contribuicao: number
  ativo: boolean
}

export interface SindicatoCreate {
  nome: string
  cnpj?: string
  data_base?: string
  percentual_contribuicao?: number
}

export interface Evento {
  id: number
  company_id: number
  codigo: number
  descricao: string
  tipo: string        // provento / desconto
  natureza: string    // fixo / variavel / percentual
  incide_inss: boolean
  incide_irrf: boolean
  incide_fgts: boolean
  incide_ferias: boolean
  incide_decimo_terceiro: boolean
  incide_aviso_previo: boolean
  conta_debito_id: number | null
  conta_credito_id: number | null
  historico_padrao_id: number | null
  gera_lancamento_contabil: boolean
  ativo: boolean
}

export interface EventoCreate {
  descricao: string
  tipo: string
  natureza: string
  incide_inss?: boolean
  incide_irrf?: boolean
  incide_fgts?: boolean
  incide_ferias?: boolean
  incide_decimo_terceiro?: boolean
  incide_aviso_previo?: boolean
  conta_debito_id?: number
  conta_credito_id?: number
  historico_padrao_id?: number
  gera_lancamento_contabil?: boolean
}

export interface Dependente {
  id: number
  funcionario_id: number
  nome: string
  data_nascimento: string | null
  parentesco: string | null
  cpf: string | null
  deduz_irrf: boolean
}

export interface DependenteCreate {
  nome: string
  data_nascimento?: string
  parentesco?: string
  cpf?: string
  deduz_irrf?: boolean
}

export interface Funcionario {
  id: number
  company_id: number
  codigo: number
  // Identificação
  nome: string
  nome_social: string | null
  cpf: string
  pis_pasep: string | null
  data_nascimento: string | null
  sexo: string | null
  estado_civil: string | null        // código E-Social: 1-9
  grau_instrucao: string | null      // código E-Social: 01-12
  raca_cor: string | null            // código E-Social: 1-6
  nome_mae: string | null
  nome_pai: string | null
  // Naturalidade
  pais_nascimento: string
  pais_nacionalidade: string
  municipio_nascimento_ibge: string | null
  // Documentos
  rg: string | null
  rg_orgao_emissor: string | null
  rg_uf: string | null
  rg_data_emissao: string | null
  ctps_numero: string | null
  ctps_serie: string | null
  ctps_uf: string | null
  ctps_data_emissao: string | null
  titulo_eleitor: string | null
  cnh: string | null
  cnh_categoria: string | null
  cnh_validade: string | null
  // Deficiência
  possui_deficiencia: boolean
  deficiencia_fisica: boolean
  deficiencia_visual: boolean
  deficiencia_auditiva: boolean
  deficiencia_mental: boolean
  deficiencia_intelectual: boolean
  deficiencia_reabilitado: boolean
  deficiencia_observacao: string | null
  // Endereço
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  codigo_municipio_ibge: string | null
  // Contrato E-Social
  data_admissao: string
  tipo_admissao: string              // tpAdmissao: 1-6
  indicativo_admissao: string | null // indAdmissao
  tipo_contrato: string
  tipo_regime_trabalho: string       // tpRegTrab: 1=CLT 2=Estatutário
  matricula: string | null
  codigo_categoria: string           // codCateg
  regime_previdenciario: string      // tpRegPrev: 1-3
  natureza_atividade: string         // 1=Urbano 2=Rural
  opcao_fgts: boolean
  data_opcao_fgts: string | null
  // Horário contratual
  tipo_jornada: string               // tpJornada: 1-7
  qtd_hrs_semanais: number | null
  nr_dias_remuneracao: number | null
  desc_jornada: string | null
  // Lotação
  cargo_id: number | null
  departamento_id: number | null
  sindicato_id: number | null
  salario_base: number
  // Banco
  banco: string | null
  agencia: string | null
  conta_bancaria: string | null
  tipo_conta: string | null
  ativo: boolean
  data_inativacao: string | null
  motivo_inativacao: string | null
  dependentes: Dependente[]
}

export interface FuncionarioCreate {
  // Identificação
  nome: string
  nome_social?: string
  cpf: string
  pis_pasep?: string
  data_nascimento?: string
  sexo?: string
  estado_civil?: string
  grau_instrucao?: string
  raca_cor?: string
  nome_mae?: string
  nome_pai?: string
  // Naturalidade
  pais_nascimento?: string
  pais_nacionalidade?: string
  municipio_nascimento_ibge?: string
  // Documentos
  rg?: string
  rg_orgao_emissor?: string
  rg_uf?: string
  rg_data_emissao?: string
  ctps_numero?: string
  ctps_serie?: string
  ctps_uf?: string
  ctps_data_emissao?: string
  titulo_eleitor?: string
  cnh?: string
  cnh_categoria?: string
  cnh_validade?: string
  // Deficiência
  possui_deficiencia?: boolean
  deficiencia_fisica?: boolean
  deficiencia_visual?: boolean
  deficiencia_auditiva?: boolean
  deficiencia_mental?: boolean
  deficiencia_intelectual?: boolean
  deficiencia_reabilitado?: boolean
  deficiencia_observacao?: string
  // Endereço
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  codigo_municipio_ibge?: string
  // Contrato
  data_admissao: string
  tipo_admissao?: string
  indicativo_admissao?: string
  tipo_contrato?: string
  tipo_regime_trabalho?: string
  matricula?: string
  codigo_categoria?: string
  regime_previdenciario?: string
  natureza_atividade?: string
  opcao_fgts?: boolean
  data_opcao_fgts?: string
  // Horário
  tipo_jornada?: string
  qtd_hrs_semanais?: number
  nr_dias_remuneracao?: number
  desc_jornada?: string
  // Lotação
  cargo_id?: number
  departamento_id?: number
  sindicato_id?: number
  salario_base: number
  // Banco
  banco?: string
  agencia?: string
  conta_bancaria?: string
  tipo_conta?: string
  dependentes?: DependenteCreate[]
}

export interface FaixaINSS {
  limite: number | null
  aliquota: number
}

export interface FaixaIRRF {
  limite: number | null
  aliquota: number
  parcela_deduzir: number
}

export interface TabelaINSS {
  id: number
  competencia_inicio: string
  competencia_fim: string | null
  faixas: FaixaINSS[]
  teto_contribuicao: number
}

export interface TabelaINSSCreate {
  competencia_inicio: string
  competencia_fim?: string
  faixas: FaixaINSS[]
  teto_contribuicao: number
}

export interface TabelaIRRF {
  id: number
  competencia_inicio: string
  competencia_fim: string | null
  faixas: FaixaIRRF[]
  valor_dependente: number
  desconto_simplificado: number
}

export interface TabelaIRRFCreate {
  competencia_inicio: string
  competencia_fim?: string
  faixas: FaixaIRRF[]
  valor_dependente: number
  desconto_simplificado: number
}

const base = (companyId: number) => ({ params: { company_id: companyId } })

export const cargosApi = {
  list: (companyId: number, apenasAtivos = true) =>
    api.get<Cargo[]>('/folha/cargos', { params: { company_id: companyId, apenas_ativos: apenasAtivos } }),
  create: (companyId: number, data: CargoCreate) =>
    api.post<Cargo>(`/folha/cargos?company_id=${companyId}`, data),
  update: (companyId: number, id: number, data: Partial<CargoCreate>) =>
    api.patch<Cargo>(`/folha/cargos/${id}?company_id=${companyId}`, data),
  inativar: (companyId: number, id: number) =>
    api.patch<Cargo>(`/folha/cargos/${id}/inativar?company_id=${companyId}`),
}

export const departamentosApi = {
  list: (companyId: number, apenasAtivos = true) =>
    api.get<Departamento[]>('/folha/departamentos', { params: { company_id: companyId, apenas_ativos: apenasAtivos } }),
  create: (companyId: number, data: { descricao: string }) =>
    api.post<Departamento>(`/folha/departamentos?company_id=${companyId}`, data),
  update: (companyId: number, id: number, data: { descricao?: string }) =>
    api.patch<Departamento>(`/folha/departamentos/${id}?company_id=${companyId}`, data),
  inativar: (companyId: number, id: number) =>
    api.patch<Departamento>(`/folha/departamentos/${id}/inativar?company_id=${companyId}`),
}

export const sindicatosApi = {
  list: (companyId: number, apenasAtivos = true) =>
    api.get<Sindicato[]>('/folha/sindicatos', { params: { company_id: companyId, apenas_ativos: apenasAtivos } }),
  create: (companyId: number, data: SindicatoCreate) =>
    api.post<Sindicato>(`/folha/sindicatos?company_id=${companyId}`, data),
  update: (companyId: number, id: number, data: Partial<SindicatoCreate>) =>
    api.patch<Sindicato>(`/folha/sindicatos/${id}?company_id=${companyId}`, data),
  inativar: (companyId: number, id: number) =>
    api.patch<Sindicato>(`/folha/sindicatos/${id}/inativar?company_id=${companyId}`),
}

export const eventosApi = {
  list: (companyId: number, apenasAtivos = true) =>
    api.get<Evento[]>('/folha/eventos', { params: { company_id: companyId, apenas_ativos: apenasAtivos } }),
  create: (companyId: number, data: EventoCreate) =>
    api.post<Evento>(`/folha/eventos?company_id=${companyId}`, data),
  update: (companyId: number, id: number, data: Partial<EventoCreate>) =>
    api.patch<Evento>(`/folha/eventos/${id}?company_id=${companyId}`, data),
  inativar: (companyId: number, id: number) =>
    api.patch<Evento>(`/folha/eventos/${id}/inativar?company_id=${companyId}`),
}

export interface EventoResumo {
  id: number
  codigo: number
  descricao: string
  tipo: string
  natureza: string
}

export interface FuncionarioResumo {
  id: number
  codigo: number
  nome: string
}

export interface LancamentoVariavel {
  id: number
  company_id: number
  codigo: number
  folha_id: number
  funcionario_id: number
  evento_id: number
  competencia_mes: number
  competencia_ano: number
  quantidade: number | null
  valor: number | null
  observacao: string | null
  excluido: boolean
  data_exclusao: string | null
  created_at: string
  funcionario: FuncionarioResumo
  evento: EventoResumo
}

export interface LancamentoVariavelCreate {
  folha_id?: number
  funcionario_id: number
  evento_id: number
  competencia_mes: number
  competencia_ano: number
  quantidade?: number
  valor?: number
  observacao?: string
}

export const lancamentosVariaveisApi = {
  list: (companyId: number, params?: {
    folha_id?: number
    funcionario_id?: number
    competencia_mes?: number
    competencia_ano?: number
  }) => api.get<LancamentoVariavel[]>('/folha/lancamentos-variaveis', {
    params: { company_id: companyId, ...params },
  }),
  create: (companyId: number, data: LancamentoVariavelCreate) =>
    api.post<LancamentoVariavel>(`/folha/lancamentos-variaveis?company_id=${companyId}`, data),
  update: (companyId: number, id: number, data: Partial<LancamentoVariavelCreate>) =>
    api.patch<LancamentoVariavel>(`/folha/lancamentos-variaveis/${id}?company_id=${companyId}`, data),
  excluir: (companyId: number, id: number) =>
    api.delete(`/folha/lancamentos-variaveis/${id}?company_id=${companyId}`),
  lixeira: (companyId: number, params?: { competencia_mes?: number; competencia_ano?: number }) =>
    api.get<LancamentoVariavel[]>('/folha/lancamentos-variaveis/lixeira', {
      params: { company_id: companyId, ...params },
    }),
  restaurar: (companyId: number, id: number) =>
    api.patch<LancamentoVariavel>(`/folha/lancamentos-variaveis/${id}/restaurar?company_id=${companyId}`),
  excluirDefinitivo: (companyId: number, id: number) =>
    api.delete(`/folha/lancamentos-variaveis/${id}/definitivo?company_id=${companyId}`),
}

export const tabelasINSSApi = {
  list: () => api.get<TabelaINSS[]>('/folha/tabelas/inss'),
  create: (data: TabelaINSSCreate) => api.post<TabelaINSS>('/folha/tabelas/inss', data),
  update: (id: number, data: Partial<TabelaINSSCreate>) => api.patch<TabelaINSS>(`/folha/tabelas/inss/${id}`, data),
  delete: (id: number) => api.delete(`/folha/tabelas/inss/${id}`),
}

export const tabelasIRRFApi = {
  list: () => api.get<TabelaIRRF[]>('/folha/tabelas/irrf'),
  create: (data: TabelaIRRFCreate) => api.post<TabelaIRRF>('/folha/tabelas/irrf', data),
  update: (id: number, data: Partial<TabelaIRRFCreate>) => api.patch<TabelaIRRF>(`/folha/tabelas/irrf/${id}`, data),
  delete: (id: number) => api.delete(`/folha/tabelas/irrf/${id}`),
}

export const funcionariosApi = {
  list: (companyId: number, apenasAtivos = true) =>
    api.get<Funcionario[]>('/folha/funcionarios', { params: { company_id: companyId, apenas_ativos: apenasAtivos } }),
  get: (companyId: number, id: number) =>
    api.get<Funcionario>(`/folha/funcionarios/${id}`, { params: { company_id: companyId } }),
  create: (companyId: number, data: FuncionarioCreate) =>
    api.post<Funcionario>(`/folha/funcionarios?company_id=${companyId}`, data),
  update: (companyId: number, id: number, data: Partial<FuncionarioCreate>) =>
    api.patch<Funcionario>(`/folha/funcionarios/${id}?company_id=${companyId}`, data),
  inativar: (companyId: number, id: number, motivo?: string) =>
    api.patch<Funcionario>(`/folha/funcionarios/${id}/inativar?company_id=${companyId}`, null, { params: { motivo } }),
}
