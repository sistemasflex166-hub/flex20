# AGENT_FOLHA.md — Módulo Folha de Pagamentos

## Como usar este agente
Instrua o Claude Code a ler este arquivo junto com o CLAUDE.md antes de trabalhar no módulo de folha:
> "Leia o CLAUDE.md e o docs/agents/AGENT_FOLHA.md antes de continuar"

---

## Visão Geral do Módulo

Módulo responsável pelo cálculo e gestão da folha de pagamentos das empresas clientes
do escritório contábil. Abrange admissão, cálculo mensal, férias, décimo terceiro,
rescisões e geração de relatórios. Integra-se automaticamente com o módulo de
Contabilidade e com o agente E-Social.

---

## Estrutura de Arquivos

```
backend/src/
├── models/
│   └── folha/
│       ├── __init__.py
│       ├── funcionario.py
│       ├── cargo.py
│       ├── departamento.py
│       ├── centro_custo.py
│       ├── sindicato.py
│       ├── evento.py
│       ├── folha_pagamento.py
│       ├── lancamento_variavel.py
│       ├── ferias.py
│       ├── decimo_terceiro.py
│       ├── rescisao.py
│       ├── configuracao_contabil_evento.py   # NOVO — config contábil por evento
│       ├── configuracao_contabil_encargo.py  # NOVO — config contábil encargos
│       └── lancamento_contabil_folha.py      # NOVO — rastreabilidade
│
├── services/
│   └── folha/
│       ├── __init__.py
│       ├── calculo_folha.py
│       ├── calculo_inss.py
│       ├── calculo_irrf.py
│       ├── calculo_fgts.py
│       ├── calculo_ferias.py
│       ├── calculo_decimo_terceiro.py
│       ├── calculo_rescisao.py
│       └── integracao_contabil_folha.py      # NOVO — orquestrador integração
│
├── routes/
│   └── folha/
│       ├── __init__.py
│       ├── funcionarios.py
│       ├── eventos.py
│       ├── lancamentos.py
│       ├── folha.py
│       ├── ferias.py
│       ├── decimo_terceiro.py
│       ├── rescisao.py
│       └── configuracao_contabil.py          # NOVO — rotas config contábil
│
├── schemas/
│   └── folha/
│       ├── __init__.py
│       ├── funcionario.py
│       ├── evento.py
│       ├── lancamento.py
│       ├── folha.py
│       ├── ferias.py
│       ├── decimo_terceiro.py
│       ├── rescisao.py
│       └── configuracao_contabil.py          # NOVO — schemas config contábil
│
└── workers/
    └── folha/
        ├── __init__.py
        ├── processar_folha.py
        └── gerar_relatorios.py
```

---

## Models — Especificação detalhada

### `funcionario.py`
```python
# Campos obrigatórios
codigo: int               # sequencial imutável por empresa (gerado pelo sistema)
nome: str
cpf: str                  # único por empresa
pis_pasep: str
data_nascimento: date
sexo: str                 # M / F
estado_civil: str
grau_instrucidade: str    # conforme tabela E-Social

# Endereço
logradouro: str
numero: str
complemento: str | None
bairro: str
cidade: str
uf: str
cep: str

# Dados contratuais
data_admissao: date
tipo_contrato: str        # CLT, estagio, aprendiz, autonomo
regime_trabalho: str      # clt, pro_labore
matricula: str            # matrícula interna da empresa
cargo_id: int             # FK cargo
departamento_id: int      # FK departamento
centro_custo_id: int      # FK centro de custo
sindicato_id: int         # FK sindicato
salario_base: Decimal

# Dados bancários
banco: str
agencia: str
conta: str
tipo_conta: str           # corrente / poupança

# Dependentes (lista separada para IRRF)
# ver model DependenteFuncionario

# Controle
ativo: bool
data_inativacao: date | None
motivo_inativacao: str | None
created_at: datetime
updated_at: datetime
```

### `cargo.py`
```python
codigo: int               # sequencial imutável
descricao: str
cbo: str                  # obrigatório para E-Social
salario_normativo: Decimal | None   # piso do sindicato
created_at: datetime
```

