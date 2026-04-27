import api from './client'

export interface ConfiguracaoSimples {
  id: number
  company_id: number
  anexo_principal: string
  usa_fator_r: boolean
  data_inicio_simples: string
  limite_anual: number
  ativo: boolean
}

export interface HistoricoReceita {
  id: number
  company_id: number
  competencia_mes: number
  competencia_ano: number
  simples_codigo: string
  receita_bruta: number
  origem: string
  updated_at: string
}

export interface DetalheAtividade {
  simples_codigo: string
  receita_bruta: number
  origem: string
}

export interface ReceitaMes {
  competencia_mes: number
  competencia_ano: number
  receita_total: number
  detalhamento: DetalheAtividade[]
  tem_automatico: boolean
}

export interface DetalheRbt12 {
  mes: number
  ano: number
  receita: number
  ausente: boolean
}

export interface DistribuicaoTributos {
  irpj: number
  csll: number
  cofins: number
  pis: number
  cpp: number
  icms: number
  iss: number
}

export interface PreviewSimples {
  company_id: number
  competencia_mes: number
  competencia_ano: number
  rbt12: number
  detalhamento_rbt12: DetalheRbt12[]
  meses_ausentes: number
  receita_mes: number
  anexo_aplicado: string
  faixa_aplicada: number
  fator_r: number | null
  aliquota_nominal: number
  valor_deduzir: number
  aliquota_efetiva: number
  valor_das: number
  distribuicao: DistribuicaoTributos
  data_vencimento: string
  inclui_cpp: boolean
}

export interface ApuracaoSimples {
  id: number
  company_id: number
  competencia_mes: number
  competencia_ano: number
  rbt12: number
  receita_mes: number
  anexo_aplicado: string
  faixa_aplicada: number
  fator_r: number | null
  aliquota_nominal: number
  valor_deduzir: number
  aliquota_efetiva: number
  valor_das: number
  valor_irpj: number
  valor_csll: number
  valor_cofins: number
  valor_pis: number
  valor_cpp: number
  valor_icms: number
  valor_iss: number
  status: string
  data_vencimento: string
  pgdas_gerado: boolean
  bloqueado: boolean
  created_at: string
  updated_at: string
}

export const simplesNacionalApi = {
  getConfiguracao: (companyId: number) =>
    api.get<ConfiguracaoSimples | null>('/simples-nacional/configuracao', { params: { company_id: companyId } }),

  salvarConfiguracao: (companyId: number, data: { anexo_principal: string; usa_fator_r: boolean; data_inicio_simples: string }) =>
    api.post<ConfiguracaoSimples>('/simples-nacional/configuracao', data, { params: { company_id: companyId } }),

  listHistoricoReceita: (companyId: number) =>
    api.get<HistoricoReceita[]>('/simples-nacional/historico-receita', { params: { company_id: companyId } }),

  salvarReceita: (companyId: number, data: { competencia_mes: number; competencia_ano: number; receita_bruta: number }) =>
    api.post<HistoricoReceita>('/simples-nacional/historico-receita', data, { params: { company_id: companyId } }),

  preview: (companyId: number, data: { competencia_mes: number; competencia_ano: number; receita_mes: number }) =>
    api.post<PreviewSimples>('/simples-nacional/preview', data, { params: { company_id: companyId } }),

  calcular: (companyId: number, data: { competencia_mes: number; competencia_ano: number; receita_mes: number }) =>
    api.post<ApuracaoSimples>('/simples-nacional/apuracao', data, { params: { company_id: companyId } }),

  listApuracoes: (companyId: number) =>
    api.get<ApuracaoSimples[]>('/simples-nacional/apuracao', { params: { company_id: companyId } }),

  confirmar: (companyId: number, apuracaoId: number) =>
    api.post<ApuracaoSimples>(`/simples-nacional/apuracao/${apuracaoId}/confirmar`, {}, { params: { company_id: companyId } }),

  getReceitaMes: (companyId: number, mes: number, ano: number) =>
    api.get<ReceitaMes>('/simples-nacional/receita-mes', { params: { company_id: companyId, mes, ano } }),

  deleteReceita: (companyId: number, receitaId: number) =>
    api.delete(`/simples-nacional/historico-receita/${receitaId}`, { params: { company_id: companyId } }),
}
