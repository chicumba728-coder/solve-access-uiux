# SOLVE ACESS — Backend Fase 2

Backend REST em Node.js/Express.js com PostgreSQL/Prisma, separado em domínio, aplicação, infraestrutura e apresentação.

## Arranque

1. Copiar `.env.example` para `.env` e configurar `DATABASE_URL` e `JWT_SECRET` com pelo menos 32 caracteres.
2. Executar `npm install`.
3. Executar `npm run prisma:generate`.
4. Aplicar `npm run prisma:migrate` contra PostgreSQL.
5. Definir `PLAN_2_PRICE`, `PLAN_3_PRICE`, `PLAN_5_PRICE` e `PLAN_UNLIMITED_PRICE` antes de `npm run prisma:seed`.
6. Executar `npm run build` e `npm test`.

Para ativar a ponte unidirecional, definir `SOURCE_DATABASE_URL` com um utilizador Neon dedicado somente leitura e, para importar pagamentos, `SOURCE_SYNC_ACTOR_USER_ID` com um UUID de utilizador local. A sincronização automática corre no intervalo configurado; também pode ser forçada por `POST /api/v1/source-sync/run`. Nunca guardar a URL/credencial da origem no repositório.

O seed não cria utilizadores, clientes, pagamentos ou dados de teste. Preços, administrador inicial e decisões fiscais são configuração/aprovação operacional, não valores inventados no código.

## Estrutura

- `src/domain`: regras puras de calendário e estados financeiros.
- `src/application`: casos de uso transacionais, auditoria e outbox.
- `src/infrastructure`: Prisma, configuração e worker de integrações.
- `src/presentation`: API REST versionada e tratamento global de erros.
- `prisma`: schema, migration inicial e seed de sistema.
- `docs`: análise, ERD, workflows, API, decisões e cobertura.