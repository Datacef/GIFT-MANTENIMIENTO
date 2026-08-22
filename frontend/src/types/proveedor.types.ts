export interface Proveedor {
  id: string;
  rut: string;
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  descripcion: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProveedorFormData {
  rut: string;
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  descripcion: string;
  activo: boolean;
}

export interface ProveedorFilters {
  busqueda?: string;
  activo?: boolean;
  limit?: number;
  skip?: number;
}

export interface ProveedorPaginatedResponse {
  results: Proveedor[];
  total: number;
}

export interface ProveedorHistorialEntry {
  id: string;
  proveedorId: string;
  accion: string;
  cambios?: Record<string, { anterior?: any; nuevo?: any }>;
  descripcion: string;
  usuarioId: string;
  usuarioNombre: string;
  createdAt: string;
}

/**
 * Valida formato de RUT chileno (XX.XXX.XXX-X o XXXXXXXX-X)
 */
export function validarRut(rut: string): boolean {
  if (!rut || rut.length < 3) return false;
  const cleaned = rut.replace(/[.\-]/g, '').toUpperCase();
  if (cleaned.length < 2) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);

  return dv === expectedDv;
}

/**
 * Formatea RUT a formato XX.XXX.XXX-X
 */
export function formatRut(rut: string): string {
  const cleaned = rut.replace(/[.\-]/g, '');
  if (cleaned.length < 2) return rut;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}
