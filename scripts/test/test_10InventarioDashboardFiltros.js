#!/usr/bin/env node
/**
 * Test suite — Revision Inventarios: dashboards, baja unificada y cumplimiento.
 *
 * Cubre las 4 etapas de
 *   context/mmtto/revision-inventarios/revision-inventario-dashboard.md
 *
 *   Etapa 1: predicado de baja unificado (estado='Baja' OR fechaBaja<=hoy)
 *            + trigger reactivo a 'estado'.
 *   Etapa 2: stats fisicas globales por count() y badge "Dado de baja"
 *            inmediato (sin esperar al recalculo).
 *   Etapa 3: accion atomica darDeBajaActivo / reactivarActivo + modal
 *            compartido + beforeSave que coerce coherencia.
 *   Etapa 4: dashboard global getDashboardInventarios + home /admin/default.
 *
 * Los 4 dominios cubiertos:
 *   - InventarioEquipoMedico       (/admin/inventario)
 *   - InventarioEquipoIndustrial   (/admin/inventario-industrial)
 *   - InventarioInfraestructura    (/admin/infraestructura)
 *   - InventarioFlotaVehicular     (/admin/flota-vehicular)
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
function assertEq(actual, expected, mensaje) {
  const a = typeof actual === 'object' ? JSON.stringify(actual) : String(actual);
  const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
  if (a !== e) throw new Error(`${mensaje || 'assertEq'}: esperado ${e} -- recibido ${a}`);
}
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
  console.log(' REVISION INVENTARIOS -- Dashboard, Baja unificada, Cumplimiento');
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
// Constantes de paths y mappings de los 4 dominios
// =====================================================================
const CUMPLIMIENTO_UTIL = 'backend/cloud/utils/cumplimientoMantenimiento.js';
const MAIN_JS = 'backend/cloud/main.js';

const DOMINIOS = [
  {
    nombre: 'equipoMedico',
    clase: 'InventarioEquipoMedico',
    page: 'frontend/src/app/admin/inventario/page.tsx',
    detail: 'frontend/src/components/admin/inventario/InventarioDetailModal.tsx',
    service: 'frontend/src/services/inventario-equipo.service.ts',
    fetchFn: 'fetchEquipos',
    coleccionVar: 'equipos',
  },
  {
    nombre: 'equipoIndustrial',
    clase: 'InventarioEquipoIndustrial',
    page: 'frontend/src/app/admin/inventario-industrial/page.tsx',
    detail: 'frontend/src/components/admin/inventario-industrial/InventarioIndustrialDetailModal.tsx',
    service: 'frontend/src/services/inventario-industrial.service.ts',
    fetchFn: 'fetchEquipos',
    coleccionVar: 'equipos',
  },
  {
    nombre: 'infraestructura',
    clase: 'InventarioInfraestructura',
    page: 'frontend/src/app/admin/infraestructura/page.tsx',
    detail: 'frontend/src/components/admin/infraestructura/InfraestructuraDetailModal.tsx',
    service: 'frontend/src/services/inventario-infraestructura.service.ts',
    fetchFn: 'fetchComponentes',
    coleccionVar: 'componentes',
  },
  {
    nombre: 'flotaVehicular',
    clase: 'InventarioFlotaVehicular',
    page: 'frontend/src/app/admin/flota-vehicular/page.tsx',
    detail: 'frontend/src/components/admin/flota-vehicular/FlotaVehicularDetailModal.tsx',
    service: 'frontend/src/services/inventario-flota.service.ts',
    fetchFn: 'fetchVehiculos',
    coleccionVar: 'vehiculos',
  },
];

const BADGE_PATH = 'frontend/src/components/admin/mantenimiento/CumplimientoBadge.tsx';
const BAJA_MODAL_PATH = 'frontend/src/components/admin/inventario-shared/BajaActivoModal.tsx';
const DEFAULT_PAGE = 'frontend/src/app/admin/default/page.tsx';

// =====================================================================
// ETAPA 1 — backend predicado de baja unificado + trigger reactivo a estado
// =====================================================================

test('E1.1', 'cumplimientoMantenimiento.js exporta esActivoDeBaja y obtenerEstadoFisico', () => {
  const src = readFile(CUMPLIMIENTO_UTIL);
  assertContains(src, 'function obtenerEstadoFisico(', 'falta helper obtenerEstadoFisico');
  assertContains(src, 'function esActivoDeBaja(', 'falta predicado esActivoDeBaja');
  // exportados
  assertContains(src, 'obtenerEstadoFisico,', 'obtenerEstadoFisico no exportado');
  assertContains(src, 'esActivoDeBaja,', 'esActivoDeBaja no exportado');
});

test('E1.2', 'esActivoDeBaja considera estado=="Baja" Y fechaBaja vencida', () => {
  const src = readFile(CUMPLIMIENTO_UTIL);
  // dentro de la funcion esActivoDeBaja debe estar el chequeo de estado
  const inicio = src.indexOf('function esActivoDeBaja(');
  assertTrue(inicio > -1, 'no se encontro esActivoDeBaja');
  const fin = src.indexOf('\n}\n', inicio);
  const cuerpo = src.slice(inicio, fin > 0 ? fin : inicio + 600);
  assertContains(cuerpo, "=== 'Baja'", 'esActivoDeBaja debe chequear estado === "Baja"');
  assertContains(cuerpo, 'fechaBaja', 'esActivoDeBaja debe chequear fechaBaja');
});

test('E1.3', 'calcularCumplimiento usa esActivoDeBaja en vez del check antiguo', () => {
  const src = readFile(CUMPLIMIENTO_UTIL);
  const inicio = src.indexOf('function calcularCumplimiento(');
  assertTrue(inicio > -1, 'no se encontro calcularCumplimiento');
  const cuerpo = src.slice(inicio, inicio + 3000);
  assertContains(cuerpo, 'esActivoDeBaja(activo', 'debe invocar esActivoDeBaja(activo, hoy)');
  // No debe quedar la rama antigua que solo miraba fechaBaja para entrar en DADO_DE_BAJA
  assertNotContains(
    cuerpo,
    'if (fechaBaja && diffDias(fechaBaja, hoy) <= 0) {',
    'no debe quedar el chequeo antiguo solo por fechaBaja'
  );
});

test('E1.4', 'sincronizarActivoParse pasa estado al motor', () => {
  const src = readFile(CUMPLIMIENTO_UTIL);
  const inicio = src.indexOf('async function sincronizarActivoParse(');
  assertTrue(inicio > -1, 'no se encontro sincronizarActivoParse');
  // Slice mas amplio porque la funcion crecio con la logica de identidad
  const cuerpo = src.slice(inicio, inicio + 6000);
  assertContains(cuerpo, "estado: activoObj.get('estado')", 'activoPlano debe incluir estado');
});

test('E1.5', "trigger afterSave incluye 'estado' en camposRelevantes", () => {
  const src = readFile(MAIN_JS);
  const inicio = src.indexOf('function _registrarTriggerInventario(');
  assertTrue(inicio > -1, 'no se encontro _registrarTriggerInventario');
  const cuerpo = src.slice(inicio, inicio + 2000);
  assertMatch(
    cuerpo,
    /camposRelevantes\s*=\s*\[[^\]]*['"]estado['"]/,
    "camposRelevantes debe incluir 'estado'"
  );
});

test('E1.6', 'trigger beforeSave coerce fechaBaja=hoy cuando estado=Baja', () => {
  const src = readFile(MAIN_JS);
  // Debe existir un beforeSave dentro de _registrarTriggerInventario
  const inicio = src.indexOf('function _registrarTriggerInventario(');
  const cuerpo = src.slice(inicio, inicio + 3500);
  assertContains(cuerpo, 'Parse.Cloud.beforeSave(clase', 'falta beforeSave registrado por clase');
  assertContains(cuerpo, "estado === 'Baja'", "beforeSave debe chequear estado === 'Baja'");
  assertContains(cuerpo, "obj.set('fechaBaja'", 'beforeSave debe setear fechaBaja');
});

// =====================================================================
// ETAPA 2 — stats fisicas globales y badge inmediato
// =====================================================================

test('E2.1', 'cloud function getInventarioEstadisticasFisicas registrada', () => {
  const src = readFile(MAIN_JS);
  assertContains(
    src,
    "Parse.Cloud.define('getInventarioEstadisticasFisicas'",
    'falta cloud function getInventarioEstadisticasFisicas'
  );
});

test('E2.2', 'getInventarioEstadisticasFisicas devuelve total/activos/enMantencion/dadosBaja', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('getInventarioEstadisticasFisicas'");
  const cuerpo = src.slice(idx, idx + 4000);
  // Cuenta por estado
  assertContains(cuerpo, "qBueno.equalTo('estado', 'B')", 'falta count para estado=B');
  assertContains(cuerpo, "qMalo.equalTo('estado', 'M')", 'falta count para estado=M');
  assertContains(cuerpo, "qRegular.equalTo('estado', 'R')", 'falta count para estado=R');
  assertContains(cuerpo, "qBajaPorEstado.equalTo('estado', 'Baja')", 'falta count para estado=Baja');
  assertContains(cuerpo, "qBajaPorFecha.lessThanOrEqualTo('fechaBaja'", 'falta count para fechaBaja vigente');
  // Suma sin doble conteo (por estado XOR por fecha)
  assertContains(cuerpo, "qBajaPorFecha.notEqualTo('estado', 'Baja')", 'fechaBaja debe excluir los que ya estan en Baja');
  // Devuelve los campos esperados
  assertContains(cuerpo, 'total,', 'falta total en respuesta');
  assertContains(cuerpo, 'activos:', 'falta activos en respuesta');
  assertContains(cuerpo, 'enMantencion:', 'falta enMantencion en respuesta');
  assertContains(cuerpo, 'dadosBaja,', 'falta dadosBaja en respuesta');
});

test('E2.3', 'los 4 services exponen getEstadisticasFisicas con la clase correcta', () => {
  for (const d of DOMINIOS) {
    const src = readFile(d.service);
    assertContains(src, 'static async getEstadisticasFisicas(', `${d.service}: falta getEstadisticasFisicas`);
    assertContains(src, "'getInventarioEstadisticasFisicas'", `${d.service}: debe llamar a la cloud function`);
    assertContains(src, `clase: '${d.clase}'`, `${d.service}: debe pasar clase=${d.clase}`);
  }
});

test('E2.4', 'las 4 paginas usan statsGlobal en lugar de filter sobre la pagina', () => {
  for (const d of DOMINIOS) {
    const src = readFile(d.page);
    assertContains(src, 'setStatsGlobal', `${d.page}: debe usar setStatsGlobal`);
    assertContains(src, 'fetchStatsGlobal', `${d.page}: debe declarar fetchStatsGlobal`);
    assertContains(src, 'getEstadisticasFisicas()', `${d.page}: debe llamar a getEstadisticasFisicas()`);
    // Ya no debe haber el bug de useMemo con .filter sobre la coleccion paginada
    const patronBug = new RegExp(`${d.coleccionVar}\\.filter\\(\\(\\w+\\)\\s*=>\\s*\\w+\\.estado\\s*===\\s*'Baja'\\)`);
    assertTrue(!patronBug.test(src), `${d.page}: aun calcula dadosBaja con filter sobre la pagina`);
  }
});

test('E2.5', 'fetchStatsGlobal se invoca tras crear / editar / borrar / sync / import', () => {
  for (const d of DOMINIOS) {
    const src = readFile(d.page);
    // Debe aparecer al menos 4 veces (tabla inicial + post-sync + post-delete + post-import + post-form)
    const ocurrencias = (src.match(/fetchStatsGlobal\(\)/g) || []).length;
    assertTrue(ocurrencias >= 4, `${d.page}: fetchStatsGlobal deberia invocarse en multiples flujos (${ocurrencias} encontradas)`);
  }
});

test('E2.6', 'CumplimientoBadge acepta estadoFisico/fechaBaja y muestra "Dado de baja" inmediato', () => {
  const src = readFile(BADGE_PATH);
  assertContains(src, 'estadoFisico?:', 'CumplimientoBadge debe aceptar estadoFisico opcional');
  assertContains(src, 'fechaBaja?:', 'CumplimientoBadge debe aceptar fechaBaja opcional');
  assertContains(src, 'esBajaInmediata(', 'debe haber helper esBajaInmediata');
  assertContains(src, "'dado_de_baja'", 'debe forzar estadoEfectivo a dado_de_baja cuando aplica');
});

test('E2.7', 'las 4 paginas pasan estadoFisico/fechaBaja al CumplimientoBadge de la tabla', () => {
  for (const d of DOMINIOS) {
    const src = readFile(d.page);
    // Buscar al menos una invocacion con esos props en la tabla
    assertMatch(
      src,
      /<CumplimientoBadge[\s\S]*?estadoFisico=[\s\S]*?fechaBaja=/,
      `${d.page}: CumplimientoBadge sin estadoFisico/fechaBaja`
    );
  }
});

// =====================================================================
// ETAPA 3 — accion atomica Dar de Baja / Reactivar
// =====================================================================

test('E3.1', 'cloud function darDeBajaActivo registrada con permisos COORDINATOR', () => {
  const src = readFile(MAIN_JS);
  assertContains(src, "Parse.Cloud.define('darDeBajaActivo'", 'falta darDeBajaActivo');
  const idx = src.indexOf("Parse.Cloud.define('darDeBajaActivo'");
  const cuerpo = src.slice(idx, idx + 3000);
  assertContains(cuerpo, 'accessLevel < 3', 'darDeBajaActivo debe requerir accessLevel >= 3');
  assertContains(cuerpo, "obj.set('estado', 'Baja')", 'debe setear estado=Baja');
  assertContains(cuerpo, "obj.set('fechaBaja'", 'debe setear fechaBaja');
  assertContains(cuerpo, "obj.set('estadoPrevio'", 'debe persistir estadoPrevio para reactivacion');
  assertContains(cuerpo, "'baja'", 'debe registrar accion historial baja');
});

test('E3.2', 'cloud function reactivarActivo registrada con permisos ADMIN', () => {
  const src = readFile(MAIN_JS);
  assertContains(src, "Parse.Cloud.define('reactivarActivo'", 'falta reactivarActivo');
  const idx = src.indexOf("Parse.Cloud.define('reactivarActivo'");
  const cuerpo = src.slice(idx, idx + 2500);
  assertContains(cuerpo, 'accessLevel < 4', 'reactivarActivo debe requerir accessLevel >= 4');
  assertContains(cuerpo, "obj.set('fechaBaja', '')", 'debe limpiar fechaBaja');
  assertContains(cuerpo, "'reactivacion'", 'debe registrar accion historial reactivacion');
});

test('E3.3', '_BAJA_INVENTARIO_HOOKS mapea las 4 clases con su registrarHistorial', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf('_BAJA_INVENTARIO_HOOKS');
  assertTrue(idx > -1, 'falta _BAJA_INVENTARIO_HOOKS');
  const cuerpo = src.slice(idx, idx + 1500);
  for (const d of DOMINIOS) {
    assertContains(cuerpo, `${d.clase}:`, `_BAJA_INVENTARIO_HOOKS debe contemplar ${d.clase}`);
  }
});

test('E3.4', 'BajaActivoModal compartido existe con props clase/activoId/modo', () => {
  assertTrue(existsFile(BAJA_MODAL_PATH), `falta archivo ${BAJA_MODAL_PATH}`);
  const src = readFile(BAJA_MODAL_PATH);
  assertContains(src, 'clase: ClaseInventario', 'BajaActivoModal debe tipar clase');
  assertContains(src, "modo: 'baja' | 'reactivar'", 'BajaActivoModal debe soportar ambos modos');
  assertContains(src, "Parse.Cloud.run('darDeBajaActivo'", 'debe invocar darDeBajaActivo');
  assertContains(src, "Parse.Cloud.run('reactivarActivo'", 'debe invocar reactivarActivo');
});

test('E3.5', 'los 4 detail modals integran BajaActivoModal con la clase correcta', () => {
  for (const d of DOMINIOS) {
    const src = readFile(d.detail);
    assertContains(src, 'BajaActivoModal', `${d.detail}: falta importar BajaActivoModal`);
    assertContains(src, `clase="${d.clase}"`, `${d.detail}: BajaActivoModal sin clase=${d.clase}`);
    assertContains(src, 'Dar de baja', `${d.detail}: falta boton "Dar de baja"`);
    assertContains(src, 'Reactivar', `${d.detail}: falta boton "Reactivar"`);
    assertContains(src, 'estaDeBaja', `${d.detail}: debe calcular estaDeBaja`);
  }
});

test('E3.6', 'las 4 paginas pasan onActivoChanged al detail modal', () => {
  for (const d of DOMINIOS) {
    const src = readFile(d.page);
    assertContains(src, 'onActivoChanged', `${d.page}: debe pasar onActivoChanged al detail modal`);
    // El callback debe refrescar tabla y stats
    const idx = src.indexOf('onActivoChanged');
    const cuerpo = src.slice(idx, idx + 300);
    assertContains(cuerpo, `${d.fetchFn}()`, `${d.page}: onActivoChanged debe refrescar ${d.fetchFn}`);
    assertContains(cuerpo, 'fetchStatsGlobal()', `${d.page}: onActivoChanged debe refrescar stats`);
  }
});

// =====================================================================
// ETAPA 4 — dashboard global consolidado
// =====================================================================

test('E4.1', 'cloud function getDashboardInventarios registrada', () => {
  const src = readFile(MAIN_JS);
  assertContains(src, "Parse.Cloud.define('getDashboardInventarios'", 'falta getDashboardInventarios');
});

test('E4.2', 'getDashboardInventarios cubre los 4 dominios y devuelve totales + cumplimiento', () => {
  const src = readFile(MAIN_JS);
  const idx = src.indexOf("Parse.Cloud.define('getDashboardInventarios'");
  const cuerpo = src.slice(idx, idx + 5000);
  assertContains(cuerpo, 'CLASES_INVENTARIO', 'debe iterar las 4 clases del util');
  assertContains(cuerpo, 'porDominio', 'debe devolver porDominio');
  assertContains(cuerpo, 'totales', 'debe devolver totales');
  assertContains(cuerpo, 'cumplimiento', 'debe devolver agregado de cumplimiento');
  assertContains(cuerpo, 'porcentajePromedio', 'debe devolver porcentajePromedio');
});

test('E4.3', 'home /admin/default invoca getDashboardInventarios y enlaza a los 4 inventarios', () => {
  const src = readFile(DEFAULT_PAGE);
  assertContains(src, "Parse.Cloud.run('getDashboardInventarios'", 'home no consume getDashboardInventarios');
  assertContains(src, '/admin/inventario', 'home no enlaza a /admin/inventario');
  assertContains(src, '/admin/inventario-industrial', 'home no enlaza a /admin/inventario-industrial');
  assertContains(src, '/admin/infraestructura', 'home no enlaza a /admin/infraestructura');
  assertContains(src, '/admin/flota-vehicular', 'home no enlaza a /admin/flota-vehicular');
});

test('E4.4', 'home muestra los 4 dominios + 3 totales + tabla de cumplimiento', () => {
  const src = readFile(DEFAULT_PAGE);
  // 4 cards por dominio en map
  assertContains(src, 'dominios.map((dom)', 'falta map sobre los 4 dominios');
  // 3 totales globales
  assertContains(src, 'totales.activos', 'falta total activos');
  assertContains(src, 'totales.enMantencion', 'falta total enMantencion');
  assertContains(src, 'totales.dadosBaja', 'falta total dadosBaja');
  // Tabla con estados de cumplimiento
  assertContains(src, 'al_dia', 'falta columna al_dia');
  assertContains(src, 'con_retraso', 'falta columna con_retraso');
  assertContains(src, 'critico', 'falta columna critico');
  assertContains(src, 'dado_de_baja', 'falta columna dado_de_baja');
});

test('E4.5', 'home expone boton "Sincronizar todo" para ADMIN', () => {
  const src = readFile(DEFAULT_PAGE);
  assertContains(src, 'Sincronizar todo', 'falta boton "Sincronizar todo"');
  assertContains(src, "Parse.Cloud.run('sincronizarCumplimientoMasivo'", 'falta invocacion sincronizar masivo');
  assertContains(src, 'userAccessLevel >= 4', 'el boton debe ser para ADMIN o superior');
});

// =====================================================================
// COBERTURA TRANSVERSAL — los 4 dominios reciben los mismos cambios
// =====================================================================

test('CT.1', 'los 4 dominios estan declarados en cumplimientoMantenimiento.js', () => {
  const src = readFile(CUMPLIMIENTO_UTIL);
  for (const d of DOMINIOS) {
    assertContains(src, `${d.clase}:`, `${d.clase} no esta en DOMINIO_POR_CLASE`);
  }
});

test('CT.2', 'el documento de revision existe y describe el plan de 4 etapas', () => {
  const docPath = 'context/mmtto/revision-inventarios/revision-inventario-dashboard.md';
  assertTrue(existsFile(docPath), `falta documento ${docPath}`);
  const src = readFile(docPath);
  assertContains(src, 'Etapa 1', 'el documento debe describir Etapa 1');
  assertContains(src, 'Etapa 2', 'el documento debe describir Etapa 2');
  assertContains(src, 'Etapa 3', 'el documento debe describir Etapa 3');
  assertContains(src, 'Etapa 4', 'el documento debe describir Etapa 4');
});

// =====================================================================
runTests();
