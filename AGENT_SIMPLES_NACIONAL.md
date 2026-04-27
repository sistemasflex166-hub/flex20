# AGENT_SIMPLES_NACIONAL.md — Cálculo do Simples Nacional

## Como usar este agente
Instrua o Claude Code a ler este arquivo junto com o CLAUDE.md e o agente fiscal:
> "Leia o CLAUDE.md, o docs/agents/AGENT_FISCAL.md e o docs/agents/AGENT_SIMPLES_NACIONAL.md antes de continuar"

---

## Visão Geral

O Simples Nacional é um regime tributário simplificado que unifica o recolhimento
de vários tributos em uma única guia (DAS). O cálculo é complexo pois envolve:
- Enquadramento por anexo conforme a atividade da empresa
- Receita bruta acumulada dos últimos 12 meses (RBT12)
- Faixas de faturamento com alíquotas e deduções progressivas
- Fórmula de alíquota efetiva
- Fator R (para distinção Anexo III × Anexo V)
- Sublimites estaduais para ISS e ICMS
- Importação do extrato do Simples Nacional em PDF

Este agente cobre exclusivamente o cálculo do Simples Nacional dentro do
módulo Fiscal. Para demais lançamentos fiscais, ver AGENT_FISCAL.md.

---

## Estrutura de Arquivos

```
backend/src/
├── models/
│   └── simples_nacional/
│       ├── __init__.py
│       ├── configuracao_simples.py       # configuração da empresa no Simples
│       ├── anexo_simples.py              # tabela de anexos (I a V)
│       ├── faixa_simples.py              # faixas de faturamento por anexo
│       ├── historico_receita.py          # receita mensal acumulada (RBT12)
│       ├── apuracao_simples.py           # registro de cada apuração mensal
│       └── cfop_simples.py              # vínculo CFOP → código Simples Nacional
│
├── services/
│   └── simples_nacional/
│       ├── __init__.py
│       ├── calculo_rbt12.py             # cálculo da receita bruta acumulada
│       ├── calculo_aliquota.py          # fórmula de alíquota efetiva
│       ├── calculo_fator_r.py           # fator R (Anexo III × V)
│       ├── calculo_das.py               # orquestrador do cálculo completo
│       ├── distribuicao_tributos.py     # distribuição por tributo (IRPJ, CSLL etc.)
│       └── importacao_extrato_pdf.py    # leitura do PDF do extrato do Simples
│
├── routes/
│   └── simples_nacional/
│       ├── __init__.py
│       ├── configuracao.py
│       ├── historico_receita.py
│       ├── apuracao.py
│       └── importacao.py
│
├── schemas/
│   └── simples_nacional/
│       ├── __init__.py
│       ├── configuracao.py
│       ├── apuracao.py
│       └── historico_receita.py
│
└── workers/
    └── simples_nacional/
        ├── __init__.py
        ├── processar_apuracao.py        # cálculo assíncrono via Celery
        └── processar_extrato_pdf.py     # OCR e leitura do PDF via Celery
```

---

## Conceitos Fundamentais

### Anexos do Simples Nacional
```
O enquadramento da empresa em um anexo depende da sua atividade principal.
Existem 5 anexos, cada um com sua tabela de faixas e alíquotas:

Anexo I   → Comércio (vendas de mercadorias)
Anexo II  → Indústria (atividades industriais)
Anexo III → Serviços (locação de bens móveis, prestação de serviços em geral)
Anexo IV  → Serviços (construção civil, vigilância, limpeza, serviços advocatícios)
Anexo V   → Serviços (atividades intelectuais, técnicas, científicas)

ATENÇÃO: A distinção entre Anexo III e Anexo V depende do FATOR R.
Algumas atividades podem enquadrar no III ou no V conforme o resultado do Fator R.
Ver seção "Fator R" abaixo.
```

### RBT12 — Receita Bruta dos Últimos 12 Meses
```
O cálculo da alíquota utiliza a soma da receita bruta dos 12 meses
ANTERIORES ao mês de apuração (não inclui o mês atual).

Exemplo: apurando 04/2026
  RBT12 = soma da receita de 04/2025 a 03/2026

A receita de cada mês é alimentada automaticamente pelo sistema
a partir dos lançamentos fiscais confirmados daquele mês.

Para o primeiro mês de apuração de uma empresa nova no escritório:
  → O usuário informa manualmente a receita mês a mês (últimos 12 meses)
  → Ou importa o extrato do Simples Nacional em PDF (ver seção Importações)
```

