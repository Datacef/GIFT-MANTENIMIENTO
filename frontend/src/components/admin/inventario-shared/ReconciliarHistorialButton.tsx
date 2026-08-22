'use client';
import { useState, useEffect, useCallback } from 'react';
import { MdLink, MdInfo, MdSync } from 'react-icons/md';
import Parse from 'utils/parseClient';
import Swal from 'sweetalert2';
import {
  InventarioSharedService,
  ClaseInventario,
} from 'services/inventario-shared.service';

interface Props {
  clase: ClaseInventario;
  activoId: string;
  nombreActivo: string;
  onChanged?: () => void;
}

/**
 * Boton + indicador que detecta historial huerfano por identidad
 * (registros/licitaciones que apuntan a un objectId previo del mismo
 * activo, p.ej. cuando fue eliminado y recreado).
 *
 * Solo se muestra si encuentra huerfanos. Permite reconciliarlos a ADMIN+.
 */
export default function ReconciliarHistorialButton({
  clase,
  activoId,
  nombreActivo,
  onChanged,
}: Props) {
  const [diag, setDiag] = useState<{
    totalDirectos: number;
    totalHuerfanos: number;
    licitacionesHuerfanas: number;
    idsPrevios: string[];
    identificadores: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const accessLevel = Parse.User.current()?.get('accessLevel') || 1;

  const cargar = useCallback(async () => {
    if (!activoId) return;
    setLoading(true);
    try {
      const r = await InventarioSharedService.diagnosticarHistorial(clase, activoId);
      setDiag({
        totalDirectos: r.totalDirectos,
        totalHuerfanos: r.totalHuerfanos,
        licitacionesHuerfanas: r.licitacionesHuerfanas,
        idsPrevios: r.idsPrevios,
        identificadores: r.identificadores,
      });
    } catch (e) {
      console.error('Error diagnosticando:', e);
    } finally {
      setLoading(false);
    }
  }, [clase, activoId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return null;
  if (!diag) return null;

  const tieneHuerfanos = diag.totalHuerfanos > 0 || diag.licitacionesHuerfanas > 0;
  if (!tieneHuerfanos) return null;

  const handleReconciliar = async () => {
    const confirm = await Swal.fire({
      title: 'Reconciliar histórico',
      html: `<div style="text-align:left">
        <p>Se encontraron registros que pertenecen a versiones anteriores del activo:</p>
        <ul style="margin-top:8px; padding-left:20px">
          ${diag.totalHuerfanos > 0 ? `<li><strong>${diag.totalHuerfanos}</strong> registros de mantenimiento</li>` : ''}
          ${diag.licitacionesHuerfanas > 0 ? `<li><strong>${diag.licitacionesHuerfanas}</strong> asociaciones a licitaciones</li>` : ''}
          ${diag.idsPrevios.length > 0 ? `<li><strong>${diag.idsPrevios.length}</strong> objectId previo(s)</li>` : ''}
        </ul>
        <p style="margin-top:8px">Identificadores coincidentes: ${diag.identificadores.join(', ') || '—'}</p>
        <p style="margin-top:8px">Se reasignaran al activo actual y se recalculara el cumplimiento.</p>
      </div>`,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Reconciliar',
      confirmButtonColor: '#422AFB',
    });
    if (!confirm.isConfirmed) return;

    setBusy(true);
    try {
      const r = await InventarioSharedService.reconciliarHuerfanos(clase, activoId);
      await Swal.fire({
        title: 'Reconciliado',
        html: `<div style="text-align:left">
          <p>Migrados al activo "${nombreActivo}":</p>
          <ul style="margin-top:8px; padding-left:20px">
            <li>Registros de mantenimiento: <strong>${r.migradosRegistros}</strong></li>
            <li>Cumplimiento logs: <strong>${r.migradosLogs}</strong></li>
            <li>Historial de inventario: <strong>${r.migradosHistorial}</strong></li>
            <li>Asociaciones a licitaciones: <strong>${r.migradosLicitaciones}</strong></li>
          </ul>
        </div>`,
        icon: 'success',
      });
      cargar();
      onChanged && onChanged();
    } catch (error: any) {
      Swal.fire('Error', error?.message || 'No se pudo reconciliar', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
      <div className="flex items-start gap-3">
        <MdInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-700 dark:text-yellow-300" />
        <div className="flex-1">
          <h5 className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
            Histórico desvinculado detectado
          </h5>
          <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-200">
            Hay datos que pertenecen a una versión anterior del activo y no aparecen en sus pestañas:
          </p>
          <ul className="mt-2 ml-4 list-disc text-xs text-yellow-800 dark:text-yellow-200">
            {diag.totalHuerfanos > 0 && (
              <li><strong>{diag.totalHuerfanos}</strong> registro(s) de mantenimiento huérfano(s)</li>
            )}
            {diag.licitacionesHuerfanas > 0 && (
              <li><strong>{diag.licitacionesHuerfanas}</strong> asociación(es) a licitaciones huérfana(s)</li>
            )}
            {diag.totalDirectos > 0 && (
              <li>{diag.totalDirectos} registro(s) ya vinculado(s) directamente</li>
            )}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {accessLevel >= 4 ? (
              <button
                type="button"
                onClick={handleReconciliar}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                <MdLink className="h-4 w-4" />
                {busy ? 'Reconciliando...' : 'Reconciliar histórico (mover datos)'}
              </button>
            ) : (
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Requiere ADMIN(4) o superior para reconciliar.
              </p>
            )}
            {accessLevel >= 2 && (
              <button
                type="button"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await Parse.Cloud.run('sincronizarCumplimientoActivo', { activoId, activoClase: clase });
                    Swal.fire('Recalculado', 'El cumplimiento se recalculo incluyendo los huerfanos.', 'success');
                    cargar();
                    onChanged && onChanged();
                  } catch (e: any) {
                    Swal.fire('Error', e?.message || 'No se pudo recalcular', 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl border border-yellow-600 bg-white px-4 py-2 text-sm font-semibold text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 dark:bg-navy-800 dark:hover:bg-navy-700"
                title="Recalcula cumplimiento incluyendo registros por identidad, sin mover datos"
              >
                <MdSync className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                Recalcular cumplimiento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