### `sindicato.py`
```python
codigo: int
nome: str
cnpj: str
data_base: date           # mês da convenção coletiva
percentual_contribuicao: Decimal
created_at: datetime
```

### `evento.py`
```python
codigo: int               # sequencial imutável
descricao: str
tipo: str                 # provento / desconto
natureza: str             # fixo / variavel / percentual
referencia: str           # horas / dias / percentual / valor

# Incidências (bool para cada)
incide_inss: bool
incide_irrf: bool
incide_fgts: bool
incide_ferias: bool
incide_decimo_terceiro: bool
incide_aviso_previo: bool

# Configuração contábil do evento
# Define como cada evento vira lançamento contábil
conta_debito_id: int | None       # FK plano_de_contas — conta a debitar
conta_credito_id: int | None      # FK plano_de_contas — conta a creditar
historico_padrao_id: int | None   # FK historico_padrao — texto do lançamento
gera_lancamento_contabil: bool    # se False, evento não gera lançamento

ativo: bool
created_at: datetime
```

### `folha_pagamento.py`
```python
codigo: int               # sequencial imutável por empresa
empresa_id: int
competencia_mes: int      # 1-12
competencia_ano: int
status: str               # aberta / calculada / fechada

# Totais calculados
total_proventos: Decimal
total_descontos: Decimal
total_liquido: Decimal
total_inss_empregado: Decimal
total_irrf: Decimal
total_fgts: Decimal
total_inss_patronal: Decimal
total_rat_fap: Decimal
total_terceiros: Decimal

data_calculo: datetime | None
data_fechamento: datetime | None
created_at: datetime
```

### `lancamento_variavel.py`
```python
codigo: int               # sequencial imutável por empresa
empresa_id: int
funcionario_id: int
folha_id: int
evento_id: int
competencia_mes: int
competencia_ano: int
quantidade: Decimal | None    # horas, dias
valor: Decimal | None         # valor fixo ou calculado
observacao: str | None

# Soft delete
excluido: bool
data_exclusao: datetime | None
excluido_definitivamente: bool
created_at: datetime
```

### `ferias.py`
```python
codigo: int
empresa_id: int
funcionario_id: int

# Período aquisitivo
periodo_aquisitivo_inicio: date
periodo_aquisitivo_fim: date

# Gozo
data_inicio_gozo: date
data_fim_gozo: date
dias_ferias: int
dias_abono_pecuniario: int    # máximo 10 dias

# Valores
valor_ferias: Decimal
valor_um_terco: Decimal
valor_abono: Decimal
base_inss: Decimal
valor_inss: Decimal
base_irrf: Decimal
valor_irrf: Decimal
valor_liquido: Decimal

status: str               # agendada / paga / cancelada
data_pagamento: date | None
created_at: datetime
```

### `decimo_terceiro.py`
```python
codigo: int
empresa_id: int
funcionario_id: int
ano: int
avos: int                 # meses trabalhados no ano

# 1ª Parcela
valor_primeira_parcela: Decimal
data_pagamento_primeira: date | None
pago_primeira: bool

# 2ª Parcela
valor_segunda_parcela: Decimal
base_inss_segunda: Decimal
valor_inss_segunda: Decimal
base_irrf_segunda: Decimal
valor_irrf_segunda: Decimal
valor_liquido_segunda: Decimal
data_pagamento_segunda: date | None
pago_segunda: bool

created_at: datetime
```

### `rescisao.py`
```python
codigo: int
empresa_id: int
funcionario_id: int
data_demissao: date
tipo_demissao: str
# sem_justa_causa / com_justa_causa / pedido_demissao
# acordo_484a / termino_contrato / aposentadoria / falecimento

aviso_previo_tipo: str        # trabalhado / indenizado / dispensado
aviso_previo_dias: int        # 30 + 3 por ano (máx 90)

# Verbas (todas Decimal)
saldo_salario: Decimal
ferias_vencidas: Decimal
ferias_vencidas_um_terco: Decimal
ferias_proporcionais: Decimal
ferias_proporcionais_um_terco: Decimal
decimo_terceiro_proporcional: Decimal
aviso_previo_valor: Decimal
multa_fgts: Decimal           # 40% sem justa / 20% acordo / 0% demais
inss: Decimal
irrf: Decimal
outras_verbas: Decimal        # descontos e verbas adicionais

total_bruto: Decimal
total_descontos: Decimal
total_liquido: Decimal

trct_gerado: bool
data_pagamento: date | None
created_at: datetime
```

