# Roadmap - Finance App

## Phase 1 - Foundation
- Objective: Establish the project base, architecture standards, and development workflow.
- Main deliverables:
	- Nuxt + Vue + TypeScript project scaffold
	- Tailwind CSS setup and base design tokens
	- Initial folder structure aligned with project rules
	- Supabase project connection setup (environment-level)
	- Git flow initialized (main/dev/feature)
- Status: pending

## Phase 2 - Authentication
- Objective: Enable secure user access and per-user data isolation foundation.
- Main deliverables:
	- Sign up, sign in, and sign out flows
	- Auth session handling in app shell
	- Protected routes/middleware for authenticated areas
	- User profile bootstrap (profiles table usage)
- Status: pending

## Phase 3 - Core Data
- Objective: Implement core master data entities required by transactions.
- Main deliverables:
	- People CRUD
	- Cards CRUD
	- Categories CRUD
	- Basic validation rules for each entity
	- List, create, edit, and deactivate flows
- Status: pending

## Phase 4 - Transactions MVP
- Objective: Deliver manual transaction registration and monthly tracking baseline.
- Main deliverables:
	- Transaction create/edit/delete (manual entries)
	- Income vs expense typing
	- Expected value required and real value optional
	- Checked/reconciled boolean control
	- Monthly transaction list
	- Filters by month, year, person, and card
	- Monthly balance and accumulated balance (calculated)
- Status: pending

## Phase 5 - Recurrence and Installments
- Objective: Add repeatable transaction logic for recurring and installment scenarios.
- Main deliverables:
	- Recurrence rule management
	- Installment flow with fixed number of payments
	- Clear type distinction: recurring vs installment
	- Automatic transaction instance generation (MVP horizon)
	- Edit scopes for recurring items (single, future, full series)
- Status: pending

## Phase 6 - Dashboard and Reports
- Objective: Provide visibility into financial health through summaries and analytics.
- Main deliverables:
	- Dashboard with key KPIs (income, expenses, net balance)
	- Category and person breakdown views
	- Monthly trend visualization
	- Initial report views for transaction analysis
- Status: pending

## Phase 7 - Reconciliation
- Objective: Improve financial accuracy through review and confirmation workflows.
- Main deliverables:
	- Checked/reconciled workflow refinements
	- Card-oriented reconciliation support
	- Review queues for pending confirmations
	- Difference view between expected and real values
- Status: pending

## Phase 8 - Future Projection
- Objective: Project cash flow using future and recurring commitments.
- Main deliverables:
	- Future balance projection engine
	- Projection view using recurring and installment instances
	- 12-month forward planning support for MVP
	- Scenario validation for upcoming months
- Status: pending

## Phase 9 - Polish and Deploy
- Objective: Finalize quality, UX consistency, and production release pipeline.
- Main deliverables:
	- UX polish and responsive adjustments
	- Error handling and edge-case hardening
	- Performance review and query optimization
	- Final documentation updates
	- Vercel deployment and post-deploy checks
- Status: pending