### Faixas de Faturamento
```
Cada anexo possui 6 faixas de faturamento com alíquota nominal e valor a deduzir:

Faixa 1: Até R$ 180.000,00
Faixa 2: De R$ 180.000,01 a R$ 360.000,00
Faixa 3: De R$ 360.000,01 a R$ 720.000,00
Faixa 4: De R$ 720.000,01 a R$ 1.800.000,00
Faixa 5: De R$ 1.800.000,01 a R$ 3.600.000,00
Faixa 6: De R$ 3.600.000,01 a R$ 4.800.000,00

Limite máximo do Simples Nacional: R$ 4.800.000,00 anuais
Acima desse limite: empresa excluída do Simples Nacional

ATENÇÃO: Os valores das tabelas devem ser armazenados no banco de dados
e nunca hardcoded no código — são atualizados por legislação.
```

---

## Tabelas dos Anexos (valores vigentes — versionar no banco)

### Anexo I — Comércio
```
Faixa | Receita Bruta 12 meses       | Alíquota | Valor a Deduzir
  1   | Até 180.000,00               |  4,00%   |      0,00
  2   | 180.000,01 a 360.000,00      |  7,30%   |  5.940,00
  3   | 360.000,01 a 720.000,00      |  9,50%   | 13.860,00
  4   | 720.000,01 a 1.800.000,00    | 10,70%   | 22.500,00
  5   | 1.800.000,01 a 3.600.000,00  | 14,30%   | 87.300,00
  6   | 3.600.000,01 a 4.800.000,00  | 19,00%   | 378.000,00
```

### Anexo II — Indústria
```
Faixa | Receita Bruta 12 meses       | Alíquota | Valor a Deduzir
  1   | Até 180.000,00               |  4,50%   |      0,00
  2   | 180.000,01 a 360.000,00      |  7,80%   |  5.940,00
  3   | 360.000,01 a 720.000,00      | 10,00%   | 13.860,00
  4   | 720.000,01 a 1.800.000,00    | 11,20%   | 22.500,00
  5   | 1.800.000,01 a 3.600.000,00  | 14,70%   | 85.500,00
  6   | 3.600.000,01 a 4.800.000,00  | 30,00%   | 720.000,00
```

### Anexo III — Serviços (com Fator R ≥ 0,28)
```
Faixa | Receita Bruta 12 meses       | Alíquota | Valor a Deduzir
  1   | Até 180.000,00               |  6,00%   |      0,00
  2   | 180.000,01 a 360.000,00      | 11,20%   |  9.360,00
  3   | 360.000,01 a 720.000,00      | 13,50%   | 17.640,00
  4   | 720.000,01 a 1.800.000,00    | 16,00%   | 35.640,00
  5   | 1.800.000,01 a 3.600.000,00  | 21,00%   | 125.640,00
  6   | 3.600.000,01 a 4.800.000,00  | 33,00%   | 648.000,00
```

### Anexo IV — Serviços (construção civil, vigilância, limpeza, advocacia)
```
Faixa | Receita Bruta 12 meses       | Alíquota | Valor a Deduzir
  1   | Até 180.000,00               |  4,50%   |      0,00
  2   | 180.000,01 a 360.000,00      |  9,00%   |  8.100,00
  3   | 360.000,01 a 720.000,00      | 10,20%   | 12.420,00
  4   | 720.000,01 a 1.800.000,00    | 14,00%   | 39.780,00
  5   | 1.800.000,01 a 3.600.000,00  | 22,00%   | 183.780,00
  6   | 3.600.000,01 a 4.800.000,00  | 33,00%   | 828.000,00

ATENÇÃO: Anexo IV não inclui CPP (INSS patronal) na alíquota.
O INSS patronal é recolhido separadamente pelo sistema previdenciário normal.
```

