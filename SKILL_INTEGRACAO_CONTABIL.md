# SKILL_INTEGRACAO_CONTABIL.md — Skill de Integração Fiscal → Contabilidade

## O que é esta skill
Roteiro técnico passo a passo para implementar a integração entre o módulo
Fiscal e o módulo Contabilidade. Deve ser lida junto com o agente de integração.

> "Leia o CLAUDE.md, o docs/agents/AGENT_FISCAL.md, o docs/agents/AGENT_CONTABILIDADE.md,
>  o docs/teams/TEAM_FISCAL_CONTABIL.md e o docs/skills/SKILL_INTEGRACAO_CONTABIL.md
>  antes de continuar"

---

## Ordem de Implementação

Siga rigorosamente esta ordem — cada etapa depende da anterior.

```
Etapa 1 → Parâmetro da empresa (modo de integração)
Etapa 2 → Alterações nos cadastros existentes
Etapa 3 → Migrations do banco de dados
Etapa 4 → Service de integração
Etapa 5 → Worker Celery
Etapa 6 → Aba Contabilidade na tela de lançamentos
Etapa 7 → Painel de pendências
Etapa 8 → Alertas nos cadastros
Etapa 9 → Testes
```

---

## Etapa 1 — Parâmetro da Empresa

### O que fazer
Adicionar o campo de modo de integração nos parâmetros da empresa.

### Checklist
```
[ ] Adicionar campo integracao_contabil_modo no model parametros_empresa
    Tipo: str
    Valores aceitos: "conta_unica" | "conta_individual"
    Default: "conta_unica"

[ ] Criar migration Alembic para o novo campo

[ ] Adicionar campo no schema Pydantic de parametros_empresa

[ ] Adicionar campo na tela de Parâmetros da Empresa no frontend
    Exibir como: radio button ou select
    Label: "Modo de integração contábil"
    Opção 1: "Conta única (Clientes/Fornecedores Diversos)"
    Opção 2: "Conta individual por cliente/fornecedor"
    Incluir tooltip explicativo sobre cada opção

[ ] Testar: salvar e recuperar o parâmetro corretamente
```

---

## Etapa 2 — Alterações nos Cadastros Existentes

### 2A — Cadastro de CFOP

```
[ ] Adicionar no model cfop:
    conta_contabil_id: int | None    → FK para plano_contas
    historico_padrao_id: int | None  → FK para historico_padrao

[ ] Criar migration Alembic

[ ] Atualizar schema Pydantic do CFOP

[ ] Atualizar tela de cadastro do CFOP no frontend:
    Adicionar botão "Editar" que abre modal
    No modal: campo "Conta Contábil" (busca por código reduzido ou descrição)
    No modal: campo "Histórico Padrão" (busca por código ou descrição)
    Salvar via PUT /fiscal/cfop/{id}

[ ] Testar: salvar e recuperar os novos campos
```

### 2B — Cadastro de Natureza de Operação

```
[ ] Alterar no model natureza_operacao:
    RENOMEAR conta_contabil → conta_debito_id
    ADICIONAR conta_credito_id: int | None   → FK para plano_contas
    ADICIONAR historico_padrao_id: int | None → FK para historico_padrao

[ ] Criar migration Alembic
    ATENÇÃO: migration deve renomear a coluna existente, não dropar e recriar
    Usar: op.alter_column('natureza_operacao', 'conta_contabil', new_column_name='conta_debito_id')

[ ] Atualizar schema Pydantic

[ ] Atualizar tela de Natureza de Operação no frontend:
    Renomear campo atual "Conta Contábil" para "Conta Débito"
    Adicionar campo "Conta Crédito"
    Adicionar campo "Histórico Padrão"

[ ] Testar: verificar que dados existentes não foram perdidos no rename
```

### 2C — Cadastro de Clientes e Fornecedores

```
[ ] Adicionar no model cliente_fornecedor:
    conta_contabil_id: int | None    → FK para plano_contas

[ ] Criar migration Alembic

[ ] Atualizar schema Pydantic

[ ] Adicionar campo na tela de cadastro de clientes e fornecedores:
    Label: "Conta Contábil"
    Busca por código reduzido ou descrição do plano de contas
    Campo não obrigatório no cadastro
    Exibir alerta amarelo se modo = conta_individual e campo vazio

[ ] Adicionar no lancamento_fiscal:
    status_contabil: str (default: "pendente")
    lancamento_contabil_id: int | None
    erro_contabil: str | None

[ ] Testar: salvar e recuperar os novos campos
```

---

## Etapa 3 — Migrations

