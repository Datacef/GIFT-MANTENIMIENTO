#!/usr/bin/env node
/**
 * Test suite — Etapa 1: Motor de cumplimiento de mantenimientos.
 *
 * Ejecuta la bateria T1.1 a T1.12 definida en
 * context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Plan de Pruebas.
 *
 * Uso:
 *   node scripts/test/test_estapa1InventarioMantenimiento.js
 *
 * No requiere Parse Server ni MongoDB corriendo: usa mocks locales.
 * Exit code = cantidad de tests fallidos (0 si todos pasan).
 */

const path = require('path');
const cumpl = require(path.join(__dirname, '..', '..', 'backend', 'cloud', 'utils', 'cumplimientoMantenimiento.js'));

// =====================================================================
// Mini framework de tests (standalone, sin dependencias)
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
    throw new Error(`${mensaje || 'assertEq'}: esperado ${e} — recibido ${a}`);
  }
}

function assertTrue(cond, mensaje) {
  if (!cond) throw new Error(mensaje || 'assertTrue fallo');
}

async function runTests() {
  const ancho = 72;
  console.log('='.repeat(ancho));
  console.log(' ETAPA 1 — Motor de Cumplimiento de Mantenimientos');
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
// Helpers: Parse Object mock y Parse Query mock (para integracion)
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
    set(key, value) {
      _data[key] = value;
    },
    save() {
      return Promise.resolve(this);
    },
  };
}

/**
 * ParseMock — simula Parse.Query en memoria para los tests de integracion.
 * `storage` es un objeto `{ className: Array<ParseObject> }`.
 */
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

    count() {
      return Promise.resolve((storage[this.className] || []).filter((o) => this._matches(o)).length);
    }

    get(id) {
      const found = (storage[this.className] || []).find((o) => o.id === id);
      if (!found) return Promise.reject(new Error(`object not found ${this.className}:${id}`));
      return Promise.resolve(found);
    }
  }

  return { Query };
}

// =====================================================================
// Fixtures
// =====================================================================

const HOY = new Date(Date.UTC(2026, 3, 24)); // 2026-04-24 (fijado para reproducibilidad)

function activo({ fechaBase = '', frecuencia = 6, fechaBaja = null } = {}) {
  return { fechaBase, frecuencia, fechaBaja };
}

function registro({ fecha, estado = 'aprobado', tipo = 'preventivo', id = null, activoFlag = true }) {
  return {
    id: id || `reg_${Math.random().toString(36).slice(2, 9)}`,
    fecha,
    estadoValidacion: estado,
    tipoMantenimiento: tipo,
    activo: activoFlag,
    createdAt: new Date(fecha),
  };
}

// Fecha hace N meses desde HOY (en formato YYYY-MM-DD)
function hace(meses) {
  return cumpl.formatFecha(cumpl.addMeses(HOY, -meses));
}

// =====================================================================
// T1.1 — frecuencia = 0 -> sin_configuracion
// =====================================================================
test('T1.1', 'frecuencia=0 devuelve sin_configuracion con periodos vacios', () => {
  const r = cumpl.calcularCumplimiento(activo({ fechaBase: '2025-01-01', frecuencia: 0 }), [], HOY);
  assertEq(r.estadoCumplimiento, 'sin_configuracion');
  assertEq(r.periodos.length, 0);
  assertEq(r.periodosEsperados, 0);
  assertEq(r.cumplimientoPorcentaje, 0);
});

// =====================================================================
// T1.2 — fechaBase futura -> sin periodos, estado al_dia
// =====================================================================
test('T1.2', 'fechaBase futura devuelve periodos vacios y al_dia', () => {
  const futuro = cumpl.formatFecha(cumpl.addMeses(HOY, 3));
  const r = cumpl.calcularCumplimiento(activo({ fechaBase: futuro, frecuencia: 6 }), [], HOY);
  assertEq(r.estadoCumplimiento, 'al_dia');
  assertEq(r.periodos.length, 0);
  assertEq(r.periodosEsperados, 0);
});

// =====================================================================
// T1.3 — 13 meses atras, frecuencia 6, sin historial -> 2 periodos cerrados, sin_historial
// =====================================================================
test('T1.3', 'fechaBase 13 meses atras, frecuencia 6, sin historial -> sin_historial (2 periodos cerrados)', () => {
  // Con 13 meses atras y frecuencia 6, los 2 primeros periodos ya cerraron hace >= 1 mes
  const r = cumpl.calcularCumplimiento(
    activo({ fechaBase: hace(13), frecuencia: 6 }),
    [],
    HOY
  );
  assertEq(r.estadoCumplimiento, 'sin_historial');
  assertEq(r.periodosEsperados, 2);
  assertEq(r.periodosCumplidos, 0);
  assertEq(r.periodosFaltantes, 2);
  assertEq(r.cumplimientoPorcentaje, 0);
});