### Anexo V — Serviços (atividades intelectuais, com Fator R < 0,28)
```
Faixa | Receita Bruta 12 meses       | Alíquota | Valor a Deduzir
  1   | Até 180.000,00               | 15,50%   |      0,00
  2   | 180.000,01 a 360.000,00      | 18,00%   |  4.500,00
  3   | 360.000,01 a 720.000,00      | 19,50%   | 9.900,00
  4   | 720.000,01 a 1.800.000,00    | 20,50%   | 17.100,00
  5   | 1.800.000,01 a 3.600.000,00  | 23,00%   | 62.100,00
  6   | 3.600.000,01 a 4.800.000,00  | 30,50%   | 540.000,00
```

---

## Fórmula de Cálculo da Alíquota Efetiva

```
FÓRMULA:
Alíquota Efetiva = (RBT12 × Alíquota Nominal − Valor a Deduzir) ÷ RBT12

DAS do mês = Receita do mês × Alíquota Efetiva
```

### Exemplo completo (conforme documento)
```
Empresa: XYZZ
Enquadramento: Anexo III
Mês de apuração: 04/2026
RBT12 (04/2025 a 03/2026): R$ 937.858,92
Receita do mês (04/2026): R$ 67.828,29

Passo 1 — Identificar a faixa pelo RBT12:
  R$ 937.858,92 → Faixa 4 (720.000,01 a 1.800.000,00)
  Alíquota nominal: 16,00%
  Valor a deduzir: R$ 35.640,00

Passo 2 — Calcular a alíquota efetiva:
  (937.858,92 × 16% − 35.640,00) ÷ 937.858,92
  = (150.057,43 − 35.640,00) ÷ 937.858,92
  = 114.417,43 ÷ 937.858,92
  = 12,20%

Passo 3 — Calcular o DAS:
  67.828,29 × 12,20% = R$ 8.274,95
```

---

## Fator R — Distinção Anexo III × Anexo V

```
O Fator R é utilizado por atividades que podem ser tributadas pelo
Anexo III ou pelo Anexo V, dependendo da relação entre folha de
pagamento e receita bruta.

FÓRMULA:
Fator R = Folha de Pagamento dos últimos 12 meses ÷ RBT12

REGRA:
  Fator R ≥ 0,28 (28%) → Tributar pelo Anexo III (alíquota menor)
  Fator R < 0,28 (28%) → Tributar pelo Anexo V (alíquota maior)

O que compõe a folha de pagamento para o Fator R:
  ✅ Salários
  ✅ Pró-labore
  ✅ Contribuição patronal previdenciária (INSS patronal)
  ✅ FGTS
  ✅ Retiradas de sócios (quando há)

O sistema deve:
  1. Verificar se a atividade da empresa exige cálculo do Fator R
  2. Buscar automaticamente os dados da folha dos últimos 12 meses
     (integração com módulo Folha de Pagamentos)
  3. Calcular o Fator R
  4. Definir automaticamente se aplica Anexo III ou Anexo V
  5. Exibir o Fator R calculado na tela de apuração
```

---

## Distribuição dos Tributos por Anexo

```
A alíquota efetiva calculada é distribuída entre os tributos abaixo,
conforme percentuais definidos por anexo e faixa na legislação.

Tributos incluídos no DAS:
  IRPJ   — Imposto de Renda Pessoa Jurídica
  CSLL   — Contribuição Social sobre o Lucro Líquido
  COFINS — Contribuição para Financiamento da Seguridade Social
  PIS    — Programa de Integração Social
  CPP    — Contribuição Patronal Previdenciária (exceto Anexo IV)
  ICMS   — (Anexos I e II — comércio e indústria)
  ISS    — (Anexos III, IV e V — serviços)

ATENÇÃO:
  Anexo IV NÃO inclui CPP — recolhido separadamente pelo GPS
  Empresas com sublimite estadual podem ter ICMS/ISS recolhidos separadamente
  Os percentuais de distribuição por tributo devem ser armazenados no banco
  e versionados por competência — nunca hardcoded

A distribuição é necessária para:
  1. Geração do PGDAS (declaração mensal do Simples)
  2. Escrituração fiscal (segregação por tributo)
  3. Relatórios de memória de cálculo
```

---

## Models — Especificação Detalhada

