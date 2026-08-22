#!/usr/bin/env node
/**
 * Test suite — Etapa 4: Dashboard, Alertas y Extensiones.
 *
 * Ejecuta la bateria T4.1 a T4.6 definida en
 * context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Plan de Pruebas.
 *
 * Uso:
 *   node scripts/test/test_4InventarioMantenimiento.js
 *
 * Cubre:
 *  - Cloud functions nuevas: getTopActivosCriticos, getProximosMantenimientos, getCumplimientoLog
 *  - getEstadisticasCumplimiento agrega correctamente por dominio
 *  - sincronizarActivoParse genera entradas de CumplimientoLog cuando cambia el estado
 *  - Frontend: pagina /admin/mantenimiento/cumplimiento existe y monta los 3 sub-componentes
 *  - Sidebar (routes.tsx) incluye entrada "Cumplimiento" con permisos COORDINATOR+
 *  - Resumen Excel descargable con 3 hojas (Top, Proximos, Resumen)
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
  console.log(' ETAPA 4 -- Dashboard, Alertas y Extensiones');
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
    addAscending() { return this; }
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

  class ParseObjectClass {
    static extend(className) {
      return class {
        constructor() {
          this.className = className;
          this._data = {};
          this.id = null;
          this.createdAt = null;
        }
        set(key, value) { this._data[key] = value; }
        get(key) { return this._data[key]; }
        async save() {
          this.id = this.id || `${className}:${Math.random().toString(36).slice(2, 9)}`;
          this.createdAt = new Date();
          if (!storage[className]) storage[className] = [];
          // Replicar como ParseObject regular para que las queries lo encuentren
          const wrapped = {
            id: this.id,
            className,
            createdAt: this.createdAt,
            updatedAt: this.createdAt,
            get: (k) => k === 'createdAt' ? this.createdAt : k === 'updatedAt' ? this.createdAt : this._data[k],
            set: (k, v) => { this._data[k] = v; },
            save: () => Promise.resolve(wrapped),
          };
          storage[className].push(wrapped);
          return this;
        }
      };
    }
  }

  return { Query, Object: ParseObjectClass };
}

const HOY = new Date(Date.UTC(2026, 3, 24));
const hace = (m) => cumpl.formatFecha(cumpl.addMeses(HOY, -m));

// =====================================================================
// T4.1 — getEstadisticasCumplimiento agrega correctamente
// =====================================================================
test('T4.1', 'cloud function getEstadisticasCumplimiento esta declarada en main.js', () => {
  const src = readFile('backend/cloud/main.js');
  assertContains(src, "Parse.Cloud.define('getEstadisticasCumplimiento'", 'declaracion');
  assertContains(src, 'porDominio', 'retorna porDominio');
  assertContains(src, 'totalActivos', 'retorna totalActivos');
  assertContains(src, 'porcentajePromedio', 'retorna porcentajePromedio');
});

// =====================================================================
// T4.2 — getTopActivosCriticos declarada y filtra
// =====================================================================
test('T4.2', 'getTopActivosCriticos filtra por periodosFaltantes > 0 y ordena desc', () => {
  const src = readFile('backend/cloud/main.js');
  assertContains(src, "Parse.Cloud.define('getTopActivosCriticos'", 'declaracion');
  assertContains(src, "greaterThan('periodosFaltantes', 0)", 'filtro mayor que 0');
  assertContains(src, "descending('periodosFaltantes')", 'orden desc');
});

// =====================================================================
// T4.3 — getProximosMantenimientos con ventana de dias
// =====================================================================
test('T4.3', 'getProximosMantenimientos acepta param dias y filtra por ventana', () => {
  const src = readFile('backend/cloud/main.js');
  assertContains(src, "Parse.Cloud.define('getProximosMantenimientos'", 'declaracion');
  assertContains(src, 'ventanaDias', 'retorna ventanaDias');
  assertContains(src, "ascending('proximaFechaMantenimientoEsperada')", 'orden asc por proxima fecha');
});

// =====================================================================
// T4.4 — getCumplimientoLog requiere COORDINATOR
// =====================================================================
test('T4.4', 'getCumplimientoLog declarada y requiere accessLevel >= 3', () => {
  const src = readFile('backend/cloud/main.js');
  assertContains(src, "Parse.Cloud.define('getCumplimientoLog'", 'declaracion');
  // Buscar el patron de validacion de permisos cerca de la funcion
  const idx = src.indexOf("Parse.Cloud.define('getCumplimientoLog'");
  const slice = src.slice(idx, idx + 800);
  assertContains(slice, 'accessLevel < 3', 'requiere coordinador');
});

// =====================================================================
// T4.5 — sincronizarActivoParse registra entrada CumplimientoLog en transicion
// =====================================================================
test('T4.5', 'sincronizarActivoParse registra CumplimientoLog cuando cambia estado', async () => {
  const storage = {
    InventarioEquipoMedico: [],
    RegistroMantenimiento: [],
    CumplimientoLog: [],
  };
  // Activo con estado anterior 'sin_historial'
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13),
    frecuencia: 6,
    activo: true,
    estadoCumplimientoMantenimiento: 'sin_historial', // estado anterior simulado
    cumplimientoPorcentaje: 0,
  }, 'EQ_LOG');
  storage.InventarioEquipoMedico.push(activoObj);
  // Aprobado en periodo medio -> cambia a con_retraso (1 cumplido + 1 faltante)
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_LOG', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_LOG'));

  const ParseMock = createParseMock(storage);
  const r = await cumpl.sincronizarActivoParse(ParseMock, 'EQ_LOG', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertTrue(r.ok, 'sync ok');
  // Verificar que se registro el log
  assertEq(storage.CumplimientoLog.length, 1, '1 entrada de CumplimientoLog');
  const log = storage.CumplimientoLog[0];
  assertEq(log.get('activoId'), 'EQ_LOG');
  assertEq(log.get('estadoAnterior'), 'sin_historial');
  assertTrue(log.get('estadoNuevo') !== 'sin_historial', 'estadoNuevo distinto al anterior');
});

// =====================================================================
// T4.6 — sincronizarActivoParse NO registra log si el estado no cambia
// =====================================================================
test('T4.6', 'sincronizarActivoParse no registra CumplimientoLog si el estado se mantiene', async () => {
  const storage = {
    InventarioEquipoMedico: [],
    RegistroMantenimiento: [],
    CumplimientoLog: [],
  };
  // Primera ejecucion (estado anterior vacio) -> no registra
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13),
    frecuencia: 6,
    activo: true,
    // estadoCumplimientoMantenimiento ausente
  }, 'EQ_NL');
  storage.InventarioEquipoMedico.push(activoObj);
  const ParseMock = createParseMock(storage);
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_NL', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(storage.CumplimientoLog.length, 0, 'no log en primera sync (sin estado anterior)');
  // Segunda ejecucion: el estado ya esta seteado y no cambia
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_NL', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(storage.CumplimientoLog.length, 0, 'sin log si estado no cambio');
});

// =====================================================================
// T4.7 — Pagina del dashboard existe y monta los 3 sub-componentes
// =====================================================================
test('T4.7', 'pagina /admin/mantenimiento/cumplimiento existe y usa los 3 componentes', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/cumplimiento/page.tsx');
  assertContains(src, 'CumplimientoKPICards', 'monta KPICards');
  assertContains(src, 'CumplimientoPorDominioChart', 'monta chart');
  assertContains(src, 'CumplimientoTopCriticos', 'monta top criticos');
  // Cloud functions invocadas
  assertContains(src, "Parse.Cloud.run('getEstadisticasCumplimiento'", 'invoca estadisticas');
  assertContains(src, "Parse.Cloud.run('getTopActivosCriticos'", 'invoca top criticos');
  assertContains(src, "Parse.Cloud.run('getProximosMantenimientos'", 'invoca proximos');
});

// =====================================================================
// T4.8 — Permisos: COORDINATOR (3) puede ver, ADMIN (4) puede sincronizar masivo
// =====================================================================
test('T4.8', 'pagina aplica restricciones de permisos COORDINATOR / ADMIN', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/cumplimiento/page.tsx');
  assertContains(src, 'level >= 3', 'requiere COORDINATOR para ver');
  assertContains(src, 'userAccessLevel >= 4', 'sincronizar masivo solo ADMIN+');
  assertContains(src, "Parse.Cloud.run('sincronizarCumplimientoMasivo'", 'invoca sincronizacion masiva');
});

// =====================================================================
// T4.9 — Sidebar incluye entrada "Cumplimiento" con permisos COORDINATOR+
// =====================================================================
test('T4.9', 'routes.tsx agrega entrada "Cumplimiento" en grupo Mantenimiento', () => {
  const src = readFile('frontend/src/routes.tsx');
  assertContains(src, "name: 'Cumplimiento'", 'declara entrada');
  assertContains(src, "path: 'mantenimiento/cumplimiento'", 'path correcto');
  assertContains(src, 'MdAssessment', 'icono MdAssessment');
  // Verifica que tenga al menos COORDINATOR
  const idx = src.indexOf("name: 'Cumplimiento'");
  const slice = src.slice(idx, idx + 400);
  assertContains(slice, 'COORDINATOR', 'permiso COORDINATOR');
});

// =====================================================================
// T4.10 — Excel descargable con 3 hojas (Top, Proximos, Resumen)
// =====================================================================
test('T4.10', 'el dashboard ofrece exportacion Excel con 3 hojas legibles', () => {
  const src = readFile('frontend/src/app/admin/mantenimiento/cumplimiento/page.tsx');
  assertContains(src, "book_append_sheet(wb, wsTop, 'Top Criticos'", 'hoja Top Criticos');
  assertContains(src, "book_append_sheet(wb, wsProx", 'hoja Proximos');
  assertContains(src, "book_append_sheet(wb, wsRes, 'Resumen por Dominio'", 'hoja Resumen');
  // Labels legibles
  assertContains(src, 'ESTADO_CUMPLIMIENTO_LABELS', 'usa labels de cumplimiento');
  assertContains(src, 'DOMINIO_MANTENIMIENTO_LABELS', 'usa labels de dominio');
});

// =====================================================================
// T4.11 — Componente CumplimientoTopCriticos usa CumplimientoBadge y permite navegacion
// =====================================================================
test('T4.11', 'CumplimientoTopCriticos renderiza badge y construye URL al wizard', () => {
  const src = readFile('frontend/src/components/admin/mantenimiento/CumplimientoTopCriticos.tsx');
  assertContains(src, 'CumplimientoBadge', 'usa CumplimientoBadge');
  assertContains(src, '/admin/mantenimiento/nuevo', 'redirige al wizard');
  assertContains(src, "retroactivo: '1'", 'marca como retroactivo en URL params');
  assertContains(src, 'userAccessLevel >= 2', 'restringe accion a OPERATOR+');
});

// =====================================================================
// T4.12 — Componente CumplimientoPorDominioChart muestra distribucion
// =====================================================================
test('T4.12', 'CumplimientoPorDominioChart usa los 6 estados con colores', () => {
  const src = readFile('frontend/src/components/admin/mantenimiento/CumplimientoPorDominioChart.tsx');
  assertContains(src, 'al_dia', 'estado al_dia');
  assertContains(src, 'con_retraso', 'estado con_retraso');
  assertContains(src, 'critico', 'estado critico');
  assertContains(src, 'sin_historial', 'estado sin_historial');
  assertContains(src, 'sin_configuracion', 'estado sin_configuracion');
  assertContains(src, 'dado_de_baja', 'estado dado_de_baja');
  assertContains(src, 'bg-green-500', 'color verde');
  assertContains(src, 'bg-yellow-500', 'color amarillo');
  assertContains(src, 'bg-red-500', 'color rojo');
});

// =====================================================================
// T4.13 — Integracion: ventana de dias filtra correctamente con backend
// =====================================================================
test('T4.13', 'getProximosMantenimientos filtra por rango de fechas correctamente', async () => {
  const storage = { InventarioEquipoMedico: [] };
  const fechaCercana = cumpl.formatFecha(cumpl.addMeses(HOY, 0)); // hoy
  const fechaLejana = cumpl.formatFecha(cumpl.addMeses(HOY, 6));  // +6 meses
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    activo: true, proximaFechaMantenimientoEsperada: fechaCercana,
  }, 'PROX1'));
  storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
    activo: true, proximaFechaMantenimientoEsperada: fechaLejana,
  }, 'PROX2'));
  const ParseMock = createParseMock(storage);
  // Simular el filtro: 30 dias desde hoy
  const desde = cumpl.formatFecha(HOY);
  const hasta = cumpl.formatFecha(new Date(HOY.getTime() + 30 * 24 * 60 * 60 * 1000));
  const q = new ParseMock.Query('InventarioEquipoMedico');
  q.equalTo('activo', true);
  q.greaterThanOrEqualTo('proximaFechaMantenimientoEsperada', desde);
  q.lessThanOrEqualTo('proximaFechaMantenimientoEsperada', hasta);
  const results = await q.find();
  assertEq(results.length, 1, 'solo el cercano cae en ventana 30d');
  assertEq(results[0].id, 'PROX1');
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => { console.error('Error fatal:', e); process.exit(99); });
