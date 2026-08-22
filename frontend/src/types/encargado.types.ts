// ============================================================
// Tipos — Encargados de Mantenimiento
// ============================================================

export interface EncargadoMantenimiento {
  id: string;
  objectId?: string;
  nombre: string;
  cargo: string;
  especialidades: string[];
  dominios: string[];
  telefono: string;
  email: string;
  usuarioParseId?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EncargadoFormData {
  nombre: string;
  cargo: string;
  especialidades: string[];
  dominios: string[];
  telefono: string;
  email: string;
  username?: string;
  password?: string;
}

export const ESPECIALIDADES_SUGERIDAS = [
  'Electricidad',
  'Electromecanica',
  'Electronica medica',
  'HVAC / Climatizacion',
  'Gases clinicos',
  'Refrigeracion',
  'Caldereria / Vapor',
  'Sanitaria / Gasfiteria',
  'Obras civiles',
  'Carpinteria',
  'Pintura',
  'Seguridad y alarmas',
  'Redes y cableado estructurado',
  'Mecanica automotriz',
];
