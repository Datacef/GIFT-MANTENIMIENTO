import Parse from 'parse';

let initialized = false;

export function initParse(): void {
  if (initialized || typeof window === 'undefined') return;

  const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID;
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JS_KEY;
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL || '/api/parse';

  if (!appId || !jsKey) {
    console.warn('Parse: NEXT_PUBLIC_PARSE_APP_ID o NEXT_PUBLIC_PARSE_JS_KEY no definidos');
    return;
  }

  Parse.initialize(appId, jsKey);
  Parse.serverURL = serverURL;

  // LiveQuery WebSocket URL para actualizaciones en tiempo real
  const liveQueryURL = process.env.NEXT_PUBLIC_PARSE_LIVEQUERY_URL;
  if (liveQueryURL) {
    (Parse as any).liveQueryServerURL = liveQueryURL;
  } else if (typeof window !== 'undefined') {
    // Derivar ws:// / wss:// desde la URL actual del navegador
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const parsePath = serverURL.startsWith('/') ? serverURL : '/api/parse';
    (Parse as any).liveQueryServerURL = `${protocol}//${host}${parsePath}`;
  }

  initialized = true;
}

// Auto-inicializar al importar (lado cliente)
if (typeof window !== 'undefined') {
  initParse();
}

export default Parse;
