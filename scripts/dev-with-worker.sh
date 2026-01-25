#!/bin/bash
# Script pour lancer l'environnement de développement complet
# Usage: ./scripts/dev-with-worker.sh

set -e

echo "🚀 Démarrage de l'environnement Hub MCP..."

# Vérifier si Redis est disponible
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis n'est pas installé localement."
    echo "   Vous pouvez utiliser Docker : docker run -d -p 6379:6379 redis:7-alpine"
    echo "   Ou installer Redis : brew install redis (macOS)"
    exit 1
fi

# Vérifier si Redis est en cours d'exécution
if ! redis-cli ping &> /dev/null; then
    echo "⚠️  Redis n'est pas en cours d'exécution."
    echo "   Démarrez Redis avec : redis-server"
    echo "   Ou avec Docker : docker run -d -p 6379:6379 redis:7-alpine"
    exit 1
fi

echo "✅ Redis est disponible"

# Fonction pour arrêter les processus au Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Arrêt des services..."
    kill $NEXT_PID $WORKER_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Lancer Next.js en arrière-plan
echo "📦 Démarrage de Next.js..."
npm run dev &
NEXT_PID=$!

# Attendre que Next.js soit prêt
sleep 3

# Lancer le worker en arrière-plan
echo "⚙️  Démarrage du worker BullMQ..."
npx tsx src/lib/jobs/worker.ts &
WORKER_PID=$!

echo ""
echo "✨ Hub MCP est prêt !"
echo "   - Application: http://localhost:3000"
echo "   - Worker: En cours d'exécution"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter tous les services"

# Attendre que les processus se terminent
wait $NEXT_PID $WORKER_PID
