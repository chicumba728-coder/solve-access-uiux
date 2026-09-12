# 07 — Workflow da BD

```mermaid
flowchart TD
  C[Cliente] --> S[Inscrição]
  S --> P[Plano vigente/versionado]
  P --> BP[Períodos financeiros]
  BP --> PAY[Pagamento]
  PAY --> ALLOC[Alocações]
  ALLOC --> INV[Faturação]
  BP --> FS[Estado financeiro]
  FS --> DASH[Dashboard e filtros]
  C --> ATT[Presença]
  ATT --> LAST[Última presença]
  LAST --> ABS[Dias sem presença]
  ABS --> CRM1[Workflow de reativação CRM]
  S --> FR[Congelamento formal]
  FR --> BP
  C --> EVT[Outbox de eventos]
  EVT --> CRM[CRM]
  EVT --> OVG[OVG]
  PAY --> AUD[Auditoria]
  FR --> AUD
  BP --> AUD
```

## Workflow financeiro
1. Validar cliente, plano, datas, duração e idempotência.
2. Criar/atualizar inscrição e versão de plano dentro de transação.
3. Gerar períodos com calendário real e snapshots de preço/aulas.
4. Registar pagamento confirmado, alocar valor e recalcular todos os períodos afetados.
5. Criar auditoria e eventos de integração na mesma transação.
6. Worker publica a outbox com retries e idempotência.

## Workflow de ausência
A última presença é consultada por cliente. O número de dias é calculado no fuso oficial. Sem congelamento formal, a ausência não altera a dívida nem congela períodos; a regra do plano mínimo é aplicada apenas após a decisão funcional sobre o seu significado contratual.
