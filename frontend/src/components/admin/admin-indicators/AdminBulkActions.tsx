import React from 'react';
import { MdDelete, MdToggleOff, MdToggleOn, MdPersonAdd } from 'react-icons/md';

interface AdminBulkActionsProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkAssign: () => void;
  onClearSelection: () => void;
}

const AdminBulkActions: React.FC<AdminBulkActionsProps> = ({
  selectedCount,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
  onBulkAssign,
  onClearSelection
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-2xl border border-gray-200 dark:border-navy-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-brand-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
              {selectedCount}
            </div>
            <span className="text-sm font-medium text-navy-700 dark:text-white">
              {selectedCount === 1 ? '1 indicador seleccionado' : `${selectedCount} indicadores seleccionados`}
            </span>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-navy-600" />

          <div className="flex items-center gap-2">
            <button
              onClick={onBulkActivate}
              className="flex items-center gap-1 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Activar seleccionados"
            >
              <MdToggleOn className="w-5 h-5" />
              Activar
            </button>

            <button
              onClick={onBulkDeactivate}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Desactivar seleccionados"
            >
              <MdToggleOff className="w-5 h-5" />
              Desactivar
            </button>

            <button
              onClick={onBulkAssign}
              className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Reasignar responsable"
            >
              <MdPersonAdd className="w-5 h-5" />
              Reasignar
            </button>

            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Eliminar seleccionados"
            >
              <MdDelete className="w-5 h-5" />
              Eliminar
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-navy-600" />

          <button
            onClick={onClearSelection}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminBulkActions;
