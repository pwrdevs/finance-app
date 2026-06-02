# Project Rules - Finance App

## Project Path
Main app path:
/Users/diegoalmeida/Library/CloudStorage/OneDrive-Personal/01-Arquivos Pessoais/13-PWRDEV/VSCode/Finance/APP

Rollback path:
/Users/diegoalmeida/Library/CloudStorage/OneDrive-Personal/01-Arquivos Pessoais/13-PWRDEV/VSCode/Finance/ROLLBACK

## App Goal
Create a personal/family finance control app to replace the current spreadsheet system.

The app must allow users to control:
- Income
- Expenses
- Credit cards
- People
- Categories
- Recurring transactions
- Installments
- Expected value vs real value
- Checked/reconciled transactions
- Monthly balance
- Accumulated balance
- Future cash projection

## Main Stack
- Nuxt
- Vue
- TypeScript
- Supabase
- PostgreSQL
- Tailwind CSS
- GitHub
- Vercel

## Development Standard
Follow the same development style used in the Fresh Breeze project:
- Clean architecture
- Organized componentization
- Reusable components
- Clear folder structure
- TypeScript-first approach
- Avoid duplicated logic
- Avoid large files
- Keep pages simple
- Move reusable logic to composables
- Move shared types to the types folder
- Move pure helper functions to utils

## Suggested Structure
app/
	components/
		common/
		layout/
		dashboard/
		transactions/
		cards/
		people/
		categories/
		reports/
	composables/
	layouts/
	pages/
	types/
	utils/

server/
	api/

supabase/
	migrations/
	seed/

docs/
	PROJECT_RULES.md
	DATABASE_MODEL.md
	ROADMAP.md
	DEVELOPMENT_LOG.md

## Component Rules
- Pages should only compose the screen
- Components should handle UI
- Composables should handle reusable logic
- Utils should contain pure functions
- Types should contain TypeScript interfaces and types
- Server API should be used for protected or sensitive logic

## Main Modules
1. Authentication
2. Dashboard
3. People
4. Cards
5. Categories
6. Transactions
7. Recurring transactions
8. Installments
9. Credit card checking/reconciliation
10. Reports
11. Future balance projection

## Finance Rules
- Every transaction must be either income or expense
- Every transaction may have a responsible person
- Every transaction may have a card
- Every transaction may have a category
- Every transaction must have an expected value
- Every transaction may have a real value
- Every transaction must have a checked/reconciled status
- Transactions can be unique, recurring, or installment-based
- Recurring transactions must allow editing:
	- only this transaction
	- this and future transactions
	- the full series
- Accumulated balance must consider previous balance + income - expenses
- Future projection must consider recurring items, installments and already registered future transactions

## Supabase Rules
Use Supabase for:
- Authentication
- PostgreSQL database
- Row Level Security
- Migrations
- User-based data isolation

Every main table must include:
- id
- user_id
- created_at
- updated_at

## Git Rules
Use this branch structure:
- main: stable production version
- dev: active development
- feature/name: individual feature development

Commit pattern:
- feat: new feature
- fix: bug fix
- refactor: code improvement
- docs: documentation
- style: visual/style adjustment
- chore: setup or maintenance

## MVP Priority
1. Project setup
2. Authentication
3. People CRUD
4. Cards CRUD
5. Categories CRUD
6. Manual transaction creation
7. Monthly transaction list
8. Filters by month, year, person and card
9. Expected value vs real value
10. Checked/reconciled checkbox
11. Monthly balance
12. Accumulated balance

## Agent Rules
Before changing code, always:
1. Read this file
2. Understand the current structure
3. Check existing components
4. Reuse existing patterns
5. Avoid duplication
6. Explain what will be changed
7. Change only what is necessary
8. Update DEVELOPMENT_LOG.md after relevant changes
9. Never touch rollback files unless explicitly requested
