import React, { useState, useEffect } from 'react';
import { IIndicator, MeasurementPeriod } from 'types/indicator.types';
import Swal from 'sweetalert2';

interface IndicatorFormProps {
  initialData?: IIndicator | null;
  onSubmit: (data: Partial<IIndicator>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const IndicatorForm: React.FC<IndicatorFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading = false 
}) => {
  const [formData, setFormData] = useState<Partial<IIndicator>>({
    process: '',
    subProcess: '',
    stage: '',
    genericStrategy: '',
    strategyDescription: '',
    responsibleDepartment: '',
    achievementIndicator: '',
    measurementPeriod: MeasurementPeriod.MONTHLY,
    evidence: '',
    responsibleEmail: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        process: initialData.process,
        subProcess: initialData.subProcess,
        stage: initialData.stage,
        genericStrategy: initialData.genericStrategy,
        strategyDescription: initialData.strategyDescription,
        responsibleDepartment: initialData.responsibleDepartment,
        achievementIndicator: initialData.achievementIndicator,
        measurementPeriod: initialData.measurementPeriod,
        evidence: initialData.evidence,
        responsibleEmail: initialData.responsibleEmail
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.process || !formData.achievementIndicator || !formData.responsibleEmail) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor complete los campos obligatorios (*)'
      });
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md dark:bg-navy-800">
      <h3 className="text-xl font-bold text-navy-700 dark:text-white mb-4">
        {initialData ? 'Editar Indicador' : 'Crear Nuevo Indicador'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Proceso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Proceso *
          </label>
          <input
            type="text"
            name="process"
            value={formData.process}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
            placeholder="Ej: Gestión Clínica"
            required
          />
        </div>

        {/* Subproceso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subproducto / Subproceso
          </label>
          <input
            type="text"
            name="subProcess"
            value={formData.subProcess}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
          />
        </div>

        {/* Etapa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Etapa
          </label>
          <input
            type="text"
            name="stage"
            value={formData.stage}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
          />
        </div>

        {/* Estrategia Genérica */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estrategia Genérica
          </label>
          <input
            type="text"
            name="genericStrategy"
            value={formData.genericStrategy}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
          />
        </div>

        {/* Descripción Estrategia */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descripción Estrategia
          </label>
          <textarea
            name="strategyDescription"
            value={formData.strategyDescription}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
          />
        </div>

        {/* Departamento Responsable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Departamento Responsable
          </label>
          <input
            type="text"
            name="responsibleDepartment"
            value={formData.responsibleDepartment}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
          />
        </div>

        {/* Correo Responsable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Correo Responsable *
          </label>
          <input
            type="email"
            name="responsibleEmail"
            value={formData.responsibleEmail}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
            placeholder="usuario@uv.cl"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Este correo se usará para el acceso y notificaciones.</p>
        </div>

        {/* Indicador de Logro */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Indicador de Logro *
          </label>
          <textarea
            name="achievementIndicator"
            value={formData.achievementIndicator}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
            required
          />
        </div>

        {/* Periodicidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Periodicidad de Medición *
          </label>
          <select
            name="measurementPeriod"
            value={formData.measurementPeriod}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
            required
          >
            {Object.values(MeasurementPeriod).map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </div>

        {/* Evidencia Requerida */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Evidencia Requerida (Verificable)
          </label>
          <textarea
            name="evidence"
            value={formData.evidence}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
            placeholder="Describa qué documento o archivo debe subir el usuario..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-navy-700 dark:text-white dark:hover:bg-navy-600"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : (initialData ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </form>
  );
};

export default IndicatorForm;
