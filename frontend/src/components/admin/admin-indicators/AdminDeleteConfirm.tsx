import React from 'react';

interface AdminDeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  indicatorName: string;
  isLoading?: boolean;
}

const AdminDeleteConfirm: React.FC<AdminDeleteConfirmProps> = ({
  isOpen,
  onClose,
  onConfirm,
  indicatorName,
  isLoading = false
}) => {
  const [reason, setReason] = React.useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-xl font-bold text-navy-700 dark:text-white mb-4">
          Confirmar Eliminación
        </h3>

        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>Advertencia:</strong> Esta acción marcará el indicador como inactivo.
            El indicador quedará disponible para que el usuario responsable pueda volver a subir información.
          </p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Indicador: <strong>{indicatorName}</strong>
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Motivo de la eliminación <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Datos incorrectos, información duplicada, etc."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Este motivo quedará registrado en el historial de auditoría
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDeleteConfirm;
