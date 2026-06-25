# Locally — Roadmap

## FAIT
- [x] Page d'accueil hero + catégories + animations Framer Motion
- [x] Section "Comment ça marche" homepage + page /comment-ca-marche
- [x] Formulaire candidature /rejoindre (horaires, réduction %, infos)
- [x] Inscription client Supabase Auth + confirmation email + RGPD
- [x] Mot de passe oublié + page /reset-password
- [x] Emails Supabase au design Locally (bordeaux #6B1D1D, crème #FAF4EC)
- [x] Onboarding one-shot après 1ère connexion
- [x] Système session 24h (profiles.session_expires_at, renouvelée par scan QR hôtel ?hotel=slug)
- [x] SessionBar : barre 3px sous la nav (vert >2h, ambre <2h, rouge expiré) + page /renouveler
- [x] Génération QR partenaire (timer 1h) + confirmation client après scan (polling 5s)
- [x] Validation transaction côté partenaire (scan + montant + calcul commission auto)
- [x] Historique client /compte
- [x] Espace partenaire : profil / menu / messages / stats / valider / paramètres
- [x] Stats partenaire : filtres période + BarChart 30j + dernières transactions
- [x] Lien Google Avis + tracking (table review_clicks)
- [x] Paramètres partenaire : modifier infos, changer code, désactivation (colonne visible)
- [x] QR comptoir partenaire téléchargeable PNG
- [x] Espace hôtel : login intégré, stats enrichies, profil éditable, messagerie, QR téléchargeable
- [x] Admin : Candidatures / Partenaires / Hôtels / Rejetés / Statistiques / Paramètres
- [x] Badges admin (pending, compteurs, messages non lus séparés partenaires/hôtels)
- [x] Stats globales admin (CA, clients, QR générés/scannés, taux conversion, top 8 partenaires, économies)
- [x] Slug + code d'accès auto-générés à l'approbation admin
- [x] Carte /carte : Leaflet + OpenStreetMap + géocodage Google Maps (colonnes latitude/longitude)
- [x] Suppression Snack Bodrum hardcodé (−671 lignes)

## À FAIRE — PRIORITÉ HAUTE
- [ ] **Bug** : slug/code générés mais pas sauvegardés dans Supabase à l'approbation (à corriger)
- [ ] Email auto approbation partenaire via Brevo API
- [ ] Acheter domaine OVH + configurer Brevo contact@locally.fr
- [ ] Migrer photos vers Supabase Storage
- [ ] Sécuriser admin/dashboard via Edge Function service_role
- [ ] Test end-to-end complet sur mobile

## À FAIRE — PRIORITÉ MOYENNE
- [ ] BO partenaire personnalisé par corps de métier (labels adaptés à la catégorie)
- [ ] Réactiver ElevenLabs/Twilio (vrai numéro Snack Bodrum +33625951075)

## Phase 2 (SaaS)
- [ ] Abonnement mensuel partenaire + intégration Stripe
- [ ] Commande en ligne configurable par partenaire
- [ ] Géolocalisation et distance hôtel/partenaire
