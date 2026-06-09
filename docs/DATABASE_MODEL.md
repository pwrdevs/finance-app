# Database Model - Finance App

## Overview
This document defines the initial logical data model for Supabase (PostgreSQL) in the Finance App.

Scope in this version:
- Main entities and responsibilities
- Core fields for MVP and near-term evolution
- Relationships between tables
- Important constraints and implementation notes

Out of scope in this version:
- SQL migrations
- Final SQL types, indexes and triggers

## Global Conventions (Supabase Rules)
- Main tables include: id, user_id, created_at, updated_at
- user_id references auth.users(id) for user-based data isolation
- All business tables use Row Level Security policies by user_id
- For MVP, RLS policies must enforce user_id = auth.uid()
- For MVP, use standard foreign keys; composite foreign keys or validation triggers can be evaluated later
- Monetary values use decimal/numeric type (avoid float)
- Timestamps use timestamptz
- Soft delete is optional and can be added later if needed
- For constrained categorical fields in MVP, use text columns with CHECK constraints (prefer this over PostgreSQL enums for easier evolution)

## Table: profiles
### Objective
Store user profile metadata linked to Supabase Auth users.

### Main fields
- id: uuid (primary key)
- user_id: uuid (unique, references auth.users.id)
- full_name: text
- avatar_url: text (optional)
- default_currency: text (optional, e.g., BRL)
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- 1:1 with auth.users through user_id
- 1:N logical ownership over people, cards, categories, transactions, recurrence_rules and transaction_instances by shared user_id

### Important notes
- Even with user_id, keep id as table primary key to follow standard structure.
- Profile is not required for transaction operations, but useful for personalization and defaults.

## Table: people
### Objective
Register people responsible for or associated with transactions.

### Main fields
- id: uuid (primary key)
- user_id: uuid (references auth.users.id)
- name: text
- is_active: boolean (default true)
- notes: text (optional)
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- N:1 with auth.users by user_id
- 1:N with transactions (transactions.person_id -> people.id)

### Important notes
- person_id is optional in transactions, as defined by project finance rules.
- Recommended unique constraint by user_id + normalized name to reduce duplicates.

## Table: cards
### Objective
Store credit card accounts used in expense transactions and reconciliation.

### Main fields
- id: uuid (primary key)
- user_id: uuid (references auth.users.id)
- name: text
- person_id: uuid (references people.id)
- brand: text (optional)
- closing_day: smallint (optional, 1-31)
- due_day: smallint (optional, 1-31)
- credit_limit: numeric(14,2) (optional)
- is_active: boolean (default true)
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- N:1 with auth.users by user_id
- N:1 with people by person_id
- 1:N with transactions (transactions.card_id -> cards.id)

### Important notes
- card_id is optional in transactions (some expenses/income do not use cards).
- person_id identifies the card owner/responsible person and supports filtering card expenses by owner.
- closing_day and due_day support billing-cycle and projection features.
- In MVP, current and future card statement partials should be calculated dynamically from transactions and transaction_instances linked by card_id.
- A dedicated card_statements table is out of scope for MVP and can be evaluated later if statement snapshots/freezing become necessary.

## Table: categories
### Objective
Classify transactions for filtering, reporting and analysis.

### Main fields
- id: uuid (primary key)
- user_id: uuid (references auth.users.id)
- name: text
- type: text (income or expense)
- color: text (optional)
- icon: text (optional)
- is_active: boolean (default true)
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- N:1 with auth.users by user_id
- 1:N with transactions (transactions.category_id -> categories.id)

### Important notes
- category_id is optional in transactions, but recommended for reporting quality.
- type should align with transaction type to prevent inconsistent classification.

## Table: accounts
### Objective
Store user financial containers for balance tracking across bank accounts, wallets, cash and investments.

### Main fields
- id: uuid (primary key)
- user_id: uuid (references auth.users.id)
- name: text
- type: text (checking, savings, wallet, investment, other)
- initial_balance: numeric(14,2)
- is_active: boolean (default true)
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- N:1 with auth.users by user_id
- Future N:1 optional from transactions (transactions.account_id -> accounts.id)

### Important notes
- initial_balance is required for accumulated balance calculations from the account starting point.
- is_active supports account archival/hiding without deleting transaction history.
- type should be constrained to: checking, savings, wallet, investment, other.

## Table: transactions
### Objective
Store source financial records (manual, recurring seed, installment seed, or standalone items).

