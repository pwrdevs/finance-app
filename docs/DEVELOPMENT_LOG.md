# Development Log - Finance App

## Project creation date
- 2026-05-27

## Initial project scope
- Build a personal/family finance control app to replace the current spreadsheet workflow.
- Cover core modules: authentication, people, cards, categories, transactions, recurrence/installments, reconciliation, reports and future projection.

## Current stack decision
- Nuxt
- Vue
- TypeScript
- Supabase
- PostgreSQL
- Tailwind CSS
- GitHub
- Vercel

## Folder structure decision
- app/
	- components/
	- composables/
	- layouts/
	- pages/
	- types/
	- utils/
- server/
	- api/
- supabase/
	- migrations/
	- seed/
- docs/
	- PROJECT_RULES.md
	- DATABASE_MODEL.md
	- ROADMAP.md
	- DEVELOPMENT_LOG.md

## Documentation created
- PROJECT_RULES.md
- DATABASE_MODEL.md
- ROADMAP.md
- DEVELOPMENT_LOG.md

## Current roadmap phase
- Phase 1 - Foundation
- Status: in progress

## Next planned step
- Configure Supabase environment variables and start Phase 2 (Authentication) planning without implementation yet.

## Change History
- 2026-05-27: Created .env.example with minimal Nuxt/Supabase public variables (NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_KEY).
- 2026-05-27: Nuxt 4 project scaffold initialized with TypeScript in project root.
- 2026-05-27: Official Nuxt modules installed and configured: @nuxtjs/tailwindcss, @nuxt/eslint, @nuxtjs/supabase.
- 2026-05-27: Project directories created: app/components, app/composables, app/layouts, app/pages, app/types, app/utils, server/api, supabase/migrations.
- 2026-05-27: Base application shell created using Nuxt layout/page pattern.
- 2026-05-27: Minimal default layout added in app/layouts/default.vue.
- 2026-05-27: Homepage created in app/pages/index.vue showing app name and current environment.
- 2026-05-27: Supabase database type placeholder added in app/types/database.types.ts.
- 2026-05-27: Production build validated successfully (warnings only for missing Supabase URL/KEY environment variables).
- 2026-05-27: No authentication implementation created.
- 2026-05-27: No migrations created (only supabase/migrations structure).
- 2026-06-02: Root .env configured for Supabase public URL/key, preserving .env.example as the template source.
- 2026-06-02: Verified .gitignore already covers .env and kept Supabase setup limited to environment configuration only.
- 2026-06-02: Planned validation includes Nuxt project configuration check and a simple Supabase connectivity test without creating tables, migrations, or authentication flows.
- 2026-06-02: Design System foundation started with PWRDEVS visual direction (military/sage/olive palette), reusable theme tokens and global styles.
- 2026-06-02: Application shell implemented with reusable header and responsive sidebar in the default layout.
- 2026-06-02: Base UI components created: AppButton, AppInput, AppCard, AppModal and AppTable.
- 2026-06-02: Initial dashboard page composed using base components as the starting visual foundation for Phase 1.
- 2026-06-02: Database model updated with initial accounts table (checking, savings, wallet, investment, other), including initial_balance and is_active for future accumulated balance and account lifecycle control.
- 2026-06-02: Documented future optional relationship transactions.account_id -> accounts.id without creating migrations or physical tables.
- 2026-06-02: Added future-feature modeling for attachments linked to transactions (receipts/invoices/screenshots/PDFs), documented only without migrations or table creation.
- 2026-06-02: Card statement tracking defined for MVP as dynamic calculation from transactions/transaction_instances by card_id; potential future card_statements table kept as post-MVP evaluation.
- 2026-06-02: Final pre-migration rule defined: transaction_instances is the primary financial source (balances, reports, card invoices, projections), while transactions remain parent/template records to avoid double counting.
- 2026-06-02: Cards model finalized with person_id reference to people for owner/responsible tracking and owner-based card expense filtering.
- 2026-06-02: Multi-tenant MVP strategy finalized with mandatory user_id in business tables, RLS policy user_id = auth.uid(), and standard foreign keys first (composite FKs/triggers deferred for later evaluation).
- 2026-06-02: Enum strategy finalized for MVP: text columns plus CHECK constraints instead of PostgreSQL enums.
- 2026-06-02: Installment integrity rules documented (minimum values, number <= total, and all-null/all-filled installment fields).
- 2026-06-02: Future attachments feature aligned to global timestamp convention by including both created_at and updated_at.
- 2026-06-02: Migration 001 SQL created for profiles, accounts, people, cards and categories with UUID PKs, timestamps, user_id, standard FKs, basic indexes, RLS and user-scoped policies.
- 2026-06-02: profiles.full_name kept nullable in migration to support first-login onboarding before user profile completion.
- 2026-06-02: cards.person_id uses standard FK to people(id) in MVP; multi-tenant ownership integrity between cards.user_id and people.user_id is protected by RLS (user_id = auth.uid()), with future option to harden via trigger or composite FK.
- 2026-06-02: Migration file generated for review only and not applied/executed against Supabase yet.
- 2026-06-03: Migration 001 applied to the linked Supabase project.
- 2026-06-03: Post-apply validation confirmed profiles, people, accounts, categories and cards exist; RLS is enabled; policies were created; and the planned indexes are present.
- 2026-06-07: Phase 2 authentication foundation implemented with Supabase email/password flows (register, login, logout), reusable composables (`useAuth`, `useProfile`), auth middleware, and new pages (`/login`, `/register`, `/dashboard`).
- 2026-06-07: Route protection baseline implemented through `app/middleware/auth.ts`: unauthenticated access allowed for `/`, `/login`, `/register`, `/setup`, with protected routes redirected to `/login`; authenticated users are redirected from `/login` and `/register` to `/dashboard`.
- 2026-06-07: Profile bootstrap logic added to create `profiles` row on first authenticated session using minimum payload (`user_id`) and existing table defaults (including `created_at`).
- 2026-06-07: `/setup` updated to expose authentication diagnostics (`auth.uid()`, logged email, and session status) plus table-access diagnostics for `people`, `accounts`, `categories`, and `cards`.
- 2026-06-07: Visual validation executed on `/`, `/login`, `/register`, `/dashboard` (middleware redirect confirmed); sign-up flow confirmed with success message and expected login response `Email not confirmed` for unverified account.
- 2026-06-07: Browser-level `/setup` asynchronous status rendering showed intermittent request aborts (`net::ERR_ABORTED`) in the integrated browser environment; connectivity and permission behavior were additionally validated by terminal requests (`/auth/v1/settings` = 200, table reads with anon = 401 permission denied), consistent with current RLS/grant state.
- 2026-06-07: Phase 3 master data CRUD delivered for `people`, `accounts`, `categories`, and `cards` with dedicated pages (`/people`, `/accounts`, `/categories`, `/cards`) using `useMasterData` + `useSupabaseClient()` operations.
- 2026-06-07: CRUD scope implemented with list/create/edit/disable (`is_active = false`) plus basic filters (search, status, and type/person when applicable).
- 2026-06-07: Accounts now enforce allowed types (`checking`, `savings`, `wallet`, `investment`, `other`) and categories enforce (`income`, `expense`) through shared composable constants used by UI forms and filters.
- 2026-06-07: Cards flow now requires selecting an existing `person_id` and validates relationship client-side before save; list view resolves person name and supports person-based filtering.
- 2026-06-07: Sidebar navigation aligned to Phase 3 links: Dashboard, People, Accounts, Categories, Cards, Setup.
- 2026-06-07: Setup page now shows real record counts for `people`, `accounts`, `categories`, and `cards` using Supabase head-count queries.
- 2026-06-07: Dev server validated from `/tmp/finance-app-dev` mirror due OneDrive `ETIMEDOUT` file-read instability in local workspace; routes and middleware behavior confirmed on running app.
- 2026-06-07: Full authenticated CRUD persistence validation is pending confirmed Supabase credentials because sign-up currently requires email confirmation before login.
- 2026-06-07: Migration fix `002_fix_authenticated_grants.sql` created and applied to Supabase to grant `authenticated` access on schema `public` and CRUD privileges on `profiles`, `people`, `accounts`, `categories`, and `cards` (no table/RLS/policy structure changes).
- 2026-06-07: Post-fix database validation confirmed `authenticated` requests now return `200` for `profiles`, `people`, `accounts`, `categories`, and `cards`; `anon` remains blocked with `401 permission denied` across all core tables.
- 2026-06-07: Phase 3 revalidation executed after grant fix: create/edit flows succeeded for people/accounts/categories/cards in app UI and persisted in Supabase; soft-disable behavior was validated by authenticated REST updates (`is_active=false`) with persisted state confirmed by subsequent reads.
- 2026-06-07: Migration `003_transactions_recurrence_instances.sql` applied to the linked Supabase project via `supabase db push`.
- 2026-06-07: Post-apply remote validation confirmed `transactions`, `recurrence_rules`, and `transaction_instances` exist and main indexes were created, including `uq_transaction_instances_user_recurrence_instance_date`.
- 2026-06-07: Validation confirmed `anon` remains blocked on new tables (`401 permission denied` on REST reads) and migration state is synchronized (`003` local = `003` remote).
- 2026-06-07: Remote lint on schema `public` returned no errors after migration 003 (`supabase db lint --linked`).
- 2026-06-07: Phase 4 transactions foundation delivered with new composable `useTransactions` and new authenticated page `/transactions` focused on manual single launches.
- 2026-06-07: Sidebar navigation updated to include `Transactions`; page now lists `transaction_instances` as the primary financial source with month/year and business filters (type, person, card, account, category, status, checked).
- 2026-06-07: Manual create flow implemented as dual write: insert parent row in `transactions` with `origin_type = 'single'` and linked row in `transaction_instances` via `source_transaction_id`.
- 2026-06-07: Actions implemented for manual launches: create, edit instance data (with source transaction sync for single launches), toggle checked, update status, and soft cancel through `status = 'canceled'`.
- 2026-06-07: Authenticated browser validation on `/transactions` passed for required checks: create income, create expense, edit `real_value`, mark checked, cancel status; records remained after reload, confirming persistence in Supabase.
- 2026-06-07: First real financial dashboard delivered with new composable `useFinancialSummary` and `/dashboard` rewrite using `transaction_instances` as primary source.
- 2026-06-07: Dashboard now supports month/year filters and summary cards for total income, total expense, monthly balance, checked total, pending total, canceled total, and number of transactions.
- 2026-06-07: Dashboard now lists latest launches for the selected month with type/status/checked indicators.
- 2026-06-07: Authenticated validation passed on `/dashboard`: totals matched current month launches (`income=6000.00`, `expense=1220.00`, `balance=4780.00`, `checked=6000.00`, `pending=6000.00`, `canceled=1220.00`, `count=4`) and month filter behavior was confirmed (`May=0`, `June=loaded data`).
- 2026-06-07: Installment transaction flow delivered in `useTransactions` and `/transactions` without schema changes: origin type selector (`single`/`installment`), required installment fields (`installment_total`, `installment_start_date`, required `card_id`), installment value split with cent rounding on last installment, and month-by-month `transaction_instances` generation linked to a single parent transaction.
- 2026-06-07: Installment listing column now displays installment progress correctly (`N/total`) by deriving installment number from month offset between parent due date (start date) and instance date.
- 2026-06-07: End-to-end authenticated validation passed for installment flow: created purchase `Notebook Purchase 4x` (total `1000.00`, `4x`) and confirmed `/transactions` month filter shows `1/4` (June), `2/4` (July), `3/4` (August) with `250.00` per instance.
- 2026-06-07: Dashboard monthly summary revalidation passed for installment impact from `transaction_instances`: July and August each show one pending expense instance (`expense=250.00`, `balance=-250.00`, `count=1`) with the expected dated launch in each month.
- 2026-06-07: Recurring monthly flow delivered in `useTransactions` and `/transactions` without schema changes: new `origin_type = recurring`, recurrence rule creation (`frequency=monthly`, optional `end_date`), recurring source transaction creation, and monthly `transaction_instances` generation.
- 2026-06-07: Recurring generation rules implemented for MVP: no end date generates 12 months from `start_date`; end date mode generates until `end_date` capped to 12 instances.
- 2026-06-07: Recurring edit scopes implemented: `single` updates only selected instance; `future` performs series split from selected-or-today date to a new recurrence/source and updates only moved future instances; `series` updates source transaction + recurrence rule and applies changes to future instances only.
- 2026-06-07: Recurring cancel scopes implemented: `single` cancels selected instance only; `future` cancels instances from selected-or-today date onward; `series` disables recurrence rule and cancels future instances only.
- 2026-06-07: `/transactions` migrated to mobile-first behavior with responsive instance cards on small screens, larger action buttons, and table fallback on desktop to avoid horizontal overflow in mobile.
- 2026-06-07: Dev server exposed on local network for mobile testing using `nuxt dev --host 0.0.0.0 --port 3003`; network URL validated as `http://192.168.0.136:3003/`.
- 2026-06-07: Authenticated E2E validation passed for recurring flows: created recurrence without end date (`Recurring Gym Open`) and confirmed 12-month horizon (`2026-06` through `2027-05`, no `2027-06`); created recurrence with end date (`Recurring Streaming Fixed`, `2026-09-10` to `2026-11-10`) and confirmed cutoff in December.
- 2026-06-07: Recurring operations validated in UI: edit only one instance (June changed to `130.00` while July remained `120.00`), edit future scope (July+ changed to `140.00`, June preserved), cancel only one instance (June canceled only), cancel future scope (streaming canceled from October onward while September stayed pending), series scope smoke test (Gym future series updated to `160.00` from October while June historical value remained `130.00`).
- 2026-06-07: Dashboard month-by-month validation passed with recurring data sourced from `transaction_instances`, including expected pending/canceled transitions for June, July, September, and October.
- 2026-06-07: Mobile transactions UI refined with more compact cards, clearer action buttons, and reordered mobile-first filters.
- 2026-06-07: Dashboard gained a card statement summary grouped by `card_id`, scoped to monthly expense transactions and excluding canceled instances.
