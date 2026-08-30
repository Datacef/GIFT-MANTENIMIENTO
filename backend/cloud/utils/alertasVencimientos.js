/**
 * Motor de deteccion y envio de alertas por vencimiento (MEJ-03).
 *
 * Vigila dos fuentes:
 *  - Mantenimientos: campos denormalizados `proximaFechaMantenimientoEsperada` en los 4 inventarios.
 *  - Licitaciones: `fechaTermino` + `extensiones` (mismo calculo que calcularEstadoLicitacion en main.js).
 *
 * El envio es un digest unico por destinatario al dia, con idempotencia via la clase
 * `NotificacionCorreo` (campo `claveIdempotencia` = tipo|destinatario|fecha).
 *
 * Referencia: vault GIFT-MANTENIMIENTO-DATACEF/05-MEJORAS/04-alertas-vencimientos.md
 */

const cumplimientoMtto = require('./cumplimientoMantenimiento');
const { templateAlertaVencimientos } = require('../../services/templates-alertas');
const { enviarCorreo } = require('../../services/brevo-mailer');

const TIPO_ALERTA = 'alerta_vencimientos';
const LIMITE_POR_LISTA = 500;

function addDias(date, dias) {
  return new Date(date.getTime() + dias * 24 * 60 * 60 * 1000);
}

