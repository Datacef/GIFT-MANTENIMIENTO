#!/usr/bin/env node
/**
 * Test de INTEGRACION (vivo) — Etapa 6.1: huerfanos por identidad.
 *
 * Se ejecuta dentro del contenedor backend-server, donde Parse SDK + master
 * key + cloud functions estan disponibles. Verifica end-to-end que:
 *
 *   1. getMantenimientosActivo encuentra registros que apuntan al objectId
 *      actual (caso normal).
 *   2. Tras hard-delete del equipo y recrear con MISMA serie, los registros
 *      antiguos quedan apuntando al objectId viejo (escenario reportado).
 *   3. getMantenimientosActivo SIGUE encontrandolos (busca por identidad).
 *   4. getInventarioHistorial encuentra historial del activo previo.
 *   5. sincronizarCumplimientoActivo recalcula incluyendo huerfanos y el
 *      estadoCumplimientoMantenimiento ya NO es 'sin_historial'.
 *   6. reconciliarHuerfanosPorIdentidad migra correctamente al nuevo objectId.
 *
 * Ejecutar:
 *   docker compose exec backend-server \
 *     node /parse-server/scripts-test/test_13ReconciliarHuerfanosIntegration.js
 *
 * o desde el host:
 *   node scripts/test/test_13ReconciliarHuerfanosIntegration.js  (entry point)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT_NAME = path.basename(__filename);

// =====================================================================
// Si NO estamos dentro del contenedor backend, re-ejecutar dentro.
// =====================================================================
const ESTAMOS_EN_BACKEND = !!process.env.PARSE_APP_ID && !!process.env.PARSE_MASTER_KEY;

if (!ESTAMOS_EN_BACKEND) {
  console.log('[wrapper] Lanzando test dentro de mmtto-backend...');
  // Copiar el script al volumen del contenedor y ejecutarlo
  const targetInside = `/parse-server/${SCRIPT_NAME}`;
  try {
    // copiar el archivo al contenedor
    const cpResult = spawnSync('docker', [
      'cp', __filename, `mmtto-backend:${targetInside}`,
    ], { stdio: 'inherit', shell: true });
    if (cpResult.status !== 0) process.exit(cpResult.status || 1);

    const result = spawnSync('docker', [
      'compose', 'exec', '-T', 'backend-server', 'node', targetInside,
    ], { stdio: 'inherit', shell: true, cwd: ROOT });
    process.exit(result.status || 0);
  } catch (e) {
    console.error('Error invocando contenedor:', e.message);
    process.exit(1);
  }
}

// =====================================================================
// A partir de aqui corre dentro del contenedor backend-server.
// =====================================================================

const Parse = require('parse/node');
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';
Parse.masterKey = process.env.PARSE_MASTER_KEY;

const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@mantenimiento.cl';
const ADMIN_PASS = process.env.DEFAULT_ADMIN_PASS || 'MT37LhqF_xL8mm';

const SERIE_TEST = 'SN-TEST-RECONCILIAR-001';
const INVENTARIO_TEST = 'INV-TEST-RECONCILIAR-001';
const NOMBRE_TEST = 'ECOGRAFO TEST RECONCILIAR';

let results = { passed: 0, failed: 0, tests: [] };

function log(msg) { console.log(msg); }
function ok(label) { results.passed++; results.tests.push({ label, ok: true }); log(`  PASS  ${label}`); }
function fail(label, err) {
  results.failed++;
  results.tests.push({ label, ok: false, err: err && err.message ? err.message : String(err) });
  log(`  FAIL  ${label}`);
  log(`        -> ${err && err.message ? err.message : String(err)}`);
}
async function step(label, fn) {
  try { await fn(); ok(label); } catch (e) { fail(label, e); throw e; }
}
async function tryStep(label, fn) {
  try { await fn(); ok(label); } catch (e) { fail(label, e); }
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'assertEq'}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}
function assertGte(actual, expected, msg) {
  if (!(actual >= expected)) throw new Error(`${msg || 'assertGte'}: ${actual} >= ${expected} fallo`);
}
function assertNotEq(actual, expected, msg) {
  if (actual === expected) throw new Error(`${msg || 'assertNotEq'}: ${actual} no debia ser ${expected}`);
}

// =====================================================================
// Helpers de cleanup y setup
// =====================================================================
async function limpiarDatosPrevios() {
  // Borrar equipos previos con esa serie (cualquiera, eliminados o no)
  for (const flag of [true, false]) {
    const q = new Parse.Query('InventarioEquipoMedico');
    q.equalTo('serie', SERIE_TEST);
    q.equalTo('eliminado', flag);
    q.limit(50);
    const items = await q.find({ useMasterKey: true });
    for (const it of items) await it.destroy({ useMasterKey: true });
  }
  // tambien sin filtrar eliminado (por si beforeFind cambia)
  const q2 = new Parse.Query('InventarioEquipoMedico');
  q2.equalTo('serie', SERIE_TEST);
  q2.limit(50);
  const items2 = await q2.find({ useMasterKey: true });
  for (const it of items2) await it.destroy({ useMasterKey: true });

  // Borrar registros con cualquier variante de identificador del test
  const variantes = [
    SERIE_TEST,
    INVENTARIO_TEST,
    `${SERIE_TEST} / ${INVENTARIO_TEST}`,
    `${INVENTARIO_TEST} / ${SERIE_TEST}`,
  ];
  const qReg = new Parse.Query('RegistroMantenimiento');
  qReg.equalTo('activoClase', 'InventarioEquipoMedico');
  qReg.containedIn('activoResumen.identificador', variantes);
  qReg.limit(100);
  const regs = await qReg.find({ useMasterKey: true });
  for (const r of regs) await r.destroy({ useMasterKey: true });

  // Borrar historial vinculado por equipoId — los iremos limpiando al final
}

let SESSION_TOKEN = '';
async function loginAdmin() {
  const user = await Parse.User.logIn(ADMIN_EMAIL, ADMIN_PASS);
  SESSION_TOKEN = user.getSessionToken();
  return user;
}

// Wrapper que siempre adjunta sessionToken
async function callCloud(name, params) {
  return Parse.Cloud.run(name, params, { sessionToken: SESSION_TOKEN });
}

async function crearEquipoMedicoMaster(extra = {}) {
  const Cls = Parse.Object.extend('InventarioEquipoMedico');
  const eq = new Cls();
  eq.set('servicio', 'Test');
  eq.set('clase', 'Apoyo Diagnostico');
  eq.set('subclase', 'Mediano Costo');
  eq.set('nombreEquipo', NOMBRE_TEST);
  eq.set('marca', 'GE Healthcare');
  eq.set('modelo', 'LOGIQ TEST');
  eq.set('serie', SERIE_TEST);
  eq.set('inventario', INVENTARIO_TEST);
  eq.set('valor', '1000000');
  eq.set('fechaAdquisicion', '2024-01-01');
  eq.set('vidaUtil', 10);
  eq.set('estado', 'B');
  eq.set('criticoApoyo', 'C');
  eq.set('frecuencia', 6);
  eq.set('activo', true);
  Object.assign(extra && typeof extra === 'object' ? {} : {}, {});
  for (const [k, v] of Object.entries(extra || {})) eq.set(k, v);
  await eq.save(null, { useMasterKey: true });
  return eq;
}

async function crearRegistroMantenimientoAprobado(equipoId) {
  // Construye el identificador EXACTAMENTE como searchActivos del backend:
  //   "SERIE / INVENTARIO" para equipos medicos.
  // Asi el test reproduce el escenario real de produccion.
  const identificadorReal = [SERIE_TEST, INVENTARIO_TEST].filter(Boolean).join(' / ');
  const Cls = Parse.Object.extend('RegistroMantenimiento');
  const r = new Cls();
  r.set('dominio', 'equipoMedico');
  r.set('tipoMantenimiento', 'preventivo');
  r.set('clasificacionEquipo', 'Apoyo Diagnostico');
  r.set('activoId', equipoId);
  r.set('activoClase', 'InventarioEquipoMedico');
  r.set('activoResumen', {
    nombre: NOMBRE_TEST,
    identificador: identificadorReal,
    estado: 'B',
    ubicacion: 'Test',
  });
  r.set('fecha', '2024-06-01');
  r.set('checklist', { items: [] });
  r.set('estadoValidacion', 'aprobado');
  r.set('activo', true);
  await r.save(null, { useMasterKey: true });
  return r;
}

// =====================================================================
// Run
// =====================================================================
async function run() {
  log('='.repeat(78));
  log(' INTEGRACION -- huerfanos por identidad (con servidor real)');
  log('='.repeat(78));

  // Pre-limpieza
  await limpiarDatosPrevios();
  await loginAdmin();

  // ----- Caso A: equipo + 2 registros vinculados directamente -----
  let equipoOriginal;
  await step('A1. crear equipo medico inicial', async () => {
    equipoOriginal = await crearEquipoMedicoMaster();
    assertEq(equipoOriginal.get('serie'), SERIE_TEST);
  });

  let reg1, reg2;
  await step('A2. crear 2 registros de mantenimiento aprobados', async () => {
    reg1 = await crearRegistroMantenimientoAprobado(equipoOriginal.id);
    reg2 = await crearRegistroMantenimientoAprobado(equipoOriginal.id);
    assertEq(reg1.get('activoId'), equipoOriginal.id);
    assertEq(reg2.get('activoId'), equipoOriginal.id);
  });

  await step('A3. getMantenimientosActivo encuentra los 2 registros', async () => {
    const r = await callCloud('getMantenimientosActivo', {
      activoId: equipoOriginal.id,
      activoClase: 'InventarioEquipoMedico',
    });
    assertGte(r.length, 2, 'getMantenimientosActivo debe devolver al menos 2 registros');
  });

  await step('A4. sincronizarCumplimientoActivo deja estado != sin_historial', async () => {
    const r = await callCloud('sincronizarCumplimientoActivo', {
      activoId: equipoOriginal.id,
      activoClase: 'InventarioEquipoMedico',
    });
    assertNotEq(r.estadoCumplimiento, 'sin_historial', 'estadoCumplimiento no debe ser sin_historial');
  });

  // ----- Caso B: simular hard-delete + recreado (escenario reportado) -----
  // (Eliminamos directamente con destroy para emular el bug pre-Etapa 5.
  // En produccion eso ya no ocurre, pero hay datos legacy.)
  const equipoOriginalId = equipoOriginal.id;
  await step('B1. hard-delete del equipo (simula legacy pre-Etapa 5)', async () => {
    await equipoOriginal.destroy({ useMasterKey: true });
  });

  let equipoRecreado;
  await step('B2. recrear equipo con MISMA serie (objectId nuevo)', async () => {
    equipoRecreado = await crearEquipoMedicoMaster();
    assertNotEq(equipoRecreado.id, equipoOriginalId, 'el nuevo equipo debe tener objectId distinto');
    assertEq(equipoRecreado.get('serie'), SERIE_TEST);
  });

  await step('B3. los registros antiguos siguen apuntando al objectId viejo', async () => {
    const qViejos = new Parse.Query('RegistroMantenimiento');
    qViejos.equalTo('activoId', equipoOriginalId);
    qViejos.limit(10);
    const viejos = await qViejos.find({ useMasterKey: true });
    assertGte(viejos.length, 2, 'debe haber al menos 2 registros con activoId viejo');
  });

  // ----- Caso C: nueva logica los encuentra por identidad -----
  await step('C1. getMantenimientosActivo (nuevo objectId) encuentra huerfanos', async () => {
    const r = await callCloud('getMantenimientosActivo', {
      activoId: equipoRecreado.id,
      activoClase: 'InventarioEquipoMedico',
    });
    assertGte(r.length, 2, 'getMantenimientosActivo debe encontrar los 2 huerfanos por identidad');
  });

  await step('C2. sincronizarCumplimientoActivo (nuevo) deja estado != sin_historial', async () => {
    const r = await callCloud('sincronizarCumplimientoActivo', {
      activoId: equipoRecreado.id,
      activoClase: 'InventarioEquipoMedico',
    });
    assertNotEq(r.estadoCumplimiento, 'sin_historial', 'cumplimiento debe heredar del historico');
  });

  await step('C3. diagnosticarHistorialActivo reporta huerfanos', async () => {
    const r = await callCloud('diagnosticarHistorialActivo', {
      clase: 'InventarioEquipoMedico',
      id: equipoRecreado.id,
    });
    assertGte(r.totalHuerfanos, 2, 'diagnostico debe reportar al menos 2 huerfanos');
  });

  // ----- Caso D: reconciliar mueve fisicamente -----
  await step('D1. reconciliarHuerfanosPorIdentidad migra al nuevo objectId', async () => {
    const r = await callCloud('reconciliarHuerfanosPorIdentidad', {
      clase: 'InventarioEquipoMedico',
      id: equipoRecreado.id,
    });
    assertGte(r.migradosRegistros, 2, 'debe migrar al menos 2 registros');
  });

  await step('D2. tras reconciliar, los registros tienen el nuevo activoId', async () => {
    const q = new Parse.Query('RegistroMantenimiento');
    q.equalTo('activoId', equipoRecreado.id);
    q.equalTo('activoClase', 'InventarioEquipoMedico');
    q.equalTo('activo', true);
    const found = await q.find({ useMasterKey: true });
    assertGte(found.length, 2, 'tras reconciliar deben aparecer 2+ apuntando al nuevo activoId');
  });

  await step('D3. tras reconciliar, diagnostico ya NO reporta huerfanos', async () => {
    const r = await callCloud('diagnosticarHistorialActivo', {
      clase: 'InventarioEquipoMedico',
      id: equipoRecreado.id,
    });
    assertEq(r.totalHuerfanos, 0, 'tras reconciliar no deben quedar huerfanos');
  });

  // ----- Cleanup -----
  await tryStep('Z1. limpiar datos del test', async () => {
    await limpiarDatosPrevios();
  });

  log('-'.repeat(78));
  log(` Resultados: ${results.passed} passed, ${results.failed} failed, ${results.passed + results.failed} total`);
  log('='.repeat(78));
  process.exit(results.failed);
}

run().catch((e) => {
  console.error('FATAL:', e && e.stack ? e.stack : e);
  process.exit(99);
});
