#!/usr/bin/env node
/**
 * Test suite — Etapa 8: Edicion de fecha del mantenimiento + regla no-regresiva.
 *
 * Cubre la bateria T8.1 a T8.14 definida en
 * context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Plan de Pruebas.
 *
 * Verifica:
 *  - Wizard tiene fecha editable (useState) en lugar de hardcoded.
 *  - Input de fecha con min (fechaBase) y max (hoy).
 *  - Banner amarillo si retraso > 7 dias.
 *  - Validaciones frontend y backend.
 *  - Regla no-regresiva en resolverUltimoMantenimiento.
 *  - Retroactivo cierra periodoIndice correcto sin pisar ultimaFechaMantenimiento.
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
  console.log(' ETAPA 8 -- Edicion de fecha + regla no-regresiva');
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
// Parse mock
// =====================================================================
function makeParseObject(className, data, id) {
  const _data = Object.assign({}, data);
  return {
    id: id || `${className}:${Math.random().toString(36).slice(2, 9)}`,
    className,
    createdAt: _data._createdAt || new Date(),
    updatedAt: _data._updatedAt || new Date(),
    get(key) {
      if (key === 'createdAt') return this.createdAt;
      if (key === 'updatedAt') return this.updatedAt;
      return _data[key];
    },
    set(key, value) { _data[key] = value; },
    save() { return Promise.resolve(this); },
  };
}

const HOY = new Date(Date.UTC(2026, 3, 24));
const hace = (m) => cumpl.formatFecha(cumpl.addMeses(HOY, -m));

// =====================================================================
// T8.1 — Wizard reemplaza const fecha por useState editable
// =====================================================================
test('T8.1', 'wizard tiene fecha editable con useState (no hardcoded)', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  // No debe quedar la linea hardcoded original
  assertTrue(
    !src.includes('const fecha = new Date().toISOString().slice(0, 10);'),
    'no debe quedar la fecha hardcoded original'
  );
  // Debe usar useState con fechaSugerida o hoy
  assertContains(src, 'useState<string>(ctxFechaSugerida || hoyStr)', 'fecha editable con default');
  assertContains(src, 'setFecha', 'tiene setter');
});

// =====================================================================
// T8.2 — Input date con min y max
// =====================================================================
test('T8.2', 'wizard renderiza input type="date" con min/max', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  assertContains(src, 'type="date"', 'input de fecha');
  assertContains(src, 'min={fechaBaseActivo || undefined}', 'min = fechaBase');
  assertContains(src, 'max={hoyStr}', 'max = hoy');
  assertContains(src, 'Fecha de ejecucion del mantenimiento', 'label visible');
});

// =====================================================================
// T8.3 — Banner amarillo si retraso > 7 dias
// =====================================================================
test('T8.3', 'wizard muestra banner amarillo cuando esFechaRetroactiva', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  assertContains(src, 'esFechaRetroactiva', 'declara variable');
  assertContains(src, 'diasDeRetraso > 7', 'umbral 7 dias');
  assertContains(src, '{esFechaRetroactiva &&', 'banner condicional');
  assertContains(src, 'Mantenimiento retroactivo', 'texto del banner');
});

// =====================================================================
// T8.4 — Textarea motivoRetroactivo aparece tambien con esFechaRetroactiva
// =====================================================================
test('T8.4', 'textarea motivoRetroactivo aparece tanto con ctxRetroactivo como con esFechaRetroactiva', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  assertContains(src, '{(ctxRetroactivo || esFechaRetroactiva)', 'render condicional combinado');
});

// =====================================================================
// T8.5 — Validaciones de fecha en validarFinal
// =====================================================================
test('T8.5', 'validarFinal valida rango de fecha (no futura, no anterior a fechaBase)', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  assertContains(src, 'fecha > hoyStr', 'rechaza fecha futura');
  assertContains(src, 'fecha < fechaBaseActivo', 'rechaza fecha anterior a fechaBase');
  assertContains(src, 'requiereMotivo && !motivoRetroactivo.trim()', 'valida motivo si retroactivo');
});

// =====================================================================
// T8.6 — Backend: crearRegistroMantenimiento valida fecha futura
// =====================================================================
test('T8.6', 'crearRegistroMantenimiento backend rechaza fecha futura', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('crearRegistroMantenimiento'");
  const slice = src.slice(idx, idx + 12000);
  assertContains(slice, 'data.fecha.trim() > hoyStrBackend', 'compara con hoy');
  assertContains(slice, 'no puede ser futura', 'mensaje de error claro');
});

// =====================================================================
// T8.7 — resolverUltimoMantenimiento sigue regla no-regresiva (orden por fecha desc)
// =====================================================================
test('T8.7', 'resolverUltimoMantenimiento toma el de mayor fecha aunque haya un retroactivo posterior', () => {
  // Activo con un mantto en 2026-03-15 y un retroactivo creado HOY pero con fecha 2026-02-10
  const r = cumpl.resolverUltimoMantenimiento([
    { fecha: '2026-03-15', estadoValidacion: 'aprobado', activo: true, id: 'A' },
    { fecha: '2026-02-10', estadoValidacion: 'aprobado', activo: true, id: 'RETRO', createdAt: new Date() },
  ]);
  // El retroactivo NO pisa: gana A (mayor fecha)
  assertEq(r.id, 'A');
  assertEq(r.fecha, '2026-03-15');
});

// =====================================================================
// T8.8 — Retroactivo con fecha mayor SI actualiza ultimaFechaMantenimiento
// =====================================================================
test('T8.8', 'retroactivo con fecha posterior a la existente SI actualiza ultimaFechaMantenimiento', () => {
  const r = cumpl.resolverUltimoMantenimiento([
    { fecha: '2026-03-15', estadoValidacion: 'aprobado', activo: true, id: 'A' },
    { fecha: '2026-04-10', estadoValidacion: 'aprobado', activo: true, id: 'RETRO_MAYOR' },
  ]);
  assertEq(r.id, 'RETRO_MAYOR');
  assertEq(r.fecha, '2026-04-10');
});

// =====================================================================
// T8.9 — Retroactivo sin historial previo: define ultimaFecha
// =====================================================================
test('T8.9', 'primer registro retroactivo (sin historial) define ultimaFechaMantenimiento', () => {
  const r = cumpl.resolverUltimoMantenimiento([
    { fecha: '2026-01-05', estadoValidacion: 'aprobado', activo: true, id: 'PRIMERO' },
  ]);
  assertEq(r.id, 'PRIMERO');
  assertEq(r.fecha, '2026-01-05');
  assertEq(r.estado, 'aprobado');
});

// =====================================================================
// T8.10 — Retroactivo cierra periodoIndice correcto (no el periodo actual)
// =====================================================================
test('T8.10', 'retroactivo cierra el periodo correspondiente a su fecha, no el actual', () => {
  // fechaBase hace 24 meses, frec 6 -> 4 periodos
  // Mantto retroactivo en hace 18 meses (cierra periodo 1, indice 1)
  const r = cumpl.calcularCumplimiento(
    { fechaBase: hace(24), frecuencia: 6 },
    [{ fecha: hace(18), estadoValidacion: 'aprobado', activo: true, id: 'R1' }],
    HOY
  );
  // Buscar el periodo cumplido y su indice
  const cumplido = r.periodos.find((p) => p.estado === 'cumplido');
  assertTrue(cumplido, 'hay un periodo cumplido');
  // Hace(18) cae al inicio del periodo 1 (entre hace(24) y hace(18))
  // Periodo 0: [hace(24), hace(18))
  // hace(18) NO es < hace(18), por lo que cae en periodo 1: [hace(18), hace(12))
  assertEq(cumplido.indice, 1, 'el periodo 1 (indice 1)');
});

// =====================================================================
// T8.11 — Validacion backend: fecha < fechaBase rechaza
// =====================================================================
test('T8.11', 'crearRegistroMantenimiento valida fecha >= fechaBase del activo', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('crearRegistroMantenimiento'");
  const slice = src.slice(idx, idx + 12000);
  assertContains(slice, 'fechaMtto.getTime() < fechaBase.getTime()', 'compara fecha vs base');
  assertContains(slice, 'anterior a la fecha base', 'mensaje claro');
});

// =====================================================================
// T8.12 — Resumen del wizard refleja la fecha editable (no la hardcoded)
// =====================================================================
test('T8.12', 'el resumen del paso 4 muestra el valor de fecha del state', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  // El resumen usa {fecha} que ahora es state -> automaticamente refleja el cambio
  assertContains(src, '<span>Fecha:</span>', 'label en resumen');
  assertContains(src, '<span className="font-medium">{fecha}</span>', 'valor reactivo');
});

// =====================================================================
// T8.13 — diasDeRetraso se calcula correctamente
// =====================================================================
test('T8.13', 'diasDeRetraso se calcula correctamente desde fecha y hoy', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  assertContains(src, 'diasDeRetraso', 'declara variable');
  assertContains(src, '24 * 60 * 60 * 1000', 'conversion a dias');
});

// =====================================================================
// T8.14 — Wizard envia esRetroactivo cuando aplica (Etapa 8 + 7)
// =====================================================================
test('T8.14', 'wizard envia esRetroactivo si fecha es retroactiva (no solo por ctxRetroactivo)', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/nuevo/page.tsx');
  assertContains(src, 'ctxRetroactivo || esFechaRetroactiva', 'condicion combinada en envio');
  assertContains(src, 'data.esRetroactivo = true', 'setea flag');
  assertContains(src, 'data.motivoRetroactivo = motivoRetroactivo.trim()', 'envia motivo');
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => { console.error('Error fatal:', e); process.exit(99); });
