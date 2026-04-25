# AGENT_CONTABILIDADE.md — Módulo Contabilidade

## Como usar este agente
Instrua o Claude Code a ler este arquivo junto com o CLAUDE.md antes de trabalhar no módulo:
> "Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md antes de continuar"

Para trabalhar na integração com a folha de pagamentos, inclua também:
> "Leia o CLAUDE.md, o docs/agents/AGENT_CONTABILIDADE.md e o docs/agents/AGENT_FOLHA.md antes de continuar"

---

## Visão Geral do Módulo

Módulo responsável pela escrituração contábil das empresas clientes do escritório.
Abrange o plano de contas configurável por empresa, lançamentos manuais e automáticos,
conciliação bancária via OFX, relatórios obrigatórios e gerenciais, e utilitários
de manutenção. Recebe lançamentos automáticos do módulo Fiscal e do módulo Folha.

---

## Estrutura de Arquivos

```
backend/src/
├── models/
│   └── contabilidade/
│       ├── __init__.py
│       ├── plano_contas.py
│       ├── centro_custo.py
│       ├── historico_padrao.py
│       ├── lancamento.py
│       ├── conta_bancaria.py
│       ├── historico_bancario.py
│       ├── conciliacao.py
│       ├── saldo_inicial.py
│       └── configuracao_zeramento.py
│
├── services/
│   └── contabilidade/
│       ├── __init__.py
│       ├── plano_contas.py
│       ├── lancamento.py
│       ├── importacao_ofx.py
│       ├── importacao_excel.py
│       ├── conciliacao.py
│       ├── zeramento.py
│       ├── relatorio_diario.py
│       ├── relatorio_razao.py
│       ├── relatorio_balancete.py
│       ├── relatorio_balanco.py
│       ├── relatorio_dre.py
│       └── relatorio_dfc.py
│
├── routes/
│   └── contabilidade/
│       ├── __init__.py
│       ├── plano_contas.py
│       ├── centro_custo.py
│       ├── historico_padrao.py
│       ├── lancamentos.py
│       ├── conta_bancaria.py
│       ├── historico_bancario.py
│       ├── conciliacao.py
│       ├── saldo_inicial.py
│       ├── zeramento.py
│       ├── utilitarios.py
│       └── relatorios.py
│
├── schemas/
│   └── contabilidade/
│       ├── __init__.py
│       ├── plano_contas.py
│       ├── lancamento.py
│       ├── conciliacao.py
│       └── relatorios.py
│
└── workers/
    └── contabilidade/
        ├── __init__.py
        ├── processar_ofx.py
        ├── gerar_relatorios.py
        └── processar_zeramento.py
```

---

## Models — Especificação Detalhada

### `plano_contas.py`
```python
# Plano de contas configurável por empresa com máscara definida pelo usuário

id: int
empresa_id: int

# Classificação gerada conforme a máscara da empresa
# Exemplos: "1", "1.01", "1.01.01", "1.01.01.01", "1.01.01.01.0001"
classificacao: str            # código completo da conta (imutável após criação)
descricao: str
nivel: int                    # calculado automaticamente pela posição na máscara

natureza: str                 # D (devedora) ou C (credora)
tipo: str                     # sintetica / analitica
# sintética: agrupa — não recebe lançamentos
# analítica: último nível — recebe lançamentos diretamente

# Campos obrigatórios para contas analíticas (último nível)
codigo_reduzido: str | None   # código curto para facilitar digitação nos lançamentos
                              # obrigatório quando tipo = analitica

# Campo para composição da DRE
titulo_dre: str | None        # título que aparece na DRE (apenas contas de resultado)
grupo_dre: str | None         # grupo na DRE (receita_bruta / deducoes / despesas etc.)

# Campo para SPED ECF
codigo_ecf: str | None        # código da conta no plano referencial da ECF

# Controle
ativo: bool
conta_pai_id: int | None      # FK para conta sintética pai
created_at: datetime
updated_at: datetime

# REGRAS:
# Ativo → classificação inicia com 1
# Passivo → classificação inicia com 2
# Resultado → classificação inicia com 3 ou superior
# Somente contas analíticas (último nível) recebem lançamentos
# Conta sintética não pode receber lançamento diretamente
```

