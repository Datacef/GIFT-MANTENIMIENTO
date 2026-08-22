import Parse from 'utils/parseClient';
import { IEstablecimiento } from 'types/utils/establecimiento.types';

export class EstablecimientoService {
  static async getAll(): Promise<IEstablecimiento[]> {
    try {
      const results = await Parse.Cloud.run('getEstablecimientos');
      return results as IEstablecimiento[];
    } catch (error) {
      console.error('Error al obtener establecimientos:', error);
      return [];
    }
  }

  static async getByServicioSalud(servicioSaludCodigo: number): Promise<IEstablecimiento[]> {
    try {
      const results = await Parse.Cloud.run('getEstablecimientos', { servicioSaludCodigo });
      return results as IEstablecimiento[];
    } catch (error) {
      console.error('Error al obtener establecimientos por servicio:', error);
      return [];
    }
  }
}
