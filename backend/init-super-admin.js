/**
 * Inicialización del super administrador por defecto.
 * Se ejecuta una vez al arrancar el servidor si el usuario no existe.
 * Usa la REST API de Parse con master key (solo en servidor, nunca en cliente).
 */

async function initSuperAdmin() {
  const appId = process.env.PARSE_APP_ID;
  const masterKey = process.env.PARSE_MASTER_KEY;
  const serverURL = process.env.PARSE_SERVER_URL || 'http://backend-server:1337/parse';
  const adminUser = process.env.DEFAULT_ADMIN_USER;
  const adminPass = process.env.DEFAULT_ADMIN_PASS;
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;

  if (!adminUser || !adminPass || !adminEmail) {
    console.error('❌ DEFAULT_ADMIN_USER, DEFAULT_ADMIN_PASS y DEFAULT_ADMIN_EMAIL son requeridos en .env');
    return;
  }

  const headers = {
    'X-Parse-Application-Id': appId,
    'X-Parse-Master-Key': masterKey,
    'Content-Type': 'application/json'
  };

  try {
    // Verificar si el usuario admin ya existe
    const searchRes = await fetch(
      `${serverURL}/users?where=${encodeURIComponent(JSON.stringify({ username: adminUser }))}`,
      { headers }
    );

    if (!searchRes.ok) {
      console.log('⚠️  No se pudo verificar usuario admin, reintentando en próximo arranque.');
      return;
    }

    const searchData = await searchRes.json();

    if (searchData.results && searchData.results.length > 0) {
      const existing = searchData.results[0];
      // Asegurarse de que tiene accessLevel 5
      if (existing.accessLevel !== 5) {
        await fetch(`${serverURL}/users/${existing.objectId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ accessLevel: 5, emailVerified: true })
        });
        console.log('✅ Super admin existente actualizado a accessLevel 5');
      } else {
        console.log('✅ Super admin ya configurado correctamente');
      }
      return;
    }

    // Crear el usuario admin
    const createRes = await fetch(`${serverURL}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: adminUser,
        password: adminPass,
        email: adminEmail,
        firstName: process.env.DEFAULT_ADMIN_FIRSTNAME || adminUser,
        lastName: process.env.DEFAULT_ADMIN_LASTNAME || '',
        accessLevel: 5,
        emailVerified: true
      })
    });

    if (createRes.ok) {
      const created = await createRes.json();
      console.log(`✅ Super admin creado: usuario="${adminUser}" (objectId: ${created.objectId})`);
    } else {
      const err = await createRes.json();
      console.error('❌ Error al crear super admin:', err);
    }
  } catch (error) {
    console.error('❌ Error en initSuperAdmin:', error.message);
  }
}

module.exports = { initSuperAdmin };
