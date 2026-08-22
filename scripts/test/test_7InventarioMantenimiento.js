#!/usr/bin/env node
/**
 * Test suite — Etapa 7: Pautas centralizadas, Excel completo y pautas retroactivas.
 *
 * Cubre la bateria T7.1 a T7.12 definida en
 * context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Plan de Pruebas.
 *
 * Verifica:
 *  - Mapeo DOMINIO_POR_CLASE (1-1) y filtro NO por pauta para conteo.
 *  - exportarRegistrosMantenimiento incluye flag esRetroactivo y periodoIndice.
 *  - crearRegistroMantenimiento setea esRetroactivo automaticamente si retraso > 7 dias.
 *  - motivoRetroactivo obligatorio cuando esRetroactivo=true.
 *  - periodoIndice se calcula correctamente desde fechaBase + frecuencia.
 *  - Wizard reconoce retroactivo=1 y muestra textarea + valida.
 *  - Solapamiento: 2 mantos en mismo periodo -> uno cumple, otro extra.
 *  - Validacion de fecha < fechaBase rechaza.
 *  - getRegularizacionesPendientes existe y filtra correctamente.
 *  - Dashboard incluye seccion Regularizaciones con boton Exportar.
 *
 * Exit code = cantidad de tests fallidos.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const cumpl = require(path.join(ROOT, 'backend', 'cloud', 'utils', 'cumplimientoMantenimiento.js'));

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
function readFile(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

async function runTests() {
  const ancho = 72;
  console.log('='.repeat(ancho));
  console.log(' ETAPA 7 -- Pautas centralizadas, Excel y retroactivos');
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

const HOY = new Date(Date.UTC(2026, 3, 24));
const hace = (m) => cumpl.formatFecha(cumpl.addMeses(HOY, -m));

// =====================================================================
// T7.1 — Mapeo DOMINIO_POR_CLASE (verificacion estatica)
// =====================================================================
test('T7.1', 'DOMINIO_POR_CLASE mantiene la correspondencia 1-1 con las 4 clases', () => {
  const clases = ['InventarioEquipoMedico', 'InventarioEquipoIndustrial', 'InventarioFlotaVehicular', 'InventarioInfraestructura'];
  const dominios = ['equipoMedico', 'equipoIndustrial', 'flotaVehicular', 'infraestructura'];
  for (let i = 0; i < clases.length; i++) {
    assertEq(cumpl.DOMINIO_POR_CLASE[clases[i]], dominios[i]);
    assertEq(cumpl.CLASE_POR_DOMINIO[dominios[i]], clases[i]);
  }
});

// =====================================================================
// T7.2 — El motor NO filtra por clasificacionEquipo (un activo cuenta todos sus aprobados)
// =====================================================================
test('T7.2', 'cumplimiento cuenta TODOS los aprobados del activo independiente de la clasificacion', () => {
  // Activo con 2 mantos aprobados en distintas clasificaciones
  const r = cumpl.calcularCumplimiento(
    { fechaBase: hace(13), frecuencia: 6 },
    [
      { fecha: hace(10), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo', activo: true, id: 'A', clasificacionEquipo: 'PautaA' },
      { fecha: hace(4), estadoValidacion: 'aprobado', tipoMantenimiento: 'correctivo', activo: true, id: 'B', clasificacionEquipo: 'PautaB' },
    ],
    HOY
  );
  // Ambos cuentan, no se filtra por clasificacion
  assertEq(r.periodosCumplidos, 2);
});

// =====================================================================
// T7.3 — exportarRegistrosMantenimiento expone los nuevos campos
// =====================================================================
test('T7.3', 'exportarRegistrosMantenimiento serializa esRetroactivo, motivoRetroactivo, periodoIndice', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('exportarRegistrosMantenimiento'");
  assertTrue(idx > 0);
  const slice = src.slice(idx, idx + 5000);
  assertContains(slice, 'esRetroactivo', 'incluye esRetroactivo');
  assertContains(slice, 'motivoRetroactivo', 'incluye motivoRetroactivo');
  assertContains(slice, 'periodoIndice', 'incluye periodoIndice');
});

// =====================================================================
// T7.4 — serializarRegistroMantenimiento incluye los nuevos campos
// =====================================================================
test('T7.4', 'serializarRegistroMantenimiento incluye campos de retroactividad', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf('function serializarRegistroMantenimiento');
  assertTrue(idx > 0);
  const slice = src.slice(idx, idx + 2500);
  assertContains(slice, "esRetroactivo: registro.get('esRetroactivo')", 'incluye esRetroactivo');
  assertContains(slice, "motivoRetroactivo: registro.get('motivoRetroactivo')", 'incluye motivoRetroactivo');
  assertContains(slice, "periodoIndice: registro.get('periodoIndice')", 'incluye periodoIndice');
});

// =====================================================================
// T7.5 — crearRegistroMantenimiento computa esRetroactivo automaticamente
// =====================================================================
test('T7.5', 'crearRegistroMantenimiento detecta retroactividad por umbral de 7 dias', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('crearRegistroMantenimiento'");
  const slice = src.slice(idx, idx + 12000);
  assertContains(slice, 'UMBRAL_RETROACTIVO_DIAS', 'declara umbral');
  assertContains(slice, 'diasDeRetraso > UMBRAL_RETROACTIVO_DIAS', 'compara con umbral');
  assertContains(slice, "registro.set('esRetroactivo'", 'persiste flag');
});

// =====================================================================
// T7.6 — crearRegistroMantenimiento valida motivoRetroactivo obligatorio
// =====================================================================
test('T7.6', 'crearRegistroMantenimiento rechaza si esRetroactivo y falta motivo', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('crearRegistroMantenimiento'");
  const slice = src.slice(idx, idx + 12000);
  assertContains(slice, 'motivoRetroactivoNorm', 'normaliza motivo');
  assertContains(slice, 'esRetroactivoCalculado && !motivoRetroactivoNorm', 'condicion de validacion');
  assertContains(slice, 'Se requiere motivoRetroactivo', 'mensaje de error claro');
});

// =====================================================================
// T7.7 — Calculo automatico de periodoIndice desde fechaBase + frecuencia
// =====================================================================
test('T7.7', 'crearRegistroMantenimiento calcula periodoIndice', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('crearRegistroMantenimiento'");
  const slice = src.slice(idx, idx + 12000);
  assertContains(slice, "registro.set('periodoIndice'", 'persiste indice');
  assertContains(slice, 'mesesDiff', 'calcula diferencia en meses');
  assertContains(slice, 'Math.floor(mesesDiff / frecuencia)', 'divide por frecuencia');
  assertContains(slice, 'fechaMtto.getTime() < fechaBase.getTime()', 'valida fecha >= fechaBase');
});

// =====================================================================
// T7.8 — Solapamiento: dos mantos en el mismo periodo -> 1 cumplido + 1 extra
// =====================================================================
test('T7.8', 'dos aprobados en el mismo periodo -> uno cuenta, otro como extra', () => {
  const r = cumpl.calcularCumplimiento(
    { fechaBase: hace(13), frecuencia: 6 },
    [
      { fecha: hace(10), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo', activo: true, id: 'P1' },
      { fecha: hace(9), estadoValidacion: 'aprobado', tipoMantenimiento: 'correctivo', activo: true, id: 'P2' }, // mismo periodo
    ],
    HOY
  );
  const cumplidos = r.periodos.filter((p) => p.estado === 'cumplido');
  assertEq(cumplidos.length, 1, '1 periodo cumplido');
  const conExtras = r.periodos.find((p) => p.extras && p.extras.length > 0);
  assertTrue(conExtras, 'periodo con extras existe');
  assertEq(conExtras.extras.length, 1, '1 extra');
});

// =====================================================================
// T7.9 — getRegularizacionesPendientes declarada y filtrada
// =====================================================================
test('T7.9', 'getRegularizacionesPendientes declarada con permisos COORDINATOR (3)', () => {
  const src = readFile('backend/cloud/main.js');
  assertContains(src, "Parse.Cloud.define('getRegularizacionesPendientes'", 'declaracion');
  const idx = src.indexOf("Parse.Cloud.define('getRegularizacionesPendientes'");
  const slice = src.slice(idx, idx + 3500);
  assertContains(slice, 'accessLevel < 3', 'requiere COORDINATOR');
  assertContains(slice, 'mesesMinRetraso', 'acepta filtro de retraso minimo');
  assertContains(slice, 'fechasFaltantes', 'retorna fechas faltantes');
  assertContains(slice, 'primerPeriodoFaltanteIndice', 'retorna indice del primer faltante');
});

// =====================================================================
// T7.10 — Wizard agrega textarea motivoRetroactivo cuando ctxRetroactivo
// =====================================================================
test('T7.10', 'wizard /admin/mantenimiento/nuevo muestra textarea cuando retroactivo=1', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  assertContains(src, 'motivoRetroactivo', 'declara estado');
  assertContains(src, 'setMotivoRetroactivo', 'setter');
  // Render condicional acepta ctxRetroactivo solo o ctxRetroactivo || esFechaRetroactiva (Etapa 8)
  assertTrue(
    src.includes('{ctxRetroactivo &&') || src.includes('{(ctxRetroactivo || esFechaRetroactiva)'),
    'render condicional cuando es retroactivo'
  );
  assertContains(src, 'Motivo del registro retroactivo', 'label visible al usuario');
  // Validacion en validarFinal
  assertTrue(
    src.includes('ctxRetroactivo && !motivoRetroactivo.trim()') ||
      src.includes('requiereMotivo && !motivoRetroactivo.trim()'),
    'valida campo no vacio cuando es retroactivo'
  );
});

// =====================================================================
// T7.11 — Wizard propaga campos retroactivos al backend
// =====================================================================
test('T7.11', 'wizard envia esRetroactivo, motivoRetroactivo, periodoIndice en MantenimientoFormData', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  assertContains(src, 'data.esRetroactivo = true', 'setea flag');
  assertContains(src, 'data.motivoRetroactivo = motivoRetroactivo.trim()', 'envia motivo');
  assertContains(src, 'data.periodoIndice = idx', 'envia indice si viene en query');
});

// =====================================================================
// T7.12 — Tipos frontend extendidos con campos retroactivos
// =====================================================================
test('T7.12', 'mantenimiento.types.ts incluye campos retroactivos en RegistroMantenimiento y FormData', () => {
  const src = readFile('frontend/src/types/mantenimiento.types.ts');
  // En interface RegistroMantenimiento
  assertContains(src, 'esRetroactivo?: boolean;', 'flag opcional en RegistroMantenimiento');
  assertContains(src, 'motivoRetroactivo?: string;', 'motivo en interface');
  assertContains(src, 'periodoIndice?: number | null;', 'indice opcional');
  // En MantenimientoFormData
  assertContains(src, 'esRetroactivo?: boolean;', 'flag en FormData (re-uso de assertion)');
  // En RegistroMantenimientoExport
  assertContains(src, "Etapa 7.2.2", 'comentario de Etapa 7.2.2 en exports');
});

// =====================================================================
// T7.13 — Dashboard incluye seccion "Regularizaciones Pendientes" + boton exportar
// =====================================================================
test('T7.13', 'dashboard de cumplimiento incluye seccion Regularizaciones y boton Exportar', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/cumplimiento/page.tsx');
  assertContains(src, 'Regularizaciones Pendientes', 'titulo de seccion');
  assertContains(src, "Parse.Cloud.run('getRegularizacionesPendientes'", 'invoca cloud function');
  assertContains(src, 'handleExportarRegularizaciones', 'handler exportacion');
  assertContains(src, 'Exportar regularizaciones', 'boton exportar');
  // Filtro por retraso
  assertContains(src, 'mesesMinRetraso', 'estado de filtro');
  assertContains(src, "Retraso &gt;= 6 meses", 'opciones de filtro');
});

// =====================================================================
// T7.14 — Dashboard construye URL al wizard con retroactivo=1 desde regularizaciones
// =====================================================================
test('T7.14', 'dashboard navega a wizard con dominio + activoId + retroactivo + periodoIndice + fechaSugerida', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/cumplimiento/page.tsx');
  assertContains(src, 'irRetroactivo', 'helper de navegacion');
  // retroactivo puede pasarse en el constructor de URLSearchParams o via .set()
  assertTrue(
    src.includes("retroactivo: '1'") || src.includes("set('retroactivo', '1')"),
    'marca como retroactivo'
  );
  assertContains(src, "set('periodoIndice'", 'propaga indice');
  assertContains(src, "set('fechaSugerida'", 'propaga fecha sugerida');
  assertContains(src, '/admin/mantenimiento/nuevo', 'redirige al wizard');
});

// =====================================================================
// T7.15 — ActivoMantenimientosPanel renderiza chip RETRO en historial
// =====================================================================
test('T7.15', 'ActivoMantenimientosPanel muestra chip "RETRO" si esRetroactivo', () => {
  const src = readFile('frontend/src/components/admin/mantenimiento/ActivoMantenimientosPanel.tsx');
  assertContains(src, 'r.esRetroactivo', 'lee el flag');
  assertContains(src, 'RETRO', 'muestra chip');
  assertContains(src, 'r.motivoRetroactivo', 'tooltip con motivo');
});

// =====================================================================
// T7.16 — Pauta asignada del activo se preserva pero NO filtra cumplimiento
// =====================================================================
test('T7.16', 'pautaAsignada del activo NO filtra mantenimientos contabilizados', () => {
  // Activo con pautaAsignada = "PautaA", pero existe mantto con clasificacion "PautaDistinta"
  const r = cumpl.calcularCumplimiento(
    { fechaBase: hace(13), frecuencia: 6, pautaAsignada: 'PautaA' },
    [
      { fecha: hace(10), estadoValidacion: 'aprobado', activo: true, id: 'X', clasificacionEquipo: 'PautaDistinta' },
    ],
    HOY
  );
  // Se cuenta igual aunque la clasificacion sea distinta
  assertEq(r.periodosCumplidos, 1);
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => { console.error('Error fatal:', e); process.exit(99); });
