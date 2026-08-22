export enum UserRole {
  VIEWER      = 'VIEWER',       // Nivel 1 — solo lectura
  OPERATOR    = 'OPERATOR',     // Nivel 2 — operador de datos
  COORDINATOR = 'COORDINATOR',  // Nivel 3 — coordinador
  ADMIN       = 'ADMIN',        // Nivel 4 — administrador
  SUPER_ADMIN = 'SUPER_ADMIN',  // Nivel 5 — super administrador
}

/** Etiquetas en español para mostrar en UI */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.VIEWER]:      'Visualizador',
  [UserRole.OPERATOR]:    'Operador',
  [UserRole.COORDINATOR]: 'Coordinador',
  [UserRole.ADMIN]:       'Administrador',
  [UserRole.SUPER_ADMIN]: 'Super Administrador',
};

/** Mapeo Role → accessLevel numérico (Parse) */
export const ROLE_TO_ACCESS_LEVEL: Record<UserRole, number> = {
  [UserRole.VIEWER]:      1,
  [UserRole.OPERATOR]:    2,
  [UserRole.COORDINATOR]: 3,
  [UserRole.ADMIN]:       4,
  [UserRole.SUPER_ADMIN]: 5,
};

/** Mapeo accessLevel numérico → Role */
export function accessLevelToRole(level: number): UserRole {
  if (level >= 5) return UserRole.SUPER_ADMIN;
  if (level >= 4) return UserRole.ADMIN;
  if (level >= 3) return UserRole.COORDINATOR;
  if (level >= 2) return UserRole.OPERATOR;
  return UserRole.VIEWER;
}

export interface AllowedUser {
  email: string;
  role: UserRole;
  isActive: boolean;
  assignedBy?: string;
  createdAt: number;
  id?: string;
  displayName?: string;
  servicioSaludId?: string;
  servicioSaludNombre?: string;
  establecimientoId?: string;
  establecimientoNombre?: string;
  establecimientoCodigo?: number;
}

export interface UserProfileExtension {
  role?: UserRole;
  servicioSaludId?: string;
  servicioSaludNombre?: string;
}
