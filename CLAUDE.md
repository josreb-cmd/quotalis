# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quotalis is a condominium management system (in Portuguese) for tracking units (frações), monthly/extraordinary quotas, payments, expenses, administrators, and financial reporting.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (output: dist/)
npm run lint       # ESLint
npm run preview    # Preview production build
npm run typecheck  # Type-check without emitting (tsc --noEmit)
```

No test suite is configured.

## Architecture

**Stack**: React 18 + TypeScript (strict) + Vite + TailwindCSS + Supabase (PostgreSQL)

**Routing**: `src/App.tsx` defines all routes via React Router v7. Every page is wrapped in `src/components/Layout/Layout.tsx` which renders the sidebar navigation.

**Pages** (`src/pages/`): One file per domain area — `Fracoes`, `QuotasMensais`, `QuotasExtraordinarias`, `Pagamentos`, `Despesas`, `Administradores`, `Relatorios`, `Configuracoes`, `Dashboard`. Each page manages its own state with `useState`/`useEffect` and talks directly to Supabase.

**No global state manager** — all data fetching and mutations happen locally in each page component via the Supabase JS client (`src/lib/supabase.ts`). Toast notifications (react-hot-toast) are used for feedback.

**Database**: Supabase with RLS enabled (both authenticated and anon users have full CRUD). Migrations are in `supabase/migrations/`. TypeScript types for all tables are in `src/types/database.ts` — keep this in sync when schema changes.

**Key domain logic** (`src/lib/utils.ts`): Currency formatting (EUR/PT locale), date helpers, and quota status calculations live here.

**Reports** (`src/components/relatorios/`): Four report components — annual balance, payment map, expense map, annual budget. These use jsPDF for PDF export.

**UI components** (`src/components/ui/`): Small custom library — `Button`, `Input`, `Modal`, `Card`, `Badge`, `Select`, `Table`, `Loading`. Use these rather than raw HTML for consistency.

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Copy `.env.example` to `.env` and fill in from the Supabase project dashboard.

## Deployment

Hosted on Netlify. `netlify.toml` handles the SPA redirect (`/*` → `/index.html`) and sets Node 20. Production deploys run `npm run build`.
