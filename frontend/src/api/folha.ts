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
  nome: string
  cpf: string
  pis_pasep: string | null
  data_nascimento: string | null
  sexo: string | null
  estado_civil: string | null
  grau_instrucao: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  data_admissao: string
  tipo_contrato: string
  regime_trabalho: string
  matricula: string | null
  cargo_id: number | null
  departamento_id: number | null
  sindicato_id: number | null
  salario_base: number
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
  nome: string
  cpf: string
  pis_pasep?: string
  data_nascimento?: string
  sexo?: string
  estado_civil?: string
  grau_instrucao?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  data_admissao: string
  tipo_contrato?: string
  regime_trabalho?: string
  matricula?: string
  cargo_id?: number
  departamento_id?: number
  sindicato_id?: number
  salario_base: number
  banco?: string
  agencia?: string
  conta_bancaria?: string
  tipo_conta?: string
  dependentes?: DependenteCreate[]
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
