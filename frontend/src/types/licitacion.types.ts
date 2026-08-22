export interface ExtensionContrato {
  fechaExtension: string;
  nuevaFechaTermino: string;
  descripcion: string;
}

export interface Licitacion {
  id: string;
  proveedorId: string;
  proveedorRut: string;
  proveedorNombre: string;
  numeroLicitacion: string;
  inventarioDestino: string;
  fechaInicio: string;
  fechaTermino: string;
  fechaTerminoEfectiva: string;
  extensiones: ExtensionContrato[];
  estado: string;
  activo: boolean;
  totalEquipos: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LicitacionFormData {
  proveedorId: string;
  numeroLicitacion: string;
  inventarioDestino: string;
  fechaInicio: string;
  fechaTermino: string;
}

export interface LicitacionFilters {
  proveedorId?: string;
  inventarioDestino?: string;
  estado?: string;
  busqueda?: string;
  activo?: boolean;
  limit?: number;
  skip?: number;
}

export interface LicitacionPaginatedResponse {
  results: Licitacion[];
  total: number;
}

export interface LicitacionHistorialEntry {
  id: string;
  licitacionId: string;
  accion: string;
  cambios?: Record<string, { anterior?: any; nuevo?: any }>;
  descripcion: string;
  usuarioId: string;
  usuarioNombre: string;
  createdAt: string;
}

export interface LicitacionEquipo {
  id: string;
  licitacionId: string;
  proveedorRut: string;
  equipoId: string;
  inventarioTipo: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  inventario: string;
  createdAt?: string;
}

export interface CargaMasivaResult {
  asociados: number;
  noEncontrados: any[];
  errores: number;
  total: number;
}

export const INVENTARIO_DESTINO_OPTIONS = [
  { value: 'medico', label: 'Equipos Medicos' },
  { value: 'industrial', label: 'Equipos Industriales' },
  { value: 'infraestructura', label: 'Infraestructura' },
  { value: 'flota', label: 'Flota Vehicular' },
];

export const INVENTARIO_DESTINO_LABELS: Record<string, string> = {
  medico: 'Equipos Medicos',
  industrial: 'Equipos Industriales',
  infraestructura: 'Infraestructura',
  flota: 'Flota Vehicular',
};

export const INVENTARIO_DESTINO_COLORS: Record<string, string> = {
  medico: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  industrial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  infraestructura: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  flota: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export const ESTADO_LICITACION_OPTIONS = [
  { value: 'vigente', label: 'Vigente' },
  { value: 'vencida', label: 'Vencida' },
  { value: 'extendida', label: 'Extendida' },
];

export const ESTADO_LICITACION_COLORS: Record<string, string> = {
  vigente: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  vencida: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  extendida: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export const ESTADO_LICITACION_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  vencida: 'Vencida',
  extendida: 'Extendida',
};
