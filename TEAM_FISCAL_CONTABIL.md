# TEAM_FISCAL_CONTABIL.md — Integração Fiscal → Contabilidade

## Como usar este agente
Instrua o Claude Code a ler este arquivo junto com os agentes dos dois módulos:
> "Leia o CLAUDE.md, o docs/agents/AGENT_FISCAL.md, o docs/agents/AGENT_CONTABILIDADE.md e o docs/teams/TEAM_FISCAL_CONTABIL.md antes de continuar"

---

## Visão Geral

Este agente descreve como os lançamentos do módulo Fiscal geram automaticamente
lançamentos contábeis no módulo Contabilidade.

A integração ocorre em dois modos configuráveis por empresa:
- **Conta Única** — clientes e fornecedores contabilizados por conta genérica
- **Conta Individual** — cada cliente/fornecedor tem sua própria conta contábil

A escolha do modo é feita nos parâmetros da empresa e impacta diretamente
como o sistema busca as contas contábeis para montar cada lançamento.

---

## Parâmetro da Empresa — Modo de Integração

```python
# Em parametros_empresa (módulo Configurações)

integracao_contabil_modo: str
# conta_unica     → contabiliza por conta genérica definida na Natureza de Operação
# conta_individual → contabiliza por conta específica de cada cliente/fornecedor
```

### Explicação do parâmetro
```
CONTA ÚNICA:
  Utiliza uma conta genérica para todos os clientes (ex: "Clientes Diversos")
  e uma conta genérica para todos os fornecedores (ex: "Fornecedores Diversos").
  As contas são definidas no cadastro da Natureza de Operação.
  Mais simples — indicado para empresas com muitos clientes/fornecedores
  que não precisam de rastreabilidade individual na contabilidade.

CONTA INDIVIDUAL:
  Cada cliente tem sua própria conta contábil no plano de contas.
  Cada fornecedor tem sua própria conta contábil no plano de contas.
  A conta do CFOP define débito ou crédito conforme o tipo de operação.
  A conta do cliente/fornecedor completa o outro lado do lançamento.
  Mais detalhado — permite rastreabilidade por cliente/fornecedor no Razão.
```

---

## Alterações nos Cadastros Existentes

### Cadastro de CFOP
```
Adicionar campos:
  conta_contabil_id: int | None    # FK plano_contas
  historico_padrao_id: int | None  # FK historico_padrao (módulo Contabilidade)

Interface:
  Botão "Editar" abre modal com os campos acima
  Busca de conta por código reduzido ou descrição
  Busca de histórico por código ou descrição

Uso no modo CONTA INDIVIDUAL:
  conta_contabil_id → será o lado CRÉDITO nas vendas
  conta_contabil_id → será o lado DÉBITO nas compras
```

### Cadastro de Natureza de Operação
```
Alterar campo atual:
  conta_contabil → renomear para conta_debito_id

Adicionar campos:
  conta_debito_id: int | None      # FK plano_contas (renomeado do atual)
  conta_credito_id: int | None     # FK plano_contas (NOVO)
  historico_padrao_id: int | None  # FK historico_padrao (NOVO)

Interface:
  Substituir campo atual por dois campos: Conta Débito e Conta Crédito
  Adicionar campo Código do Histórico

Uso no modo CONTA ÚNICA:
  conta_debito_id e conta_credito_id definem o lançamento completo
  historico_padrao_id define o texto do lançamento contábil
```

### Cadastro de Clientes e Fornecedores
```
Adicionar campo:
  conta_contabil_id: int | None    # FK plano_contas

Interface:
  Campo "Conta Contábil" na tela de cadastro
  Busca por código reduzido ou descrição do plano de contas
  Obrigatório somente quando integracao_contabil_modo = "conta_individual"
  Sistema deve alertar se modo for individual e conta não estiver preenchida

Uso no modo CONTA INDIVIDUAL:
  conta_contabil_id → será o lado DÉBITO nas vendas (conta a receber do cliente)
  conta_contabil_id → será o lado CRÉDITO nas compras (conta a pagar ao fornecedor)
```

