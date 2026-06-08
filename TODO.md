# Locally — Roadmap

## FAIT
- [x] Page d'accueil avec hero, catégories, animations Framer Motion
- [x] Page partenaire Snack Bodrum hardcodée avec commande en ligne, appel IA ElevenLabs, QR code visite 2h
- [x] Page catégorie dynamique (partenaires Supabase + hardcodés cohabitent)
- [x] Page partenaire générique depuis Supabase (vitrine, horaires, QR code, badge statut ouvert/fermé)
- [x] Formulaire candidature /rejoindre avec horaires, réduction %, infos complémentaires
- [x] Back-office /admin avec candidatures, partenaires, visites
- [x] Espace partenaire /partner/:slug avec profil, menu, stats, horaires
- [x] Page scan /scan pour les partenaires
- [x] Tracking vues de page avec déduplication localStorage (1 vue/jour/visiteur)
- [x] Système QR code unique avec expiration 2h et countdown
- [x] Badge statut dynamique ouvert/ferme bientôt/fermé (basé sur horaires jsonb)

## À FAIRE — PRIORITÉ HAUTE
- [ ] Remplacer numéro test par vrai numéro Snack Bodrum : +33625951075
- [ ] Activer paiement Stripe pour le pass client 5 €
- [ ] Générer et imprimer le QR code pointant vers locally-gules.vercel.app
- [ ] Test end-to-end complet sur mobile

## V2
- [ ] Système d'authentification unifié login/rôles
- [ ] Commande en ligne configurable par partenaire
- [ ] Géolocalisation et distance hôtel/partenaire
- [ ] Carte des partenaires
