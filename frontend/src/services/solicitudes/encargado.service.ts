import Parse from 'utils/parseClient';
import { EncargadoMantenimiento, EncargadoFormData } from 'types/encargado.types';

export const EncargadoService = {
  async listar(params: { soloActivos?: boolean; busqueda?: string; dominio?: string } = {}): Promise<{ results: EncargadoMantenimiento[]; total: number }> {
    return Parse.Cloud.run('getEncargados', params);
  },

  async crear(data: EncargadoFormData): Promise<EncargadoMantenimiento> {
    return Parse.Cloud.run('crearEncargado', { ...data, crearUsuarioParse: true });
  },

  async actualizar(id: string, data: Partial<EncargadoFormData & { activo: boolean }>): Promise<EncargadoMantenimiento> {
    return Parse.Cloud.run('actualizarEncargado', { id, ...data });
  },

  async eliminar(id: string): Promise<void> {
    await Parse.Cloud.run('eliminarEncargado', { id });
  },
};
