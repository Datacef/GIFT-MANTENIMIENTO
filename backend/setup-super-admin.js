// Script para configurar super administrador
// Ejecutar desde la consola del navegador en la aplicación Angular

async function configurarSuperAdmin() {
  try {
    console.log('🔧 Configurando super administrador...');
    
    // Obtener usuario actual
    const currentUser = Parse.User.current();
    if (!currentUser) {
      console.error('❌ Debe iniciar sesión primero');
      return;
    }
    
    console.log('👤 Usuario actual:', currentUser.get('email'));
    
    // Usar la cloud function para obtener todos los usuarios (debería funcionar con acceso temporal)
    const usersResult = await Parse.Cloud.run('getAllUsers', { limit: 10, page: 0 });
    console.log('👥 Usuarios encontrados:', usersResult.total);
    console.log('📋 Lista de usuarios:', usersResult.results);
    
    // Configurar el usuario actual como super admin
    const updateResult = await Parse.Cloud.run('updateUserAccessLevel', {
      userId: currentUser.id,
      accessLevel: 5 // Super Admin
    });
    
    console.log('✅ Super admin configurado correctamente:', updateResult);
    console.log('🔄 Recarga la página para que los cambios tengan efecto');
    
  } catch (error) {
    console.error('❌ Error configurando super admin:', error);
  }
}

// Ejecutar la función
configurarSuperAdmin();

console.log(`
=================================================
📋 INSTRUCCIONES:
=================================================
1. Asegúrate de haber iniciado sesión en la aplicación
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña "Console"
4. Copia y pega este código completo
5. Presiona Enter para ejecutar
6. Si todo funciona, recarga la página
=================================================
`);
