# Finance App MVP

Aplicação de finanças pessoais/familiares com autenticação Supabase, CRUD de dados mestres, lançamentos (single/installment/recurring), dashboard financeiro e projeção acumulada.

## Stack

- Nuxt 4
- Vue 3
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Vercel

## Requisitos

- Node.js 24.x (recomendado para compatibilidade com Nuxt 4.4.x)
- npm 10+

## Variáveis de ambiente

Crie `.env` local (não versionado) com:

```bash
NUXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NUXT_PUBLIC_APP_ENV=development
```

Para funcionalidades administrativas (`/developer/users` e APIs `/api/admin/*`), também configure:

```bash
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Sem `SUPABASE_SERVICE_ROLE_KEY`, o app principal funciona, mas as rotas/admin APIs retornam erro de configuração.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Execução local

Desenvolvimento:

```bash
npm run dev -- --host 127.0.0.1 --port 3000
```

Build de produção:

```bash
npm run build
```

Preview de produção:

```bash
npm run preview
```

## Deploy na Vercel

### Configuração do projeto

- Importar repositório GitHub na Vercel
- Framework Preset: `Nuxt`
- Root Directory: `.`

### Build e runtime

- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: manter padrão da Vercel para Nuxt (sem override)

### Environment Variables (Production/Preview)

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_KEY`
- `NUXT_PUBLIC_APP_ENV=production`
- `SUPABASE_SERVICE_ROLE_KEY` (obrigatório apenas para recursos administrativos)

### Deploy

Após configurar variáveis:

1. Fazer push em `main`
2. Acionar deploy na Vercel
3. Validar login, dashboard e rotas protegidas no ambiente publicado
