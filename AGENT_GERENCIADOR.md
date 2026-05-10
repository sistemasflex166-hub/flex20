# AGENT_GERENCIADOR.md — Módulo Gerenciador do Escritório

## Como usar este agente
Instrua o Claude Code a ler este arquivo junto com o CLAUDE.md:
> "Leia o CLAUDE.md e o docs/agents/AGENT_GERENCIADOR.md antes de continuar"

Para trabalhar na integração com os módulos fiscais e de folha:
> "Leia o CLAUDE.md, o docs/agents/AGENT_GERENCIADOR.md,
>  o docs/agents/AGENT_FISCAL.md e o docs/agents/AGENT_FOLHA.md antes de continuar"

---

## Visão Geral e Propósito

O Gerenciador do Escritório resolve um problema real e recorrente relatado por
contadores: a falta de integração entre o controle de tarefas e os sistemas
contábeis, que os obriga a usar planilhas, WhatsApp e ferramentas separadas
para saber o que foi feito, o que falta e quem é responsável por cada entrega.

O grande diferencial deste módulo é que as tarefas NÃO são cadastradas manualmente.
Elas nascem automaticamente a partir das empresas cadastradas, das obrigações
configuradas e das rotinas executadas nos módulos Fiscal e Folha.

Quando o contador executa uma rotina no sistema (fecha o PGDAS, transmite o
SPED, fecha a folha), a tarefa correspondente é marcada como concluída
automaticamente — sem duplo trabalho, sem esquecimento.

---

## Estrutura de Arquivos

```
backend/src/
├── models/
│   └── gerenciador/
│       ├── __init__.py
│       ├── tipo_obrigacao.py         # catálogo de obrigações configuráveis
│       ├── calendario_obrigacao.py   # vínculo obrigação × empresa × competência
│       ├── tarefa.py                 # tarefa gerada para cada obrigação × empresa
│       ├── responsavel_empresa.py    # responsável padrão por empresa
│       ├── historico_tarefa.py       # log de alterações de status
│       └── notificacao.py            # notificações e alertas
│
├── services/
│   └── gerenciador/
│       ├── __init__.py
│       ├── gerador_tarefas.py        # geração automática de tarefas por competência
│       ├── conclusao_tarefa.py       # conclusão automática via rotinas dos módulos
│       ├── dashboard.py              # dados do painel de controle
│       ├── alertas.py                # cálculo de alertas e vencimentos
│       └── relatorio_produtividade.py
│
├── routes/
│   └── gerenciador/
│       ├── __init__.py
│       ├── tipo_obrigacao.py
│       ├── tarefas.py
│       ├── dashboard.py
│       ├── responsaveis.py
│       └── relatorios.py
│
├── schemas/
│   └── gerenciador/
│       ├── __init__.py
│       ├── tipo_obrigacao.py
│       ├── tarefa.py
│       └── dashboard.py
│
└── workers/
    └── gerenciador/
        ├── __init__.py
        ├── gerar_tarefas_competencia.py   # Celery — gera tarefas do novo mês
        └── enviar_alertas.py              # Celery — alertas de vencimento
```

---

## Conceito Central — Como as Tarefas Funcionam

### Fluxo completo
```
CONFIGURAÇÃO (feita uma vez pelo escritório):
  Cadastrar tipos de obrigação com prazo, periodicidade e módulo de origem
  Definir quais obrigações se aplicam a cada empresa (ou grupo de regimes)
  Definir responsável padrão por empresa

        ↓ (automático — todo início de mês)

GERAÇÃO AUTOMÁTICA:
  Worker Celery roda no dia 1 de cada mês
  Para cada empresa × obrigação ativa:
    Cria uma tarefa com status "pendente"
    Define prazo de vencimento conforme configuração
    Atribui ao responsável padrão da empresa

        ↓ (automático — quando o contador executa a rotina no sistema)

CONCLUSÃO AUTOMÁTICA:
  Contador fecha o PGDAS de uma empresa no módulo Fiscal
    → Tarefa "Simples Nacional" daquela empresa → status "concluída"

  Contador transmite o SPED ECD no módulo Contabilidade
    → Tarefa "SPED ECD" daquela empresa → status "concluída"

  Contador fecha a folha no módulo Folha
    → Tarefa "Folha de Pagamentos" daquela empresa → status "concluída"

        ↓

VISIBILIDADE EM TEMPO REAL:
  Dashboard do gerenciador reflete o estado atual de todas as tarefas
  Sem nenhum cadastro manual — o sistema acompanha automaticamente
```

