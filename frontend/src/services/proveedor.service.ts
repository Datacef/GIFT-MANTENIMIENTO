import Parse from 'utils/parseClient';
import {
  Proveedor,
  ProveedorFormData,
  ProveedorFilters,
  ProveedorPaginatedResponse,
  ProveedorHistorialEntry,
} from 'types/proveedor.types';

export class ProveedorService {
  static async getProveedores(
    filters: ProveedorFilters = {}
  ): Promise<ProveedorPaginatedResponse> {
    try {
      const result = await Parse.Cloud.run('getProveedores', filters);
      return {
        results: (result.results || []).map(ProveedorService.mapItem),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getProveedores:', error);
      return { results: [], total: 0 };
    }
  }

  static async getById(id: string): Promise<Proveedor | null> {
    try {
      const result = await Parse.Cloud.run('getProveedorById', { id });
      return result ? ProveedorService.mapItem(result) : null;
    } catch (error) {
      console.error('Error getProveedorById:', error);
      return null;
    }
  }

  static async create(data: ProveedorFormData): Promise<Proveedor> {
    const result = await Parse.Cloud.run('createProveedor', { data });
    return ProveedorService.mapItem(result);
  }

  static async update(
    id: string,
    data: Partial<ProveedorFormData>
  ): Promise<Proveedor> {
    const result = await Parse.Cloud.run('updateProveedor', { id, data });
    return ProveedorService.mapItem(result);
  }

  static async delete(id: string): Promise<void> {
    await Parse.Cloud.run('deleteProveedor', { id });
  }

  static async getHistorial(
    proveedorId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ results: ProveedorHistorialEntry[]; total: number }> {
    try {
      const result = await Parse.Cloud.run('getProveedorHistorial', {
        proveedorId,
        limit,
        skip,
      });
      return {
        results: (result.results || []).map((item: any) => ({
          id: item.id,
          proveedorId: item.proveedorId,
          accion: item.accion,
          cambios: item.cambios,
          descripcion: item.descripcion,
          usuarioId: item.usuarioId,
          usuarioNombre: item.usuarioNombre,
          createdAt: item.createdAt,
        })),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getProveedorHistorial:', error);
      return { results: [], total: 0 };
    }
  }

  static async getAll(): Promise<Proveedor[]> {
    try {
      const result = await Parse.Cloud.run('getProveedores', { limit: 10000, activo: true });
      return (result.results || []).map(ProveedorService.mapItem);
    } catch (error) {
      console.error('Error getAll proveedores:', error);
      return [];
    }
  }

  private static mapItem(data: any): Proveedor {
    return {
      id: data.id || data.objectId,
      rut: data.rut || '',
      nombre: data.nombre || '',
      correo: data.correo || '',
      telefono: data.telefono || '',
      direccion: data.direccion || '',
      descripcion: data.descripcion || '',
      activo: data.activo !== false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