### `configuracao_simples.py`
```python
id: int
empresa_id: int                   # único por empresa

anexo_principal: str              # I / II / III / IV / V
usa_fator_r: bool                 # True para atividades III × V
data_inicio_simples: date         # data de opção pelo regime
limite_anual: Decimal             # 4.800.000,00 (pode ser alterado por lei)

# Vínculo fiscal
# Serviços: leitura pelo código do item de serviço → anexo do Simples
# Vendas: leitura pelo CFOP → código do Simples Nacional

ativo: bool
created_at: datetime
updated_at: datetime
```

### `anexo_simples.py`
```python
# Tabela de anexos — versionada por vigência
id: int
codigo: str                       # I / II / III / IV / V
descricao: str
vigencia_inicio: date
vigencia_fim: date | None
inclui_cpp: bool                  # False para Anexo IV
created_at: datetime
```

### `faixa_simples.py`
```python
# Faixas de cada anexo — versionadas por vigência
id: int
anexo_id: int                     # FK anexo_simples
numero_faixa: int                 # 1 a 6
valor_minimo: Decimal
valor_maximo: Decimal | None      # None na última faixa
aliquota_nominal: Decimal         # percentual (ex: 16.00)
valor_deduzir: Decimal
vigencia_inicio: date
vigencia_fim: date | None

# Distribuição por tributo (percentuais da alíquota nominal)
perc_irpj: Decimal
perc_csll: Decimal
perc_cofins: Decimal
perc_pis: Decimal
perc_cpp: Decimal                 # 0 para Anexo IV
perc_icms: Decimal                # 0 para serviços
perc_iss: Decimal                 # 0 para comércio/indústria
created_at: datetime
```

### `historico_receita.py`
```python
# Receita bruta mensal por empresa — base para o RBT12
id: int
empresa_id: int
competencia_mes: int              # 1-12
competencia_ano: int
receita_bruta: Decimal

# Origem da receita
origem: str
# automatico  → alimentado pelo fechamento fiscal do mês
# manual      → informado pelo usuário (primeiros meses)
# importado   → lido do PDF do extrato do Simples Nacional

created_at: datetime
updated_at: datetime

# REGRA: único por empresa + competência
# Receita manual pode ser sobrescrita até o primeiro fechamento automático
```

### `apuracao_simples.py`
```python
# Registro de cada apuração mensal do Simples Nacional
id: int
empresa_id: int
competencia_mes: int
competencia_ano: int

# Dados do cálculo
rbt12: Decimal                    # soma dos 12 meses anteriores
receita_mes: Decimal              # receita do mês apurado
anexo_aplicado: str               # I / II / III / IV / V
faixa_aplicada: int               # 1 a 6
fator_r: Decimal | None           # preenchido quando usa_fator_r = True

# Resultado
aliquota_nominal: Decimal
valor_deduzir: Decimal
aliquota_efetiva: Decimal
valor_das: Decimal                # DAS total a recolher

# Distribuição por tributo (valores em R$)
valor_irpj: Decimal
valor_csll: Decimal
valor_cofins: Decimal
valor_pis: Decimal
valor_cpp: Decimal
valor_icms: Decimal
valor_iss: Decimal

# Status
status: str                       # calculado / confirmado / pgdas_gerado / pago
data_vencimento: date             # sempre dia 20 do mês seguinte
pgdas_gerado: bool
data_pgdas: datetime | None

# Soft delete / reabertura
bloqueado: bool                   # True após PGDAS gerado
created_at: datetime
updated_at: datetime
usuario_id: int
```

### `cfop_simples.py`
```python
# Vínculo entre CFOP (vendas) e código do Simples Nacional
id: int
empresa_id: int
cfop: str                         # ex: "5102", "6102"
codigo_simples: str               # código de receita do Simples Nacional
anexo: str                        # anexo correspondente
descricao: str | None
created_at: datetime
```

---

## Services — Especificação Detalhada

### `calculo_rbt12.py`
```python
def calcular_rbt12(empresa_id: int, competencia_mes: int, competencia_ano: int) -> Decimal:
    """
    Soma a receita bruta dos 12 meses anteriores ao mês de apuração.

    Exemplo: apurando 04/2026
      Busca receitas de 04/2025 a 03/2026 (12 meses anteriores)
      NÃO inclui o mês atual (04/2026)

    Se algum mês não tiver receita cadastrada: considera R$ 0,00
    e registra aviso ao usuário.

    Retorna: Decimal com o RBT12 calculado
    """

def buscar_receitas_periodo(empresa_id: int, meses: list[tuple]) -> list[HistoricoReceita]:
    """
    Busca as receitas de uma lista de competências.
    Retorna lista de HistoricoReceita — itens faltantes retornam None.
    """
```

