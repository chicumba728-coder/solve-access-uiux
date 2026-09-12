# 10 — API

Base URL: `/api/v1`.

| Método | Endpoint | Autenticação | Responsabilidade |
|---|---|---|---|
| POST | `/auth/login` | Não | Emitir JWT |
| GET | `/clients` | JWT | Pesquisa, estado, plano, paginação |
| POST | `/subscriptions` | JWT | Criar inscrição, snapshot de plano e períodos |
| POST | `/payments` | JWT | Registar pagamento idempotente e alocar períodos |
| POST | `/clients/:id/deactivate` | JWT | Desativar sem apagar histórico |
| GET | `/dashboard` | JWT | Agregados financeiros e operacionais |
| GET/POST | `/units` | JWT | Gerir unidades/ginásios em Angola |
| GET/POST | `/terminals` | JWT | Gerir terminais ZKTeco de entrada/saída |
| GET/POST | `/access-events` | JWT | Consultar/registar eventos ADMS/SDK/API |
| GET | `/clients/:id/last-attendance` | JWT | Última presença do cliente |
| POST | `/clients/:id/access-renewal` | JWT | Renovar ciclo e transportar saldo devedor |
| POST | `/freezes` | JWT | Congelar inscrição formalmente |
| POST | `/freezes/:id/unfreeze` | JWT | Descongelar inscrição |
| POST | `/releases` | JWT | Liberar período excepcional sem apagar histórico |

As responsabilidades previstas para planos, períodos, faturas, aulas, presenças, congelamentos, releases, auditoria, relatórios e integrações permanecem separadas no domínio e no schema Prisma; endpoints adicionais devem ser expostos apenas após as decisões funcionais listadas em `18-decisoes-necessarias.md` e com permissões específicas.

Todos os inputs são validados com Zod. Erros de domínio têm código e status estáveis; erros desconhecidos não expõem stack trace. JWT, Helmet, CORS configurável e rate limit estão ativos.