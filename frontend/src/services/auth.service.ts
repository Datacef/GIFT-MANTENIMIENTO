import Parse from 'utils/parseClient';

export interface ParseUserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  accessLevel: number;
  servicioSaludId?: string;
  servicioSaludNombre?: string;
}

export class AuthService {
  static getCurrentUser(): Parse.User | null {
    return Parse.User.current();
  }

  static getCurrentUserProfile(): ParseUserProfile | null {
    const user = Parse.User.current();
    if (!user) return null;
    return AuthService.mapUser(user);
  }

  static async login(identifier: string, password: string): Promise<Parse.User> {
    // Parse.User.logIn acepta username o email (con enableEmailSignIn: true en servidor)
    return Parse.User.logIn(identifier, password);
  }

  static async register(
    email: string,
    password: string,
    name: string,
    servicioSaludId?: string,
    servicioSaludNombre?: string
  ): Promise<Parse.User> {
    const user = new Parse.User();
    // username = email para que el login con correo funcione siempre
    user.set('username', email);
    user.set('email', email);
    user.set('password', password);
    // Guardar nombre completo
    const parts = name.trim().split(' ');
    user.set('firstName', parts[0] || name);
    user.set('lastName', parts.slice(1).join(' ') || '');
    user.set('displayName', name);
    user.set('accessLevel', 1);
    // Servicio de Salud
    if (servicioSaludId) user.set('servicioSaludId', servicioSaludId);
    if (servicioSaludNombre) user.set('servicioSaludNombre', servicioSaludNombre);
    return user.signUp();
  }

  static async logout(): Promise<void> {
    await Parse.User.logOut();
  }

  static async resetPassword(email: string): Promise<void> {
    await Parse.User.requestPasswordReset(email);
  }

  static async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    const user = Parse.User.current();
    if (!user) throw new Error('No user logged in');
    if (data.displayName !== undefined) user.set('displayName', data.displayName);
    if (data.photoURL !== undefined) user.set('avatarUrl', data.photoURL);
    await user.save();
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = Parse.User.current();
    if (!user) throw new Error('No user logged in');
    const email = user.get('email') || user.get('username');
    // Verificar contraseña actual intentando login
    await Parse.User.logIn(email, currentPassword);
    // Si el login fue exitoso, actualizar la contraseña
    const freshUser = Parse.User.current();
    if (!freshUser) throw new Error('Error de sesión');
    freshUser.set('password', newPassword);
    await freshUser.save();
  }

  static mapUser(user: Parse.User): ParseUserProfile {
    const firstName = user.get('firstName') || '';
    const lastName = user.get('lastName') || '';
    const storedDisplayName = user.get('displayName') || '';
    const email: string = user.get('email') || '';

    const displayName = storedDisplayName ||
      (firstName || lastName ? `${firstName} ${lastName}`.trim() : email.split('@')[0]);

    return {
      id: user.id,
      email,
      displayName,
      photoURL: user.get('avatarUrl') || null,
      accessLevel: user.get('accessLevel') || 1,
      servicioSaludId: user.get('servicioSaludId') || undefined,
      servicioSaludNombre: user.get('servicioSaludNombre') || undefined,
    };
  }
}
