import React, { useState } from 'react';
import { IAdminIndicatorView } from 'types/admin-indicator.types';
import { MdEdit, MdHistory, MdDelete, MdRestore, MdCheckBox, MdCheckBoxOutlineBlank, MdAttachment } from 'react-icons/md';

interface AdminIndicatorTableProps {
  indicators: IAdminIndicatorView[];
  onEdit: (indicator: IAdminIndicatorView) => void;
  onHistory: (indicator: IAdminIndicatorView) => void;
  onDelete: (indicator: IAdminIndicatorView) => void;
  onRestore?: (indicator: IAdminIndicatorView) => void;
  onManageEvidence?: (indicator: IAdminIndicatorView) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showInactive?: boolean;
}

const AdminIndicatorTable: React.FC<AdminIndicatorTableProps> = ({
  indicators,
  onEdit,
  onHistory,
  onDelete,
  onRestore,
  onManageEvidence,
  selectedIds = [],
  onSelectionChange,
  showInactive = false
}) => {
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectAll = () => {
    if (onSelectionChange) {
      if (selectedIds.length === indicators.length) {
        onSelectionChange([]);
      } else {
        onSelectionChange(indicators.map(ind => ind.id));
      }
    }
  };

  const handleSelectOne = (id: string) => {
    if (onSelectionChange) {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    }
  };

  const getStatusColor = (indicator: IAdminIndicatorView) => {
    if (!indicator.isActive) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    if (indicator.isOverdue) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (indicator.evidenceCount === 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const getStatusText = (indicator: IAdminIndicatorView) => {
    if (!indicator.isActive) return 'Inactivo';
    if (indicator.isOverdue) return `Atrasado (${indicator.daysOverdue}d)`;
    if (indicator.evidenceCount === 0) return 'Sin evidencia';
    return 'Al día';
  };

  const sortedIndicators = [...indicators].sort((a, b) => {
    let aValue: any = a[sortField as keyof IAdminIndicatorView];
    let bValue: any = b[sortField as keyof IAdminIndicatorView];

    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      aValue = aValue?.toDate ? aValue.toDate().getTime() : new Date(aValue).getTime();
      bValue = bValue?.toDate ? bValue.toDate().getTime() : new Date(bValue).getTime();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-navy-700 dark:bg-navy-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500 dark:border-navy-700 dark:bg-navy-900 dark:text-gray-300">
            {onSelectionChange && (
              <th className="px-4 py-4 w-12">
                <button onClick={handleSelectAll} className="flex items-center justify-center">
                  {selectedIds.length === indicators.length && indicators.length > 0 ? (
                    <MdCheckBox className="w-5 h-5 text-brand-500" />
                  ) : (
                    <MdCheckBoxOutlineBlank className="w-5 h-5" />
                  )}
                </button>
              </th>
            )}
            <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-800" onClick={() => handleSort('achievementIndicator')}>
              Indicador de Logro
            </th>
            <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-800" onClick={() => handleSort('process')}>
              Proceso
            </th>
            <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-800" onClick={() => handleSort('responsibleEmail')}>
              Responsable
            </th>
            <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-800" onClick={() => handleSort('measurementPeriod')}>
              Periodo
            </th>
            <th className="px-6 py-4 font-semibold text-center">
              Estado
            </th>
            <th className="px-6 py-4 font-semibold text-center">
              Evidencias
            </th>
            <th className="px-6 py-4 font-semibold text-center">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
          {sortedIndicators.length === 0 ? (
            <tr>
              <td colSpan={onSelectionChange ? 8 : 7} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No hay indicadores registrados.
              </td>
            </tr>
          ) : (
            sortedIndicators.map((indicator) => (
              <tr
                key={indicator.id}
                className={`hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors ${
                  !indicator.isActive ? 'opacity-60' : ''
                } ${selectedIds.includes(indicator.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                {onSelectionChange && (
                  <td className="px-4 py-4">
                    <button onClick={() => handleSelectOne(indicator.id)} className="flex items-center justify-center">
                      {selectedIds.includes(indicator.id) ? (
                        <MdCheckBox className="w-5 h-5 text-brand-500" />
                      ) : (
                        <MdCheckBoxOutlineBlank className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                )}
                <td className="px-6 py-4 text-sm font-medium text-navy-700 dark:text-white max-w-xs">
                  <div className="truncate" title={indicator.achievementIndicator}>
                    {indicator.achievementIndicator}
                  </div>
                  {indicator.isAdminManaged && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mt-1">
                      Admin
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  <div>{indicator.process}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{indicator.subProcess}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  <div>{indicator.responsibleEmail}</div>
                  {indicator.responsibleUser?.displayName && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{indicator.responsibleUser.displayName}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${indicator.measurementPeriod === 'Mensual' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      indicator.measurementPeriod === 'Semanal' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                    {indicator.measurementPeriod}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(indicator)}`}>
                    {getStatusText(indicator)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <button
                    onClick={() => onManageEvidence?.(indicator)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-navy-700 dark:hover:bg-navy-600 transition-colors"
                  >
                    <MdAttachment className="w-4 h-4" />
                    <span className="font-medium">{indicator.evidenceCount}</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(indicator)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors dark:text-blue-400 dark:hover:bg-blue-900/50"
                      title="Editar"
                    >
                      <MdEdit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onHistory(indicator)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
                      title="Historial"
                    >
                      <MdHistory className="w-5 h-5" />
                    </button>
                    {indicator.isActive ? (
                      <button
                        onClick={() => onDelete(indicator)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors dark:text-red-400 dark:hover:bg-red-900/50"
                        title="Eliminar"
                      >
                        <MdDelete className="w-5 h-5" />
                      </button>
                    ) : (
                      onRestore && (
                        <button
                          onClick={() => onRestore(indicator)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors dark:text-green-400 dark:hover:bg-green-900/50"
                          title="Restaurar"
                        >
                          <MdRestore className="w-5 h-5" />
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminIndicatorTable;
