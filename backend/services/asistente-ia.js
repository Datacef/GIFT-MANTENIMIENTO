/**
 * Cliente del servidor de IA local (modulo ollamaLocal, FastAPI) para el
 * asistente de ayuda del manual de usuario.
 *
 * Seguridad de la comunicacion (debe coincidir con api/main.py de ollamaLocal):
 *  - Header `X-Api-Token` con el token compartido (env ASISTENTE_IA_TOKEN).
 *  - `X-Timestamp` (epoch segundos, ventana anti-replay de ±300 s en el servidor).
 *  - `X-Signature`: HMAC-SHA256(secreto, `${timestamp}.${cuerpo}`) en hex
 *    (env ASISTENTE_IA_SECRET).
 *  - Si hay secreto configurado, el cuerpo viaja CIFRADO con AES-256-GCM
 *    (`X-Encrypted: 1`, clave = SHA256(secreto), sobre {"nonce","data"} en b64)
 *    y la respuesta llega cifrada de la misma forma. La confidencialidad del
 *    canal se completa desplegando el servidor con HTTPS/TLS.
 *
 * El token y el secreto viven SOLO en el backend: el navegador nunca los ve
 * (el frontend llama a la Cloud Function `consultarAsistenteIA`).
 *
 * Referencia: vault GIFT-MANTENIMIENTO-DATACEF/03-ACTUALIZACIONES/07-act-modulo-ayuda-asistente.md
 */

const crypto = require('crypto');

const URL_BASE = (process.env.ASISTENTE_IA_URL || '').replace(/\/+$/, '');
const TOKEN = (process.env.ASISTENTE_IA_TOKEN || '').trim();
const SECRETO = (process.env.ASISTENTE_IA_SECRET || '').trim();
const MODELO = (process.env.ASISTENTE_IA_MODEL || 'qwen2.5:7b').trim();
const ENABLED = process.env.ASISTENTE_IA_ENABLED === 'true';

function disponible() {
  return ENABLED && !!URL_BASE;
}

function estado() {
  return {
    enabled: ENABLED,
    urlDefinida: !!URL_BASE,
    tokenDefinido: !!TOKEN,
    secretoDefinido: !!SECRETO,
    cifradoActivo: !!SECRETO,
    modelo: MODELO,
  };
}

function _claveAES() {
  return crypto.createHash('sha256').update(SECRETO || TOKEN).digest();
}

function cifrarSobre(texto) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', _claveAES(), iv);
  const ct = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  return JSON.stringify({
    nonce: iv.toString('base64'),
    data: Buffer.concat([ct, cipher.getAuthTag()]).toString('base64'),
  });
}

function descifrarSobre(jsonTexto) {
  const sobre = JSON.parse(jsonTexto);
  const iv = Buffer.from(sobre.nonce, 'base64');
  const data = Buffer.from(sobre.data, 'base64');
  const tag = data.subarray(data.length - 16);
  const ct = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', _claveAES(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

async function _post(ruta, objeto, timeoutMs = parseInt(process.env.ASISTENTE_IA_TIMEOUT_MS || '240000', 10)) {
  const ts = Math.floor(Date.now() / 1000).toString();
  let cuerpo = JSON.stringify(objeto);
  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Token': TOKEN,
    'X-Timestamp': ts,
  };
  if (SECRETO) {
    headers['X-Encrypted'] = '1';
    cuerpo = cifrarSobre(cuerpo);
  }
  headers['X-Signature'] = crypto
    .createHmac('sha256', SECRETO || TOKEN)
    .update(`${ts}.${cuerpo}`, 'utf8')
    .digest('hex');

  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const resp = await fetch(`${URL_BASE}${ruta}`, {
      method: 'POST',
      headers,
      body: cuerpo,
      signal: controlador.signal,
    });
    const textoResp = await resp.text();
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${textoResp.slice(0, 200)}`);
    }
    if (resp.headers.get('X-Encrypted') === '1') {
      return JSON.parse(descifrarSobre(textoResp));
    }
    return JSON.parse(textoResp);
  } finally {
    clearTimeout(timer);
  }
}

function construirPrompt(pregunta, contexto) {
  const bloques = (contexto || [])
    .map((c, i) => `--- Seccion ${i + 1}: ${c.titulo || ''} ---\n${c.contenido || ''}`)
    .join('\n\n');
  return [
    'Eres el asistente de ayuda del Sistema de Gestion de Mantenimiento (plataforma web para establecimientos de salud en Chile).',
    'Responde SOLO con base en el contexto del manual de usuario que se entrega abajo.',
    'Reglas:',
    '1. Si la respuesta no esta en el contexto, dilo claramente y sugiere a que seccion del manual ir (lista de titulos del contexto).',
    '2. Responde en espanol, paso a paso cuando corresponda, de forma breve y practica.',
    '3. No inventes funcionalidades, botones o rutas que no aparecen en el contexto.',
    '4. Al final, indica en una linea "Seccion: <titulo>" que seccion del manual usaste.',
    '',
    '=== CONTEXTO DEL MANUAL DE USUARIO ===',
    bloques,
    '=== FIN DEL CONTEXTO ===',
    '',
    `Pregunta del usuario: ${pregunta}`,
  ].join('\n');
}

/**
 * Consulta al asistente. contexto: [{titulo, contenido}] seleccionado por el
 * frontend con su buscador (retrieval simple del manual).
 */
async function consultar({ pregunta, contexto = [] }) {
  if (!disponible()) {
    return { disponible: false, motivo: 'El asistente IA no esta configurado en este servidor (ASISTENTE_IA_ENABLED/URL).' };
  }
  const prompt = construirPrompt(pregunta, contexto);
  const r = await _post('/analizar/generico', {
    prompt,
    modelo: MODELO,
    temperatura: 0.2,
    max_tokens: 700,
  });
  return {
    disponible: true,
    respuesta: (r.texto || '').trim(),
    metadata: r.metadata || {},
  };
}

async function verificarSalud() {
  const resp = await fetch(`${URL_BASE}/salud`, { signal: AbortSignal.timeout(10000) });
  return await resp.json();
}

module.exports = { disponible, estado, consultar, verificarSalud, _internos: { cifrarSobre, descifrarSobre } };