### `mascara_plano_contas.py`
```python
# Máscara configurada por empresa — define a estrutura do plano de contas
# Cadastrada no módulo de Configurações da empresa

empresa_id: int               # único por empresa
mascara: str                  # ex: "X.XX.XX.XX.XXXX" ou "0.00.00.00.0000"
separador: str                # geralmente "." — pode ser "-" ou "/"
quantidade_niveis: int        # calculado automaticamente pela máscara

# REGRA: cada segmento da máscara separado por "." representa um nível
# X     → 1 dígito → nível 1 (máx 9 contas)
# XX    → 2 dígitos → nível 2 (máx 99 contas)
# XXX   → 3 dígitos → nível 3 (máx 999 contas)
# XXXX  → 4 dígitos → nível 5 (máx 9999 contas)

# O sistema preenche automaticamente o separador "." durante a digitação
# Usuário digita: 1 → sistema exibe: 1.
# Usuário digita: 01 → sistema exibe: 1.01.
# e assim sucessivamente
```

### `centro_custo.py`
```python
codigo: int                   # sequencial imutável por empresa
descricao: str
ativo: bool
created_at: datetime
```

### `historico_padrao.py`
```python
codigo: int                   # sequencial numérico por empresa
descricao: str                # texto do histórico contábil
ativo: bool
created_at: datetime

# Exemplos:
# 001 — Pagamento de fornecedor
# 002 — Recebimento de cliente
# 003 — Salários e ordenados — competência MM/AAAA
# 004 — INSS patronal — competência MM/AAAA
```

### `lancamento.py`
```python
codigo: int                   # sequencial imutável por empresa (NUNCA editável)
empresa_id: int
data: date
conta_debito_id: int | None   # FK plano_contas — permitido salvar sem uma das contas
conta_credito_id: int | None  # FK plano_contas — permitido salvar sem uma das contas
historico_padrao_id: int | None
historico_complemento: str | None   # texto livre adicional
valor: Decimal
centro_custo_id: int | None

# Identificação da origem do lançamento
origem: str
# manual      → digitado diretamente pelo usuário
# fiscal      → integrado automaticamente do módulo Fiscal
# folha       → integrado automaticamente do módulo Folha
# importado   → importado via planilha Excel ou TXT
# ofx         → gerado pela importação do arquivo OFX
# zeramento   → gerado pela rotina de zeramento
# estorno     → estorno de lançamento anterior

# Referência ao registro de origem (quando automático)
origem_id: int | None         # ID do lançamento fiscal, folha_id etc.
origem_tipo: str | None       # fiscal / folha / ofx / zeramento

# Conciliação bancária
conciliado: bool
data_conciliacao: date | None
conta_bancaria_id: int | None # FK conta_bancaria (quando conciliado via OFX)

# Soft delete
excluido: bool
data_exclusao: datetime | None
usuario_exclusao_id: int | None
excluido_definitivamente: bool

created_at: datetime
updated_at: datetime
usuario_criacao_id: int
usuario_edicao_id: int | None

# REGRAS:
# código sequencial gerado pelo sistema — campo desabilitado na interface
# número perdido definitivamente se lançamento for excluído (gap aceito)
# lançamento pode ser salvo com apenas débito ou apenas crédito
# somente contas analíticas podem ser informadas em débito e crédito
# lançamentos automáticos (fiscal, folha, OFX) não podem ser editados diretamente
#   → devem ser estornados e relançados
```

### `conta_bancaria.py`
```python
id: int
empresa_id: int
banco: str
agencia: str
conta: str
digito: str | None
tipo_conta: str               # corrente / poupança
descricao: str                # nome identificador (ex: "Banco do Brasil - Conta Principal")
saldo_inicial: Decimal
data_saldo_inicial: date
conta_contabil_id: int        # FK plano_contas — conta contábil do banco
ativo: bool
created_at: datetime
```

