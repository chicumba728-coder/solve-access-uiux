# 19 — Matriz de cobertura

| Requisito | Implementação | Tabelas | Endpoints | Testes |
|---|---|---|---|---|
| Clientes e desativação | `client-service` soft state | clients, audit_events | GET clients, POST deactivate | build; integração pendente |
| Planos configuráveis | Prisma + seed parametrizado | plans, global_parameters | GET plans | seed/build |
| Histórico de planos | versões com vigência e snapshot | subscription_plan_versions | POST subscriptions | cálculo unitário |
| Inscrições | criação transacional e estados | subscriptions | POST subscriptions | integração pendente |
| Mensalidades | períodos civis e valores históricos | billing_periods | POST subscriptions | 8 testes unitários |
| Pagamentos | pagamento independente, alocações e idempotência | payments, payment_allocations | POST payments | integração pendente |
| Presenças/ausências | registo e última presença | classes, attendances | POST attendances, last-attendance | calendário unitário |
| Congelamento | ACID, estado e histórico | freezes, subscriptions | POST freezes/unfreeze | integração pendente |
| Liberação excepcional | mantém original e gera release | period_releases, billing_periods | POST releases | integração pendente |
| Auditoria | evento na mesma transação | audit_events | leitura futura por endpoint dedicado | integração pendente |
| Dashboard | agregações no backend | clients, billing_periods, payments | GET dashboard | integração pendente |
| CRM/OVG | outbox, retry, idempotência | integration_events | worker interno | contrato externo pendente |
| Segurança | JWT, Zod, Helmet, CORS, rate limit | users, roles, permissions | auth/login | integração pendente |
| Faturação | tabela e vínculo a pagamento | invoices | endpoint fiscal pendente | decisão fiscal necessária |

## Cobertura ainda bloqueada por decisão/ambiente

Emissão fiscal, IVA, arredondamento proporcional, política de reembolso, fuso oficial, regra contratual do plano mínimo de ausência e contratos concretos CRM/OVG não foram definidos no requisito. A implementação marca-os como `DECISÃO NECESSÁRIA`; não são considerados funcionalmente concluídos.