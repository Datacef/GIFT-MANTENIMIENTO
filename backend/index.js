const express = require('express');
const { ParseServer } = require('parse-server');
const path = require('path');
const parseServerConfig = require('./parse-config');
const { initSuperAdmin } = require('./init-super-admin');
const { validateEnvOrExit } = require('./validate-env');

const app = express();

// Middleware de CORS para todas las rutas (antes de Parse Server)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-Parse-Master-Key, X-Parse-REST-API-Key, X-Parse-Javascript-Key, X-Parse-Application-Id, X-Parse-Client-Version, X-Parse-Session-Token, X-Requested-With, X-Parse-Revocable-Session, Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Configuración del servidor Parse usando configuración consolidada
const parseServer = new ParseServer({
  ...parseServerConfig,
  cloud: process.env.PARSE_SERVER_CLOUD_PATH || path.join(__dirname, 'cloud', 'main.js'), // Habilitado para cloud functions
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info'
});

// Inicializar Parse Server antes de usarlo
async function startServer() {
  try {
    // Esperar a que MongoDB esté disponible
    await waitForMongoDB();
    
    console.log('🚀 Iniciando Parse Server...');
    await parseServer.start();
    console.log('✅ Parse Server iniciado correctamente');
    
    // Montar Parse Server en Express usando la API recomendada
    app.use('/parse', parseServer.app);
    
    // Configurar manejo de errores de conexión de MongoDB
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      if (reason && reason.message && reason.message.includes('MongoServerSelectionError')) {
        console.log('🔄 Error de conexión a MongoDB detectado, reintentando en 10 segundos...');
        setTimeout(() => {
          process.exit(1); // El contenedor se reiniciará automáticamente
        }, 10000);
      }
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar Parse Server:', error);
    if (error.message.includes('MongoDB')) {
      console.log('🔄 Problema con MongoDB, reintentando en 15 segundos...');
      setTimeout(() => {
        process.exit(1); // El contenedor se reiniciará automáticamente
      }, 15000);
    } else {
      process.exit(1);
    }
  }
}

// Función para esperar a que MongoDB esté disponible
async function waitForMongoDB() {
  const { MongoClient } = require('mongodb');
  const mongoUrl = parseServerConfig.databaseURI;
  
  console.log('🔄 Esperando a que MongoDB esté disponible...');
  console.log(`📍 URL de conexión: ${mongoUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);
  
  const maxRetries = 60; // Aumentar a 60 intentos (2 minutos)
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      console.log(`🔍 Verificando conectividad a MongoDB (intento ${retries + 1}/${maxRetries})...`);
      
      // Test de conectividad básica primero
      const { execSync } = require('child_process');
      try {
        // Intentar ping al host mongodb
        execSync('ping -c 1 mongodb', { stdio: 'pipe', timeout: 5000 });
        console.log('✅ Host "mongodb" es alcanzable');
      } catch (pingError) {
        console.log('⚠️  Host "mongodb" no responde a ping, intentando conexión directa...');
      }
      
      const client = new MongoClient(mongoUrl, {
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 1
      });
      
      console.log('🔗 Intentando conectar a MongoDB...');
      await client.connect();
      console.log('💾 Verificando base de datos...');
      await client.db().admin().ping();
      await client.close();
      console.log('✅ MongoDB está disponible y respondiendo correctamente');
      return;
    } catch (error) {
      retries++;
      console.log(`❌ Intento ${retries}/${maxRetries} falló: ${error.message}`);
      
      if (error.message.includes('ENOTFOUND')) {
        console.log('🔍 Error de DNS: no se puede resolver "mongodb". Verificando configuración de red...');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('🚫 Conexión rechazada: MongoDB puede no estar listo aún.');
      } else if (error.message.includes('Authentication failed')) {
        console.log('🔐 Error de autenticación: verificar credenciales de MongoDB.');
        throw error; // No reintentar errores de autenticación
      }
      
      if (retries < maxRetries) {
        console.log(`⏳ Esperando 3 segundos antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos
      }
    }
  }
  
  throw new Error(`❌ MongoDB no está disponible después de ${maxRetries} intentos (${maxRetries * 3} segundos)`);
}

// Ruta de bienvenida básica con información del servidor
app.get('/', function(req, res) {
  const serverInfo = {
    status: 'Parse Server está funcionando',
    version: require('./package.json').version || '1.0.0',
    serverURL: parseServerConfig.serverURL,
    publicServerURL: parseServerConfig.publicServerURL,
    appId: parseServerConfig.appId,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(serverInfo);
});

// Ruta de salud del servidor
app.get('/health', function(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Puerto en el que escucha el servidor
const port = process.env.PARSE_PORT || process.env.PORT || 1337;
const host = process.env.HOST || '0.0.0.0';

// Función principal para inicializar el servidor
async function main() {
  try {
    // Bloquear el arranque si las credenciales están ausentes, sin actualizar o son débiles
    validateEnvOrExit();

    await startServer();
    
    const httpServer = app.listen(port, host, function() {
      console.log('='.repeat(60));
      console.log('🚀 Parse Server ejecutándose');
      console.log('='.repeat(60));
      console.log(`📡 Puerto: ${port}`);
      console.log(`🌐 Host: ${host}`);
      console.log(`🔗 Server URL: ${parseServerConfig.serverURL}`);
      console.log(`🌍 Public URL: ${parseServerConfig.publicServerURL}`);
      console.log(`🆔 App ID: ${parseServerConfig.appId}`);
      console.log(`📁 Cloud code: ${process.env.PARSE_SERVER_CLOUD_PATH || path.join(__dirname, 'cloud', 'main.js')}`);
      console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(60));
      console.log('✅ Servidor listo para recibir conexiones');

      // Inicializar LiveQuery Server (WebSockets) para actualizaciones en tiempo real
      try {
        ParseServer.createLiveQueryServer(httpServer);
        console.log('🔌 LiveQuery Server (WebSockets) iniciado correctamente');
      } catch (lqError) {
        console.warn('⚠️  No se pudo iniciar LiveQuery Server:', lqError.message);
      }

      // Inicializar super admin por defecto (con delay para que Parse esté listo)
      setTimeout(() => {
        initSuperAdmin().catch(err => console.error('Error en initSuperAdmin:', err));
      }, 3000);
    });
  } catch (error) {
    console.error('Error al inicializar el servidor:', error);
    process.exit(1);
  }
}

// Ejecutar el servidor
main();