---

## Terceira Aba na Tela de Lançamentos — "Contabilidade"

```
A tela de lançamentos fiscais possui atualmente duas abas:
  Aba 1: Cabeçalho
  Aba 2: Itens da Nota Fiscal

Adicionar:
  Aba 3: Contabilidade

Conteúdo da Aba Contabilidade:
  Exibe o lançamento contábil gerado a partir deste lançamento fiscal.

  | Campo           | Valor                                      |
  |-----------------|--------------------------------------------|
  | Código          | Código sequencial do lançamento contábil   |
  | Data            | Data do lançamento contábil                |
  | Conta Débito    | Classificação + Descrição da conta         |
  | Conta Crédito   | Classificação + Descrição da conta         |
  | Histórico       | Texto completo do histórico                |
  | Valor           | Valor do lançamento                        |
  | Status          | Gerado / Pendente / Erro                   |

  Se o lançamento ainda não foi contabilizado:
    Exibe mensagem: "Lançamento contábil ainda não gerado"
    Botão: "Gerar agora" (para reprocessar manualmente se necessário)

  Se houve erro na contabilização:
    Exibe mensagem de erro
    Botão: "Tentar novamente"
```

---

## Lógica de Integração — Fluxo por Modo

### MODO CONTA ÚNICA

```
Gatilho: confirmação/importação de NF-e ou NF-S no módulo fiscal

Passo 1 — Verificar parâmetro da empresa:
  integracao_contabil_modo = "conta_unica" → seguir este fluxo

Passo 2 — Buscar o CFOP do lançamento fiscal

Passo 3 — Buscar a Natureza de Operação vinculada ao CFOP

Passo 4 — Ler as contas e histórico da Natureza de Operação:
  conta_debito_id  → débito do lançamento contábil
  conta_credito_id → crédito do lançamento contábil
  historico_padrao_id → histórico do lançamento contábil

Passo 5 — Gerar lançamento contábil:
  D — conta_debito_id
  C — conta_credito_id
  Histórico: historico_padrao + complemento (ex: NF nº XXXXX - Cliente YYYY)
  Valor: valor total do lançamento fiscal
  Origem: "fiscal"
  origem_id: id do lançamento fiscal

Exemplo (venda com conta única):
  Natureza de Operação "Venda de Mercadorias" configurada com:
    Conta Débito:  1.01.03.01 — Clientes Diversos
    Conta Crédito: 3.01.01.01 — Receita de Vendas
  Resultado:
    D — 1.01.03.01 Clientes Diversos     R$ 10.000,00
    C — 3.01.01.01 Receita de Vendas     R$ 10.000,00
```

### MODO CONTA INDIVIDUAL

```
Gatilho: confirmação/importação de NF-e ou NF-S no módulo fiscal

Passo 1 — Verificar parâmetro da empresa:
  integracao_contabil_modo = "conta_individual" → seguir este fluxo

Passo 2 — Buscar o CFOP do lançamento fiscal

Passo 3 — Ler a conta contábil do CFOP:
  cfop.conta_contabil_id → será um dos lados do lançamento
  cfop.historico_padrao_id → histórico do lançamento

Passo 4 — Identificar o cliente ou fornecedor do lançamento

Passo 5 — Ler a conta contábil do cliente/fornecedor:
  cliente_fornecedor.conta_contabil_id → será o outro lado do lançamento

Passo 6 — Determinar débito e crédito conforme tipo de operação:

  SE FOR VENDA (saída de mercadoria/serviço):
    DÉBITO  → conta do CLIENTE (direito a receber)
    CRÉDITO → conta do CFOP    (receita ou saída)

  SE FOR COMPRA (entrada de mercadoria/serviço):
    DÉBITO  → conta do CFOP       (custo ou estoque)
    CRÉDITO → conta do FORNECEDOR (obrigação a pagar)

Passo 7 — Gerar lançamento contábil:
  Origem: "fiscal"
  origem_id: id do lançamento fiscal

Exemplo (venda com conta individual):
  CFOP 5102 configurado com conta: 3.01.01.01 — Receita de Vendas
  Cliente "João Silva" com conta:  1.01.02.0001 — João Silva
  Resultado:
    D — 1.01.02.0001 João Silva          R$ 10.000,00
    C — 3.01.01.01   Receita de Vendas   R$ 10.000,00

Exemplo (compra com conta individual):
  CFOP 1102 configurado com conta: 1.01.05.01 — Estoque de Mercadorias
  Fornecedor "Distribuidora XYZ" com conta: 2.01.01.0001 — Distribuidora XYZ
  Resultado:
    D — 1.01.05.01   Estoque de Mercadorias   R$ 5.000,00
    C — 2.01.01.0001 Distribuidora XYZ        R$ 5.000,00
```

