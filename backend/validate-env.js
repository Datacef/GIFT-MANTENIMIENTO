/**
 * Validación obligatoria de credenciales al arrancar el backend.
 *
 * Bloquea el inicio del servidor si las variables de entorno están
 * ausentes, sin actualizar (placeholders de .env.example) o son débiles.
 * Esto obliga a cada instalación a generar sus propias credenciales
 * antes de exponer el sistema, evitando despliegues con secretos
 * filtrados o predecibles.
 */

// Variables cuyo valor es un secreto: exigidas, sin placeholder y con longitud mínima.
const SECRET_RULES = [
  { name: 'PARSE_MASTER_KEY', minLength: 20, description: 'Master key de Parse Server' },
  { name: 'PARSE_JS_KEY', minLength: 20, description: 'Javascript key de Parse Server' },
  { name: 'MONGO_ROOT_PASSWORD', minLength: 12, description: 'Contraseña root de MongoDB' },
  { name: 'DEFAULT_ADMIN_PASS', minLength: 10, description: 'Contraseña del super admin inicial' },
  { name: 'BREVO_SMTP_PASS', minLength: 8, description: 'Contraseña SMTP de Brevo', optional: true },
];

// Variables requeridas cuyo valor no es un secreto (identificadores, URLs, usuarios).
const REQUIRED_VARS = [
  'PARSE_APP_ID',
  'PARSE_JS_KEY',
  'PARSE_MASTER_KEY',
  'MONGO_ROOT_USER',
  'MONGO_ROOT_PASSWORD',
  'MONGO_DB',
  'DEFAULT_ADMIN_USER',
  'DEFAULT_ADMIN_PASS',
  'DEFAULT_ADMIN_EMAIL',
];

const PLACEHOLDER_PATTERN = /CAMBIAR_ESTO|CHANGE_?ME|REEMPLAZA[R]?_ESTO|PLACEHOLDER/i;

const WEAK_PASSWORDS = [
  'admin', 'password', 'password123', '123456', '12345678', '123456789',
  'admin123', 'admin1234', 'root', 'qwerty', 'letmein', 'test', 'demo',
  'contrasena', 'mongo', 'secreto', 'secret',
];

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERN.test(value);
}

function isWeakPassword(value) {
  return WEAK_PASSWORDS.includes(value.toLowerCase());
}

function validateEnv() {
  const errors = [];
  const warnings = [];

  for (const name of REQUIRED_VARS) {
    if (!process.env[name]) {
      errors.push(`Falta la variable ${name}.`);
    }
  }

  for (const rule of SECRET_RULES) {
    const value = process.env[rule.name];

    if (!value) {
      // Las obligatorias ya se reportan al validar REQUIRED_VARS; las opcionales solo generan advertencia.
      continue;
    }

    if (isPlaceholder(value)) {
      errors.push(`${rule.name} (${rule.description}) todavía tiene el valor de ejemplo. Debe reemplazarse por una credencial propia.`);
      continue;
    }

    if (value.length < rule.minLength) {
      errors.push(`${rule.name} (${rule.description}) es demasiado corta: mínimo ${rule.minLength} caracteres, actual ${value.length}.`);
      continue;
    }

    if (isWeakPassword(value)) {
      errors.push(`${rule.name} (${rule.description}) usa una contraseña trivial o predecible.`);
    }
  }

  if (process.env.DEFAULT_ADMIN_EMAIL && isPlaceholder(process.env.DEFAULT_ADMIN_EMAIL)) {
    errors.push('DEFAULT_ADMIN_EMAIL todavía tiene el valor de ejemplo. Debe reemplazarse por un correo real.');
  } else if (process.env.DEFAULT_ADMIN_EMAIL && /@(ejemplo|example)\./i.test(process.env.DEFAULT_ADMIN_EMAIL)) {
    warnings.push('DEFAULT_ADMIN_EMAIL apunta a un dominio de ejemplo; verifique que sea un correo real y monitorizable.');
  }

  // Las credenciales públicas del frontend deben coincidir con las del backend.
  if (process.env.NEXT_PUBLIC_PARSE_APP_ID && process.env.PARSE_APP_ID &&
      process.env.NEXT_PUBLIC_PARSE_APP_ID !== process.env.PARSE_APP_ID) {
    errors.push('NEXT_PUBLIC_PARSE_APP_ID no coincide con PARSE_APP_ID.');
  }
  if (process.env.NEXT_PUBLIC_PARSE_JS_KEY && process.env.PARSE_JS_KEY &&
      process.env.NEXT_PUBLIC_PARSE_JS_KEY !== process.env.PARSE_JS_KEY) {
    errors.push('NEXT_PUBLIC_PARSE_JS_KEY no coincide con PARSE_JS_KEY.');
  }

  if (!process.env.BREVO_SMTP_PASS) {
    warnings.push('BREVO_SMTP_PASS no está definida: las notificaciones por correo estarán deshabilitadas.');
  }

  return { errors, warnings };
}

function validateEnvOrExit() {
  const { errors, warnings } = validateEnv();

  warnings.forEach((w) => console.warn(`⚠️  ${w}`));

  if (errors.length > 0) {
    console.error('='.repeat(70));
    console.error('🚨 ARRANQUE BLOQUEADO: credenciales incompletas o sin actualizar 🚨');
    console.error('='.repeat(70));
    console.error('');
    console.error('Por seguridad, el servidor NO se iniciará hasta resolver:');
    errors.forEach((e) => console.error(`  ❌ ${e}`));
    console.error('');
    console.error('Para configurar sus propias credenciales:');
    console.error('  1. Copie las plantillas:  cp .env.example .env  y  cp .env.local.example .env.local');
    console.error('  2. Reemplace TODOS los valores CAMBIAR_ESTO_* por credenciales propias.');
    console.error('     Claves fuertes:  openssl rand -hex 32');
    console.error('  3. Vuelva a levantar los servicios con docker compose.');
    console.error('');
    console.error('Nunca reutilice credenciales de otros despliegues: si se filtraron, deben rotarse.');
    console.error('='.repeat(70));
    process.exit(1);
  }

  console.log('✅ Credenciales validadas: sin placeholders y con longitud mínima exigida.');
  return true;
}

if (require.main === module) {
  validateEnvOrExit();
}

module.exports = { validateEnv, validateEnvOrExit };
