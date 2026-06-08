# Locally — Référence technique

## Routes
| Route | Description |
|-------|-------------|
| `/` | Page d'accueil |
| `/rejoindre` | Formulaire candidature partenaire |
| `/admin` | Back-office (mot de passe : `VITE_DASHBOARD_PASSWORD`) |
| `/scan` | Page scan QR code partenaire |
| `/partner/:slug` | Espace partenaire (code d'accès personnel) |

## Tables Supabase
| Table | Champs principaux |
|-------|-------------------|
| `orders` | Commandes Snack Bodrum |
| `candidates` | `nom, categorie, google_maps, telephone, description, reduction, email, status, horaires jsonb, infos_complementaires, slug, access_code, photo_url` |
| `visits` | `qr_code_id, partner_id, client_name, expires_at, scanned, scanned_at` |
| `page_views` | `partner_id, created_at` |
| `menu_items` | `partner_id, nom, description, prix, photo_url` |
| `analyses` | Analyses dashboard IA |

## Variables d'environnement (Vercel)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANTHROPIC_API_KEY
VITE_DASHBOARD_PASSWORD
VITE_ELEVENLABS_API_KEY
```

## ElevenLabs
- Agent ID : `agent_3801kpzkh35qfsaad81savww2sh0`
- Phone number ID : `phnum_0601kq5q01tves1syvmw2kzk5jnd`
- Numéro test : `+33778780353` — **À REMPLACER par `+33625951075`**

## Pièges connus
- **Terminal** : ne jamais copier-coller, taper manuellement
- **Env vars** : `import.meta.env.VITE_` (pas `process.env`) — spécifique Vite
- **ElevenLabs** : l'agent hallucine si les variables sont séparées → toujours passer un script complet via `{{script}}`
- **Photos base64** : attention à la taille des images, peut dépasser les limites de colonnes Supabase
- **node_modules** : exclu du git depuis le nettoyage du 27 mai
