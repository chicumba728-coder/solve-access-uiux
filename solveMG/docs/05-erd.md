# 05 — ERD completo

```mermaid
erDiagram
  USERS ||--o{ USER_ROLES : has
  ROLES ||--o{ USER_ROLES : grants
  ROLES ||--o{ ROLE_PERMISSIONS : contains
  PERMISSIONS ||--o{ ROLE_PERMISSIONS : grants
  USERS ||--o{ CLIENTS : manages
  CLIENTS ||--o{ SUBSCRIPTIONS : owns
  SUBSCRIPTIONS ||--o{ SUBSCRIPTION_PLAN_VERSIONS : versions
  PLANS ||--o{ SUBSCRIPTION_PLAN_VERSIONS : applied
  SUBSCRIPTIONS ||--o{ BILLING_PERIODS : generates
  CLIENTS ||--o{ BILLING_PERIODS : owes
  BILLING_PERIODS ||--o{ PAYMENT_ALLOCATIONS : receives
  PAYMENTS ||--o{ PAYMENT_ALLOCATIONS : allocates
  CLIENTS ||--o{ PAYMENTS : makes
  PAYMENTS ||--o{ INVOICES : produces
  CLIENTS ||--o{ INVOICES : owns
  CLASSES ||--o{ ATTENDANCES : records
  CLIENTS ||--o{ ATTENDANCES : attends
  CLIENTS ||--o{ FREEZES : has
  SUBSCRIPTIONS ||--o{ FREEZES : freezes
  BILLING_PERIODS ||--o{ PERIOD_RELEASES : may_release
  CLIENTS ||--o{ PERIOD_RELEASES : receives
  USERS ||--o{ AUDIT_EVENTS : causes
  CLIENTS ||--o{ AUDIT_EVENTS : changes
  USERS ||--o{ INTEGRATION_EVENTS : emits

  USERS { UUID id PK string email UNIQUE }
  ROLES { UUID id PK string name UNIQUE }
  PERMISSIONS { UUID id PK string name UNIQUE }
  CLIENTS { UUID id PK string client_number UNIQUE string full_name string tax_id date deactivated_at }
  PLANS { UUID id PK string name UNIQUE decimal price int lessons_per_period boolean is_unlimited boolean is_active }
  SUBSCRIPTIONS { UUID id PK UUID client_id FK enum status date started_on date ended_on }
  SUBSCRIPTION_PLAN_VERSIONS { UUID id PK UUID subscription_id FK UUID plan_id FK decimal price date valid_from date valid_to }
  BILLING_PERIODS { UUID id PK UUID subscription_id FK UUID client_id FK UUID plan_version_id FK date period_start date period_end decimal amount_due decimal amount_paid decimal amount_open enum financial_status }
  PAYMENTS { UUID id PK UUID client_id FK decimal amount date paid_at enum status string reference }
  PAYMENT_ALLOCATIONS { UUID id PK UUID payment_id FK UUID billing_period_id FK decimal amount }
  INVOICES { UUID id PK UUID client_id FK UUID payment_id FK string invoice_number decimal total enum status }
  CLASSES { UUID id PK string name datetime starts_at datetime ends_at }
  ATTENDANCES { UUID id PK UUID client_id FK UUID class_id FK datetime occurred_at enum status }
  FREEZES { UUID id PK UUID client_id FK UUID subscription_id FK date starts_on date ends_on enum status }
  PERIOD_RELEASES { UUID id PK UUID client_id FK UUID billing_period_id FK decimal original_amount decimal released_amount }
  AUDIT_EVENTS { UUID id PK UUID actor_user_id FK string action string entity_type UUID entity_id json before_data json after_data }
  INTEGRATION_EVENTS { UUID id PK string event_type string aggregate_type UUID aggregate_id enum target enum status string idempotency_key UNIQUE }
```