// =====================================================================
// T1.4 — 2 aprobados cubriendo los 2 periodos -> al_dia, 100%
// =====================================================================
test('T1.4', '2 aprobados que cubren 2 periodos -> al_dia con 100%', () => {
  const r = cumpl.calcularCumplimiento(
    activo({ fechaBase: hace(12), frecuencia: 6 }),
    [
      registro({ fecha: hace(10) }),
      registro({ fecha: hace(4) }),
    ],
    HOY
  );
  assertEq(r.estadoCumplimiento, 'al_dia');
  assertEq(r.periodosCumplidos, 2);
  assertEq(r.periodosFaltantes, 0);
  assertEq(r.cumplimientoPorcentaje, 100);
});

// =====================================================================
// T1.5 — 2 aprobados en el MISMO periodo -> 1 cumplido, 1 extra
// =====================================================================
test('T1.5', '2 aprobados en el mismo periodo -> uno cumple, otro queda en extras', () => {
  const r = cumpl.calcularCumplimiento(
    activo({ fechaBase: hace(12), frecuencia: 6 }),
    [
      registro({ fecha: hace(10), id: 'A' }),
      registro({ fecha: hace(9), id: 'B' }),
    ],
    HOY
  );
  const cumplidos = r.periodos.filter((p) => p.estado === 'cumplido');
  assertEq(cumplidos.length, 1, 'solo un periodo cumplido');
  assertTrue(r.cumplimientoPorcentaje <= 100, 'porcentaje no supera 100');
  const conExtras = r.periodos.find((p) => p.extras && p.extras.length > 0);
  assertTrue(conExtras, 'debe existir un periodo con extras');
  assertEq(conExtras.extras.length, 1, '1 extra');
});

// =====================================================================
// T1.6 — Aprobado anterior a fechaBase -> fuera de plan
// =====================================================================
test('T1.6', 'aprobado anterior a fechaBase queda fuera de plan', () => {
  const r = cumpl.calcularCumplimiento(
    activo({ fechaBase: hace(6), frecuencia: 6 }),
    [registro({ fecha: hace(20), id: 'OLD' })],
    HOY
  );
  assertTrue(Array.isArray(r.fueraDePlan), 'fueraDePlan existe');
  assertEq(r.fueraDePlan.length, 1, '1 registro fuera de plan');
  assertEq(r.fueraDePlan[0].registroId, 'OLD');
  const cumplidos = r.periodos.filter((p) => p.estado === 'cumplido');
  assertEq(cumplidos.length, 0);
});

// =====================================================================
// T1.7 — fechaBaja vigente -> dado_de_baja
// =====================================================================
test('T1.7', 'fechaBaja vigente -> dado_de_baja', () => {
  const r = cumpl.calcularCumplimiento(
    activo({ fechaBase: hace(24), frecuencia: 6, fechaBaja: hace(2) }),
    [registro({ fecha: hace(20) })],
    HOY
  );
  assertEq(r.estadoCumplimiento, 'dado_de_baja');
  assertEq(r.periodos.length, 0);
  assertEq(r.periodosEsperados, 0);
});

// =====================================================================
// T1.8 — rechazados y pendientes no cuentan para cumplimiento
// =====================================================================
test('T1.8', 'registros rechazados y pendientes no cuentan para cumplimiento', () => {
  const r = cumpl.calcularCumplimiento(
    activo({ fechaBase: hace(12), frecuencia: 6 }),
    [
      registro({ fecha: hace(10), estado: 'rechazado' }),
      registro({ fecha: hace(4), estado: 'pendiente' }),
    ],
    HOY
  );
  assertEq(r.periodosCumplidos, 0);
  assertEq(r.estadoCumplimiento, 'sin_historial');
  assertEq(r.ultimoEstadoMantenimiento, 'pendiente');
  assertEq(r.ultimaFechaMantenimiento, hace(4));
});

// =====================================================================
// T1.9 — Integracion con Parse mock
// =====================================================================
test('T1.9', 'sincronizarActivoParse persiste campos denormalizados', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(12),
    frecuencia: 6,
    activo: true,
  }, 'EQ1');
  storage.InventarioEquipoMedico.push(activoObj);
  storage.RegistroMantenimiento.push(
    makeParseObject('RegistroMantenimiento', {
      activoId: 'EQ1',
      activoClase: 'InventarioEquipoMedico',
      fecha: hace(4),
      estadoValidacion: 'aprobado',
      tipoMantenimiento: 'preventivo',
      activo: true,
    }, 'REG1')
  );
  const ParseMock = createParseMock(storage);
  const r = await cumpl.sincronizarActivoParse(ParseMock, 'EQ1', 'InventarioEquipoMedico', { fechaActual: HOY });
  assertTrue(r.ok, `sincronizacion ok: ${r.error}`);
  assertEq(activoObj.get('ultimaFechaMantenimiento'), hace(4));
  assertEq(activoObj.get('ultimoRegistroMantenimientoId'), 'REG1');
  assertEq(activoObj.get('ultimoEstadoMantenimiento'), 'aprobado');
  assertEq(activoObj.get('periodosCumplidos'), 1);
  assertEq(activoObj.get('periodosEsperados'), 2);
});

