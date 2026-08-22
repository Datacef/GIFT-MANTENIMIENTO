import Parse from 'utils/parseClient';
import { ICodigoSS } from 'types/utils/codigo.ss.types';

export class CodigoSSService {
  // Ajusta el nombre según el document name de tu clase en Parse Server
  private static readonly CLASS_NAME = 'CodigoSS'; 

  /**
   * Obtiene todos los registros de la tabla.
   * Usa la Cloud Function 'getServiciosSalud' que NO requiere autenticación,
   * permitiendo que funcione en la pantalla de registro (sin sesión activa).
   */
  static async getAll(): Promise<ICodigoSS[]> {
    try {
      const results = await Parse.Cloud.run('getServiciosSalud');
      return results as ICodigoSS[];
    } catch (error) {
      console.error('Error al obtener servicios de salud:', error);
      return [];
    }
  }

  /**
   * Obtiene un registro por su ID
   * @param id Identificador único del objeto en Parse
   */
  static async getById(id: string): Promise<ICodigoSS | null> {
    const query = new Parse.Query(this.CLASS_NAME);
    try {
      const item = await query.get(id);
      return {
        id: item.id,
        ...item.attributes,
      } as ICodigoSS;
    } catch (error) {
      console.error(`Error al obtener ${this.CLASS_NAME} con ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Crea un nuevo registro
   * @param data Datos a insertar en el CRUD excluyendo el id que se genera automáticamente
   */
  static async create(data: Omit<ICodigoSS, 'id'>): Promise<ICodigoSS> {
    const ParseClass = Parse.Object.extend(this.CLASS_NAME);
    const item = new ParseClass();
    
    // Setea todas las propiedades recibidas
    for (const key in data) {
      item.set(key, (data as any)[key]);
    }
    
    const savedItem = await item.save();
    return {
      id: savedItem.id,
      ...savedItem.attributes,
    } as ICodigoSS;
  }

  /**
   * Actualiza un registro existente mediante su ID
   * @param id Identificador del registro a actualizar
   * @param data Campos a modificar
   */
  static async update(id: string, data: Partial<ICodigoSS>): Promise<ICodigoSS> {
    const query = new Parse.Query(this.CLASS_NAME);
    const item = await query.get(id);
    
    if (!item) {
        throw new Error(`Registro de ${this.CLASS_NAME} no encontrado`);
    }

    // Actualizamos solo los atributos proveídos excluyendo la posible presencia de `id`
    for (const key in data) {
      if (key !== 'id') {
        item.set(key, (data as any)[key]);
      }
    }

    const updatedItem = await item.save();
    return {
      id: updatedItem.id,
      ...updatedItem.attributes,
    } as ICodigoSS;
  }

  /**
   * Elimina destructivamente un registro
   * @param id ID a eliminar
   */
  static async delete(id: string): Promise<void> {
    const query = new Parse.Query(this.CLASS_NAME);
    const item = await query.get(id);
    
    if (item) {
      await item.destroy();
    }
  }
}