---

## Services — Regras de Cálculo

### `calculo_inss.py`
```
ATENÇÃO: Tabela progressiva — deve ser versionada por competência no banco.
Nunca hardcodar valores no código. Sempre buscar tabela vigente para a competência.

Tabela 2025 (referência):
Faixa 1: até R$ 1.518,00        → 7,5%
Faixa 2: R$ 1.518,01-2.793,88  → 9,0%
Faixa 3: R$ 2.793,89-4.190,83  → 12,0%
Faixa 4: R$ 4.190,84-8.157,41  → 14,0%
Teto de contribuição: R$ 908,86

Cálculo: progressivo por faixa (igual ao IR)
— NÃO é alíquota única sobre o total

Casos especiais:
- Autônomo / contribuinte individual: alíquota única 20% (patronal) ou 11% (próprio)
- Pró-labore: 11% (sem teto para contribuição patronal)
- Menor aprendiz: 2% FGTS, INSS normal

INSS Patronal:
- 20% sobre total da folha (Lucro Real e Presumido)
- Simples Nacional: isento da cota patronal de 20%
- RAT (Risco Ambiental do Trabalho): 1%, 2% ou 3% conforme CNAE × FAP
- Terceiros (SESI/SESC, SENAI/SENAC, SEBRAE, INCRA, Salário Educação): conforme CNAE
```

### `calculo_irrf.py`
```
ATENÇÃO: Tabela deve ser versionada por competência. Nunca hardcodar.

Tabela 2025 (referência):
Isento:      até R$ 2.259,20
7,5%:        R$ 2.259,21 - R$ 2.826,65   parcela deduzir: R$ 169,44
15,0%:       R$ 2.826,66 - R$ 3.751,05   parcela deduzir: R$ 381,44
22,5%:       R$ 3.751,06 - R$ 4.664,68   parcela deduzir: R$ 662,77
27,5%:       acima de R$ 4.664,68         parcela deduzir: R$ 896,00

Deduções permitidas (abater da base antes de calcular):
- Dependentes: R$ 189,59 por dependente (valor 2025)
- Pensão alimentícia judicial: valor integral
- INSS do mês: valor integral
- Desconto simplificado: R$ 564,80 (usar quando mais vantajoso que deduções)
- Contribuição previdenciária complementar (quando houver)

Fórmula:
Base IRRF = Salário Bruto - INSS - Dependentes - Pensão - (outras deduções)
IRRF = (Base × Alíquota) - Parcela a Deduzir

Isenções importantes:
- PLR (Participação nos Lucros): tabela própria e separada
- Férias: incide IRRF normalmente sobre o total (salário + 1/3)
- 13º 2ª parcela: incide IRRF sobre valor total do 13º
- Indenizações rescisórias legais: isentas de IRRF
- Aviso prévio indenizado: isento de IRRF
```

### `calculo_fgts.py`
```
Percentuais:
- CLT geral: 8% sobre remuneração bruta
- Menor aprendiz: 2% sobre remuneração bruta
- Rescisão sem justa causa: multa 40% sobre saldo FGTS
- Acordo § 484-A: multa 20% sobre saldo FGTS

Verbas que INCIDEM FGTS:
✅ Salário base
✅ Horas extras
✅ Adicional noturno
✅ Adicional de periculosidade
✅ Adicional de insalubridade
✅ Comissões
✅ Gorjetas
✅ 13º salário (1ª e 2ª parcela)
✅ Férias (exceto 1/3 constitucional)
✅ Aviso prévio trabalhado

Verbas que NÃO INCIDEM FGTS:
❌ 1/3 constitucional de férias
❌ Aviso prévio indenizado
❌ Diárias de viagem (até 50% do salário)
❌ Auxílio-doença (a partir do 16º dia — pago pelo INSS)
❌ Indenizações rescisórias legais
```