function diasHasta(fechaStr, hoyUTC) {
  const f = cumplimientoMtto.parseFecha(fechaStr);
  if (!f) return null;
  return Math.round((f.getTime() - hoyUTC.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Calcula el estado de una licitacion a partir de fechaTermino + extensiones.
 * Replica la logica de calcularEstadoLicitacion en main.js (no exportada).
 */
function estadoLicitacion(fechaTermino, extensiones, hoyUTC) {
  let fechaEfectiva = cumplimientoMtto.parseFecha(fechaTermino);
  let tieneExtensiones = false;
  if (extensiones && extensiones.length > 0) {
    tieneExtensiones = true;
    for (const ext of extensiones) {
      const fechaExt = cumplimientoMtto.parseFecha(ext && ext.nuevaFechaTermino);
      if (fechaExt && (!fechaEfectiva || fechaExt > fechaEfectiva)) fechaEfectiva = fechaExt;
    }
  }
  if (!fechaEfectiva) return { estado: 'sin_fecha', fechaTerminoEfectiva: '', diasRestantes: null };
  const dias = Math.round((fechaEfectiva.getTime() - hoyUTC.getTime()) / (24 * 60 * 60 * 1000));
  const estado = dias >= 0 ? (tieneExtensiones ? 'extendida' : 'vigente') : 'vencida';
  return { estado, fechaTerminoEfectiva: cumplimientoMtto.formatFecha(fechaEfectiva), diasRestantes: dias };
}

function filaDesdeActivo(it, clase, dom) {
  return {
    id: it.id,
    clase,
    dominio: dom,
    nombre: it.get('nombreEquipo') || it.get('nombreVehiculo') || it.get('componente') || '(sin nombre)',
    identificador: it.get('inventario') || it.get('patente') || it.get('codigoInterno') || '',
    servicio: it.get('servicio') || '',
    ubicacion: it.get('ubicacion') || it.get('asignadoA') || '',
    proximaFechaMantenimientoEsperada: it.get('proximaFechaMantenimientoEsperada') || '',
    estadoCumplimientoMantenimiento: it.get('estadoCumplimientoMantenimiento') || '',
  };
}

/**
 * Detecta todos los vencimientos pendientes (mantenimientos + licitaciones).
 * No envia nada: pura consulta. Es la misma base que usan getProximosMantenimientos
 * y getKpisAcreditacion.
 */
async function detectarAlertas(Parse, opts = {}) {
  const hoy = new Date();
  const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  const hoyStr = cumplimientoMtto.formatFecha(hoyUTC);

  const diasMtto = parseInt(opts.diasMantenimiento || process.env.ALERTAS_MANTENIMIENTO_DIAS || 7, 10);
  const diasLicit = parseInt(opts.diasLicitacion || process.env.ALERTAS_LICITACION_DIAS || 30, 10);
  const hastaMttoStr = cumplimientoMtto.formatFecha(addDias(hoyUTC, diasMtto));
  const hastaLicitStr = cumplimientoMtto.formatFecha(addDias(hoyUTC, diasLicit));

  const vencidos = [];
  const proximos = [];

  for (const clase of cumplimientoMtto.CLASES_INVENTARIO) {
    const dom = cumplimientoMtto.DOMINIO_POR_CLASE[clase];

    const camposBase = ['nombreEquipo', 'nombreVehiculo', 'componente', 'inventario', 'patente', 'codigoInterno', 'servicio', 'ubicacion', 'asignadoA', 'proximaFechaMantenimientoEsperada', 'estadoCumplimientoMantenimiento'];

    const qV = new Parse.Query(clase);
    qV.equalTo('activo', true);
    qV.notEqualTo('estadoCumplimientoMantenimiento', 'dado_de_baja');
    qV.lessThan('proximaFechaMantenimientoEsperada', hoyStr);
    qV.ascending('proximaFechaMantenimientoEsperada');
    qV.limit(LIMITE_POR_LISTA);
    qV.select(...camposBase);
    for (const it of await qV.find({ useMasterKey: true })) {
      vencidos.push({ ...filaDesdeActivo(it, clase, dom), vencido: true });
    }

    const qP = new Parse.Query(clase);
    qP.equalTo('activo', true);
    qP.notEqualTo('estadoCumplimientoMantenimiento', 'dado_de_baja');
    qP.greaterThanOrEqualTo('proximaFechaMantenimientoEsperada', hoyStr);
    qP.lessThanOrEqualTo('proximaFechaMantenimientoEsperada', hastaMttoStr);
    qP.ascending('proximaFechaMantenimientoEsperada');
    qP.limit(LIMITE_POR_LISTA);
    qP.select(...camposBase);
    for (const it of await qP.find({ useMasterKey: true })) {
      proximos.push({ ...filaDesdeActivo(it, clase, dom), vencido: false });
    }
  }

  // Licitaciones activas
  const licitacionesPorVencer = [];
  const licitacionesVencidas = [];
  const qL = new Parse.Query('Licitacion');
  qL.equalTo('activo', true);
  qL.limit(LIMITE_POR_LISTA);
  const licitaciones = await qL.find({ useMasterKey: true });

  // Nombres de proveedor (mapa para evitar N consultas repetidas)
  const proveedorIds = [...new Set(licitaciones.map((l) => l.get('proveedorId')).filter(Boolean))];
  const nombresProveedores = {};
  for (const pid of proveedorIds) {
    try {
      const p = await new Parse.Query('Proveedor').get(pid, { useMasterKey: true });
      nombresProveedores[pid] = p.get('nombre') || '';
    } catch (e) {
      nombresProveedores[pid] = '(proveedor eliminado)';
    }
  }

  for (const l of licitaciones) {
    const extensiones = l.get('extensiones') || [];
    const { estado, fechaTerminoEfectiva, diasRestantes } = estadoLicitacion(l.get('fechaTermino'), extensiones, hoyUTC);
    const base = {
      id: l.id,
      numeroLicitacion: l.get('numeroLicitacion') || '',
      inventarioDestino: l.get('inventarioDestino') || '',
      proveedorNombre: nombresProveedores[l.get('proveedorId')] || '',
      fechaTermino: l.get('fechaTermino') || '',
      fechaTerminoEfectiva,
      estado,
      diasRestantes,
    };
    if (estado === 'vencida') {
      licitacionesVencidas.push(base);
    } else if (diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= diasLicit) {
      licitacionesPorVencer.push(base);
    }
  }

  licitacionesPorVencer.sort((a, b) => (a.diasRestantes || 0) - (b.diasRestantes || 0));

  return {
    generadoEl: new Date().toISOString(),
    hoy: hoyStr,
    diasMtto,
    diasLicit,
    vencidos,
    proximos,
    licitacionesPorVencer,
    licitacionesVencidas,
    totales: {
      vencidos: vencidos.length,
      proximos: proximos.length,
      licitacionesPorVencer: licitacionesPorVencer.length,
      licitacionesVencidas: licitacionesVencidas.length,
    },
    hastaLicitStr,
  };
}

/**
 * Destinatarios del digest: usuarios con accessLevel >= 3 y correo registrado.
 */
async function obtenerDestinatarios(Parse) {
  const q = new Parse.Query(Parse.User);
  q.greaterThanOrEqualTo('accessLevel', 3);
  q.exists('email');
  q.notEqualTo('email', '');
  q.limit(200);
  q.select('email', 'firstName', 'lastName', 'accessLevel');
  const users = await q.find({ useMasterKey: true });
  return users.map((u) => ({
    id: u.id,
    email: (u.get('email') || '').trim(),
    nombre: ((u.get('firstName') || '') + ' ' + (u.get('lastName') || '')).trim(),
    accessLevel: u.get('accessLevel') || 0,
  }));
}

async function yaEnviadoHoy(Parse, email, fechaStr) {
  const q = new Parse.Query('NotificacionCorreo');
  q.equalTo('claveIdempotencia', `${TIPO_ALERTA}|${email}|${fechaStr}`);
  q.limit(1);
  const hits = await q.find({ useMasterKey: true });
  return hits.length > 0;
}

/**
 * Ejecuta el ciclo de alertas: detecta y (modo 'enviar') envia el digest con idempotencia.
 * modo 'prueba' devuelve lo que se enviaria sin enviar nada.
 */
async function ejecutarAlertas(Parse, opts = {}) {
  const modo = opts.modo === 'enviar' ? 'enviar' : 'prueba';
  const data = await detectarAlertas(Parse, opts);
  const { subject, html } = templateAlertaVencimientos(data);

  const destinatarios = await obtenerDestinatarios(Parse);

  if (modo === 'prueba') {
    return {
      modo,
      enviados: 0,
      omitidos: 0,
      destinatarios: destinatarios.map((d) => d.email),
      subject,
      totales: data.totales,
      previewHtml: html,
      detalle: {
        vencidos: data.vencidos.slice(0, 50),
        proximos: data.proximos.slice(0, 50),
        licitacionesPorVencer: data.licitacionesPorVencer.slice(0, 50),
        licitacionesVencidas: data.licitacionesVencidas.slice(0, 50),
      },
    };
  }

  const resultados = [];
  let enviados = 0;
  let omitidos = 0;
  for (const dest of destinatarios) {
    if (await yaEnviadoHoy(Parse, dest.email, data.hoy)) {
      omitidos++;
      resultados.push({ email: dest.email, estado: 'omitido_ya_enviado' });
      continue;
    }
    let r;
    try {
      r = await enviarCorreo({ to: dest.email, subject, html });
    } catch (e) {
      r = { success: false, error: e && e.message };
    }
    enviados += r.success ? 1 : 0;
    resultados.push({ email: dest.email, estado: r.success ? 'enviado' : 'fallido', error: r.error || '' });

    // Auditoria e idempotencia en NotificacionCorreo (mismo patron que el flujo de solicitudes)
    try {
      const Notif = Parse.Object.extend('NotificacionCorreo');
      const log = new Notif();
      log.set('tipo', TIPO_ALERTA);
      log.set('destinatario', dest.email);
      log.set('asunto', subject);
      log.set('estado', r.success ? 'enviado' : 'fallido');
      if (r.messageId) log.set('messageId', r.messageId);
      if (r.error) log.set('error', r.error);
      log.set('claveIdempotencia', `${TIPO_ALERTA}|${dest.email}|${data.hoy}`);
      await log.save(null, { useMasterKey: true });
    } catch (e) {
      console.error('[Alertas] Error registrando en NotificacionCorreo:', e && e.message);
    }
  }

  return { modo, enviados, omitidos, total: destinatarios.length, totales: data.totales, resultados };
}

module.exports = {
  detectarAlertas,
  obtenerDestinatarios,
  ejecutarAlertas,
  estadoLicitacion,
};