// =====================================================================
// T1.10 — Idempotencia
// =====================================================================
test('T1.10', 'sincronizacion idempotente (3 invocaciones sucesivas)', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [] };
  const activoObj = makeParseObject('InventarioEquipoMedico', {
    fechaAdquisicion: hace(18),
    frecuencia: 6,
    activo: true,
  }, 'EQ2');
  storage.InventarioEquipoMedico.push(activoObj);
  storage.RegistroMantenimiento.push(
    makeParseObject('RegistroMantenimiento', {
      activoId: 'EQ2',
      activoClase: 'InventarioEquipoMedico',
      fecha: hace(10),
      estadoValidacion: 'aprobado',
      tipoMantenimiento: 'preventivo',
      activo: true,
    }, 'REGA')
  );
  const ParseMock = createParseMock(storage);

  const snapshots = [];
  for (let i = 0; i < 3; i++) {
    const r = await cumpl.sincronizarActivoParse(ParseMock, 'EQ2', 'InventarioEquipoMedico', { fechaActual: HOY });
    assertTrue(r.ok);
    snapshots.push({
      ufm: activoObj.get('ultimaFechaMantenimiento'),
      pc: activoObj.get('periodosCumplidos'),
      pe: activoObj.get('periodosEsperados'),
      ec: activoObj.get('estadoCumplimientoMantenimiento'),
    });
  }
  assertEq(snapshots[0], snapshots[1]);
  assertEq(snapshots[1], snapshots[2]);
});

// =====================================================================
// T1.11 — sincronizacion de 100 activos sinteticos
// =====================================================================
test('T1.11', 'sincronizacion de 100 activos sinteticos completa sin errores', async () => {
  const storage = { InventarioEquipoMedico: [], RegistroMantenimiento: [] };
  const ids = [];
  for (let i = 0; i < 100; i++) {
    const id = `EQB_${i}`;
    ids.push(id);
    storage.InventarioEquipoMedico.push(makeParseObject('InventarioEquipoMedico', {
      fechaAdquisicion: hace(12),
      frecuencia: 6,
      activo: true,
    }, id));
    if (i % 3 === 0) {
      storage.RegistroMantenimiento.push(makeParseObject('RegistroMantenimiento', {
        activoId: id,
        activoClase: 'InventarioEquipoMedico',
        fecha: hace(4),
        estadoValidacion: 'aprobado',
        tipoMantenimiento: 'preventivo',
        activo: true,
      }));
    }
  }
  const ParseMock = createParseMock(storage);

  let ok = 0, fail = 0;
  for (const id of ids) {
    const r = await cumpl.sincronizarActivoParse(ParseMock, id, 'InventarioEquipoMedico', { fechaActual: HOY });
    if (r.ok) ok++; else fail++;
  }
  assertEq(ok, 100, 'todos sincronizados');
  assertEq(fail, 0, 'sin errores');

  const conMtto = storage.InventarioEquipoMedico.filter((o) => o.get('periodosCumplidos') >= 1);
  assertEq(conMtto.length, Math.ceil(100 / 3));
});

// =====================================================================
// T1.12 — Mapeos de clase/dominio consistentes
// =====================================================================
test('T1.12', 'mapeos DOMINIO_POR_CLASE y CAMPO_FECHA_BASE_POR_CLASE cubren las 4 clases', () => {
  const clases = ['InventarioEquipoMedico', 'InventarioEquipoIndustrial', 'InventarioFlotaVehicular', 'InventarioInfraestructura'];
  for (const c of clases) {
    assertTrue(cumpl.DOMINIO_POR_CLASE[c], `dominio para ${c}`);
    assertTrue(cumpl.CAMPO_FECHA_BASE_POR_CLASE[c], `campo fecha base para ${c}`);
  }
  for (const clase of clases) {
    const dom = cumpl.DOMINIO_POR_CLASE[clase];
    assertEq(cumpl.CLASE_POR_DOMINIO[dom], clase);
  }
  assertEq(cumpl.CAMPO_FECHA_BASE_POR_CLASE.InventarioEquipoMedico, 'fechaAdquisicion');
  assertEq(cumpl.CAMPO_FECHA_BASE_POR_CLASE.InventarioEquipoIndustrial, 'fechaInstalacion');
  assertEq(cumpl.CAMPO_FECHA_BASE_POR_CLASE.InventarioFlotaVehicular, 'fechaAdquisicion');
  assertEq(cumpl.CAMPO_FECHA_BASE_POR_CLASE.InventarioInfraestructura, 'fechaInstalacion');
});