### `calculo_ferias.py`
```
Direito: 30 dias após 12 meses de período aquisitivo

Abono Pecuniário:
- Funcionário pode converter até 10 dias em dinheiro
- Deve ser solicitado até 15 dias antes do início do gozo

Fórmula:
Valor diário = Salário mensal ÷ 30
Valor férias = Valor diário × dias de gozo
1/3 constitucional = Valor férias × 1/3
Abono = Valor diário × dias de abono × 1,3333

Base INSS = Valor férias + 1/3 + Abono
INSS = Calcular progressivo sobre base
Base IRRF = Base INSS - INSS calculado - deduções dependentes
IRRF = Calcular progressivo sobre base IRRF

Prazo pagamento: até 2 dias ANTES do início do gozo

Férias vencidas (não gozadas):
- Após 2 períodos aquisitivos sem gozo: multa (dobro do valor)
- Sistema deve alertar com 60 dias de antecedência
```

### `calculo_decimo_terceiro.py`
```
Avos: meses trabalhados ÷ 12
- Fração ≥ 15 dias no mês: conta como mês completo
- Fração < 15 dias: não conta

1ª Parcela (pagar até 30/novembro ou nas férias):
Valor = (Salário base ÷ 12) × avos
SEM desconto de INSS e IRRF

2ª Parcela (pagar até 20/dezembro):
Valor bruto = (Salário base ÷ 12) × avos
Base INSS = Valor bruto total do 13º (1ª + 2ª)
INSS 2ª = INSS sobre total - INSS já descontado na 1ª (se houver)
Base IRRF = Valor bruto total - INSS - deduções dependentes
IRRF = Calcular progressivo sobre base IRRF
Líquido 2ª = Valor 2ª - INSS 2ª - IRRF

Admitidos no ano: calcular avos proporcional ao tempo de serviço
```

### `calculo_rescisao.py`
```
AVISO PRÉVIO PROPORCIONAL (Lei 12.506/2011):
30 dias base + 3 dias por ano completo trabalhado
Máximo: 90 dias

Verbas por tipo de demissão:

SEM JUSTA CAUSA (art. 482 CLT — pelo empregador):
✅ Saldo de salário (dias trabalhados no mês)
✅ Férias vencidas + 1/3
✅ Férias proporcionais + 1/3
✅ 13º proporcional
✅ Aviso prévio (trabalhado ou indenizado)
✅ Multa FGTS 40%
✅ Liberação saldo FGTS
✅ Seguro-desemprego (verificar tempo de serviço)

COM JUSTA CAUSA (art. 482 CLT — falta grave):
✅ Saldo de salário
✅ Férias vencidas + 1/3
❌ Férias proporcionais
❌ 13º proporcional
❌ Aviso prévio
❌ Multa FGTS
❌ Liberação FGTS
❌ Seguro-desemprego

PEDIDO DE DEMISSÃO (pelo empregado):
✅ Saldo de salário
✅ Férias vencidas + 1/3
✅ Férias proporcionais + 1/3
✅ 13º proporcional
⚠️ Aviso prévio: descontado se não cumprido pelo empregado
❌ Multa FGTS
❌ Liberação FGTS
❌ Seguro-desemprego

ACORDO (§ 484-A CLT):
✅ Saldo de salário
✅ Férias vencidas + 1/3
✅ Férias proporcionais + 1/3
✅ 13º proporcional
✅ Metade do aviso prévio indenizado
✅ Multa FGTS 20%
✅ Saque de 80% do saldo FGTS
❌ Seguro-desemprego

ISENÇÕES DE IRRF NA RESCISÃO:
❌ Aviso prévio indenizado (isento)
❌ Indenização por tempo de serviço (isento)
❌ Multa 40% FGTS (isenta)
✅ Saldo de salário (tributado normalmente)
✅ 13º proporcional (tributado)
✅ Férias + 1/3 (tributado)
```

---

## Tabelas de Referência — Modelo no Banco

### `tabela_inss` (versionada por competência)
```python
competencia_inicio: date
competencia_fim: date | None
faixas: JSON  # lista de {limite, aliquota}
teto_contribuicao: Decimal
```