### Regras obrigatórias para migrations neste projeto
```
[ ] NUNCA dropar coluna com dados — sempre renomear ou adicionar
[ ] Usar op.alter_column para renomear (não drop + add)
[ ] Testar rollback da migration antes de aplicar em produção
[ ] Nomear a migration de forma descritiva:
    Formato: YYYY_MM_DD_descricao_curta
    Exemplo: 2026_04_27_integracao_contabil_campos

[ ] Verificar que migration não quebra dados existentes
[ ] Executar em ordem: parametros → cfop → natureza_operacao → cliente_fornecedor → lancamento_fiscal
```

---

## Etapa 4 — Service de Integração

### Arquivo: `services/integracao/fiscal_contabil.py`

```
[ ] Implementar função auxiliar _buscar_modo_integracao(empresa_id) → str

[ ] Implementar função auxiliar _validar_contas(conta_debito, conta_credito) → bool
    Validar: ambas as contas são analíticas (tipo = "analitica")
    Validar: ambas pertencem à empresa correta
    Retornar False sem lançar exceção — erro deve ser registrado, não propagado

[ ] Implementar _integrar_conta_unica(lancamento_fiscal) → LancamentoContabil | None
    Buscar CFOP do lançamento
    Buscar Natureza de Operação do CFOP
    Ler conta_debito_id, conta_credito_id e historico_padrao_id da Natureza
    Chamar _validar_contas
    Se válido: chamar _gerar_lancamento_contabil
    Se inválido: registrar erro e retornar None

[ ] Implementar _integrar_conta_individual(lancamento_fiscal) → LancamentoContabil | None
    Buscar CFOP do lançamento → ler conta_contabil_id do CFOP
    Identificar cliente ou fornecedor → ler conta_contabil_id
    Determinar tipo de operação:
      VENDA → débito = conta cliente | crédito = conta CFOP
      COMPRA → débito = conta CFOP   | crédito = conta fornecedor
    Chamar _validar_contas
    Se válido: chamar _gerar_lancamento_contabil
    Se inválido: registrar erro e retornar None

[ ] Implementar _gerar_lancamento_contabil(dados) → LancamentoContabil
    Montar histórico completo:
      historico_padrao.descricao + " — NF nº " + numero_nota + " — " + nome_cliente_fornecedor
    Chamar service de lançamento do módulo Contabilidade
    Atualizar lancamento_fiscal.status_contabil = "gerado"
    Atualizar lancamento_fiscal.lancamento_contabil_id
    Retornar lançamento contábil criado

[ ] Implementar integrar_lancamento_fiscal(lancamento_fiscal_id) → LancamentoContabil | None
    Orquestrador principal — chamar _conta_unica ou _conta_individual conforme parâmetro
    Capturar qualquer exceção não prevista → registrar como erro, não propagar

[ ] Implementar estornar_lancamento_fiscal(lancamento_fiscal_id) → LancamentoContabil | None
    Buscar lancamento_contabil_id do lançamento fiscal
    Chamar service de estorno do módulo Contabilidade
    Atualizar lancamento_fiscal.status_contabil = "estornado"

[ ] Implementar reprocessar_integracao(lancamento_fiscal_id) → LancamentoContabil | None
    Verificar se já existe lançamento contábil vinculado
    Se sim: estornar antes de gerar novo
    Chamar integrar_lancamento_fiscal novamente

[ ] Testar cada função isoladamente antes de conectar ao worker
```

### Padrão de tratamento de erro
```python
# CORRETO — nunca propagar exceção, sempre registrar
try:
    lancamento = _integrar_conta_unica(lancamento_fiscal)
except Exception as e:
    lancamento_fiscal.status_contabil = "erro"
    lancamento_fiscal.erro_contabil = str(e)
    db.commit()
    return None

# ERRADO — não fazer isso
raise HTTPException(...)  # integração não deve bloquear o fiscal
```

---

## Etapa 5 — Worker Celery

### Arquivo: `workers/integracao/processar_integracao_fiscal.py`

```
[ ] Criar task Celery: task_integrar_lancamento_fiscal(lancamento_fiscal_id)
    Chamar integrar_lancamento_fiscal do service
    Configurar retry em caso de falha temporária (ex: banco indisponível):
      max_retries=3, countdown=60

[ ] Conectar o disparo do worker ao evento de confirmação do lançamento fiscal
    Após confirmação: lançamento fiscal persiste → dispara task assíncrona
    NÃO aguardar o retorno do worker para responder ao usuário

[ ] Testar: confirmar lançamento fiscal e verificar se lançamento contábil é criado
```

---

## Etapa 6 — Aba Contabilidade na Tela de Lançamentos