---

## Models — Especificação Detalhada

### `tipo_obrigacao.py`
```python
# Catálogo de tipos de obrigação configuráveis pelo escritório

id: int
escritorio_id: int              # pertence ao escritório (tenant)
nome: str                       # ex: "Simples Nacional", "SPED ECD"
descricao: str | None
periodicidade: str              # mensal / trimestral / anual / eventual
dia_vencimento: int | None      # dia fixo do mês (ex: 20 para Simples)
mes_vencimento: int | None      # para obrigações anuais (ex: 6 = junho)

# Integração com módulos
modulo_origem: str | None
# fiscal_simples   → concluída ao fechar PGDAS
# fiscal_pis_cofins → concluída ao gerar EFD Contribuições
# fiscal_efd_icms  → concluída ao gerar EFD ICMS
# fiscal_efd_reinf → concluída ao gerar EFD Reinf
# contabil_ecd     → concluída ao gerar SPED ECD
# contabil_ecf     → concluída ao gerar SPED ECF
# folha_mensal     → concluída ao fechar a folha
# folha_esocial    → concluída ao transmitir E-Social
# folha_dctfweb    → concluída ao gerar DCTFWeb
# manual           → sem integração — conclusão manual

# Configuração de alertas
alertar_dias_antes: int         # ex: 5 → alerta 5 dias antes do vencimento
alertar_responsavel: bool
alertar_admin: bool

# Regimes que geram essa obrigação automaticamente
aplica_simples: bool
aplica_presumido: bool
aplica_real: bool

ativo: bool
created_at: datetime
```

### `calendario_obrigacao.py`
```python
# Vínculo entre tipo de obrigação e empresa
# Define quais obrigações cada empresa tem

id: int
empresa_id: int
tipo_obrigacao_id: int          # FK tipo_obrigacao
responsavel_id: int | None      # FK usuario — responsável específico
                                # se None, usa o responsável padrão da empresa
ativo: bool
created_at: datetime

# REGRA: ao cadastrar uma nova empresa, o sistema sugere automaticamente
# as obrigações compatíveis com o regime tributário da empresa.
# O usuário confirma ou ajusta antes de ativar.
```

### `tarefa.py`
```python
# Tarefa gerada para cada obrigação × empresa × competência

id: int                         # sequencial
escritorio_id: int
empresa_id: int
tipo_obrigacao_id: int
responsavel_id: int             # FK usuario

competencia_mes: int
competencia_ano: int
data_vencimento: date

status: str
# pendente    → ainda não iniciada
# em_andamento → iniciada pelo responsável
# concluida   → finalizada (manual ou automática)
# atrasada    → passou do vencimento sem conclusão
# nao_aplicavel → empresa não tinha essa obrigação nesta competência

origem_conclusao: str | None
# manual      → marcada manualmente pelo usuário
# automatica  → marcada pelo sistema ao executar a rotina no módulo

referencia_id: int | None       # ID do registro que gerou a conclusão
                                # ex: id do PGDAS, id do SPED, id da folha

data_conclusao: datetime | None
usuario_conclusao_id: int | None
observacao: str | None

# Soft delete
excluido: bool
created_at: datetime
updated_at: datetime
```

### `responsavel_empresa.py`
```python
# Responsável padrão por empresa no escritório
id: int
empresa_id: int
usuario_id: int                 # FK usuario (funcionário do escritório)
tipo: str                       # principal / substituto
created_at: datetime
```

### `historico_tarefa.py`
```python
# Log de toda alteração de status de uma tarefa
id: int
tarefa_id: int
status_anterior: str
status_novo: str
origem: str                     # manual / automatica / sistema
usuario_id: int | None
modulo: str | None              # fiscal / contabilidade / folha
observacao: str | None
created_at: datetime
```

