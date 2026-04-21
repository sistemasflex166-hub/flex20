# CLAUDE.md — Sistema de Contabilidade SaaS

## Visão Geral do Projeto

Sistema de contabilidade no formato SaaS destinado a escritórios de contabilidade.
Totalmente em nuvem, sem instalação local. O escritório contrata a plataforma e
gerencia seus clientes (empresários) dentro dela.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.11+ com FastAPI |
| Frontend | React + TypeScript |
| Banco de dados | PostgreSQL (multitenancy via schemas isolados por escritório) |
| Filas e jobs | Celery + Redis |
| Armazenamento | AWS S3 ou Cloudflare R2 (XMLs, PDFs, holerites, relatórios) |
| Infraestrutura | Docker + Railway ou Render (migrar para AWS ao escalar) |
| OCR / PDF | pdfplumber, PyMuPDF, Tesseract + pytesseract, Camelot, pdfminer |

---

## Arquitetura Geral

```
React + TypeScript (Frontend)
          ↓
FastAPI (Backend / API REST)
          ↓
PostgreSQL              Redis
(dados por schema)      (cache + filas Celery)
          ↓
Celery Workers
(XMLs, PDFs, SPEDs, relatórios pesados, OFX)
          ↓
S3 / R2
(armazenamento de arquivos)
```

---

## Hierarquia de Acesso — 3 Níveis

```
NÍVEL 1 — Administrador da Plataforma
  Acesso: painel geral, escritórios cadastrados, planos, faturamento

NÍVEL 2 — Escritório Contábil (tenant)
  Acesso: todos os módulos contábeis conforme permissão interna
  Subperfis internos configuráveis pelo próprio escritório:
    - Administrador do escritório
    - Usuário operacional (funcionário)

NÍVEL 3 — Empresário (cliente do escritório)
  Acesso: apenas módulos ERP liberados pelo escritório
    - Pode ter acesso só ao Financeiro
    - Pode ter acesso só ao Emissor de NF-S
    - Pode ter acesso a ambos
    - Configurado individualmente por empresa
```

### Regras de acesso
- Cada escritório é um tenant isolado com schema próprio no PostgreSQL
- O escritório cadastra seus funcionários e define permissões internas
- O escritório cadastra os empresários clientes e define quais módulos ERP cada um acessa
- O empresário nunca acessa módulos contábeis do escritório
- Dados de um tenant jamais são visíveis a outro tenant

---

## Regras de Negócio Imutáveis

### Codificação sequencial de empresas
- Cada empresa cadastrada recebe um código exclusivamente numérico e sequencial
- A sequência é por escritório — cada tenant tem sua própria contagem independente
- O código é gerado automaticamente no momento do cadastro
- O campo é desabilitado na interface — nunca editável pelo usuário
- Após cadastrado, o código é imutável e permanente
- Empresas inativadas mantêm seu código — ele nunca é reutilizado
- Novas empresas seguem a sequência a partir do último código gerado

### Codificação sequencial de lançamentos
- Lançamentos fiscais e contábeis possuem códigos sequenciais independentes entre si
- A sequência é por empresa — cada empresa tem sua própria contagem para cada tipo
- Formato sugerido: numérico puro (ex: 000001, 000002...)
- O campo é gerado pelo sistema e desabilitado na interface
- A sequência nunca reinicia — é contínua e perpétua
- Em caso de exclusão definitiva, o número vira gap permanente na sequência — aceito e esperado

### Exclusão de lançamentos — duas camadas

**Camada 1 — Exclusão Lógica (Soft Delete)**
- Lançamento removido da operação normal
- Permanece armazenado em área de lixeira por módulo
- Pode ser reintegrado ao sistema a qualquer momento
- Número da sequência permanece reservado

**Camada 2 — Exclusão Definitiva (Hard Delete)**
- Ação separada e deliberada, executada somente sobre itens já na lixeira
- Lançamento apagado permanentemente do banco de dados
- Número vira gap definitivo na sequência
- Ação irreversível — interface deve exigir confirmação explícita do usuário (ex: digitar palavra-chave)

### Empresas inativas
- Código preservado e inutilizável após inativação
- Histórico completo de dados e lançamentos mantido para consulta
- Empresas inativas não aparecem nas operações ativas
- Acessíveis via filtro específico na interface

---

## Visual e Interface

- Menu lateral esquerdo com os módulos principais
- Submenus expandem abaixo do item pai ao serem abertos
- Centro da tela: atalhos e dashboards com rotinas e informações mais importantes
- Tema claro obrigatório — modo escuro não será implementado
- Cada módulo se divide em: Cadastros | Movimentos | Utilitários | Relatórios

---

## Módulos do Sistema

