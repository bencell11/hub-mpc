# CLAUDE.md - Hub MCP Local

Ce fichier fournit le contexte à Claude Code pour travailler sur ce projet.

## Vue d'ensemble du projet

Hub MCP Local est une plateforme de gestion de projet assistée par IA. Elle permet de:
- Connecter des outils externes (email, Telegram, calendrier, fichiers)
- Indexer et stocker des contenus (documents, transcriptions, notes, décisions)
- Interagir via un agent IA capable de rechercher, comprendre et agir

## Architecture

### Stack technique
- **Frontend**: Next.js 15 (App Router) + TypeScript + TailwindCSS
- **Backend**: Next.js API Routes
- **Base de données**: Supabase (PostgreSQL + pgvector + Storage + Auth)
- **Jobs**: BullMQ + Redis
- **IA**: OpenAI (GPT-4o, Whisper, text-embedding-3-small)

### Structure des dossiers

```
hub-mcp/
├── src/
│   ├── app/                    # Pages et routes API Next.js
│   │   ├── api/                # Routes API
│   │   │   ├── chat/           # API de chat avec l'assistant
│   │   │   └── tools/          # API d'exécution d'outils
│   │   ├── auth/               # Pages d'authentification
│   │   └── dashboard/          # Pages du tableau de bord
│   ├── components/
│   │   ├── ui/                 # Composants UI réutilisables
│   │   ├── layout/             # Layout, sidebar, header
│   │   └── chat/               # Interface de chat
│   ├── lib/
│   │   ├── supabase/           # Client Supabase (browser, server, middleware)
│   │   ├── tools/              # Tool Registry et Policy Engine
│   │   │   ├── builtin/        # Outils intégrés
│   │   │   ├── registry.ts     # Registre des outils
│   │   │   └── policy-engine.ts # Moteur de politiques
│   │   ├── connectors/         # Connecteurs externes
│   │   ├── jobs/               # Pipeline d'ingestion (BullMQ)
│   │   │   └── processors/     # Processeurs de jobs
│   │   ├── ai/                 # Fonctions IA (chat, embeddings)
│   │   └── utils.ts            # Utilitaires
│   ├── types/                  # Types TypeScript
│   └── stores/                 # Stores Zustand (optionnel)
├── supabase/
│   └── migrations/             # Migrations SQL
└── public/                     # Assets statiques
```

## Commandes de développement

```bash
# Développement
npm run dev          # Démarre le serveur Next.js (localhost:3000)

# Production
npm run build        # Build l'application
npm run start        # Démarre en mode production

# Worker (dans un terminal séparé)
npx tsx src/lib/jobs/worker.ts   # Lance le worker BullMQ

# Linting
npm run lint         # Vérifie le code avec ESLint
```

## Configuration requise

Créer un fichier `.env.local` basé sur `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
REDIS_URL=redis://localhost:6379
```

## Concepts clés

### Tool Registry
Système d'outils extensible où chaque outil définit:
- `name`, `description`: Identifiant et description
- `inputSchema`, `outputSchema`: Schémas Zod de validation
- `riskLevel`: LOW, MEDIUM, HIGH
- `requiresConfirmation`: Si une confirmation utilisateur est requise
- `execute`: Fonction d'exécution

### Policy Engine
Contrôle les permissions et quotas:
- Opérations de lecture/écriture autorisées
- Chemins de fichiers autorisés/bloqués
- Domaines web autorisés
- Quotas (tokens LLM, minutes audio, stockage)
- Redaction PII optionnelle

### Connecteurs
Architecture plugin pour sources externes:
- `EmailConnector`: Gmail (OAuth) ou IMAP
- `TelegramConnector`: Bot Telegram

### Pipeline d'ingestion
Jobs BullMQ pour traitement asynchrone:
- `process-document`: Extraction de texte PDF/images
- `process-audio`: Transcription Whisper
- `generate-embeddings`: Génération d'embeddings
- `generate-summary`: Résumé IA avec extraction de décisions/actions

### Recherche sémantique
- Embeddings OpenAI (text-embedding-3-small, 1536 dimensions)
- Stockage dans pgvector
- Recherche par similarité cosinus

## Schéma de base de données

Tables principales:
- `workspaces`: Organisations multi-tenant
- `workspace_members`: Membres avec rôles
- `projects`: Projets
- `documents`, `emails`, `meetings`: Contenus
- `notes`, `decisions`, `tasks`: Objets créés
- `timeline_events`: Fil d'activité
- `connectors`: Connecteurs configurés
- `tool_registry`, `tool_calls`: Outils et exécutions
- `audit_logs`: Journalisation
- `embeddings`: Vecteurs pour recherche sémantique
- `chat_sessions`, `chat_messages`: Historique de chat

## Sécurité

- Row Level Security (RLS) sur toutes les tables
- Multi-tenant via `workspace_id`
- Confirmation requise pour actions à haut risque
- Audit log de toutes les actions

## Prochaines étapes suggérées

1. **Connecteurs additionnels**: Calendar (Google Calendar), Storage (Drive, Dropbox)
2. **Amélioration transcription**: Diarisation des locuteurs
3. **Export PDF/DOCX**: Export des comptes rendus
4. **Notifications temps réel**: Supabase Realtime
5. **Tests**: Jest + Testing Library
