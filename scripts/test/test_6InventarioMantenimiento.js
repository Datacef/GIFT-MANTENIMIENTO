#!/usr/bin/env node
/**
 * Test suite — Etapa 6: Reversion automatica al rechazar / aprobar mantenimiento.
 *
 * Cubre la bateria T6.1 a T6.6 definida en
 * context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Plan de Pruebas.
 *
 * Uso:
 *   node scripts/test/test_6InventarioMantenimiento.js
 *
 * Verifica:
 *  - Rechazar un pendiente que era "ultima mantencion" → revierte al anterior aprobado.
 *  - Rechazar el unico registro → activo vuelve a sin_historial.
 *  - Aprobar un pendiente → estado pasa de pendiente a aprobado y cumplimiento sube.
 *  - Rechazar un registro que NO era la ultima mantencion → no cambia nada visible.
 *  - Concurrencia: 2 rechazos paralelos del mismo activo convergen al mismo resultado.
 *  - deleteRegistroMantenimiento dispara la misma reversion (via afterDelete trigger).
 *  - Verificacion estatica: aprobar/rechazar invocan sincronizarActivoParse tras save.
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
  console.log(' ETAPA 6 -- Reversion automatica al rechazar / aprobar');
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
// T6.1 — Rechazar un pendiente que era "ultima mantencion" → revierte al aprobado anterior
// =====================================================================
test('T6.1', 'rechazar un pendiente revierte la ultima mantencion al aprobado anterior', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_REV');
  storage.InventarioEquipoMedico.push(activoObj);

  // Aprobado en hace(8)
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_REV', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_OLD_OK'));
  // Pendiente mas reciente
  const pendiente = makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_REV', activoClase: 'InventarioEquipoMedico',
    fecha: hace(2), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_PEND');
  storage.RegistroMantenimiento.push(pendiente);

  const ParseMock = createParseMock(storage);
  // 1. Sync inicial: el pendiente es la ultima visible
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_REV', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(2));
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'pendiente');

  // 2. Rechazar el pendiente
  pendiente.set('estadoValidacion', 'rechazado');
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_REV', 'InventarioEquipoMedico', { fechaActual: HOY });

  // 3. La ultima mantencion vuelve al aprobado anterior
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(8));
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'aprobado');
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), 'R_OLD_OK');
});

// =====================================================================
// T6.2 — Rechazar el unico registro → activo vuelve a sin_historial
// =====================================================================
test('T6.2', 'rechazar el unico registro deja el activo en sin_historial', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_SOLO');
  storage.InventarioEquipoMedico.push(activoObj);
  const reg = makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_SOLO', activoClase: 'InventarioEquipoMedico',
    fecha: hace(2), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_SOLO');
  storage.RegistroMantenimiento.push(reg);

  const ParseMock = createParseMock(storage);
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_SOLO', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'pendiente');

  // Rechazarlo
  reg.set('estadoValidacion', 'rechazado');
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_SOLO', 'InventarioEquipoMedico', { fechaActual: HOY });

  // Sin historial visible
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'sin_historial');
  assertEq(activoObj.get('ultimaFechaMantenimiento'), '');
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), '');
});

// =====================================================================
// T6.3 — Aprobar un pendiente: ultimoEstado pasa a aprobado y periodos suben
// =====================================================================
test('T6.3', 'aprobar un pendiente actualiza estado y aumenta periodosCumplidos', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_APR');
  storage.InventarioEquipoMedico.push(activoObj);
  const reg = makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_APR', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_APR');
  storage.RegistroMantenimiento.push(reg);

  const ParseMock = createParseMock(storage);
  // 1. Sync inicial (pendiente)
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_APR', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'pendiente');
  assertEq(activoObj.get('periodosCumplidos'), 0);
  const cumplimientoAnterior = activoObj.get('cumplimientoPorcentaje');

  // 2. Aprobar
  reg.set('estadoValidacion', 'aprobado');
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_APR', 'InventarioEquipoMedico', { fechaActual: HOY });

  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'aprobado');
  assertEq(activoObj.get('periodosCumplidos'), 1);
  assertTrue(activoObj.get('cumplimientoPorcentaje') > cumplimientoAnterior, 'cumplimiento aumenta');
});

// =====================================================================
// T6.4 — Rechazar un registro que NO era la ultima mantencion → no afecta visualizacion
// =====================================================================
test('T6.4', 'rechazar un registro NO mas reciente no cambia ultimaFechaMantenimiento', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(18), frecuencia: 6, activo: true,
  }, 'EQ_NRC');
  storage.InventarioEquipoMedico.push(activoObj);
  // Pendiente antiguo (hace 14)
  const pendienteAntiguo = makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_NRC', activoClase: 'InventarioEquipoMedico',
    fecha: hace(14), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_OLD_PEND');
  storage.RegistroMantenimiento.push(pendienteAntiguo);
  // Aprobado mas reciente (hace 4)
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_NRC', activoClase: 'InventarioEquipoMedico',
    fecha: hace(4), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R_NEW_OK'));

  const ParseMock = createParseMock(storage);
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_NRC', 'InventarioEquipoMedico', { fechaActual: HOY });
  // El aprobado mas reciente es la ultima visible
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(4));
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), 'R_NEW_OK');

  // Rechazar el pendiente antiguo (no es el visible)
  pendienteAntiguo.set('estadoValidacion', 'rechazado');
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_NRC', 'InventarioEquipoMedico', { fechaActual: HOY });

  // ultimaFecha no cambia: el aprobado sigue siendo el visible
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(4));
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), 'R_NEW_OK');
});

// =====================================================================
// T6.5 — Concurrencia: 2 sync paralelos del mismo activo convergen
// =====================================================================
test('T6.5', 'sync concurrente desde 2 invocaciones paralelas converge al mismo resultado', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_CC');
  storage.InventarioEquipoMedico.push(activoObj);

  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_CC', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'R1'));
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_CC', activoClase: 'InventarioEquipoMedico',
    fecha: hace(2), estadoValidacion: 'aprobado', tipoMantenimiento: 'correctivo',
    activo: true,
  }, 'R2'));

  const ParseMock = createParseMock(storage);
  // Invocaciones paralelas
  const results = await Promise.all([
    cumpl.sincronizarActivoParse(ParseMock, 'EQ_CC', 'InventarioEquipoMedico', { fechaActual: HOY }),
    cumpl.sincronizarActivoParse(ParseMock, 'EQ_CC', 'InventarioEquipoMedico', { fechaActual: HOY }),
    cumpl.sincronizarActivoParse(ParseMock, 'EQ_CC', 'InventarioEquipoMedico', { fechaActual: HOY }),
  ]);
  results.forEach((r) => assertTrue(r.ok));

  // Estado final consistente: el mas reciente (R2) gana
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(2));
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), 'R2');
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'aprobado');
});

// =====================================================================
// T6.6 — Rechazo posterior de un retroactivo: el inventario apunta al siguiente por fecha desc
// =====================================================================
test('T6.6', 'tras rechazo, "ultima mantencion" se calcula por orden descendente de fecha', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(18), frecuencia: 6, activo: true,
  }, 'EQ_RT');
  storage.InventarioEquipoMedico.push(activoObj);

  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_RT', activoClase: 'InventarioEquipoMedico',
    fecha: hace(10), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'A1'));
  const pendienteMedio = makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_RT', activoClase: 'InventarioEquipoMedico',
    fecha: hace(5), estadoValidacion: 'pendiente', tipoMantenimiento: 'correctivo',
    activo: true,
  }, 'P_MED');
  storage.RegistroMantenimiento.push(pendienteMedio);
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_RT', activoClase: 'InventarioEquipoMedico',
    fecha: hace(2), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'A2'));

  const ParseMock = createParseMock(storage);
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_RT', 'InventarioEquipoMedico', { fechaActual: HOY });
  // El mas reciente es A2 (aprobado en hace(2))
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), 'A2');

  // Rechazar el pendiente medio (que NO era el visible)
  pendienteMedio.set('estadoValidacion', 'rechazado');
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_RT', 'InventarioEquipoMedico', { fechaActual: HOY });
  // No cambia: A2 sigue siendo el visible
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), 'A2');
});

// =====================================================================
// T6.7 — Idempotencia: aprobar dos veces no rompe el calculo
// =====================================================================
test('T6.7', 'sync repetido tras aprobar es idempotente', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_ID');
  storage.InventarioEquipoMedico.push(activoObj);
  storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_ID', activoClase: 'InventarioEquipoMedico',
    fecha: hace(8), estadoValidacion: 'aprobado', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'RID'));
  const ParseMock = createParseMock(storage);

  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_ID', 'InventarioEquipoMedico', { fechaActual: HOY });
  const snap1 = {
    ufm: activoObj.get('ultimaFechaMantenimiento'),
    pc: activoObj.get('periodosCumplidos'),
    pf: activoObj.get('periodosFaltantes'),
  };

  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_ID', 'InventarioEquipoMedico', { fechaActual: HOY });
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_ID', 'InventarioEquipoMedico', { fechaActual: HOY });
  const snap3 = {
    ufm: activoObj.get('ultimaFechaMantenimiento'),
    pc: activoObj.get('periodosCumplidos'),
    pf: activoObj.get('periodosFaltantes'),
  };
  assertEq(snap1, snap3, 'snapshots iguales');
});

// =====================================================================
// T6.8 — Verificacion estatica: aprobarMantenimiento invoca sync tras save
// =====================================================================
test('T6.8', 'aprobarMantenimiento invoca sincronizarActivoParse tras save', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('aprobarMantenimiento'");
  assertTrue(idx > 0, 'funcion declarada');
  const slice = src.slice(idx, idx + 3500);
  assertContains(slice, 'await registro.save', 'guarda el registro');
  assertContains(slice, 'Etapa 6', 'comentario de Etapa 6');
  assertContains(slice, "require('./utils/cumplimientoMantenimiento')", 'requiere modulo');
  assertContains(slice, 'sincronizarActivoParse(Parse, activoId, activoClase', 'invoca sync');
});

// =====================================================================
// T6.9 — Verificacion estatica: rechazarMantenimiento invoca sync tras save
// =====================================================================
test('T6.9', 'rechazarMantenimiento invoca sincronizarActivoParse y propaga datos al cliente', () => {
  const src = readFile('backend/cloud/main.js');
  const idx = src.indexOf("Parse.Cloud.define('rechazarMantenimiento'");
  assertTrue(idx > 0, 'funcion declarada');
  const slice = src.slice(idx, idx + 4000);
  assertContains(slice, 'await registro.save', 'guarda el rechazo');
  assertContains(slice, 'Etapa 6', 'comentario de Etapa 6');
  assertContains(slice, 'REVERSION AUTOMATICA', 'comentario que documenta la reversion');
  assertContains(slice, 'sincronizarActivoParse', 'invoca sync');
  assertContains(slice, '_inventarioActualizado', 'expone resultado de reversion al cliente');
});

// =====================================================================
// T6.10 — Falla silenciosa: ambas funciones manejan error sin lanzar
// =====================================================================
test('T6.10', 'aprobar/rechazar manejan error de sync silenciosamente', () => {
  const src = readFile('backend/cloud/main.js');
  const idxA = src.indexOf("Parse.Cloud.define('aprobarMantenimiento'");
  const sliceA = src.slice(idxA, idxA + 3500);
  assertContains(sliceA, '[Etapa 6]', 'log etapa 6 en aprobar');
  assertTrue(sliceA.toLowerCase().includes('try') && sliceA.toLowerCase().includes('catch'), 'try/catch en aprobar');

  const idxR = src.indexOf("Parse.Cloud.define('rechazarMantenimiento'");
  const sliceR = src.slice(idxR, idxR + 4000);
  assertContains(sliceR, '[Etapa 6]', 'log etapa 6 en rechazar');
  assertTrue(sliceR.toLowerCase().includes('try') && sliceR.toLowerCase().includes('catch'), 'try/catch en rechazar');
});

// =====================================================================
// T6.11 — afterDelete trigger sigue activo (cubre delete via Etapa 1)
// =====================================================================
test('T6.11', 'afterDelete trigger sobre RegistroMantenimiento esta registrado', () => {
  const src = readFile('backend/cloud/main.js');
  assertContains(src, "Parse.Cloud.afterDelete('RegistroMantenimiento'", 'afterDelete trigger');
  assertContains(src, '_dispararSincronizacionAsync', 'dispara sync async');
});

// =====================================================================
// T6.12 — Flujo completo: pendiente -> aprobado -> rechazado (revierte a sin_historial)
// Este test ejercita el ciclo completo de Etapa 5 + 6
// =====================================================================
test('T6.12', 'ciclo completo creacion -> aprobacion -> rechazo deja activo en estado coherente', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [], CumplimientoLog: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(13), frecuencia: 6, activo: true,
  }, 'EQ_CICLO');
  storage.InventarioEquipoMedico.push(activoObj);
  const reg = makeParseObject('RegistroMantenimiento', {
    activoId: 'EQ_CICLO', activoClase: 'InventarioEquipoMedico',
    fecha: hace(2), estadoValidacion: 'pendiente', tipoMantenimiento: 'preventivo',
    activo: true,
  }, 'CICLO');
  storage.RegistroMantenimiento.push(reg);
  const ParseMock = createParseMock(storage);

  // Estado A: pendiente
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_CICLO', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'pendiente');

  // Estado B: aprobado (Etapa 6 — aprobar)
  reg.set('estadoValidacion', 'aprobado');
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_CICLO', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'aprobado');

  // Estado C: rechazado (Etapa 6 — reversion)
  // Imposible en flujo real (de aprobado no se puede rechazar via cloud function),
  // pero el motor debe manejarlo correctamente si los datos quedan asi.
  reg.set('estadoValidacion', 'rechazado');
  await cumpl.sincronizarActivoParse(ParseMock, 'EQ_CICLO', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'sin_historial');
  assertEq(activoObj.get('periodosCumplidos'), 0, 'sin aprobados, no cuenta');
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => { console.error('Error fatal:', e); process.exit(99); });
