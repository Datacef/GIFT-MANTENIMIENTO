#!/usr/bin/env node
/**
 * Test suite — Etapa 6: reconciliacion de huerfanos por identidad.
 *
 * Cubre los cambios de seccion 9 en
 *   context/mmtto/revision-inventarios/revision-inventario-dashboard.md
 *
 * Backend:
 *   - diagnosticarHistorialActivo (OPERATOR)
 *   - reconciliarHuerfanosPorIdentidad (ADMIN) que migra:
 *       RegistroMantenimiento, CumplimientoLog, InventarioHistorial
 *       (4 variantes), LicitacionEquipo
 *
 * Frontend:
 *   - InventarioSharedService.diagnosticarHistorial / reconciliarHuerfanos
 *   - ReconciliarHistorialButton compartido
 *   - integracion en los 4 detail modals
 *
 * Exit code = cantidad de tests fallidos.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

const tests = [];
let passed = 0;
let failed = 0;
const failures = [];

function test(id, nombre, fn) { tests.push({ id, nombre, fn }); }
function assertTrue(cond, m) { if (!cond) throw new Error(m || 'assertTrue fallo'); }
function assertContains(s, sub, m) {
  if (!String(s).includes(sub)) throw new Error(`${m || 'assertContains'}: no contiene "${sub}"`);
}
function readFile(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function existsFile(rel) { return fs.existsSync(path.join(ROOT, rel)); }

async function runTests() {
  const ancho = 78;
  console.log('='.repeat(ancho));
  console.log(' ETAPA 6 -- Reconciliacion de huerfanos por identidad');
  console.log(` ${tests.length} tests programados`);
  console.log('='.repeat(ancho));

  for (const t of tests) {
    const label = `[${t.id}] ${t.nombre}`;
    try {
      const r = t.fn();
      if (r && typeof r.then === 'function') await r;
      console.log(`  PASS  ${label}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL  ${label}`);
      console.log(`        -> ${e && e.message ? e.message : String(e)}`);
      failed++;
      failures.push({ label, error: e });
    }
  }

  console.log('-'.repeat(ancho));
  console.log(` Resultados: ${passed} passed, ${failed} failed, ${tests.length} total`);
  console.log('='.repeat(ancho));
  if (failed > 0) {
    console.log('\nDetalle de fallas:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.label}`));
  }
  process.exit(failed);
}

const MAIN_JS = 'backend/cloud/main.js';
const SHARED_SERVICE = 'frontend/src/services/inventario-shared.service.ts';
const RECONCILIAR_BTN = 'frontend/src/components/admin/inventario-shared/ReconciliarHistorialButton.tsx';

const DETAIL_MODALS = [
  { ruta: 'frontend/src/components/admin/inventario/InventarioDetailModal.tsx', clase: 'InventarioEquipoMedico' },
  { ruta: 'frontend/src/components/admin/inventario-industrial/InventarioIndustrialDetailModal.tsx', clase: 'InventarioEquipoIndustrial' },
  { ruta: 'frontend/src/components/admin/flota-vehicular/FlotaVehicularDetailModal.tsx', clase: 'InventarioFlotaVehicular' },
  { ruta: 'frontend/src/components/admin/infraestructura/InfraestructuraDetailModal.tsx', clase: 'InventarioInfraestructura' },
];

// =====================================================================
// Backend
// =====================================================================

test('6.1', 'diagnosticarHistorialActivo registrado con permisos OPERATOR', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('diagnosticarHistorialActivo'");
  assertTrue(idx > -1, 'falta diagnosticarHistorialActivo');
  const cuerpo = src.slice(idx, idx + 4000);
  assertContains(cuerpo, 'accessLevel < 2', 'requiere OPERATOR(2)');
  assertContains(cuerpo, "containedIn('activoResumen.identificador'", 'busca huerfanos por identificador en activoResumen');
  // El filtrado de "no apuntar al activo actual" puede hacerse via notEqualTo
  // o filter en memoria (preferido tras Etapa 6.2 por compatibilidad con Parse.or)
  const filtraSegunActivoActual = /notEqualTo\(['"]activoId['"]/.test(cuerpo)
    || /\.filter\(.*activoId.*!==/.test(cuerpo);
  assertTrue(filtraSegunActivoActual, 'debe excluir los registros que ya apuntan al activo actual');
  assertContains(cuerpo, 'totalDirectos', 'devuelve totalDirectos');
  assertContains(cuerpo, 'totalHuerfanos', 'devuelve totalHuerfanos');
  assertContains(cuerpo, 'licitacionesHuerfanas', 'devuelve licitacionesHuerfanas');
  assertContains(cuerpo, 'idsPrevios', 'devuelve idsPrevios');
});

test('6.2', 'reconciliarHuerfanosPorIdentidad registrado con permisos ADMIN', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('reconciliarHuerfanosPorIdentidad'");
  assertTrue(idx > -1, 'falta reconciliarHuerfanosPorIdentidad');
  const cuerpo = src.slice(idx, idx + 6000);
  assertContains(cuerpo, 'accessLevel < 4', 'requiere ADMIN(4)');
  assertContains(cuerpo, "Parse.Query('RegistroMantenimiento')", 'migra RegistroMantenimiento');
  assertContains(cuerpo, "Parse.Query('CumplimientoLog')", 'migra CumplimientoLog');
  assertContains(cuerpo, "Parse.Query('LicitacionEquipo')", 'migra LicitacionEquipo');
  assertContains(cuerpo, 'sincronizarConveniosParaTipo', 'resincroniza convenios tras migrar licitaciones');
  assertContains(cuerpo, 'sincronizarActivoParse', 'recalcula cumplimiento');
  // Las 4 variantes de historial
  assertContains(cuerpo, 'InventarioHistorial', 'migra historial medico');
  assertContains(cuerpo, 'InventarioIndustrialHistorial', 'migra historial industrial');
  assertContains(cuerpo, 'FlotaVehicularHistorial', 'migra historial flota');
  assertContains(cuerpo, 'InfraestructuraHistorial', 'migra historial infraestructura');
});

test('6.3', 'reconciliacion devuelve contadores migrados (incluyendo licitaciones)', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('reconciliarHuerfanosPorIdentidad'");
  const cuerpo = src.slice(idx, idx + 6000);
  assertContains(cuerpo, 'migradosRegistros', 'reporta migradosRegistros');
  assertContains(cuerpo, 'migradosLogs', 'reporta migradosLogs');
  assertContains(cuerpo, 'migradosHistorial', 'reporta migradosHistorial');
  assertContains(cuerpo, 'migradosLicitaciones', 'reporta migradosLicitaciones');
  // Y registra historial de la operacion
  assertContains(cuerpo, "'reconciliacion'", 'registra accion historial reconciliacion');
});

// =====================================================================
// Frontend
// =====================================================================

test('6.4', 'inventario-shared.service.ts expone diagnosticarHistorial y reconciliarHuerfanos', () => {
  assertTrue(existsFile(SHARED_SERVICE), `falta ${SHARED_SERVICE}`);
  const src = readFile(SHARED_SERVICE);
  assertContains(src, 'diagnosticarHistorial(', 'falta diagnosticarHistorial');
  assertContains(src, "Parse.Cloud.run('diagnosticarHistorialActivo'", 'invoca cloud function correcta');
  assertContains(src, 'reconciliarHuerfanos(', 'falta reconciliarHuerfanos');
  assertContains(src, "Parse.Cloud.run('reconciliarHuerfanosPorIdentidad'", 'invoca cloud function correcta');
});

test('6.5', 'ReconciliarHistorialButton existe y maneja diagnostico + accion', () => {
  assertTrue(existsFile(RECONCILIAR_BTN), `falta ${RECONCILIAR_BTN}`);
  const src = readFile(RECONCILIAR_BTN);
  assertContains(src, 'diagnosticarHistorial', 'consume diagnosticarHistorial');
  assertContains(src, 'reconciliarHuerfanos', 'invoca reconciliarHuerfanos');
  assertContains(src, 'totalHuerfanos', 'muestra contadores huerfanos');
  assertContains(src, 'licitacionesHuerfanas', 'muestra contadores licitaciones huerfanas');
  // Solo ADMIN+
  assertContains(src, 'accessLevel >= 4', 'restringe la accion a ADMIN(4)');
  // No se renderiza si no hay huerfanos
  assertContains(src, 'tieneHuerfanos', 'condicional para renderizar solo cuando hay huerfanos');
});

test('6.6', 'los 4 detail modals integran ReconciliarHistorialButton con la clase correcta', () => {
  for (const m of DETAIL_MODALS) {
    const src = readFile(m.ruta);
    assertContains(src, 'ReconciliarHistorialButton', `${m.ruta}: falta importar ReconciliarHistorialButton`);
    assertContains(src, `clase="${m.clase}"`, `${m.ruta}: prop clase incorrecto`);
    assertContains(src, 'onChanged={onActivoChanged}', `${m.ruta}: debe pasar onChanged`);
  }
});

// =====================================================================
// Documento
// =====================================================================

test('CT.1', 'el documento describe la Etapa 6 con sus componentes', () => {
  const docPath = 'context/mmtto/revision-inventarios/revision-inventario-dashboard.md';
  const src = readFile(docPath);
  assertContains(src, 'Etapa 6', 'doc menciona Etapa 6');
  assertContains(src, 'Reconciliación', 'doc menciona reconciliacion');
  assertContains(src, 'diagnosticarHistorialActivo', 'doc menciona diagnostico');
  assertContains(src, 'reconciliarHuerfanosPorIdentidad', 'doc menciona reconciliacion');
  assertContains(src, 'identidad de negocio', 'doc menciona el cierre conceptual');
});

runTests();
