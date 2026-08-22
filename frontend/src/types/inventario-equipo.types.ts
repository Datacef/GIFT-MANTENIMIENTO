export interface InventarioEquipo {
  id: string;
  servicio: string;
  clase: string;
  subclase: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  inventario: string;
  valor: string;
  fechaAdquisicion: string;
  vidaUtil: number;
  estado: string;
  criticoApoyo: string;
  frecuencia: number;
  garantiaInicio: string;
  garantiaFinal: string;
  fechaBaja: string;
  pautaAsignada: string;
  activo: boolean;
  convenioActivo: boolean;
  proveedorRut: string;
  proveedorNombre: string;
  numeroLicitacion: string;
  fechaTerminoConvenio: string;
  // Etapa 2 — Cumplimiento de mantenimiento (denormalizados)
  ultimaFechaMantenimiento: string;
  ultimoRegistroMantenimientoId: string;
  ultimoTipoMantenimiento: string;
  ultimoEstadoMantenimiento: string;
  proximaFechaMantenimientoEsperada: string;
  periodosEsperados: number;
  periodosCumplidos: number;
  periodosFaltantes: number;
  cumplimientoPorcentaje: number;
  estadoCumplimientoMantenimiento: string;
  ultimoCalculoCumplimiento?: string | null;
  archivos?: ArchivoAdjunto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HistorialEntry {
  id: string;
  equipoId: string;
  accion: string;
  cambios?: Record<string, { anterior?: any; nuevo?: any }>;
  descripcion: string;
  usuarioId: string;
  usuarioNombre: string;
  archivoNombre?: string;
  archivoUrl?: string;
  createdAt: string;
}

export interface ArchivoAdjunto {
  nombre: string;
  url: string;
  tipo: string;
  categoria: string;
  subidoPor: string;
  fecha: string;
}

export const ARCHIVO_CATEGORIA_OPTIONS = [
  { value: 'adquisicion', label: 'Acta de adquisición' },
  { value: 'baja', label: 'Acta de baja' },
  { value: 'garantia', label: 'Garantía' },
  { value: 'manual', label: 'Manual técnico' },
  { value: 'calibracion', label: 'Certificado de calibración' },
  { value: 'mantencion', label: 'Informe de mantención' },
  { value: 'otro', label: 'Otro' },
];

export const ARCHIVO_CATEGORIA_LABELS: Record<string, string> = {
  adquisicion: 'Acta de adquisición',
  baja: 'Acta de baja',
  garantia: 'Garantía',
  manual: 'Manual técnico',
  calibracion: 'Certificado de calibración',
  mantencion: 'Informe de mantención',
  otro: 'Otro',
};

export const ARCHIVO_CATEGORIA_COLORS: Record<string, string> = {
  adquisicion: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  baja: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  garantia: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  manual: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  calibracion: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  mantencion: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  otro: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export interface InventarioEquipoFormData {
  servicio: string;
  clase: string;
  subclase: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  inventario: string;
  valor: string;
  fechaAdquisicion: string;
  vidaUtil: number;
  estado: string;
  criticoApoyo: string;
  frecuencia: number;
  garantiaInicio: string;
  garantiaFinal: string;
  fechaBaja: string;
  pautaAsignada: string;
  activo: boolean;
}

export interface InventarioEquipoFilters {
  servicio?: string;
  clase?: string;
  subclase?: string;
  estado?: string;
  criticoApoyo?: string;
  convenio?: string;
  estadoCumplimiento?: string;
  ultimoMttoDesde?: string;
  ultimoMttoHasta?: string;
  busqueda?: string;
  limit?: number;
  skip?: number;
}

export interface InventarioEquipoPaginatedResponse {
  results: InventarioEquipo[];
  total: number;
}

export const ESTADO_OPTIONS = [
  { value: 'B', label: 'Bueno' },
  { value: 'M', label: 'Malo' },
  { value: 'R', label: 'Regular' },
  { value: 'Baja', label: 'Baja' },
];

export const ESTADO_COLORS: Record<string, string> = {
  B: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  M: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  R: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Baja: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const ESTADO_LABELS: Record<string, string> = {
  B: 'Bueno',
  M: 'Malo',
  R: 'Regular',
  Baja: 'Baja',
};

export const CRITICO_OPTIONS = [
  { value: 'C', label: 'Critico' },
  { value: 'A', label: 'Apoyo' },
];

export const CRITICO_COLORS: Record<string, string> = {
  C: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  A: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

export const CRITICO_LABELS: Record<string, string> = {
  C: 'Critico',
  A: 'Apoyo',
};

export const SUBCLASE_OPTIONS = [
  { value: 'Alto Costo', label: 'Alto Costo' },
  { value: 'Mediano Costo', label: 'Mediano Costo' },
  { value: 'Bajo Costo', label: 'Bajo Costo' },
];
