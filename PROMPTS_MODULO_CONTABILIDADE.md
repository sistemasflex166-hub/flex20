# Prompts de Desenvolvimento — Módulo Contabilidade
# Uso: copie o prompt da fase desejada e cole no Claude Code

---

## ✅ ANTES DE COMEÇAR — Leitura obrigatória

Cole este prompt UMA VEZ antes de iniciar qualquer fase:

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md completamente
antes de qualquer ação. Esses arquivos contêm todas as regras de negócio,
decisões técnicas e padrões obrigatórios do projeto. Confirme a leitura
e aguarde minha instrução para iniciar.
```

---

## FASE 1 — Máscara e Plano de Contas

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 1 do módulo Contabilidade: Plano de Contas.

1. Model `mascara_plano_contas`:
   - Campo máscara configurável por empresa (ex: X.XX.XX.XX.XXXX)
   - Validação do formato da máscara
   - Cálculo automático da quantidade de níveis

2. Model `plano_contas`:
   - Todos os campos especificados no agente
   - Campos: classificacao, descricao, nivel, natureza, tipo
   - Campos: codigo_reduzido (obrigatório para contas analíticas)
   - Campos: titulo_dre, grupo_dre, codigo_ecf
   - Relacionamento hierárquico (conta_pai_id)
   - Soft delete

3. Service `plano_contas.py`:
   - Criar conta validando a máscara da empresa
   - Calcular nível automaticamente pela posição na hierarquia
   - Impedir lançamento direto em conta sintética
   - Validar unicidade do código reduzido por empresa
   - Copiar plano de contas entre empresas
   - Importar plano de contas via lista de dicionários (para Excel posterior)

4. Route `plano_contas.py`:
   - CRUD completo
   - Endpoint para copiar plano entre empresas
   - Endpoint que retorna árvore hierárquica para exibição no frontend
   - Busca por código reduzido (para digitação nos lançamentos)

5. Schema Pydantic com validações

Padrões obrigatórios: type hints, separação routes/services/models,
código sequencial imutável conforme CLAUDE.md.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## FASE 2 — Cadastros Auxiliares

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 2 do módulo Contabilidade: Cadastros auxiliares.
O plano de contas (Fase 1) já está implementado.

1. Model + Service + Route + Schema para `centro_custo`:
   - Código sequencial imutável por empresa
   - Campos: codigo, descricao, ativo
   - CRUD completo

2. Model + Service + Route + Schema para `historico_padrao`:
   - Código sequencial numérico por empresa
   - Campos: codigo, descricao, ativo
   - CRUD completo com busca por descrição (para digitação nos lançamentos)

3. Model + Service + Route + Schema para `conta_bancaria`:
   - Campos: banco, agencia, conta, digito, tipo_conta, descricao
   - Campo: saldo_inicial + data_saldo_inicial
   - FK para conta contábil do banco (plano_contas)
   - CRUD completo

4. Model + Service + Route + Schema para `historico_bancario`:
   - Vinculado à conta bancária
   - Campos: texto_historico, conta_debito_id, conta_credito_id, historico_padrao_id
   - Busca por texto parcial (usada na importação OFX)
   - CRUD completo

Padrões obrigatórios: type hints, separação routes/services/models.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## FASE 3 — Lançamentos Contábeis

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 3 do módulo Contabilidade: Lançamentos.
As fases 1 e 2 já estão implementadas.

1. Model `lancamento`:
   - Todos os campos especificados no agente
   - Código sequencial imutável por empresa (gerado pelo sistema)
   - Campo origem com as siglas: manual, fiscal, folha, importado, ofx, zeramento, estorno
   - Campos de soft delete (excluido, data_exclusao, excluido_definitivamente)
   - Campo conciliado para integração com OFX

2. Service `lancamento.py`:
   - Criar lançamento validando:
     → Somente contas analíticas em débito e crédito
     → Permitir salvar com apenas débito ou apenas crédito (sem bloquear)
     → Gerar código sequencial imutável
   - Editar lançamento:
     → Somente permite edição em lançamentos de origem "manual" e "importado"
     → Lançamentos automáticos (fiscal, folha, ofx, zeramento) bloqueados para edição
   - Soft delete (mover para lixeira)
   - Hard delete (somente itens já na lixeira, com flag de confirmação)
   - Função estornar: cria novo lançamento com débito/crédito invertidos e origem "estorno"
   - Calcular totalizador do dia: soma débitos e créditos de uma data específica

3. Route `lancamentos.py`:
   - CRUD completo
   - Endpoint totalizador do dia (GET /lancamentos/totalizador?data=YYYY-MM-DD)
   - Endpoint estornar (POST /lancamentos/{id}/estornar)
   - Endpoint lixeira (GET /lancamentos/lixeira)
   - Endpoint hard delete da lixeira (DELETE /lancamentos/{id}/definitivo)
   - Filtros: data, conta débito, conta crédito, histórico, origem, valor

4. Schema Pydantic com validações

Padrões obrigatórios: type hints, separação routes/services/models,
regras de soft/hard delete conforme CLAUDE.md.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## FASE 4 — Importações (Excel e Plano de Contas)

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 4 do módulo Contabilidade: Importações via Excel.
As fases 1, 2 e 3 já estão implementadas.

1. Importação de lançamentos contábeis via Excel:
   - Definir e documentar o layout padrão da planilha:
     Colunas: Data | Conta Débito | Conta Crédito | Histórico | Valor | Centro de Custo
   - Service `importacao_excel.py`:
     → Ler e validar o arquivo Excel (openpyxl)
     → Aceitar código reduzido ou classificação completa para contas
     → Aceitar código do histórico padrão ou texto livre no campo histórico
     → Validar linha a linha antes de importar
     → Gerar relatório de importação: linhas com sucesso × linhas com erro (com motivo)
     → Lançamentos importados recebem origem = "importado"
   - Processamento via Celery (worker assíncrono)
   - Route: POST /contabilidade/importar/lancamentos (upload do arquivo)

2. Importação do plano de contas via Excel:
   - Definir e documentar o layout padrão da planilha:
     Colunas: Classificação | Descrição | Natureza | Tipo | Código Reduzido | Código ECF | Título DRE
   - Service de importação validando:
     → Compatibilidade da máscara com a empresa destino
     → Hierarquia deduzida automaticamente pela classificação
     → Código reduzido obrigatório para contas analíticas
   - Route: POST /contabilidade/importar/plano-contas (upload do arquivo)

3. Endpoint para download do modelo Excel de cada importação
   - GET /contabilidade/importar/lancamentos/modelo
   - GET /contabilidade/importar/plano-contas/modelo

Padrões obrigatórios: type hints, Celery para processamento assíncrono,
relatório de resultado da importação sempre retornado ao usuário.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## FASE 5 — Saldos Iniciais e Conciliação OFX

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 5 do módulo Contabilidade: Saldos iniciais e Conciliação OFX.
As fases 1 a 4 já estão implementadas.

1. Rotina de saldos iniciais:
   - Model `saldo_inicial` conforme especificado no agente
   - Service: lançar saldos, validar que total débito = total crédito ao confirmar
   - Alerta visual quando há diferença entre débito e crédito total
   - Route CRUD completo

2. Importação e conciliação OFX:
   - Model `conciliacao` conforme especificado no agente
   - Worker Celery `processar_ofx.py`:
     → Ler e parsear arquivo .ofx (biblioteca ofxparse ou similar)
     → Para cada transação: verificar se há histórico bancário cadastrado
     → Se encontrar: gerar lançamento contábil com as contas configuradas (origem = "ofx")
     → Se não encontrar: registrar com status "sem_cadastro" e listar no relatório
   - Service `conciliacao.py`:
     → Conciliação automática por data + valor + tipo entre OFX e lançamentos contábeis
     → Conciliação manual: vincular item OFX a lançamento contábil
     → Marcar item como "ignorado"
     → Calcular saldo extrato × saldo contábil para o período
   - Routes:
     → POST /contabilidade/ofx/importar (upload do arquivo + flag gerar_lancamentos)
     → GET /contabilidade/conciliacao (tela de conciliação com filtros)
     → POST /contabilidade/conciliacao/{id}/conciliar (vincular item a lançamento)
     → POST /contabilidade/conciliacao/{id}/ignorar

Padrões obrigatórios: type hints, Celery para processamento do OFX,
relatório de importação sempre retornado ao usuário.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## FASE 6 — Zeramento do Balanço

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 6 do módulo Contabilidade: Zeramento do balanço.
As fases 1 a 5 já estão implementadas.

1. Model `configuracao_zeramento`:
   - conta_zeramento_id (FK plano_contas)
   - conta_resultado_id (FK plano_contas — destino no PL)
   - CRUD simples (uma configuração por empresa)

2. Service `zeramento.py`:
   - Buscar todas as contas analíticas de resultado com saldo no período
   - Para cada conta com saldo:
     → Identificar natureza (devedora/credora) e gerar lançamento inverso
     → Contrapartida sempre na conta de zeramento configurada
   - Após zerar todas: calcular saldo da conta zeramento (= lucro ou prejuízo)
   - Gerar lançamento final transportando saldo para conta do PL configurada
   - Todos os lançamentos com origem = "zeramento"
   - Função preview: retornar lista dos lançamentos que serão gerados SEM efetivar

3. Worker Celery `processar_zeramento.py`:
   - Processar de forma assíncrona (pode envolver muitos lançamentos)

4. Routes:
   - GET /contabilidade/zeramento/configuracao
   - PUT /contabilidade/zeramento/configuracao
   - GET /contabilidade/zeramento/preview?periodo=YYYY (prévia sem efetivar)
   - POST /contabilidade/zeramento/executar (efetiva o zeramento)

Padrões obrigatórios: type hints, prévia obrigatória antes de efetivar,
todos os lançamentos via Celery, registrar log de execução.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## FASE 7 — Relatórios Obrigatórios

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 7 do módulo Contabilidade: Relatórios obrigatórios.
As fases 1 a 6 já estão implementadas.

Implemente os seguintes relatórios, todos gerados em PDF via Celery (worker assíncrono):

1. Diário (`relatorio_diario.py`):
   - Lançamentos em ordem cronológica com totais por página e total geral
   - Filtros: período, empresa

2. Razão (`relatorio_razao.py`):
   - Movimentação de uma conta com saldo acumulado após cada lançamento
   - Versão simples e versão comparativa (dois períodos lado a lado)
   - Filtros: conta, período

3. Balancete (`relatorio_balancete.py`):
   - Saldo anterior + movimentação + saldo atual por conta
   - Filtro por nível de detalhamento
   - Versão simples e comparativa

4. Balanço Patrimonial (`relatorio_balanco.py`):
   - Ativo × Passivo + PL com agrupamento por nível
   - Versão simples e comparativa (duas datas)

5. DRE (`relatorio_dre.py`):
   - Estrutura baseada em titulo_dre e grupo_dre do plano de contas
   - Subtotais automáticos por grupo (receita_liquida, lucro_bruto, lucro_liquido)
   - Versão simples e comparativa (dois períodos)

6. DFC — Demonstração do Fluxo de Caixa (`relatorio_dfc.py`):
   - Método indireto
   - Grupos: operacional, investimento, financiamento

Routes:
- POST /contabilidade/relatorios/{tipo} (gera e retorna PDF)
- Cada relatório recebe seus filtros específicos no body

Padrões obrigatórios: geração em PDF via Celery, type hints.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## FASE 8 — Relatórios Gerenciais e Utilitários

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 8 do módulo Contabilidade: Relatórios gerenciais e Utilitários.
As fases 1 a 7 já estão implementadas.

1. Relatórios gerenciais (PDF via Celery):

   Análise Vertical e Horizontal — DRE (`relatorio_analise_dre.py`):
   - AV: cada linha como percentual da Receita Bruta
   - AH: variação percentual entre dois períodos
   - Exibir AV + AH lado a lado no mesmo relatório

   Análise Vertical e Horizontal — Balanço (`relatorio_analise_balanco.py`):
   - AV: cada grupo como percentual do total Ativo / total Passivo+PL
   - AH: variação percentual entre dois períodos

2. Utilitários:

   Alteração em massa de lançamentos:
   - Service: buscar lançamentos por filtros (data, valor, contas, histórico, código, origem)
   - Permitir alterar: conta débito, conta crédito, histórico, centro de custo, data
   - Restrição: somente lançamentos de origem "manual" e "importado"
   - Route: GET /contabilidade/utilitarios/lancamentos (busca com filtros)
   - Route: PUT /contabilidade/utilitarios/lancamentos/alterar-massa (body com IDs + campos)

   Exclusão em massa de lançamentos:
   - Mesmos filtros da alteração
   - Sempre soft delete (lixeira) — nunca hard delete direto
   - Restrição: somente lançamentos de origem "manual" e "importado"
   - Route: DELETE /contabilidade/utilitarios/lancamentos/excluir-massa (body com IDs)

Padrões obrigatórios: type hints, restrições de origem sempre aplicadas,
soft delete antes de hard delete conforme CLAUDE.md.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## FASE 9 — Obrigações Acessórias (SPED ECD e ECF)

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.

Implemente a Fase 9 do módulo Contabilidade: Obrigações acessórias.
As fases 1 a 8 já estão implementadas.

1. SPED ECD — Escrituração Contábil Digital:
   - Service `sped_ecd.py`:
     → Gerar arquivo texto no layout oficial do SPED ECD
     → Blocos: 0 (abertura), I (lançamentos), J (balanço e DRE), 9 (encerramento)
     → Validar integridade dos registros antes de gerar
   - Worker Celery para geração assíncrona
   - Armazenar arquivo gerado no S3/R2
   - Route: POST /contabilidade/sped/ecd/gerar
   - Route: GET /contabilidade/sped/ecd/download/{id}

2. SPED ECF — Escrituração Contábil Fiscal:
   - Service `sped_ecf.py`:
     → Gerar arquivo texto no layout oficial do SPED ECF
     → Utilizar campo codigo_ecf do plano de contas para mapeamento
     → Blocos principais: 0, C, E, J, K, V, X, Y, 9
   - Worker Celery para geração assíncrona
   - Armazenar arquivo gerado no S3/R2
   - Route: POST /contabilidade/sped/ecf/gerar
   - Route: GET /contabilidade/sped/ecf/download/{id}

Referência dos layouts oficiais:
- ECD: http://sped.rfb.gov.br/pasta/show/1569
- ECF: http://sped.rfb.gov.br/pasta/show/1644

Padrões obrigatórios: type hints, Celery para geração,
validação do layout antes de disponibilizar o download.
Ao finalizar, liste o que foi criado e atualize o checklist do AGENT_CONTABILIDADE.md.
```

---

## 🔁 Prompt de retomada (use no início de cada nova sessão)

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.
Verifique o checklist de status no final do agente e me informe
o que já foi implementado e qual é a próxima fase a desenvolver.
Aguarde minha confirmação antes de iniciar.
```

---

## ⚠️ Prompt de correção (use quando algo não estiver funcionando)

```
Leia o CLAUDE.md e o docs/agents/AGENT_CONTABILIDADE.md.
Analise o seguinte problema e proponha a correção mantendo
todos os padrões definidos no projeto:

[DESCREVA O PROBLEMA AQUI]
```
