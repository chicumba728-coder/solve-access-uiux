# 16 — Testes

Implementados:

- calendário de fevereiro com 28 e 29 dias, meses de 30/31 dias;
- início no meio do mês;
- 3 meses atravessando ano;
- 12 meses;
- Livre Trânsito;
- domingo fora do calendário operacional;
- última presença e ausência sem presença.

Pendentes de execução contra PostgreSQL real: transações de inscrição/pagamento, locks concorrentes, congelamento/descongelamento, releases, auditoria, outbox e endpoints autenticados. Esses testes exigem uma instância PostgreSQL e credenciais fornecidas pelo ambiente.