### `tabela_irrf` (versionada por competência)
```python
competencia_inicio: date
competencia_fim: date | None
faixas: JSON  # lista de {limite, aliquota, parcela_deduzir}
valor_dependente: Decimal
desconto_simplificado: Decimal
```

---

## Relatórios

### Holerite
```
Cabeçalho: razão social empresa, CNPJ, endereço
Funcionário: nome, matrícula, cargo, departamento, CPF, PIS
Competência: mês/ano
Admissão: data
Salário base: valor

Corpo:
| Código | Descrição | Referência | Proventos | Descontos |
|--------|-----------|------------|-----------|-----------|
| 0001   | Salário   | 30 dias    | R$ xxx    |           |
| 0010   | INSS      |            |           | R$ xxx    |
| ...    | ...       | ...        | ...       | ...       |

Totais: Total proventos | Total descontos | Líquido a receber
Bases: Base INSS | Base IRRF | FGTS do mês
Rodapé: Banco | Agência | Conta | Assinatura funcionário
```

### Memória de Cálculo INSS
```
Por funcionário:
- Remuneração bruta
- Detalhamento por faixa:
  Faixa 1: R$ x,xx × 7,5% = R$ x,xx
  Faixa 2: R$ x,xx × 9,0% = R$ x,xx
  ...
- Total INSS empregado

Totais da empresa:
- Total folha
- INSS patronal 20%: R$ x,xx
- RAT/FAP (grau_risco × FAP): R$ x,xx
- Terceiros (SESI/SESC, SENAI/SENAC etc.): R$ x,xx
- Total encargos patronais: R$ x,xx
```

### Memória de Cálculo IRRF
```
Por funcionário:
- Remuneração bruta
- (-) INSS: R$ x,xx
- (-) Dependentes (n × R$ 189,59): R$ x,xx
- (-) Pensão alimentícia: R$ x,xx
- (=) Base de cálculo: R$ x,xx
- Alíquota aplicada: x%
- (-) Parcela a deduzir: R$ x,xx
- (=) IRRF devido: R$ x,xx
```

### Memória de Cálculo FGTS
```
Por funcionário:
- Base de cálculo FGTS
- Percentual: 8% (ou 2% aprendiz)
- FGTS do mês: R$ x,xx

Total a recolher pela empresa:
- Soma de todos os funcionários
- Prazo: até dia 7 do mês seguinte (ou próximo dia útil)
```

### Resumo da Folha
```
Por departamento/centro de custo:
- Qtd funcionários
- Total proventos
- Total descontos
- Total líquido
- Total encargos

Totais gerais da empresa
```

### Relatório de Férias
```
Férias vencidas (período aquisitivo encerrado sem gozo agendado)
Férias a vencer nos próximos 30 dias
Férias a vencer nos próximos 60 dias
Férias a vencer nos próximos 90 dias
Histórico de férias gozadas por funcionário
```

### Relatório de Líquidos
```
Lista de funcionários com:
- Nome, matrícula
- Banco, agência, conta
- Valor líquido
Subtotais por banco (facilita geração de arquivo de pagamento)
```

### TRCT — Termo de Rescisão do Contrato de Trabalho
```
Layout oficial Ministério do Trabalho
Todas as verbas discriminadas com base de cálculo
Campos de assinatura: empresa e funcionário
Data limite de pagamento (1º dia útil após aviso ou 10º dia após término)
```

---

## Integração Contábil — Especificação Completa

### Conceito
Cada evento da folha de pagamentos possui configuração contábil própria.
Ao fechar a folha, o sistema percorre todos os eventos de todos os funcionários
e gera lançamentos contábeis automaticamente no módulo de Contabilidade,
usando as contas e o histórico configurados em cada evento.

O usuário configura UMA VEZ as contas contábeis por evento.
A partir daí, todo fechamento de folha gera os lançamentos automaticamente.

---

### Novos Models para Integração Contábil

