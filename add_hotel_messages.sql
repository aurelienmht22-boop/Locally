-- Migration : messages hôtel
-- Ajoute hotel_slug et hotel_name à la table messages pour distinguer
-- les messages envoyés par un hôtel de ceux envoyés par un partenaire.
-- hotel_slug IS NOT NULL → message hôtel / partner_id IS NOT NULL → message partenaire

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS hotel_slug text REFERENCES hotels(slug) NULL,
  ADD COLUMN IF NOT EXISTS hotel_name text NULL;
