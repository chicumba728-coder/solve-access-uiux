# 01 — Análise dos requisitos

## 1. Fonte de verdade
Este documento implementa os requisitos fornecidos para a Fase 2 do SOLVE ACESS. O PostgreSQL é a fonte persistente principal; o frontend, CRM e OVG não calculam estados financeiros nem aulas.

O contexto operacional é Angola: valores monetários são AOA/Kwanza, o timezone padrão é `Africa/Luanda`, a identificação fiscal é o NIF angolano e Multicaixa é um método de pagamento suportado.

## 2. Entidades e modelo de domínio

| Entidade | PK | Responsabilidade |
|---|---|---|
| `users` | `id` UUID | Utilizador autenticado e autor de operações |
| `roles` | `id` UUID | Perfil de autorização |
| `permissions` | `id` UUID | Permissões granulares |
| `user_roles`, `role_permissions` | composta | Relações N:N de autorização |
| `clients` | `id` UUID | Cadastro principal do cliente, soft-delete/desativação |
| `plans` | `id` UUID | Plano configurável, nunca hardcoded |
| `subscriptions` | `id` UUID | Inscrição do cliente e estado operacional |
| `subscription_plan_versions` | `id` UUID | Histórico do plano/preço vigente numa inscrição |
| `billing_periods` | `id` UUID | Período financeiro mensal ou parcial, snapshot de cobrança |
| `payments` | `id` UUID | Facto de pagamento independente dos períodos |
| `payment_allocations` | `id` UUID | Distribuição de um pagamento por períodos |
| `invoices` | `id` UUID | Documento de faturação consultável e numerado |
| `classes` | `id` UUID | Aula/turma/uso agendado |
| `attendances` | `id` UUID | Presença ou ausência registada |
| `freezes` | `id` UUID | Congelamento formal com ciclo de vida |
| `period_releases` | `id` UUID | Liberação excepcional sem apagar dívida original |
| `audit_events` | `id` UUID | Histórico append-only de operações críticas |
| `integration_events` | `id` UUID | Outbox/retries/idempotência para CRM/OVG |
| `global_parameters` | `key` text | Configuração operacional, incluindo plano mínimo de ausência |

## 3. Atributos, FKs e constraints principais

### `clients`
`id UUID PK`, `client_number TEXT UNIQUE NOT NULL`, `full_name TEXT NOT NULL`, `photo_url TEXT NULL`, `birth_date DATE NULL`, `gender TEXT NULL`, `tax_id TEXT NULL`, `phone TEXT NULL`, `email TEXT NULL`, `status CLIENT_STATUS NOT NULL`, `created_at`, `updated_at`, `deactivated_at`, `deactivated_by FK users`.

Índices: email normalizado, nome, status, `deactivated_at` parcial. O NIF é único quando fornecido via índice parcial.

### `plans`
`id UUID PK`, `name TEXT UNIQUE NOT NULL`, `lessons_per_period INTEGER NULL`, `validity_months INTEGER NOT NULL`, `usage_rules JSONB NOT NULL`, `price NUMERIC(12,2) NOT NULL`, `is_unlimited BOOLEAN NOT NULL`, `is_active BOOLEAN NOT NULL`, timestamps, `created_by/updated_by FK users`.

Constraints: preço >= 0; validade > 0; plano livre trânsito tem `is_unlimited=true`; planos limitados têm aulas > 0. Alteração de preço não altera snapshots históricos.

### `subscriptions`
`id UUID PK`, `client_id FK clients`, `status SUBSCRIPTION_STATUS`, `started_on DATE`, `ended_on DATE NULL`, timestamps, `created_by`, `ended_by`.

Uma inscrição ativa por cliente via índice parcial único. `ended_on >= started_on` quando preenchido. Desativar cliente não elimina inscrição.

### `subscription_plan_versions`
`id UUID PK`, `subscription_id FK`, `plan_id FK`, `price NUMERIC(12,2)`, `lessons_per_period INTEGER NULL`, `valid_from DATE`, `valid_to DATE NULL`, `change_reason TEXT`, `changed_by FK users`, timestamps.

Índice composto `(subscription_id, valid_from DESC)`, índice de pesquisa por `(plan_id, valid_from, valid_to)`. Não há sobreposição de vigências para a mesma inscrição (validada transacionalmente; PostgreSQL exclusion constraint recomendada).

### `billing_periods`
`id UUID PK`, `subscription_id FK`, `client_id FK`, `plan_version_id FK`, `period_start DATE`, `period_end DATE`, `calendar_year SMALLINT`, `calendar_month SMALLINT`, `sequence_no INTEGER`, `lessons_entitled INTEGER NULL`, `amount_due NUMERIC(12,2)`, `amount_paid NUMERIC(12,2)`, `amount_open NUMERIC(12,2)`, `financial_status FINANCIAL_STATUS`, `calculation_origin TEXT`, `released_amount NUMERIC(12,2) DEFAULT 0`, timestamps.

Unique `(subscription_id, period_start, period_end)` e unique `(subscription_id, calendar_year, calendar_month, sequence_no)`. Checks de datas, valores não negativos e `amount_open = amount_due - amount_paid - released_amount` são mantidos pelo serviço transacional e verificados por constraint de consistência.

### `payments` e `payment_allocations`
`payments`: cliente, valor, data, método, referência, estado, utilizador, idempotency_key unique opcional, timestamps.
`payment_allocations`: pagamento, período, valor aplicado, timestamps; unique `(payment_id, billing_period_id)` e valor > 0. Soma das alocações não excede pagamento; transação com lock `FOR UPDATE` recalcula períodos.

