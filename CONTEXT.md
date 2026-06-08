# Locally — Projet

## Concept
Plateforme web mobile qui connecte les voyageurs (hôtels, Airbnb) aux commerces locaux via QR code. Lancé à Bordeaux.

## Modèle économique
- Pass client 5 €/séjour → 2,50 € pour l'hôtel / 2,50 € pour Locally
- Abonnement partenaire mensuel → 100 % pour Locally
- Commissions commandes en ligne → 50/50 avec l'hôtel
- Hôtels gratuits au lancement

## Stack
- React + Vite (SPA, routing manuel par état)
- Supabase (base de données + auth)
- Vercel (déploiement)
- ElevenLabs + Twilio (appel IA pour commandes)
- Anthropic API (analyses dashboard)

## Liens
- Repo : aurelienmht22-boop/Locally
- Site : locally-gules.vercel.app
- Local : `cd ~/Locally && npm run dev`

## Important
- Utiliser `import.meta.env.VITE_` (pas `process.env`) — Vite
- Taper les commandes manuellement, ne jamais copier-coller dans le terminal
- Vérifier la ligne avec `grep -n` avant tout `sed -i`
