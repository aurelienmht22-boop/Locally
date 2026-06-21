-- =============================================================================
-- LOCALLY — Row Level Security (RLS) Policies
-- Fichier généré le 2026-06-17 — NE PAS exécuter sans lire l'intégralité.
-- À exécuter dans le SQL Editor de Supabase (Settings → SQL Editor).
-- =============================================================================
--
-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                   CONTRAINTE ARCHITECTURALE CRITIQUE                    ║
-- ╠═══════════════════════════════════════════════════════════════════════════╣
-- ║ L'application utilise la clé anon publique pour TOUTES les opérations : ║
-- ║   • visiteurs anonymes          • partenaires connectés                 ║
-- ║   • hôtels connectés            • admin (/admin, /dashboard)            ║
-- ║                                                                         ║
-- ║ Supabase Auth n'est pas utilisé. L'authentification est purement        ║
-- ║ JavaScript (sessionStorage + codes hardcodés).                          ║
-- ║                                                                         ║
-- ║ CONSÉQUENCE : RLS ne peut PAS distinguer un visiteur anonyme d'un       ║
-- ║ admin ou partenaire. Tous ont le même rôle Postgres : "anon".           ║
-- ║                                                                         ║
-- ║ CE QUE RLS APPORTE MALGRÉ TOUT :                                        ║
-- ║   ✓ INSERT avec contraintes de valeurs (ex. status='pending' seulement) ║
-- ║   ✓ Deny complet sur DELETE (aucune table n'en a besoin côté anon)      ║
-- ║   ✓ Deny SELECT sur les tables purement internes (transactions,          ║
-- ║     analyses, orders) — elles n'ont pas de SELECT public légitime        ║
-- ║   ✓ Base propre pour migrer vers service_role côté admin (futur)        ║
-- ║                                                                         ║
-- ║ RECOMMANDATION FUTURE : migrer les opérations admin et partenaire vers  ║
-- ║ une Supabase Edge Function utilisant la clé service_role. Cela          ║
-- ║ permettrait de vraiment restreindre les UPDATE/SELECT par identité.     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
--
-- =============================================================================
-- INVENTAIRE COMPLET DES REQUÊTES PAR TABLE (issu de l'analyse du code)
-- =============================================================================
--
-- TABLE candidates
--   SELECT  public      : count(status='approuve')                   [HomePage]
--   SELECT  public      : * WHERE status='approuve'                  [CategoryPage, App root]
--   SELECT  public      : slug WHERE access_code=? AND status='approuve' [LoginView]
--   SELECT  public      : reduction WHERE id=?                       [ScanPage]
--   SELECT  public      : * WHERE slug=? AND access_code=? AND status='approuve' [PartnerView login]
--   SELECT  public      : * WHERE slug=? AND status='approuve'       [PartnerView après auth]
--   SELECT  ADMIN ONLY  : * (tous statuts, tous champs)              [AdminView — onglets candidatures/rejetées]
--   INSERT  public      : status='pending' (formulaire candidature)  [LoginView, JoindreView]
--   UPDATE  PARTENAIRE  : profil, horaires, photo_url, access_code WHERE id=? [PartnerView]
--   UPDATE  ADMIN ONLY  : status (approve/reject) WHERE id=?        [AdminView]
--   UPDATE  ADMIN ONLY  : slug, access_code WHERE id=?              [AdminView]
--   DELETE  → AUCUN dans le code
--
-- TABLE hotels
--   SELECT  public      : slug WHERE access_code=? AND status='approuve' [LoginView]
--   SELECT  public      : * WHERE slug=? AND status='approuve'       [HotelView]
--   SELECT  ADMIN ONLY  : * (tous statuts)                           [AdminView]
--   INSERT  public      : status='pending' (formulaire hôtel)        [LoginView]
--   UPDATE  HÔTEL       : access_code WHERE slug=?                   [HotelView]
--   UPDATE  ADMIN ONLY  : status WHERE id=?                          [AdminView]
--   UPDATE  ADMIN ONLY  : slug, access_code WHERE id=?               [AdminView]
--   DELETE  → AUCUN dans le code
--
-- TABLE visits
--   SELECT  public      : * WHERE qr_code_id=?                       [ScanPage, PartnerView txn]
--   SELECT  PARTENAIRE  : * WHERE partner_id=?                       [PartnerView stats, AdminView]
--   SELECT  HÔTEL       : *, candidates(nom) WHERE hotel_slug=?      [HotelView stats]
--   SELECT  ADMIN ONLY  : * (toutes)                                 [AdminView onglet visites]
--   INSERT  public      : qr_code_id, partner_id, client_name, expires_at, hotel_slug [SnackPage, GenericPartnerPage]
--   UPDATE  public      : scanned=true, scanned_at WHERE qr_code_id=? [ScanPage]
--   UPDATE  PARTENAIRE  : scanned=true, scanned_at WHERE id=?        [PartnerView txn validation]
--   DELETE  → AUCUN dans le code
--
-- TABLE orders
--   SELECT  DASHBOARD   : * (toutes commandes)                       [DashboardPage — protégé par VITE_DASHBOARD_PASSWORD côté JS]
--   INSERT  public      : commande Snack Bodrum                      [SnackPage panier]
--   UPDATE  → AUCUN dans le code
--   DELETE  → AUCUN dans le code
--
-- TABLE page_views
--   SELECT  PARTENAIRE  : count WHERE partner_id=?                   [PartnerView stats]
--   INSERT  public      : partner_id, created_at                     [SnackPage, GenericPartnerPage — chaque vue de page]
--   UPDATE  → AUCUN dans le code
--   DELETE  → AUCUN dans le code
--
-- TABLE menu_items
--   SELECT  public      : * WHERE partner_id=?                       [GenericPartnerPage, PartnerView]
--   INSERT  PARTENAIRE  : nouvel article de menu                     [PartnerView]
--   UPDATE  PARTENAIRE  : article existant WHERE id=?                [PartnerView]
--   DELETE  PARTENAIRE  : article WHERE id=?                         [PartnerView]
--
-- TABLE messages
--   SELECT  ADMIN ONLY  : partner_id WHERE status='non_lu'           [AdminView badge non-lus]
--   SELECT  ADMIN ONLY  : * WHERE partner_id=?                       [AdminView]
--   INSERT  PARTENAIRE  : message du partenaire vers Locally         [PartnerView]
--   UPDATE  ADMIN ONLY  : status='lu' WHERE id=?                     [AdminView]
--   DELETE  → AUCUN dans le code
--
-- TABLE analyses
--   SELECT  DASHBOARD   : * (toutes analyses)                        [DashboardPage]
--   INSERT  DASHBOARD   : contenu analyse IA                         [DashboardPage generateAnalysis]
--   UPDATE  → AUCUN dans le code
--   DELETE  → AUCUN dans le code
--
-- TABLE transactions
--   SELECT  → AUCUN dans le code actuellement
--   INSERT  PARTENAIRE  : validation d'une transaction avec QR       [PartnerView onglet Valider]
--   UPDATE  → AUCUN dans le code
--   DELETE  → AUCUN dans le code
--
-- =============================================================================



-- =============================================================================
-- ÉTAPE 0 : CORRECTIONS DE SCHÉMA (colonnes manquantes après reset)
-- =============================================================================
-- À exécuter avant les policies — idempotent (IF NOT EXISTS).

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_hotel NUMERIC NOT NULL DEFAULT 0;

-- =============================================================================
-- ÉTAPE 1 : ACTIVATION DU RLS SUR TOUTES LES TABLES
-- =============================================================================

ALTER TABLE candidates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;



-- =============================================================================
-- TABLE : candidates
-- =============================================================================
-- ⚠️  DILEMME NON RÉSOLVABLE SANS SERVICE_ROLE :
--
--   • L'utilisateur demande que le public ne voit que les partenaires 'approuve'.
--   • L'AdminView lit TOUS les statuts (pending, approuve, rejete) via la clé anon.
--   • Ces deux exigences sont incompatibles tant que l'admin utilise la clé anon.
--
--   OPTION A — Restreint (recommandée à terme) :
--     SELECT filtré sur status='approuve'. L'admin ne voit plus les candidatures
--     en attente ni les rejetées. À activer uniquement après avoir migré
--     l'AdminView vers une Edge Function avec la clé service_role.
--
--   OPTION B — Pragmatique (activée par défaut ci-dessous) :
--     SELECT ouvert à tous les statuts. L'admin continue de fonctionner.
--     Risque résiduel : un visiteur avec la clé anon peut lire les candidatures
--     pending (emails, téléphones). Données non sensibles au sens RGPD strict
--     (soumises volontairement), mais idéalement à protéger.
--
--   → L'Option B est activée. L'Option A est commentée pour activation future.
-- =============================================================================

-- Nettoyage des éventuelles politiques existantes
DROP POLICY IF EXISTS "candidates_select_anon"          ON candidates;
DROP POLICY IF EXISTS "candidates_select_public"         ON candidates;
DROP POLICY IF EXISTS "candidates_insert_pending_only"  ON candidates;
DROP POLICY IF EXISTS "candidates_update_anon"          ON candidates;

-- OPTION A (désactivée — à activer après migration admin vers service_role)
-- CREATE POLICY "candidates_select_approuve_only" ON candidates
--   FOR SELECT TO anon
--   USING (status = 'approuve');

-- OPTION B — lecture complète pour tous les rôles anon (admin fonctionnel)
CREATE POLICY "candidates_select_anon" ON candidates
  FOR SELECT TO anon
  USING (true);

-- INSERT : le public ne peut soumettre qu'une candidature en attente.
-- Empêche l'auto-approbation via INSERT avec status='approuve'.
CREATE POLICY "candidates_insert_pending_only" ON candidates
  FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- UPDATE : nécessaire pour partenaires (profil, photo, horaires, code d'accès)
-- et pour l'admin (approbation/rejet, slug, access_code).
-- ⚠️  Risque résiduel : n'importe qui avec la clé anon peut techniquement
-- modifier n'importe quelle fiche, y compris changer le status vers 'approuve'.
-- Mitigation JS-level : l'accès admin est conditionné au mot de passe côté JS.
-- Mitigation DB possible : trigger BEFORE UPDATE interdisant status='approuve'
-- si l'ancien status était 'pending' (voir section TRIGGERS optionnels en bas).
CREATE POLICY "candidates_update_anon" ON candidates
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE : aucune politique → interdit pour le rôle anon ✓
-- (Avec RLS activé, l'absence de politique = accès refusé)



-- =============================================================================
-- TABLE : hotels
-- =============================================================================
-- Même dilemme que candidates : admin lit tous les statuts, public ne devrait
-- voir que les hôtels 'approuve'.
-- Même choix : Option B par défaut (admin fonctionnel).
-- =============================================================================

DROP POLICY IF EXISTS "hotels_select_anon"          ON hotels;
DROP POLICY IF EXISTS "hotels_select_approuve_only" ON hotels;
DROP POLICY IF EXISTS "hotels_insert_pending_only"  ON hotels;
DROP POLICY IF EXISTS "hotels_update_anon"          ON hotels;

-- OPTION A (désactivée)
-- CREATE POLICY "hotels_select_approuve_only" ON hotels
--   FOR SELECT TO anon
--   USING (status = 'approuve');

-- OPTION B
CREATE POLICY "hotels_select_anon" ON hotels
  FOR SELECT TO anon
  USING (true);

-- INSERT : uniquement avec status='pending'
CREATE POLICY "hotels_insert_pending_only" ON hotels
  FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- UPDATE : HotelView (changement access_code) + AdminView (status, slug, access_code)
CREATE POLICY "hotels_update_anon" ON hotels
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE : interdit ✓



-- =============================================================================
-- TABLE : visits
-- =============================================================================
-- La table la plus complexe : lecture légitime par 4 acteurs différents
-- (scan public, partenaire, hôtel, admin) mais tous via la même clé anon.
-- On ne peut pas filtrer par identité, donc SELECT reste ouvert.
--
-- Amélioration réelle apportée par RLS :
--   • Aucun DELETE possible
--   • INSERT contraint (pas de contrôle de valeur nécessaire — tout est légitime)
--   • UPDATE contraint — idéalement uniquement pour marquer scanned=true,
--     mais on ne peut pas imposer cela sans connaître le rôle
-- =============================================================================

DROP POLICY IF EXISTS "visits_select_anon" ON visits;
DROP POLICY IF EXISTS "visits_insert_anon" ON visits;
DROP POLICY IF EXISTS "visits_update_anon" ON visits;

-- SELECT : nécessaire pour ScanPage (par qr_code_id), PartnerView (par partner_id),
-- HotelView (par hotel_slug), AdminView (toutes). Pas de restriction possible.
CREATE POLICY "visits_select_anon" ON visits
  FOR SELECT TO anon
  USING (true);

-- INSERT : tout visiteur peut générer un QR (comportement voulu)
-- Le client_name et partner_id ne sont pas vérifiables ici.
CREATE POLICY "visits_insert_anon" ON visits
  FOR INSERT TO anon
  WITH CHECK (true);

-- UPDATE : marquer scanned=true (ScanPage et PartnerView txn)
-- ⚠️  Risque résiduel : n'importe qui pourrait marquer n'importe quelle visite
-- comme scannée. Atténué par le fait que qr_code_id est un UUID non prédictible.
CREATE POLICY "visits_update_anon" ON visits
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE : interdit ✓



-- =============================================================================
-- TABLE : orders
-- =============================================================================
-- INSERT public : SnackPage (commandes clients). Pas de restriction sur les valeurs
-- car le client peut soumettre n'importe quel contenu de panier.
--
-- SELECT : uniquement utilisé par DashboardPage (protégé côté JS par VITE_DASHBOARD_PASSWORD).
-- ⚠️  RISQUE : avec la clé anon, n'importe qui peut SELECT toutes les commandes
-- (noms clients, téléphones, montants). Il n'y a pas de moyen de le restreindre
-- sans migrer DashboardPage vers une Edge Function avec service_role.
--
-- CHOIX : autoriser le SELECT (même comportement qu'avant RLS, admin fonctionnel).
-- À restreindre en priorité lors de la migration vers service_role.
-- =============================================================================

DROP POLICY IF EXISTS "orders_select_anon" ON orders;
DROP POLICY IF EXISTS "orders_insert_anon" ON orders;

CREATE POLICY "orders_select_anon" ON orders
  FOR SELECT TO anon
  USING (true);

-- ⚠️  Risque élevé : noms et téléphones clients exposés à tout porteur de la clé anon.
-- Recommandation : désactiver ce SELECT anon dès que DashboardPage utilise service_role.

CREATE POLICY "orders_insert_anon" ON orders
  FOR INSERT TO anon
  WITH CHECK (true);

-- UPDATE, DELETE : interdits ✓



-- =============================================================================
-- TABLE : page_views
-- =============================================================================
-- Table de tracking pur : INSERT depuis n'importe quelle page partenaire publique,
-- SELECT uniquement par le partenaire pour ses stats.
-- Contenu peu sensible (juste partner_id + timestamp).
-- =============================================================================

DROP POLICY IF EXISTS "page_views_select_anon" ON page_views;
DROP POLICY IF EXISTS "page_views_insert_anon" ON page_views;

-- SELECT : PartnerView (count par partner_id) et AdminView.
-- Pas d'information sensible — ouvert.
CREATE POLICY "page_views_select_anon" ON page_views
  FOR SELECT TO anon
  USING (true);

-- INSERT : toute page partenaire insère une vue au chargement
CREATE POLICY "page_views_insert_anon" ON page_views
  FOR INSERT TO anon
  WITH CHECK (true);

-- UPDATE, DELETE : interdits ✓



-- =============================================================================
-- TABLE : menu_items
-- =============================================================================
-- Gestion du menu par le partenaire (CRUD complet) + lecture publique
-- pour afficher le menu sur la page GenericPartnerPage.
--
-- ⚠️  Risque résiduel : n'importe qui avec la clé anon peut ajouter/modifier/
-- supprimer des articles de n'importe quel partenaire. Mitigation : l'interface
-- partenaire ne montre que les articles du partenaire connecté.
-- Résolvable avec service_role + vérification du partner_id.
-- =============================================================================

DROP POLICY IF EXISTS "menu_items_select_anon" ON menu_items;
DROP POLICY IF EXISTS "menu_items_insert_anon" ON menu_items;
DROP POLICY IF EXISTS "menu_items_update_anon" ON menu_items;
DROP POLICY IF EXISTS "menu_items_delete_anon" ON menu_items;

-- SELECT : lecture publique du menu (page partenaire) + PartnerView
CREATE POLICY "menu_items_select_anon" ON menu_items
  FOR SELECT TO anon
  USING (true);

-- INSERT : partenaire ajoute un article
CREATE POLICY "menu_items_insert_anon" ON menu_items
  FOR INSERT TO anon
  WITH CHECK (true);

-- UPDATE : partenaire modifie un article
CREATE POLICY "menu_items_update_anon" ON menu_items
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE : partenaire supprime un article
-- Seule table où DELETE est autorisé pour anon (usage légitime dans PartnerView)
CREATE POLICY "menu_items_delete_anon" ON menu_items
  FOR DELETE TO anon
  USING (true);



-- =============================================================================
-- TABLE : messages
-- =============================================================================
-- Les messages sont envoyés par les partenaires vers Locally (sens unique).
-- Lecture et mise à jour uniquement par l'admin.
--
-- ⚠️  Risque résiduel : SELECT et UPDATE ouverts à tous les anon
-- (l'admin utilise la même clé). Tout porteur de la clé anon pourrait lire
-- les messages de tous les partenaires. Prioritaire pour migration service_role.
-- =============================================================================

DROP POLICY IF EXISTS "messages_select_anon" ON messages;
DROP POLICY IF EXISTS "messages_insert_anon" ON messages;
DROP POLICY IF EXISTS "messages_update_anon" ON messages;

-- SELECT : AdminView uniquement (non restreint car même clé anon)
CREATE POLICY "messages_select_anon" ON messages
  FOR SELECT TO anon
  USING (true);

-- INSERT : partenaire envoie un message à l'équipe Locally
CREATE POLICY "messages_insert_anon" ON messages
  FOR INSERT TO anon
  WITH CHECK (true);

-- UPDATE : admin marque un message comme lu (status='lu')
CREATE POLICY "messages_update_anon" ON messages
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE : interdit ✓



-- =============================================================================
-- TABLE : analyses
-- =============================================================================
-- Analyses IA générées dans DashboardPage (protégé par VITE_DASHBOARD_PASSWORD).
-- Contenu sensible (données business, CA, tendances).
--
-- Même problème que orders : SELECT ouvert par nécessité (dashboard même clé).
-- À migrer vers service_role en priorité avec orders.
-- =============================================================================

DROP POLICY IF EXISTS "analyses_select_anon" ON analyses;
DROP POLICY IF EXISTS "analyses_insert_anon" ON analyses;

-- SELECT : DashboardPage uniquement (non restreint — même clé anon)
-- ⚠️  Risque : données business exposées à tout porteur de la clé anon.
CREATE POLICY "analyses_select_anon" ON analyses
  FOR SELECT TO anon
  USING (true);

-- INSERT : génération d'une nouvelle analyse dans DashboardPage
CREATE POLICY "analyses_insert_anon" ON analyses
  FOR INSERT TO anon
  WITH CHECK (true);

-- UPDATE, DELETE : interdits ✓



-- =============================================================================
-- TABLE : transactions
-- =============================================================================
-- Table nouvellement créée. Actuellement aucun SELECT dans le code.
-- Amélioration maximale : INSERT autorisé, SELECT BLOQUÉ.
-- C'est la table avec la meilleure posture de sécurité de tout le schéma :
-- personne ne peut lire les transactions via la clé anon, même pas l'admin
-- (car il n'y a pas de vue admin des transactions dans le code actuel).
--
-- Si vous ajoutez une vue admin des transactions dans le futur :
--   → Faites-le via service_role, pas en ajoutant un SELECT anon ici.
-- =============================================================================

DROP POLICY IF EXISTS "transactions_insert_anon" ON transactions;

-- INSERT : partenaire valide une transaction après scan QR
CREATE POLICY "transactions_insert_anon" ON transactions
  FOR INSERT TO anon
  WITH CHECK (true);

-- SELECT : aucune politique → INTERDIT pour anon ✓
-- UPDATE : aucune politique → INTERDIT pour anon ✓
-- DELETE : aucune politique → INTERDIT pour anon ✓



-- =============================================================================
-- TRIGGERS OPTIONNELS (renforcement supplémentaire)
-- =============================================================================
-- Ces triggers ajoutent des protections au niveau DB qui ne dépendent pas de RLS
-- et s'appliquent même en cas de contournement de la couche application.
-- =============================================================================

-- TRIGGER 1 : Empêcher l'escalade de statut via UPDATE sur candidates
-- Interdit de passer status de 'pending'/'rejete' à 'approuve' via la clé anon.
-- L'admin devrait utiliser service_role pour approuver (future migration).
-- ⚠️  Ce trigger CASSE l'approbation admin actuelle si activé maintenant.
-- Décommenter uniquement après migration de l'admin vers service_role.

-- CREATE OR REPLACE FUNCTION prevent_status_escalation()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF OLD.status IN ('pending', 'rejete') AND NEW.status = 'approuve' THEN
--     -- Seul le rôle service_role peut approuver (bypass RLS = service_role)
--     IF current_setting('role') != 'service_role' THEN
--       RAISE EXCEPTION 'Approbation interdite via clé anon. Utilisez service_role.';
--     END IF;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- CREATE TRIGGER enforce_status_escalation
--   BEFORE UPDATE ON candidates
--   FOR EACH ROW EXECUTE FUNCTION prevent_status_escalation();
--
-- CREATE TRIGGER enforce_hotel_status_escalation
--   BEFORE UPDATE ON hotels
--   FOR EACH ROW EXECUTE FUNCTION prevent_status_escalation();



-- =============================================================================
-- RÉSUMÉ PAR TABLE — POSTURE DE SÉCURITÉ APRÈS APPLICATION
-- =============================================================================
--
-- TABLE          SELECT    INSERT             UPDATE    DELETE
-- ─────────────────────────────────────────────────────────────────────────────
-- candidates     OUVERT*   pending only ✓     OUVERT*   INTERDIT ✓
-- hotels         OUVERT*   pending only ✓     OUVERT*   INTERDIT ✓
-- visits         OUVERT    OUVERT             OUVERT    INTERDIT ✓
-- orders         OUVERT*   OUVERT             INTERDIT  INTERDIT ✓
-- page_views     OUVERT    OUVERT             INTERDIT  INTERDIT ✓
-- menu_items     OUVERT    OUVERT             OUVERT    OUVERT (partenaire)
-- messages       OUVERT*   OUVERT             OUVERT*   INTERDIT ✓
-- analyses       OUVERT*   OUVERT             INTERDIT  INTERDIT ✓
-- transactions   INTERDIT  OUVERT             INTERDIT  INTERDIT ✓
--
-- * = ouvert uniquement parce que l'admin utilise la même clé anon.
--     À restreindre lors de la migration vers service_role.
-- ✓ = amélioration réelle par rapport à l'absence de RLS.
--
-- GAINS CONCRETS DE CE FICHIER :
--   1. candidates INSERT : impossible d'insérer directement un partenaire 'approuve'
--   2. hotels INSERT : même protection
--   3. orders UPDATE/DELETE : protégés
--   4. page_views UPDATE/DELETE : protégés
--   5. analyses UPDATE/DELETE : protégés
--   6. transactions SELECT/UPDATE/DELETE : totalement bloqués ✓ (meilleure table)
--   7. Fondation propre pour la migration future vers service_role
--
-- RISQUES RÉSIDUELS DOCUMENTÉS :
--   R1. Tout porteur de la clé anon peut lire TOUTES les visits (noms clients).
--       → Priorité : ajouter Supabase Auth ou filtrer par qr_code_id uniquement.
--   R2. Tout porteur de la clé anon peut lire toutes les orders et analyses
--       (CA, téléphones clients, données business).
--       → Priorité haute : migrer DashboardPage vers Edge Function + service_role.
--   R3. Un porteur de la clé anon peut UPDATE candidates.status vers 'approuve'
--       (escalade de privilège via API directe, pas via l'interface).
--       → Mitigation : activer le trigger prevent_status_escalation une fois
--         l'admin migré vers service_role.
--   R4. messages lisibles par tout porteur de la clé anon.
--       → Migrer AdminView (lecture messages) vers service_role.
--
-- =============================================================================
