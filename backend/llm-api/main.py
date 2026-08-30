"""
API segura del LLM local para el asistente de ayuda del Sistema de Gestion de
Mantenimiento (GIFT). Replica el patron de seguridad de ollamaLocal y corre
DENTRO del stack de GIFT (servicio llm-api, junto al contenedor ollama).

Endpoints:
    POST /analizar/generico - prompt de proposito general (usado por el backend GIFT)
    GET  /salud             - healthcheck (sin autenticacion)

Seguridad (activa si LLM_API_TOKEN esta definido; sin el, la API queda abierta
para compatibilidad local):
    - `X-Api-Token`: token compartido (LLM_API_TOKEN).
    - `X-Timestamp`: epoch segundos (ventana +-300 s, anti-replay).
    - `X-Signature`: HMAC-SHA256(LLM_API_SECRET, "{timestamp}.{cuerpo}") en hex.
    - Cifrado opcional AES-256-GCM del cuerpo (request y respuesta) con
      `X-Encrypted: 1`: cuerpo {"nonce": b64, "data": b64}, clave SHA256(secreto).
      Complementar con HTTPS/TLS si se expone fuera del host.
"""

import os
import time
import json
import hmac
import hashlib
import base64
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434").rstrip("/") + "/api/generate"
MODELLO_DEFECTO = os.getenv("LLM_MODEL", "qwen2.5:0.5b")

API_TOKEN = os.getenv("LLM_API_TOKEN", "").strip()
API_SECRET = os.getenv("LLM_API_SECRET", "").strip()
VENTANA_TS_SEGUNDOS = 300

app = FastAPI(
    title="API LLM local — Asistente de Ayuda (GIFT)",
    description="Proxy seguro hacia Ollama para el asistente del manual de usuario.",
    version="1.0.0",
)


# ------------------------------------------------------------------
# Seguridad: token + HMAC + cifrado AES-GCM opcional
# ------------------------------------------------------------------

def _clave_aes() -> bytes:
    return hashlib.sha256((API_SECRET or API_TOKEN).encode("utf-8")).digest()


def cifrar_payload(datos: bytes) -> dict:
    nonce = os.urandom(12)
    ct = AESGCM(_clave_aes()).encrypt(nonce, datos, None)
    return {
        "nonce": base64.b64encode(nonce).decode("ascii"),
        "data": base64.b64encode(ct).decode("ascii"),
    }


def descifrar_payload(nonce_b64: str, data_b64: str) -> bytes:
    aes = AESGCM(_clave_aes())
    return aes.decrypt(base64.b64decode(nonce_b64), base64.b64decode(data_b64), None)


def _rechazo(detalle: str) -> JSONResponse:
    return JSONResponse(status_code=401, content={"detail": detalle})


@app.middleware("http")
async def verificar_autenticacion(request: Request, call_next):
    if not request.url.path.startswith("/analizar"):
        return await call_next(request)

    if not API_TOKEN:
        return await call_next(request)  # modo local sin credenciales

    token_recibido = request.headers.get("X-Api-Token", "")
    if not hmac.compare_digest(token_recibido, API_TOKEN):
        return _rechazo("Token invalido")

    ts = request.headers.get("X-Timestamp", "")
    firma = request.headers.get("X-Signature", "")
    if not ts or not firma:
        return _rechazo("Faltan X-Timestamp o X-Signature")
    try:
        if abs(time.time() - int(ts)) > VENTANA_TS_SEGUNDOS:
            return _rechazo("Timestamp fuera de ventana")
    except ValueError:
        return _rechazo("Timestamp invalido")

    cuerpo = await request.body()
    firma_esperada = hmac.new(
        API_SECRET.encode("utf-8"), f"{ts}.".encode("utf-8") + cuerpo, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(firma, firma_esperada):
        return _rechazo("Firma HMAC invalida")

    cifrado = request.headers.get("X-Encrypted", "") == "1"
    if cifrado:
        try:
            sobre = json.loads(cuerpo.decode("utf-8"))
            cuerpo = descifrar_payload(sobre["nonce"], sobre["data"])
        except Exception:
            return _rechazo("No se pudo descifrar el cuerpo")

    request._body = cuerpo
    respuesta = await call_next(request)

    if cifrado and respuesta.status_code == 200:
        contenido = b""
        async for trozo in respuesta.body_iterator:
            contenido += trozo
        sobre = cifrar_payload(contenido)
        return JSONResponse(status_code=200, content=sobre, headers={"X-Encrypted": "1"})

    return respuesta


# ------------------------------------------------------------------
# Modelos y motor
# ------------------------------------------------------------------

class GenericoEntrada(BaseModel):
    prompt: str = Field(..., min_length=1)
    modelo: str = MODELLO_DEFECTO
    formato_json: bool = False
    temperatura: float = 0.0
    max_tokens: int = 512


def consultar_ollama(prompt: str, modelo: str, temperatura: float, max_tokens: int) -> dict:
    inicio = time.time()
    try:
        respuesta = requests.post(
            OLLAMA_URL,
            json={
                "model": modelo,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": temperatura, "num_predict": max_tokens},
            },
            timeout=300,
        )
        respuesta.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Ollama no disponible: {e}")

    datos = respuesta.json()
    return {
        "texto": datos.get("response", "").strip(),
        "metadata": {
            "modelo": datos.get("model"),
            "duracion_segundos": round(time.time() - inicio, 2),
            "tokens_evaluados": datos.get("eval_count"),
        },
    }


@app.post("/analizar/generico")
def generico(entrada: GenericoEntrada):
    resultado = consultar_ollama(entrada.prompt, entrada.modelo, entrada.temperatura, entrada.max_tokens)
    return {"exito": True, **resultado}


@app.get("/salud")
def salud():
    tags_url = OLLAMA_URL.replace("/api/generate", "/api/tags")
    try:
        r = requests.get(tags_url, timeout=5)
        r.raise_for_status()
        modelos = [m["name"] for m in r.json().get("models", [])]
        return {"ok": True, "modelos_disponibles": modelos, "auth_activa": bool(API_TOKEN)}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama no disponible: {e}")
