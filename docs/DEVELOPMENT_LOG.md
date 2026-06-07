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
