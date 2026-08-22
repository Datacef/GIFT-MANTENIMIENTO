#!/usr/bin/env node
/**
 * Test suite — Etapa 9: Boton "Sincronizar" consolidado en los 4 inventarios.
 *
 * El boton anterior llamado "Actualizar Convenios" se renombra a "Sincronizar"
 * y ejecuta en paralelo:
 *   - sincronizarConveniosInventario({ inventarioTipo })
 *   - sincronizarCumplimientoMasivo({ dominio })
 *
 * Usa Promise.allSettled-like (con catch en cada uno) para tolerar fallos parciales.
 * El SweetAlert resultante muestra ambas operaciones consolidadas.
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
function readFile(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

async function runTests() {
  const ancho = 72;
  console.log('='.repeat(ancho));
  console.log(' ETAPA 9 -- Boton Sincronizar consolidado');
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
// Path constants
// =====================================================================
const PAGINAS = [
  { rel: 'frontend/src/app/admin/inventario/page.tsx', tipo: 'medico', dominio: 'equipoMedico' },
  { rel: 'frontend/src/app/admin/inventario-industrial/page.tsx', tipo: 'industrial', dominio: 'equipoIndustrial' },
  { rel: 'frontend/src/app/admin/flota-vehicular/page.tsx', tipo: 'flota', dominio: 'flotaVehicular' },
  { rel: 'frontend/src/app/admin/infraestructura/page.tsx', tipo: 'infraestructura', dominio: 'infraestructura' },
];

// =====================================================================
// T9.1 — Las 4 paginas tienen el handler renombrado a handleSync
// =====================================================================
test('T9.1', 'las 4 paginas declaran handleSync (no handleSyncConvenios)', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    assertContains(src, 'const handleSync = async', `${p.rel} debe declarar handleSync`);
    // No debe quedar el viejo
    assertNotContains(src, 'const handleSyncConvenios = async', `${p.rel} no debe tener handleSyncConvenios viejo`);
  }
});

// =====================================================================
// T9.2 — El boton se renombra a "Sincronizar" (sin "Actualizar Convenios")
// =====================================================================
test('T9.2', 'el boton se renombra a "Sincronizar" en las 4 paginas', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    assertContains(src, "{syncing ? 'Sincronizando...' : 'Sincronizar'}", `${p.rel} muestra "Sincronizar"`);
    assertNotContains(src, "'Actualizar Convenios'", `${p.rel} no debe tener "Actualizar Convenios"`);
  }
});

// =====================================================================
// T9.3 — Cada handleSync invoca AMBAS cloud functions en paralelo
// =====================================================================
test('T9.3', 'handleSync invoca sincronizarConveniosInventario y sincronizarCumplimientoMasivo en Promise.all', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    const idx = src.indexOf('const handleSync = async');
    const slice = src.slice(idx, idx + 4000);
    assertContains(slice, 'Promise.all', `${p.rel} usa Promise.all`);
    assertContains(slice, "Parse.Cloud.run('sincronizarConveniosInventario'", `${p.rel} invoca convenios`);
    assertContains(slice, "Parse.Cloud.run('sincronizarCumplimientoMasivo'", `${p.rel} invoca cumplimiento`);
  }
});

// =====================================================================
// T9.4 — Cada pagina invoca con el inventarioTipo y dominio correctos
// =====================================================================
test('T9.4', 'cada pagina invoca con su inventarioTipo y dominio correspondientes', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    assertContains(src, `inventarioTipo: '${p.tipo}'`, `${p.rel} usa inventarioTipo='${p.tipo}'`);
    assertContains(src, `dominio: '${p.dominio}'`, `${p.rel} usa dominio='${p.dominio}'`);
  }
});

// =====================================================================
// T9.5 — Cada handleSync maneja errores parciales con .catch()
// =====================================================================
test('T9.5', 'cada operacion en Promise.all tiene .catch() para tolerar fallos parciales', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    const idx = src.indexOf('const handleSync = async');
    const slice = src.slice(idx, idx + 4000);
    // Cada Parse.Cloud.run debe tener .catch
    const matches = (slice.match(/Parse\.Cloud\.run\([^)]+\)\.catch/g) || []).length;
    assertTrue(matches >= 2, `${p.rel} debe tener al menos 2 .catch (tiene ${matches})`);
  }
});

// =====================================================================
// T9.6 — SweetAlert resultante muestra ambas operaciones
// =====================================================================
test('T9.6', 'el SweetAlert final muestra resultado de Convenios y Cumplimiento', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    const idx = src.indexOf('const handleSync = async');
    const slice = src.slice(idx, idx + 5000);
    assertContains(slice, '<strong>Convenios</strong>', `${p.rel} muestra seccion Convenios`);
    assertContains(slice, 'Cumplimiento de mantenimiento', `${p.rel} muestra seccion Cumplimiento`);
    assertContains(slice, 'Sincronizacion completada', `${p.rel} titulo del resultado`);
  }
});

// =====================================================================
// T9.7 — El boton mantiene gating COORDINATOR (3+) ya que convenios lo requiere
// =====================================================================
test('T9.7', 'el boton sigue restringido a COORDINATOR+ (userAccessLevel >= 3)', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    // El boton se envuelve con la verificacion de nivel
    const idx = src.indexOf('onClick={handleSync}');
    assertTrue(idx > 0, `${p.rel} tiene boton handleSync`);
    // 200 chars antes y despues
    const slice = src.slice(Math.max(0, idx - 200), idx);
    assertContains(slice, 'userAccessLevel >= 3', `${p.rel} restringe a COORDINATOR+`);
  }
});

// =====================================================================
// T9.8 — Tooltip del boton informa que sincroniza ambas cosas
// =====================================================================
test('T9.8', 'el boton tiene tooltip explicativo de la sincronizacion consolidada', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    assertContains(src, 'title="Sincronizar convenios + cumplimiento de mantenimiento"', `${p.rel} tooltip`);
  }
});

// =====================================================================
// T9.9 — handleSync invoca fetch{Equipos|Vehiculos|Componentes} al final para refrescar
// =====================================================================
test('T9.9', 'handleSync recarga la tabla del inventario al finalizar', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    const idx = src.indexOf('const handleSync = async');
    const slice = src.slice(idx, idx + 5000);
    // Cada inventario tiene su propio fetch
    const tienefetch = slice.includes('fetchEquipos()') || slice.includes('fetchVehiculos()') || slice.includes('fetchComponentes()');
    assertTrue(tienefetch, `${p.rel} debe recargar la tabla tras sincronizar`);
  }
});

// =====================================================================
// T9.10 — Mensaje de error claro si cumplimiento falla por permisos
// =====================================================================
test('T9.10', 'mensaje de error explica que cumplimiento requiere permisos ADMIN', () => {
  for (const p of PAGINAS) {
    const src = readFile(p.rel);
    const idx = src.indexOf('const handleSync = async');
    const slice = src.slice(idx, idx + 5000);
    assertContains(slice, 'requiere permisos ADMIN', `${p.rel} aclara permisos requeridos`);
  }
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => { console.error('Error fatal:', e); process.exit(99); });