### `historico_bancario.py`
```python
# Configuração de contas contábeis para históricos que aparecem no OFX
# Permite geração automática de lançamentos na importação OFX

id: int
empresa_id: int
conta_bancaria_id: int        # FK conta_bancaria
texto_historico: str          # texto que aparece no OFX (pode ser parcial)
conta_debito_id: int | None   # FK plano_contas
conta_credito_id: int | None  # FK plano_contas
historico_padrao_id: int | None
ativo: bool
created_at: datetime

# REGRA: o sistema faz busca por texto_historico dentro da descrição
# de cada lançamento do arquivo OFX. Se encontrar correspondência,
# usa as contas configuradas para gerar o lançamento contábil.
```

### `conciliacao.py`
```python
# Registro de cada item do arquivo OFX importado

id: int
empresa_id: int
conta_bancaria_id: int
data_importacao: datetime
arquivo_nome: str             # nome original do arquivo OFX

# Dados do lançamento no extrato bancário (vindos do OFX)
data_movimento: date
valor: Decimal
tipo: str                     # debito / credito
descricao_ofx: str            # descrição original do banco
id_transacao_ofx: str         # FITID — identificador único da transação no OFX

# Situação da conciliação
status: str
# pendente       → ainda não conciliado
# conciliado     → casado com lançamento contábil
# ignorado       → marcado pelo usuário para ignorar
# sem_cadastro   → histórico não tem conta configurada

lancamento_id: int | None     # FK lancamento — lançamento contábil vinculado
data_conciliacao: date | None
usuario_conciliacao_id: int | None

created_at: datetime
```

### `saldo_inicial.py`
```python
# Saldos iniciais ao iniciar a contabilidade de empresa vinda de outro sistema

id: int
empresa_id: int
data: date
conta_id: int                 # FK plano_contas (somente contas analíticas)
natureza: str                 # D (débito) / C (crédito)
valor: Decimal
observacao: str | None
created_at: datetime
usuario_id: int
```

### `configuracao_zeramento.py`
```python
# Configuração da rotina de zeramento do balanço

id: int
empresa_id: int
conta_zeramento_id: int       # FK plano_contas — conta intermediária de zeramento
conta_resultado_id: int       # FK plano_contas — conta do PL (lucros/prejuízos acumulados)
created_at: datetime
updated_at: datetime
```

---

## Plano de Contas — Máscara e Digitação Automática

### Regra da máscara
```
A máscara é definida pelo usuário no cadastro da empresa.
Cada segmento separado por "." representa um nível hierárquico.

Exemplo de máscara: X.XX.XX.XX.XXXX

Nível 1: X      → 1 dígito  → ex: 1, 2, 3
Nível 2: XX     → 2 dígitos → ex: 01, 02
Nível 3: XX     → 2 dígitos → ex: 01, 02
Nível 4: XX     → 2 dígitos → ex: 01, 02
Nível 5: XXXX   → 4 dígitos → ex: 0001, 0002

Conta completa: 1.01.01.01.0001
```

### Autopreenchimento do separador na interface
```
O sistema deve preencher automaticamente o separador "." conforme o usuário digita:

Usuário digita "1"      → campo exibe "1."
Usuário digita "01"     → campo exibe "1.01."
Usuário digita "01"     → campo exibe "1.01.01."
Usuário digita "01"     → campo exibe "1.01.01.01."
Usuário digita "0001"   → campo exibe "1.01.01.01.0001"

O sistema valida o preenchimento contra a máscara da empresa.
Contas sintéticas (níveis intermediários) não exigem código reduzido.
Contas analíticas (último nível) EXIGEM código reduzido obrigatoriamente.
```

### Importação do plano de contas entre empresas
```
O sistema deve permitir copiar o plano de contas de uma empresa para outra.
Útil quando o contador usa um plano padrão para várias empresas.

Fluxo:
1. Usuário acessa "Importar Plano de Contas" na empresa destino
2. Seleciona a empresa de origem
3. Sistema copia todas as contas da empresa de origem para a destino
4. Mantém a hierarquia, classificações, natureza e campos obrigatórios
5. Lança log de quais contas foram importadas

ATENÇÃO: verificar se a máscara das duas empresas é compatível antes de importar.
Se forem diferentes, alertar o usuário.

Também deve ser possível importar o plano de contas via planilha Excel
com layout padrão do sistema (ver seção Importações).
```