### `invoices`
`id UUID PK`, `invoice_number TEXT UNIQUE`, `client_id FK`, `payment_id FK NULL`, `issued_at`, `subtotal`, `tax_amount`, `total`, `status`, `metadata JSONB`, timestamps. A política fiscal e emissão oficial estão marcadas como decisão necessária.

### `classes` e `attendances`
`classes`: nome, starts_at, ends_at, weekday, capacity, is_active, timestamps.
`attendances`: client_id, class_id, occurred_at, status, source, recorded_by, unique `(client_id, class_id, occurred_at::date)` por regra de aplicação/índice funcional. Presença válida apenas em dias de funcionamento e para inscrição aplicável, salvo autorização administrativa.

### `freezes`
`id UUID PK`, `client_id FK`, `subscription_id FK`, `starts_on`, `ends_on`, `reason`, `status FREEZE_STATUS`, `created_by`, `ended_by`, timestamps. Sem sobreposição ativa para a mesma inscrição; descongelar fecha o registo, não o apaga.

### `period_releases`
`id UUID PK`, `client_id FK`, `billing_period_id FK`, `original_amount`, `released_amount`, `reason`, `released_at`, `released_by`, timestamps. Unique `(billing_period_id, status ativo)` para impedir dupla liberação acidental.

### `audit_events`
`id UUID PK`, `actor_user_id FK NULL`, `action`, `entity_type`, `entity_id`, `before_data JSONB`, `after_data JSONB`, `ip_address`, `user_agent`, `occurred_at`. Sem UPDATE/DELETE pela aplicação.

### `integration_events`
`id UUID PK`, `event_type`, `aggregate_type`, `aggregate_id`, `target CRM|OVG`, `payload JSONB`, `idempotency_key UNIQUE`, `status`, `attempts`, `next_attempt_at`, `last_error`, timestamps. Criada na mesma transação do facto de negócio (outbox pattern).

## 4. Cardinalidades
- Cliente 1:N inscrições; apenas 0..1 inscrição ativa.
- Inscrição 1:N versões de plano e 1:N períodos financeiros.
- Plano 1:N versões de inscrição.
- Cliente 1:N pagamentos, presenças, congelamentos, releases e auditorias.
- Pagamento 1:N alocações; período 1:N alocações.
- Aula 1:N presenças.
- Período 0..N releases, com uma liberação efetiva por período.

## 5. Estados

### Cliente
`ACTIVE`, `INACTIVE`, `DEACTIVATED`, `CLOSED`.

### Inscrição
`ACTIVE -> FROZEN -> ACTIVE`, `ACTIVE -> DEACTIVATED`, `FROZEN -> DEACTIVATED`, `DEACTIVATED -> CLOSED`. Reativação e reabertura são operações administrativas explícitas.

### Período financeiro
`PAID`, `PENDING`, `OVERDUE`, `FROZEN`, `RELEASED`. `PAID` quando aberto = 0; `PENDING` quando o cliente tem exatamente um período aberto; `OVERDUE` quando tem dois ou mais períodos abertos. `FROZEN` representa congelamento formal, não ausência. `RELEASED` preserva os valores originais.

### Pagamento
`PENDING`, `CONFIRMED`, `VOIDED`, `REFUNDED`.

## 6. Regras de cálculo
- Dias operacionais: segunda a sábado (`1..6` ISO); domingo nunca conta.
- O primeiro período parcial usa a data de início até ao fim do mês civil.
- Meses posteriores usam primeiro ao último dia real do mês.
- Fevereiro, anos bissextos e transição de ano são calculados pelo calendário da biblioteca temporal, nunca por 31 dias fixos.
- Aulas de período: plano livre trânsito não tem limite; plano limitado usa a quantidade configurada, proporcionalizada no primeiro período por dias operacionais restantes sobre dias operacionais do mês, com arredondamento definido por configuração.
- A duração contratada em meses gera períodos mensais consecutivos sem apagar períodos já existentes.
- Pagamento parcial é alocado cronologicamente aos períodos mais antigos em aberto, salvo instrução explícita autorizada.
- Ausência sem congelamento não altera a validade financeira. A regra do menor plano vigente é exposta como parâmetro `absence.minimum_plan_id` e necessita decisão sobre se gera alteração de plano ou apenas base de cálculo.

## 7. Integridade financeira
Criação de inscrição/períodos, pagamentos, alocações, congelamentos, descongelamentos e releases executam uma única transação ACID. Operações de pagamento bloqueiam os períodos afetados e recalculam estados em isolamento `SERIALIZABLE` ou com locks equivalentes. Outbox e auditoria são gravadas na mesma transação.

## 8. DECISÕES NECESSÁRIAS
1. Stack fiscal/faturação: se `invoices` é recibo interno ou documento fiscal integrado à autoridade tributária.
2. Imposto/IVA: taxa, inclusão no preço e arredondamento.
3. Proporcionalização de aulas: fração, `floor`, `ceil` ou mínimo de uma aula.
4. Pagamentos sem referência a períodos: aplicar cronologicamente ou exigir seleção explícita.
5. Reembolsos: permissões, impacto em estados e janela temporal.
6. Data/hora e fuso oficial da SamoraFit.
7. Reativação após desativação/encerramento.
8. Regra exata de “menor plano vigente” para ausência e se altera o plano contratado.
9. Género permitido e campos adicionais do perfil completo do cliente.
10. Credenciais e contratos concretos de CRM/OVG, limites e eventos aceites.
11. Identidade do utilizador inicial e política de bootstrap de administrador.
12. Retenção/anonimização de dados pessoais e auditoria.
13. Capacidade de aulas e regra de sobrelotação.

## 9. Cobertura inicial
Todos os conceitos funcionais têm entidade, regra ou integração correspondente. As decisões acima permanecem explícitas e configuráveis; nenhuma delas deve ser silenciosamente assumida como regra fiscal ou contratual.
