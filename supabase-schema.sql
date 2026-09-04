-- =========================================================
-- Razão — schema do banco de dados (Supabase / Postgres)
--
-- Como usar:
-- 1. Crie um projeto em https://supabase.com (plano gratuito).
-- 2. Vá em "SQL Editor" → "New query".
-- 3. Cole todo este arquivo e clique em "Run".
-- 4. Em "Authentication" → "Providers", deixe "Email" habilitado.
--    Em "Authentication" → "Settings", pode desabilitar a
--    confirmação por e-mail se quiser logar direto (opcional).
-- 5. Pegue a URL e a "anon public key" em
--    "Project Settings" → "API" e cole em js/config.js.
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  brand text,
  color text default '#33543A',
  card_limit numeric,
  due_day int,
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('receita','despesa')),
  date date not null,
  description text not null,
  category text not null,
  amount numeric not null check (amount > 0),
  payment_method text,
  card_id uuid references public.cards on delete set null,
  fixed boolean default false,
  installment_current int,
  installment_total int,
  paid boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  type text not null,
  amount numeric not null check (amount >= 0),
  date date not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category text not null,
  limit_amount numeric not null check (limit_amount >= 0),
  created_at timestamptz default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null,
  done boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Row Level Security: cada usuário só enxerga e altera
-- as próprias linhas. Isso é o que garante a segurança dos
-- dados, mesmo com o site e a chave "anon" sendo públicos.
-- ---------------------------------------------------------
alter table public.cards enable row level security;
alter table public.transactions enable row level security;
alter table public.investments enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

create policy "cards_owner" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_owner" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "investments_owner" on public.investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets_owner" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goals_owner" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
