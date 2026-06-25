# Locally — Projet

## Concept
Plateforme web mobile qui connecte les voyageurs (hôtels, Airbnb) aux commerces locaux via QR code. Lancé à Bordeaux.

## Modèle économique (Phase 1 — live)
- **Pass client gratuit** et illimité
- **Commission 5 %** sur chaque transaction : 4 % Locally + 1 % hôtel
- **Réduction partenaire** : min 10 %, max 50 %
- `commission_active` (toggle admin) : si activée → le client reçoit (taux − 5 pts), sinon réduction complète et commission = 0
- **Phase 2 (à venir)** : SaaS mensuel partenaire + intégration Stripe

## Stack
- React + Vite (SPA, routing manuel par état)
- Supabase (base de données + auth + RLS)
- Vercel (déploiement)
- ElevenLabs + Twilio (appel IA commandes — en commentaire TODO)
- Anthropic API (analyses dashboard admin)

## Liens
- Repo : aurelienmht22-boop/Locally
- Site : locally-gules.vercel.app
- Local : `cd ~/Locally && npm run dev`

## Règles importantes
- Utiliser `import.meta.env.VITE_` (pas `process.env`) — spécifique Vite
- Taper les commandes manuellement, ne jamais copier-coller dans le terminal
- Vérifier la ligne avec `grep -n` avant tout `sed -i`
- Toujours commit + push immédiatement après chaque modification
- Ne jamais envoyer `created_at` dans un INSERT (géré par `DEFAULT now()`, sinon 403 RLS)
- Les policies RLS ne doivent PAS avoir `TO anon` (sinon les utilisateurs JWT authenticated voient 0 ligne)
- `rls_apply.sql` (racine) = script idempotent à relancer après tout reset Supabase