### 1. Configurações
Configurações gerais da plataforma, do escritório e das empresas cadastradas.

### 2. Escrita Fiscal
**Cadastros**
- Clientes e fornecedores
- Natureza de operação
- Produtos
- Itens de serviço (configurações e CFOPS)
- Alíquotas de tributos
- Anexos do Simples Nacional

**Movimentos**
- Lançamentos de compras e vendas
- Lançamentos de serviços prestados e tomados
- Lançamentos de conhecimento de transporte
- Lançamentos de outras bases tributáveis

**Importações**
- XML NF-e modelo 55 (compras e vendas)
- XML NF-S (serviços prestados e tomados) — padrão emissor nacional
- Planilha Excel em layout padrão do sistema
- PDF (extratos, documentos fiscais) via pipeline OCR + validação manual

**Obrigações Acessórias**
- EFD SPED ICMS
- EFD Contribuições (PIS e COFINS)
- Simples Nacional — PGDAS
- EFD-Reinf

**Reforma Tributária**
- Cálculo de IBS e CBS a partir das tags já presentes nas NF-e e NF-S
- Atualização contínua conforme regulamentação

### 3. Contabilidade
**Cadastros**
- Plano de contas
- Centro de custos
- Histórico padrão

**Movimentos**
- Lançamentos contábeis manuais
- Integração automática a partir dos lançamentos fiscais
- Integração automática a partir da folha de pagamentos

**Importações**
- Planilha Excel em layout padrão do sistema
- Arquivo TXT separado por vírgulas
- Arquivo OFX (extrato bancário) — com cadastro de conta bancária e configuração de contas contábeis por histórico para geração automática de lançamentos

**Relatórios**
- DRE e DRE Comparativo
- Balanço Patrimonial e Balanço Comparativo
- Balancete
- Razão
- Diário
- Demonstração do Fluxo de Caixa

**Obrigações Acessórias**
- SPED ECD
- SPED ECF

### 4. Folha de Pagamentos
**Cadastros**
- Funções
- Centro de custos
- Funcionários
- Sindicatos
- Eventos da folha

**Movimentos**
- Lançamentos de variáveis da folha (descontos, salários, horas extras etc.)

**Relatórios**
- Memória de cálculo da folha
- Holerite
- Resumo da folha
- Relatório de líquidos
- Férias vencendo
- Décimo terceiro salário

**Obrigações Acessórias**
- E-Social
- DCTFWeb

### 5. Controle de Patrimônio
Controle e depreciação de bens do ativo imobilizado das empresas clientes.

### 6. LALUR
Livro de Apuração do Lucro Real.

---

## Módulos Adicionais

### 7. Gerenciador do Escritório
Módulo de gestão interna do escritório contábil.

**Gestão de Carteira**
- Cadastro e gestão de clientes do escritório
- Contratos e honorários

**Tarefas**
- Cadastro de tarefas com prazos e responsáveis
- Alocação de tarefas por cliente conforme contrato
- Dashboard de controle de entregas e prazos

**Relacionamento com o Cliente**
- Publicação de guias e relatórios para o empresário
- Controle de entrega ao empresário
- Abertura de chamados pelo empresário

### 8. ERP para o Empresário
Módulo liberado pelo escritório para uso direto do empresário cliente.

**Financeiro**
- Contas a pagar e a receber
- Conciliação bancária
- Relatórios financeiros

**Emissor de Notas Fiscais**
- Emissão de NF-S no padrão nacional (prestação de serviços)
- Expansão futura para outros modelos

**Integrações automáticas com módulos do escritório**
- NF-S emitida → integrada automaticamente ao módulo Fiscal do escritório
- Lançamentos financeiros → integrados automaticamente ao módulo Contabilidade

---

## Pipeline de Importação e Transformação

### Arquivos suportados por módulo

| Tipo | Formato | Destino |
|---|---|---|
| NF-e compra/venda | XML modelo 55 | Fiscal |
| NF-S prestados/tomados | XML padrão nacional | Fiscal |
| Documentos fiscais | PDF (digital ou escaneado) | Fiscal |
| Lançamentos fiscais | Planilha Excel padrão | Fiscal |
| Lançamentos contábeis | Planilha Excel padrão | Contabilidade |
| Lançamentos contábeis | TXT separado por vírgulas | Contabilidade |
| Extrato bancário | OFX | Contabilidade |
| Folha de pagamentos | Integração automática interna | Contabilidade |

### Fluxo de processamento de PDF
```
PDF enviado
    ↓
Celery Worker (assíncrono)
    ↓
Identificação do tipo (extrato, nota, folha etc.)
    ↓
Extração de dados (pdfplumber / PyMuPDF / Tesseract OCR)
    ↓
Validação e mapeamento de campos
    ↓
Tela de confirmação para o usuário revisar antes de efetivar
    ↓
Lançamento no módulo correspondente
```