#### `configuracao_contabil_evento.py`
```python
# Configuração contábil por evento — definida pelo contador
id: int
empresa_id: int
evento_id: int                    # FK evento da folha

# Contas contábeis
conta_debito_id: int              # FK plano_de_contas
conta_credito_id: int             # FK plano_de_contas

# Histórico
historico_padrao_id: int | None   # FK historico_padrao (texto fixo)
historico_complemento: str | None # texto livre adicional ao histórico padrão

# Agrupamento
agrupar_por: str
# funcionario  → um lançamento por funcionário por evento
# evento       → um lançamento consolidado por evento (soma todos funcionários)
# centro_custo → um lançamento por centro de custo por evento

gera_lancamento: bool             # permite desativar sem excluir configuração
created_at: datetime
updated_at: datetime
```

#### `configuracao_contabil_encargo.py`
```python
# Configuração contábil dos encargos patronais
# (INSS patronal, RAT/FAP, terceiros, FGTS patronal)
id: int
empresa_id: int
tipo_encargo: str
# inss_patronal / rat_fap / terceiros_sesi / terceiros_senai
# terceiros_sebrae / terceiros_salario_educacao / fgts

conta_debito_id: int              # FK plano_de_contas (despesa)
conta_credito_id: int             # FK plano_de_contas (passivo — a recolher)
historico_padrao_id: int | None
agrupar_por: str                  # total / centro_custo

gera_lancamento: bool
created_at: datetime
```

#### `lancamento_contabil_folha.py`
```python
# Registro dos lançamentos gerados — rastreabilidade completa
id: int
empresa_id: int
folha_id: int                     # FK folha_pagamento que originou
lancamento_contabil_id: int       # FK lançamento no módulo Contabilidade
evento_id: int | None             # FK evento que originou (null para encargos)
tipo_origem: str
# evento_folha / inss_patronal / rat_fap / terceiros / fgts / liquido_pagar

funcionario_id: int | None        # preenchido quando agrupar_por = funcionario
centro_custo_id: int | None       # preenchido quando agrupar_por = centro_custo
valor: Decimal
created_at: datetime
```

---

### Configuração Padrão Sugerida de Contas

O sistema deve oferecer uma configuração padrão que o contador pode ajustar:

```
PROVENTOS (débito em despesa, crédito em passivo):

Salários e ordenados
  D — 6.1.1.01 Salários e Ordenados
  C — 2.1.3.01 Salários a Pagar

Horas extras
  D — 6.1.1.02 Horas Extras
  C — 2.1.3.01 Salários a Pagar

Adicional noturno
  D — 6.1.1.03 Adicional Noturno
  C — 2.1.3.01 Salários a Pagar

Comissões
  D — 6.1.1.04 Comissões
  C — 2.1.3.01 Salários a Pagar

Férias
  D — 6.1.1.05 Férias
  C — 2.1.3.02 Férias a Pagar

13º Salário
  D — 6.1.1.06 13º Salário
  C — 2.1.3.03 13º Salário a Pagar

DESCONTOS (débito em passivo, crédito em passivo a recolher):

INSS empregado retido
  D — 2.1.3.01 Salários a Pagar
  C — 2.1.4.01 INSS a Recolher

IRRF retido
  D — 2.1.3.01 Salários a Pagar
  C — 2.1.4.02 IRRF a Recolher

ENCARGOS PATRONAIS (débito em despesa, crédito em passivo a recolher):

INSS patronal
  D — 6.1.2.01 INSS Patronal
  C — 2.1.4.01 INSS a Recolher

RAT/FAP
  D — 6.1.2.02 RAT/FAP
  C — 2.1.4.01 INSS a Recolher

Terceiros (SESI, SENAI, SEBRAE etc.)
  D — 6.1.2.03 Contribuições a Terceiros
  C — 2.1.4.03 Terceiros a Recolher

FGTS
  D — 6.1.2.04 FGTS
  C — 2.1.4.04 FGTS a Recolher

PAGAMENTO DA FOLHA:

Líquido a pagar
  D — 2.1.3.01 Salários a Pagar
  C — 1.1.1.01 Banco Conta Movimento (ou Caixa)
```

> IMPORTANTE: As contas sugeridas acima são apenas referência.
> Cada empresa tem seu próprio plano de contas cadastrado no módulo
> de Contabilidade. O contador deve configurar as contas corretas
> antes do primeiro fechamento.