---

## Validações Antes de Gerar o Lançamento

```
MODO CONTA ÚNICA:
  ✅ Natureza de Operação possui conta_debito_id preenchida?
  ✅ Natureza de Operação possui conta_credito_id preenchida?
  ✅ Ambas as contas são analíticas (último nível do plano de contas)?
  ✅ Ambas as contas pertencem à mesma empresa?

MODO CONTA INDIVIDUAL:
  ✅ CFOP possui conta_contabil_id preenchida?
  ✅ Cliente/fornecedor possui conta_contabil_id preenchida?
  ✅ Ambas as contas são analíticas?
  ✅ O tipo de operação (venda/compra) foi identificado corretamente?

AMBOS OS MODOS:
  ✅ Módulo Contabilidade está ativo para a empresa?
  ✅ Plano de contas da empresa está cadastrado?

SE ALGUMA VALIDAÇÃO FALHAR:
  → Registrar erro em lancamento_fiscal.status_contabil = "erro"
  → Registrar mensagem do erro em lancamento_fiscal.erro_contabil
  → Exibir na Aba Contabilidade com botão "Tentar novamente"
  → NÃO bloquear o lançamento fiscal — ele segue normalmente
    apenas sem o lançamento contábil correspondente
```

---

## Cancelamento e Estorno

```
QUANDO UM LANÇAMENTO FISCAL FOR CANCELADO:
  1. Sistema identifica o lançamento contábil vinculado (via origem_id)
  2. Gera lançamento de estorno automático:
     Débito e crédito invertidos
     Histórico: "Estorno — " + histórico original
     Origem: "estorno"
  3. Nunca apaga o lançamento contábil original
  4. Atualiza status_contabil do lançamento fiscal para "estornado"

QUANDO UM LANÇAMENTO FISCAL FOR EDITADO:
  1. Sistema estorna o lançamento contábil original
  2. Gera novo lançamento contábil com os dados atualizados
  3. Registra histórico de alteração
```

---

## Models Necessários

### Alterações em models existentes

```python
# lancamento_fiscal.py — adicionar campos:
status_contabil: str
# pendente / gerado / erro / estornado
lancamento_contabil_id: int | None   # FK lancamento (módulo Contabilidade)
erro_contabil: str | None            # mensagem de erro se falhar

# cfop.py — adicionar campos:
conta_contabil_id: int | None        # FK plano_contas
historico_padrao_id: int | None      # FK historico_padrao

# natureza_operacao.py — alterar e adicionar:
conta_debito_id: int | None          # renomeado de conta_contabil
conta_credito_id: int | None         # NOVO
historico_padrao_id: int | None      # NOVO

# cliente_fornecedor.py — adicionar campo:
conta_contabil_id: int | None        # FK plano_contas

# parametros_empresa.py — adicionar campo:
integracao_contabil_modo: str        # conta_unica / conta_individual
```

---

## Service de Integração

