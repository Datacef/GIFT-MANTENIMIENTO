/** Dominios de mantenimiento */
export enum Dominio {
  EQUIPO_MEDICO = 'equipoMedico',
  EQUIPO_INDUSTRIAL = 'equipoIndustrial',
  INFRAESTRUCTURA = 'infraestructura',
  FLOTA_VEHICULAR = 'flotaVehicular',
}

export const DOMINIO_LABELS: Record<Dominio, string> = {
  [Dominio.EQUIPO_MEDICO]: 'Equipo Medico',
  [Dominio.EQUIPO_INDUSTRIAL]: 'Equipo Industrial',
  [Dominio.INFRAESTRUCTURA]: 'Infraestructura',
  [Dominio.FLOTA_VEHICULAR]: 'Flota Vehicular',
};

export const DOMINIO_COLORS: Record<Dominio, string> = {
  [Dominio.EQUIPO_MEDICO]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [Dominio.EQUIPO_INDUSTRIAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [Dominio.INFRAESTRUCTURA]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [Dominio.FLOTA_VEHICULAR]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

/** Tipos de mantenimiento */
export enum TipoMantenimiento {
  PREVENTIVO = 'preventivo',
  CORRECTIVO = 'correctivo',
  PREDICTIVO = 'predictivo',
}

export const TIPO_MANTENIMIENTO_LABELS: Record<TipoMantenimiento, string> = {
  [TipoMantenimiento.PREVENTIVO]: 'Preventivo',
  [TipoMantenimiento.CORRECTIVO]: 'Correctivo',
  [TipoMantenimiento.PREDICTIVO]: 'Predictivo',
};

export const TIPO_MANTENIMIENTO_COLORS: Record<TipoMantenimiento, string> = {
  [TipoMantenimiento.PREVENTIVO]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [TipoMantenimiento.CORRECTIVO]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [TipoMantenimiento.PREDICTIVO]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

/** Estado general del equipo/item evaluado */
export enum EstadoGeneral {
  BUENO = 'bueno',
  REGULAR = 'regular',
  MALO = 'malo',
  BAJA = 'baja',
}

export const ESTADO_GENERAL_LABELS: Record<EstadoGeneral, string> = {
  [EstadoGeneral.BUENO]: 'Bueno',
  [EstadoGeneral.REGULAR]: 'Regular',
  [EstadoGeneral.MALO]: 'Malo',
  [EstadoGeneral.BAJA]: 'Baja',
};

export const ESTADO_GENERAL_COLORS: Record<EstadoGeneral, string> = {
  [EstadoGeneral.BUENO]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EstadoGeneral.REGULAR]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EstadoGeneral.MALO]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EstadoGeneral.BAJA]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

/** Tipo de respuesta esperada */
export enum TipoRespuesta {
  SI_NO = 'siNo',
  ESCALA = 'escala',
  TEXTO = 'texto',
  SELECCION = 'seleccion',
}

export const TIPO_RESPUESTA_LABELS: Record<TipoRespuesta, string> = {
  [TipoRespuesta.SI_NO]: 'Si / No',
  [TipoRespuesta.ESCALA]: 'Escala',
  [TipoRespuesta.TEXTO]: 'Texto Libre',
  [TipoRespuesta.SELECCION]: 'Seleccion',
};

/** Interfaz principal de pregunta de mantenimiento */
export interface PreguntaMantenimiento {
  id: string;
  dominio: Dominio;
  tipoMantenimiento: TipoMantenimiento;
  clasificacionEquipo: string;
  categoria: string;
  pregunta: string;
  descripcion?: string;
  tipoRespuesta: TipoRespuesta;
  opcionesRespuesta?: string[];
  estadoGeneral: EstadoGeneral;
  requiereFoto: boolean;
  requiereObservacion: boolean;
  esCritica: boolean;
  orden: number;
  activo: boolean;
  referenciaAcreditacion?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Datos para crear/editar una pregunta */
export interface PreguntaFormData {
  dominio: Dominio;
  tipoMantenimiento: TipoMantenimiento;
  clasificacionEquipo: string;
  categoria: string;
  pregunta: string;
  descripcion?: string;
  tipoRespuesta: TipoRespuesta;
  opcionesRespuesta?: string[];
  estadoGeneral: EstadoGeneral;
  requiereFoto: boolean;
  requiereObservacion: boolean;
  esCritica: boolean;
  orden: number;
  activo: boolean;
  referenciaAcreditacion?: string;
}

/** Filtros de busqueda */
export interface PreguntaFilters {
  dominio?: Dominio;
  tipoMantenimiento?: TipoMantenimiento;
  clasificacionEquipo?: string;
  categoria?: string;
  activo?: boolean;
  busqueda?: string;
  limit?: number;
  skip?: number;
}

/** Respuesta paginada */
export interface PreguntaPaginatedResponse {
  results: PreguntaMantenimiento[];
  total: number;
}
