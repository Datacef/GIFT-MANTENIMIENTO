'use client';
import { useState } from 'react';
import { MdCheckCircle, MdCancel, MdClose } from 'react-icons/md';
import Swal from 'sweetalert2';
import Parse from 'utils/parseClient';
import { MantenimientoService } from 'services/mantenimiento.service';
import { RegistroMantenimiento } from 'types/mantenimiento.types';
import MantenimientoSignaturePad from 'components/admin/mantenimiento/MantenimientoSignaturePad';

interface Props {
  registro: RegistroMantenimiento;
  onUpdate: () => void;
  compact?: boolean;
}

export default function BandejaValidacionActions({ registro, onUpdate, compact = false }: Props) {
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  if (registro.estadoValidacion !== 'pendiente' || userAccessLevel < 4) {
    return null;
  }

  const handleApproveClick = async () => {
    const result = await Swal.fire({
      title: 'Aprobar mantenimiento',
      text: 'Se procedera a aprobar este registro de mantenimiento. Debera firmar para confirmar.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Continuar con firma',
    });
    if (result.isConfirmed) {
      setApproveModalOpen(true);
    }
  };

  const handleSignatureSave = async (blob: Blob) => {
    setLoading(true);
    try {
      const firmaUrl = await MantenimientoService.subirFirma(blob, `firma_validador_${registro.id}`);
      await MantenimientoService.aprobar(registro.id, firmaUrl);
      setApproveModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Aprobado',
        text: 'El mantenimiento ha sido aprobado exitosamente.',
        timer: 2000,
        showConfirmButton: false,
      });
      onUpdate();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al aprobar el mantenimiento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const result = await Swal.fire({
      title: 'Rechazar mantenimiento',
      html: `
        <p class="text-sm text-gray-600 mb-3">Indique el motivo del rechazo. Este sera visible para el tecnico.</p>
        <textarea id="swal-motivo" class="swal2-textarea" placeholder="Motivo del rechazo (obligatorio)" rows="4" style="width:100%;"></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Rechazar',
      preConfirm: () => {
        const motivo = (document.getElementById('swal-motivo') as HTMLTextAreaElement)?.value?.trim();
        if (!motivo) {
          Swal.showValidationMessage('Debe indicar el motivo del rechazo');
          return false;
        }
        return motivo;
      },
    });

    if (result.isConfirmed && result.value) {
      setLoading(true);
      try {
        await MantenimientoService.rechazar(registro.id, result.value);
        Swal.fire({
          icon: 'info',
          title: 'Rechazado',
          text: 'El mantenimiento ha sido rechazado.',
          timer: 2000,
          showConfirmButton: false,
        });
        onUpdate();
      } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al rechazar el mantenimiento', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const btnBase = compact
    ? 'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold'
    : 'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold';

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleApproveClick}
          disabled={loading}
          className={`${btnBase} bg-green-600 text-white hover:bg-green-700 disabled:opacity-50`}
          title="Aprobar"
        >
          <MdCheckCircle className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          Aprobar
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className={`${btnBase} bg-red-600 text-white hover:bg-red-700 disabled:opacity-50`}
          title="Rechazar"
        >
          <MdCancel className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          Rechazar
        </button>
      </div>

      {/* Modal de firma para aprobacion */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-700 dark:text-white">
                Firma del validador
              </h3>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
              >
                <MdClose className="h-5 w-5" />
              </button>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">Procesando aprobacion...</p>
              </div>
            ) : (
              <MantenimientoSignaturePad
                onSave={handleSignatureSave}
                onCancel={() => setApproveModalOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
