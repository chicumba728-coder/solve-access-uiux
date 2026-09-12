# Ponte Neon origem → SOLVE ACESS

## Segurança e direção dos dados

`SOURCE_DATABASE_URL` é uma ligação externa somente leitura. A ponte:

- usa um pool PostgreSQL separado;
- força `default_transaction_read_only=on` na sessão;
- executa apenas `SELECT` nas tabelas allowlistadas;
- nunca recebe credenciais da BD local para usar na origem;
- nunca executa `INSERT`, `UPDATE`, `DELETE`, DDL ou migration na Neon;
- escreve exclusivamente na PostgreSQL local através do Prisma;
- não apaga registos locais quando um registo desaparece na origem.

Para produção, o utilizador da Neon deve ser um utilizador dedicado com privilégio `CONNECT`/`USAGE`/`SELECT`, sem `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER` ou `DROP`. A URL fornecida anteriormente contém uma credencial; ela deve ser rodada no Neon antes de produção e armazenada apenas em secret manager/.env protegido.

## Mapeamento efetivo

| Origem Neon | Destino local | Campos |
|---|---|---|
| `customers.id` | `source_sync_records.source_id` | identidade estável da origem |
| `customers.code` | `clients.client_number` como `SRC-{id}` | preserva o código sem colisão |
| `customers.name` | `clients.full_name` | campo de cadastro |
| `customers.email` | `clients.email` | campo de cadastro |
| `customers.phone` | `clients.phone` | campo de cadastro |
| `customers.nif` | `clients.tax_id` | NIF angolano |
| `customers.birth_date` | `clients.birth_date` | data de nascimento |
| `customers.gender` | `clients.gender` | género |
| `customers.state` | `clients.status` | `activo/inativo/encerrado` normalizado |
| `customers.ovg_id` | `clients.ovg_customer_number` | referência OVG |
| `plans.id` | `source_sync_records.source_id` | identidade estável |
| `plans.name` | `plans.name` | nome configurável |
| `plans.price` | `plans.price` | valor monetário assumido em AOA |
| `plans.duration` | `plans.validity_months` | duração em meses |
| `plans.active` | `plans.is_active` | disponibilidade |
| `subscriptions.customer_id` | `subscriptions.client_id` | relação cliente |
| `subscriptions.plan_id` | `subscription_plan_versions.plan_id` | relação plano via vínculo sincronizado |
| `subscriptions.start_date/end_date` | inscrição equivalente | vigência |
| `subscriptions.active` | `subscriptions.status` | estado operacional |
| `payments.customer_id` | `payments.client_id` | relação cliente |
| `payments.amount` | `payments.amount` | valor em AOA |
| `payments.method` | `payments.method` | inclui Multicaixa/mobile money |
| `payments.status` | `payments.status` | pendente/confirmado/anulado/reembolsado |
| `payments.reference_code` | `payments.reference` | referência do pagamento |
| `payments.paid_at` | `payments.paid_at` | data efetiva |

## Tabelas legadas importadas

| Origem | Destino | Resultado verificado |
|---|---|---:|
| `clientes` | `clients` | 294 linhas, reconciliadas sem duplicação por OVG/email/NIF/cartão |
| `terminais` | `access_terminals` | 3 terminais |
| `acessos` | `access_events` | 2.202 eventos |
| `solve_access_logs` | `access_events` | 1.681 eventos |
| `relatorios` | `audit_events` | 1.276 relatórios com cliente reconciliado |
| `fila_sincronizacao_ovg` | `integration_events` | 1.867 itens |
| `ovg_members` | `clients` | 279 membros reconciliados por número OVG |

Na verificação de 11/09/2026, a BD local ficou com 311 clientes únicos, 3.883 eventos de acesso, 1.284 auditorias e 1.874 eventos de integração. As linhas de `relatorios` sem cliente reconciliável não foram inventadas nem associadas a uma pessoa errada; permanecem identificáveis pela origem e devem ser tratadas numa tabela de relatórios legados dedicada se a consulta desses casos for necessária.

## Preservação de alterações locais

O sincronizador atualiza apenas campos de propriedade da origem: cadastro básico, estado de origem, referência OVG, planos e factos financeiros importados. Não altera `access_count`, `access_debt`, `access_blocked`, `online`, PIN, presenças, congelamentos, liberações, auditoria ou regras locais de acesso. A aplicação local nunca faz escrita de retorno para a Neon.

`SOURCE_SYNC_ACTOR_USER_ID` é opcional. Quando definido, identifica o utilizador local responsável pela importação; quando ausente, os pagamentos ficam com `recorded_by = NULL` e são identificados como importados pela origem através de `source_sync_records`, sem exigir permissões ou utilizador local fictício.

## Realtime

A ponte usa polling configurável por `SOURCE_SYNC_INTERVAL_SECONDS`, por defeito 30 segundos. Cada ciclo lê todas as linhas allowlistadas e usa hashes para não reescrever registos inalterados. O worker automático não depende de permissões/roles da aplicação; a rota manual também não exige `ADMIN/MANAGER`, embora continue protegida pelo JWT HTTP. O Neon não deve ser tratado como se oferecesse CDC/listen público sem configuração adicional. Se for necessário tempo real inferior a esse intervalo, a opção correta é logical replication/CDC aprovado no Neon ou webhook/outbox na origem, nunca escrita reversa feita pelo SOLVE ACESS.