// =====================================================================
// T1.13 — addMeses: manejo de fin de mes
// =====================================================================
test('T1.13', 'addMeses: 31-ene + 1 mes = 28-feb (no existe 31-feb)', () => {
  const r1 = cumpl.addMeses('2026-01-31', 1);
  assertEq(cumpl.formatFecha(r1), '2026-02-28');
});

// =====================================================================
// T1.14 — parseFecha robusto
// =====================================================================
test('T1.14', 'parseFecha acepta YYYY-MM-DD y YYYY-MM-DDTHH', () => {
  assertEq(cumpl.formatFecha(cumpl.parseFecha('2026-04-24')), '2026-04-24');
  assertEq(cumpl.formatFecha(cumpl.parseFecha('2026-04-24T10:30:00Z')), '2026-04-24');
  assertEq(cumpl.parseFecha(''), null);
  assertEq(cumpl.parseFecha('fecha-invalida'), null);
});

// =====================================================================
// T1.15 — resolverUltimoMantenimiento descarta rechazados
// =====================================================================
test('T1.15', 'resolverUltimoMantenimiento descarta rechazados y toma el de mayor fecha', () => {
  const r = cumpl.resolverUltimoMantenimiento([
    registro({ fecha: '2026-03-01', estado: 'rechazado', id: 'R' }),
    registro({ fecha: '2026-02-01', estado: 'aprobado', id: 'A' }),
    registro({ fecha: '2026-01-01', estado: 'pendiente', id: 'P' }),
  ]);
  assertEq(r.id, 'A');
  assertEq(r.estado, 'aprobado');
});

// =====================================================================
// T1.16 — Regla no-regresiva: orden por fecha desc
// =====================================================================
test('T1.16', 'resolverUltimoMantenimiento: orden por fecha desc (regla no-regresiva)', () => {
  const r = cumpl.resolverUltimoMantenimiento([
    registro({ fecha: '2026-02-01', estado: 'aprobado', id: 'A' }),
    registro({ fecha: '2026-03-01', estado: 'pendiente', id: 'P' }),
  ]);
  assertEq(r.id, 'P');
  assertEq(r.estado, 'pendiente');
});

// =====================================================================
// T1.17 — sin registros -> sin_historial
// =====================================================================
test('T1.17', 'resolverUltimoMantenimiento: sin registros -> sin_historial', () => {
  const r = cumpl.resolverUltimoMantenimiento([]);
  assertEq(r.estado, 'sin_historial');
  assertEq(r.fecha, '');
});

// =====================================================================
// T1.18 — TODOS rechazados -> sin_historial
// =====================================================================
test('T1.18', 'resolverUltimoMantenimiento: TODOS rechazados -> sin_historial', () => {
  const r = cumpl.resolverUltimoMantenimiento([
    registro({ fecha: '2026-02-01', estado: 'rechazado' }),
    registro({ fecha: '2026-03-01', estado: 'rechazado' }),
  ]);
  assertEq(r.estado, 'sin_historial');
});

// =====================================================================
// T1.19 — fechaBaja corta linea de tiempo
// =====================================================================
test('T1.19', 'fechaBaja vigente corta el calculo (dado_de_baja)', () => {
  const r = cumpl.calcularCumplimiento(
    activo({ fechaBase: hace(24), frecuencia: 6, fechaBaja: hace(10) }),
    [],
    HOY
  );
  assertEq(r.estadoCumplimiento, 'dado_de_baja');
});

// =====================================================================
// T1.20 — Estados segun periodos faltantes
// =====================================================================
test('T1.20', 'estado con_retraso con 1 periodo faltante', () => {
  // fechaBase hace 18 meses, frec 6 -> periodos: [18-12], [12-6], [6-hoy=en_curso]
  // mantto en hace(8) -> cae en periodo [12-6] -> 1 cumplido, 1 faltante (el [18-12]), 1 en_curso
  const r = cumpl.calcularCumplimiento(
    activo({ fechaBase: hace(18), frecuencia: 6 }),
    [registro({ fecha: hace(8) })],
    HOY
  );
  assertEq(r.periodosFaltantes, 1);
  assertEq(r.estadoCumplimiento, 'con_retraso');
});

// =====================================================================
// Run
// =====================================================================
runTests().catch((e) => {
  console.error('Error fatal en test runner:', e);
  process.exit(99);
});
