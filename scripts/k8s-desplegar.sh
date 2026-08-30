#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# k8s-desplegar.sh — Despliegue del Sistema de Gestion de Mantenimiento en Kubernetes
#
# Requisitos: kubectl apuntando al cluster, docker corriendo, .env en la raiz
# (si no existe, generarlo antes con: python scripts/coordinador.py 15).
#
# Uso:
#   ./scripts/k8s-desplegar.sh            # usa imagenes existentes si hay
#   ./scripts/k8s-desplegar.sh --build    # reconstruye las imagenes antes de desplegar
#
# Referencia: vault GIFT-MANTENIMIENTO-DATACEF/05-MEJORAS/06-prd-kubernetes.md
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BUILD=0
[ "${1:-}" = "--build" ] && BUILD=1

command -v kubectl >/dev/null || { echo "[ERROR] kubectl no disponible"; exit 1; }
command -v docker  >/dev/null || { echo "[ERROR] docker no disponible";  exit 1; }
[ -f "$ROOT/.env" ] || { echo "[ERROR] Falta .env (genera uno con: python scripts/coordinador.py 15)"; exit 1; }

echo "==> 1/5 Construyendo imagenes locales (mmtto/*:local)"
if [ "$BUILD" = "1" ] || ! docker image inspect mmtto/backend:local >/dev/null 2>&1; then
  docker build -t mmtto/backend:local "$ROOT/backend"
fi
if [ "$BUILD" = "1" ] || ! docker image inspect mmtto/frontend:local >/dev/null 2>&1; then
  # shellcheck disable=SC2046
  set -a; source "$ROOT/.env"; set +a
  docker build -t mmtto/frontend:local \
    --build-arg "NEXT_PUBLIC_PARSE_APP_ID=${NEXT_PUBLIC_PARSE_APP_ID:?define NEXT_PUBLIC_PARSE_APP_ID en .env}" \
    --build-arg "NEXT_PUBLIC_PARSE_JS_KEY=${NEXT_PUBLIC_PARSE_JS_KEY:?define NEXT_PUBLIC_PARSE_JS_KEY en .env}" \
    --build-arg "NEXT_PUBLIC_PARSE_SERVER_URL=${NEXT_PUBLIC_PARSE_SERVER_URL:?define NEXT_PUBLIC_PARSE_SERVER_URL en .env}" \
    "$ROOT/frontend"
fi
if [ "$BUILD" = "1" ] || ! docker image inspect mmtto/ollama:local >/dev/null 2>&1; then
  docker build -t mmtto/ollama:local "$ROOT/backend/llm"
fi
if [ "$BUILD" = "1" ] || ! docker image inspect mmtto/llm-api:local >/dev/null 2>&1; then
  docker build -t mmtto/llm-api:local "$ROOT/backend/llm-api"
fi

echo "==> 2/5 Namespace mmtto"
kubectl create namespace mmtto --dry-run=client -o yaml | kubectl apply -f - >/dev/null

echo "==> 3/5 Secret mmtto-env desde .env (nunca se versiona)"
kubectl -n mmtto create secret generic mmtto-env \
  --from-env-file="$ROOT/.env" \
  --dry-run=client -o yaml | kubectl apply -f - >/dev/null

echo "==> 4/5 Aplicando manifiestos (kustomize)"
kubectl apply -k "$ROOT/k8s"

echo "==> 5/5 Esperando rollouts"
kubectl -n mmtto rollout status statefulset/mongodb --timeout=600s
for d in backend frontend ollama llm-api nginx; do
  kubectl -n mmtto rollout status "deploy/$d" --timeout=600s
done

echo
echo "============================================================"
echo "  Despliegue Kubernetes completado"
echo "  - App:      http://localhost:30371  (NodePort nginx)"
echo "  - API:      http://localhost:30371/api/parse"
echo "  - Pod (restart tras cambiar el Secret):"
echo "      kubectl -n mmtto rollout restart deploy"
echo "============================================================"
