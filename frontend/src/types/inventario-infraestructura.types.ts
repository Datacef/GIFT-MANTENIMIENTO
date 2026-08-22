export interface InventarioInfraestructura {
  id: string;
  sistema: string;
  componente: string;
  ubicacion: string;
  descripcion: string;
  marca: string;
  modelo: string;
  serie: string;
  codigoInterno: string;
  capacidad: string;
  fechaInstalacion: string;
  vidaUtil: number;
  estado: string;
  criticidad: string;
  frecuencia: number;
  normativaAplicable: string;
  fechaUltimaInspeccion: string;
  proximaInspeccion: string;
  responsable: string;
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
  archivos?: ArchivoAdjuntoInfra[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchivoAdjuntoInfra {
  nombre: string;
  url: string;
  tipo: string;
  categoria: string;
  subidoPor: string;
  fecha: string;
}

export interface HistorialInfraEntry {
  id: string;
  componenteId: string;
  accion: string;
  cambios?: Record<string, { anterior?: any; nuevo?: any }>;
  descripcion: string;
  usuarioId: string;
  usuarioNombre: string;
  archivoNombre?: string;
  archivoUrl?: string;
  createdAt: string;
}

export const ARCHIVO_CATEGORIA_INFRA_OPTIONS = [
  { value: 'adquisicion', label: 'Acta de adquisicion' },
  { value: 'baja', label: 'Acta de baja' },
  { value: 'garantia', label: 'Garantia' },
  { value: 'manual', label: 'Manual tecnico' },
  { value: 'certificacion', label: 'Certificacion' },
  { value: 'mantencion', label: 'Informe de mantencion' },
  { value: 'inspeccion', label: 'Informe de inspeccion' },
  { value: 'plano', label: 'Plano o diagrama' },
  { value: 'normativa', label: 'Documento normativo' },
  { value: 'otro', label: 'Otro' },
];

export const ARCHIVO_CATEGORIA_INFRA_LABELS: Record<string, string> = {
  adquisicion: 'Acta de adquisicion',
  baja: 'Acta de baja',
  garantia: 'Garantia',
  manual: 'Manual tecnico',
  certificacion: 'Certificacion',
  mantencion: 'Informe de mantencion',
  inspeccion: 'Informe de inspeccion',
  plano: 'Plano o diagrama',
  normativa: 'Documento normativo',
  otro: 'Otro',
};

export const ARCHIVO_CATEGORIA_INFRA_COLORS: Record<string, string> = {
  adquisicion: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  baja: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  garantia: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  manual: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  certificacion: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  mantencion: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  inspeccion: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  plano: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  normativa: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  otro: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const ESTADO_INFRA_OPTIONS = [
  { value: 'B', label: 'Bueno' },
  { value: 'M', label: 'Malo' },
  { value: 'R', label: 'Regular' },
  { value: 'Baja', label: 'Baja' },
];

export const ESTADO_INFRA_COLORS: Record<string, string> = {
  B: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  M: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  R: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Baja: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const ESTADO_INFRA_LABELS: Record<string, string> = {
  B: 'Bueno',
  M: 'Malo',
  R: 'Regular',
  Baja: 'Baja',
};

export const CRITICIDAD_INFRA_OPTIONS = [
  { value: 'Alta', label: 'Alta' },
  { value: 'Media', label: 'Media' },
  { value: 'Baja', label: 'Baja' },
];

export const CRITICIDAD_INFRA_COLORS: Record<string, string> = {
  Alta: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Baja: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

export const CRITICIDAD_INFRA_LABELS: Record<string, string> = {
  Alta: 'Alta',
  Media: 'Media',
  Baja: 'Baja',
};

export const SISTEMA_OPTIONS = [
  { value: 'Electrico', label: 'Electrico' },
  { value: 'Sanitario', label: 'Sanitario' },
  { value: 'Gases Clinicos', label: 'Gases Clinicos' },
  { value: 'Proteccion Incendios', label: 'Proteccion Incendios' },
  { value: 'Senaletica', label: 'Senaletica' },
  { value: 'Estructura', label: 'Estructura' },
  { value: 'Techumbre', label: 'Techumbre' },
  { value: 'Climatizacion', label: 'Climatizacion' },
  { value: 'Agua Potable', label: 'Agua Potable' },
  { value: 'Iluminacion Emergencia', label: 'Iluminacion Emergencia' },
];

export const SISTEMA_COLORS: Record<string, string> = {
  'Electrico': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Sanitario': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Gases Clinicos': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'Proteccion Incendios': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Senaletica': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Estructura': 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  'Techumbre': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Climatizacion': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Agua Potable': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'Iluminacion Emergencia': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export interface InventarioInfraestructuraFormData {
  sistema: string;
  componente: string;
  ubicacion: string;
  descripcion: string;
  marca: string;
  modelo: string;
  serie: string;
  codigoInterno: string;
  capacidad: string;
  fechaInstalacion: string;
  vidaUtil: number;
  estado: string;
  criticidad: string;
  frecuencia: number;
  normativaAplicable: string;
  fechaUltimaInspeccion: string;
  proximaInspeccion: string;
  responsable: string;
  garantiaInicio: string;
  garantiaFinal: string;
  fechaBaja: string;
  pautaAsignada: string;
  activo: boolean;
}

export interface InventarioInfraestructuraFilters {
  sistema?: string;
  ubicacion?: string;
  estado?: string;
  criticidad?: string;
  convenio?: string;
  estadoCumplimiento?: string;
  ultimoMttoDesde?: string;
  ultimoMttoHasta?: string;
  busqueda?: string;
  limit?: number;
  skip?: number;
}

export interface InventarioInfraestructuraPaginatedResponse {
  results: InventarioInfraestructura[];
  total: number;
}
