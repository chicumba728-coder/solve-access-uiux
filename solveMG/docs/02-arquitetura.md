# 02 — Arquitetura

## Stack aprovada

- Runtime: Node.js.
- Framework HTTP: Express.js 5.
- Base de dados: PostgreSQL.
- Persistência e migrations: Prisma ORM.
- Linguagem: TypeScript.
- Autenticação: JWT.
- Validação: Zod.

## Camadas

`src/domain` contém regras puras de calendário e estados. `src/application` contém casos de uso transacionais, auditoria e outbox. `src/infrastructure` contém Prisma, configuração e worker de integrações. `src/presentation/http` contém Express, middlewares, rotas, autenticação e tratamento global de erros.

O Express não calcula valores financeiros nem aulas: apenas valida/adapta requests e encaminha para os casos de uso. PostgreSQL é a fonte persistente principal; CRM e OVG recebem eventos através de outbox transacional.
