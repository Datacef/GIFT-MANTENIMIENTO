#!/usr/bin/env node
/**
 * Test suite — Etapa 5: papelera, soft-delete, duplicados y adopcion de huerfanos.
 *
 * Cubre los cambios documentados en seccion 8 de
 *   context/mmtto/revision-inventarios/revision-inventario-dashboard.md
 *
 *   5.1 Soft delete: las 4 funciones delete* hacen save() en lugar de destroy()
 *       y existe beforeFind para excluir eliminados.
 *   5.2 Papelera: cloud functions getInventarioEliminados, restaurarInventario,
 *       purgarInventario, buscarDuplicadoEliminado.
 *   5.3 Deteccion de duplicado en los 4 create* con parametro forzarCrear.
 *   5.4 restaurarYActualizar + adoptarRegistrosHuerfanos.
 *   5.5 Frontend: modal compartido DuplicadoEliminadoModal, pagina papelera,
 *       inferencia de pauta, integracion en los 4 form modals.
 *
 * Es un test estatico de codigo: lee los archivos del repo y verifica
 * que los cambios estan presentes y consistentes en los 4 dominios.
 *
 * Exit code = cantidad de tests fallidos.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

// =====================================================================
// Mini framework
// =====================================================================
const tests = [];
let passed = 0;
let failed = 0;
const failures = [];

function test(id, nombre, fn) { tests.push({ id, nombre, fn }); }
function assertTrue(cond, mensaje) { if (!cond) throw new Error(mensaje || 'assertTrue fallo'); }
function assertContains(str, substr, mensaje) {
  if (!String(str).includes(substr)) throw new Error(`${mensaje || 'assertContains'}: no contiene "${substr}"`);
}
function assertNotContains(str, substr, mensaje) {
  if (String(str).includes(substr)) throw new Error(`${mensaje || 'assertNotContains'}: contenia "${substr}" pero no deberia`);
}
function assertMatch(str, regex, mensaje) {
  if (!regex.test(String(str))) throw new Error(`${mensaje || 'assertMatch'}: no matchea ${regex}`);
}
function readFile(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function existsFile(rel) { return fs.existsSync(path.join(ROOT, rel)); }

async function runTests() {
  const ancho = 78;
  console.log('='.repeat(ancho));
  console.log(' ETAPA 5 -- Soft delete, papelera, duplicados, adopcion huerfanos');
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
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.label}`);
      if (f.error && f.error.stack) {
        const stack = String(f.error.stack).split('\n').slice(0, 3).join('\n');
        console.log(`     ${stack}`);
      }
    });
  }
  process.exit(failed);
}

// =====================================================================
// Constantes
// =====================================================================
const MAIN_JS = 'backend/cloud/main.js';

const DOMINIOS = [
  {
    nombre: 'equipoMedico',
    clase: 'InventarioEquipoMedico',
    deleteFn: 'deleteInventarioEquipo',
    createFn: 'createInventarioEquipo',
    formModal: 'frontend/src/components/admin/inventario/InventarioFormModal.tsx',
    pageRel: 'frontend/src/app/admin/inventario/page.tsx',
  },
  {
    nombre: 'equipoIndustrial',
    clase: 'InventarioEquipoIndustrial',
    deleteFn: 'deleteInventarioIndustrial',
    createFn: 'createInventarioIndustrial',
    formModal: 'frontend/src/components/admin/inventario-industrial/InventarioIndustrialFormModal.tsx',
    pageRel: 'frontend/src/app/admin/inventario-industrial/page.tsx',
  },
  {
    nombre: 'flotaVehicular',
    clase: 'InventarioFlotaVehicular',
    deleteFn: 'deleteInventarioFlota',
    createFn: 'createInventarioFlota',
    formModal: 'frontend/src/components/admin/flota-vehicular/FlotaVehicularFormModal.tsx',
    pageRel: 'frontend/src/app/admin/flota-vehicular/page.tsx',
  },
  {
    nombre: 'infraestructura',
    clase: 'InventarioInfraestructura',
    deleteFn: 'deleteInventarioInfra',
    createFn: 'createInventarioInfra',
    formModal: 'frontend/src/components/admin/infraestructura/InfraestructuraFormModal.tsx',
    pageRel: 'frontend/src/app/admin/infraestructura/page.tsx',
  },
];

const SHARED_SERVICE = 'frontend/src/services/inventario-shared.service.ts';
const DUP_MODAL = 'frontend/src/components/admin/inventario-shared/DuplicadoEliminadoModal.tsx';
const PAPELERA_PAGE = 'frontend/src/app/admin/inventario/papelera/page.tsx';

// =====================================================================
// 5.1 — Soft delete backend
// =====================================================================

test('5.1.1', 'las 4 cloud functions delete* hacen soft delete (set eliminado=true)', () => {
  const src = readFile(MAIN_JS);
  for (const d of DOMINIOS) {
    const idx = src.indexOf(`Parse.Cloud.define('${d.deleteFn}'`);
    assertTrue(idx > -1, `falta ${d.deleteFn}`);
    const cuerpo = src.slice(idx, idx + 2500);
    assertContains(cuerpo, "set('eliminado', true)", `${d.deleteFn} debe setear eliminado=true`);
    assertContains(cuerpo, "set('eliminadoEn'", `${d.deleteFn} debe registrar eliminadoEn`);
    assertContains(cuerpo, "set('eliminadoPor'", `${d.deleteFn} debe registrar eliminadoPor`);
    // Ya no debe llamar destroy() en el flujo principal
    assertNotContains(cuerpo, '.destroy({ useMasterKey: true });', `${d.deleteFn} no debe hacer destroy()`);
    // softDelete=true en respuesta para diferenciar
    assertContains(cuerpo, 'softDelete: true', `${d.deleteFn} debe devolver softDelete: true`);
  }
});

test('5.1.2', 'permisos de delete bajan a ADMIN(4) (eran SUPER_ADMIN(5))', () => {
  const src = readFile(MAIN_JS);
  for (const d of DOMINIOS) {
    const idx = src.indexOf(`Parse.Cloud.define('${d.deleteFn}'`);
    const cuerpo = src.slice(idx, idx + 1000);
    assertContains(cuerpo, 'accessLevel < 4', `${d.deleteFn} debe requerir accessLevel >= 4`);
  }
});

test('5.1.3', 'beforeFind para las 4 clases excluye eliminados por defecto', () => {
  const src = readFile(MAIN_JS);
  // Dentro de _registrarTriggerInventario debe haber Parse.Cloud.beforeFind
  const idx = src.indexOf('function _registrarTriggerInventario(');
  const cuerpo = src.slice(idx, idx + 3500);
  assertContains(cuerpo, 'Parse.Cloud.beforeFind(clase', 'falta beforeFind por clase');
  assertContains(cuerpo, "notEqualTo('eliminado', true)", 'beforeFind debe excluir eliminados');
  assertContains(cuerpo, "Object.prototype.hasOwnProperty.call(where, 'eliminado')", 'beforeFind debe respetar override explicito');
});

// =====================================================================
// 5.2 — Papelera backend
// =====================================================================

test('5.2.1', 'cloud function getInventarioEliminados registrada con permisos ADMIN', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('getInventarioEliminados'");
  assertTrue(idx > -1, 'falta getInventarioEliminados');
  const cuerpo = src.slice(idx, idx + 2000);
  assertContains(cuerpo, 'accessLevel < 4', 'getInventarioEliminados requiere ADMIN(4)');
  assertContains(cuerpo, "equalTo('eliminado', true)", 'debe filtrar por eliminado=true');
});

test('5.2.2', 'cloud function restaurarInventario registrada con permisos ADMIN', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('restaurarInventario'");
  assertTrue(idx > -1, 'falta restaurarInventario');
  const cuerpo = src.slice(idx, idx + 1500);
  assertContains(cuerpo, 'accessLevel < 4', 'restaurarInventario requiere ADMIN(4)');
  assertContains(cuerpo, "set('eliminado', false)", 'debe limpiar flag eliminado');
  assertContains(cuerpo, "unset('eliminadoEn')", 'debe limpiar eliminadoEn');
  assertContains(cuerpo, "'restauracion'", 'debe registrar historial de restauracion');
});

test('5.2.3', 'cloud function purgarInventario registrada con permisos SUPER_ADMIN', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('purgarInventario'");
  assertTrue(idx > -1, 'falta purgarInventario');
  const cuerpo = src.slice(idx, idx + 1200);
  assertContains(cuerpo, 'accessLevel < 5', 'purgarInventario requiere SUPER_ADMIN(5)');
  assertContains(cuerpo, '.destroy({ useMasterKey: true })', 'debe hacer hard delete');
});

test('5.2.4', 'cloud function buscarDuplicadoEliminado existe', () => {
  const src = readFile(MAIN_JS);
  assertContains(src, "Parse.Cloud.define('buscarDuplicadoEliminado'", 'falta buscarDuplicadoEliminado');
});

test('5.2.5', '_SOFT_DELETE_CLASES contempla las 4 clases con identificadores', () => {
  const src = readFile(MAIN_JS);
  // Buscar la DECLARACION (no la primera referencia)
  const idx = src.indexOf('const _SOFT_DELETE_CLASES = {');
  assertTrue(idx > -1, 'falta declaracion de _SOFT_DELETE_CLASES');
  const cuerpo = src.slice(idx, idx + 2000);
  for (const d of DOMINIOS) {
    assertContains(cuerpo, `${d.clase}:`, `_SOFT_DELETE_CLASES debe contemplar ${d.clase}`);
  }
  // identificadores clave por dominio
  assertContains(cuerpo, "'serie'", 'debe usar serie como identificador');
  assertContains(cuerpo, "'patente'", 'debe usar patente para flota');
  assertContains(cuerpo, "'codigoInterno'", 'debe usar codigoInterno para infra');
});

// =====================================================================
// 5.3 — Detección de duplicado en create
// =====================================================================

test('5.3.1', 'los 4 create* aceptan parametro forzarCrear', () => {
  const src = readFile(MAIN_JS);
  for (const d of DOMINIOS) {
    const idx = src.indexOf(`Parse.Cloud.define('${d.createFn}'`);
    assertTrue(idx > -1, `falta ${d.createFn}`);
    const cuerpo = src.slice(idx, idx + 5000);
    assertContains(cuerpo, 'forzarCrear', `${d.createFn} debe aceptar forzarCrear`);
    assertContains(cuerpo, '_chequearDuplicadoEliminado(', `${d.createFn} debe llamar al helper`);
    assertContains(cuerpo, "return { duplicateEliminado: dup }", `${d.createFn} debe devolver duplicateEliminado`);
  }
});

test('5.3.2', '_chequearDuplicadoEliminado helper existe y filtra por eliminado=true', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf('async function _chequearDuplicadoEliminado(');
  assertTrue(idx > -1, 'falta helper _chequearDuplicadoEliminado');
  const cuerpo = src.slice(idx, idx + 2500);
  assertContains(cuerpo, "equalTo('eliminado', true)", 'helper debe filtrar por eliminado=true');
});

// =====================================================================
// 5.4 — restaurarYActualizar + adoptarRegistrosHuerfanos
// =====================================================================

test('5.4.1', 'restaurarYActualizar registrado con permisos COORDINATOR', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('restaurarYActualizar'");
  assertTrue(idx > -1, 'falta restaurarYActualizar');
  const cuerpo = src.slice(idx, idx + 3500);
  assertContains(cuerpo, 'accessLevel < 3', 'requiere COORDINATOR(3)');
  assertContains(cuerpo, "set('eliminado', false)", 'limpia flag eliminado');
  // Aplica datos del form
  assertContains(cuerpo, 'camposComunes', 'aplica datos del formulario');
});

test('5.4.2', 'adoptarRegistrosHuerfanos migra registros, logs e historial al nuevo objectId', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('adoptarRegistrosHuerfanos'");
  assertTrue(idx > -1, 'falta adoptarRegistrosHuerfanos');
  const cuerpo = src.slice(idx, idx + 4500);
  assertContains(cuerpo, 'accessLevel < 4', 'requiere ADMIN(4)');
  assertContains(cuerpo, "Parse.Query('RegistroMantenimiento')", 'migra RegistroMantenimiento');
  assertContains(cuerpo, "Parse.Query('CumplimientoLog')", 'migra CumplimientoLog');
  // Historial por clase: debe contemplar las 4 clases de historial
  assertContains(cuerpo, 'InventarioHistorial', 'migra InventarioHistorial');
  assertContains(cuerpo, 'FlotaVehicularHistorial', 'migra FlotaVehicularHistorial');
  assertContains(cuerpo, 'InfraestructuraHistorial', 'migra InfraestructuraHistorial');
  assertContains(cuerpo, 'sincronizarActivoParse', 'recalcula cumplimiento del nuevo activo');
});

// =====================================================================
// 5.5 — Frontend: servicio compartido + modal + pagina papelera + form modals
// =====================================================================

test('5.5.1', 'inventario-shared.service.ts expone metodos para papelera y duplicado', () => {
  assertTrue(existsFile(SHARED_SERVICE), `falta ${SHARED_SERVICE}`);
  const src = readFile(SHARED_SERVICE);
  assertContains(src, 'getEliminados(', 'falta getEliminados');
  assertContains(src, 'restaurar(', 'falta restaurar');
  assertContains(src, 'restaurarYActualizar(', 'falta restaurarYActualizar');
  assertContains(src, 'adoptarHuerfanos(', 'falta adoptarHuerfanos');
  assertContains(src, 'purgar(', 'falta purgar');
  assertContains(src, 'buscarDuplicado(', 'falta buscarDuplicado');
  // Tipos exportados para reutilizacion
  assertContains(src, 'export type ClaseInventario', 'falta type ClaseInventario');
  assertContains(src, 'DOMINIO_LABELS', 'falta DOMINIO_LABELS');
  assertContains(src, 'DOMINIO_HREF', 'falta DOMINIO_HREF');
});

test('5.5.2', 'DuplicadoEliminadoModal existe con 3 opciones', () => {
  assertTrue(existsFile(DUP_MODAL), `falta ${DUP_MODAL}`);
  const src = readFile(DUP_MODAL);
  assertContains(src, 'handleRestaurar', 'falta opcion Restaurar');
  assertContains(src, 'handleAdoptarYCrear', 'falta opcion Adoptar+Crear');
  assertContains(src, 'handleCrearNuevo', 'falta opcion Crear nuevo');
  assertContains(src, 'restaurarYActualizar', 'usa restaurarYActualizar');
  assertContains(src, 'adoptarHuerfanos', 'usa adoptarHuerfanos');
});

test('5.5.3', 'pagina /admin/inventario/papelera existe y filtra por las 4 clases', () => {
  assertTrue(existsFile(PAPELERA_PAGE), `falta ${PAPELERA_PAGE}`);
  const src = readFile(PAPELERA_PAGE);
  assertContains(src, 'getEliminados', 'consume getEliminados');
  assertContains(src, 'restaurar(clase', 'permite restaurar');
  // Lista de clases
  for (const d of DOMINIOS) {
    assertContains(src, d.clase, `papelera debe soportar ${d.clase}`);
  }
  // Solo ADMIN+
  assertContains(src, 'level < 4', 'requiere ADMIN(4) para acceder');
});

test('5.5.4', 'los 4 form modals integran DuplicadoEliminadoModal con la clase correcta', () => {
  for (const d of DOMINIOS) {
    const src = readFile(d.formModal);
    assertContains(src, 'DuplicadoEliminadoModal', `${d.formModal}: falta importar modal`);
    assertContains(src, `clase="${d.clase}"`, `${d.formModal}: clase incorrecta`);
    assertContains(src, 'duplicateEliminado', `${d.formModal}: debe detectar duplicateEliminado`);
    assertContains(src, 'forzarCrear: true', `${d.formModal}: handleCrearForzado debe pasar forzarCrear`);
    assertContains(src, `Parse.Cloud.run('${d.createFn}'`, `${d.formModal}: debe llamar a ${d.createFn} directo`);
  }
});

test('5.5.5', 'los 4 form modals tienen useEffect de inferencia de pauta', () => {
  for (const d of DOMINIOS) {
    const src = readFile(d.formModal);
    // Inferencia: cuando pautaAsignada esta vacia y un campo coincide con pautasDisponibles
    assertContains(src, 'pautaAsignada', `${d.formModal}: debe usar pautaAsignada`);
    assertContains(src, 'pautasDisponibles.includes(', `${d.formModal}: debe inferir desde pautasDisponibles`);
    // Y disparar setForm
    assertMatch(src, /pautaAsignada\s*:\s*match/, `${d.formModal}: debe asignar match a pautaAsignada`);
  }
});

test('5.5.6', 'sidebar/routes.tsx incluye link a Papelera con permisos ADMIN+', () => {
  const src = readFile('frontend/src/routes.tsx');
  assertContains(src, "name: 'Papelera'", 'falta entry Papelera en routes');
  assertContains(src, "path: 'inventario/papelera'", 'path correcto');
  // Solo ADMIN/SUPER_ADMIN
  assertMatch(
    src,
    /name:\s*'Papelera'[\s\S]*?allowedRoles:\s*\[UserRole\.ADMIN,\s*UserRole\.SUPER_ADMIN\]/,
    'Papelera debe restringirse a ADMIN/SUPER_ADMIN'
  );
});

// =====================================================================
// COBERTURA TRANSVERSAL
// =====================================================================

test('CT.1', 'el documento describe la Etapa 5 con sus 5 sub-tareas', () => {
  const docPath = 'context/mmtto/revision-inventarios/revision-inventario-dashboard.md';
  assertTrue(existsFile(docPath), `falta ${docPath}`);
  const src = readFile(docPath);
  assertContains(src, 'Etapa 5', 'el documento debe describir Etapa 5');
  assertContains(src, 'Soft delete', 'doc menciona soft delete');
  assertContains(src, 'papelera', 'doc menciona papelera');
  assertContains(src, 'huérfanos', 'doc menciona huerfanos');
  assertContains(src, 'Inferencia de pauta', 'doc menciona inferencia de pauta');
});

test('CT.2', 'no hay queries que usen .destroy directo en los 4 delete*', () => {
  const src = readFile(MAIN_JS);
  for (const d of DOMINIOS) {
    const idx = src.indexOf(`Parse.Cloud.define('${d.deleteFn}'`);
    const cuerpo = src.slice(idx, idx + 2500);
    // No debe quedar el patron antiguo de hard-delete dentro del flujo principal
    assertNotContains(cuerpo, 'await equipo.destroy({ useMasterKey: true });', 'queda destroy() viejo');
    assertNotContains(cuerpo, 'await vehiculo.destroy({ useMasterKey: true });', 'queda destroy() viejo');
    assertNotContains(cuerpo, 'await comp.destroy({ useMasterKey: true });', 'queda destroy() viejo');
  }
});

// =====================================================================
runTests();
