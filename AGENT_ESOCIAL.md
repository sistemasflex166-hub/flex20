# AGENT_ESOCIAL.md — Módulo E-Social

## Como usar este agente
Instrua o Claude Code a ler este arquivo junto com o CLAUDE.md e o AGENT_FOLHA.md:
> "Leia o CLAUDE.md, o docs/agents/AGENT_FOLHA.md e o docs/agents/AGENT_ESOCIAL.md antes de continuar"

---

## Visão Geral

O E-Social é o sistema do governo federal para unificação do envio de informações
trabalhistas, previdenciárias e fiscais. Este módulo é responsável por:
- Gerar os XMLs de cada evento no layout exigido pelo governo
- Transmitir os eventos ao webservice do E-Social
- Monitorar os retornos e protocolos
- Registrar o histórico de envios por empresa

O E-Social NÃO é um módulo isolado — ele é alimentado automaticamente pelos
eventos que ocorrem no módulo de Folha de Pagamentos.

---

## Estrutura de Arquivos

```
backend/src/
├── models/
│   └── esocial/
│       ├── __init__.py
│       ├── evento_esocial.py       # registro de cada evento gerado
│       ├── lote_esocial.py         # agrupamento de eventos por envio
│       └── retorno_esocial.py      # protocolos e retornos do governo
│
├── services/
│   └── esocial/
│       ├── __init__.py
│       ├── S1200_remuneracao.py    # remuneração mensal
│       ├── S1210_pagamentos.py     # pagamentos realizados
│       ├── S1700_origem.py         # abertura da folha por competência
│       ├── S2200_admissao.py       # admissão / cadastramento inicial
│       ├── S2206_alteracao.py      # alteração contratual
│       ├── S2230_afastamento.py    # afastamentos temporários
│       ├── S2299_desligamento.py   # desligamento / rescisão
│       ├── S2400_beneficio.py      # benefício de prestação continuada
│       ├── validador.py            # validação do XML antes do envio
│       └── transmissao.py          # envio ao webservice do governo
│
├── schemas/
│   └── esocial/
│       ├── __init__.py
│       └── eventos.py              # schemas Pydantic para cada evento
│
└── workers/
    └── esocial/
        ├── __init__.py
        ├── gerar_xml.py            # geração assíncrona dos XMLs
        └── monitorar_retorno.py    # consulta periódica de status
```

---

## Eventos Implementados

### Tabela de Eventos × Gatilhos

| Evento | Descrição | Gatilho no Sistema | Prazo Legal |
|---|---|---|---|
| S-1000 | Informações do empregador | Cadastro da empresa | Antes dos demais |
| S-1005 | Tabela de estabelecimentos | Cadastro de filiais | Antes dos demais |
| S-1010 | Tabela de rubricas | Cadastro de eventos da folha | Antes dos demais |
| S-1020 | Tabela de lotações | Cadastro de departamentos | Antes dos demais |
| S-1700 | Origem dos arquivos | Abertura da folha mensal | Até dia 7 do mês |
| S-2200 | Admissão / Cadastramento | Novo funcionário cadastrado | Antes do início das atividades |
| S-2206 | Alteração contratual | Alteração de salário, cargo, jornada | Até dia 7 do mês seguinte |
| S-2230 | Afastamento temporário | Registro de atestado ou licença | Até 1 dia útil após o início |
| S-2299 | Desligamento | Rescisão registrada | Até 10 dias após o desligamento |
| S-1200 | Remuneração do trabalhador | Fechamento da folha mensal | Até dia 7 do mês seguinte |
| S-1210 | Pagamentos | Pagamento da folha realizado | Até dia 7 do mês seguinte |
| S-5001 | Totalizadores INSS | Retorno automático do governo | — |
| S-5003 | Totalizadores IRRF | Retorno automático do governo | — |

---

## Models — Especificação detalhada

### `evento_esocial.py`
```python
id: int
empresa_id: int
tipo_evento: str              # S-2200, S-1200 etc.
numero_evento: str            # identificador único gerado pelo sistema
referencia_id: int            # ID do registro que originou (funcionario_id, folha_id etc.)
referencia_tipo: str          # funcionario / folha / rescisao / afastamento

competencia_mes: int | None
competencia_ano: int | None

xml_gerado: str               # XML completo gerado
xml_assinado: str | None      # XML após assinatura digital (se necessário)

status: str
# pendente / enviado / processado / erro / retificado / excluido

lote_id: int | None           # FK lote_esocial
protocolo_envio: str | None
protocolo_retorno: str | None
mensagem_retorno: str | None  # texto do retorno do governo

data_geracao: datetime
data_envio: datetime | None
data_retorno: datetime | None
created_at: datetime
```