### `calculo_fator_r.py`
```python
def calcular_fator_r(empresa_id: int, competencia_mes: int, competencia_ano: int) -> Decimal:
    """
    Calcula o Fator R para atividades que oscilam entre Anexo III e V.

    Fórmula: Folha 12 meses ÷ RBT12

    Folha 12 meses = soma dos últimos 12 meses de:
      salários + pró-labore + INSS patronal + FGTS

    Integração com módulo Folha: busca os totais mensais de folha
    via service interno do módulo folha.

    Retorna: Decimal (ex: 0.2950 = 29,50%)
    """

def definir_anexo_por_fator_r(fator_r: Decimal) -> str:
    """
    Fator R >= 0.28 → retorna "III"
    Fator R < 0.28  → retorna "V"
    """
```

### `calculo_aliquota.py`
```python
def identificar_faixa(rbt12: Decimal, anexo: str, competencia: date) -> FaixaSimples:
    """
    Identifica a faixa de faturamento com base no RBT12 e no anexo.
    Busca a tabela vigente para a competência informada (não hardcoded).
    """

def calcular_aliquota_efetiva(rbt12: Decimal, faixa: FaixaSimples) -> Decimal:
    """
    Fórmula: (RBT12 × aliquota_nominal − valor_deduzir) ÷ RBT12

    Exemplo:
      rbt12 = 937.858,92
      aliquota_nominal = 16,00%
      valor_deduzir = 35.640,00

      (937.858,92 × 0,16 − 35.640,00) ÷ 937.858,92
      = (150.057,43 − 35.640,00) ÷ 937.858,92
      = 114.417,43 ÷ 937.858,92
      = 0,1220 → 12,20%

    Retorna: Decimal arredondado em 2 casas decimais
    """
```

### `calculo_das.py` — Orquestrador principal
```python
def calcular_das(empresa_id: int, competencia_mes: int, competencia_ano: int,
                 receita_mes: Decimal) -> ApuracaoSimples:
    """
    Orquestrador completo do cálculo do DAS. Sequência:

    1. Buscar configuração da empresa (anexo, usa_fator_r)
    2. Calcular RBT12
    3. Se usa_fator_r: calcular Fator R e definir anexo (III ou V)
    4. Identificar faixa de faturamento pelo RBT12
    5. Calcular alíquota efetiva pela fórmula
    6. Calcular valor do DAS: receita_mes × alíquota_efetiva
    7. Distribuir por tributo (IRPJ, CSLL, COFINS, PIS, CPP, ICMS/ISS)
    8. Calcular data de vencimento (dia 20 do mês seguinte)
    9. Persistir em apuracao_simples
    10. Retornar ApuracaoSimples completo

    Lança exceção se:
      - RBT12 > 4.800.000,00 (empresa fora do limite do Simples)
      - Empresa sem configuração do Simples cadastrada
      - Competência já possui apuração confirmada ou PGDAS gerado
    """

def preview_calculo(empresa_id: int, competencia_mes: int,
                    competencia_ano: int, receita_mes: Decimal) -> dict:
    """
    Retorna prévia do cálculo SEM persistir.
    Usado para exibir na interface antes da confirmação do usuário.

    Retorna dict com:
      rbt12, faixa, aliquota_nominal, valor_deduzir,
      aliquota_efetiva, valor_das, distribuicao_por_tributo,
      fator_r (se aplicável), anexo_aplicado
    """
```

### `distribuicao_tributos.py`
```python
def distribuir_por_tributo(valor_das: Decimal, faixa: FaixaSimples) -> dict:
    """
    Distribui o valor do DAS entre os tributos conforme
    percentuais da faixa aplicada.

    Retorna dict:
    {
      "irpj": Decimal,
      "csll": Decimal,
      "cofins": Decimal,
      "pis": Decimal,
      "cpp": Decimal,      # 0 para Anexo IV
      "icms": Decimal,     # 0 para serviços
      "iss": Decimal       # 0 para comércio/indústria
    }

    ATENÇÃO: soma dos valores deve ser igual ao valor_das.
    Ajustar última parcela para compensar arredondamentos.
    """
```

