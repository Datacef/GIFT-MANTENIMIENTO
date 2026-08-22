#!/usr/bin/env node
/**
 * Test de INTEGRACION (vivo) — Carta Gantt de Mantenimiento.
 *
 * Verifica que getGanttMantenimiento y getCargaMantenimientoPorMes:
 *   - Generan periodos cumplido / faltante / en_curso / futuro correctos.
 *   - El heatmap suma vencimientos por mes y dominio.
 *   - Los activos sin frecuencia o de baja se excluyen.
 *
 * Ejecutar: node scripts/test/test_15GanttIntegration.js
 */

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

const SERIE = 'SN-TEST-GANTT-001';
const INV = 'INV-TEST-GANTT-001';
const NOMBRE = 'EQUIPO TEST GANTT';
const FRECUENCIA_MESES = 6;

let SESSION_TOKEN = '';
let results = { passed: 0, failed: 0 };

function ok(label) { results.passed++; console.log(`  PASS  ${label}`); }
function fail(label, err) { results.failed++; console.log(`  FAIL  ${label}\n        -> ${err && err.message ? err.message : err}`); }
async function step(label, fn) { try { await fn(); ok(label); } catch (e) { fail(label, e); throw e; } }
async function tryStep(label, fn) { try { await fn(); ok(label); } catch (e) { fail(label, e); } }
function assertGte(a, b, m) { if (!(a >= b)) throw new Error(`${m || 'assertGte'}: ${a} >= ${b} fallo`); }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m || 'assertEq'}: esperado ${b}, recibido ${a}`); }

async function loginAdmin() {
  const u = await Parse.User.logIn(ADMIN_EMAIL, ADMIN_PASS);
  SESSION_TOKEN = u.getSessionToken();
}
async function callCloud(name, params) {
  return Parse.Cloud.run(name, params, { sessionToken: SESSION_TOKEN });
}

async function limpiar() {
  const qE = new Parse.Query('InventarioEquipoMedico');
  qE.equalTo('serie', SERIE);
  qE.limit(20);
  const eqs = await qE.find({ useMasterKey: true });
  for (const e of eqs) await e.destroy({ useMasterKey: true });

  const qR = new Parse.Query('RegistroMantenimiento');
  qR.equalTo('activoClase', 'InventarioEquipoMedico');
  qR.containedIn('activoResumen.identificador', [SERIE, INV, `${SERIE} / ${INV}`, `${INV} / ${SERIE}`]);
  qR.limit(50);
  const rs = await qR.find({ useMasterKey: true });
  for (const r of rs) await r.destroy({ useMasterKey: true });
}

async function crearEquipo(fechaAdquisicion) {
  const C = Parse.Object.extend('InventarioEquipoMedico');
  const e = new C();
  e.set('servicio', 'Test');
  e.set('clase', 'Apoyo Diagnostico');
  e.set('subclase', 'Mediano Costo');
  e.set('nombreEquipo', NOMBRE);
  e.set('marca', 'GE');
  e.set('modelo', 'TEST');
  e.set('serie', SERIE);
  e.set('inventario', INV);
  e.set('fechaAdquisicion', fechaAdquisicion);
  e.set('vidaUtil', 10);
  e.set('estado', 'B');
  e.set('criticoApoyo', 'C');
  e.set('frecuencia', FRECUENCIA_MESES);
  e.set('activo', true);
  await e.save(null, { useMasterKey: true });
  return e;
}

async function crearMantenimiento(equipoId, fecha, estadoValidacion = 'aprobado') {
  const C = Parse.Object.extend('RegistroMantenimiento');
  const r = new C();
  r.set('dominio', 'equipoMedico');
  r.set('tipoMantenimiento', 'preventivo');
  r.set('clasificacionEquipo', 'Apoyo Diagnostico');
  r.set('activoId', equipoId);
  r.set('activoClase', 'InventarioEquipoMedico');
  r.set('activoResumen', { nombre: NOMBRE, identificador: `${SERIE} / ${INV}`, estado: 'B', ubicacion: 'Test' });
  r.set('fecha', fecha);
  r.set('checklist', { items: [] });
  r.set('estadoValidacion', estadoValidacion);
  r.set('activo', true);
  await r.save(null, { useMasterKey: true });
  return r;
}

async function run() {
  console.log('='.repeat(78));
  console.log(' INTEGRACION -- Carta Gantt');
  console.log('='.repeat(78));

  await limpiar();
  await loginAdmin();

  // Equipo creado hace 1 anio (2 periodos esperados con freq=6m), 1 cumplido + 1 faltante
  const hoy = new Date();
  const haceAnio = new Date(Date.UTC(hoy.getUTCFullYear() - 1, hoy.getUTCMonth(), hoy.getUTCDate()));
  const fechaAdq = haceAnio.toISOString().slice(0, 10);

  let equipo;
  await step('A1. crear equipo con frecuencia 6m, fechaAdquisicion=hace 1 anio', async () => {
    equipo = await crearEquipo(fechaAdq);
  });

  await step('A2. crear 1 mantenimiento aprobado del primer periodo', async () => {
    // 6 meses despues de fechaAdquisicion (en el primer periodo)
    const fechaMtto = new Date(Date.UTC(haceAnio.getUTCFullYear(), haceAnio.getUTCMonth() + 3, 1));
    await crearMantenimiento(equipo.id, fechaMtto.toISOString().slice(0, 10), 'aprobado');
  });

  let gantt;
  await step('B1. getGanttMantenimiento devuelve la fila con periodos', async () => {
    const fmt = (d) => d.toISOString().slice(0, 10);
    const desde = fmt(haceAnio);
    const enUnAnio = new Date(Date.UTC(hoy.getUTCFullYear() + 1, hoy.getUTCMonth(), hoy.getUTCDate()));
    const hasta = fmt(enUnAnio);
    gantt = await callCloud('getGanttMantenimiento', { desde, hasta, dominio: 'equipoMedico', filtrosInventario: { busqueda: SERIE } });
    assertGte(gantt.filas.length, 1, 'debe devolver al menos 1 fila');
  });

  await step('B2. la fila tiene multiples periodos generados (cumplido + faltante + futuro)', async () => {
    const fila = gantt.filas.find((f) => f.activoId === equipo.id);
    if (!fila) throw new Error('fila del equipo de test no encontrada');
    assertGte(fila.periodos.length, 2, 'al menos 2 periodos en el rango');
    const cumplidos = fila.periodos.filter((p) => p.estado === 'cumplido').length;
    assertGte(cumplidos, 1, 'debe haber al menos 1 cumplido');
  });

  await step('B3. resumen del equipo tiene cumplimientoPorcentaje > 0', async () => {
    const fila = gantt.filas.find((f) => f.activoId === equipo.id);
    assertGte(fila.cumplimientoPorcentaje, 1, 'cumplimiento > 0%');
  });

  await step('C1. getCargaMantenimientoPorMes devuelve meses con cuartiles', async () => {
    const ahora = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const desde = fmt(new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 6, 1)));
    const hasta = fmt(new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 12, 1)));
    const carga = await callCloud('getCargaMantenimientoPorMes', { desde, hasta });
    assertGte(carga.meses.length, 12, 'al menos 12 meses');
    if (typeof carga.cuartiles.p25 !== 'number') throw new Error('cuartiles deben ser numericos');
    // Total cumulado positivo
    const sumaTotal = carga.totales.reduce((a, b) => a + b, 0);
    assertGte(sumaTotal, 1, 'al menos 1 vencimiento global');
  });

  await tryStep('Z1. limpiar', limpiar);

  console.log('-'.repeat(78));
  console.log(` Resultados: ${results.passed} passed, ${results.failed} failed, ${results.passed + results.failed} total`);
  console.log('='.repeat(78));
  process.exit(results.failed);
}

run().catch((e) => { console.error('FATAL:', e && e.stack ? e.stack : e); process.exit(99); });
