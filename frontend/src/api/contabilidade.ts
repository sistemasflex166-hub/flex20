import api from './client'

export interface LinhaBalancete {
  conta_id: number
  classificacao: string
  descricao: string
  nivel: number
  tipo: string
  natureza: string
  saldo_anterior: number
  debitos: number
  creditos: number
  saldo_atual: number
}

export interface LinhaRazao {
  lancamento_id: number | null
  data: string
  codigo: number | null
  historico: string
  origem: string
  debito: number
  credito: number
  saldo: number
}

export interface RazaoResponse {
  conta_id: number
  classificacao: string
  descricao: string
  natureza: string
  linhas: LinhaRazao[]
}

export const relatoriosApi = {
  balancete: (companyId: number, dataIni: string, dataFim: string, nivelMaximo?: number, apenasComMovimento?: boolean) =>
    api.get<LinhaBalancete[]>(`/contabilidade/relatorios/balancete`, {
      params: {
        company_id: companyId,
        data_ini: dataIni,
        data_fim: dataFim,
        nivel_maximo: nivelMaximo,
        apenas_com_movimento: apenasComMovimento,
      },
    }),
  razao: (companyId: number, contaId: number, dataIni: string, dataFim: string) =>
    api.get<RazaoResponse>(`/contabilidade/relatorios/razao`, {
      params: {
        company_id: companyId,
        conta_id: contaId,
        data_ini: dataIni,
        data_fim: dataFim,
      },
    }),
}

export interface MascaraPlanoContas {
  id: number
  company_id: number
  mascara: string
  separador: string
  quantidade_niveis: number
}

export interface PlanoContas {
  id: number
  company_id: number
  classificacao: string
  descricao: string
  nivel: number
  natureza: string
  tipo: string
  codigo_reduzido: string | null
  titulo_dre: string | null
  grupo_dre: string | null
  codigo_ecf: string | null
  ativo: boolean
  parent_id: number | null
}

export interface PlanoContasCreate {
  classificacao: string
  descricao: string
  natureza: string
  tipo: string
  codigo_reduzido?: string
  titulo_dre?: string
  grupo_dre?: string
  codigo_ecf?: string
  parent_id?: number
}

export interface CentroCusto {
  id: number
  company_id: number
  codigo: number
  descricao: string
  ativo: boolean
}

export interface HistoricoPadrao {
  id: number
  company_id: number
  codigo: number
  descricao: string
  ativo: boolean
}

export interface LancamentoCreate {
  data: string
  conta_debito_id?: number
  conta_credito_id?: number
  historico_padrao_id?: number
  historico_complemento?: string
  valor: number
  centro_custo_id?: number
}

export interface ContaResumo {
  id: number
  classificacao: string
  descricao: string
  codigo_reduzido: string | null
}

export interface Lancamento {
  id: number
  company_id: number
  codigo: number
  data: string
  conta_debito_id: number | null
  conta_credito_id: number | null
  historico_padrao_id: number | null
  historico_complemento: string | null
  valor: number
  centro_custo_id: number | null
  origem: string
  conciliado: boolean
  excluido: boolean
  conta_debito: ContaResumo | null
  conta_credito: ContaResumo | null
  created_at: string
}

export interface TotalizadorDia {
  data: string
  total_debito: number
  total_credito: number
  diferenca: number
}