---

## Lançamentos Contábeis — Regras Detalhadas

### Tela de lançamento
```
Campos:
- Data (obrigatório)
- Código do lançamento (gerado pelo sistema — desabilitado)
- Conta débito (busca por código reduzido ou descrição — atalho para listar)
- Conta crédito (busca por código reduzido ou descrição — atalho para listar)
- Histórico padrão (lista os históricos cadastrados)
- Complemento do histórico (texto livre — opcional)
- Valor (obrigatório)
- Centro de custo (opcional)
- Origem (preenchido automaticamente pelo sistema — desabilitado)

Totalizadores do dia (somente visualização — sem edição):
- Total débito do dia: soma de todos os lançamentos de débito da data informada
- Total crédito do dia: soma de todos os lançamentos de crédito da data informada
- Diferença: alerta visual quando débito ≠ crédito

Botões disponíveis:
- Novo lançamento
- Pesquisar
- Editar (somente lançamentos manuais)
- Excluir (inicia soft delete — vai para lixeira)
- Salvar

Sigla de origem exibida em cada lançamento:
- MAN → manual
- FIS → fiscal
- FOL → folha de pagamentos
- IMP → importado (Excel/TXT)
- OFX → importado via arquivo OFX
- ZER → zeramento
- EST → estorno
```

### Regras de edição e exclusão
```
Lançamentos MANUAIS:
- Podem ser editados diretamente
- Podem ser excluídos (soft delete → lixeira → hard delete)

Lançamentos AUTOMÁTICOS (FIS, FOL, OFX, ZER):
- NÃO podem ser editados diretamente na tela de lançamento
- Para corrigir: deve-se estornar o lançamento e gerar um novo
- O sistema oferece botão "Estornar" que cria lançamento com
  débito e crédito invertidos e origem = "EST"

Lançamentos com APENAS débito ou crédito:
- O sistema PERMITE salvar mesmo incompleto
- Exibe alerta visual indicando que o lançamento está incompleto
- O totalizador do dia aponta a diferença entre débito e crédito
```

---

## Conciliação Bancária — OFX

### Fluxo de importação e conciliação
```
PASSO 1 — Cadastro prévio (feito uma vez):
  Cadastrar conta bancária com saldo inicial e conta contábil
  Configurar históricos bancários com contas para geração automática

PASSO 2 — Importação do arquivo OFX:
  Usuário acessa "Importar OFX" e seleciona a conta bancária
  Seleciona o arquivo .ofx da instituição bancária
  Sistema lê o arquivo e exibe os lançamentos encontrados

  Opção: "Gerar lançamentos contábeis automaticamente"
  - Se marcada: sistema busca cada descrição do OFX nos históricos bancários cadastrados
    → Se encontrar correspondência: gera lançamento contábil com as contas configuradas
    → Se NÃO encontrar: importa o item com status "sem_cadastro" e avisa o usuário
  - Se não marcada: importa apenas para conciliação manual

PASSO 3 — Conciliação:
  Tela de conciliação exibe dois lados lado a lado:
  Esquerda: lançamentos do extrato OFX
  Direita: lançamentos contábeis da conta bancária no mesmo período

  O sistema concilia automaticamente os que identifica como iguais
  (data + valor + tipo)

  Para os demais, o usuário concilia manualmente:
  - Seleciona item do OFX e item contábil correspondente → "Conciliar"
  - Marca item como "Ignorar" (lançamento duplicado, tarifa sem relevância etc.)

PASSO 4 — Resultado:
  Relatório de conciliação mostrando:
  - Itens conciliados
  - Itens do OFX sem lançamento contábil correspondente
  - Lançamentos contábeis sem correspondência no OFX
  - Saldo do extrato × saldo contábil
```

---

## Rotina de Saldos Iniciais