```python
# services/integracao/fiscal_contabil.py

def integrar_lancamento_fiscal(lancamento_fiscal_id: int) -> LancamentoContabil | None:
    """
    Orquestrador da integração fiscal → contabilidade.
    Chamado automaticamente após confirmação de qualquer lançamento fiscal.

    1. Buscar parâmetro da empresa (modo de integração)
    2. Executar fluxo de conta_unica ou conta_individual
    3. Validar contas antes de gerar
    4. Gerar lançamento contábil com origem = "fiscal"
    5. Atualizar lancamento_fiscal.status_contabil = "gerado"
    6. Retornar lançamento contábil gerado

    Em caso de erro:
    - Registrar status_contabil = "erro" e mensagem do erro
    - NÃO lançar exceção — apenas registrar e retornar None
    """

def estornar_lancamento_fiscal(lancamento_fiscal_id: int) -> LancamentoContabil | None:
    """
    Chamado quando um lançamento fiscal é cancelado.
    Gera lançamento de estorno no módulo Contabilidade.
    """

def reprocessar_integracao(lancamento_fiscal_id: int) -> LancamentoContabil | None:
    """
    Chamado manualmente pelo usuário via botão "Tentar novamente" ou "Gerar agora".
    Reprocessa a integração de um lançamento que falhou ou ainda não foi gerado.
    """
```

---

## Worker Celery

```python
# workers/integracao/processar_integracao_fiscal.py

@celery_app.task
def task_integrar_lancamento_fiscal(lancamento_fiscal_id: int):
    """
    Processa a integração de forma assíncrona.
    Chamado após confirmação do lançamento fiscal.
    Garante que a interface não trava durante a integração.
    """
```

---

## Alertas e Pendências na Interface

```
PAINEL DE PENDÊNCIAS DE INTEGRAÇÃO:
Acessível em: Fiscal → Integração Contábil → Pendências

Lista lançamentos com status_contabil:
  "pendente" → ainda não processados
  "erro"     → falharam na integração

Colunas:
  | Nº Lançamento | Data | Cliente/Fornecedor | Valor | Status | Erro |

Ações por linha:
  "Gerar agora" → reprocessa individualmente
  "Gerar todos" → reprocessa todos em lote via Celery

ALERTAS NO CADASTRO:
  Se modo = conta_individual e cliente/fornecedor sem conta contábil:
    Alerta amarelo no cadastro: "Conta contábil não configurada —
    os lançamentos deste cliente não serão contabilizados"

  Se CFOP sem conta contábil configurada (modo individual):
    Alerta no cadastro do CFOP
```

---

## Regras de Negócio Específicas

- A integração NUNCA bloqueia o lançamento fiscal — falha silenciosa com registro de erro
- Lançamentos automáticos gerados pela integração têm origem "fiscal" e não podem ser editados diretamente no módulo Contabilidade — somente estornados
- O cancelamento de um lançamento fiscal sempre gera estorno contábil automático
- Lançamentos contábeis gerados pela integração respeitam o código sequencial imutável do módulo Contabilidade
- A troca do modo de integração (conta única ↔ individual) não afeta lançamentos já gerados — somente os novos
- Quando modo = conta_individual, conta do cliente/fornecedor é obrigatória para gerar o lançamento — sem ela, registra erro e aguarda configuração

---

## Status de Desenvolvimento

### Alterações em cadastros existentes
- [ ] Campo conta_contabil_id no CFOP
- [ ] Campo historico_padrao_id no CFOP
- [ ] Campos conta_debito_id, conta_credito_id e historico_padrao_id na Natureza de Operação
- [ ] Campo conta_contabil_id em Clientes e Fornecedores
- [ ] Campo integracao_contabil_modo nos Parâmetros da Empresa

### Lógica de integração
- [ ] Service integrar_lancamento_fiscal (orquestrador)
- [ ] Fluxo conta_unica completo
- [ ] Fluxo conta_individual completo com lógica venda × compra
- [ ] Service estornar_lancamento_fiscal
- [ ] Service reprocessar_integracao
- [ ] Worker Celery task_integrar_lancamento_fiscal

### Interface
- [ ] Aba "Contabilidade" na tela de lançamentos fiscais
- [ ] Painel de pendências de integração
- [ ] Alertas nos cadastros sem conta contábil configurada

### Validações
- [ ] Validação de contas analíticas antes de gerar
- [ ] Validação de configuração completa por modo
- [ ] Registro de erros sem bloquear o lançamento fiscal