### `notificacao.py`
```python
id: int
escritorio_id: int
usuario_id: int
tipo: str
# vencimento_proximo  → obrigação vencendo em X dias
# tarefa_atrasada     → obrigação passou do prazo
# tarefa_concluida    → confirmação de conclusão automática
# nova_competencia    → tarefas do novo mês geradas

titulo: str
mensagem: str
lida: bool
tarefa_id: int | None           # FK tarefa relacionada
created_at: datetime
```

---

## Tipos de Obrigação Padrão (seed inicial)

```
O sistema deve vir pré-configurado com os tipos mais comuns.
O escritório pode editar, inativar ou adicionar novos.

Mensal:
  Simples Nacional (PGDAS)    → dia 20 · aplica_simples=True · modulo: fiscal_simples
  PIS / COFINS                → dia 25 · presumido+real · modulo: fiscal_pis_cofins
  EFD ICMS                    → dia 25 · presumido+real · modulo: fiscal_efd_icms
  EFD Contribuições           → dia 31 · presumido+real · modulo: fiscal_efd_reinf
  Folha de Pagamentos         → dia 05 · todos · modulo: folha_mensal
  FGTS                        → dia 07 · todos · modulo: folha_mensal
  E-Social                    → dia 07 · todos · modulo: folha_esocial
  DCTFWeb                     → dia 15 · todos · modulo: folha_dctfweb
  IRPJ/CSLL (estimativa)      → dia 30 · real · modulo: manual

Trimestral:
  IRPJ/CSLL Trimestral        → último dia do mês seguinte · presumido · modulo: manual

Anual:
  SPED ECD                    → maio (dia 31) · presumido+real · modulo: contabil_ecd
  SPED ECF                    → julho (dia 31) · presumido+real · modulo: contabil_ecf
  RAIS                        → março · todos · modulo: manual
  DIRF                        → fevereiro · todos · modulo: manual
  Declaração IR PF (sócios)   → abril · manual
```

---

## Services — Especificação Detalhada

### `gerador_tarefas.py`
```python
def gerar_tarefas_competencia(competencia_mes: int, competencia_ano: int,
                               escritorio_id: int):
    """
    Executado automaticamente no dia 1 de cada mês via Celery.
    Pode ser executado manualmente pelo admin para regenerar.

    Para cada empresa ativa do escritório:
      Para cada obrigação ativa no calendario_obrigacao da empresa:
        Verificar se a tarefa já existe (evitar duplicata)
        Se não existe: criar tarefa com status "pendente"
        Calcular data_vencimento conforme periodicidade e dia configurado
        Atribuir ao responsável configurado

    Retornar resumo: X tarefas criadas, Y já existiam
    """

def calcular_vencimento(tipo_obrigacao: TipoObrigacao,
                        competencia_mes: int,
                        competencia_ano: int) -> date:
    """
    Calcula a data de vencimento real da obrigação.

    Para obrigações mensais com prazo no mês seguinte:
      ex: Simples Nacional de abril → vence em 20/maio
      ex: FGTS de abril → vence em 07/maio

    Para obrigações do próprio mês:
      ex: EFD ICMS de março → vence em 25/março

    Ajustar para próximo dia útil quando cair em feriado ou fim de semana.
    """
```

### `conclusao_tarefa.py`
```python
def concluir_tarefa_automatica(modulo_origem: str, referencia_id: int,
                                empresa_id: int, competencia_mes: int,
                                competencia_ano: int):
    """
    Chamado automaticamente pelos módulos Fiscal, Contabilidade e Folha
    quando uma rotina é finalizada.

    Fluxo:
    1. Buscar tarefa pendente ou em_andamento com:
       empresa_id + competencia + tipo_obrigacao.modulo_origem = modulo_origem
    2. Se encontrada: atualizar status → "concluida"
       origem_conclusao = "automatica"
       referencia_id = ID do registro no módulo de origem
       data_conclusao = datetime.now()
    3. Registrar em historico_tarefa
    4. Gerar notificação de confirmação para o responsável

    Não lança exceção se tarefa não for encontrada — apenas registra log.
    A rotina do módulo não pode ser bloqueada por falha aqui.
    """

def concluir_tarefa_manual(tarefa_id: int, usuario_id: int,
                            observacao: str | None):
    """
    Chamado quando o usuário marca manualmente uma tarefa como concluída.
    Usado para obrigações sem integração (modulo_origem = "manual")
    ou para corrigir casos onde a conclusão automática falhou.
    """

def reabrir_tarefa(tarefa_id: int, usuario_id: int, motivo: str):
    """
    Reabre uma tarefa concluída quando há necessidade de correção.
    Registra o motivo no histórico.
    """
```

