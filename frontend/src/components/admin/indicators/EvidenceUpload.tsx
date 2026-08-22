import React, { useState, useRef } from 'react';
import { EvidenceService } from 'services/evidence.service';
import { EvidenceStatus } from 'types/evidence.types';
import Swal from 'sweetalert2';
import { MdCloudUpload, MdCheckCircle, MdCancel } from 'react-icons/md';

interface Period {
  start: Date;
  end: Date;
  label: string;
}

interface EvidenceUploadProps {
  indicatorId: string;
  userEmail: string;
  availablePeriods: Period[];
  onSuccess: () => void;
  onCancel: () => void;
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  indicatorId,
  userEmail,
  availablePeriods,
  onSuccess,
  onCancel
}) => {
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0); // Default to first (current/latest)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // 10MB limit check
      if (selectedFile.size > 10 * 1024 * 1024) {
        Swal.fire('Error', 'El archivo excede el tamaño máximo de 10MB', 'error');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (isNoRecords: boolean = false) => {
    if (!isNoRecords && !description && !file) {
      Swal.fire('Error', 'Debe ingresar una descripción o adjuntar un archivo', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const selectedPeriod = availablePeriods[selectedPeriodIndex];
      let attachments = [];
      if (file) {
        const uploadedFile = await EvidenceService.uploadFile(file, `evidence/${indicatorId}`);
        attachments.push(uploadedFile);
      }

      await EvidenceService.submitEvidence({
        indicatorId,
        periodStartDate: selectedPeriod.start,
        periodEndDate: selectedPeriod.end,
        status: isNoRecords ? EvidenceStatus.NO_RECORDS : EvidenceStatus.PENDING, // Status will be recalculated in service
        description: isNoRecords ? 'No hay registros que reportar en este periodo.' : description,
        attachments,
        submittedBy: userEmail
      });

      Swal.fire(
        'Éxito', 
        isNoRecords ? 'Reporte "Sin Movimientos" enviado.' : 'Evidencia enviada correctamente.', 
        'success'
      );
      onSuccess();
    } catch (error) {
      console.error('Error submitting evidence:', error);
      Swal.fire('Error', 'Ocurrió un error al enviar la evidencia', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md dark:bg-navy-800">
      <h3 className="text-xl font-bold text-navy-700 dark:text-white mb-4">
        Ingresar Reporte / Evidencia
      </h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Periodo a Reportar
        </label>
        <select
          value={selectedPeriodIndex}
          onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
        >
          {availablePeriods.map((period, index) => (
            <option key={index} value={index}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descripción / Observaciones
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-navy-700 dark:border-navy-600 dark:text-white"
          placeholder="Describa el cumplimiento o detalles relevantes..."
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Adjuntar Archivo (Max 10MB)
        </label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-navy-700 dark:text-white dark:hover:bg-navy-600"
          >
            <MdCloudUpload className="w-5 h-5" />
            {file ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
          </button>
          {file && (
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-navy-700">
        <button
          onClick={onCancel}
          disabled={isUploading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-navy-800 dark:text-white dark:border-navy-600"
        >
          Cancelar
        </button>
        
        <button
          onClick={() => handleSubmit(true)}
          disabled={isUploading}
          className="px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
        >
          No hay registros
        </button>

        <button
          onClick={() => handleSubmit(false)}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
        >
          {isUploading ? 'Enviando...' : (
            <>
              <MdCheckCircle className="w-5 h-5" />
              Enviar Reporte
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EvidenceUpload;
