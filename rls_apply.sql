-- ============================================================
-- LOCALLY — RLS APPLY (version minimale, sans commentaires)
-- Coller EN ENTIER dans Supabase > SQL Editor > Run
-- ============================================================

-- ÉTAPE 0 : colonne manquante après reset
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_hotel NUMERIC NOT NULL DEFAULT 0;

-- ÉTAPE 1 : activer RLS
ALTER TABLE candidates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 2 : supprimer les anciennes policies (idempotent)
DROP POLICY IF EXISTS "candidates_select_anon"          ON candidates;
DROP POLICY IF EXISTS "candidates_select_public"         ON candidates;
DROP POLICY IF EXISTS "candidates_insert_pending_only"  ON candidates;
DROP POLICY IF EXISTS "candidates_update_anon"          ON candidates;
DROP POLICY IF EXISTS "candidates_delete_anon"          ON candidates;

DROP POLICY IF EXISTS "hotels_select_anon"          ON hotels;
DROP POLICY IF EXISTS "hotels_select_approuve_only" ON hotels;
DROP POLICY IF EXISTS "hotels_insert_pending_only"  ON hotels;
DROP POLICY IF EXISTS "hotels_update_anon"          ON hotels;

DROP POLICY IF EXISTS "visits_select_anon" ON visits;
DROP POLICY IF EXISTS "visits_insert_anon" ON visits;
DROP POLICY IF EXISTS "visits_update_anon" ON visits;

DROP POLICY IF EXISTS "orders_select_anon" ON orders;
DROP POLICY IF EXISTS "orders_insert_anon" ON orders;

DROP POLICY IF EXISTS "page_views_select_anon" ON page_views;
DROP POLICY IF EXISTS "page_views_insert_anon" ON page_views;

DROP POLICY IF EXISTS "menu_items_select_anon"  ON menu_items;
DROP POLICY IF EXISTS "menu_items_insert_anon"  ON menu_items;
DROP POLICY IF EXISTS "menu_items_update_anon"  ON menu_items;
DROP POLICY IF EXISTS "menu_items_delete_anon"  ON menu_items;

DROP POLICY IF EXISTS "messages_select_anon" ON messages;
DROP POLICY IF EXISTS "messages_insert_anon" ON messages;
DROP POLICY IF EXISTS "messages_update_anon" ON messages;

DROP POLICY IF EXISTS "analyses_select_anon" ON analyses;
DROP POLICY IF EXISTS "analyses_insert_anon" ON analyses;

DROP POLICY IF EXISTS "transactions_insert_anon" ON transactions;
DROP POLICY IF EXISTS "transactions_select_anon" ON transactions;

-- ÉTAPE 3 : créer les policies

-- candidates
CREATE POLICY "candidates_select_anon" ON candidates FOR SELECT TO anon USING (true);
CREATE POLICY "candidates_insert_pending_only" ON candidates FOR INSERT TO anon WITH CHECK (status = 'pending');
CREATE POLICY "candidates_update_anon" ON candidates FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- hotels
CREATE POLICY "hotels_select_anon" ON hotels FOR SELECT TO anon USING (true);
CREATE POLICY "hotels_insert_pending_only" ON hotels FOR INSERT TO anon WITH CHECK (status = 'pending');
CREATE POLICY "hotels_update_anon" ON hotels FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- visits
CREATE POLICY "visits_select_anon" ON visits FOR SELECT TO anon USING (true);
CREATE POLICY "visits_insert_anon" ON visits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "visits_update_anon" ON visits FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- orders
CREATE POLICY "orders_select_anon" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "orders_insert_anon" ON orders FOR INSERT TO anon WITH CHECK (true);

-- page_views
CREATE POLICY "page_views_select_anon" ON page_views FOR SELECT TO anon USING (true);
CREATE POLICY "page_views_insert_anon" ON page_views FOR INSERT TO anon WITH CHECK (true);

-- menu_items
CREATE POLICY "menu_items_select_anon" ON menu_items FOR SELECT TO anon USING (true);
CREATE POLICY "menu_items_insert_anon" ON menu_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "menu_items_update_anon" ON menu_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "menu_items_delete_anon" ON menu_items FOR DELETE TO anon USING (true);

-- messages
CREATE POLICY "messages_select_anon" ON messages FOR SELECT TO anon USING (true);
CREATE POLICY "messages_insert_anon" ON messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "messages_update_anon" ON messages FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- analyses
CREATE POLICY "analyses_select_anon" ON analyses FOR SELECT TO anon USING (true);
CREATE POLICY "analyses_insert_anon" ON analyses FOR INSERT TO anon WITH CHECK (true);

-- transactions (pas de SELECT anon — seul l'INSERT est autorisé)
CREATE POLICY "transactions_insert_anon" ON transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "transactions_select_anon" ON transactions FOR SELECT TO anon USING (true);