### `dashboard.py`
```python
def dados_dashboard(escritorio_id: int, competencia_mes: int,
                    competencia_ano: int) -> dict:
    """
    Retorna todos os dados necessários para o painel em uma única consulta.

    Retorna:
    {
      metricas: {
        total: int,
        concluidas: int,
        atrasadas: int,
        vencendo_5_dias: int,
        pendentes: int,
        percentual_conclusao: float
      },
      por_tipo_obrigacao: [
        { nome, concluidas, faltantes, total, percentual }
      ],
      proximos_vencimentos: [
        { obrigacao, data_vencimento, dias_restantes, empresas_pendentes }
      ],
      empresas_atrasadas: [
        { empresa, obrigacao, data_vencimento, dias_atraso, responsavel }
      ],
      por_responsavel: [
        { usuario, total, concluidas, pendentes, percentual }
      ]
    }
    """
```

---

## Integração com os Módulos — Pontos de Chamada

### Módulo Fiscal → Gerenciador
```python
# Em services/fiscal/simples_nacional/calculo_das.py
# Após confirmar e persistir a apuração:
conclusao_tarefa.concluir_tarefa_automatica(
    modulo_origem="fiscal_simples",
    referencia_id=apuracao.id,
    empresa_id=empresa_id,
    competencia_mes=competencia_mes,
    competencia_ano=competencia_ano
)

# Em services/fiscal/sped/efd_icms.py
# Após gerar e disponibilizar o arquivo:
conclusao_tarefa.concluir_tarefa_automatica(
    modulo_origem="fiscal_efd_icms",
    referencia_id=sped.id,
    ...
)

# Mesmo padrão para: fiscal_pis_cofins, fiscal_efd_reinf
```

### Módulo Contabilidade → Gerenciador
```python
# Em services/contabilidade/sped_ecd.py
# Após gerar o arquivo ECD:
conclusao_tarefa.concluir_tarefa_automatica(
    modulo_origem="contabil_ecd", ...
)

# Em services/contabilidade/sped_ecf.py
conclusao_tarefa.concluir_tarefa_automatica(
    modulo_origem="contabil_ecf", ...
)
```

### Módulo Folha → Gerenciador
```python
# Em services/folha/calculo_folha.py
# Após fechar a folha (status = "fechada"):
conclusao_tarefa.concluir_tarefa_automatica(
    modulo_origem="folha_mensal", ...
)

# Em workers/esocial/transmissao.py
# Após confirmação de transmissão com sucesso:
conclusao_tarefa.concluir_tarefa_automatica(
    modulo_origem="folha_esocial", ...
)

# Em services/folha/dctfweb.py
conclusao_tarefa.concluir_tarefa_automatica(
    modulo_origem="folha_dctfweb", ...
)
```

---

## Interface — Telas Necessárias

### Dashboard principal (painel de obrigações)
```
Seletor de competência (navegar mês a mês)

Métricas no topo:
  Total | Concluídas | Em atraso | Vencendo em 5 dias | Pendentes

Tabela — Obrigações por tipo:
  Nome | Concluídas | Faltantes | Total | Barra de progresso

Lista — Próximos vencimentos:
  Obrigação | Data | Dias restantes (colorido) | Empresas pendentes

Tabela — Empresas em atraso:
  Empresa | Obrigação | Venceu em | Dias de atraso | Responsável

Painel — Por responsável:
  Avatar | Nome | Total tarefas | Progresso | Pendências
```

### Tela de tarefas por empresa
```
Filtros: competência, status, tipo de obrigação, responsável

Para cada empresa:
  Lista de obrigações da competência com status e prazo
  Indicação de origem da conclusão (automática ou manual)
  Botão "Marcar como concluída" para obrigações manuais
  Histórico de alterações de status
```

