/**
 * Plantillas HTML para el digest de alertas de vencimiento (MEJ-03).
 * Mismo patron que templates-solicitud.js: cada funcion devuelve { subject, html }.
 * Referencia: vault GIFT-MANTENIMIENTO-DATACEF/05-MEJORAS/04-alertas-vencimientos.md
 */

const ESTADO_BADGES = {
  vencido: '#dc2626',
  proximo: '#d97706',
  licitacion_por_vencer: '#2563eb',
  licitacion_vencida: '#dc2626',
};

function filaActivo(a) {
  return `
  <tr>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">
      <strong>${a.nombre || '—'}</strong><br/>
      <span style="color:#6b7280;font-size:12px;">${a.identificador || ''}${a.servicio ? ' · ' + a.servicio : ''}${a.ubicacion ? ' · ' + a.ubicacion : ''}</span>
    </td>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;white-space:nowrap;">${a.proximaFechaMantenimientoEsperada || '—'}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:${a.vencido ? ESTADO_BADGES.vencido : ESTADO_BADGES.proximo};font-weight:bold;white-space:nowrap;">${a.vencido ? 'VENCIDO' : 'PRÓXIMO'}</td>
  </tr>`;
}

function filaLicitacion(l) {
  const color = l.estado === 'vencida' ? ESTADO_BADGES.licitacion_vencida : ESTADO_BADGES.licitacion_por_vencer;
  const etiqueta = l.estado === 'vencida' ? 'VENCIDA' : `VENCE EN ${l.diasRestantes} DÍAS`;
  return `
  <tr>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">
      <strong>${l.numeroLicitacion || '—'}</strong> · ${l.proveedorNombre || ''}<br/>
      <span style="color:#6b7280;font-size:12px;">${l.inventarioDestino || ''}</span>
    </td>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;white-space:nowrap;">${l.fechaTerminoEfectiva || l.fechaTermino || '—'}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:${color};font-weight:bold;white-space:nowrap;">${etiqueta}</td>
  </tr>`;
}

function seccion(titulo, filas, color) {
  if (!filas || filas.length === 0) return '';
  return `
  <h3 style="color:${color};margin:18px 0 6px;">${titulo} (${filas.length})</h3>
  <table style="border-collapse:collapse;width:100%;font-size:13px;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="padding:6px 10px;text-align:left;">Activo / Convenio</th>
        <th style="padding:6px 10px;text-align:center;">Fecha</th>
        <th style="padding:6px 10px;text-align:center;">Estado</th>
      </tr>
    </thead>
    <tbody>${filas.join('')}</tbody>
  </table>`;
}

/**
 * Digest unico diario de alertas de vencimiento.
 * @param {Object} data Resultado de detectarAlertas()
 */
function templateAlertaVencimientos(data) {
  const { vencidos = [], proximos = [], licitacionesPorVencer = [], licitacionesVencidas = [] } = data;
  const total = vencidos.length + proximos.length + licitacionesPorVencer.length + licitacionesVencidas.length;

  const subject = `⚠️ Alertas de mantenimiento — ${vencidos.length} vencidos, ${proximos.length} próximos, ${licitacionesPorVencer.length + licitacionesVencidas.length} licitaciones`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:0 auto;color:#111827;">
    <div style="background:#1e3a5f;color:#ffffff;padding:16px 20px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:18px;">⚠️ Alertas de vencimiento — Sistema de Mantenimiento</h2>
      <p style="margin:4px 0 0;font-size:13px;">Generado el ${data.generadoEl || ''}</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:16px 20px;border-radius:0 0 8px 8px;">
      ${total === 0 ? '<p style="text-align:center;color:#16a34a;font-weight:bold;">✅ Sin vencimientos pendientes. Todo al día.</p>' : `
      ${seccion('🔴 Mantenimientos vencidos', vencidos.map(filaActivo), ESTADO_BADGES.vencido)}
      ${seccion('🟠 Mantenimientos próximos', proximos.map(filaActivo), ESTADO_BADGES.proximo)}
      ${seccion('🔵 Licitaciones por vencer', licitacionesPorVencer.map(filaLicitacion), ESTADO_BADGES.licitacion_por_vencer)}
      ${seccion('🔴 Licitaciones vencidas', licitacionesVencidas.map(filaLicitacion), ESTADO_BADGES.licitacion_vencida)}
      <p style="margin-top:16px;color:#6b7280;font-size:12px;">Ventana de mantenimientos: ${data.diasMtto} día(s) · Ventana de licitaciones: ${data.diasLicit} día(s). Este correo se genera una vez al día; no respondas a este mensaje.</p>
      `}
    </div>
  </div>`;

  return { subject, html };
}

module.exports = { templateAlertaVencimientos };