```
Utilizada quando uma empresa nova começa a usar o sistema vinda de outra contabilidade.
Permite lançar o saldo inicial do balanço (Ativo, Passivo e PL) em uma data específica.

Campos por linha:
- Conta contábil (somente contas analíticas)
- Natureza: D (débito) ou C (crédito)
- Valor

Validação:
- Total de débitos deve ser igual ao total de créditos ao finalizar
- Sistema alerta se houver diferença entre débito e crédito total
- Após confirmar, os saldos são incorporados à contabilidade na data informada
```

---

## Rotina de Zeramento do Balanço

```
Finalidade: zerar as contas de resultado ao final do exercício,
transportando o lucro/prejuízo para o Patrimônio Líquido.

Configuração prévia (feita uma vez pelo contador):
- Conta de zeramento (intermediária — pode ser uma conta específica para isso)
- Conta de destino no PL (ex: Lucros ou Prejuízos Acumulados)

Processamento automático:
Para cada conta analítica de resultado com saldo:
  Se a conta tem natureza C (credora) e saldo credor:
    D — Conta de resultado (pelo valor do saldo)
    C — Conta de zeramento (pelo mesmo valor)
  Se a conta tem natureza D (devedora) e saldo devedor:
    D — Conta de zeramento (pelo valor do saldo)
    C — Conta de resultado (pelo mesmo valor)

Após zerar todas as contas de resultado:
  A conta de zeramento ficará com saldo = lucro ou prejuízo do período
  Último lançamento:
    Se lucro (saldo credor na conta zeramento):
      D — Conta de zeramento
      C — Conta destino PL (Lucros Acumulados)
    Se prejuízo (saldo devedor na conta zeramento):
      D — Conta destino PL (Prejuízos Acumulados)
      C — Conta de zeramento

Todos os lançamentos gerados recebem origem = "ZER"

Pré-requisito: usuário deve confirmar que o período está fechado antes
de executar o zeramento — a operação é reversível somente via estorno manual.
```

Exemplo prático:
```
Receita de vendas: R$ 100.000,00 (C)
Impostos:          R$   8.000,00 (D)
Despesas diversas: R$  18.000,00 (D)
Aluguel:           R$   7.300,00 (D)
Energia elétrica:  R$   2.200,00 (D)
Lucro apurado:     R$  64.500,00

Lançamentos gerados pelo zeramento:
D - Receita de vendas    100.000,00 / C - Zeramento    100.000,00
D - Zeramento              8.000,00 / C - Impostos       8.000,00
D - Zeramento             18.000,00 / C - Despesas div  18.000,00
D - Zeramento              7.300,00 / C - Aluguel        7.300,00
D - Zeramento              2.200,00 / C - Energia elét   2.200,00
D - Zeramento             64.500,00 / C - Lucros Acum.  64.500,00
```

---

## DRE — Estrutura no Plano de Contas

```
A DRE considera exclusivamente contas de resultado (classificação iniciando em 3+).

No cadastro do plano de contas, contas de resultado possuem:
- titulo_dre: título que aparecerá no relatório
- grupo_dre: grupo ao qual pertence na estrutura da DRE

Grupos padrão da DRE:
- receita_bruta
- deducoes_receita      (impostos, devoluções)
- receita_liquida       (subtotal calculado: receita_bruta - deducoes)
- custo_produtos        (CMV / CPV)
- lucro_bruto           (subtotal: receita_liquida - custos)
- despesas_operacionais
- resultado_financeiro
- resultado_antes_ir
- provisao_ir_csll
- lucro_liquido         (subtotal final)

Subtotais são calculados automaticamente pelo sistema com base nos grupos.
Não são contas do plano — são linhas de cálculo na DRE.
```

---

## Relatórios

### Diário
```
Relatório obrigatório por lei.
Lista todos os lançamentos em ordem cronológica.

Campos por lançamento:
- Número do lançamento (código sequencial)
- Data
- Conta débito (classificação + descrição)
- Conta crédito (classificação + descrição)
- Histórico completo
- Valor

Totais por página e total geral.
Deve estar de acordo com o layout exigido pela legislação para autenticação.
```

