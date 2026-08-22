import Parse from 'utils/parseClient';
import { UserRole } from 'types/user.types';

export interface UserProfileData {
  role?: UserRole;
  profession?: string;
  department?: string;
  division?: string;
  organization?: string;
  education?: string;
  languages?: string;
  birthday?: string;
  functions?: string;
  institutionalPhone?: string;
  mobilePhone?: string;
  institutionalEmail?: string;
  servicioSaludId?: string;
  servicioSaludNombre?: string;
}

export class UserService {
  /**
   * Obtiene el perfil extendido de un usuario por su objectId de Parse.
   * Primero intenta usar el usuario en sesión, luego Cloud Function para admins.
   */
  static async getUserProfile(userId: string): Promise<UserProfileData | null> {
    try {
      const currentUser = Parse.User.current();
      if (!currentUser) return null;

      // Si es el propio usuario, usamos los datos locales
      if (currentUser.id === userId) {
        return UserService.extractProfileData(currentUser);
      }

      // Para otros usuarios (admin viendo perfil ajeno), usar Cloud Function
      const result = await Parse.Cloud.run('getUserById', { userId });
      return result ? UserService.extractProfileFromCloud(result) : null;
    } catch (error) {
      console.error('Error getUserProfile:', error);
      return null;
    }
  }

  static async updateUserProfile(userId: string, data: Partial<UserProfileData>): Promise<void> {
    const user = Parse.User.current();
    if (!user || user.id !== userId) {
      throw new Error('No autorizado para actualizar este perfil');
    }
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) user.set(key, value);
    });
    await user.save();
  }

  static async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    const user = Parse.User.current();
    if (!user || user.id !== userId) {
      throw new Error('No autorizado');
    }
    const parseFile = new Parse.File(file.name, file);
    await parseFile.save();
    const url = parseFile.url() || '';
    user.set('avatarUrl', url);
    await user.save();
    return url;
  }

  private static extractProfileData(user: Parse.User): UserProfileData {
    return {
      role: user.get('role'),
      profession: user.get('profession'),
      department: user.get('department'),
      division: user.get('division'),
      organization: user.get('organization'),
      education: user.get('education'),
      languages: user.get('languages'),
      birthday: user.get('birthday'),
      functions: user.get('functions'),
      institutionalPhone: user.get('institutionalPhone'),
      mobilePhone: user.get('mobilePhone'),
      institutionalEmail: user.get('institutionalEmail'),
      servicioSaludId: user.get('servicioSaludId'),
      servicioSaludNombre: user.get('servicioSaludNombre'),
    };
  }

  private static extractProfileFromCloud(data: any): UserProfileData {
    return {
      role: data.role,
      profession: data.profession,
      department: data.department,
      division: data.division,
      organization: data.organization,
      education: data.education,
      languages: data.languages,
      birthday: data.birthday,
      functions: data.functions,
      institutionalPhone: data.institutionalPhone,
      mobilePhone: data.mobilePhone,
      institutionalEmail: data.institutionalEmail,
      servicioSaludId: data.servicioSaludId,
      servicioSaludNombre: data.servicioSaludNombre,
    };
  }
}
