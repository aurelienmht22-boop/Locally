-- Migration : répartition commission Locally / hôtel d'origine
-- À exécuter dans le SQL Editor de Supabase.
-- Ajoute commission_hotel et recalibre commission_locally à 4% (était 5%).

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS commission_hotel numeric(10,2) NOT NULL DEFAULT 0;

-- Note : les lignes historiques conservent leur valeur commission_locally d'origine
-- (5% ancienne logique). Seules les nouvelles transactions utiliseront 4%/1%.