```
[ ] Adicionar terceira aba "Contabilidade" na tela de lançamentos fiscais

[ ] Criar endpoint: GET /fiscal/lancamentos/{id}/contabilidade
    Retorna: dados do lançamento contábil vinculado + status_contabil + erro_contabil

[ ] Conteúdo da aba conforme TEAM_FISCAL_CONTABIL.md:
    Se status = "gerado": exibir tabela com dados do lançamento contábil
    Se status = "pendente": exibir mensagem + botão "Gerar agora"
    Se status = "erro": exibir mensagem de erro + botão "Tentar novamente"
    Se status = "estornado": exibir dados do estorno

[ ] Botão "Gerar agora" / "Tentar novamente":
    Chamar POST /fiscal/lancamentos/{id}/integrar
    Exibir loading enquanto processa
    Atualizar a aba com o resultado

[ ] Testar todos os estados da aba
```

---

## Etapa 7 — Painel de Pendências

```
[ ] Criar página: Fiscal → Integração Contábil → Pendências

[ ] Criar endpoint: GET /fiscal/integracao/pendencias
    Filtros: status_contabil (pendente/erro), data, empresa
    Retorna: lista de lançamentos com status pendente ou erro

[ ] Interface:
    Tabela com colunas: Nº Lançamento | Data | Cliente/Fornecedor | Valor | Status | Erro
    Botão "Gerar agora" por linha → POST /fiscal/lancamentos/{id}/integrar
    Botão "Gerar todos" → POST /fiscal/integracao/reprocessar-todos (Celery em lote)
    Indicador de quantidade de pendências no menu lateral

[ ] Testar: lançamentos com erro aparecem corretamente no painel
```

---

## Etapa 8 — Alertas nos Cadastros

```
[ ] Alerta no cadastro de clientes/fornecedores:
    Condição: integracao_contabil_modo = "conta_individual" E conta_contabil_id vazio
    Exibir: banner amarelo "Conta contábil não configurada —
    os lançamentos deste cliente não serão contabilizados automaticamente"

[ ] Alerta no cadastro de CFOP:
    Condição: conta_contabil_id vazio E modo = "conta_individual"
    Exibir: indicador visual na listagem de CFOPs sem conta configurada

[ ] Alerta na Natureza de Operação:
    Condição: conta_debito_id ou conta_credito_id vazio E modo = "conta_unica"
    Exibir: indicador visual na listagem

[ ] Testar: alertas aparecem e somem corretamente conforme configuração
```

---

## Etapa 9 — Testes

### Cenários obrigatórios a testar

```
MODO CONTA ÚNICA:
[ ] Venda de mercadoria → lançamento contábil gerado corretamente
[ ] Compra de mercadoria → lançamento contábil gerado corretamente
[ ] Prestação de serviço → lançamento contábil gerado corretamente
[ ] Natureza sem conta configurada → erro registrado, fiscal não bloqueado
[ ] Cancelamento do lançamento fiscal → estorno gerado automaticamente

MODO CONTA INDIVIDUAL:
[ ] Venda → débito no cliente, crédito no CFOP
[ ] Compra → débito no CFOP, crédito no fornecedor
[ ] Cliente sem conta contábil → erro registrado, fiscal não bloqueado
[ ] CFOP sem conta contábil → erro registrado, fiscal não bloqueado
[ ] Reprocessamento manual → estorna o anterior e gera novo

GERAL:
[ ] Troca de modo não afeta lançamentos já gerados
[ ] Lançamento contábil gerado tem origem = "fiscal" e não pode ser editado diretamente
[ ] Código sequencial do lançamento contábil segue a sequência correta
[ ] Aba Contabilidade exibe corretamente todos os status
[ ] Painel de pendências lista e reprocessa corretamente
```

---

## Pontos de Atenção

```
⚠️  MIGRATION DE RENAME:
    Usar op.alter_column para renomear conta_contabil → conta_debito_id
    Não dropar a coluna — dados existentes devem ser preservados

⚠️  INTEGRAÇÃO NÃO BLOQUEIA O FISCAL:
    Qualquer falha na integração deve ser silenciosa — registrar erro e seguir
    O usuário não deve ver erro 500 por falha na contabilização

⚠️  LANÇAMENTO CONTÁBIL NÃO EDITÁVEL:
    Lançamentos com origem "fiscal" não podem ser editados no módulo Contabilidade
    Somente estornados — validar isso no service de edição do módulo Contabilidade

⚠️  HISTÓRICO COMPLETO:
    O histórico do lançamento contábil deve incluir dados da nota fiscal
    para facilitar rastreabilidade: número da NF, cliente/fornecedor, data

⚠️  WORKER ASSÍNCRONO:
    A integração nunca pode travar a resposta da confirmação do lançamento fiscal
    Sempre via Celery — nunca síncrono na request
```