### Configuração de obrigações
```
Catálogo de tipos de obrigação:
  Listagem com edição de cada tipo
  Prazo, periodicidade, módulo de integração, regimes aplicáveis
  Ativar/inativar tipos

Por empresa:
  Quais obrigações estão ativas
  Responsável padrão
  Exceções de prazo (quando uma empresa tem prazo diferente do padrão)
```

### Notificações
```
Sininho no topo da interface com contador de não lidas
Tipos de notificação:
  Vencimento próximo (X dias antes)
  Tarefa atrasada (passou do prazo)
  Conclusão automática confirmada
  Tarefas do novo mês geradas
```

---

## Regras de Negócio Específicas

- Tarefas geradas automaticamente no dia 1 de cada mês via Celery
- Conclusão automática NUNCA bloqueia a rotina do módulo de origem — é assíncrona
- Uma tarefa concluída automaticamente pode ser reaberta manualmente com justificativa
- Tarefas manuais (sem módulo de integração) só podem ser concluídas pelo usuário
- Ao cadastrar nova empresa: sistema sugere automaticamente as obrigações compatíveis com o regime
- Ao inativar empresa: tarefas futuras não são geradas — tarefas passadas são preservadas
- Responsável padrão pode ser sobrescrito por empresa e por tipo de obrigação
- O sistema deve calcular dias úteis para ajuste de vencimento em feriados
- Histórico de todas as alterações de status é imutável — nunca apagado

---

## Diferenciais de Mercado

```
PROBLEMA RELATADO PELOS CONTADORES:
  "Precisamos de planilha + WhatsApp + sistema contábil para saber
   o que foi feito, o que falta e quem é responsável"

SOLUÇÃO DO FLEX 2.0:
  A tarefa nasce automaticamente da empresa cadastrada
  A tarefa se conclui automaticamente quando o contador executa a rotina
  O dashboard reflete o estado real em tempo real
  Sem duplo trabalho, sem esquecimento, sem ferramenta extra

RESULTADO:
  O escritório opera com uma única ferramenta
  Redução de custo operacional
  Rastreabilidade completa de quem fez o quê e quando
  Visibilidade imediata do que está atrasado e o que vence em breve
```

---

## Status de Desenvolvimento

### Configuração
- [ ] Model tipo_obrigacao com catálogo padrão (seed)
- [ ] Model calendario_obrigacao (vínculo empresa × obrigação)
- [ ] Model responsavel_empresa
- [ ] Tela de configuração de tipos de obrigação
- [ ] Tela de configuração por empresa (quais obrigações + responsável)

### Geração automática
- [ ] Service gerador_tarefas
- [ ] Worker Celery gerar_tarefas_competencia (roda dia 1 de cada mês)
- [ ] Cálculo de data de vencimento com ajuste para dias úteis

### Conclusão automática
- [ ] Service conclusao_tarefa (automática e manual)
- [ ] Model historico_tarefa
- [ ] Ponto de chamada: Fiscal → Simples Nacional
- [ ] Ponto de chamada: Fiscal → EFD ICMS
- [ ] Ponto de chamada: Fiscal → EFD Contribuições
- [ ] Ponto de chamada: Fiscal → EFD Reinf
- [ ] Ponto de chamada: Contabilidade → SPED ECD
- [ ] Ponto de chamada: Contabilidade → SPED ECF
- [ ] Ponto de chamada: Folha → Fechamento da folha
- [ ] Ponto de chamada: Folha → E-Social
- [ ] Ponto de chamada: Folha → DCTFWeb

### Dashboard
- [ ] Service dashboard (dados consolidados em uma consulta)
- [ ] Tela de dashboard com seletor de competência
- [ ] Métricas, tabela por tipo, próximos vencimentos, atrasos, por responsável

### Alertas e notificações
- [ ] Model notificacao
- [ ] Worker Celery enviar_alertas (diário — verifica vencimentos)
- [ ] Sininho de notificações na interface
- [ ] Configuração de quantos dias antes alertar por tipo de obrigação
