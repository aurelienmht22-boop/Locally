# Locally — Référence technique

## Routes
| Route | Description |
|-------|-------------|
| `/` | Page d'accueil |
| `/comment-ca-marche` | Explication du fonctionnement |
| `/rejoindre` | Formulaire candidature partenaire |
| `/carte` | Carte Leaflet des partenaires |
| `/compte` | Historique transactions client |
| `/renouveler` | Renouvellement session client |
| `/reset-password` | Réinitialisation mot de passe |
| `/admin` | Back-office (mot de passe : `VITE_DASHBOARD_PASSWORD`) |
| `/partner/:slug` | Espace partenaire (code d'accès personnel) |
| `/hotel/:slug` | Espace hôtel (code d'accès) |

## Tables Supabase
| Table | Champs principaux |
|-------|-------------------|
| `profiles` | `id, email, created_at, session_expires_at` |
| `candidates` | `nom, categorie, google_maps, telephone, description, reduction, email, status, horaires jsonb, infos_complementaires, slug, access_code, photo_url, visible, google_review_url, latitude, longitude` |
| `visits` | `qr_code_id, partner_id, client_name, expires_at, scanned, scanned_at` |
| `transactions` | `partner_id, user_id, amount, reduction, commission, commission_hotel, created_at` |
| `messages` | Messages partenaires ↔ admin et hôtels ↔ admin |
| `menu_items` | `partner_id, nom, description, prix, photo_url` |
| `review_clicks` | `partner_id, user_id, created_at` — tracking clics Google Avis |
| `page_views` | `partner_id, created_at` |
| `analyses` | Analyses dashboard IA |

## Variables d'environnement (Vercel)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_DASHBOARD_PASSWORD
VITE_ANTHROPIC_API_KEY
VITE_ELEVENLABS_API_KEY
VITE_BLAND_API_KEY
VITE_GOOGLE_MAPS_API_KEY
```

## ElevenLabs / Twilio (en commentaire TODO)
- Agent ID : `agent_3801kpzkh35qfsaad81savww2sh0`
- Phone number ID : `phnum_0601kq5q01tves1syvmw2kzk5jnd`
- Vrai numéro Snack Bodrum : `+33625951075`

## Pièges connus
- **`created_at` en INSERT** : ne jamais l'envoyer → géré par `DEFAULT now()`, sinon 403 RLS
- **RLS sans `TO anon`** : les policies ne doivent pas restreindre le rôle, sinon les utilisateurs JWT authenticated voient 0 ligne
- **`rls_apply.sql`** (racine) : script idempotent, à relancer après tout reset Supabase
- **Join transactions→candidates** : impossible (`partner_id TEXT` vs `candidates.id UUID`) → requête séparée + merge JS
- **Cache navigateur** : source de faux bugs → Ctrl+Shift+R pour forcer le rechargement
- **Env vars** : `import.meta.env.VITE_` (pas `process.env`) — spécifique Vite
- **Terminal** : ne jamais copier-coller, taper manuellement
- **ElevenLabs** : toujours passer un script complet via `{{script}}` (l'agent hallucine si variables séparées)