export const planoContasApi = {
  getMascara: (companyId: number) =>
    api.get<MascaraPlanoContas | null>(`/contabilidade/plano-contas/mascara`, { params: { company_id: companyId } }),
  saveMascara: (companyId: number, mascara: string, separador?: string) =>
    api.post<MascaraPlanoContas>(`/contabilidade/plano-contas/mascara`, { mascara, separador }, { params: { company_id: companyId } }),
  list: (companyId: number) =>
    api.get<PlanoContas[]>(`/contabilidade/plano-contas/`, { params: { company_id: companyId } }),
  listInativas: (companyId: number) =>
    api.get<PlanoContas[]>(`/contabilidade/plano-contas/`, { params: { company_id: companyId, apenas_ativas: false } }),
  create: (companyId: number, data: PlanoContasCreate) =>
    api.post<PlanoContas>(`/contabilidade/plano-contas/`, data, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, data: Partial<PlanoContasCreate>) =>
    api.patch<PlanoContas>(`/contabilidade/plano-contas/${id}`, data, { params: { company_id: companyId } }),
  deactivate: (id: number, companyId: number) =>
    api.patch<PlanoContas>(`/contabilidade/plano-contas/${id}/deactivate`, {}, { params: { company_id: companyId } }),
  copiar: (origemId: number, destinoId: number) =>
    api.post<{ copiadas: number }>(`/contabilidade/plano-contas/copiar`, {}, { params: { origem_id: origemId, destino_id: destinoId } }),
}

export const centroCustoApi = {
  list: (companyId: number) =>
    api.get<CentroCusto[]>(`/contabilidade/lancamentos/centros-custo`, { params: { company_id: companyId } }),
  create: (companyId: number, descricao: string) =>
    api.post<CentroCusto>(`/contabilidade/lancamentos/centros-custo`, { descricao }, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, descricao: string) =>
    api.patch<CentroCusto>(`/contabilidade/lancamentos/centros-custo/${id}`, { descricao }, { params: { company_id: companyId } }),
  deactivate: (id: number, companyId: number) =>
    api.patch<CentroCusto>(`/contabilidade/lancamentos/centros-custo/${id}/deactivate`, {}, { params: { company_id: companyId } }),
}

export const historicoPadraoApi = {
  list: (companyId: number) =>
    api.get<HistoricoPadrao[]>(`/contabilidade/lancamentos/historicos-padrao`, { params: { company_id: companyId } }),
  create: (companyId: number, descricao: string) =>
    api.post<HistoricoPadrao>(`/contabilidade/lancamentos/historicos-padrao`, { descricao }, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, descricao: string) =>
    api.patch<HistoricoPadrao>(`/contabilidade/lancamentos/historicos-padrao/${id}`, { descricao }, { params: { company_id: companyId } }),
  deactivate: (id: number, companyId: number) =>
    api.patch<HistoricoPadrao>(`/contabilidade/lancamentos/historicos-padrao/${id}/deactivate`, {}, { params: { company_id: companyId } }),
}

export interface ContaBancaria {
  id: number
  company_id: number
  banco: string
  agencia: string
  conta: string
  digito: string | null
  tipo_conta: string
  descricao: string
  saldo_inicial: number
  data_saldo_inicial: string
  conta_contabil_id: number | null
  ativo: boolean
}

export interface ContaBancariaCreate {
  banco: string
  agencia: string
  conta: string
  digito?: string
  tipo_conta: string
  descricao: string
  saldo_inicial: number
  data_saldo_inicial: string
  conta_contabil_id?: number
}

export interface HistoricoBancario {
  id: number
  company_id: number
  conta_bancaria_id: number
  texto_historico: string
  conta_debito_id: number | null
  conta_credito_id: number | null
  historico_padrao_id: number | null
  ativo: boolean
}

export interface HistoricoBancarioCreate {
  conta_bancaria_id: number
  texto_historico: string
  conta_debito_id?: number
  conta_credito_id?: number
  historico_padrao_id?: number
}

export interface SaldoInicial {
  id: number
  company_id: number
  data: string
  conta_id: number
  natureza: string
  valor: number
  observacao: string | null
  usuario_id: number
  created_at: string
}

export interface SaldoInicialCreate {
  data: string
  conta_id: number
  natureza: string
  valor: number
  observacao?: string
}

export interface TotalizadorSaldos {
  total_debito: number
  total_credito: number
  diferenca: number
}