---

### Service `integracao_contabil_folha.py`

```python
"""
Orquestrador da integração folha → contabilidade.
Executado pelo worker Celery após fechamento da folha.
"""

def gerar_lancamentos_folha(folha_id: int, empresa_id: int):
    """
    Fluxo:
    1. Buscar folha fechada e todos os seus lançamentos por funcionário
    2. Buscar configurações contábeis de cada evento
    3. Para cada evento com gera_lancamento = True:
       - Agrupar valores conforme agrupar_por (funcionario / evento / centro_custo)
       - Montar lançamento contábil com débito, crédito, histórico e valor
       - Enviar ao módulo Contabilidade via service interno
       - Registrar em lancamento_contabil_folha para rastreabilidade
    4. Gerar lançamentos dos encargos patronais (INSS, RAT, terceiros, FGTS)
    5. Gerar lançamento do líquido total a pagar
    6. Retornar lista de lançamentos gerados com seus códigos sequenciais
    """

def reverter_lancamentos_folha(folha_id: int):
    """
    Chamado quando uma folha fechada é reaberta.
    Estorna todos os lançamentos contábeis gerados por aquela folha.
    Gera lançamentos de estorno (débito e crédito invertidos) com
    histórico indicando que é estorno da folha de competência X.
    Nunca apaga lançamentos — sempre estorna.
    """

def preview_lancamentos(folha_id: int):
    """
    Gera prévia dos lançamentos que serão criados ANTES do fechamento.
    Permite ao contador revisar e ajustar configurações contábeis
    antes de efetivar o fechamento da folha.
    """
```

---

### Fluxo Completo da Integração

```
CONFIGURAÇÃO (feita uma vez pelo contador):
  Cadastro de evento na folha
        ↓
  Tela de configuração contábil do evento:
    - Selecionar conta débito (busca no plano de contas da empresa)
    - Selecionar conta crédito (busca no plano de contas da empresa)
    - Selecionar histórico padrão (busca nos históricos cadastrados)
    - Definir agrupamento (por funcionário / por evento / por centro de custo)
        ↓
  Configuração salva em configuracao_contabil_evento

EXECUÇÃO (automática a cada fechamento):
  Usuário clica em "Fechar Folha"
        ↓
  Sistema exibe PRÉVIA dos lançamentos que serão gerados
  (quantidade, contas, valores totais por grupo)
        ↓
  Usuário confirma o fechamento
        ↓
  Folha status → "fechada"
        ↓
  Worker Celery dispara integracao_contabil_folha.gerar_lancamentos_folha()
        ↓
  Para cada evento com configuração contábil:
    Agrupa valores conforme configuração
    Gera lançamento no módulo Contabilidade
    (com código sequencial imutável do módulo contábil)
        ↓
  Gera lançamentos dos encargos patronais
        ↓
  Gera lançamento do líquido a pagar
        ↓
  Registra rastreabilidade em lancamento_contabil_folha
        ↓
  Notifica usuário: "X lançamentos gerados com sucesso"

REABERTURA DA FOLHA (se necessário corrigir algo):
  Usuário solicita reabertura com justificativa
        ↓
  Sistema gera lançamentos de ESTORNO (nunca apaga)
        ↓
  Folha volta ao status "aberta"
        ↓
  Usuário corrige e fecha novamente → novo ciclo de lançamentos
```

---

### Interface — Telas Necessárias

**Configuração contábil dos eventos** (`/folha/configuracao-contabil`)
```
Listagem de todos os eventos cadastrados mostrando:
- Código e descrição do evento
- Conta débito configurada (ou "Não configurado" em vermelho)
- Conta crédito configurada (ou "Não configurado" em vermelho)
- Histórico padrão
- Agrupamento
- Gera lançamento: Sim/Não

Botão editar em cada linha → modal de configuração
Alerta: "X eventos sem configuração contábil" no topo se houver pendências
```

