import React, { useState, useEffect } from 'react';
import { IAdminIndicatorInput, IAdminIndicatorView } from 'types/admin-indicator.types';
import { MeasurementPeriod } from 'types/indicator.types';
import { MdClose } from 'react-icons/md';

interface AdminIndicatorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IAdminIndicatorInput, reason?: string) => Promise<void>;
  indicator?: IAdminIndicatorView | null;
  mode?: 'create' | 'edit';
}

const AdminIndicatorForm: React.FC<AdminIndicatorFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  indicator,
  mode = 'edit' // Default to edit mode
}) => {
  const [formData, setFormData] = useState<IAdminIndicatorInput>({
    process: '',
    subProcess: '',
    stage: '',
    genericStrategy: '',
    strategyDescription: '',
    responsibleDepartment: '',
    achievementIndicator: '',
    measurementPeriod: MeasurementPeriod.MONTHLY,
    evidence: '',
    responsibleEmail: '',
    adminNotes: '',
    isActive: true
  });

  const [reason, setReason] = useState('');
  const [notifyUser, setNotifyUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (indicator && mode === 'edit') {
      setFormData({
        process: indicator.process,
        subProcess: indicator.subProcess,
        stage: indicator.stage,
        genericStrategy: indicator.genericStrategy,
        strategyDescription: indicator.strategyDescription,
        responsibleDepartment: indicator.responsibleDepartment,
        achievementIndicator: indicator.achievementIndicator,
        measurementPeriod: indicator.measurementPeriod,
        evidence: indicator.evidence,
        responsibleEmail: indicator.responsibleEmail,
        adminNotes: indicator.adminNotes || '',
        isActive: indicator.isActive
      });
    } else {
      // Reset form for create mode
      setFormData({
        process: '',
        subProcess: '',
        stage: '',
        genericStrategy: '',
        strategyDescription: '',
        responsibleDepartment: '',
        achievementIndicator: '',
        measurementPeriod: MeasurementPeriod.MONTHLY,
        evidence: '',
        responsibleEmail: '',
        adminNotes: '',
        isActive: true
      });
    }
    setReason('');
    setNotifyUser(false);
  }, [indicator, mode, isOpen]);

  const handleChange = (field: keyof IAdminIndicatorInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'edit' && !reason.trim()) {
      alert('El motivo del cambio es obligatorio al editar');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(formData, reason || undefined);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al guardar el indicador');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-navy-700">
          <h2 className="text-2xl font-bold text-navy-700 dark:text-white">
            {mode === 'create' ? 'Crear Nuevo Indicador' : 'Editar Indicador'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-navy-700 rounded-full transition-colors"
          >
            <MdClose className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Info Alert */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {mode === 'create' 
                ? 'Estás creando un indicador como administrador. Asegúrate de ingresar el email correcto del responsable.'
                : 'Estás editando un indicador existente. Todos los cambios quedarán registrados en el historial de auditoría.'}
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Process */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Proceso <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.process}
                onChange={(e) => handleChange('process', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Sub Process */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subproceso <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subProcess}
                onChange={(e) => handleChange('subProcess', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Etapa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.stage}
                onChange={(e) => handleChange('stage', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Generic Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estrategia Genérica <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.genericStrategy}
                onChange={(e) => handleChange('genericStrategy', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Responsible Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Departamento Responsable <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.responsibleDepartment}
                onChange={(e) => handleChange('responsibleDepartment', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Responsible Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email del Responsable <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.responsibleEmail}
                onChange={(e) => handleChange('responsibleEmail', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Measurement Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Periodo de Medición <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.measurementPeriod}
                onChange={(e) => handleChange('measurementPeriod', e.target.value as MeasurementPeriod)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={MeasurementPeriod.WEEKLY}>Semanal</option>
                <option value={MeasurementPeriod.MONTHLY}>Mensual</option>
                <option value={MeasurementPeriod.QUARTERLY}>Trimestral</option>
                <option value={MeasurementPeriod.SEMESTER}>Semestral</option>
                <option value={MeasurementPeriod.ANNUAL}>Anual</option>
              </select>
            </div>

            {/* Is Active */}
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Indicador Activo
                </span>
              </label>
            </div>
          </div>

          {/* Full Width Fields */}
          <div className="space-y-4">
            {/* Strategy Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción de la Estrategia <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.strategyDescription}
                onChange={(e) => handleChange('strategyDescription', e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Achievement Indicator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Indicador de Logro <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.achievementIndicator}
                onChange={(e) => handleChange('achievementIndicator', e.target.value)}
                required
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Evidence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Evidencia Requerida <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.evidence}
                onChange={(e) => handleChange('evidence', e.target.value)}
                required
                rows={2}
                placeholder="Descripción de la evidencia que debe presentar el responsable"
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas Internas (Solo Admin)
              </label>
              <textarea
                value={formData.adminNotes}
                onChange={(e) => handleChange('adminNotes', e.target.value)}
                rows={2}
                placeholder="Notas internas visibles solo para administradores"
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Reason (required for edit mode) */}
            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo del Cambio <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={2}
                  placeholder="Ej: Corrección de email del responsable, actualización de periodo, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Este motivo quedará registrado en el historial de auditoría
                </p>
              </div>
            )}

            {/* Notify User */}
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notificar al responsable por correo
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-navy-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear Indicador' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminIndicatorForm;