export const saldoInicialApi = {
  list: (companyId: number, data?: string) =>
    api.get<SaldoInicial[]>(`/contabilidade/saldos-iniciais/`, { params: { company_id: companyId, data } }),
  totalizador: (companyId: number, data?: string) =>
    api.get<TotalizadorSaldos>(`/contabilidade/saldos-iniciais/totalizador`, { params: { company_id: companyId, data } }),
  create: (companyId: number, data: SaldoInicialCreate) =>
    api.post<SaldoInicial>(`/contabilidade/saldos-iniciais/`, data, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, data: Partial<SaldoInicialCreate>) =>
    api.patch<SaldoInicial>(`/contabilidade/saldos-iniciais/${id}`, data, { params: { company_id: companyId } }),
  delete: (id: number, companyId: number) =>
    api.delete(`/contabilidade/saldos-iniciais/${id}`, { params: { company_id: companyId } }),
}

export const contaBancariaApi = {
  list: (companyId: number) =>
    api.get<ContaBancaria[]>(`/contabilidade/contas-bancarias/`, { params: { company_id: companyId } }),
  create: (companyId: number, data: ContaBancariaCreate) =>
    api.post<ContaBancaria>(`/contabilidade/contas-bancarias/`, data, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, data: Partial<ContaBancariaCreate>) =>
    api.patch<ContaBancaria>(`/contabilidade/contas-bancarias/${id}`, data, { params: { company_id: companyId } }),
  deactivate: (id: number, companyId: number) =>
    api.patch<ContaBancaria>(`/contabilidade/contas-bancarias/${id}/deactivate`, {}, { params: { company_id: companyId } }),
}

export const historicoBancarioApi = {
  list: (companyId: number, contaBancariaId?: number) =>
    api.get<HistoricoBancario[]>(`/contabilidade/contas-bancarias/historicos`, {
      params: { company_id: companyId, conta_bancaria_id: contaBancariaId },
    }),
  create: (companyId: number, data: HistoricoBancarioCreate) =>
    api.post<HistoricoBancario>(`/contabilidade/contas-bancarias/historicos`, data, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, data: Partial<HistoricoBancarioCreate>) =>
    api.patch<HistoricoBancario>(`/contabilidade/contas-bancarias/historicos/${id}`, data, { params: { company_id: companyId } }),
  deactivate: (id: number, companyId: number) =>
    api.patch<HistoricoBancario>(`/contabilidade/contas-bancarias/historicos/${id}/deactivate`, {}, { params: { company_id: companyId } }),
}

export const lancamentosApi = {
  list: (companyId: number, dataIni?: string, dataFim?: string, incluirExcluidos?: boolean) =>
    api.get<Lancamento[]>(`/contabilidade/lancamentos/`, {
      params: { company_id: companyId, data_ini: dataIni, data_fim: dataFim, incluir_excluidos: incluirExcluidos },
    }),
  totalizador: (companyId: number, data: string) =>
    api.get<TotalizadorDia>(`/contabilidade/lancamentos/totalizador`, { params: { company_id: companyId, data } }),
  create: (companyId: number, data: LancamentoCreate) =>
    api.post<Lancamento>(`/contabilidade/lancamentos/`, data, { params: { company_id: companyId } }),
  update: (id: number, companyId: number, data: Partial<LancamentoCreate>) =>
    api.patch<Lancamento>(`/contabilidade/lancamentos/${id}`, data, { params: { company_id: companyId } }),
  excluir: (id: number, companyId: number) =>
    api.patch(`/contabilidade/lancamentos/${id}/excluir`, {}, { params: { company_id: companyId } }),
  estornar: (id: number, companyId: number) =>
    api.post<Lancamento>(`/contabilidade/lancamentos/${id}/estornar`, {}, { params: { company_id: companyId } }),
  hardDelete: (id: number, companyId: number) =>
    api.delete(`/contabilidade/lancamentos/${id}/definitivo`, { params: { company_id: companyId } }),
}
