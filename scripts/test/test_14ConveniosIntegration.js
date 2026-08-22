#!/usr/bin/env node
/**
 * Test de INTEGRACION (vivo) — Etapa 6.3: convenios huerfanos.
 *
 * Reproduce el escenario donde una `LicitacionEquipo` quedo apuntando al
 * objectId de un equipo eliminado (legacy hard-delete) y verifica que
 * `sincronizarConveniosInventario`:
 *
 *   - Detecta la huerfana.
 *   - Reasigna `LicitacionEquipo.equipoId` al equipo vivo de misma serie.
 *   - Aplica `convenioActivo=true`, RUT/proveedor/numeroLicitacion/fechaTerminoConvenio.
 *
 * Ejecutar:
 *   node scripts/test/test_14ConveniosIntegration.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT_NAME = path.basename(__filename);

const ESTAMOS_EN_BACKEND = !!process.env.PARSE_APP_ID && !!process.env.PARSE_MASTER_KEY;
if (!ESTAMOS_EN_BACKEND) {
  console.log('[wrapper] Lanzando test dentro de mmtto-backend...');
  const targetInside = `/parse-server/${SCRIPT_NAME}`;
  const cp = spawnSync('docker', ['cp', __filename, `mmtto-backend:${targetInside}`], { stdio: 'inherit', shell: true });
  if (cp.status !== 0) process.exit(cp.status || 1);
  const r = spawnSync('docker', ['compose', 'exec', '-T', 'backend-server', 'node', targetInside], {
    stdio: 'inherit', shell: true, cwd: ROOT,
  });
  process.exit(r.status || 0);
}

const Parse = require('parse/node');
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';
Parse.masterKey = process.env.PARSE_MASTER_KEY;

const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@mantenimiento.cl';
const ADMIN_PASS = process.env.DEFAULT_ADMIN_PASS || 'MT37LhqF_xL8mm';

const SERIE_TEST = 'SN-TEST-CONVENIO-001';
const INVENTARIO_TEST = 'INV-TEST-CONVENIO-001';
const NOMBRE_TEST = 'ECOGRAFO TEST CONVENIO';
const RUT_PROV_TEST = '99.999.999-9';
const NOMBRE_PROV_TEST = 'PROVEEDOR TEST CONVENIO';
const NUM_LIC_TEST = 'LIC-TEST-CONVENIO-001';

let SESSION_TOKEN = '';
let results = { passed: 0, failed: 0 };

function log(m) { console.log(m); }
function ok(label) { results.passed++; log(`  PASS  ${label}`); }
function fail(label, err) { results.failed++; log(`  FAIL  ${label}\n        -> ${err && err.message ? err.message : err}`); }
async function step(label, fn) { try { await fn(); ok(label); } catch (e) { fail(label, e); throw e; } }
async function tryStep(label, fn) { try { await fn(); ok(label); } catch (e) { fail(label, e); } }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m || 'assertEq'}: esperado ${JSON.stringify(b)}, recibido ${JSON.stringify(a)}`); }
function assertGte(a, b, m) { if (!(a >= b)) throw new Error(`${m || 'assertGte'}: ${a} >= ${b} fallo`); }
function assertNotEq(a, b, m) { if (a === b) throw new Error(`${m || 'assertNotEq'}: ${a} no debia ser ${b}`); }

async function loginAdmin() {
  const u = await Parse.User.logIn(ADMIN_EMAIL, ADMIN_PASS);
  SESSION_TOKEN = u.getSessionToken();
}
async function callCloud(name, params) {
  return Parse.Cloud.run(name, params, { sessionToken: SESSION_TOKEN });
}

async function limpiar() {
  // Borrar LicitacionEquipo del test
  const qLE = new Parse.Query('LicitacionEquipo');
  qLE.containedIn('serie', [SERIE_TEST]);
  qLE.limit(50);
  const les = await qLE.find({ useMasterKey: true });
  for (const le of les) await le.destroy({ useMasterKey: true });

  // Borrar Licitacion del test
  const qL = new Parse.Query('Licitacion');
  qL.equalTo('numeroLicitacion', NUM_LIC_TEST);
  qL.limit(10);
  const lics = await qL.find({ useMasterKey: true });
  for (const l of lics) await l.destroy({ useMasterKey: true });

  // Borrar Proveedor del test
  const qP = new Parse.Query('Proveedor');
  qP.equalTo('rut', RUT_PROV_TEST);
  qP.limit(10);
  const provs = await qP.find({ useMasterKey: true });
  for (const p of provs) await p.destroy({ useMasterKey: true });

  // Borrar equipos con esa serie (eliminados o no)
  const qE = new Parse.Query('InventarioEquipoMedico');
  qE.equalTo('serie', SERIE_TEST);
  qE.limit(10);
  const eqs = await qE.find({ useMasterKey: true });
  for (const e of eqs) await e.destroy({ useMasterKey: true });
}

async function crearProveedor() {
  const C = Parse.Object.extend('Proveedor');
  const p = new C();
  p.set('rut', RUT_PROV_TEST);
  p.set('nombre', NOMBRE_PROV_TEST);
  p.set('activo', true);
  await p.save(null, { useMasterKey: true });
  return p;
}

async function crearLicitacion(proveedor) {
  const C = Parse.Object.extend('Licitacion');
  const l = new C();
  l.set('numeroLicitacion', NUM_LIC_TEST);
  l.set('proveedorId', proveedor.id);
  l.set('proveedorRut', proveedor.get('rut'));
  l.set('proveedorNombre', proveedor.get('nombre'));
  // Vigencia futura para que sea convenio activo
  const en1Anio = new Date();
  en1Anio.setFullYear(en1Anio.getFullYear() + 1);
  l.set('fechaTermino', en1Anio.toISOString().slice(0, 10));
  l.set('fechaInicio', new Date().toISOString().slice(0, 10));
  l.set('extensiones', []);
  l.set('estado', 'vigente');
  l.set('activo', true);
  await l.save(null, { useMasterKey: true });
  return l;
}

async function crearEquipo() {
  const C = Parse.Object.extend('InventarioEquipoMedico');
  const e = new C();
  e.set('servicio', 'Test');
  e.set('clase', 'Apoyo Diagnostico');
  e.set('subclase', 'Mediano Costo');
  e.set('nombreEquipo', NOMBRE_TEST);
  e.set('marca', 'GE Healthcare');
  e.set('modelo', 'TEST');
  e.set('serie', SERIE_TEST);
  e.set('inventario', INVENTARIO_TEST);
  e.set('valor', '1000000');
  e.set('fechaAdquisicion', '2024-01-01');
  e.set('vidaUtil', 10);
  e.set('estado', 'B');
  e.set('criticoApoyo', 'C');
  e.set('frecuencia', 6);
  e.set('activo', true);
  await e.save(null, { useMasterKey: true });
  return e;
}

async function asociarLicitacion(licitacion, proveedor, equipo) {
  const C = Parse.Object.extend('LicitacionEquipo');
  const le = new C();
  le.set('licitacionId', licitacion.id);
  le.set('proveedorRut', proveedor.get('rut'));
  le.set('equipoId', equipo.id);
  le.set('inventarioTipo', 'medico');
  le.set('nombreEquipo', equipo.get('nombreEquipo'));
  le.set('marca', equipo.get('marca'));
  le.set('modelo', equipo.get('modelo'));
  le.set('serie', equipo.get('serie'));
  le.set('inventario', equipo.get('inventario'));
  await le.save(null, { useMasterKey: true });
  return le;
}

async function run() {
  log('='.repeat(78));
  log(' INTEGRACION -- Convenios huerfanos (Etapa 6.3)');
  log('='.repeat(78));

  await limpiar();
  await loginAdmin();

  let proveedor, licitacion, equipoOrig, le;

  await step('A1. crear proveedor + licitacion vigente', async () => {
    proveedor = await crearProveedor();
    licitacion = await crearLicitacion(proveedor);
  });

  await step('A2. crear equipo + asociarlo a la licitacion', async () => {
    equipoOrig = await crearEquipo();
    le = await asociarLicitacion(licitacion, proveedor, equipoOrig);
    assertEq(le.get('equipoId'), equipoOrig.id);
  });

  await step('A3. sincronizarConveniosInventario aplica convenio al equipo original', async () => {
    await callCloud('sincronizarConveniosInventario', { inventarioTipo: 'medico' });
    const q = new Parse.Query('InventarioEquipoMedico');
    const eq = await q.get(equipoOrig.id, { useMasterKey: true });
    assertEq(eq.get('convenioActivo'), true, 'convenioActivo debe ser true');
    assertEq(eq.get('proveedorRut'), RUT_PROV_TEST);
    assertEq(eq.get('numeroLicitacion'), NUM_LIC_TEST);
  });

  // ----- Simular bug legacy: hard-delete + recrear -----
  const idOriginal = equipoOrig.id;
  let equipoNuevo;

  await step('B1. hard-delete del equipo (simula legacy pre-Etapa 5)', async () => {
    await equipoOrig.destroy({ useMasterKey: true });
  });

  await step('B2. recrear equipo con MISMA serie (objectId nuevo)', async () => {
    equipoNuevo = await crearEquipo();
    assertNotEq(equipoNuevo.id, idOriginal);
  });

  await step('B3. la LicitacionEquipo sigue apuntando al objectId viejo', async () => {
    const q = new Parse.Query('LicitacionEquipo');
    const fresh = await q.get(le.id, { useMasterKey: true });
    assertEq(fresh.get('equipoId'), idOriginal, 'la LE no debe haberse movido sola');
  });

  await step('B4. el equipo nuevo aun NO tiene convenio aplicado', async () => {
    assertEq(equipoNuevo.get('convenioActivo'), undefined, 'antes de sync, sin convenio');
  });

  // ----- Caso C: sincronizar despues del fix -----
  let resultadoSync;
  await step('C1. sincronizarConveniosInventario reasigna LE huerfana', async () => {
    resultadoSync = await callCloud('sincronizarConveniosInventario', { inventarioTipo: 'medico' });
    const stats = resultadoSync && resultadoSync.resultados ? resultadoSync.resultados[0] : resultadoSync;
    assertGte(stats.licitacionEquiposReasignados || 0, 1, 'debe reportar al menos 1 LE reasignada');
  });

  await step('C2. tras sync, la LicitacionEquipo apunta al equipo nuevo', async () => {
    const q = new Parse.Query('LicitacionEquipo');
    const fresh = await q.get(le.id, { useMasterKey: true });
    assertEq(fresh.get('equipoId'), equipoNuevo.id, 'la LE debe apuntar al nuevo objectId');
  });

  await step('C3. tras sync, el equipo nuevo tiene convenioActivo=true', async () => {
    const q = new Parse.Query('InventarioEquipoMedico');
    const eq = await q.get(equipoNuevo.id, { useMasterKey: true });
    assertEq(eq.get('convenioActivo'), true);
    assertEq(eq.get('proveedorRut'), RUT_PROV_TEST);
    assertEq(eq.get('numeroLicitacion'), NUM_LIC_TEST);
    assertEq(eq.get('proveedorNombre'), NOMBRE_PROV_TEST);
  });

  // Cleanup
  await tryStep('Z1. limpiar datos del test', limpiar);

  log('-'.repeat(78));
  log(` Resultados: ${results.passed} passed, ${results.failed} failed, ${results.passed + results.failed} total`);
  log('='.repeat(78));
  process.exit(results.failed);
}

run().catch((e) => { console.error('FATAL:', e && e.stack ? e.stack : e); process.exit(99); });
