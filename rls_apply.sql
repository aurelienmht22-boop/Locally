-- ============================================================
-- LOCALLY — RLS APPLY (version minimale, sans commentaires)
-- Coller EN ENTIER dans Supabase > SQL Editor > Run
-- ============================================================

-- ÉTAPE 0 : colonnes manquantes
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_hotel NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_expires_at timestamptz;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

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

-- ÉTAPE 3 : créer les policies (sans restriction de rôle = anon + authenticated)

-- candidates
CREATE POLICY "candidates_select_all" ON candidates FOR SELECT USING (true);
CREATE POLICY "candidates_insert_pending_only" ON candidates FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "candidates_update_all" ON candidates FOR UPDATE USING (true) WITH CHECK (true);

-- hotels
CREATE POLICY "hotels_select_all" ON hotels FOR SELECT USING (true);
CREATE POLICY "hotels_insert_pending_only" ON hotels FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "hotels_update_all" ON hotels FOR UPDATE USING (true) WITH CHECK (true);

-- visits
CREATE POLICY "visits_select_all" ON visits FOR SELECT USING (true);
CREATE POLICY "visits_insert_all" ON visits FOR INSERT WITH CHECK (true);
CREATE POLICY "visits_update_all" ON visits FOR UPDATE USING (true) WITH CHECK (true);

-- orders
CREATE POLICY "orders_select_all" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert_all" ON orders FOR INSERT WITH CHECK (true);

-- page_views
CREATE POLICY "page_views_select_all" ON page_views FOR SELECT USING (true);
CREATE POLICY "page_views_insert_all" ON page_views FOR INSERT WITH CHECK (true);

-- menu_items
CREATE POLICY "menu_items_select_all" ON menu_items FOR SELECT USING (true);
CREATE POLICY "menu_items_insert_all" ON menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "menu_items_update_all" ON menu_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "menu_items_delete_all" ON menu_items FOR DELETE USING (true);

-- messages
CREATE POLICY "messages_select_all" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert_all" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update_all" ON messages FOR UPDATE USING (true) WITH CHECK (true);

-- analyses
CREATE POLICY "analyses_select_all" ON analyses FOR SELECT USING (true);
CREATE POLICY "analyses_insert_all" ON analyses FOR INSERT WITH CHECK (true);

-- transactions
CREATE POLICY "transactions_insert_all" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "transactions_select_all" ON transactions FOR SELECT USING (true);