### `lote_esocial.py`
```python
id: int
empresa_id: int
numero_lote: str              # identificador do lote
tipo_envio: str               # síncrono / assíncrono
ambiente: str                 # producao / homologacao

status: str
# aguardando / enviado / processado / erro

quantidade_eventos: int
protocolo: str | None
data_envio: datetime | None
data_retorno: datetime | None
resposta_governo: str | None  # XML completo de retorno
created_at: datetime
```

### `retorno_esocial.py`
```python
id: int
empresa_id: int
lote_id: int
evento_id: int

codigo_ocorrencia: str        # código de erro ou sucesso do governo
tipo_ocorrencia: str          # erro / aviso / sucesso
descricao: str
localizacao: str | None       # campo que gerou o erro

created_at: datetime
```

---

## Serviços — Especificação por Evento

### `S2200_admissao.py`
```
Disparado por: cadastro de novo funcionário
Dados obrigatórios:
  - CPF do trabalhador
  - Nome completo
  - Data de nascimento
  - Sexo
  - Grau de instrução (tabela E-Social)
  - NIS/PIS
  - Endereço completo
  - Data de admissão
  - Tipo de admissão (normal, transferência etc.)
  - Indicador de trabalho temporário
  - Cargo (com CBO obrigatório)
  - Natureza da atividade
  - Tipo de jornada
  - Salário base
  - Periodicidade (mensal, quinzenal, semanal, hora)
  - CNPJ do sindicato (se houver)

Validações antes de gerar:
  - CPF válido (algoritmo de validação)
  - PIS/NIS válido (algoritmo de validação)
  - CBO preenchido e válido
  - Salário >= salário mínimo vigente
  - Data admissão não pode ser futura

Prazo de envio: antes do início das atividades do trabalhador
```

### `S2206_alteracao.py`
```
Disparado por: qualquer alteração nos dados contratuais
Alterações que geram S-2206:
  - Mudança de salário
  - Mudança de cargo ou CBO
  - Mudança de jornada
  - Mudança de departamento/lotação
  - Mudança de regime de trabalho

Dados obrigatórios:
  - CPF do trabalhador
  - Data da alteração
  - Campo(s) alterado(s) com novo valor

Prazo de envio: até dia 7 do mês seguinte à alteração
```

### `S2230_afastamento.py`
```
Disparado por: registro de afastamento ou atestado médico
Tipos de afastamento (tabela E-Social):
  01 - Acidente de trabalho
  03 - Acidente de trabalho em trajeto
  05 - Doença relacionada ao trabalho
  06 - Doença não relacionada ao trabalho
  10 - Licença maternidade (120 dias)
  11 - Licença maternidade prorrogada (180 dias)
  17 - Licença paternidade
  18 - Licença paternidade prorrogada
  ...

Dados obrigatórios:
  - CPF do trabalhador
  - Data início afastamento
  - Código do tipo de afastamento
  - CID (para afastamentos por doença > 15 dias)
  - Data fim (se já conhecido)

Prazo de envio: até 1 dia útil após o início do afastamento
Observação: afastamentos por doença até 15 dias não precisam ser enviados
(período de carência pago pela empresa)
```

### `S2299_desligamento.py`
```
Disparado por: registro de rescisão no módulo folha
Dados obrigatórios:
  - CPF do trabalhador
  - Data do desligamento
  - Motivo do desligamento (tabela E-Social):
    01 - Rescisão com justa causa pelo empregador
    02 - Rescisão sem justa causa pelo empregador
    03 - Rescisão por pedido do empregado (sem justa causa)
    04 - Rescisão por culpa recíproca
    05 - Rescisão por força maior
    06 - Morte do empregado
    07 - Transferência para empresa do mesmo grupo
    09 - Término do contrato por prazo determinado
    10 - Rescisão do contrato de trabalho por acordo
    ...
  - Indicador de pensão alimentícia
  - Indicador de concessão de aviso prévio indenizado
  - Verbas rescisórias (via S-1200 ou integradas)

Prazo de envio: até 10 dias após a data do desligamento
```