### Main fields
- id: uuid (primary key)
- user_id: uuid (references auth.users.id)
- type: text (income or expense)
- origin_type: text (single, recurring, installment)
- title: text
- description: text (optional)
- expected_value: numeric(14,2)
- real_value: numeric(14,2) (optional)
- due_date: date
- paid_at: date (optional)
- is_checked: boolean (default false)
- person_id: uuid (optional, references people.id)
- card_id: uuid (optional, references cards.id)
- category_id: uuid (optional, references categories.id)
- recurrence_rule_id: uuid (optional, references recurrence_rules.id)
- installment_group_id: uuid (optional, logical grouping key)
- installment_number: integer (optional)
- installment_total: integer (optional)
- reimbursement_group_id: uuid (optional, groups original expense and linked reimbursement income)
- reimbursement_role: text (optional, original or reimbursement)
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- N:1 with auth.users by user_id
- N:1 optional with people, cards, categories
- N:1 optional with recurrence_rules
- 1:N potential expansion to transaction_instances if instances are generated from source transaction

### Important notes
- expected_value is mandatory and real_value is optional, per finance rules.
- is_checked is mandatory from business perspective (default false).
- A check constraint should guarantee type in (income, expense).
- Installments can be represented by shared installment_group_id plus number/total.
- For financial calculations in MVP (balances, reports, card invoices, projections), transactions act as parent/template/origin records while transaction_instances are the primary financial source.
- Financial queries must avoid double counting by not summing transactions and transaction_instances together for the same business event.
- Installment constraints must enforce: installment_number >= 1, installment_total >= 1, and installment_number <= installment_total.
- Installment fields should be all null together or all filled together: installment_group_id, installment_number, installment_total.
- Reimbursement linkage uses structural fields (not description parsing): reimbursement_group_id + reimbursement_role.
- reimbursement_role should be constrained to original or reimbursement.
- reimbursement_group_id and reimbursement_role should be both null (normal transaction) or both filled (linked transaction).

## Table: recurrence_rules
### Objective
Store recurrence definitions used to generate or manage recurring transactions.

### Main fields
- id: uuid (primary key)
- user_id: uuid (references auth.users.id)
- frequency: text (daily, weekly, monthly, yearly)
- interval_count: integer (default 1)
- start_date: date
- end_date: date (optional)
- occurrences_limit: integer (optional)
- edit_scope_default: text (single, future, series)
- is_active: boolean (default true)
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- N:1 with auth.users by user_id
- 1:N with transactions (transactions.recurrence_rule_id)
- 1:N with transaction_instances

### Important notes
- Supports edit scenarios required by project rules: only this, this and future, full series.
- end_date and occurrences_limit are mutually optional; one may be null for open-ended series.

## Table: transaction_instances
### Objective
Represent concrete occurrences generated from recurring rules and/or future planning records.

### Main fields
- id: uuid (primary key)
- user_id: uuid (references auth.users.id)
- recurrence_rule_id: uuid (optional, references recurrence_rules.id)
- source_transaction_id: uuid (optional, references transactions.id)
- instance_date: date
- expected_value: numeric(14,2)
- real_value: numeric(14,2) (optional)
- is_checked: boolean (default false)
- status: text (pending, paid, skipped, canceled)
- person_id: uuid (optional, references people.id)
- card_id: uuid (optional, references cards.id)
- category_id: uuid (optional, references categories.id)
- reimbursement_group_id: uuid (optional, links monthly concrete entries between expense and reimbursement)
- reimbursement_role: text (optional, original or reimbursement)
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- N:1 with auth.users by user_id
- N:1 optional with recurrence_rules
- N:1 optional with transactions as source template/reference
- N:1 optional with people, cards, categories

### Important notes
- This table enables future cash projection and precise month-by-month planning.
- This is the primary financial source table for balances, reports, card invoices and future projections in MVP.
- Optional override fields (value, person, card, category) allow per-instance edits without breaking the full series.
- A uniqueness rule on recurrence_rule_id + instance_date is recommended when applicable.
- Reimbursement linkage should be persisted in instances to simplify dashboard/table filtering and monthly pair tracking.

## Future Feature: attachments
### Objective
Allow users to attach supporting files (receipts, invoices, screenshots, PDFs) to transactions.

