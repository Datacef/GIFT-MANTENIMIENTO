export interface InventarioFlota {
  id: string;
  tipoVehiculo: string;
  nombreVehiculo: string;
  marca: string;
  modelo: string;
  anio: number;
  patente: string;
  numeroInterno: string;
  vin: string;
  color: string;
  combustible: string;
  kilometraje: number;
  capacidadPasajeros: number;
  asignadoA: string;
  fechaAdquisicion: string;
  vidaUtil: number;
  estado: string;
  frecuencia: number;
  revisionTecnicaVigente: string;
  permisoCirculacion: string;
  seguroVigente: string;
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
  archivos?: ArchivoAdjuntoFlota[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchivoAdjuntoFlota {
  nombre: string;
  url: string;
  tipo: string;
  categoria: string;
  subidoPor: string;
  fecha: string;
}

export interface HistorialFlotaEntry {
  id: string;
  vehiculoId: string;
  accion: string;
  cambios?: Record<string, { anterior?: any; nuevo?: any }>;
  descripcion: string;
  usuarioId: string;
  usuarioNombre: string;
  archivoNombre?: string;
  archivoUrl?: string;
  createdAt: string;
}

export const ARCHIVO_CATEGORIA_FLOTA_OPTIONS = [
  { value: 'adquisicion', label: 'Acta de adquisicion' },
  { value: 'baja', label: 'Acta de baja' },
  { value: 'garantia', label: 'Garantia' },
  { value: 'seguro', label: 'Poliza de seguro' },
  { value: 'revision_tecnica', label: 'Revision tecnica' },
  { value: 'permiso_circulacion', label: 'Permiso de circulacion' },
  { value: 'mantencion', label: 'Informe de mantencion' },
  { value: 'inspeccion', label: 'Informe de inspeccion' },
  { value: 'otro', label: 'Otro' },
];

export const ARCHIVO_CATEGORIA_FLOTA_LABELS: Record<string, string> = {
  adquisicion: 'Acta de adquisicion',
  baja: 'Acta de baja',
  garantia: 'Garantia',
  seguro: 'Poliza de seguro',
  revision_tecnica: 'Revision tecnica',
  permiso_circulacion: 'Permiso de circulacion',
  mantencion: 'Informe de mantencion',
  inspeccion: 'Informe de inspeccion',
  otro: 'Otro',
};

export const ARCHIVO_CATEGORIA_FLOTA_COLORS: Record<string, string> = {
  adquisicion: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  baja: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  garantia: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  seguro: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  revision_tecnica: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  permiso_circulacion: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  mantencion: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  inspeccion: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  otro: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const ESTADO_FLOTA_OPTIONS = [
  { value: 'B', label: 'Bueno' },
  { value: 'M', label: 'Malo' },
  { value: 'R', label: 'Regular' },
  { value: 'Baja', label: 'Baja' },
];

export const ESTADO_FLOTA_COLORS: Record<string, string> = {
  B: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  M: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  R: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Baja: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const ESTADO_FLOTA_LABELS: Record<string, string> = {
  B: 'Bueno',
  M: 'Malo',
  R: 'Regular',
  Baja: 'Baja',
};

export const TIPO_VEHICULO_OPTIONS = [
  { value: 'Ambulancia', label: 'Ambulancia' },
  { value: 'Movil de Transporte', label: 'Movil de Transporte' },
  { value: 'Camioneta', label: 'Camioneta' },
  { value: 'Camion', label: 'Camion' },
  { value: 'Bus', label: 'Bus' },
  { value: 'Furgon', label: 'Furgon' },
  { value: 'Maquinaria', label: 'Maquinaria' },
  { value: 'Otro', label: 'Otro' },
];

export const COMBUSTIBLE_FLOTA_OPTIONS = [
  { value: 'Bencina', label: 'Bencina' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Electrico', label: 'Electrico' },
  { value: 'Hibrido', label: 'Hibrido' },
];

export interface InventarioFlotaFormData {
  tipoVehiculo: string;
  nombreVehiculo: string;
  marca: string;
  modelo: string;
  anio: number;
  patente: string;
  numeroInterno: string;
  vin: string;
  color: string;
  combustible: string;
  kilometraje: number;
  capacidadPasajeros: number;
  asignadoA: string;
  fechaAdquisicion: string;
  vidaUtil: number;
  estado: string;
  frecuencia: number;
  revisionTecnicaVigente: string;
  permisoCirculacion: string;
  seguroVigente: string;
  garantiaInicio: string;
  garantiaFinal: string;
  fechaBaja: string;
  pautaAsignada: string;
  activo: boolean;
}

export interface InventarioFlotaFilters {
  tipoVehiculo?: string;
  asignadoA?: string;
  estado?: string;
  combustible?: string;
  convenio?: string;
  estadoCumplimiento?: string;
  ultimoMttoDesde?: string;
  ultimoMttoHasta?: string;
  busqueda?: string;
  limit?: number;
  skip?: number;
}

export interface InventarioFlotaPaginatedResponse {
  results: InventarioFlota[];
  total: number;
}