### `S1200_remuneracao.py`
```
Disparado por: fechamento da folha de pagamentos (status = fechada)
Enviado para: TODOS os trabalhadores com remuneração na competência

Dados por trabalhador:
  - CPF
  - Competência (mês/ano)
  - Remuneração por rubrica:
    * Código da rubrica (evento da folha)
    * Descrição
    * Natureza (provento/desconto)
    * Valor
    * Quantidade (horas/dias, quando aplicável)
  - Base INSS
  - Base IRRF
  - FGTS da competência

Validação: todos os eventos (rubricas) da folha devem estar previamente
cadastrados no E-Social via S-1010 (tabela de rubricas)

Prazo de envio: até dia 7 do mês seguinte
```

### `S1210_pagamentos.py`
```
Disparado por: confirmação de pagamento da folha
Dados obrigatórios:
  - CPF do trabalhador
  - Data do pagamento
  - Tipo de pagamento:
    01 - Remuneração mensal
    02 - 13º salário 1ª parcela
    03 - 13º salário 2ª parcela
    04 - Férias
    05 - Rescisão
    06 - PLR
    ...
  - Valor líquido pago

Prazo de envio: até dia 7 do mês seguinte
```

---

## Fluxo Completo de Transmissão

```
1. GERAÇÃO
   Evento ocorre no sistema (admissão, folha fechada etc.)
         ↓
   Worker Celery dispara gerar_xml.py (assíncrono)
         ↓
   XML gerado no layout exigido pelo governo
         ↓
   Validação do schema XSD oficial (validador.py)
         ↓
   XML salvo em evento_esocial com status "pendente"

2. AGRUPAMENTO EM LOTE
   Worker agrupa eventos pendentes em lote
         ↓
   Lote criado em lote_esocial

3. TRANSMISSÃO
   transmissao.py envia lote ao webservice do governo
         ↓
   Ambientes:
     Homologação: https://sh.esocial.gov.br/ws/WsEnviarLoteEventos/WsEnviarLoteEventos.svc
     Produção:    https://ws1.esocial.gov.br/ws/WsEnviarLoteEventos/WsEnviarLoteEventos.svc
         ↓
   Protocolo de envio recebido → salvo no lote
   Status lote: "enviado"

4. MONITORAMENTO
   Worker monitorar_retorno.py consulta status a cada 5 minutos
   (usando protocolo de envio)
         ↓
   Governo retorna: processado / erro
         ↓
   Se processado: status evento = "processado", salvar protocolo retorno
   Se erro: status evento = "erro", salvar mensagem de erro
         ↓
   Erros ficam disponíveis para o usuário corrigir e reenviar

5. RETIFICAÇÃO
   Usuário corrige dado que gerou erro
         ↓
   Evento gerado novamente com indicador de retificação
   (inclui número do recibo do evento original)
```

---

## Certificado Digital

```
O E-Social exige assinatura digital com certificado A1 ou A3

Implementação:
- Certificado A1 (arquivo .pfx): mais simples para SaaS
- Cada empresa deve ter seu próprio certificado cadastrado no sistema
- O arquivo .pfx é armazenado de forma segura (criptografado no S3)
- A chave privada nunca é exposta — assinatura feita no backend

Libraries Python:
- lxml: geração e validação do XML
- cryptography: assinatura digital
- signxml: assinatura XML no padrão W3C/E-Social

Estrutura no banco:
empresa.certificado_path: str     # caminho no S3 (criptografado)
empresa.certificado_senha: str    # senha do .pfx (criptografada)
empresa.certificado_validade: date
```

---

## Validações Obrigatórias Antes do Envio

```
1. Schema XSD — validar XML contra o schema oficial do evento
2. CPF — algoritmo de validação dos dígitos verificadores
3. PIS/NIS — algoritmo de validação
4. CNPJ — algoritmo de validação
5. CBO — código deve existir na tabela oficial
6. Datas — consistência (admissão não pode ser posterior ao desligamento etc.)
7. Rubricas — todos os eventos da folha devem estar no S-1010
8. Certificado — válido e não vencido antes de transmitir
9. Ambiente — nunca enviar dados de produção para homologação e vice-versa
```

