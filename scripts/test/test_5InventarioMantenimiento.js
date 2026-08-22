#!/usr/bin/env node
/**
 * Test suite — Etapa 5: Actualizacion inmediata del inventario al registrar mantenimiento.
 *
 * Ejecuta la bateria T5.1 a T5.5 definida en
 * context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Plan de Pruebas.
 *
 * Uso:
 *   node scripts/test/test_5InventarioMantenimiento.js
 *
 * Cubre:
 *  - crearRegistroMantenimiento invoca sincronizarActivoParse despues de save (verificacion estatica).
 *  - El motor `resolverUltimoMantenimiento` toma el registro NO rechazado mas reciente.
 *  - Estado `pendiente` del registro se refleja en `ultimoEstadoMantenimiento` del activo.
 *  - Multiples registros: el de fecha mas alta gana (regla no-regresiva).
 *  - Sincronizacion silenciosa: si el activo no existe, no falla la creacion del registro.
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
  console.log(' ETAPA 5 -- Actualizacion inmediata al registrar mantenimiento');
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
        constructor() { this.className = className; this._data = {}; this.id = null; this.createdAt = null; }
        set(key, value) { this._data[key] = value; }
        get(key) { return this._data[key]; }
        async save() {
          this.id = this.id || `${className}:${Math.random().toString(36).slice(2, 9)}`;
          this.createdAt = new Date();
          if (!storage[className]) storage[className] = [];
          const wrapped = {
            id: this.id, className,
            createdAt: this.createdAt, updatedAt: this.createdAt,
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
// T5.1 — crearRegistroMantenimiento invoca sincronizacion tras save (verificacion estatica)
// =====================================================================
test('T5.1', 'crearRegistroMantenimiento invoca sincronizarActivoParse tras registro.save()', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('crearRegistroMantenimiento'");
  assertTrue(idx > 0, 'funcion declarada');
  // Buscar el bloque de Etapa 5 dentro de crearRegistroMantenimiento
  const slice = src.slice(idx, idx + 10000);
  assertContains(slice, 'await registro.save', 'guarda el registro');
  assertContains(slice, 'Etapa 5', 'comentario de Etapa 5');
  assertContains(slice, "require('./utils/cumplimientoMantenimiento')", 'importa el modulo de utils');
  assertContains(slice, 'sincronizarActivoParse(Parse, data.activoId, data.activoClase', 'invoca sync con datos del registro');
  // Falla silenciosa
  assertContains(slice, 'try {', 'try block');
  assertContains(slice, 'catch', 'catch block');
});

// =====================================================================
// T5.2 — Crear registro pendiente refleja "ultima mantencion" en estado pendiente
// =====================================================================
test('T5.2', 'al crear un registro pendiente, ultimoEstadoMantenimiento del activo = pendiente', async () => {
  const storage = {
    InventarioEquipoMedico: [],
    RegistroMantenimiento: [],
    CumplimientoLog: [],
  };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
    estadoCumplimientoMantenimiento: 'sin_historial',
    cumplimientoPorcentaje: 0,
  }, 'EQ_PEND');
  storage.InventarioEquipoMedico.push(activoObj);
  // Simulamos lo que crearRegistroMantenimiento hace al guardar
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_PEND', activoClase: 'InventarioEquipoMedico',
    fecha: hace(1), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_PEND'));

  const ParseMock = createParseMock(storage);
  const r = await cumpl.sincronizarActivoParse(ParseMock, 'EQ_PEND', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertTrue(r.ok, 'sync ok');
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(1), 'ultima fecha = fecha del pendiente');
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'pendiente', 'estado pendiente');
  // Periodos cumplidos sigue 0 porque pendientes no cuentan
  assertEq(activoObj.get('periodosCumplidos'), 0, 'pendiente no cuenta para cumplimiento');
});

// =====================================================================
// T5.3 — Multiples registros: el de fecha mas alta no rechazado gana (regla no-regresiva)
// =====================================================================
test('T5.3', 'multiples registros: el no-rechazado mas reciente define ultimoMantto', async () => {
  const storage = {
    InventarioEquipoMedico: [],
    RegistroMantenimiento: [],
    CumplimientoLog: [],
  };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_MULTI');
  storage.InventarioEquipoMedico.push(activoObj);
  // Aprobado en hace(8)
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_MULTI', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_OLD_OK'));
  // Pendiente en hace(2) — mas reciente
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_MULTI', activoClase: 'InventarioEquipoMedico',
    fecha: hace(2), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_NEW_PEND'));
  // Rechazado en hace(1) — el mas reciente, pero rechazado: debe descartarse
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_MULTI', activoClase: 'InventarioEquipoMedico',
    fecha: hace(1), estadoValidacion: 'rechazado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_NEWER_REJ'));

  const ParseMock = createParseMock(storage);
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_MULTI', 'InventarioEquipoMedico', { fechaActual: HOY });
  // El pendiente de hace(2) gana — el rechazado de hace(1) NO cuenta
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(2));
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'pendiente');
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), 'R_NEW_PEND');
});

// =====================================================================
// T5.4 — Si el activo no existe, sincronizacion falla silenciosa
// =====================================================================
test('T5.4', 'sincronizarActivoParse retorna {ok:false} si el activo no existe (no lanza)', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [] };
  const ParseMock = createParseMock(storage);
  const r = await cumpl.sincronizarActivoParse(ParseMock, 'NO_EXISTE', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(r.ok, false, 'no es ok');
  assertTrue(r.error, 'tiene error message');
});

// =====================================================================
// T5.5 — resolverUltimoMantenimiento: sin_historial cuando todos rechazados
// =====================================================================
test('T5.5', 'resolverUltimoMantenimiento -> sin_historial si todos los registros estan rechazados', () => {
  const r = cumpl.resolverUltimoMantenimiento([
    { fecha: '2026-03-01', estadoValidacion: 'rechazado', activo: true, id: 'R1' },
    { fecha: '2026-04-15', estadoValidacion: 'rechazado', activo: true, id: 'R2' },
  ]);
  assertEq(r.estado, 'sin_historial');
  assertEq(r.fecha, '');
  assertEq(r.id, '');
});

// =====================================================================
// T5.6 — Estado pendiente NO incrementa periodosCumplidos
// =====================================================================
test('T5.6', 'pendiente no cuenta como cumplimiento aunque caiga en periodo', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_P');
  storage.InventarioEquipoMedico.push(activoObj);
  // Pendiente cae en periodo medio
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_P', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'RP'));

  const ParseMock = createParseMock(storage);
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_P', 'InventarioEquipoMedico', { fechaActual: HOY });
  // periodosCumplidos = 0 aun (pendiente no cuenta)
  assertEq(activoObj.get('periodosCumplidos'), 0);
  // Pero ultimaFecha si refleja el pendiente
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(8));
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'pendiente');
});

// =====================================================================
// T5.7 — Aprobar un pendiente: estado transita y cumplimiento sube
// =====================================================================
test('T5.7', 'al aprobar, ultimoEstado pasa a aprobado y periodosCumplidos incrementa', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_AP');
  storage.InventarioEquipoMedico.push(activoObj);
  const reg = makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_AP', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'RAP');
  storage.RegistroMantenimiento.push(reg);

  const ParseMock = createParseMock(storage);
  // 1. Sync inicial (estado pendiente)
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_AP', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'pendiente');
  assertEq(activoObj.get('periodosCumplidos'), 0);

  // 2. Simular aprobacion
  reg.set('estadoValidacion', 'aprobado');
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_AP', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'aprobado');
  assertEq(activoObj.get('periodosCumplidos'), 1);
});

// =====================================================================
// T5.8 — Estructura: la modificacion de Etapa 5 tiene la nota correcta
// =====================================================================
test('T5.8', 'codigo de Etapa 5 incluye notas y manejo de errores no bloqueante', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('crearRegistroMantenimiento'");
  const slice = src.slice(idx, idx + 10000);
  // Etapa identificada en logs
  assertContains(slice, '[Etapa 5]', 'log identifica la etapa');
  // Falla silenciosa documentada (palabra "silenciosa" o concepto de no bloquear)
  assertTrue(
    slice.toLowerCase().includes('silenciosa') || slice.includes('no bloquear'),
    'documenta el manejo silencioso del error'
  );
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => { console.error('Error fatal:', e); process.exit(99); });