> PDFs escaneados passam por OCR e obrigatoriamente pela tela de confirmação antes de qualquer lançamento.

---

## Padrões de Desenvolvimento

- Sempre utilizar type hints em todo o código Python
- Testes com pytest para toda nova função de regra de negócio
- Separação clara entre rotas, serviços e modelos
- Toda ação irreversível deve ter confirmação explícita na interface
- Campos gerados pelo sistema (códigos sequenciais) são sempre desabilitados na interface
- Soft delete antes de hard delete — nunca apagar diretamente da operação
- Multitenancy garantido em todas as queries — nenhuma query pode cruzar schemas

### Estrutura de pastas sugerida (Backend)
```
/src
  /routes       → endpoints da API por módulo
  /services     → regras de negócio
  /models       → modelos do banco de dados
  /schemas      → schemas Pydantic (validação)
  /workers      → tasks Celery (importações, relatórios, obrigações)
  /integrations → SEFAZ, E-Social, SPED, OFX
  /utils        → helpers gerais
```

---

## Status de Desenvolvimento

### Fase 1 — Base do SaaS
- [ ] Autenticação JWT com refresh token
- [ ] Multitenancy com schemas isolados por escritório
- [ ] Hierarquia de usuários (Admin plataforma / Escritório / Empresário)
- [ ] Gestão de planos e assinaturas
- [ ] Estrutura de permissões por perfil e por módulo

### Fase 2 — Configurações e Cadastros Base
- [ ] Módulo de Configurações gerais
- [ ] Cadastro de empresas com código sequencial imutável
- [ ] Cadastro de clientes/fornecedores
- [ ] Plano de contas
- [ ] Produtos, serviços, CFOPS e naturezas de operação

### Fase 3 — Escrita Fiscal
- [ ] Lançamentos fiscais com código sequencial por empresa
- [ ] Importação de XML NF-e modelo 55
- [ ] Importação de XML NF-S
- [ ] Importação via planilha Excel
- [ ] Importação via PDF (pipeline OCR)
- [ ] Cálculo de tributos (ICMS, PIS, COFINS, ISS, IBS, CBS)
- [ ] Simples Nacional e PGDAS
- [ ] Relatórios fiscais
- [ ] EFD SPED ICMS
- [ ] EFD Contribuições
- [ ] EFD-Reinf

### Fase 4 — Contabilidade
- [ ] Lançamentos contábeis com código sequencial por empresa
- [ ] Importação OFX com configuração de contas por histórico
- [ ] Importação Excel e TXT
- [ ] Integração automática do Fiscal → Contabilidade
- [ ] Relatórios (DRE, Balanço, Balancete, Razão, Diário, DFC)
- [ ] SPED ECD
- [ ] SPED ECF

### Fase 5 — Folha de Pagamentos
- [ ] Cadastros (funções, funcionários, sindicatos, eventos)
- [ ] Cálculo da folha
- [ ] Holerite e relatórios
- [ ] Integração automática Folha → Contabilidade
- [ ] E-Social
- [ ] DCTFWeb

### Fase 6 — Patrimônio e LALUR
- [ ] Controle de bens e depreciação
- [ ] LALUR

### Fase 7 — Gerenciador do Escritório
- [ ] Carteira de clientes e contratos
- [ ] Módulo de tarefas com dashboard de entregas
- [ ] Relacionamento com cliente (publicação de guias e chamados)

### Fase 8 — ERP para o Empresário
- [ ] Financeiro (contas a pagar/receber, conciliação bancária)
- [ ] Emissor de NF-S padrão nacional
- [ ] Integração automática ERP → Fiscal e Contabilidade

### Fase 9 — Integrações e Automações Contínuas
- [ ] Reforma Tributária — IBS e CBS
- [ ] Expansão do emissor de NF para outros modelos
- [ ] Melhorias de automação entre módulos

---

## Decisões Técnicas Registradas

| Data | Decisão | Motivo |
|---|---|---|
| Início | Python + FastAPI no backend | Melhor ecossistema para fiscal brasileiro, XML, PDF e SPED |
| Início | React + TypeScript no frontend | Escala bem para dashboards e sistemas complexos |
| Início | PostgreSQL com schemas por tenant | Isolamento seguro e performático para multitenancy |
| Início | Celery + Redis para jobs | PDFs, XMLs e SPEDs não podem bloquear a interface |
| Início | Sequência numérica perpétua sem reinício | Simplicidade e rastreabilidade |
| Início | Soft delete antes de hard delete | Auditabilidade e segurança operacional |
| Início | Modo escuro não implementado | Decisão de produto |