**Prévia de lançamentos** (modal antes do fechamento)
```
Tabela com os lançamentos que serão gerados:
| Descrição (histórico) | Conta Débito | Conta Crédito | Valor |
|-----------------------|--------------|---------------|-------|
| Salários 04/2026      | 6.1.1.01     | 2.1.3.01      | R$ x  |
| INSS Retido 04/2026   | 2.1.3.01     | 2.1.4.01      | R$ x  |
| INSS Patronal 04/2026 | 6.1.2.01     | 2.1.4.01      | R$ x  |
| ...                   | ...          | ...           | ...   |

Total de lançamentos: X
Avisos: eventos sem configuração contábil (não serão lançados)
Botões: "Cancelar" | "Confirmar e Fechar Folha"
```

**Rastreabilidade** (dentro da folha fechada)
```
Aba "Lançamentos Contábeis Gerados":
Lista de todos os lançamentos com link direto
para o lançamento no módulo Contabilidade
```

---

## Integrações com Outros Módulos

### → Contabilidade
```
Evento gatilho: fechamento da folha (status = fechada)
Mecanismo: Worker Celery → integracao_contabil_folha.gerar_lancamentos_folha()
Dados gerados:
- Um lançamento contábil por evento configurado (agrupado conforme configuração)
- Lançamentos dos encargos patronais (INSS, RAT, terceiros, FGTS)
- Lançamento do líquido total a pagar
Rastreabilidade: tabela lancamento_contabil_folha vincula folha ↔ lançamentos
Estorno: reabertura da folha gera estornos automáticos — nunca apaga lançamentos
Pré-requisito: todas as contas contábeis e históricos devem estar configurados
```

### → E-Social
```
Gatilhos automáticos:
- Novo funcionário cadastrado → S-2200 (admissão)
- Alteração contratual → S-2206
- Afastamento registrado → S-2230
- Folha fechada → S-1200 (remuneração) + S-1210 (pagamento)
- Rescisão → S-2299
Ver AGENT_ESOCIAL.md para detalhes completos
```

---

## Regras de Negócio Específicas

- Folha só pode ser calculada com status "aberta"
- Folha fechada não pode ser alterada — deve ser reaberta com justificativa registrada
- Reabrir folha fechada gera log de auditoria com usuário, data e motivo
- Funcionário inativo não aparece em novas folhas mas histórico é preservado
- Múltiplos vínculos do mesmo CPF na mesma empresa são permitidos (CLT + pró-labore)
- Salário não pode ser inferior ao salário mínimo vigente — sistema deve alertar
- Cargo com CBO é obrigatório antes de gerar eventos E-Social

---

## Status de Desenvolvimento

- [ ] Models de cadastros (funcionario, cargo, sindicato, evento)
- [ ] Tabelas tributárias versionadas (INSS, IRRF)
- [ ] Service calculo_inss (progressivo por faixa)
- [ ] Service calculo_irrf (progressivo com deduções)
- [ ] Service calculo_fgts
- [ ] Service calculo_folha (orquestrador)
- [ ] Lançamentos de variáveis com soft/hard delete
- [ ] Service calculo_ferias
- [ ] Service calculo_decimo_terceiro
- [ ] Service calculo_rescisao (todos os tipos)
- [ ] Worker processar_folha (Celery — assíncrono)
- [ ] Relatório holerite (PDF)
- [ ] Memória de cálculo INSS (PDF)
- [ ] Memória de cálculo IRRF (PDF)
- [ ] Memória de cálculo FGTS (PDF)
- [ ] Resumo da folha (PDF)
- [ ] Relatório de férias
- [ ] Relatório de líquidos
- [ ] TRCT — Termo de Rescisão (PDF)
- [ ] Integração automática → Contabilidade
- [ ] Model configuracao_contabil_evento
- [ ] Model configuracao_contabil_encargo
- [ ] Model lancamento_contabil_folha (rastreabilidade)
- [ ] Tela de configuração contábil dos eventos
- [ ] Service preview_lancamentos (prévia antes do fechamento)
- [ ] Service integracao_contabil_folha (orquestrador)
- [ ] Service reverter_lancamentos_folha (estorno na reabertura)
- [ ] Worker integração contábil (Celery — assíncrono)
- [ ] Aba rastreabilidade dentro da folha fechada
- [ ] Integração automática → E-Social