### Razão
```
Lista todos os lançamentos de uma conta específica em ordem cronológica,
com saldo acumulado após cada lançamento.

Campos:
- Data
- Número do lançamento
- Histórico
- Débito / Crédito
- Saldo acumulado

Filtros:
- Conta contábil
- Período (data início e fim)

Versão comparativa: duas colunas — período 1 × período 2
```

### Balancete
```
Lista todas as contas do plano com:
- Saldo anterior ao período
- Movimentação do período (débitos e créditos)
- Saldo atual

Filtros:
- Período
- Nível de detalhamento (mostrar até qual nível)
- Apenas contas com movimento

Versão comparativa: dois períodos lado a lado
```

### Balanço Patrimonial
```
Estrutura padrão:
Ativo (contas iniciadas em 1) × Passivo + PL (contas iniciadas em 2)

Exibe saldos por grupo de contas.
Filtros: data de referência

Versão comparativa: duas datas lado a lado (ex: 31/12/2025 × 31/12/2024)
```

### DRE — Demonstração do Resultado do Exercício
```
Estrutura baseada nos grupos configurados no plano de contas (titulo_dre, grupo_dre).
Exibe receitas, deduções, custos e despesas com subtotais automáticos.

Filtros: período (mês/mês ou acumulado do ano)

Versão comparativa: dois períodos lado a lado
```

### DFC — Demonstração do Fluxo de Caixa
```
Método indireto (padrão contábil).
Classifica os fluxos em:
- Atividades operacionais
- Atividades de investimento
- Atividades de financiamento
```

### Análise Vertical e Horizontal — DRE
```
Análise Vertical:
  Cada linha da DRE como percentual da Receita Bruta

Análise Horizontal:
  Variação percentual de cada linha entre dois períodos

Ambas podem ser exibidas no mesmo relatório (AV + AH lado a lado)
```

### Análise Vertical e Horizontal — Balanço Patrimonial
```
Análise Vertical:
  Cada grupo do Ativo como percentual do Total do Ativo
  Cada grupo do Passivo/PL como percentual do Total Passivo/PL

Análise Horizontal:
  Variação percentual de cada grupo entre dois períodos
```

---

## Utilitários

### Alteração em massa de lançamentos
```
Permite listar lançamentos por filtros e alterar vários de uma vez.

Filtros de busca:
- Período (data início e fim)
- Valor (faixa)
- Conta débito
- Conta crédito
- Histórico (texto)
- Código do lançamento
- Origem (manual / fiscal / folha / importado)

Ações disponíveis após selecionar um ou vários lançamentos:
- Alterar conta débito
- Alterar conta crédito
- Alterar histórico
- Alterar centro de custo
- Alterar data

RESTRIÇÃO: apenas lançamentos de origem "manual" e "importado"
podem ser alterados em massa. Lançamentos automáticos (fiscal, folha,
OFX) devem ser estornados — nunca editados diretamente.
```

### Exclusão em massa de lançamentos
```
Filtros idênticos à alteração em massa.
Ao excluir: sempre soft delete primeiro (lixeira).
Hard delete disponível somente na tela da lixeira, com confirmação explícita.
RESTRIÇÃO: mesma regra de origem — somente manual e importado.
```

---

## Importações

### Importação de lançamentos via Excel
```
Layout padrão do sistema (disponível para download na interface):

Colunas obrigatórias:
| Data | Conta Débito | Conta Crédito | Histórico | Valor | Centro de Custo |

Regras:
- Data no formato DD/MM/AAAA
- Conta débito e crédito: aceitar código reduzido ou classificação completa
- Histórico: pode ser código do histórico padrão ou texto livre
- Centro de custo: código (opcional)
- Valor: numérico, separador decimal vírgula

Processamento via Celery (worker assíncrono — arquivos grandes não travam a interface)
Validação linha a linha antes de importar
Relatório de importação: linhas importadas com sucesso × linhas com erro (com motivo)
Lançamentos importados recebem origem = "IMP"
```

