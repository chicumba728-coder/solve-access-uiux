# 06 — Dicionário de dados

| Tabela | Campos principais | Relações e regras |
|---|---|---|
| `users` | id, email, password_hash, full_name, is_active | Autoriza operações; email único |
| `roles` / `permissions` | id, name | RBAC N:N por `user_roles` e `role_permissions` |
| `clients` | id, client_number, full_name, tax_id, status, datas | Cadastro preservado; NIF único quando presente |
| `plans` | id, name, price, lessons_per_period, validity_months, usage_rules | Configurável; snapshots não mudam com preço futuro |
| `subscriptions` | id, client_id, status, started_on, ended_on | Cliente pode ter várias históricas, uma ativa |
| `subscription_plan_versions` | id, subscription_id, plan_id, price, vigências | Reconstrói plano/preço de qualquer mês |
| `billing_periods` | id, client_id, datas, ano/mês, valores, estado | Facto financeiro mensal; não é apagado |
| `payments` | id, client_id, amount, paid_at, method, status | Facto independente e idempotente |
| `payment_allocations` | payment_id, billing_period_id, amount | Muitos-para-muitos entre pagamentos e períodos |
| `invoices` | invoice_number, client_id, payment_id, totais, status | Estrutura pronta; regime fiscal é decisão necessária |
| `classes` / `attendances` | aula, data, cliente, estado, origem | Última presença por índice cliente/data |
| `freezes` | cliente, inscrição, início/fim, motivo, estado | Histórico de congelamento; descongelar encerra |
| `period_releases` | período, valores original/liberado, motivo, autor | Nunca elimina o valor original |
| `audit_events` | actor, ação, entidade, before/after, IP/device | Append-only lógico, sem FK para entity genérico |
| `integration_events` | evento, target, payload, idempotency, retries | Outbox transacional CRM/OVG |
| `global_parameters` | key, value, description | Configuração operacional; ausência marcada como decisão |

Tipos completos, PKs/FKs, defaults, índices e constraints encontram-se em `prisma/schema.prisma` e na migration.