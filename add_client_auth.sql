-- =============================================================================
-- Locally — Système de compte client (Supabase Auth)
-- À exécuter dans le SQL Editor de Supabase AVANT de déployer l'application.
-- Exécuter dans l'ordre, section par section.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLE PROFILES
--    Stocke le prénom et le consentement RGPD pour chaque compte client.
--    Liée à auth.users avec suppression en cascade (GoTrue supprime le profil
--    si l'utilisateur auth est supprimé par l'Edge Function).
-- -----------------------------------------------------------------------------
create table if not exists profiles (
  id               uuid primary key references auth.users on delete cascade,
  prenom           text not null,
  rgpd_consent_at  timestamptz not null,
  created_at       timestamptz default now()
);

-- RLS : chaque utilisateur ne voit et ne modifie que son propre profil
alter table profiles enable row level security;

create policy "profiles: lecture compte propre"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: insertion compte propre"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles: mise à jour compte propre"
  on profiles for update
  using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. COLONNES user_id DANS visits ET transactions
--    Nullable pour conserver la compatibilité avec les données historiques
--    (visites créées avec un simple prénom avant ce système de compte).
-- -----------------------------------------------------------------------------
alter table visits
  add column if not exists user_id uuid references auth.users(id) null;

alter table transactions
  add column if not exists user_id uuid references auth.users(id) null;

-- Index pour accélérer les requêtes "Mon compte" (historique par utilisateur)
create index if not exists visits_user_id_idx       on visits(user_id);
create index if not exists transactions_user_id_idx on transactions(user_id);

-- -----------------------------------------------------------------------------
-- 3. RLS SUPPLÉMENTAIRES sur visits et transactions
--    Permet à un client connecté de lire ses propres données.
--    Les policies existantes (pour partenaires, hôtels, admin) ne sont pas
--    modifiées — on ajoute seulement les policies client.
-- -----------------------------------------------------------------------------
create policy "visits: lecture compte propre"
  on visits for select
  using (auth.uid() = user_id);

create policy "transactions: lecture compte propre"
  on transactions for select
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. VÉRIFICATION
--    Ces requêtes doivent toutes retourner des résultats (0 ligne = ok).
-- -----------------------------------------------------------------------------
-- select * from profiles limit 1;
-- select column_name from information_schema.columns
--   where table_name = 'visits' and column_name = 'user_id';
-- select column_name from information_schema.columns
--   where table_name = 'transactions' and column_name = 'user_id';
