# Hub MCP Local

Hub central de gestion de projet assisté par IA. Connectez vos outils, indexez vos contenus et laissez l'IA vous aider à retrouver, comprendre et agir sur toutes les informations de vos projets.

## Fonctionnalités

- **Gestion de projets** - Organisez documents, emails, réunions et tâches
- **Connecteurs** - Gmail, Telegram, calendriers, fichiers locaux
- **Assistant IA** - Chat intelligent avec recherche sémantique et citations
- **Transcription audio** - Conversion audio vers texte avec Whisper
- **Résumés automatiques** - Extraction de décisions et actions
- **Gouvernance** - Permissions, confirmations, audit complet

## Démarrage rapide

### Prérequis

- Node.js 18+
- Redis (pour les jobs en arrière-plan)
- Compte Supabase
- Clé API OpenAI

### Installation

```bash
# Cloner le projet
git clone <repository-url>
cd hub-mcp

# Installer les dépendances
npm install

# Copier la configuration
cp .env.example .env.local
# Éditer .env.local avec vos clés
```

### Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter le fichier `supabase/migrations/0001_initial_schema.sql`
3. Activer l'extension `vector` dans les paramètres SQL
4. Copier les clés dans `.env.local`

### Lancement

```bash
# Terminal 1 - Application Next.js
npm run dev

# Terminal 2 - Worker de jobs (optionnel, pour traitement des fichiers)
npx tsx src/lib/jobs/worker.ts
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                    Next.js 15 + React                        │
├─────────────────────────────────────────────────────────────┤
│  Dashboard  │  Assistant Chat  │  Projets  │  Connecteurs   │
├─────────────┴──────────────────┴───────────┴────────────────┤
│                       API Routes                             │
│             /api/chat    /api/tools    /api/upload          │
├─────────────────────────────────────────────────────────────┤
│                    Tool Registry                             │
│  add_note │ create_task │ search_emails │ semantic_search  │
├─────────────────────────────────────────────────────────────┤
│                    Policy Engine                             │
│         Permissions │ Confirmations │ Quotas │ Audit        │
├─────────────────────────────────────────────────────────────┤
│                    Connectors                                │
│              Email │ Telegram │ Calendar │ Storage          │
├─────────────────────────────────────────────────────────────┤
│                  Job Queue (BullMQ)                          │
│   Documents │ Audio/Transcription │ Embeddings │ Summaries  │
├─────────────────────────────────────────────────────────────┤
│                     Supabase                                 │
│        PostgreSQL + pgvector + Storage + Auth + RLS         │
└─────────────────────────────────────────────────────────────┘
```

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15, React 19, TailwindCSS |
| Backend | Next.js API Routes |
| Base de données | Supabase (PostgreSQL + pgvector) |
| Authentification | Supabase Auth |
| Stockage | Supabase Storage |
| Jobs | BullMQ + Redis |
| LLM | OpenAI GPT-4o |
| Transcription | OpenAI Whisper |
| Embeddings | OpenAI text-embedding-3-small |

## Critères d'acceptation MVP

- [x] Créer un projet et importer des documents
- [x] Connecter un email et retrouver une info avec citation
- [x] Ajouter une note et la retrouver via chat
- [x] Importer un audio, obtenir transcription + résumé + actions
- [x] Exporter un compte rendu (MD)
- [x] Envoyer un message Telegram avec confirmation
- [x] Journalisation complète (tool calls + audit)

## Commandes

```bash
npm run dev          # Développement
npm run build        # Build production
npm run start        # Production
npm run lint         # Linting
```

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Sécurité

- Row Level Security (RLS) sur toutes les tables
- Multi-tenant avec isolation par workspace
- Confirmation obligatoire pour actions externes
- Audit log complet de toutes les actions
- Chiffrement des credentials des connecteurs

## Licence

MIT
