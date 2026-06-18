-- Migration : activation commission par partenaire
-- À exécuter dans le SQL Editor de Supabase.
-- false par défaut = aucune commission prélevée tant que non activé manuellement depuis l'admin.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS commission_active boolean NOT NULL DEFAULT false;
