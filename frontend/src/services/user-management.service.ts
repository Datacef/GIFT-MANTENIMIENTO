import Parse from 'utils/parseClient';
import { UserRole, ROLE_TO_ACCESS_LEVEL, accessLevelToRole } from 'types/user.types';

export interface ManagedUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  displayName?: string;
  createdAt?: number;
  servicioSaludId?: string;
  servicioSaludNombre?: string;
  establecimientoId?: string;
  establecimientoNombre?: string;
  establecimientoCodigo?: number;
}

export class UserManagementService {
  static async getAllUsers(): Promise<ManagedUser[]> {
    try {
      const result = await Parse.Cloud.run('getAllUsers', { limit: 200, page: 0 });
      return (result.results || []).map(UserManagementService.mapUser);
    } catch (error) {
      console.error('Error getAllUsers:', error);
      return [];
    }
  }

  static async addUser(
    email: string,
    role: UserRole,
    servicioSaludId?: string,
    servicioSaludNombre?: string
  ): Promise<void> {
    const user = new Parse.User();
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    user.set('username', email);
    user.set('email', email);
    user.set('password', tempPassword);
    user.set('role', role);
    user.set('accessLevel', ROLE_TO_ACCESS_LEVEL[role]);
    user.set('emailVerified', true);
    if (servicioSaludId) user.set('servicioSaludId', servicioSaludId);
    if (servicioSaludNombre) user.set('servicioSaludNombre', servicioSaludNombre);
    await user.signUp();
  }

  static async removeUser(userId: string): Promise<void> {
    await Parse.Cloud.run('deleteUser', { userId });
  }

  static async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const accessLevel = ROLE_TO_ACCESS_LEVEL[role];
    await Parse.Cloud.run('updateUserAccessLevel', { userId, accessLevel });
    await Parse.Cloud.run('updateUser', { userId, userData: { role } });
  }

  static async updateUserServicioSalud(
    userId: string,
    servicioSaludId: string,
    servicioSaludNombre: string
  ): Promise<void> {
    await Parse.Cloud.run('updateUser', {
      userId,
      userData: { servicioSaludId, servicioSaludNombre }
    });
  }

  static async updateUserEstablecimiento(
    userId: string,
    establecimientoId: string,
    establecimientoNombre: string,
    establecimientoCodigo: number
  ): Promise<void> {
    await Parse.Cloud.run('updateUser', {
      userId,
      userData: { establecimientoId, establecimientoNombre, establecimientoCodigo }
    });
  }

  static async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    await Parse.Cloud.run('updateUser', { userId, userData: { isActive } });
  }

  static async initializeSeed(): Promise<void> {
    // No-op: el seed se hace en el servidor vía init-super-admin.js
  }

  private static mapUser(data: any): ManagedUser {
    const level = data.accessLevel ?? 1;
    return {
      id: data.id || data.objectId,
      email: data.email || '',
      role: data.role || accessLevelToRole(level),
      isActive: data.isActive !== false,
      displayName: data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : data.email,
      createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
      servicioSaludId: data.servicioSaludId || undefined,
      servicioSaludNombre: data.servicioSaludNombre || undefined,
      establecimientoId: data.establecimientoId || undefined,
      establecimientoNombre: data.establecimientoNombre || undefined,
      establecimientoCodigo: data.establecimientoCodigo || undefined,
    };
  }
}
