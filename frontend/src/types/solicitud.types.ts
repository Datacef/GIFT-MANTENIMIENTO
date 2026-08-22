// ============================================================
// Tipos del modulo de Solicitudes / Ordenes de Trabajo
// ============================================================

export interface ArchivoSolicitud {
  nombre: string;
  url: string;
  tipo: string; // mime
  tamano?: number;
}

export interface ArchivoVerificable extends ArchivoSolicitud {
  subidoPor?: string;
  fecha?: string;
}

export type EstadoSolicitud =
  | 'pendiente'
  | 'aceptada'
  | 'rechazada'
  | 'asignada'
  | 'en_proceso'
  | 'devuelta'
  | 'completada'
  | 'cerrada';

export interface SolicitudMantenimiento {
  id: string;
  objectId?: string;
  folio: string;
  tokenConsulta?: string;
  solicitanteNombre: string;
  solicitanteCargo: string;
  solicitanteAnexo: string;
  solicitanteTelefono: string;
  solicitanteEmail: string;
  solicitanteServicio: string;
  descripcion: string;
  imagenes: ArchivoSolicitud[];
  archivos: ArchivoSolicitud[];
  dominioSugerido?: string;
  estado: EstadoSolicitud;
  motivoRechazo?: string;
  respuestaAdmin?: string;
  ordenTrabajoNumero?: string;
  fechaAceptacion?: string;
  aceptadoPorId?: string;
  aceptadoPorNombre?: string;
  encargadoId?: string;
  encargadoNombre?: string;
  encargadoEmail?: string;
  encargadoUsuarioParseId?: string;
  instruccionesAdmin?: string;
  fechaAsignacion?: string;
  observacionesEncargado?: string;
  fechaCompletada?: string;
  archivosVerificables: ArchivoVerificable[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SolicitudHistorialEntry {
  id: string;
  accion: string;
  descripcion: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  usuarioId?: string;
  usuarioNombre?: string;
  detalles?: Record<string, any>;
  createdAt?: string;
}

// Vista publica reducida
export interface SolicitudPublicaEstado {
  folio: string;
  estado: EstadoSolicitud;
  ordenTrabajoNumero?: string;
  solicitanteNombre: string;
  descripcion: string;
  fechaCreacion?: string;
  encargadoNombre?: string;
  respuestaAdmin?: string;
  motivoRechazo?: string;
  observacionesEncargado?: string;
  fechaAceptacion?: string;
  fechaAsignacion?: string;
  fechaCompletada?: string;
}

// Constantes de UI
export const ESTADO_SOLICITUD_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  asignada: 'Asignada',
  en_proceso: 'En proceso',
  devuelta: 'Devuelta',
  completada: 'Completada',
  cerrada: 'Cerrada',
};

export const ESTADO_SOLICITUD_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  aceptada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  rechazada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  asignada: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  en_proceso: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  devuelta: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  completada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cerrada: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

// Limites del formulario publico
export const MAX_IMAGENES_SOLICITUD = 2;
export const MAX_ARCHIVOS_SOLICITUD = 5;
export const MAX_MB_POR_ARCHIVO = 10;
export const MIME_ARCHIVOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const MIME_IMAGENES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