### `importacao_extrato_pdf.py`
```python
def importar_extrato_simples(empresa_id: int, arquivo_pdf: bytes) -> list[HistoricoReceita]:
    """
    Lê o PDF do extrato do Simples Nacional emitido pelo portal gov.br.
    Extrai a receita bruta mês a mês e alimenta historico_receita.

    Fluxo:
    1. Receber PDF via upload
    2. Enviar para worker Celery (processar_extrato_pdf)
    3. Worker usa pdfplumber para extrair tabela de receitas
    4. Mapeia mês/ano e valor de receita de cada linha
    5. Persiste em historico_receita com origem = "importado"
    6. Retorna lista de competências importadas + eventuais erros

    ATENÇÃO:
    - O extrato do Simples tem layout específico do portal gov.br
    - Pode haver variações de layout conforme versão do portal
    - Valores com vírgula como separador decimal devem ser convertidos
    - Exibir tela de confirmação antes de salvar (usuário revisa os valores)
    """
```

---

## Vínculo Fiscal → Simples Nacional

### Serviços (por código do item de serviço)
```
Quando uma NF-S é importada ou lançada no módulo fiscal:
  1. O sistema lê o código do item de serviço da nota
  2. Busca o anexo do Simples Nacional configurado para esse código
  3. Acumula a receita desse mês no anexo correspondente

Cadastro necessário:
  item_servico.codigo_simples → vincula o serviço ao anexo do Simples
  (cadastrado no módulo fiscal, no cadastro de itens de serviço)

Atividades que exigem Fator R ficam marcadas como usa_fator_r = True
```

### Vendas / Comércio (por CFOP)
```
Quando uma NF-e de venda é importada ou lançada:
  1. O sistema lê o CFOP de cada item da nota
  2. Busca o código do Simples Nacional configurado para aquele CFOP
     (tabela cfop_simples)
  3. Acumula a receita no anexo correspondente (I para comércio, II para indústria)

Cadastro necessário:
  cfop_simples: vínculo entre CFOP e código/anexo do Simples Nacional
  (cadastrado no módulo de configurações fiscais)
```

---

## Fluxo Completo de Apuração Mensal

```
CONFIGURAÇÃO INICIAL (feita uma vez):
  Cadastrar configuração do Simples (anexo, usa_fator_r)
  Configurar vínculo CFOP → Simples (para vendas)
  Configurar vínculo item de serviço → Simples (para serviços)
  Informar receita dos últimos 12 meses (manual ou via PDF do extrato)

DURANTE O MÊS:
  Lançamentos fiscais (NF-e e NF-S) acumulam a receita automaticamente
  em historico_receita conforme são confirmados

NO FECHAMENTO DO MÊS:
  1. Usuário acessa "Apuração do Simples Nacional"
  2. Informa a competência (mês/ano)
  3. Sistema exibe PRÉVIA do cálculo:
     - RBT12 calculado (soma dos 12 meses anteriores)
     - Faixa identificada
     - Alíquota nominal e dedução
     - Fator R (se aplicável) e anexo resultante
     - Alíquota efetiva calculada
     - Receita do mês e valor do DAS
     - Distribuição por tributo
  4. Usuário confirma o cálculo
  5. Sistema persiste a apuração com status "calculado"
  6. Usuário gera o PGDAS (integração com o portal do Simples)
  7. Status muda para "pgdas_gerado" — apuração bloqueada para edição
  8. Após pagamento: status "pago"
```

---

## Interface — Telas Necessárias

### Tela de configuração do Simples Nacional
```
Por empresa:
- Anexo principal
- Flag: usa Fator R (atividades III × V)
- Data de início no Simples
- Histórico de receitas mês a mês (tabela editável)
- Botão: Importar receitas do extrato PDF
```

