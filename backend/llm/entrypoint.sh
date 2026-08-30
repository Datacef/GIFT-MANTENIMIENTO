#!/bin/sh
# Arranca ollama y descarga el modelo configurado si aun no existe.
# El volumen (ollama_data) persiste los modelos: el pull solo ocurre el primer arranque.
# Nota: la imagen ollama/ollama no trae curl; se usa el propio CLI (ollama list) como healthcheck.

ollama serve &
PID_SERVE=$!

# Esperar a que la API de ollama responda (via CLI, hasta ~60 s)
i=0
until ollama list >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 60 ]; then
    echo "[llm] ERROR: ollama serve no respondio"
    exit 1
  fi
  sleep 1
done
echo "[llm] ollama serve listo"

if [ -n "$OLLAMA_MODEL" ]; then
  if ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
    echo "[llm] Modelo $OLLAMA_MODEL ya presente"
  else
    echo "[llm] Descargando modelo $OLLAMA_MODEL (solo primer arranque)..."
    ollama pull "$OLLAMA_MODEL" || echo "[llm] AVISO: no se pudo descargar el modelo (sin internet?). Reintentara en el proximo arranque."
  fi
fi

wait $PID_SERVE