### Future fields (suggested)
- id: uuid (primary key)
- user_id: uuid (references auth.users.id)
- transaction_id: uuid (references transactions.id)
- file_name: text
- file_url: text
- file_type: text
- file_size: bigint
- created_at: timestamptz
- updated_at: timestamptz

### Relationships
- N:1 with auth.users by user_id
- N:1 with transactions by transaction_id

### Important notes
- This is a future feature and is not part of the initial MVP implementation.
- No migration or physical table should be created now.
- Storage can be handled with Supabase Storage when the feature moves into implementation scope.

## Relationship Summary
- auth.users 1:1 profiles (through user_id unique)
- auth.users 1:N people
- auth.users 1:N cards
- auth.users 1:N categories
- auth.users 1:N accounts
- auth.users 1:N transactions
- auth.users 1:N recurrence_rules
- auth.users 1:N transaction_instances
- people 1:N transactions
- people 1:N cards
- cards 1:N transactions
- categories 1:N transactions
- recurrence_rules 1:N transactions
- recurrence_rules 1:N transaction_instances
- transactions 1:N transaction_instances (optional linkage)
- accounts 1:N transactions (future optional linkage)
- transactions 1:N attachments (future optional linkage)

## Open Decisions (To Validate Before Migrations)
### Resolved/Validated (kept for history)
- Keep both transactions and transaction_instances, or converge to a single ledger table with flags.
	- Status: resolved/validated
	- Decision: keep both tables and use transaction_instances for recurrence/installment generated occurrences and projection (see Validated Decisions, item 6).

### Still Open
- Decide if transfer/internal movement needs a dedicated type beyond income/expense.
- Define indexing priorities for dashboard and monthly report queries.
- Evaluate whether card statement snapshots require a dedicated card_statements table after MVP dynamic-calculation usage.

## Validated Decisions

### 1. Cards
- Card should store only essential information:
	- name
	- owner/person
	- closing_day
	- due_day

Implementation impact (documentation level):
- Card model should prioritize minimal card metadata.
- Additional optional card fields should be treated as non-essential and reviewed before migration.

### 2. Installments vs recurring
- Installments and recurring transactions should use similar logic, but must be distinguishable by type.
- Installments are usually linked to a card and have a fixed number of payments.
- Recurring transactions are usually bills or income that repeat monthly and may have no end date.

Implementation impact (documentation level):
- Keep a clear transaction classification for installment vs recurring behavior.
- Preserve fixed installment count for installment flows and open-ended recurrence support for recurring flows.

### 3. Real value
- real_value can be empty initially.
- When a transaction is created, expected_value is mandatory.
- real_value may default visually to expected_value in the UI, but in the database it can remain null until confirmed.
- checked/reconciled indicates whether the transaction was reviewed.

Implementation impact (documentation level):
- Maintain real_value as nullable in transactions and transaction_instances.
- Keep expected_value as mandatory.
- Keep checked/reconciled status as explicit review state.

### 4. Accumulated balance
- Accumulated balance should be calculated dynamically, not stored permanently.
- This allows recalculation when values, dates, cards, people or recurrence rules change.

Implementation impact (documentation level):
- Do not create a persisted accumulated balance field in core transaction tables.
- Balance should be derived by queries/services over current data.

### 5. People
- People can represent the app owner, spouse, third parties, companies or any responsible entity.

Implementation impact (documentation level):
- People model must remain generic and not limited to family-only semantics.

### 6. Recurrence instances
- Recurring and installment transactions should generate transaction instances automatically.
- For MVP, generate future instances up to 12 months ahead.
- This supports future balance projection without creating infinite records.

Implementation impact (documentation level):
- Keep transaction_instances as the projection/occurrence table.
- Apply a 12-month generation horizon for MVP planning.

### 7. Multi-tenant safety and foreign keys
- For MVP, every main table must include user_id.
- RLS policies must enforce user_id = auth.uid().
- Use normal foreign keys initially.
- Composite foreign keys or validation triggers can be evaluated later if needed.

Implementation impact (documentation level):
- Keep user_id mandatory in all business tables.
- Apply RLS consistently per table before enabling client-side operations.

### 8. Enum strategy
- For MVP, use text columns with CHECK constraints instead of PostgreSQL enum types.

Implementation impact (documentation level):
- Apply CHECK constraints on constrained text fields (for example: transaction type/origin, category type, recurrence frequency, instance status, account type).

## Note
This section records validated business decisions and complements the model without creating migrations.
