import Parse from 'utils/parseClient';
import { ISelector } from 'types/utils/selector.types';

export class SelectoresService {
  private static readonly CLASS_NAME = 'Selectores';

  /**
   * Obtiene todos los registros de selectores.
   * Usa Cloud Function para funcionar sin autenticación si es necesario.
   */
  static async getAll(): Promise<ISelector[]> {
    const query = new Parse.Query(this.CLASS_NAME);
    query.limit(1000);
    const results = await query.find();

    return results.map((item) => ({
      id: item.id,
      ...item.attributes,
    })) as ISelector[];
  }

  /**
   * Obtiene un registro por su ID
   */
  static async getById(id: string): Promise<ISelector | null> {
    const query = new Parse.Query(this.CLASS_NAME);
    try {
      const item = await query.get(id);
      return {
        id: item.id,
        ...item.attributes,
      } as ISelector;
    } catch (error) {
      console.error(`Error al obtener ${this.CLASS_NAME} con ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Crea un nuevo registro
   */
  static async create(data: Omit<ISelector, 'id'>): Promise<ISelector> {
    const ParseClass = Parse.Object.extend(this.CLASS_NAME);
    const item = new ParseClass();

    for (const key in data) {
      item.set(key, (data as any)[key]);
    }

    const savedItem = await item.save();
    return {
      id: savedItem.id,
      ...savedItem.attributes,
    } as ISelector;
  }

  /**
   * Actualiza un registro existente
   */
  static async update(id: string, data: Partial<ISelector>): Promise<ISelector> {
    const query = new Parse.Query(this.CLASS_NAME);
    const item = await query.get(id);

    if (!item) {
      throw new Error(`Registro de ${this.CLASS_NAME} no encontrado`);
    }

    for (const key in data) {
      if (key !== 'id') {
        item.set(key, (data as any)[key]);
      }
    }

    const updatedItem = await item.save();
    return {
      id: updatedItem.id,
      ...updatedItem.attributes,
    } as ISelector;
  }

  /**
   * Elimina un registro
   */
  static async delete(id: string): Promise<void> {
    const query = new Parse.Query(this.CLASS_NAME);
    const item = await query.get(id);

    if (item) {
      await item.destroy();
    }
  }
}
