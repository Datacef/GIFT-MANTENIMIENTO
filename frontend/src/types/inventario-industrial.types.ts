export interface InventarioIndustrial {
  id: string;
  ubicacion: string;
  tipoEquipo: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  inventario: string;
  capacidad: string;
  combustible: string;
  fechaInstalacion: string;
  vidaUtil: number;
  estado: string;
  criticidad: string;
  frecuencia: number;
  garantiaInicio: string;
  garantiaFinal: string;
  fechaBaja: string;
  pautaAsignada: string;
  requiereAutorizacion: boolean;
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
  archivos?: ArchivoAdjuntoIndustrial[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchivoAdjuntoIndustrial {
  nombre: string;
  url: string;
  tipo: string;
  categoria: string;
  subidoPor: string;
  fecha: string;
}

export interface HistorialIndustrialEntry {
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

export const ARCHIVO_CATEGORIA_INDUSTRIAL_OPTIONS = [
  { value: 'adquisicion', label: 'Acta de adquisicion' },
  { value: 'baja', label: 'Acta de baja' },
  { value: 'garantia', label: 'Garantia' },
  { value: 'manual', label: 'Manual tecnico' },
  { value: 'certificacion', label: 'Certificado de certificacion' },
  { value: 'mantencion', label: 'Informe de mantencion' },
  { value: 'inspeccion', label: 'Informe de inspeccion' },
  { value: 'autorizacion', label: 'Autorizacion de operacion' },
  { value: 'otro', label: 'Otro' },
];

export const ARCHIVO_CATEGORIA_INDUSTRIAL_LABELS: Record<string, string> = {
  adquisicion: 'Acta de adquisicion',
  baja: 'Acta de baja',
  garantia: 'Garantia',
  manual: 'Manual tecnico',
  certificacion: 'Certificado de certificacion',
  mantencion: 'Informe de mantencion',
  inspeccion: 'Informe de inspeccion',
  autorizacion: 'Autorizacion de operacion',
  otro: 'Otro',
};

export const ARCHIVO_CATEGORIA_INDUSTRIAL_COLORS: Record<string, string> = {
  adquisicion: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  baja: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  garantia: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  manual: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  certificacion: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  mantencion: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  inspeccion: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  autorizacion: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  otro: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

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

export const CRITICIDAD_OPTIONS = [
  { value: 'Alta', label: 'Alta' },
  { value: 'Media', label: 'Media' },
  { value: 'Baja', label: 'Baja' },
];

export const CRITICIDAD_COLORS: Record<string, string> = {
  Alta: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Baja: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

export const CRITICIDAD_LABELS: Record<string, string> = {
  Alta: 'Alta',
  Media: 'Media',
  Baja: 'Baja',
};

export const TIPO_EQUIPO_OPTIONS = [
  { value: 'Caldera', label: 'Caldera' },
  { value: 'Generador Electrico', label: 'Generador Electrico' },
  { value: 'Sistema HVAC', label: 'Sistema HVAC' },
  { value: 'Ascensor', label: 'Ascensor' },
  { value: 'Lavadora Industrial', label: 'Lavadora Industrial' },
  { value: 'Secadora Industrial', label: 'Secadora Industrial' },
  { value: 'Equipo Cocina Industrial', label: 'Equipo Cocina Industrial' },
  { value: 'Sistema Tratamiento Agua', label: 'Sistema Tratamiento Agua' },
  { value: 'Compresor', label: 'Compresor' },
  { value: 'Bomba', label: 'Bomba' },
  { value: 'Otro', label: 'Otro' },
];

export const COMBUSTIBLE_OPTIONS = [
  { value: 'Gas Natural', label: 'Gas Natural' },
  { value: 'Gas Licuado', label: 'Gas Licuado' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Electrico', label: 'Electrico' },
  { value: 'Vapor', label: 'Vapor' },
  { value: 'N/A', label: 'N/A' },
];

export interface InventarioIndustrialFormData {
  ubicacion: string;
  tipoEquipo: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  inventario: string;
  capacidad: string;
  combustible: string;
  fechaInstalacion: string;
  vidaUtil: number;
  estado: string;
  criticidad: string;
  frecuencia: number;
  garantiaInicio: string;
  garantiaFinal: string;
  fechaBaja: string;
  pautaAsignada: string;
  requiereAutorizacion: boolean;
  activo: boolean;
}

export interface InventarioIndustrialFilters {
  ubicacion?: string;
  tipoEquipo?: string;
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

export interface InventarioIndustrialPaginatedResponse {
  results: InventarioIndustrial[];
  total: number;
}
