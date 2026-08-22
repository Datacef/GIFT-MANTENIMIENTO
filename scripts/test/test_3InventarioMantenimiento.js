#!/usr/bin/env node
/**
 * Test suite — Etapa 3: Pestana de Mantenimientos y Timeline en el Detalle.
 *
 * Ejecuta la bateria T3.1 a T3.6 definida en
 * context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Plan de Pruebas.
 *
 * Uso:
 *   node scripts/test/test_3InventarioMantenimiento.js
 *
 * Cubre:
 *  - El componente `ActivoMantenimientosPanel` declara las props correctas y
 *    renderiza las 3 secciones requeridas (metricas, timeline, historial).
 *  - Los 4 DetailModals integran la nueva tab "Mantenimientos" con badge.
 *  - El wizard `/admin/mantenimiento/nuevo` reconoce los query params
 *    `dominio`, `activoId`, `retroactivo`, `periodoIndice`, `fechaSugerida`.
 *  - El motor de Etapa 1 entrega el shape correcto al panel
 *    (periodos con estado cumplido/faltante/en_curso, metricas, etc.)
 *  - Estados de timeline coherentes con la documentacion.
 *
 * Exit code = cantidad de tests fallidos (0 si todos pasan).
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

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function runTests() {
  const ancho = 72;
  console.log('='.repeat(ancho));
  console.log(' ETAPA 3 -- Pestana de Mantenimientos y Timeline en el Detalle');
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
    constructor(className) { this.className = className; this._filters = []; this._limit = 100; this._skip = 0; this._order = null; }
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
        all.sort((a, b) => { const av = a.get(key); const bv = b.get(key); if (av < bv) return -1 * dir; if (av > bv) return 1 * dir; return 0; });
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
const hace = (m) => cumpl.formatFecha(cumpl.addMeses(HOY, -m));

// =====================================================================
// Path constants (verificacion estatica)
// =====================================================================
const PANEL_PATH = 'frontend/src/components/admin/mantenimiento/ActivoMantenimientosPanel.tsx';
const DETAIL_MODALS = [
  { rel: 'frontend/src/components/admin/inventario/InventarioDetailModal.tsx',
    activoClase: 'InventarioEquipoMedico', dominio: 'equipoMedico' },
  { rel: 'frontend/src/components/admin/inventario-industrial/InventarioIndustrialDetailModal.tsx',
    activoClase: 'InventarioEquipoIndustrial', dominio: 'equipoIndustrial' },
  { rel: 'frontend/src/components/admin/flota-vehicular/FlotaVehicularDetailModal.tsx',
    activoClase: 'InventarioFlotaVehicular', dominio: 'flotaVehicular' },
  { rel: 'frontend/src/components/admin/infraestructura/InfraestructuraDetailModal.tsx',
    activoClase: 'InventarioInfraestructura', dominio: 'infraestructura' },
];
const WIZARD_PATH = 'frontend/src/app/admin/mantenimiento/nuevo/page.tsx';

// =====================================================================
// T3.1 — ActivoMantenimientosPanel renderiza las 3 secciones requeridas
// =====================================================================
test('T3.1', 'ActivoMantenimientosPanel declara las 3 secciones (metricas, timeline, historial)', () => {
  const src = readFile(PANEL_PATH);
  // Seccion A — metricas
  assertContains(src, 'Ultimo Mantenimiento', 'card de ultimo mantenimiento');
  assertContains(src, 'Proximo esperado', 'card de proximo esperado');
  assertContains(src, 'Cumplimiento', 'card de cumplimiento');
  assertContains(src, 'Periodos', 'card de periodos');
  // Seccion B — timeline
  assertContains(src, 'Linea de Tiempo de Periodos', 'titulo de timeline');
  assertContains(src, 'Periodo #', 'numero de periodo en nodo');
  // Seccion C — historial
  assertContains(src, 'Historial de Mantenimientos del Activo', 'titulo de historial');
});

// =====================================================================
// T3.2 — El motor de Etapa 1 entrega los 3 estados de periodo: cumplido, faltante, en_curso
// =====================================================================
test('T3.2', 'calcularCumplimiento entrega periodos con estados cumplido/faltante/en_curso', () => {
  // 18 meses atras, frec 6 meses + 1 aprobado en periodo medio
  // Esperamos: P0 faltante, P1 cumplido, P2 en_curso
  const r = cumpl.calcularCumplimiento(
    { fechaBase: hace(18), frecuencia: 6 },
    [{ fecha: hace(8), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo', activo: true, id: 'X' }],
    HOY
  );
  const estados = r.periodos.map((p) => p.estado);
  assertTrue(estados.includes('cumplido'), 'al menos uno cumplido');
  assertTrue(estados.includes('faltante'), 'al menos uno faltante');
  assertTrue(estados.includes('en_curso'), 'al menos uno en_curso');
});

// =====================================================================
// T3.3 — Los 4 DetailModals integran la tab "Mantenimientos" con badge
// =====================================================================
test('T3.3', 'los 4 DetailModals incluyen tab "Mantenimientos" con ActivoMantenimientosPanel', () => {
  for (const m of DETAIL_MODALS) {
    const src = readFile(m.rel);
    assertContains(src, "ActivoMantenimientosPanel", `${m.rel} debe importar ActivoMantenimientosPanel`);
    assertContains(src, "'mantenimientos'", `${m.rel} debe definir tab 'mantenimientos'`);
    assertContains(src, 'MdBuild', `${m.rel} debe usar el icono MdBuild`);
    assertContains(src, 'periodosFaltantes', `${m.rel} debe leer periodosFaltantes para badge`);
    assertContains(src, `activoClase="${m.activoClase}"`, `${m.rel} debe pasar activoClase="${m.activoClase}"`);
    assertContains(src, `dominio="${m.dominio}"`, `${m.rel} debe pasar dominio="${m.dominio}"`);
  }
});

// =====================================================================
// T3.4 — Mini-seccion de cumplimiento en pestana Detalle con link a Timeline
// =====================================================================
test('T3.4', 'los 4 DetailModals tienen mini-seccion en Detalle con link "Ver timeline completo"', () => {
  for (const m of DETAIL_MODALS) {
    const src = readFile(m.rel);
    assertContains(src, 'Cumplimiento de Mantenimiento', `${m.rel} debe mostrar mini-seccion`);
    assertContains(src, 'Ver timeline completo', `${m.rel} debe tener link al timeline`);
    assertContains(src, "setActiveTab('mantenimientos')", `${m.rel} link debe cambiar la tab activa`);
    assertContains(src, 'CumplimientoBadge', `${m.rel} mini-seccion usa CumplimientoBadge`);
    assertContains(src, 'UltimoMttoBadge', `${m.rel} mini-seccion usa UltimoMttoBadge`);
  }
});

// =====================================================================
// T3.5 — Wizard reconoce query params (dominio, activoId, retroactivo, periodoIndice, fechaSugerida)
// =====================================================================
test('T3.5', 'wizard /admin/mantenimiento/nuevo lee los 5 query params y muestra banner', () => {
  const src = readFile(WIZARD_PATH);
  assertContains(src, 'useSearchParams', 'debe importar useSearchParams');
  assertContains(src, "searchParams?.get('dominio')", 'debe leer dominio');
  assertContains(src, "searchParams?.get('activoId')", 'debe leer activoId');
  assertContains(src, "searchParams?.get('retroactivo')", 'debe leer retroactivo');
  assertContains(src, "searchParams?.get('periodoIndice')", 'debe leer periodoIndice');
  assertContains(src, "searchParams?.get('fechaSugerida')", 'debe leer fechaSugerida');
  // Banner contextual
  assertContains(src, 'Estas registrando un mantenimiento retroactivo', 'banner para retroactivo');
  assertContains(src, 'Iniciando mantenimiento desde el inventario', 'banner para entrada normal');
});

// =====================================================================
// T3.6 — Navegacion cruzada: panel construye URL al wizard con todos los params
// =====================================================================
test('T3.6', 'ActivoMantenimientosPanel construye URL al wizard con dominio + activoId + retroactivo', () => {
  const src = readFile(PANEL_PATH);
  assertContains(src, '/admin/mantenimiento/nuevo?', 'debe redirigir al wizard');
  // Dominio y activoId pueden venir en el constructor de URLSearchParams
  assertTrue(src.includes("'dominio'") || src.includes('dominio,'), 'debe propagar dominio');
  assertTrue(src.includes("'activoId'") || src.includes('activoId,'), 'debe propagar activoId');
  assertContains(src, "set('retroactivo', '1')", 'debe marcar retroactivo en periodos faltantes');
  assertContains(src, "set('periodoIndice'", 'debe propagar el periodo indice');
  assertContains(src, "set('fechaSugerida'", 'debe propagar fecha sugerida');
});

// =====================================================================
// T3.7 — Periodos cumplidos muestran link al registro
// =====================================================================
test('T3.7', 'el panel construye link a /admin/mantenimiento/[id] desde periodos cumplidos', () => {
  const src = readFile(PANEL_PATH);
  assertContains(src, '/admin/mantenimiento/${', 'debe construir URL al detalle del registro');
  assertContains(src, 'Ver registro', 'debe ofrecer accion "Ver registro"');
});

// =====================================================================
// T3.8 — Las acciones del panel respetan permisos (OPERATOR+)
// =====================================================================
test('T3.8', 'el panel oculta botones de creacion para usuarios sin permisos OPERATOR (>= 2)', () => {
  const src = readFile(PANEL_PATH);
  assertContains(src, 'userAccessLevel >= 2', 'condicion de permiso para crear');
  // Ver registro debe estar disponible siempre (VIEWER 1+)
  assertContains(src, 'Ver registro', 'accion ver registro');
});

// =====================================================================
// T3.9 — Integracion: filtro por estadoValidacion en historial cronologico
// =====================================================================
test('T3.9', 'el panel ofrece filtro por estado de validacion en el historial', () => {
  const src = readFile(PANEL_PATH);
  assertContains(src, 'filtroValidacion', 'estado de filtro');
  assertContains(src, '"aprobado"', 'opcion aprobado');
  assertContains(src, '"pendiente"', 'opcion pendiente');
  assertContains(src, '"rechazado"', 'opcion rechazado');
});

// =====================================================================
// T3.10 — Carga de datos al montar: invoca cloud function calcular + getMantenimientosActivo
// =====================================================================
test('T3.10', 'el panel invoca calcularCumplimientoMantenimiento y getMantenimientosActivo al montar', () => {
  const src = readFile(PANEL_PATH);
  assertContains(src, "Parse.Cloud.run('calcularCumplimientoMantenimiento'", 'invoca calcular');
  assertContains(src, 'MantenimientoService.getMantenimientosActivo', 'invoca historial');
  assertContains(src, 'useEffect', 'usa useEffect para montaje');
});

// =====================================================================
// T3.11 — Integracion E1+E3: shape del resultado del cloud function compatible con panel
// =====================================================================
test('T3.11', 'sincronizacion produce un shape compatible con lo que el panel espera', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [] };
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(18), frecuencia: 6, activo: true,
  }, 'EQ'));
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R1'));

  const ParseMock = createParseMock(storage);
  // Reproducimos lo que hace `calcularCumplimientoMantenimiento` cloud function
  const r = await cumpl.sincronizarActivoParse(ParseMock, 'EQ', 'InventarioEquipoMedico', { persistir: false, fechaActual: HOY });

  assertTrue(r.ok, 'sincronizacion ok');
  // Validar el shape que el panel espera
  const data = r.resultado;
  const camposEsperados = [
    'estadoCumplimiento', 'periodos', 'periodosEsperados', 'periodosCumplidos',
    'periodosFaltantes', 'cumplimientoPorcentaje', 'ultimaFechaMantenimiento',
    'ultimoRegistroId', 'ultimoTipoMantenimiento', 'ultimoEstadoMantenimiento',
    'proximaFechaMantenimientoEsperada',
  ];
  for (const c of camposEsperados) {
    assertTrue(c in data, `campo ${c} debe estar en el resultado`);
  }
  // Validar shape de cada periodo
  assertTrue(Array.isArray(data.periodos), 'periodos es array');
  if (data.periodos.length > 0) {
    const p = data.periodos[0];
    const periodoCampos = ['indice', 'desde', 'hasta', 'estado', 'registroId', 'fechaRealizado', 'extras'];
    for (const c of periodoCampos) {
      assertTrue(c in p, `periodo debe tener campo ${c}`);
    }
  }
});

// =====================================================================
// T3.12 — Estados visuales del nodo de timeline (cumplido verde, faltante rojo, en_curso azul)
// =====================================================================
test('T3.12', 'PeriodoNodo asigna colores correctos por estado', () => {
  const src = readFile(PANEL_PATH);
  // Sub-componente de nodo
  assertContains(src, 'PeriodoNodo', 'declara sub-componente');
  // Verde para cumplido
  assertContains(src, 'border-l-green-500', 'borde verde');
  assertContains(src, 'text-green-500', 'icono verde');
  // Rojo para faltante
  assertContains(src, 'border-l-red-500', 'borde rojo');
  assertContains(src, 'text-red-500', 'icono rojo');
  // Azul para en_curso
  assertContains(src, 'border-l-blue-500', 'borde azul');
  assertContains(src, 'text-blue-500', 'icono azul');
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => {
  console.error('Error fatal en test runner:', e);
  process.exit(99);
});
