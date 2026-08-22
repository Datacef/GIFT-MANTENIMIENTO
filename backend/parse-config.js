// Configuración de Parse Server — todos los valores vienen de variables de entorno
// Las claves sensibles se centralizan en .env.local y NO deben hardcodearse aquí.

const parseServerConfig = {
  databaseURI: process.env.PARSE_SERVER_DATABASE_URI ||
    `mongodb://${process.env.MONGO_ROOT_USER}:${process.env.MONGO_ROOT_PASSWORD}@mongodb:27017/${process.env.MONGO_DB || 'parse'}?authSource=admin&retryWrites=true&w=majority`,

  appId: process.env.PARSE_APP_ID,
  masterKey: process.env.PARSE_MASTER_KEY,
  javascriptKey: process.env.PARSE_JS_KEY,

  serverURL: process.env.PARSE_SERVER_URL || 'http://backend-server:1337/parse',
  publicServerURL: process.env.PARSE_PUBLIC_SERVER_URL || 'http://localhost:5771/api/parse',
  mountPath: '/parse',

  // Seguridad
  allowClientClassCreation: true,
  allowInsecureHTTP: true,
  enableAnonymousUsers: false,
  enableSingleSchemaCache: false,
  revokeSessionOnPasswordReset: true,
  verifyUserEmails: false,
  enableEmailSignIn: true,

  masterKeyIps: ['0.0.0.0/0', '127.0.0.1', '::1'],

  // MongoDB options
  databaseOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000
  },

  // Archivos — almacenados en MongoDB via GridFS (built-in)
  maxUploadSize: '20mb',

  // Sesiones
  sessionLength: 31536000,

  // Logs
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',

  // LiveQuery para actualizaciones en tiempo real (WebSockets)
  liveQuery: {
    classNames: [],
  },

  enableExpressErrorHandler: true,

  fileUploadOptions: {
    enableForPublic: true,
    fileUpload: {
      enableForPublic: true,
      enableForAnonymousUser: false,
      enableForAuthenticatedUser: true
    }
  }
};

module.exports = parseServerConfig;