---

## Tratamento de Erros Comuns

| Código Governo | Descrição | Ação no Sistema |
|---|---|---|
| E-CPF-001 | CPF inválido | Alertar usuário para corrigir cadastro |
| E-CPF-002 | CPF já cadastrado no período | Verificar duplicidade |
| E-RUB-001 | Rubrica não cadastrada | Gerar S-1010 primeiro |
| E-DAT-001 | Data fora do prazo | Alertar e permitir envio com justificativa |
| E-CBO-001 | CBO inválido | Alertar usuário para corrigir cargo |
| W-SAL-001 | Salário abaixo do mínimo | Aviso (não bloqueia) |

---

## Interface — O que o Usuário Vê

### Painel E-Social por empresa
```
Status dos eventos da competência atual:
- Tabelas iniciais (S-1000, S-1005, S-1010, S-1020): ✅ Enviadas
- Admissões do mês: X enviadas, Y com erro
- Folha (S-1200): ⏳ Aguardando fechamento da folha
- Pagamentos (S-1210): ⏳ Aguardando pagamento

Histórico de envios com filtro por:
- Competência
- Tipo de evento
- Status (processado / erro / pendente)
```

### Fila de erros
```
Lista de eventos com erro retornado pelo governo:
- Tipo do evento
- Trabalhador relacionado
- Mensagem de erro do governo
- Botão: "Corrigir e Reenviar"
```

---

## Ambiente de Homologação

```
IMPORTANTE: Todo desenvolvimento e testes devem usar o ambiente de homologação
Nunca testar com certificado de produção

Variável de ambiente:
ESOCIAL_AMBIENTE=homologacao  # ou producao

URLs por ambiente:
Homologação: https://sh.esocial.gov.br/...
Produção:    https://ws1.esocial.gov.br/...

Identificador do empregador em homologação:
Usar CNPJ de teste fornecido pelo eSocial
```

---

## Integração com DCTFWeb

```
A DCTFWeb é gerada a partir dos totalizadores do E-Social (S-5001 e S-5003)
Após o governo processar o S-1200, retorna automaticamente:
  S-5001: totalizadores de INSS por trabalhador
  S-5003: totalizadores de IRRF por trabalhador

Esses retornos alimentam automaticamente a DCTFWeb
O sistema deve armazenar os totalizadores e gerar o arquivo da DCTFWeb
com base neles — ver AGENT_FOLHA.md seção DCTFWeb
```

---

## Schemas XSD Oficiais

```
Os schemas XSD devem ser baixados do portal do E-Social e versionados no projeto:
/backend/src/integrations/esocial/xsd/
  ├── v_S_01_02_00/      # versão atual dos schemas
  │   ├── evtAdmissao.xsd
  │   ├── evtAltContratual.xsd
  │   ├── evtAfastTemp.xsd
  │   ├── evtDeslig.xsd
  │   ├── evtRemun.xsd
  │   ├── evtPgtos.xsd
  │   └── ...
  └── leiautes/          # documentação oficial em PDF

Portal oficial: https://www.gov.br/esocial/pt-br/documentacao-tecnica
```

---

## Status de Desenvolvimento

### Tabelas iniciais (pré-requisito para tudo)
- [ ] S-1000 — Informações do empregador
- [ ] S-1005 — Tabela de estabelecimentos
- [ ] S-1010 — Tabela de rubricas (eventos da folha)
- [ ] S-1020 — Tabela de lotações (departamentos)

### Eventos de trabalhadores
- [ ] S-2200 — Admissão
- [ ] S-2206 — Alteração contratual
- [ ] S-2230 — Afastamento temporário
- [ ] S-2299 — Desligamento

### Eventos periódicos
- [ ] S-1700 — Origem dos arquivos (abertura da folha)
- [ ] S-1200 — Remuneração mensal
- [ ] S-1210 — Pagamentos

### Infraestrutura
- [ ] Validador XSD (validar XML antes do envio)
- [ ] Assinatura digital com certificado A1
- [ ] Transmissão ao webservice (homologação)
- [ ] Worker monitoramento de retornos
- [ ] Painel de status no frontend
- [ ] Fila de erros com ação de reenvio
- [ ] Transmissão ao webservice (produção)
- [ ] Integração totalizadores → DCTFWeb