### Importação do plano de contas via Excel
```
Layout padrão do sistema (disponível para download na interface):

Colunas:
| Classificação | Descrição | Natureza | Tipo | Código Reduzido | Código ECF | Título DRE |

Regras:
- Classificação deve seguir a máscara cadastrada na empresa
- Natureza: D ou C
- Tipo: S (sintética) ou A (analítica)
- Código reduzido: obrigatório para contas analíticas
- A hierarquia é deduzida automaticamente pela classificação

Validação: verificar se a máscara das contas é compatível com a máscara da empresa.
```

---

## Integrações Recebidas de Outros Módulos

### ← Fiscal
```
Evento gatilho: fechamento/confirmação de lançamento fiscal
Dados recebidos: contas débito/crédito configuradas por CFOP ou natureza de operação
Resultado: lançamento contábil gerado com origem = "FIS"
Estorno: quando lançamento fiscal é cancelado → lançamento contábil de estorno automático
Ver TEAM_FISCAL_CONTABIL.md (a criar) para detalhes do mapeamento
```

### ← Folha de Pagamentos
```
Evento gatilho: fechamento da folha mensal
Dados recebidos: lançamentos por evento configurado (salários, INSS, IRRF, FGTS etc.)
Resultado: lançamentos contábeis gerados com origem = "FOL"
Estorno: reabertura da folha → lançamentos de estorno automáticos
Ver AGENT_FOLHA.md seção "Integração Contábil" para detalhes completos
```

---

## Regras de Negócio Específicas

- Somente contas analíticas (último nível) recebem lançamentos
- Conta sintética não pode ser informada em débito ou crédito — sistema deve bloquear
- O sistema permite salvar lançamento com apenas débito ou apenas crédito
- O totalizador do dia (débito × crédito) é somente visualização — não editável
- Lançamentos automáticos (FIS, FOL, OFX, ZER) não podem ser editados diretamente
- Código do lançamento é imutável, sequencial por empresa — gap aceito em exclusão
- Soft delete sempre antes do hard delete — nunca apagar diretamente da operação
- Hard delete somente na tela de lixeira, com confirmação explícita do usuário
- Código reduzido é obrigatório para contas analíticas e deve ser único por empresa
- Zeramento somente pode ser executado com o período devidamente conferido pelo contador

---

## Status de Desenvolvimento

### Cadastros
- [ ] Máscara do plano de contas (configuração da empresa)
- [ ] Plano de contas com autopreenchimento do separador na interface
- [ ] Importação do plano entre empresas
- [ ] Importação do plano via Excel
- [ ] Centro de custos
- [ ] Histórico padrão
- [ ] Conta bancária com saldo inicial
- [ ] Histórico bancário (configuração OFX)

### Lançamentos
- [ ] Tela de lançamento com totalizador do dia
- [ ] Busca por código reduzido e descrição na digitação das contas
- [ ] Identificação de origem (sigla) em cada lançamento
- [ ] Soft delete + lixeira + hard delete com confirmação
- [ ] Importação de lançamentos via Excel (worker Celery)

### Saldos e Zeramento
- [ ] Rotina de saldos iniciais
- [ ] Configuração do zeramento (conta zeramento + conta PL)
- [ ] Rotina de zeramento automático (worker Celery)

### Conciliação OFX
- [ ] Importação do arquivo OFX
- [ ] Geração automática de lançamentos por histórico bancário
- [ ] Tela de conciliação lado a lado (OFX × contabilidade)
- [ ] Conciliação automática por data + valor + tipo
- [ ] Relatório de conciliação

### Relatórios obrigatórios
- [ ] Diário
- [ ] Razão (simples e comparativo)
- [ ] Balancete (simples e comparativo)
- [ ] Balanço Patrimonial (simples e comparativo)
- [ ] DRE (simples e comparativo)
- [ ] DFC

### Relatórios gerenciais
- [ ] Análise Vertical e Horizontal — DRE
- [ ] Análise Vertical e Horizontal — Balanço Patrimonial

### Utilitários
- [ ] Alteração em massa de lançamentos
- [ ] Exclusão em massa de lançamentos

### Obrigações acessórias
- [ ] SPED ECD
- [ ] SPED ECF
