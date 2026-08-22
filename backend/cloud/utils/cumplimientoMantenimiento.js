/**
 * Motor de calculo de cumplimiento de mantenimientos.
 *
 * Este modulo provee la logica pura (sin Parse) para:
 *  - Mapear activoClase <-> dominio
 *  - Resolver el campo de fecha base (fechaAdquisicion / fechaInstalacion) por clase
 *  - Sumar meses respetando fin de mes
 *  - Calcular la linea de tiempo de periodos teoricos y cumplidos
 *  - Resolver el "ultimo mantenimiento visible" del activo
 *
 * Ademas expone un helper que interactua con Parse (`sincronizarActivoParse`)
 * para leer historial y persistir los campos denormalizados del activo.
 *
 * Referencia: context/mmtto/actualizacion-modulo-inventario-mantenimiento.md — Etapa 1.
 */

// -----------------------------------------------
// Mapeos constantes
// -----------------------------------------------

const DOMINIO_POR_CLASE = {
  InventarioEquipoMedico: 'equipoMedico',
  InventarioEquipoIndustrial: 'equipoIndustrial',
  InventarioFlotaVehicular: 'flotaVehicular',
  InventarioInfraestructura: 'infraestructura',
};

const CLASE_POR_DOMINIO = {
  equipoMedico: 'InventarioEquipoMedico',
  equipoIndustrial: 'InventarioEquipoIndustrial',
  flotaVehicular: 'InventarioFlotaVehicular',
  infraestructura: 'InventarioInfraestructura',
};

// Campo que contiene la fecha base para el calculo de periodos, segun la clase.
const CAMPO_FECHA_BASE_POR_CLASE = {
  InventarioEquipoMedico: 'fechaAdquisicion',
  InventarioEquipoIndustrial: 'fechaInstalacion',
  InventarioFlotaVehicular: 'fechaAdquisicion',
  InventarioInfraestructura: 'fechaInstalacion',
};

const CLASES_INVENTARIO = Object.keys(DOMINIO_POR_CLASE);

const ESTADOS_CUMPLIMIENTO = {
  SIN_CONFIGURACION: 'sin_configuracion',
  SIN_HISTORIAL: 'sin_historial',
  AL_DIA: 'al_dia',
  CON_RETRASO: 'con_retraso',
  CRITICO: 'critico',
  DADO_DE_BAJA: 'dado_de_baja',
};

const ESTADOS_ULTIMO_MTTO = {
  SIN_HISTORIAL: 'sin_historial',
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
};

// -----------------------------------------------
// Helpers de fechas (puros)
// -----------------------------------------------

/**
 * Parsea una fecha string YYYY-MM-DD o ISO a un objeto Date en UTC medianoche.
 * Devuelve null si la fecha es invalida o vacia.
 */
function parseFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
  }
  const str = String(valor).trim();
  if (!str) return null;

  // Soporta YYYY-MM-DD o YYYY-MM-DDTHH:...
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
    if (isNaN(date.getTime())) return null;
    return date;
  }
  // Fallback a Date parser nativo
  const date = new Date(str);
  if (isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Formatea un Date UTC como YYYY-MM-DD.
 */
function formatFecha(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Suma N meses a una fecha, preservando el dia del mes cuando es posible.
 * Si el dia no existe en el mes destino (ej: 31 ene + 1 mes), se usa el ultimo dia del mes.
 */
function addMeses(fecha, meses) {
  const base = parseFecha(fecha);
  if (!base) return null;
  if (!Number.isFinite(meses)) return null;

  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const d = base.getUTCDate();

  const targetMonth = m + meses;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  // Ultimo dia del mes destino
  const ultimoDiaMes = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(d, ultimoDiaMes);

  return new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
}

/**
 * Diferencia en dias entre dos fechas (a - b). Asume fechas parseadas.
 */
function diffDias(a, b) {
  if (!a || !b) return 0;
  const MS_DIA = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / MS_DIA);
}

// -----------------------------------------------
// Accesores del activo (puros)
// -----------------------------------------------

/**
 * Devuelve el nombre del campo que contiene la fecha base para la clase indicada.
 */
function campoFechaBase(activoClase) {
  return CAMPO_FECHA_BASE_POR_CLASE[activoClase] || null;
}

/**
 * Extrae la fecha base (fechaAdquisicion o fechaInstalacion) del activo segun su clase.
 * Acepta un objeto plano `{ fechaAdquisicion, fechaInstalacion, ... }` o un Parse Object.
 */
function obtenerFechaBaseActivo(activo, activoClase) {
  const campo = campoFechaBase(activoClase);
  if (!campo) return null;
  if (!activo) return null;
  if (typeof activo.get === 'function') {
    return activo.get(campo) || null;
  }
  return activo[campo] || null;
}

/**
 * Extrae `frecuencia` (meses) del activo. Devuelve 0 si no esta definida o no es numerica.
 */
function obtenerFrecuenciaActivo(activo) {
  if (!activo) return 0;
  const raw = typeof activo.get === 'function' ? activo.get('frecuencia') : activo.frecuencia;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Extrae `fechaBaja` si existe y es valida.
 */
function obtenerFechaBaja(activo) {
  if (!activo) return null;
  const raw = typeof activo.get === 'function' ? activo.get('fechaBaja') : activo.fechaBaja;
  return raw || null;
}

/**
 * Extrae el estado fisico (B/M/R/Baja) del activo.
 */
function obtenerEstadoFisico(activo) {
  if (!activo) return '';
  const raw = typeof activo.get === 'function' ? activo.get('estado') : activo.estado;
  return raw || '';
}

/**
 * Predicado unificado de baja: el activo se considera dado de baja si
 *   - su `estado` fisico es exactamente 'Baja', o
 *   - tiene `fechaBaja` valida y <= hoy (UTC medianoche).
 *
 * @param {Object} activo objeto plano o Parse Object con `estado` y `fechaBaja`.
 * @param {Date}   fechaActual opcional; default ahora (UTC medianoche).
 * @returns {boolean}
 */
function esActivoDeBaja(activo, fechaActual) {
  if (!activo) return false;
  const estado = obtenerEstadoFisico(activo);
  if (estado === 'Baja') return true;
  const fechaBaja = parseFecha(obtenerFechaBaja(activo));
  if (!fechaBaja) return false;
  const hoy = fechaActual instanceof Date && !isNaN(fechaActual.getTime())
    ? new Date(Date.UTC(fechaActual.getUTCFullYear(), fechaActual.getUTCMonth(), fechaActual.getUTCDate()))
    : (() => {
        const n = new Date();
        return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
      })();
  return diffDias(fechaBaja, hoy) <= 0;
}

// -----------------------------------------------
// Motor principal (puro)
// -----------------------------------------------

/**
 * Normaliza un registro de mantenimiento a forma plana con los campos relevantes.
 */
function normalizarRegistro(reg) {
  if (!reg) return null;
  if (typeof reg.get === 'function') {
    return {
      id: reg.id,
      fecha: reg.get('fecha') || '',
      tipoMantenimiento: reg.get('tipoMantenimiento') || '',
      estadoValidacion: reg.get('estadoValidacion') || 'pendiente',
      activo: reg.get('activo') !== false,
      createdAt: reg.get('createdAt') || reg.createdAt || null,
    };
  }
  return {
    id: reg.id || reg.objectId || '',
    fecha: reg.fecha || '',
    tipoMantenimiento: reg.tipoMantenimiento || '',
    estadoValidacion: reg.estadoValidacion || 'pendiente',
    activo: reg.activo !== false,
    createdAt: reg.createdAt || null,
  };
}

/**
 * Resuelve el "ultimo mantenimiento visible" del activo siguiendo la regla
 * no-regresiva (Etapa 5/6/8): el registro NO rechazado con fecha mas alta.
 *
 * @param {Array} historial lista de registros (Parse Objects u objetos planos)
 * @returns {{ fecha, id, tipo, estado }}
 */
function resolverUltimoMantenimiento(historial) {
  const registros = (historial || [])
    .map(normalizarRegistro)
    .filter((r) => r && r.activo);

  if (registros.length === 0) {
    return { fecha: '', id: '', tipo: '', estado: ESTADOS_ULTIMO_MTTO.SIN_HISTORIAL };
  }

  const noRechazados = registros.filter((r) => r.estadoValidacion !== 'rechazado');
  if (noRechazados.length === 0) {
    return { fecha: '', id: '', tipo: '', estado: ESTADOS_ULTIMO_MTTO.SIN_HISTORIAL };
  }

  // Ordenar por fecha DESCENDENTE (regla no-regresiva). Fallback a createdAt.
  noRechazados.sort((a, b) => {
    const da = parseFecha(a.fecha);
    const db = parseFecha(b.fecha);
    if (da && db && da.getTime() !== db.getTime()) return db.getTime() - da.getTime();
    const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return cb - ca;
  });

  const ultimo = noRechazados[0];
  return {
    fecha: ultimo.fecha || '',
    id: ultimo.id,
    tipo: ultimo.tipoMantenimiento,
    estado: ultimo.estadoValidacion, // 'pendiente' o 'aprobado'
  };
}

/**
 * Calcula el cumplimiento de periodos de un activo.
 *
 * @param {Object} activo con campos `fechaBase`, `frecuencia`, `fechaBaja`
 * @param {Array}  historial lista completa de registros del activo (ya filtrados por activo=true)
 * @param {Date}   fechaActual opcional — default: hoy (UTC medianoche)
 * @returns objeto con metricas y array de periodos
 */
function calcularCumplimiento(activo, historial, fechaActual) {
  const frecuencia = obtenerFrecuenciaActivo(activo);
  const fechaBaseRaw = activo ? (activo.fechaBase !== undefined ? activo.fechaBase : null) : null;
  const fechaBase = parseFecha(fechaBaseRaw);
  const fechaBajaRaw = activo ? activo.fechaBaja : null;
  const fechaBaja = parseFecha(fechaBajaRaw);

  const hoy = fechaActual instanceof Date && !isNaN(fechaActual.getTime())
    ? new Date(Date.UTC(fechaActual.getUTCFullYear(), fechaActual.getUTCMonth(), fechaActual.getUTCDate()))
    : (() => {
        const n = new Date();
        return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
      })();

  const ultimo = resolverUltimoMantenimiento(historial);

  // Caso: activo dado de baja (predicado unificado: estado='Baja' o fechaBaja vencida)
  if (esActivoDeBaja(activo, hoy)) {
    return {
      estadoCumplimiento: ESTADOS_CUMPLIMIENTO.DADO_DE_BAJA,
      periodos: [],
      periodosEsperados: 0,
      periodosCumplidos: 0,
      periodosFaltantes: 0,
      cumplimientoPorcentaje: 0,
      ultimaFechaMantenimiento: ultimo.fecha,
      ultimoRegistroId: ultimo.id,
      ultimoTipoMantenimiento: ultimo.tipo,
      ultimoEstadoMantenimiento: ultimo.estado,
      proximaFechaMantenimientoEsperada: '',
    };
  }

  // Caso: sin configuracion
  if (!frecuencia || !fechaBase) {
    return {
      estadoCumplimiento: ESTADOS_CUMPLIMIENTO.SIN_CONFIGURACION,
      periodos: [],
      periodosEsperados: 0,
      periodosCumplidos: 0,
      periodosFaltantes: 0,
      cumplimientoPorcentaje: 0,
      ultimaFechaMantenimiento: ultimo.fecha,
      ultimoRegistroId: ultimo.id,
      ultimoTipoMantenimiento: ultimo.tipo,
      ultimoEstadoMantenimiento: ultimo.estado,
      proximaFechaMantenimientoEsperada: '',
    };
  }

  // Caso: fecha base futura — no corresponde aun
  if (fechaBase.getTime() > hoy.getTime()) {
    return {
      estadoCumplimiento: ESTADOS_CUMPLIMIENTO.AL_DIA,
      periodos: [],
      periodosEsperados: 0,
      periodosCumplidos: 0,
      periodosFaltantes: 0,
      cumplimientoPorcentaje: 0,
      ultimaFechaMantenimiento: ultimo.fecha,
      ultimoRegistroId: ultimo.id,
      ultimoTipoMantenimiento: ultimo.tipo,
      ultimoEstadoMantenimiento: ultimo.estado,
      proximaFechaMantenimientoEsperada: formatFecha(addMeses(fechaBase, frecuencia)),
    };
  }

  // Fecha de corte: si hay baja vigente, se usa; sino, hoy
  const fechaCorte = fechaBaja && diffDias(fechaBaja, hoy) <= 0 ? fechaBaja : hoy;

  // Generar periodos teoricos desde fechaBase hasta fechaCorte
  const periodos = [];
  let inicio = fechaBase;
  let iter = 0;
  const MAX_PERIODOS = 1000; // guard rail
  while (inicio.getTime() <= fechaCorte.getTime() && iter < MAX_PERIODOS) {
    const fin = addMeses(inicio, frecuencia);
    periodos.push({
      indice: iter,
      desde: formatFecha(inicio),
      hasta: formatFecha(fin),
      desdeDate: inicio,
      hastaDate: fin,
      estado: 'pendiente', // se resuelve abajo
      registroId: '',
      fechaRealizado: '',
      tipoMantenimientoRealizado: '',
      extras: [],
      fueraDePlan: false,
    });
    inicio = fin;
    iter++;
  }

  // Filtrar historial aprobado (solo aprobados cuentan para periodos)
  const aprobados = (historial || [])
    .map(normalizarRegistro)
    .filter((r) => r && r.activo && r.estadoValidacion === 'aprobado')
    .sort((a, b) => {
      const da = parseFecha(a.fecha);
      const db = parseFecha(b.fecha);
      return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
    });

  // Emparejar cada aprobado con su periodo
  const fueraDePlan = [];
  for (const reg of aprobados) {
    const fechaReg = parseFecha(reg.fecha);
    if (!fechaReg) continue;
    const periodo = periodos.find(
      (p) => fechaReg.getTime() >= p.desdeDate.getTime() && fechaReg.getTime() < p.hastaDate.getTime()
    );
    if (!periodo) {
      fueraDePlan.push({ registroId: reg.id, fecha: reg.fecha, tipo: reg.tipoMantenimiento });
      continue;
    }
    if (periodo.estado !== 'cumplido') {
      periodo.estado = 'cumplido';
      periodo.registroId = reg.id;
      periodo.fechaRealizado = reg.fecha;
      periodo.tipoMantenimientoRealizado = reg.tipoMantenimiento;
    } else {
      periodo.extras.push({ registroId: reg.id, fecha: reg.fecha, tipo: reg.tipoMantenimiento });
    }
  }

  // Resolver los no cubiertos como 'en_curso' o 'faltante'
  // Un periodo cuyo fin sea hoy o posterior se considera vigente (en curso).
  for (const p of periodos) {
    if (p.estado === 'cumplido') continue;
    if (p.hastaDate.getTime() >= hoy.getTime()) {
      p.estado = 'en_curso';
    } else {
      p.estado = 'faltante';
    }
  }

  // Metricas
  const periodosCerrados = periodos.filter((p) => p.estado !== 'en_curso');
  const periodosEsperados = periodosCerrados.length;
  const periodosCumplidos = periodos.filter((p) => p.estado === 'cumplido').length;
  const periodosFaltantes = periodos.filter((p) => p.estado === 'faltante').length;
  const cumplimientoPorcentaje = periodosEsperados > 0
    ? Math.round((periodosCumplidos / periodosEsperados) * 1000) / 10
    : 0;

  // Estado general
  let estadoCumplimiento;
  const hayHistorialAprobado = aprobados.length > 0;
  if (!hayHistorialAprobado && periodosEsperados > 0) {
    estadoCumplimiento = ESTADOS_CUMPLIMIENTO.SIN_HISTORIAL;
  } else if (periodosFaltantes === 0) {
    estadoCumplimiento = ESTADOS_CUMPLIMIENTO.AL_DIA;
  } else if (periodosFaltantes === 1) {
    estadoCumplimiento = ESTADOS_CUMPLIMIENTO.CON_RETRASO;
  } else {
    estadoCumplimiento = ESTADOS_CUMPLIMIENTO.CRITICO;
  }

  // Proxima fecha esperada: el `hasta` del primer periodo en_curso o faltante
  let proximaFecha = '';
  const periodoEnCurso = periodos.find((p) => p.estado === 'en_curso');
  if (periodoEnCurso) {
    proximaFecha = periodoEnCurso.hasta;
  } else {
    const primerFaltante = periodos.find((p) => p.estado === 'faltante');
    if (primerFaltante) {
      proximaFecha = primerFaltante.hasta;
    } else if (periodos.length > 0) {
      // Todos cumplidos — sugerir el siguiente teorico
      proximaFecha = formatFecha(addMeses(periodos[periodos.length - 1].hastaDate, frecuencia));
    }
  }

  // Exportar periodos sin los Date objetos internos
  const periodosOut = periodos.map((p) => ({
    indice: p.indice,
    desde: p.desde,
    hasta: p.hasta,
    estado: p.estado,
    registroId: p.registroId,
    fechaRealizado: p.fechaRealizado,
    tipoMantenimientoRealizado: p.tipoMantenimientoRealizado,
    extras: p.extras,
  }));

  return {
    estadoCumplimiento,
    periodos: periodosOut,
    periodosEsperados,
    periodosCumplidos,
    periodosFaltantes,
    cumplimientoPorcentaje,
    ultimaFechaMantenimiento: ultimo.fecha,
    ultimoRegistroId: ultimo.id,
    ultimoTipoMantenimiento: ultimo.tipo,
    ultimoEstadoMantenimiento: ultimo.estado,
    proximaFechaMantenimientoEsperada: proximaFecha,
    fueraDePlan,
  };
}

// -----------------------------------------------
// Integracion con Parse (impura)
// -----------------------------------------------

/**
 * Lee el activo, su historial y calcula cumplimiento + persiste campos denormalizados.
 * Retorna el calculo completo. Si algo falla, la funcion NO lanza — retorna `{ ok: false, error }`.
 *
 * @param {Object} ParseRef referencia a `Parse` (inyectada desde main.js)
 * @param {String} activoId
 * @param {String} activoClase
 * @param {Object} opts opcional: { fechaActual, persistir=true }
 */
async function sincronizarActivoParse(ParseRef, activoId, activoClase, opts = {}) {
  const persistir = opts.persistir !== false;
  const fechaActual = opts.fechaActual || new Date();

  if (!activoId || !activoClase) {
    return { ok: false, error: 'activoId y activoClase requeridos' };
  }
  if (!DOMINIO_POR_CLASE[activoClase]) {
    return { ok: false, error: `activoClase desconocida: ${activoClase}` };
  }

  try {
    // 1. Leer el activo
    const queryActivo = new ParseRef.Query(activoClase);
    const activoObj = await queryActivo.get(activoId, { useMasterKey: true });

    // Etapa 6 (revision-inventarios): incluir registros huerfanos por identidad.
    // El campo `activoResumen.identificador` se guarda concatenado por
    // searchActivos (p.ej. "SN-12345 / INV-001"). Generamos todas las
    // variantes posibles para hacer match.
    const IDENTIFICADORES_POR_CLASE = {
      InventarioEquipoMedico: ['serie', 'inventario'],
      InventarioEquipoIndustrial: ['serie', 'inventario'],
      InventarioFlotaVehicular: ['patente', 'numeroInterno', 'vin'],
      InventarioInfraestructura: ['serie', 'codigoInterno'],
    };
    const camposIdent = IDENTIFICADORES_POR_CLASE[activoClase] || [];
    const variantes = new Set();
    const get = (k) => String(activoObj.get(k) || '').trim();
    for (const k of camposIdent) {
      const v = get(k);
      if (v) variantes.add(v);
    }
    // Variantes concatenadas equivalentes a las usadas en `searchActivos`
    if (activoClase === 'InventarioEquipoMedico' || activoClase === 'InventarioEquipoIndustrial') {
      const s = get('serie'), i = get('inventario');
      if (s && i) { variantes.add(`${s} / ${i}`); variantes.add(`${i} / ${s}`); }
    } else if (activoClase === 'InventarioFlotaVehicular') {
      const p = get('patente'), n = get('numeroInterno');
      if (p && n) { variantes.add(`${p} / ${n}`); variantes.add(`${n} / ${p}`); }
    } else if (activoClase === 'InventarioInfraestructura') {
      const c = get('codigoInterno'), comp = get('componente');
      if (c && comp) { variantes.add(`${c} / ${comp}`); variantes.add(`${comp} / ${c}`); }
    }
    const identificadores = Array.from(variantes).filter(Boolean);

    // 2. Leer historial: dos queries independientes (directos + huerfanos)
    //    y combinar en memoria, evitando limitaciones de Parse.Query.or
    //    con notEqualTo/containedIn.
    const queryDirectos = new ParseRef.Query('RegistroMantenimiento');
    queryDirectos.equalTo('activoId', activoId);
    queryDirectos.equalTo('activoClase', activoClase);
    queryDirectos.equalTo('activo', true);
    queryDirectos.limit(1000);
    const directos = await queryDirectos.find({ useMasterKey: true });

    let huerfanos = [];
    if (identificadores.length > 0) {
      const queryHuerfanos = new ParseRef.Query('RegistroMantenimiento');
      queryHuerfanos.equalTo('activoClase', activoClase);
      queryHuerfanos.containedIn('activoResumen.identificador', identificadores);
      queryHuerfanos.equalTo('activo', true);
      queryHuerfanos.limit(1000);
      const todos = await queryHuerfanos.find({ useMasterKey: true });
      huerfanos = todos.filter((it) => it.get('activoId') !== activoId);
    }

    // Deduplicar por id (el activo actual + huerfanos)
    const seen = new Set();
    const historial = [];
    for (const reg of [...directos, ...huerfanos]) {
      if (seen.has(reg.id)) continue;
      seen.add(reg.id);
      historial.push(reg);
    }

    // 3. Preparar objeto plano del activo para el motor
    const campoBase = campoFechaBase(activoClase);
    const activoPlano = {
      fechaBase: campoBase ? activoObj.get(campoBase) : null,
      frecuencia: activoObj.get('frecuencia'),
      fechaBaja: activoObj.get('fechaBaja'),
      estado: activoObj.get('estado'),
    };

    const resultado = calcularCumplimiento(activoPlano, historial, fechaActual);

    // 4. Persistir + registrar log si cambia el estado (Etapa 4.5)
    if (persistir) {
      const estadoAnterior = activoObj.get('estadoCumplimientoMantenimiento') || '';
      const cumplimientoAnterior = activoObj.get('cumplimientoPorcentaje') || 0;

      activoObj.set('ultimaFechaMantenimiento', resultado.ultimaFechaMantenimiento || '');
      activoObj.set('ultimoRegistroMantenimientoId', resultado.ultimoRegistroId || '');
      activoObj.set('ultimoTipoMantenimiento', resultado.ultimoTipoMantenimiento || '');
      activoObj.set('ultimoEstadoMantenimiento', resultado.ultimoEstadoMantenimiento || ESTADOS_ULTIMO_MTTO.SIN_HISTORIAL);
      activoObj.set('proximaFechaMantenimientoEsperada', resultado.proximaFechaMantenimientoEsperada || '');
      activoObj.set('periodosEsperados', resultado.periodosEsperados);
      activoObj.set('periodosCumplidos', resultado.periodosCumplidos);
      activoObj.set('periodosFaltantes', resultado.periodosFaltantes);
      activoObj.set('cumplimientoPorcentaje', resultado.cumplimientoPorcentaje);
      activoObj.set('estadoCumplimientoMantenimiento', resultado.estadoCumplimiento);
      activoObj.set('ultimoCalculoCumplimiento', new Date());
      await activoObj.save(null, { useMasterKey: true });

      // Registrar transicion solo si el estado cambio y existia uno anterior
      if (estadoAnterior && estadoAnterior !== resultado.estadoCumplimiento) {
        try {
          const Log = ParseRef.Object.extend('CumplimientoLog');
          const log = new Log();
          log.set('activoId', activoId);
          log.set('activoClase', activoClase);
          log.set('dominio', DOMINIO_POR_CLASE[activoClase] || '');
          log.set('estadoAnterior', estadoAnterior);
          log.set('estadoNuevo', resultado.estadoCumplimiento);
          log.set('cumplimientoAnterior', cumplimientoAnterior);
          log.set('cumplimientoNuevo', resultado.cumplimientoPorcentaje);
          await log.save(null, { useMasterKey: true });
        } catch (logErr) {
          // No bloquear la sincronizacion si falla el log
        }
      }
    }

    return { ok: true, resultado };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

/**
 * Genera la linea de tiempo de periodos de un activo, EXTENDIENDO hacia el
 * futuro hasta `opts.hastaFecha`. Usado por la carta Gantt de mantenimiento.
 *
 * Cada periodo trae estado: 'cumplido' | 'cumplido_pendiente' | 'en_curso' |
 *                          'faltante' | 'futuro' | 'dado_de_baja'.
 *
 * @param {Object} activo objeto con `fechaBase`, `frecuencia`, `fechaBaja`, `estado`
 * @param {Array}  historial registros del activo (Parse Objects o planos)
 * @param {Object} opts { hastaFecha (Date), fechaActual (Date opcional) }
 */
function generarPeriodosGantt(activo, historial, opts = {}) {
  const fechaActual = opts.fechaActual instanceof Date ? opts.fechaActual : new Date();
  const hoy = new Date(Date.UTC(fechaActual.getUTCFullYear(), fechaActual.getUTCMonth(), fechaActual.getUTCDate()));
  const hastaFecha = opts.hastaFecha instanceof Date
    ? new Date(Date.UTC(opts.hastaFecha.getUTCFullYear(), opts.hastaFecha.getUTCMonth(), opts.hastaFecha.getUTCDate()))
    : addMeses(hoy, 12);

  const frecuencia = obtenerFrecuenciaActivo(activo);
  const fechaBaseRaw = activo ? (activo.fechaBase !== undefined ? activo.fechaBase : null) : null;
  const fechaBase = parseFecha(fechaBaseRaw);
  const fechaBaja = parseFecha(activo ? activo.fechaBaja : null);

  const ultimo = resolverUltimoMantenimiento(historial);

  // Caso: dado de baja
  if (esActivoDeBaja(activo, hoy)) {
    return { periodos: [], estado: ESTADOS_CUMPLIMIENTO.DADO_DE_BAJA, ultimo };
  }

  // Caso: sin configuracion
  if (!frecuencia || !fechaBase) {
    return { periodos: [], estado: ESTADOS_CUMPLIMIENTO.SIN_CONFIGURACION, ultimo };
  }

  // Limite efectivo: min(hastaFecha, fechaBaja)
  let limite = hastaFecha;
  if (fechaBaja && fechaBaja.getTime() < limite.getTime()) limite = fechaBaja;

  // Generar periodos teoricos hasta `limite`
  const periodos = [];
  let inicio = fechaBase;
  let iter = 0;
  const MAX_PERIODOS = 2000;
  while (inicio.getTime() <= limite.getTime() && iter < MAX_PERIODOS) {
    const fin = addMeses(inicio, frecuencia);
    periodos.push({
      indice: iter,
      desde: formatFecha(inicio),
      hasta: formatFecha(fin),
      desdeDate: inicio,
      hastaDate: fin,
      estado: 'pendiente',
      registroId: '',
      fechaRealizado: '',
      tipoMantenimientoRealizado: '',
      estadoValidacion: '',
    });
    inicio = fin;
    iter++;
  }

  // Emparejar registros aprobados / pendientes
  const aprobados = (historial || [])
    .map(normalizarRegistro)
    .filter((r) => r && r.activo && r.estadoValidacion !== 'rechazado')
    .sort((a, b) => {
      const da = parseFecha(a.fecha);
      const db = parseFecha(b.fecha);
      return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
    });

  for (const reg of aprobados) {
    const fechaReg = parseFecha(reg.fecha);
    if (!fechaReg) continue;
    const periodo = periodos.find(
      (p) => fechaReg.getTime() >= p.desdeDate.getTime() && fechaReg.getTime() < p.hastaDate.getTime()
    );
    if (!periodo) continue;
    if (periodo.estado === 'pendiente') {
      periodo.estado = reg.estadoValidacion === 'aprobado' ? 'cumplido' : 'cumplido_pendiente';
      periodo.registroId = reg.id;
      periodo.fechaRealizado = reg.fecha;
      periodo.tipoMantenimientoRealizado = reg.tipoMantenimiento;
      periodo.estadoValidacion = reg.estadoValidacion;
    }
  }

  // Resolver no cubiertos: en_curso (futuro), faltante (pasado), futuro (sin tocar aun)
  for (const p of periodos) {
    if (p.estado === 'cumplido' || p.estado === 'cumplido_pendiente') continue;
    const finPeriodo = p.hastaDate.getTime();
    const inicioPeriodo = p.desdeDate.getTime();
    if (finPeriodo <= hoy.getTime()) {
      p.estado = 'faltante';
    } else if (inicioPeriodo <= hoy.getTime() && finPeriodo >= hoy.getTime()) {
      p.estado = 'en_curso';
    } else {
      p.estado = 'futuro';
    }
  }

  // Determinar estado global de cumplimiento (igual que calcularCumplimiento
  // pero limitado a periodos cerrados al hoy)
  const periodosHastaHoy = periodos.filter((p) => p.hastaDate.getTime() <= hoy.getTime());
  const cumplidosHastaHoy = periodosHastaHoy.filter(
    (p) => p.estado === 'cumplido' || p.estado === 'cumplido_pendiente'
  ).length;
  const faltantesHastaHoy = periodosHastaHoy.filter((p) => p.estado === 'faltante').length;
  let estadoGlobal;
  if (periodosHastaHoy.length === 0) estadoGlobal = ESTADOS_CUMPLIMIENTO.AL_DIA;
  else if (faltantesHastaHoy === 0) estadoGlobal = ESTADOS_CUMPLIMIENTO.AL_DIA;
  else if (faltantesHastaHoy === 1) estadoGlobal = ESTADOS_CUMPLIMIENTO.CON_RETRASO;
  else estadoGlobal = ESTADOS_CUMPLIMIENTO.CRITICO;

  // Limpieza de Date objetos internos
  const periodosOut = periodos.map((p) => ({
    indice: p.indice,
    desde: p.desde,
    hasta: p.hasta,
    estado: p.estado,
    registroId: p.registroId,
    fechaRealizado: p.fechaRealizado,
    tipoMantenimientoRealizado: p.tipoMantenimientoRealizado,
    estadoValidacion: p.estadoValidacion,
  }));

  return {
    periodos: periodosOut,
    estado: estadoGlobal,
    ultimo,
    cumplimientoPorcentaje: periodosHastaHoy.length > 0
      ? Math.round((cumplidosHastaHoy / periodosHastaHoy.length) * 1000) / 10
      : 0,
    periodosEsperadosHastaHoy: periodosHastaHoy.length,
    periodosCumplidosHastaHoy: cumplidosHastaHoy,
    periodosFaltantesHastaHoy: faltantesHastaHoy,
  };
}

module.exports = {
  // Constantes
  DOMINIO_POR_CLASE,
  CLASE_POR_DOMINIO,
  CAMPO_FECHA_BASE_POR_CLASE,
  CLASES_INVENTARIO,
  ESTADOS_CUMPLIMIENTO,
  ESTADOS_ULTIMO_MTTO,

  // Helpers puros
  parseFecha,
  formatFecha,
  addMeses,
  diffDias,
  campoFechaBase,
  obtenerFechaBaseActivo,
  obtenerFrecuenciaActivo,
  obtenerFechaBaja,
  obtenerEstadoFisico,
  esActivoDeBaja,
  normalizarRegistro,

  // Motor
  resolverUltimoMantenimiento,
  calcularCumplimiento,
  generarPeriodosGantt,

  // Integracion Parse
  sincronizarActivoParse,
};