### Tela de apuração mensal
```
Cabeçalho:
- Empresa | Competência | Status da apuração

Seção RBT12:
- Tabela com os 12 meses anteriores e receita de cada um
- Total RBT12

Seção Cálculo:
- Fator R calculado (se aplicável): X,XX% → Anexo III ou V
- Faixa identificada: Faixa X (R$ X a R$ X)
- Alíquota nominal: X,XX%
- Valor a deduzir: R$ X
- Alíquota efetiva: X,XX%
- Receita do mês: R$ X
- Valor do DAS: R$ X

Seção Distribuição por tributo:
| Tributo | % na alíquota | Valor R$ |
|---------|--------------|----------|
| IRPJ    | X,XX%        | R$ X     |
| CSLL    | X,XX%        | R$ X     |
| COFINS  | X,XX%        | R$ X     |
| PIS     | X,XX%        | R$ X     |
| CPP     | X,XX%        | R$ X     |
| ISS     | X,XX%        | R$ X     |
| TOTAL   | X,XX%        | R$ X     |

Botões: Calcular (prévia) | Confirmar | Gerar PGDAS | Reabrir
```

### Tela de importação do extrato PDF
```
Upload do arquivo PDF do extrato do Simples Nacional
Após processamento: tabela com mês, valor importado e status
Confirmação antes de salvar (usuário revisa os valores)
```

---

## Regras de Negócio Específicas

- Tabelas de faixas, alíquotas e distribuição NUNCA hardcoded — sempre no banco, versionadas por vigência
- RBT12 considera os 12 meses ANTERIORES ao mês apurado — nunca inclui o mês atual
- Apuração com PGDAS gerado fica bloqueada para edição — somente reaberta com justificativa
- Empresa com RBT12 > R$ 4.800.000,00 deve ser alertada sobre exclusão do Simples
- Fator R calculado sempre com base nos dados reais da folha dos últimos 12 meses
- Arredondamento da alíquota efetiva: 2 casas decimais
- Arredondamento do DAS: 2 casas decimais
- Soma da distribuição por tributo deve ser exatamente igual ao valor do DAS
- Receita informada manualmente pode ser sobrescrita pela importação do PDF
- Importação do extrato PDF sempre exige confirmação do usuário antes de persistir

---

## Integração com Outros Módulos

### ← Fiscal
```
Lançamentos fiscais confirmados alimentam automaticamente historico_receita
Serviços: via código do item de serviço
Vendas: via CFOP
```

### ← Folha de Pagamentos
```
Dados de folha dos últimos 12 meses usados no cálculo do Fator R
(salários + pró-labore + INSS patronal + FGTS)
```

### → PGDAS
```
Apuração confirmada gera os dados para o PGDAS-D
(Declaração Mensal do Simples Nacional)
Integração com o portal do Simples Nacional
```

---

## Status de Desenvolvimento

### Models e configuração
- [ ] Model anexo_simples (tabela de anexos versionada)
- [ ] Model faixa_simples (faixas e alíquotas versionadas com distribuição por tributo)
- [ ] Model configuracao_simples (configuração da empresa)
- [ ] Model historico_receita (receita mensal por empresa)
- [ ] Model apuracao_simples (registro das apurações)
- [ ] Model cfop_simples (vínculo CFOP → Simples)
- [ ] Seed das tabelas de anexos e faixas vigentes

### Services de cálculo
- [ ] Service calculo_rbt12 (soma dos 12 meses anteriores)
- [ ] Service calculo_fator_r (integração com módulo folha)
- [ ] Service calculo_aliquota (fórmula de alíquota efetiva)
- [ ] Service calculo_das (orquestrador completo)
- [ ] Service distribuicao_tributos (distribuição por tributo com ajuste de arredondamento)
- [ ] Service preview_calculo (prévia sem persistir)

### Importação
- [ ] Worker processar_extrato_pdf (leitura PDF do extrato do Simples)
- [ ] Service importacao_extrato_pdf com tela de confirmação

### Vínculo fiscal
- [ ] Integração lançamento fiscal → historico_receita (por item de serviço)
- [ ] Integração lançamento fiscal → historico_receita (por CFOP)
- [ ] CRUD cfop_simples

### Interface
- [ ] Tela de configuração do Simples por empresa
- [ ] Tela de apuração mensal com prévia e confirmação
- [ ] Tela de importação do extrato PDF
- [ ] Histórico de apurações com status

### Obrigações
- [ ] Geração do PGDAS-D
