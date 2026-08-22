// ===============================================
// Tipos del Modulo de Mantenimiento Central
// ===============================================

export interface RegistroMantenimiento {
  id: string;
  dominio: string; // equipoMedico | equipoIndustrial | flotaVehicular | infraestructura
  tipoMantenimiento: string; // preventivo | correctivo | predictivo
  clasificacionEquipo: string;
  activoId: string;
  activoClase: string;
  activoResumen: ActivoResumen;
  fecha: string;
  checklist: { items: ChecklistItem[] };
  fotosAdicionales: Record<string, FotoAdicional[]>;
  observacionesGenerales: string;
  proximoMantenimiento: string;
  tecnicoId: string;
  tecnicoNombre: string;
  firmaTecnico: string; // URL de la imagen de firma en Parse.File
  estadoValidacion: string; // pendiente | aprobado | rechazado
  validadorId?: string;
  validadorNombre?: string;
  firmaValidador?: string;
  fechaValidacion?: string;
  motivoRechazo?: string;
  registroAnteriorId?: string;
  archivos?: ArchivoAdjuntoMtto[];
  creadoPor: string;
  activo: boolean;
  // Etapa 7 — campos de retroactividad
  esRetroactivo?: boolean;
  motivoRetroactivo?: string;
  periodoIndice?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivoResumen {
  nombre: string;
  identificador: string; // serie/inventario o patente/codigo segun dominio
  estado: string;
  ubicacion: string; // servicio, ubicacion, asignadoA segun dominio
}

export interface ChecklistItem {
  preguntaId: string;
  pregunta: string;
  categoria: string;
  tipoRespuesta: string; // siNo | escala | texto | seleccion
  opcionesRespuesta?: string[];
  respuesta: any;
  estado: string; // Bueno | Regular | Malo | N/A
  observaciones: string;
  fotoUrl?: string;
  esCritica: boolean;
  requiereFoto: boolean;
  requiereObservacion: boolean;
  referenciaAcreditacion?: string;
}

export interface FotoAdicional {
  nombre: string;
  url: string;
}

export interface ArchivoAdjuntoMtto {
  nombre: string;
  url: string;
  tipo: string;
  categoria: string;
  subidoPor: string;
  fecha: string;
}

export interface HistorialMttoEntry {
  id: string;
  registroId: string;
  accion: string;
  descripcion: string;
  usuarioId: string;
  usuarioNombre: string;
  detalles?: Record<string, any>;
  archivoNombre?: string;
  archivoUrl?: string;
  createdAt: string;
}

// Datos del formulario para crear un registro
export interface MantenimientoFormData {
  dominio: string;
  tipoMantenimiento: string;
  clasificacionEquipo: string;
  activoId: string;
  activoClase: string;
  activoResumen: ActivoResumen;
  fecha: string;
  checklist: { items: ChecklistItem[] };
  fotosAdicionales: Record<string, FotoAdicional[]>;
  observacionesGenerales: string;
  proximoMantenimiento: string;
  firmaTecnicoUrl: string; // URL ya subida a Parse.File
  registroAnteriorId?: string;
  // Etapa 7 — campos de retroactividad
  esRetroactivo?: boolean;
  motivoRetroactivo?: string;
  periodoIndice?: number;
}

// Filtros para listado
export interface MantenimientoFilters {
  dominio?: string;
  tipoMantenimiento?: string;
  estadoValidacion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  tecnicoNombre?: string;
  busqueda?: string;
  registroId?: string;
  limit?: number;
  skip?: number;
}

// Filtros especificos para exportacion a Excel
export interface MantenimientoExportFilters {
  dominio?: string;
  tipoMantenimiento?: string;
  estadoValidacion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  tecnicoNombre?: string;
  identificador?: string; // serie / inventario / patente / codigo
  nombreActivo?: string;
}

// Registro plano para exportacion (sin checklist dinamico)
export interface RegistroMantenimientoExport {
  id: string;
  fecha: string;
  dominio: string;
  tipoMantenimiento: string;
  clasificacionEquipo: string;
  estadoValidacion: string;
  tecnicoNombre: string;
  validadorNombre: string;
  fechaValidacion: string;
  motivoRechazo: string;
  proximoMantenimiento: string;
  observacionesGenerales: string;
  activoId: string;
  activoClase: string;
  activoNombre: string;
  activoIdentificador: string;
  activoEstado: string;
  activoUbicacion: string;
  // Etapa 7.2.2 — campos de retroactividad para Excel
  esRetroactivo?: boolean;
  motivoRetroactivo?: string;
  periodoIndice?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

// Respuesta paginada
export interface MantenimientoPaginatedResponse {
  results: RegistroMantenimiento[];
  total: number;
}

// Respuesta de la bandeja de validacion
export interface BandejaValidacionResponse {
  results: RegistroMantenimiento[];
  total: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
}

// Resultado de busqueda de activo
export interface ActivoBusquedaResult {
  id: string;
  clase: string;
  nombre: string;
  identificador: string;
  estado: string;
  ubicacion: string;
  clasificacion: string;
  pautaAsignada?: string;
}

// Estadisticas
export interface EstadisticasMantenimiento {
  porEstado: Record<string, number>;
  porDominio: Record<string, number>;
  porTipo: Record<string, number>;
  total: number;
}

// ===============================================
// Constantes
// ===============================================

export const DOMINIO_MANTENIMIENTO_OPTIONS = [
  { value: 'equipoMedico', label: 'Equipos Medicos', icon: 'MdMedicalServices', color: 'blue' },
  { value: 'equipoIndustrial', label: 'Equipos Industriales', icon: 'MdPrecisionManufacturing', color: 'orange' },
  { value: 'flotaVehicular', label: 'Flota Vehicular', icon: 'MdDirectionsCar', color: 'purple' },
  { value: 'infraestructura', label: 'Infraestructura', icon: 'MdBusiness', color: 'green' },
];

export const DOMINIO_MANTENIMIENTO_LABELS: Record<string, string> = {
  equipoMedico: 'Equipos Medicos',
  equipoIndustrial: 'Equipos Industriales',
  flotaVehicular: 'Flota Vehicular',
  infraestructura: 'Infraestructura',
};

export const DOMINIO_MANTENIMIENTO_COLORS: Record<string, string> = {
  equipoMedico: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  equipoIndustrial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  flotaVehicular: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  infraestructura: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export const TIPO_MANTENIMIENTO_OPTIONS = [
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'correctivo', label: 'Correctivo' },
  { value: 'predictivo', label: 'Predictivo' },
];

export const TIPO_MANTENIMIENTO_LABELS: Record<string, string> = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
  predictivo: 'Predictivo',
};

export const TIPO_MANTENIMIENTO_COLORS: Record<string, string> = {
  preventivo: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  correctivo: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  predictivo: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

export const ESTADO_VALIDACION_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
];

export const ESTADO_VALIDACION_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const ESTADO_VALIDACION_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  aprobado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rechazado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const ESTADO_CHECKLIST_OPTIONS = [
  { value: 'Bueno', label: 'Bueno', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'Regular', label: 'Regular', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'Malo', label: 'Malo', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'N/A', label: 'N/A', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
];

export const ESTADO_CHECKLIST_LABELS: Record<string, string> = {
  Bueno: 'Bueno',
  Regular: 'Regular',
  Malo: 'Malo',
  'N/A': 'N/A',
};

export const ESTADO_CHECKLIST_COLORS: Record<string, string> = {
  Bueno: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Regular: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Malo: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'N/A': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const FOTOS_CATEGORIAS_POR_DOMINIO: Record<string, string[]> = {
  equipoMedico: ['Estado general', 'Placa de identificacion', 'Accesorios', 'Otros'],
  equipoIndustrial: ['Estado general', 'Placa de datos', 'Componentes', 'Otros'],
  flotaVehicular: ['Exterior', 'Interior', 'Motor', 'Neumaticos', 'Documentos', 'Otros'],
  infraestructura: ['Estado general', 'Detalle de dano', 'Senaletica', 'Otros'],
};

export const ARCHIVO_CATEGORIA_MTTO_OPTIONS = [
  { value: 'adquisicion', label: 'Acta de adquisicion' },
  { value: 'informe', label: 'Informe tecnico' },
  { value: 'evidencia', label: 'Evidencia fotografica' },
  { value: 'otro', label: 'Otro' },
];

export const ARCHIVO_CATEGORIA_MTTO_LABELS: Record<string, string> = {
  adquisicion: 'Acta de adquisicion',
  informe: 'Informe tecnico',
  evidencia: 'Evidencia fotografica',
  otro: 'Otro',
};

export const ARCHIVO_CATEGORIA_MTTO_COLORS: Record<string, string> = {
  adquisicion: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  informe: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  evidencia: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  otro: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

// Label del campo "identificador" segun dominio (para filtros dinamicos)
export const IDENTIFICADOR_LABEL_POR_DOMINIO: Record<string, string> = {
  equipoMedico: 'N° Serie / Inventario',
  equipoIndustrial: 'N° Serie / Inventario',
  flotaVehicular: 'Patente / N° Interno / VIN',
  infraestructura: 'Codigo interno / Serie',
};
