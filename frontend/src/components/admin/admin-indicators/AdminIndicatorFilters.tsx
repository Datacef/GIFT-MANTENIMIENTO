import React from 'react';
import { IAdminIndicatorFilters, IAdminStats } from 'types/admin-indicator.types';
import { MeasurementPeriod } from 'types/indicator.types';
import { MdSearch, MdFilterList, MdClear } from 'react-icons/md';

interface AdminIndicatorFiltersProps {
  filters: IAdminIndicatorFilters;
  onFiltersChange: (filters: IAdminIndicatorFilters) => void;
  stats?: IAdminStats;
}

const AdminIndicatorFilters: React.FC<AdminIndicatorFiltersProps> = ({
  filters,
  onFiltersChange,
  stats
}) => {
  const handleChange = (field: keyof IAdminIndicatorFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white dark:bg-navy-800 rounded-lg p-3 border border-gray-200 dark:border-navy-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            <div className="text-2xl font-bold text-navy-700 dark:text-white">{stats.totalIndicators}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="text-xs text-green-700 dark:text-green-400">Activos</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.activeIndicators}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-700 dark:text-gray-400">Inactivos</div>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">{stats.inactiveIndicators}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <div className="text-xs text-red-700 dark:text-red-400">Atrasados</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.overdueIndicators}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
            <div className="text-xs text-yellow-700 dark:text-yellow-400">Sin evidencia</div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.indicatorsWithoutEvidence}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <div className="text-xs text-purple-700 dark:text-purple-400">Admin</div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.adminManagedCount}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-blue-700 dark:text-blue-400">Acciones</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.totalAdminActions}</div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
            <div className="text-xs text-indigo-700 dark:text-indigo-400">Este mes</div>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{stats.actionsThisMonth}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-gray-200 dark:border-navy-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-navy-700 dark:text-white">
            <MdFilterList className="w-5 h-5" />
            <h3 className="font-semibold">Filtros</h3>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
          >
            <MdClear className="w-4 h-4" />
            Limpiar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Búsqueda
            </label>
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.searchQuery || ''}
                onChange={(e) => handleChange('searchQuery', e.target.value)}
                placeholder="Buscar por proceso, indicador, responsable..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Responsible Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Responsable
            </label>
            <input
              type="email"
              value={filters.responsibleEmail || ''}
              onChange={(e) => handleChange('responsibleEmail', e.target.value)}
              placeholder="email@ejemplo.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Departamento
            </label>
            <input
              type="text"
              value={filters.department || ''}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="Departamento"
              className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Measurement Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Periodo
            </label>
            <select
              value={filters.measurementPeriod || ''}
              onChange={(e) => handleChange('measurementPeriod', e.target.value || undefined)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              <option value={MeasurementPeriod.WEEKLY}>Semanal</option>
              <option value={MeasurementPeriod.MONTHLY}>Mensual</option>
              <option value={MeasurementPeriod.QUARTERLY}>Trimestral</option>
              <option value={MeasurementPeriod.SEMESTER}>Semestral</option>
              <option value={MeasurementPeriod.ANNUAL}>Anual</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={filters.isActive === undefined ? '' : filters.isActive ? 'true' : 'false'}
              onChange={(e) => handleChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {/* Has Evidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Evidencias
            </label>
            <select
              value={filters.hasEvidence === undefined ? '' : filters.hasEvidence ? 'true' : 'false'}
              onChange={(e) => handleChange('hasEvidence', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              <option value="true">Con evidencias</option>
              <option value="false">Sin evidencias</option>
            </select>
          </div>

          {/* Is Late */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cumplimiento
            </label>
            <select
              value={filters.isLate === undefined ? '' : filters.isLate ? 'true' : 'false'}
              onChange={(e) => handleChange('isLate', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              <option value="false">Al día</option>
              <option value="true">Atrasados</option>
            </select>
          </div>

          {/* Admin Managed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gestión
            </label>
            <select
              value={filters.isAdminManaged === undefined ? '' : filters.isAdminManaged ? 'true' : 'false'}
              onChange={(e) => handleChange('isAdminManaged', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              <option value="true">Gestionado por admin</option>
              <option value="false">Gestionado por usuario</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIndicatorFilters;
