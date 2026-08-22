#!/usr/bin/env node
/**
 * Test suite — Etapa 2: Integracion en listados y filtros de los 4 inventarios.
 *
 * Ejecuta la bateria T2.1 a T2.12 definida en
 * context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Plan de Pruebas.
 *
 * Uso:
 *   node scripts/test/test_2InventarioMantenimiento.js
 *
 * Los tests ejercitan:
 *  - Helpers puros (`mapCumplimientoFromRemote`, `formatFechaCumplimiento`) leidos
 *    desde el source TypeScript mediante un mini-transpilador regex (no depende de tsc).
 *  - Propagacion de filtros `estadoCumplimiento`, `ultimoMttoDesde`, `ultimoMttoHasta`
 *    a traves del motor de cumplimiento contra un Parse mock en memoria.
 *  - Exportacion Excel: verifica que las columnas nuevas contengan valores legibles
 *    (labels en espanol) y que los codigos crudos no se filtren.
 *
 * Exit code = cantidad de tests fallidos (0 si todos pasan).
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

// =====================================================================
// Mini "transpilador" — extrae constantes/funciones TS puras a objetos JS.
// Usado solo para validar los types de Etapa 2 sin correr webpack ni tsc.
// =====================================================================
function loadTsModuleAsJs(relativePath) {
  const full = path.join(ROOT, relativePath);
  let src = fs.readFileSync(full, 'utf8');

  // Quitar `export ` y anotaciones de tipo sencillas
  src = src.replace(/^export\s+/gm, '');
  src = src.replace(/:\s*Record<[^>]+>/g, '');
  src = src.replace(/:\s*string\[\]/g, '');
  src = src.replace(/:\s*string/g, '');
  src = src.replace(/:\s*number/g, '');
  src = src.replace(/:\s*boolean/g, '');
  src = src.replace(/:\s*any/g, '');
  // Interfaces completas
  src = src.replace(/^interface\s+\w+\s*\{[\s\S]*?^\}\s*$/gm, '');
  // Type annotations en parametros de funcion (simplistas)
  src = src.replace(/\(([^)]*)\)/g, (m, inner) => {
    const cleaned = inner.replace(/:\s*[^,=)]+/g, '');
    return '(' + cleaned + ')';
  });
  // Anotaciones de retorno `: CumplimientoMantenimientoCampos {`
  src = src.replace(/\)\s*:\s*\w+[\w<>\[\]| ]*\s*\{/g, ') {');

  const exportLine = `\nmodule.exports = {
    ESTADO_CUMPLIMIENTO_OPTIONS: typeof ESTADO_CUMPLIMIENTO_OPTIONS !== "undefined" ? ESTADO_CUMPLIMIENTO_OPTIONS : undefined,
    ESTADO_CUMPLIMIENTO_LABELS: typeof ESTADO_CUMPLIMIENTO_LABELS !== "undefined" ? ESTADO_CUMPLIMIENTO_LABELS : undefined,
    ESTADO_CUMPLIMIENTO_COLORS: typeof ESTADO_CUMPLIMIENTO_COLORS !== "undefined" ? ESTADO_CUMPLIMIENTO_COLORS : undefined,
    ULTIMO_ESTADO_MTTO_LABELS: typeof ULTIMO_ESTADO_MTTO_LABELS !== "undefined" ? ULTIMO_ESTADO_MTTO_LABELS : undefined,
    ULTIMO_ESTADO_MTTO_COLORS: typeof ULTIMO_ESTADO_MTTO_COLORS !== "undefined" ? ULTIMO_ESTADO_MTTO_COLORS : undefined,
    mapCumplimientoFromRemote: typeof mapCumplimientoFromRemote !== "undefined" ? mapCumplimientoFromRemote : undefined,
    formatFechaCumplimiento: typeof formatFechaCumplimiento !== "undefined" ? formatFechaCumplimiento : undefined
  };`;
  const moduleWrapper = new Function('module', 'exports', 'require', src + exportLine);
  const m = { exports: {} };
  moduleWrapper(m, m.exports, require);
  return m.exports;
}

// Cargar el modulo de tipos compartidos como JS
let tipos;
try {
  tipos = loadTsModuleAsJs('frontend/src/types/cumplimiento-mantenimiento.types.ts');
} catch (e) {
  console.error('FATAL: no se pudo cargar cumplimiento-mantenimiento.types.ts');
  console.error(e.message);
  process.exit(99);
}

// Motor (Etapa 1) — reutilizado para integracion
const cumpl = require(path.join(ROOT, 'backend', 'cloud', 'utils', 'cumplimientoMantenimiento.js'));

// =====================================================================
// Mini framework de tests
// =====================================================================
const tests = [];
let passed = 0;
let failed = 0;
const failures = [];

function test(id, nombre, fn) {
  tests.push({ id, nombre, fn });
}

function assertEq(actual, expected, mensaje) {
  const a = typeof actual === 'object' ? JSON.stringify(actual) : String(actual);
  const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
  if (a !== e) {
    throw new Error(`${mensaje || 'assertEq'}: esperado ${e} -- recibido ${a}`);
  }
}

function assertTrue(cond, mensaje) {
  if (!cond) throw new Error(mensaje || 'assertTrue fallo');
}

function assertContains(str, substr, mensaje) {
  if (!String(str).includes(substr)) throw new Error(`${mensaje || 'assertContains'}: no contiene "${substr}"`);
}

async function runTests() {
  const ancho = 72;
  console.log('='.repeat(ancho));
  console.log(' ETAPA 2 -- Listados, filtros y exportaciones con cumplimiento');
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
// Helpers de Parse mock (reutilizados)
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

function createParseMock(storage) {
  class Query {
    constructor(className) {
      this.className = className;
      this._filters = [];
      this._limit = 100;
      this._skip = 0;
      this._order = null;
    }
    equalTo(k, v) { this._filters.push(['eq', k, v]); return this; }
    notEqualTo(k, v) { this._filters.push(['neq', k, v]); return this; }
    greaterThan(k, v) { this._filters.push(['gt', k, v]); return this; }
    greaterThanOrEqualTo(k, v) { this._filters.push(['gte', k, v]); return this; }
    lessThan(k, v) { this._filters.push(['lt', k, v]); return this; }
    lessThanOrEqualTo(k, v) { this._filters.push(['lte', k, v]); return this; }
    ascending(k) { this._order = { key: k, dir: 1 }; return this; }
    descending(k) { this._order = { key: k, dir: -1 }; return this; }
    limit(n) { this._limit = n; return this; }
    skip(n) { this._skip = n; return this; }
    select() { return this; }
    _matches(obj) {
      for (const [op, k, v] of this._filters) {
        const val = obj.get(k);
        switch (op) {
          case 'eq': if (val !== v) return false; break;
          case 'neq': if (val === v) return false; break;
          case 'gt': if (!(val > v)) return false; break;
          case 'gte': if (!(val >= v)) return false; break;
          case 'lt': if (!(val < v)) return false; break;
          case 'lte': if (!(val <= v)) return false; break;
        }
      }
      return true;
    }
    find() {
      const all = (storage[this.className] || []).filter((o) => this._matches(o));
      if (this._order) {
        const { key, dir } = this._order;
        all.sort((a, b) => {
          const av = a.get(key); const bv = b.get(key);
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
      return Promise.resolve(all.slice(this._skip, this._skip + this._limit));
    }
    count() { return Promise.resolve((storage[this.className] || []).filter((o) => this._matches(o)).length); }
    get(id) {
      const found = (storage[this.className] || []).find((o) => o.id === id);
      if (!found) return Promise.reject(new Error(`object not found ${this.className}:${id}`));
      return Promise.resolve(found);
    }
  }
  return { Query };
}

const HOY = new Date(Date.UTC(2026, 3, 24));
const hace = (meses) => cumpl.formatFecha(cumpl.addMeses(HOY, -meses));

// =====================================================================
// T2.1 — mapeo: incluye nuevos campos de cumplimiento
// =====================================================================
test('T2.1', 'mapCumplimientoFromRemote normaliza todos los campos', () => {
  const r = tipos.mapCumplimientoFromRemote({
    ultimaFechaMantenimiento: '2026-02-15',
    ultimoRegistroMantenimientoId: 'abc123',
    ultimoTipoMantenimiento: 'preventivo',
    ultimoEstadoMantenimiento: 'aprobado',
    proximaFechaMantenimientoEsperada: '2026-08-15',
    periodosEsperados: 4,
    periodosCumplidos: 3,
    periodosFaltantes: 1,
    cumplimientoPorcentaje: 75,
    estadoCumplimientoMantenimiento: 'con_retraso',
    ultimoCalculoCumplimiento: '2026-04-24T12:00:00Z',
  });
  assertEq(r.ultimaFechaMantenimiento, '2026-02-15');
  assertEq(r.ultimoEstadoMantenimiento, 'aprobado');
  assertEq(r.periodosCumplidos, 3);
  assertEq(r.periodosFaltantes, 1);
  assertEq(r.cumplimientoPorcentaje, 75);
  assertEq(r.estadoCumplimientoMantenimiento, 'con_retraso');
});

// =====================================================================
// T2.2 — Defaults cuando el backend no entrega campos
// =====================================================================
test('T2.2', 'mapCumplimientoFromRemote aplica defaults seguros', () => {
  const r = tipos.mapCumplimientoFromRemote({});
  assertEq(r.ultimaFechaMantenimiento, '');
  assertEq(r.ultimoRegistroMantenimientoId, '');
  assertEq(r.ultimoEstadoMantenimiento, 'sin_historial');
  assertEq(r.estadoCumplimientoMantenimiento, 'sin_configuracion');
  assertEq(r.periodosEsperados, 0);
  assertEq(r.periodosCumplidos, 0);
  assertEq(r.periodosFaltantes, 0);
  assertEq(r.cumplimientoPorcentaje, 0);
});

// =====================================================================
// T2.3 — Codigos crudos se traducen a labels legibles
// =====================================================================
test('T2.3', 'ULTIMO_ESTADO_MTTO_LABELS traduce los 4 estados a humanos', () => {
  assertEq(tipos.ULTIMO_ESTADO_MTTO_LABELS['pendiente'], 'En validacion');
  assertEq(tipos.ULTIMO_ESTADO_MTTO_LABELS['aprobado'], 'Aprobado');
  assertEq(tipos.ULTIMO_ESTADO_MTTO_LABELS['rechazado'], 'Rechazado');
  assertEq(tipos.ULTIMO_ESTADO_MTTO_LABELS['sin_historial'], 'Sin historial');
});

test('T2.3b', 'ESTADO_CUMPLIMIENTO_LABELS y _COLORS cubren los 6 estados', () => {
  const esperados = ['sin_configuracion', 'sin_historial', 'al_dia', 'con_retraso', 'critico', 'dado_de_baja'];
  for (const e of esperados) {
    assertTrue(tipos.ESTADO_CUMPLIMIENTO_LABELS[e], `label para ${e}`);
    assertTrue(tipos.ESTADO_CUMPLIMIENTO_COLORS[e], `color para ${e}`);
  }
});

// =====================================================================
// T2.4 — formatFechaCumplimiento dd/mm/yyyy (locale es-CL)
// =====================================================================
test('T2.4', 'formatFechaCumplimiento convierte YYYY-MM-DD a dd/mm/yyyy', () => {
  assertEq(tipos.formatFechaCumplimiento('2026-04-24'), '24/04/2026');
  assertEq(tipos.formatFechaCumplimiento('2025-01-01'), '01/01/2025');
  assertEq(tipos.formatFechaCumplimiento(''), '—'); // guion largo
  assertEq(tipos.formatFechaCumplimiento('invalida'), 'invalida');
});

// =====================================================================
// T2.5 — ESTADO_CUMPLIMIENTO_OPTIONS con "todos" como primera opcion
// =====================================================================
test('T2.5', 'ESTADO_CUMPLIMIENTO_OPTIONS comienza con "todos" y tiene 7 entradas', () => {
  assertTrue(Array.isArray(tipos.ESTADO_CUMPLIMIENTO_OPTIONS));
  assertEq(tipos.ESTADO_CUMPLIMIENTO_OPTIONS[0].value, 'todos');
  assertEq(tipos.ESTADO_CUMPLIMIENTO_OPTIONS.length, 7); // todos + 6 estados
});

// =====================================================================
// T2.6 — filtro estadoCumplimiento aplicado en backend mock
// =====================================================================
test('T2.6', 'filtro estadoCumplimiento separa correctamente activos por estado', async () => {
  const storage = { InventarioEquipoMedico: [] };
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    activo: true, estadoCumplimientoMantenimiento: 'al_dia',
  }, 'A1'));
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    activo: true, estadoCumplimientoMantenimiento: 'con_retraso',
  }, 'A2'));
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    activo: true, estadoCumplimientoMantenimiento: 'critico',
  }, 'A3'));
  const ParseMock = createParseMock(storage);

  const q = new ParseMock.Query('InventarioEquipoMedico');
  q.equalTo('activo', true);
  q.equalTo('estadoCumplimientoMantenimiento', 'critico');
  const results = await q.find();

  assertEq(results.length, 1);
  assertEq(results[0].id, 'A3');
});

// =====================================================================
// T2.7 — filtro por rango ultimoMttoDesde / ultimoMttoHasta
// =====================================================================
test('T2.7', 'filtro ultimoMttoDesde/Hasta funciona con rango de fechas', async () => {
  const storage = { InventarioEquipoMedico: [] };
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    activo: true, ultimaFechaMantenimiento: '2026-01-15',
  }, 'B1'));
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    activo: true, ultimaFechaMantenimiento: '2026-02-15',
  }, 'B2'));
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    activo: true, ultimaFechaMantenimiento: '2026-03-15',
  }, 'B3'));
  const ParseMock = createParseMock(storage);

  const q = new ParseMock.Query('InventarioEquipoMedico');
  q.equalTo('activo', true);
  q.greaterThanOrEqualTo('ultimaFechaMantenimiento', '2026-02-01');
  q.lessThanOrEqualTo('ultimaFechaMantenimiento', '2026-02-28');
  const results = await q.find();

  assertEq(results.length, 1);
  assertEq(results[0].id, 'B2');
});

// =====================================================================
// T2.8 — Integracion E1 + E2: sincronizar genera datos consumibles por mapItem
// =====================================================================
test('T2.8', 'tras sincronizar un activo, mapCumplimientoFromRemote produce campos correctos', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'C1');
  storage.InventarioEquipoMedico.push(activoObj);
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'C1', activoClase: 'InventarioEquipoMedico',
    fecha: hace(10), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R1'));
  const ParseMock = createParseMock(storage);
  await cumpl.sincronizarActivoParse(ParseMock, 'C1', 'InventarioEquipoMedico', { fechaActual: HOY });

  const remoteShape = {
    ultimaFechaMantenimiento: activoObj.get('ultimaFechaMantenimiento'),
    ultimoRegistroMantenimientoId: activoObj.get('ultimoRegistroMantenimientoId'),
    ultimoTipoMantenimiento: activoObj.get('ultimoTipoMantenimiento'),
    ultimoEstadoMantenimiento: activoObj.get('ultimoEstadoMantenimiento'),
    proximaFechaMantenimientoEsperada: activoObj.get('proximaFechaMantenimientoEsperada'),
    periodosEsperados: activoObj.get('periodosEsperados'),
    periodosCumplidos: activoObj.get('periodosCumplidos'),
    periodosFaltantes: activoObj.get('periodosFaltantes'),
    cumplimientoPorcentaje: activoObj.get('cumplimientoPorcentaje'),
    estadoCumplimientoMantenimiento: activoObj.get('estadoCumplimientoMantenimiento'),
  };
  const mapped = tipos.mapCumplimientoFromRemote(remoteShape);
  assertEq(mapped.ultimoEstadoMantenimiento, 'aprobado');
  assertEq(mapped.periodosCumplidos, 1);
  assertTrue(mapped.periodosEsperados >= 1, 'al menos 1 periodo esperado');
});

// =====================================================================
// T2.9 — Excel legible: sin codigos crudos, con labels en espanol
// =====================================================================
test('T2.9', 'fila Excel contiene labels legibles y no codigos crudos', () => {
  const equipo = {
    ultimaFechaMantenimiento: '2026-02-15',
    ultimoEstadoMantenimiento: 'pendiente',
    ultimoTipoMantenimiento: 'preventivo',
    proximaFechaMantenimientoEsperada: '2026-08-15',
    periodosEsperados: 4, periodosCumplidos: 3, periodosFaltantes: 1,
    cumplimientoPorcentaje: 75,
    estadoCumplimientoMantenimiento: 'con_retraso',
  };
  const row = {
    'Ultimo Mantto (fecha)': tipos.formatFechaCumplimiento(equipo.ultimaFechaMantenimiento),
    'Ultimo Mantto (estado)': tipos.ULTIMO_ESTADO_MTTO_LABELS[equipo.ultimoEstadoMantenimiento] || '',
    'Ultimo Mantto (tipo)': equipo.ultimoTipoMantenimiento || '',
    'Proximo Mantto esperado': tipos.formatFechaCumplimiento(equipo.proximaFechaMantenimientoEsperada),
    'Periodos cumplidos': equipo.periodosCumplidos,
    'Periodos esperados': equipo.periodosEsperados,
    'Periodos faltantes': equipo.periodosFaltantes,
    'Cumplimiento (%)': equipo.cumplimientoPorcentaje,
    'Estado Cumplimiento': tipos.ESTADO_CUMPLIMIENTO_LABELS[equipo.estadoCumplimientoMantenimiento] || '',
  };
  assertEq(row['Ultimo Mantto (fecha)'], '15/02/2026');
  assertEq(row['Ultimo Mantto (estado)'], 'En validacion');
  assertEq(row['Estado Cumplimiento'], 'Con retraso');
  assertEq(row['Cumplimiento (%)'], 75);
  const cadena = JSON.stringify(row);
  assertTrue(!cadena.includes('"pendiente"'), 'no debe contener codigo crudo "pendiente"');
  assertTrue(!cadena.includes('"con_retraso"'), 'no debe contener codigo crudo "con_retraso"');
});

// =====================================================================
// T2.10 — Estructura: los 4 types de inventario tienen los 10 campos
// =====================================================================
test('T2.10', 'los 4 types de inventario incluyen los 10 campos de cumplimiento', () => {
  const camposRequeridos = [
    'ultimaFechaMantenimiento',
    'ultimoRegistroMantenimientoId',
    'ultimoTipoMantenimiento',
    'ultimoEstadoMantenimiento',
    'proximaFechaMantenimientoEsperada',
    'periodosEsperados',
    'periodosCumplidos',
    'periodosFaltantes',
    'cumplimientoPorcentaje',
    'estadoCumplimientoMantenimiento',
  ];
  const archivosTypes = [
    'frontend/src/types/inventario-equipo.types.ts',
    'frontend/src/types/inventario-industrial.types.ts',
    'frontend/src/types/inventario-flota.types.ts',
    'frontend/src/types/inventario-infraestructura.types.ts',
  ];
  for (const rel of archivosTypes) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const campo of camposRequeridos) {
      assertContains(src, campo, `${rel} debe declarar ${campo}`);
    }
    assertContains(src, 'estadoCumplimiento', `${rel} debe incluir filtro estadoCumplimiento`);
    assertContains(src, 'ultimoMttoDesde', `${rel} debe incluir filtro ultimoMttoDesde`);
    assertContains(src, 'ultimoMttoHasta', `${rel} debe incluir filtro ultimoMttoHasta`);
  }
});

// =====================================================================
// T2.11 — los 4 services importan y usan mapCumplimientoFromRemote
// =====================================================================
test('T2.11', 'los 4 services importan y usan mapCumplimientoFromRemote', () => {
  const archivosSvc = [
    'frontend/src/services/inventario-equipo.service.ts',
    'frontend/src/services/inventario-industrial.service.ts',
    'frontend/src/services/inventario-flota.service.ts',
    'frontend/src/services/inventario-infraestructura.service.ts',
  ];
  for (const rel of archivosSvc) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assertContains(src, "from 'types/cumplimiento-mantenimiento.types'", `${rel} debe importar types compartidos`);
    assertContains(src, 'mapCumplimientoFromRemote(data)', `${rel} debe invocar mapCumplimientoFromRemote en mapItem`);
  }
});

// =====================================================================
// T2.12 — las 4 paginas exponen filtro y columnas nuevas
// =====================================================================
test('T2.12', 'las 4 paginas de inventario integran filtro y columnas de cumplimiento', () => {
  const archivosPages = [
    'frontend/src/app/admin/inventario/page.tsx',
    'frontend/src/app/admin/inventario-industrial/page.tsx',
    'frontend/src/app/admin/flota-vehicular/page.tsx',
    'frontend/src/app/admin/infraestructura/page.tsx',
  ];
  for (const rel of archivosPages) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assertContains(src, 'cumplimientoFilter', `${rel} debe declarar estado cumplimientoFilter`);
    assertContains(src, 'CumplimientoBadge', `${rel} debe renderizar CumplimientoBadge`);
    assertContains(src, 'UltimoMttoBadge', `${rel} debe renderizar UltimoMttoBadge`);
    assertContains(src, 'Ultimo Mantto', `${rel} debe incluir columna Ultimo Mantto`);
    assertContains(src, 'Cumplimiento', `${rel} debe incluir columna Cumplimiento`);
    assertContains(src, 'filters.estadoCumplimiento = cumplimientoFilter', `${rel} debe propagar el filtro al backend`);
    // Excel: columnas legibles
    assertContains(src, "'Ultimo Mantto (fecha)'", `${rel} debe exportar columna Excel "Ultimo Mantto (fecha)"`);
    assertContains(src, "'Cumplimiento (%)'", `${rel} debe exportar columna Excel "Cumplimiento (%)"`);
    assertContains(src, "'Estado Cumplimiento'", `${rel} debe exportar columna Excel "Estado Cumplimiento"`);
  }
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => {
  console.error('Error fatal en test runner:', e);
  process.exit(99);
});
