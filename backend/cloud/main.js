/**
 * Parse Cloud Functions — Sistema de Gestión de Mantenimiento
 * Dispositivos Médicos, Industrial e Infraestructura
 */


// Función simple de prueba
Parse.Cloud.define('hello', async (request) => {
  return 'Hola ' + (request.params.name || 'mundo') + ' desde Parse Cloud!';
});

// Ejemplo de función que usa las clases de la base de datos
Parse.Cloud.define('countObjects', async (request) => {
  const { className } = request.params;
  
  if (!className) {
    throw new Parse.Error(400, 'Se requiere el parámetro className');
  }
  
  try {
    const ParseObject = Parse.Object.extend(className);
    const query = new Parse.Query(ParseObject);
    const count = await query.count();
    
    return {
      className,
      count,
      status: 'success'
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al contar objetos: ${error.message}`);
  }
});

// Ejemplo de función con validación y lógica de negocio
Parse.Cloud.define('procesarDatos', async (request) => {
  const { datos, operacion } = request.params;
  
  if (!datos || !Array.isArray(datos)) {
    throw new Parse.Error(400, 'El parámetro datos debe ser un array');
  }
  
  if (!operacion) {
    throw new Parse.Error(400, 'Se requiere el parámetro operacion');
  }
  
  let resultado;
  
  switch (operacion) {
    case 'suma':
      resultado = datos.reduce((total, valor) => total + valor, 0);
      break;
    case 'promedio':
      if (datos.length === 0) {
        resultado = 0;
      } else {
        const suma = datos.reduce((total, valor) => total + valor, 0);
        resultado = suma / datos.length;
      }
      break;
    case 'maximo':
      resultado = Math.max(...datos);
      break;
    case 'minimo':
      resultado = Math.min(...datos);
      break;
    default:
      throw new Parse.Error(400, `Operación no soportada: ${operacion}`);
  }
  
  return {
    datos,
    operacion,
    resultado,
    timestamp: new Date()
  };
});

// ===============================================
// FUNCIONES DE ADMINISTRACIÓN DE USUARIOS
// ===============================================

/**
 * Obtiene todos los usuarios del sistema con paginación
 * Requiere permisos de administrador (accessLevel >= 4) O acceso temporal para configuración inicial
 */
Parse.Cloud.define('getAllUsers', async (request) => {
  // Verificar permisos del usuario actual
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticación');
  }
  
  // Verificar que sea administrador o superadmin (nivel 4 o 5)
  // TEMPORAL: Permitir acceso a cualquier usuario autenticado para configuración inicial
  const accessLevel = currentUser.get('accessLevel');
  const isTemporaryAccess = !accessLevel; // Si no tiene accessLevel definido, permitir acceso temporal
  
  if (!isTemporaryAccess && (accessLevel < 4)) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador');
  }
  
  if (isTemporaryAccess) {
    console.log('⚠️ Acceso temporal concedido para configuración inicial del sistema');
  }
  
  const { limit = 100, page = 0 } = request.params;
  
  try {
    // Consultar el total de usuarios
    const total = await new Parse.Query(Parse.User).count({ useMasterKey: true });
    
    // Consultar usuarios con paginación
    const query = new Parse.Query(Parse.User);
    query.limit(limit);
    query.skip(page * limit);
    query.descending('createdAt');
    
    const users = await query.find({ useMasterKey: true });
    
    // Transformar los usuarios al formato esperado
    return {
      results: users.map(user => ({
        id: user.id,
        email: user.get('email'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        birthDate: user.get('birthDate'),
        gender: user.get('gender'),
        phone: user.get('phone'),
        accessLevel: user.get('accessLevel') || 1,
        role: user.get('role'),
        isActive: user.get('isActive') !== false,
        avatarUrl: user.get('avatarUrl'),
        servicioSaludId: user.get('servicioSaludId'),
        servicioSaludNombre: user.get('servicioSaludNombre'),
        establecimientoId: user.get('establecimientoId'),
        establecimientoNombre: user.get('establecimientoNombre'),
        establecimientoCodigo: user.get('establecimientoCodigo'),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      total: total
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener usuarios: ${error.message}`);
  }
});

/**
 * Busca usuarios por email, nombre o apellido
 * Requiere permisos de administrador (accessLevel >= 4)
 */
Parse.Cloud.define('searchUsers', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticación');
  }
  
  const accessLevel = currentUser.get('accessLevel');
  if (!accessLevel || accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador');
  }
  
  const { criteria } = request.params;
  if (!criteria || criteria.trim().length < 2) {
    throw new Parse.Error(400, 'El criterio de búsqueda debe tener al menos 2 caracteres');
  }
  
  try {
    // Crear consultas para diferentes campos
    const emailQuery = new Parse.Query(Parse.User);
    emailQuery.contains('email', criteria);
    
    const firstNameQuery = new Parse.Query(Parse.User);
    firstNameQuery.contains('firstName', criteria);
    
    const lastNameQuery = new Parse.Query(Parse.User);
    lastNameQuery.contains('lastName', criteria);
    
    // Combinar consultas con OR
    const mainQuery = Parse.Query.or(emailQuery, firstNameQuery, lastNameQuery);
    mainQuery.limit(50);
    
    const users = await mainQuery.find({ useMasterKey: true });
    
    return users.map(user => ({
      id: user.id,
      email: user.get('email'),
      firstName: user.get('firstName'),
      lastName: user.get('lastName'),
      birthDate: user.get('birthDate'),
      gender: user.get('gender'),
      phone: user.get('phone'),
      accessLevel: user.get('accessLevel') || 1,
      avatarUrl: user.get('avatarUrl'),
      servicioSaludId: user.get('servicioSaludId'),
      servicioSaludNombre: user.get('servicioSaludNombre'),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
  } catch (error) {
    throw new Parse.Error(500, `Error al buscar usuarios: ${error.message}`);
  }
});

/**
 * Obtiene un usuario específico por ID
 * Requiere permisos de administrador (accessLevel >= 4)
 */
Parse.Cloud.define('getUserById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticación');
  }
  
  const accessLevel = currentUser.get('accessLevel');
  if (!accessLevel || accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador');
  }
  
  const { userId } = request.params;
  if (!userId) {
    throw new Parse.Error(400, 'Se requiere el ID del usuario');
  }
  
  try {
    const query = new Parse.Query(Parse.User);
    const user = await query.get(userId, { useMasterKey: true });
    
    return {
      id: user.id,
      email: user.get('email'),
      firstName: user.get('firstName'),
      lastName: user.get('lastName'),
      birthDate: user.get('birthDate'),
      gender: user.get('gender'),
      phone: user.get('phone'),
      accessLevel: user.get('accessLevel') || 1,
      avatarUrl: user.get('avatarUrl'),
      servicioSaludId: user.get('servicioSaludId'),
      servicioSaludNombre: user.get('servicioSaludNombre'),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener usuario: ${error.message}`);
  }
});

/**
 * Actualiza los datos de un usuario
 * Requiere permisos de administrador (accessLevel >= 4)
 */
Parse.Cloud.define('updateUser', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticación');
  }
  
  const accessLevel = currentUser.get('accessLevel');
  if (!accessLevel || accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador');
  }
  
  const { userId, userData } = request.params;
  if (!userId) {
    throw new Parse.Error(400, 'Se requiere el ID del usuario');
  }
  
  if (!userData) {
    throw new Parse.Error(400, 'Se requieren los datos del usuario');
  }
  
  try {
    const query = new Parse.Query(Parse.User);
    const user = await query.get(userId, { useMasterKey: true });
    
    // Actualizar solo los campos proporcionados
    if (userData.firstName !== undefined) user.set('firstName', userData.firstName);
    if (userData.lastName !== undefined) user.set('lastName', userData.lastName);
    if (userData.email !== undefined) user.set('email', userData.email);
    if (userData.gender !== undefined) user.set('gender', userData.gender);
    if (userData.phone !== undefined) user.set('phone', userData.phone);
    if (userData.birthDate !== undefined) user.set('birthDate', userData.birthDate);
    if (userData.avatarUrl !== undefined) user.set('avatarUrl', userData.avatarUrl);
    if (userData.role !== undefined) user.set('role', userData.role);
    if (userData.isActive !== undefined) user.set('isActive', userData.isActive);
    if (userData.servicioSaludId !== undefined) user.set('servicioSaludId', userData.servicioSaludId);
    if (userData.servicioSaludNombre !== undefined) user.set('servicioSaludNombre', userData.servicioSaludNombre);
    if (userData.establecimientoId !== undefined) user.set('establecimientoId', userData.establecimientoId);
    if (userData.establecimientoNombre !== undefined) user.set('establecimientoNombre', userData.establecimientoNombre);
    if (userData.establecimientoCodigo !== undefined) user.set('establecimientoCodigo', userData.establecimientoCodigo);

    // Guardar cambios
    await user.save(null, { useMasterKey: true });
    
    return {
      id: user.id,
      email: user.get('email'),
      firstName: user.get('firstName'),
      lastName: user.get('lastName'),
      birthDate: user.get('birthDate'),
      gender: user.get('gender'),
      phone: user.get('phone'),
      accessLevel: user.get('accessLevel') || 1,
      avatarUrl: user.get('avatarUrl'),
      servicioSaludId: user.get('servicioSaludId'),
      servicioSaludNombre: user.get('servicioSaludNombre'),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al actualizar usuario: ${error.message}`);
  }
});

/**
 * Actualiza el nivel de acceso de un usuario
 * Requiere permisos de super administrador (accessLevel = 5) O acceso temporal para configuración inicial
 */
Parse.Cloud.define('updateUserAccessLevel', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticación');
  }

  const currentAccessLevel = currentUser.get('accessLevel');
  const isTemporaryAccess = !currentAccessLevel; // Si no tiene accessLevel definido, permitir acceso temporal

  if (!isTemporaryAccess && currentAccessLevel < 5) {
    throw new Parse.Error(403, 'Se requieren permisos de super administrador');
  }
  
  if (isTemporaryAccess) {
    console.log('⚠️ Acceso temporal concedido para configuración inicial del sistema - updateUserAccessLevel');
  }
  
  const { userId, accessLevel } = request.params;
  if (!userId) {
    throw new Parse.Error(400, 'Se requiere el ID del usuario');
  }
  
  if (accessLevel === undefined || accessLevel === null) {
    throw new Parse.Error(400, 'Se requiere el nivel de acceso');
  }
  
  // Validar que el nivel de acceso sea válido (1-5)
  if (accessLevel < 1 || accessLevel > 5) {
    throw new Parse.Error(400, 'El nivel de acceso debe estar entre 1 y 5');
  }
  
  try {
    const query = new Parse.Query(Parse.User);
    const user = await query.get(userId, { useMasterKey: true });
    
    // No permitir que se modifique su propio nivel de acceso (excepto en configuración inicial)
    if (!isTemporaryAccess && user.id === currentUser.id) {
      throw new Parse.Error(403, 'No puedes modificar tu propio nivel de acceso');
    }
    
    user.set('accessLevel', accessLevel);
    await user.save(null, { useMasterKey: true });
    
    return {
      success: true,
      message: 'Nivel de acceso actualizado correctamente',
      userId: user.id,
      newAccessLevel: accessLevel
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al actualizar nivel de acceso: ${error.message}`);
  }
});

/**
 * Elimina un usuario del sistema
 * Requiere permisos de super administrador (accessLevel = 5)
 */
Parse.Cloud.define('deleteUser', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticación');
  }
  
  const currentAccessLevel = currentUser.get('accessLevel');
  if (!currentAccessLevel || currentAccessLevel !== 5) {
    throw new Parse.Error(403, 'Se requieren permisos de super administrador');
  }
  
  const { userId } = request.params;
  if (!userId) {
    throw new Parse.Error(400, 'Se requiere el ID del usuario');
  }
  
  try {
    const query = new Parse.Query(Parse.User);
    const user = await query.get(userId, { useMasterKey: true });
    
    // No permitir que se elimine a sí mismo
    if (user.id === currentUser.id) {
      throw new Parse.Error(403, 'No puedes eliminarte a ti mismo');
    }
    
    await user.destroy({ useMasterKey: true });
    
    return {
      success: true,
      message: 'Usuario eliminado correctamente',
      deletedUserId: userId
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar usuario: ${error.message}`);
  }
});

// ===============================================
// FUNCIÓN PARA ASIGNAR SUPER ADMIN INICIAL
// ===============================================

/**
 * Función para asignar nivel de super admin a un usuario específico
 * Esta función debe ser llamada solo una vez para configurar el primer super admin
 */
Parse.Cloud.define('setSuperAdmin', async (request) => {
  const { email, masterKey } = request.params;
  
  // Verificar que se proporcione la master key para esta operación crítica
  if (masterKey !== process.env.PARSE_MASTER_KEY) {
    throw new Parse.Error(403, 'Master key inválida');
  }
  
  if (!email) {
    throw new Parse.Error(400, 'Se requiere el email del usuario');
  }
  
  try {
    const query = new Parse.Query(Parse.User);
    query.equalTo('email', email);
    const user = await query.first({ useMasterKey: true });
    
    if (!user) {
      throw new Parse.Error(404, 'Usuario no encontrado');
    }
    
    user.set('accessLevel', 5); // Super Admin
    await user.save(null, { useMasterKey: true });
    
    return {
      success: true,
      message: `Usuario ${email} configurado como Super Administrador`,
      userId: user.id,
      accessLevel: 5
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al configurar super admin: ${error.message}`);
  }
});

/**
 * Función de emergencia para actualizar nivel de acceso usando master key
 * SOLO para configuración inicial cuando la autenticación normal falla
 * Requiere master key en los headers de la petición
 */
Parse.Cloud.define('emergencyUpdateUserAccessLevel', async (request) => {
  const { userId, accessLevel, emergencyKey } = request.params;
  
  // Verificar clave de emergencia (debe coincidir con la master key)
  const expectedKey = process.env.PARSE_SERVER_MASTER_KEY;
  if (!emergencyKey || emergencyKey !== expectedKey) {
    throw new Parse.Error(403, 'Clave de emergencia inválida');
  }
  
  if (!userId) {
    throw new Parse.Error(400, 'Se requiere el ID del usuario');
  }
  
  if (accessLevel === undefined || accessLevel === null) {
    throw new Parse.Error(400, 'Se requiere el nivel de acceso');
  }
  
  // Validar que el nivel de acceso sea válido (1-5)
  if (accessLevel < 1 || accessLevel > 5) {
    throw new Parse.Error(400, 'El nivel de acceso debe estar entre 1 y 5');
  }
  
  try {
    const query = new Parse.Query(Parse.User);
    const user = await query.get(userId, { useMasterKey: true });
    
    user.set('accessLevel', accessLevel);
    await user.save(null, { useMasterKey: true });
    
    console.log(`🚨 FUNCIÓN DE EMERGENCIA: Usuario ${user.get('email')} actualizado a nivel ${accessLevel}`);
    
    return {
      success: true,
      message: 'Nivel de acceso actualizado correctamente (modo emergencia)',
      userId: user.id,
      newAccessLevel: accessLevel,
      mode: 'emergency'
    };
  } catch (error) {
    console.error('Error en función de emergencia:', error);
    throw new Parse.Error(500, `Error al actualizar usuario: ${error.message}`);
  }
});

// ===============================================
// FUNCIÓN PÚBLICA — SERVICIOS DE SALUD
// ===============================================

/**
 * Obtiene la lista completa de Servicios de Salud desde la colección CodigoSS.
 * NO requiere autenticación para que esté disponible en la pantalla de registro.
 */
Parse.Cloud.define('getServiciosSalud', async (request) => {
  try {
    const query = new Parse.Query('CodigoSS');
    query.ascending('SERVICIO_SALUD');
    query.limit(1000);
    const results = await query.find({ useMasterKey: true });
    
    return results.map(item => ({
      id: item.id,
      CODIGO_SERVICIO_SALUD: item.get('CODIGO_SERVICIO_SALUD'),
      SERVICIO_SALUD: item.get('SERVICIO_SALUD')
    }));
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener servicios de salud: ${error.message}`);
  }
});

// ===============================================
// FUNCIÓN PÚBLICA — ESTABLECIMIENTOS
// ===============================================

/**
 * Obtiene establecimientos desde la colección Establecimiento.
 * Opcionalmente filtra por servicioSaludCodigo.
 * NO requiere autenticación.
 */
Parse.Cloud.define('getEstablecimientos', async (request) => {
  try {
    const { servicioSaludCodigo } = request.params || {};
    const query = new Parse.Query('Establecimiento');
    query.ascending('nombre');
    query.limit(10000);

    if (servicioSaludCodigo) {
      query.equalTo('servicioSaludCodigo', servicioSaludCodigo);
    }

    // Solo traer campos necesarios para selectores
    query.select(
      'codigo', 'nombre', 'servicioSaludCodigo', 'servicioSaludNombre',
      'regionNombre', 'comunaNombre', 'tipoEstablecimiento',
      'nivelComplejidad', 'tipoAtencion', 'estadoFuncionamiento'
    );

    const results = await query.find({ useMasterKey: true });

    return results.map(item => ({
      id: item.id,
      codigo: item.get('codigo'),
      nombre: item.get('nombre'),
      servicioSaludCodigo: item.get('servicioSaludCodigo'),
      servicioSaludNombre: item.get('servicioSaludNombre'),
      regionNombre: item.get('regionNombre'),
      comunaNombre: item.get('comunaNombre'),
      tipoEstablecimiento: item.get('tipoEstablecimiento'),
      nivelComplejidad: item.get('nivelComplejidad'),
      tipoAtencion: item.get('tipoAtencion'),
      estadoFuncionamiento: item.get('estadoFuncionamiento'),
    }));
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener establecimientos: ${error.message}`);
  }
});

/**
 * Obtiene los servicios de salud únicos derivados de la tabla Establecimiento.
 * NO requiere autenticación.
 */
Parse.Cloud.define('getServiciosSaludFromEstablecimientos', async (request) => {
  try {
    const query = new Parse.Query('Establecimiento');
    query.limit(10000);
    query.select('servicioSaludCodigo', 'servicioSaludNombre');
    const results = await query.find({ useMasterKey: true });

    // Extraer únicos por código
    const map = new Map();
    for (const item of results) {
      const codigo = item.get('servicioSaludCodigo');
      const nombre = item.get('servicioSaludNombre');
      if (codigo && nombre && !map.has(codigo)) {
        map.set(codigo, { codigo, nombre });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener servicios de salud: ${error.message}`);
  }
});

// ===============================================
// FUNCIONES DE PREGUNTAS DE MANTENIMIENTO
// ===============================================

/**
 * Obtiene preguntas de mantenimiento con filtros y paginacion.
 * Requiere accessLevel >= 2 (lectura).
 */
Parse.Cloud.define('getPreguntasMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const {
    dominio,
    tipoMantenimiento,
    clasificacionEquipo,
    categoria,
    activo,
    busqueda,
    limit = 50,
    skip = 0,
  } = request.params || {};

  try {
    const query = new Parse.Query('PreguntaMantenimiento');

    if (dominio) query.equalTo('dominio', dominio);
    if (tipoMantenimiento) query.equalTo('tipoMantenimiento', tipoMantenimiento);
    if (clasificacionEquipo) query.equalTo('clasificacionEquipo', clasificacionEquipo);
    if (categoria) query.equalTo('categoria', categoria);
    if (activo === true || activo === false) query.equalTo('activo', activo);
    if (busqueda && busqueda.trim().length > 0) {
      query.contains('pregunta', busqueda.trim());
    }

    query.ascending('orden');
    query.addAscending('categoria');
    query.addAscending('createdAt');

    const total = await query.count({ useMasterKey: true });

    query.limit(limit);
    query.skip(skip);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        dominio: item.get('dominio'),
        tipoMantenimiento: item.get('tipoMantenimiento'),
        clasificacionEquipo: item.get('clasificacionEquipo'),
        categoria: item.get('categoria'),
        pregunta: item.get('pregunta'),
        descripcion: item.get('descripcion'),
        tipoRespuesta: item.get('tipoRespuesta'),
        opcionesRespuesta: item.get('opcionesRespuesta'),
        requiereFoto: item.get('requiereFoto'),
        requiereObservacion: item.get('requiereObservacion'),
        esCritica: item.get('esCritica'),
        orden: item.get('orden'),
        activo: item.get('activo'),
        referenciaAcreditacion: item.get('referenciaAcreditacion'),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener preguntas: ${error.message}`);
  }
});

/**
 * Obtiene las clasificaciones disponibles que tienen preguntas configuradas.
 * Filtra por dominio y tipoMantenimiento.
 * Retorna lista de clasificaciones con cantidad de preguntas.
 * Requiere accessLevel >= 2.
 */
Parse.Cloud.define('getClasificacionesConPreguntas', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { dominio, tipoMantenimiento } = request.params || {};

  try {
    const query = new Parse.Query('PreguntaMantenimiento');
    query.equalTo('activo', true);
    if (dominio) query.equalTo('dominio', dominio);
    if (tipoMantenimiento) query.equalTo('tipoMantenimiento', tipoMantenimiento);
    query.limit(10000);
    query.select('clasificacionEquipo', 'categoria');

    const results = await query.find({ useMasterKey: true });

    // Agrupar por clasificacionEquipo
    const clasificacionMap = {};
    results.forEach((item) => {
      const clas = item.get('clasificacionEquipo') || 'Sin clasificacion';
      if (!clasificacionMap[clas]) {
        clasificacionMap[clas] = { clasificacion: clas, cantidadPreguntas: 0, categorias: new Set() };
      }
      clasificacionMap[clas].cantidadPreguntas++;
      const cat = item.get('categoria');
      if (cat) clasificacionMap[clas].categorias.add(cat);
    });

    const clasificaciones = Object.values(clasificacionMap).map((c) => ({
      clasificacion: c.clasificacion,
      cantidadPreguntas: c.cantidadPreguntas,
      categorias: Array.from(c.categorias),
    }));

    clasificaciones.sort((a, b) => a.clasificacion.localeCompare(b.clasificacion));

    return { clasificaciones };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener clasificaciones: ${error.message}`);
  }
});

/**
 * Obtiene una pregunta por ID.
 * Requiere accessLevel >= 2.
 */
Parse.Cloud.define('getPreguntaById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID de la pregunta');
  }

  try {
    const query = new Parse.Query('PreguntaMantenimiento');
    const item = await query.get(id, { useMasterKey: true });

    return {
      id: item.id,
      dominio: item.get('dominio'),
      tipoMantenimiento: item.get('tipoMantenimiento'),
      clasificacionEquipo: item.get('clasificacionEquipo'),
      categoria: item.get('categoria'),
      pregunta: item.get('pregunta'),
      descripcion: item.get('descripcion'),
      tipoRespuesta: item.get('tipoRespuesta'),
      opcionesRespuesta: item.get('opcionesRespuesta'),
      requiereFoto: item.get('requiereFoto'),
      requiereObservacion: item.get('requiereObservacion'),
      esCritica: item.get('esCritica'),
      orden: item.get('orden'),
      activo: item.get('activo'),
      referenciaAcreditacion: item.get('referenciaAcreditacion'),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener pregunta: ${error.message}`);
  }
});

/**
 * Crea una nueva pregunta de mantenimiento.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('createPregunta', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { data } = request.params;
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos de la pregunta');
  }

  const validDominios = ['equipoMedico', 'equipoIndustrial', 'infraestructura', 'flotaVehicular'];
  const validTipos = ['preventivo', 'correctivo', 'predictivo'];
  const validRespuestas = ['siNo', 'escala', 'texto', 'seleccion'];

  if (!data.dominio || !validDominios.includes(data.dominio)) {
    throw new Parse.Error(400, 'Dominio invalido');
  }
  if (!data.tipoMantenimiento || !validTipos.includes(data.tipoMantenimiento)) {
    throw new Parse.Error(400, 'Tipo de mantenimiento invalido');
  }
  if (!data.clasificacionEquipo || !data.clasificacionEquipo.trim()) {
    throw new Parse.Error(400, 'Clasificacion de equipo es obligatoria');
  }
  if (!data.categoria || !data.categoria.trim()) {
    throw new Parse.Error(400, 'Categoria es obligatoria');
  }
  if (!data.pregunta || !data.pregunta.trim()) {
    throw new Parse.Error(400, 'La pregunta es obligatoria');
  }
  if (data.tipoRespuesta && !validRespuestas.includes(data.tipoRespuesta)) {
    throw new Parse.Error(400, 'Tipo de respuesta invalido');
  }

  try {
    const PreguntaClass = Parse.Object.extend('PreguntaMantenimiento');
    const pregunta = new PreguntaClass();

    pregunta.set('dominio', data.dominio);
    pregunta.set('tipoMantenimiento', data.tipoMantenimiento);
    pregunta.set('clasificacionEquipo', data.clasificacionEquipo.trim());
    pregunta.set('categoria', data.categoria.trim());
    pregunta.set('pregunta', data.pregunta.trim());
    pregunta.set('descripcion', data.descripcion || '');
    pregunta.set('tipoRespuesta', data.tipoRespuesta || 'siNo');
    pregunta.set('opcionesRespuesta', data.opcionesRespuesta || []);
    pregunta.set('requiereFoto', data.requiereFoto === true);
    pregunta.set('requiereObservacion', data.requiereObservacion === true);
    pregunta.set('esCritica', data.esCritica === true);
    pregunta.set('orden', data.orden || 0);
    pregunta.set('activo', data.activo !== false);
    pregunta.set('referenciaAcreditacion', data.referenciaAcreditacion || '');
    pregunta.set('creadoPor', currentUser.id);

    await pregunta.save(null, { useMasterKey: true });

    return {
      id: pregunta.id,
      dominio: pregunta.get('dominio'),
      tipoMantenimiento: pregunta.get('tipoMantenimiento'),
      clasificacionEquipo: pregunta.get('clasificacionEquipo'),
      categoria: pregunta.get('categoria'),
      pregunta: pregunta.get('pregunta'),
      descripcion: pregunta.get('descripcion'),
      tipoRespuesta: pregunta.get('tipoRespuesta'),
      opcionesRespuesta: pregunta.get('opcionesRespuesta'),
      requiereFoto: pregunta.get('requiereFoto'),
      requiereObservacion: pregunta.get('requiereObservacion'),
      esCritica: pregunta.get('esCritica'),
      orden: pregunta.get('orden'),
      activo: pregunta.get('activo'),
      referenciaAcreditacion: pregunta.get('referenciaAcreditacion'),
      createdAt: pregunta.createdAt,
      updatedAt: pregunta.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al crear pregunta: ${error.message}`);
  }
});

/**
 * Actualiza una pregunta existente.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('updatePregunta', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { id, data } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID de la pregunta');
  }
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos a actualizar');
  }

  try {
    const query = new Parse.Query('PreguntaMantenimiento');
    const pregunta = await query.get(id, { useMasterKey: true });

    const allowedFields = [
      'dominio', 'tipoMantenimiento', 'clasificacionEquipo', 'categoria',
      'pregunta', 'descripcion', 'tipoRespuesta', 'opcionesRespuesta',
      'requiereFoto', 'requiereObservacion', 'esCritica', 'orden',
      'activo', 'referenciaAcreditacion',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        pregunta.set(field, data[field]);
      }
    }
    pregunta.set('modificadoPor', currentUser.id);

    await pregunta.save(null, { useMasterKey: true });

    return {
      id: pregunta.id,
      dominio: pregunta.get('dominio'),
      tipoMantenimiento: pregunta.get('tipoMantenimiento'),
      clasificacionEquipo: pregunta.get('clasificacionEquipo'),
      categoria: pregunta.get('categoria'),
      pregunta: pregunta.get('pregunta'),
      descripcion: pregunta.get('descripcion'),
      tipoRespuesta: pregunta.get('tipoRespuesta'),
      opcionesRespuesta: pregunta.get('opcionesRespuesta'),
      requiereFoto: pregunta.get('requiereFoto'),
      requiereObservacion: pregunta.get('requiereObservacion'),
      esCritica: pregunta.get('esCritica'),
      orden: pregunta.get('orden'),
      activo: pregunta.get('activo'),
      referenciaAcreditacion: pregunta.get('referenciaAcreditacion'),
      createdAt: pregunta.createdAt,
      updatedAt: pregunta.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al actualizar pregunta: ${error.message}`);
  }
});

/**
 * Elimina una pregunta (soft delete por defecto, hard delete opcional).
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('deletePregunta', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { id, hard } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID de la pregunta');
  }

  try {
    const query = new Parse.Query('PreguntaMantenimiento');
    const pregunta = await query.get(id, { useMasterKey: true });

    if (hard === true) {
      await pregunta.destroy({ useMasterKey: true });
    } else {
      pregunta.set('activo', false);
      pregunta.set('modificadoPor', currentUser.id);
      await pregunta.save(null, { useMasterKey: true });
    }

    return { success: true, message: hard ? 'Pregunta eliminada permanentemente' : 'Pregunta desactivada' };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar pregunta: ${error.message}`);
  }
});

/**
 * Alterna el estado activo/inactivo de una pregunta.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('togglePreguntaActivo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID de la pregunta');
  }

  try {
    const query = new Parse.Query('PreguntaMantenimiento');
    const pregunta = await query.get(id, { useMasterKey: true });

    const newActivo = !pregunta.get('activo');
    pregunta.set('activo', newActivo);
    pregunta.set('modificadoPor', currentUser.id);
    await pregunta.save(null, { useMasterKey: true });

    return { activo: newActivo };
  } catch (error) {
    throw new Parse.Error(500, `Error al cambiar estado: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de clasificacionEquipo.
 * Requiere accessLevel >= 2.
 */
Parse.Cloud.define('getClasificacionesEquipo', async (request) => {
  const { dominio } = request.params || {};

  try {
    const query = new Parse.Query('PreguntaMantenimiento');
    if (dominio) query.equalTo('dominio', dominio);
    query.equalTo('activo', true);
    query.select('clasificacionEquipo');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('clasificacionEquipo')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener clasificaciones: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de categoria.
 * No requiere autenticacion (datos de referencia).
 */
Parse.Cloud.define('getCategoriasPreguntas', async (request) => {
  const { dominio, clasificacionEquipo } = request.params || {};

  try {
    const query = new Parse.Query('PreguntaMantenimiento');
    if (dominio) query.equalTo('dominio', dominio);
    if (clasificacionEquipo) query.equalTo('clasificacionEquipo', clasificacionEquipo);
    query.equalTo('activo', true);
    query.select('categoria');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('categoria')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener categorias: ${error.message}`);
  }
});

/**
 * Importacion masiva de preguntas desde un arreglo.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('importarPreguntas', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { preguntas } = request.params;
  if (!preguntas || !Array.isArray(preguntas)) {
    throw new Parse.Error(400, 'Se requiere un arreglo de preguntas');
  }

  const validDominios = ['equipoMedico', 'equipoIndustrial', 'infraestructura', 'flotaVehicular'];
  const validTipos = ['preventivo', 'correctivo', 'predictivo'];

  let created = 0;
  let errors = 0;

  const PreguntaClass = Parse.Object.extend('PreguntaMantenimiento');

  for (const data of preguntas) {
    try {
      if (!data.dominio || !validDominios.includes(data.dominio)) {
        errors++;
        continue;
      }
      if (!data.tipoMantenimiento || !validTipos.includes(data.tipoMantenimiento)) {
        errors++;
        continue;
      }
      if (!data.pregunta || !data.pregunta.trim()) {
        errors++;
        continue;
      }

      const pregunta = new PreguntaClass();
      pregunta.set('dominio', data.dominio);
      pregunta.set('tipoMantenimiento', data.tipoMantenimiento);
      pregunta.set('clasificacionEquipo', (data.clasificacionEquipo || '').trim());
      pregunta.set('categoria', (data.categoria || '').trim());
      pregunta.set('pregunta', data.pregunta.trim());
      pregunta.set('descripcion', data.descripcion || '');
      pregunta.set('tipoRespuesta', data.tipoRespuesta || 'siNo');
      pregunta.set('opcionesRespuesta', data.opcionesRespuesta || []);
      pregunta.set('requiereFoto', data.requiereFoto === true);
      pregunta.set('requiereObservacion', data.requiereObservacion === true);
      pregunta.set('esCritica', data.esCritica === true);
      pregunta.set('orden', data.orden || 0);
      pregunta.set('activo', data.activo !== false);
      pregunta.set('referenciaAcreditacion', data.referenciaAcreditacion || '');
      pregunta.set('creadoPor', currentUser.id);

      await pregunta.save(null, { useMasterKey: true });
      created++;
    } catch (err) {
      errors++;
    }
  }

  return { created, errors, total: preguntas.length };
});

// ===============================================
// FUNCIONES DE INVENTARIO DE EQUIPOS MEDICOS
// ===============================================

/**
 * Obtiene equipos del inventario con filtros y paginacion.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioEquipos', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    servicio,
    clase,
    subclase,
    estado,
    criticoApoyo,
    busqueda,
    activo,
    convenio,
    estadoCumplimiento,
    ultimoMttoDesde,
    ultimoMttoHasta,
    limit = 25,
    skip = 0,
  } = request.params || {};

  // Helper para mapear item a objeto de respuesta
  const mapEquipoItem = (item) => ({
    id: item.id,
    servicio: item.get('servicio'),
    clase: item.get('clase'),
    subclase: item.get('subclase'),
    nombreEquipo: item.get('nombreEquipo'),
    marca: item.get('marca'),
    modelo: item.get('modelo'),
    serie: item.get('serie'),
    inventario: item.get('inventario'),
    valor: item.get('valor'),
    fechaAdquisicion: item.get('fechaAdquisicion'),
    vidaUtil: item.get('vidaUtil'),
    estado: item.get('estado'),
    criticoApoyo: item.get('criticoApoyo'),
    frecuencia: item.get('frecuencia'),
    garantiaInicio: item.get('garantiaInicio'),
    garantiaFinal: item.get('garantiaFinal'),
    fechaBaja: item.get('fechaBaja'),
    pautaAsignada: item.get('pautaAsignada') || '',
    activo: item.get('activo'),
    convenioActivo: item.get('convenioActivo') || false,
    proveedorRut: item.get('proveedorRut') || '',
    proveedorNombre: item.get('proveedorNombre') || '',
    numeroLicitacion: item.get('numeroLicitacion') || '',
    fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
    // Etapa 1 — Cumplimiento de mantenimiento (denormalizados)
    ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
    ultimoRegistroMantenimientoId: item.get('ultimoRegistroMantenimientoId') || '',
    ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
    ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
    proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
    periodosEsperados: item.get('periodosEsperados') || 0,
    periodosCumplidos: item.get('periodosCumplidos') || 0,
    periodosFaltantes: item.get('periodosFaltantes') || 0,
    cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
    estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
    ultimoCalculoCumplimiento: item.get('ultimoCalculoCumplimiento') || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });

  try {
    const query = new Parse.Query('InventarioEquipoMedico');

    if (servicio) query.equalTo('servicio', servicio);
    if (clase) query.equalTo('clase', clase);
    if (subclase) query.equalTo('subclase', subclase);
    if (estado) query.equalTo('estado', estado);
    if (criticoApoyo) query.equalTo('criticoApoyo', criticoApoyo);
    if (activo === true || activo === false) query.equalTo('activo', activo);
    if (convenio === 'con_convenio') query.equalTo('convenioActivo', true);
    if (convenio === 'sin_convenio') query.notEqualTo('convenioActivo', true);
    if (estadoCumplimiento && estadoCumplimiento !== 'todos') {
      query.equalTo('estadoCumplimientoMantenimiento', estadoCumplimiento);
    }
    if (ultimoMttoDesde) query.greaterThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoDesde);
    if (ultimoMttoHasta) query.lessThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoHasta);

    if (busqueda && busqueda.trim().length > 0) {
      // Normalizar: quitar espacios, guiones, puntos, barras y caracteres especiales, lowercase
      const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
      const termRaw = busqueda.trim().toLowerCase();
      const termNorm = normalize(busqueda.trim());

      // Traer todos los equipos con los filtros base y buscar en memoria
      const baseQuery = new Parse.Query('InventarioEquipoMedico');
      if (servicio) baseQuery.equalTo('servicio', servicio);
      if (clase) baseQuery.equalTo('clase', clase);
      if (subclase) baseQuery.equalTo('subclase', subclase);
      if (estado) baseQuery.equalTo('estado', estado);
      if (criticoApoyo) baseQuery.equalTo('criticoApoyo', criticoApoyo);
      if (activo === true || activo === false) baseQuery.equalTo('activo', activo);
      if (convenio === 'con_convenio') baseQuery.equalTo('convenioActivo', true);
      if (convenio === 'sin_convenio') baseQuery.notEqualTo('convenioActivo', true);
      if (estadoCumplimiento && estadoCumplimiento !== 'todos') {
        baseQuery.equalTo('estadoCumplimientoMantenimiento', estadoCumplimiento);
      }
      if (ultimoMttoDesde) baseQuery.greaterThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoDesde);
      if (ultimoMttoHasta) baseQuery.lessThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoHasta);
      baseQuery.ascending('inventario');
      baseQuery.limit(10000);

      const allResults = await baseQuery.find({ useMasterKey: true });

      const filtered = allResults.filter(item => {
        const invRaw = (item.get('inventario') || '').toLowerCase();
        const serRaw = (item.get('serie') || '').toLowerCase();
        const nombreRaw = (item.get('nombreEquipo') || '').toLowerCase();
        const invNorm = normalize(item.get('inventario'));
        const serNorm = normalize(item.get('serie'));
        const nombreNorm = normalize(item.get('nombreEquipo'));

        return invRaw.includes(termRaw) || serRaw.includes(termRaw) || nombreRaw.includes(termRaw)
            || invNorm.includes(termNorm) || serNorm.includes(termNorm) || nombreNorm.includes(termNorm);
      });

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return {
        results: paged.map(mapEquipoItem),
        total,
      };
    }

    query.ascending('inventario');
    query.addAscending('modelo');

    const total = await query.count({ useMasterKey: true });

    query.limit(limit);
    query.skip(skip);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(mapEquipoItem),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener inventario: ${error.message}`);
  }
});

/**
 * Obtiene un equipo del inventario por ID.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioEquipoById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }

  try {
    const query = new Parse.Query('InventarioEquipoMedico');
    const item = await query.get(id, { useMasterKey: true });

    return {
      id: item.id,
      servicio: item.get('servicio'),
      clase: item.get('clase'),
      subclase: item.get('subclase'),
      nombreEquipo: item.get('nombreEquipo'),
      marca: item.get('marca'),
      modelo: item.get('modelo'),
      serie: item.get('serie'),
      inventario: item.get('inventario'),
      valor: item.get('valor'),
      fechaAdquisicion: item.get('fechaAdquisicion'),
      vidaUtil: item.get('vidaUtil'),
      estado: item.get('estado'),
      criticoApoyo: item.get('criticoApoyo'),
      frecuencia: item.get('frecuencia'),
      garantiaInicio: item.get('garantiaInicio'),
      garantiaFinal: item.get('garantiaFinal'),
      fechaBaja: item.get('fechaBaja'),
      pautaAsignada: item.get('pautaAsignada') || '',
      activo: item.get('activo'),
      convenioActivo: item.get('convenioActivo') || false,
      proveedorRut: item.get('proveedorRut') || '',
      proveedorNombre: item.get('proveedorNombre') || '',
      numeroLicitacion: item.get('numeroLicitacion') || '',
      fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
      // Etapa 1 — Cumplimiento de mantenimiento
      ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
      ultimoRegistroMantenimientoId: item.get('ultimoRegistroMantenimientoId') || '',
      ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
      ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
      proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
      periodosEsperados: item.get('periodosEsperados') || 0,
      periodosCumplidos: item.get('periodosCumplidos') || 0,
      periodosFaltantes: item.get('periodosFaltantes') || 0,
      cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
      estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
      ultimoCalculoCumplimiento: item.get('ultimoCalculoCumplimiento') || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener equipo: ${error.message}`);
  }
});

/**
 * Crea un nuevo equipo en el inventario.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('createInventarioEquipo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { data, forzarCrear = false } = request.params;
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos del equipo');
  }
  if (!data.nombreEquipo || !data.nombreEquipo.trim()) {
    throw new Parse.Error(400, 'El nombre del equipo es obligatorio');
  }

  // Etapa 5 (revision-inventarios): detectar duplicado eliminado
  if (!forzarCrear) {
    const dup = await _chequearDuplicadoEliminado('InventarioEquipoMedico', data);
    if (dup) return { duplicateEliminado: dup };
  }

  try {
    const EquipoClass = Parse.Object.extend('InventarioEquipoMedico');
    const equipo = new EquipoClass();

    equipo.set('servicio', (data.servicio || '').trim());
    equipo.set('clase', (data.clase || '').trim());
    equipo.set('subclase', (data.subclase || '').trim());
    equipo.set('nombreEquipo', data.nombreEquipo.trim());
    equipo.set('marca', (data.marca || '').trim());
    equipo.set('modelo', (data.modelo || '').trim());
    equipo.set('serie', (data.serie || '').trim());
    equipo.set('inventario', (data.inventario || '').trim());
    equipo.set('valor', (data.valor || '').trim());
    equipo.set('fechaAdquisicion', data.fechaAdquisicion || '');
    equipo.set('vidaUtil', parseInt(data.vidaUtil) || 0);
    equipo.set('estado', data.estado || 'B');
    equipo.set('criticoApoyo', data.criticoApoyo || 'A');
    equipo.set('frecuencia', parseInt(data.frecuencia) || 0);
    equipo.set('garantiaInicio', data.garantiaInicio || '');
    equipo.set('garantiaFinal', data.garantiaFinal || '');
    equipo.set('fechaBaja', data.fechaBaja || '');
    equipo.set('pautaAsignada', (data.pautaAsignada || '').trim());
    equipo.set('activo', data.activo !== false);
    equipo.set('creadoPor', currentUser.id);

    await equipo.save(null, { useMasterKey: true });

    // Registrar historial de creacion
    const cambiosCreacion = {};
    const camposRegistro = [
      'servicio', 'clase', 'subclase', 'nombreEquipo', 'marca', 'modelo',
      'serie', 'inventario', 'valor', 'fechaAdquisicion', 'vidaUtil',
      'estado', 'criticoApoyo', 'frecuencia', 'garantiaInicio', 'garantiaFinal',
      'fechaBaja', 'pautaAsignada', 'activo',
    ];
    for (const campo of camposRegistro) {
      const val = equipo.get(campo);
      if (val !== undefined && val !== '' && val !== null) {
        cambiosCreacion[campo] = { nuevo: val };
      }
    }
    await registrarHistorial(
      equipo.id,
      'creacion',
      cambiosCreacion,
      `Equipo "${equipo.get('nombreEquipo')}" creado`,
      currentUser,
      null
    );

    return {
      id: equipo.id,
      servicio: equipo.get('servicio'),
      clase: equipo.get('clase'),
      subclase: equipo.get('subclase'),
      nombreEquipo: equipo.get('nombreEquipo'),
      marca: equipo.get('marca'),
      modelo: equipo.get('modelo'),
      serie: equipo.get('serie'),
      inventario: equipo.get('inventario'),
      valor: equipo.get('valor'),
      fechaAdquisicion: equipo.get('fechaAdquisicion'),
      vidaUtil: equipo.get('vidaUtil'),
      estado: equipo.get('estado'),
      criticoApoyo: equipo.get('criticoApoyo'),
      frecuencia: equipo.get('frecuencia'),
      garantiaInicio: equipo.get('garantiaInicio'),
      garantiaFinal: equipo.get('garantiaFinal'),
      fechaBaja: equipo.get('fechaBaja'),
      pautaAsignada: equipo.get('pautaAsignada'),
      activo: equipo.get('activo'),
      createdAt: equipo.createdAt,
      updatedAt: equipo.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al crear equipo: ${error.message}`);
  }
});

/**
 * Actualiza un equipo del inventario.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('updateInventarioEquipo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { id, data } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos a actualizar');
  }

  try {
    const query = new Parse.Query('InventarioEquipoMedico');
    const equipo = await query.get(id, { useMasterKey: true });

    const allowedFields = [
      'servicio', 'clase', 'subclase', 'nombreEquipo', 'marca', 'modelo',
      'serie', 'inventario', 'valor', 'fechaAdquisicion', 'vidaUtil',
      'estado', 'criticoApoyo', 'frecuencia', 'garantiaInicio', 'garantiaFinal',
      'fechaBaja', 'pautaAsignada', 'activo',
    ];

    // Capturar valores anteriores para historial
    const valoresAnteriores = {};
    for (const field of allowedFields) {
      valoresAnteriores[field] = equipo.get(field);
    }

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        equipo.set(field, data[field]);
      }
    }
    equipo.set('modificadoPor', currentUser.id);

    await equipo.save(null, { useMasterKey: true });

    // Detectar cambios y registrar historial
    const cambios = {};
    const descripcionParts = [];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const anterior = valoresAnteriores[field];
        const nuevo = equipo.get(field);
        if (String(anterior) !== String(nuevo)) {
          cambios[field] = { anterior, nuevo };
          descripcionParts.push(`${field} de '${anterior}' a '${nuevo}'`);
        }
      }
    }
    if (Object.keys(cambios).length > 0) {
      const descripcion = `Actualizo ${descripcionParts.join(', ')}`;
      await registrarHistorial(equipo.id, 'actualizacion', cambios, descripcion, currentUser, null);
    }

    return {
      id: equipo.id,
      servicio: equipo.get('servicio'),
      clase: equipo.get('clase'),
      subclase: equipo.get('subclase'),
      nombreEquipo: equipo.get('nombreEquipo'),
      marca: equipo.get('marca'),
      modelo: equipo.get('modelo'),
      serie: equipo.get('serie'),
      inventario: equipo.get('inventario'),
      valor: equipo.get('valor'),
      fechaAdquisicion: equipo.get('fechaAdquisicion'),
      vidaUtil: equipo.get('vidaUtil'),
      estado: equipo.get('estado'),
      criticoApoyo: equipo.get('criticoApoyo'),
      frecuencia: equipo.get('frecuencia'),
      garantiaInicio: equipo.get('garantiaInicio'),
      garantiaFinal: equipo.get('garantiaFinal'),
      fechaBaja: equipo.get('fechaBaja'),
      pautaAsignada: equipo.get('pautaAsignada'),
      activo: equipo.get('activo'),
      createdAt: equipo.createdAt,
      updatedAt: equipo.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al actualizar equipo: ${error.message}`);
  }
});

/**
 * Elimina un equipo del inventario (hard delete).
 * Requiere accessLevel >= 5 (super administrador).
 */
Parse.Cloud.define('deleteInventarioEquipo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  // Etapa 5 (revision-inventarios): soft delete; baja a ADMIN(4)
  if (accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }

  try {
    const query = new Parse.Query('InventarioEquipoMedico');
    const equipo = await query.get(id, { useMasterKey: true });

    // Registrar historial antes de eliminar (soft)
    const datosEquipo = {};
    const campos = [
      'servicio', 'clase', 'subclase', 'nombreEquipo', 'marca', 'modelo',
      'serie', 'inventario', 'valor', 'fechaAdquisicion', 'vidaUtil',
      'estado', 'criticoApoyo', 'frecuencia', 'garantiaInicio', 'garantiaFinal',
      'fechaBaja', 'activo',
    ];
    for (const campo of campos) {
      datosEquipo[campo] = { anterior: equipo.get(campo) };
    }
    await registrarHistorial(
      id,
      'eliminacion',
      datosEquipo,
      `Equipo "${equipo.get('nombreEquipo')}" eliminado (soft)`,
      currentUser,
      null
    );

    // Etapa 5: soft delete — preserva archivos, registros, historial y vinculos
    equipo.set('eliminado', true);
    equipo.set('eliminadoEn', new Date());
    equipo.set('eliminadoPor', currentUser.id);
    await equipo.save(null, { useMasterKey: true });
    return { success: true, softDelete: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar equipo: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de servicio del inventario.
 * No requiere autenticacion (datos de referencia).
 */
Parse.Cloud.define('getInventarioServicios', async (request) => {
  try {
    const query = new Parse.Query('InventarioEquipoMedico');
    query.select('servicio');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('servicio')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener servicios: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de clase del inventario.
 * No requiere autenticacion (datos de referencia).
 */
Parse.Cloud.define('getInventarioClases', async (request) => {
  try {
    const query = new Parse.Query('InventarioEquipoMedico');
    query.select('clase');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('clase')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener clases: ${error.message}`);
  }
});

/**
 * Importacion masiva de equipos desde un arreglo.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('importarInventarioEquipos', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { items } = request.params;
  if (!items || !Array.isArray(items)) {
    throw new Parse.Error(400, 'Se requiere un arreglo de equipos');
  }

  let created = 0;
  let errors = 0;

  const EquipoClass = Parse.Object.extend('InventarioEquipoMedico');

  for (const data of items) {
    try {
      if (!data.nombreEquipo || !String(data.nombreEquipo).trim()) {
        errors++;
        continue;
      }

      const equipo = new EquipoClass();
      equipo.set('servicio', (data.servicio || '').trim());
      equipo.set('clase', (data.clase || '').trim());
      equipo.set('subclase', (data.subclase || '').trim());
      equipo.set('nombreEquipo', String(data.nombreEquipo).trim());
      equipo.set('marca', (data.marca || '').trim());
      equipo.set('modelo', (data.modelo || '').trim());
      equipo.set('serie', String(data.serie || '').trim());
      equipo.set('inventario', String(data.inventario || '').trim());
      equipo.set('valor', String(data.valor || '').trim());
      equipo.set('fechaAdquisicion', data.fechaAdquisicion || '');
      equipo.set('vidaUtil', parseInt(data.vidaUtil) || 0);
      equipo.set('estado', data.estado || 'B');
      equipo.set('criticoApoyo', data.criticoApoyo || 'A');
      equipo.set('frecuencia', parseInt(data.frecuencia) || 0);
      equipo.set('garantiaInicio', data.garantiaInicio || '');
      equipo.set('garantiaFinal', data.garantiaFinal || '');
      equipo.set('fechaBaja', data.fechaBaja || '');
      equipo.set('activo', data.activo !== false);
      equipo.set('creadoPor', currentUser.id);

      await equipo.save(null, { useMasterKey: true });
      created++;
    } catch (err) {
      errors++;
    }
  }

  return { created, errors, total: items.length };
});

/**
 * Exporta todos los equipos que coincidan con los filtros (sin paginacion).
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('exportarInventarioEquipos', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    servicio,
    clase,
    subclase,
    estado,
    criticoApoyo,
    busqueda,
    convenio,
  } = request.params || {};

  const mapExportItem = (item) => ({
    id: item.id,
    servicio: item.get('servicio'),
    clase: item.get('clase'),
    subclase: item.get('subclase'),
    nombreEquipo: item.get('nombreEquipo'),
    marca: item.get('marca'),
    modelo: item.get('modelo'),
    serie: item.get('serie'),
    inventario: item.get('inventario'),
    valor: item.get('valor'),
    fechaAdquisicion: item.get('fechaAdquisicion'),
    vidaUtil: item.get('vidaUtil'),
    estado: item.get('estado'),
    criticoApoyo: item.get('criticoApoyo'),
    frecuencia: item.get('frecuencia'),
    garantiaInicio: item.get('garantiaInicio'),
    garantiaFinal: item.get('garantiaFinal'),
    fechaBaja: item.get('fechaBaja'),
    activo: item.get('activo'),
    convenioActivo: item.get('convenioActivo') || false,
    proveedorRut: item.get('proveedorRut') || '',
    proveedorNombre: item.get('proveedorNombre') || '',
    numeroLicitacion: item.get('numeroLicitacion') || '',
    fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
    // Etapa 1 — Cumplimiento de mantenimiento
    ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
    ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
    ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
    proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
    periodosEsperados: item.get('periodosEsperados') || 0,
    periodosCumplidos: item.get('periodosCumplidos') || 0,
    periodosFaltantes: item.get('periodosFaltantes') || 0,
    cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
    estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });

  try {
    const query = new Parse.Query('InventarioEquipoMedico');

    if (servicio) query.equalTo('servicio', servicio);
    if (clase) query.equalTo('clase', clase);
    if (subclase) query.equalTo('subclase', subclase);
    if (estado) query.equalTo('estado', estado);
    if (criticoApoyo) query.equalTo('criticoApoyo', criticoApoyo);
    if (convenio === 'con_convenio') query.equalTo('convenioActivo', true);
    if (convenio === 'sin_convenio') query.notEqualTo('convenioActivo', true);
    if (busqueda && busqueda.trim().length > 0) {
      const term = busqueda.trim();
      const qInv = new Parse.Query('InventarioEquipoMedico');
      qInv.contains('inventario', term);
      const qMod = new Parse.Query('InventarioEquipoMedico');
      qMod.contains('modelo', term);
      const orQ = Parse.Query.or(qInv, qMod);
      if (servicio) orQ.equalTo('servicio', servicio);
      if (clase) orQ.equalTo('clase', clase);
      if (subclase) orQ.equalTo('subclase', subclase);
      if (estado) orQ.equalTo('estado', estado);
      if (criticoApoyo) orQ.equalTo('criticoApoyo', criticoApoyo);
      if (convenio === 'con_convenio') orQ.equalTo('convenioActivo', true);
      if (convenio === 'sin_convenio') orQ.notEqualTo('convenioActivo', true);
      orQ.ascending('inventario');
      orQ.limit(10000);
      const results = await orQ.find({ useMasterKey: true });
      return { results: results.map(mapExportItem) };
    }

    query.ascending('inventario');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(mapExportItem),
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al exportar inventario: ${error.message}`);
  }
});

// ===============================================
// FUNCIONES DE HISTORIAL E INVENTARIO — ARCHIVOS
// ===============================================

/**
 * Funcion auxiliar para registrar historial de cambios en InventarioHistorial.
 */
async function registrarHistorial(equipoId, accion, cambios, descripcion, user, archivoInfo) {
  try {
    const HistorialClass = Parse.Object.extend('InventarioHistorial');
    const historial = new HistorialClass();
    historial.set('equipoId', equipoId);
    historial.set('accion', accion);
    historial.set('cambios', cambios || {});
    historial.set('descripcion', descripcion);
    historial.set('usuarioId', user ? user.id : '');
    historial.set('usuarioNombre', user ? (user.get('displayName') || user.get('nombre') || user.getUsername()) : 'Sistema');
    if (archivoInfo) {
      if (archivoInfo.nombre) historial.set('archivoNombre', archivoInfo.nombre);
      if (archivoInfo.url) historial.set('archivoUrl', archivoInfo.url);
    }
    await historial.save(null, { useMasterKey: true });
    return historial;
  } catch (error) {
    console.error('Error registrando historial:', error.message);
  }
}

/**
 * Obtiene el historial de cambios de un equipo.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioHistorial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { equipoId, limit = 20, skip = 0 } = request.params;
  if (!equipoId) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }

  try {
    // Etapa 6 (revision-inventarios): incluir historial de versiones previas
    // del mismo activo (huerfanos por identidad serie/inventario).
    const ids = await _resolverIdsActivoPorIdentidad('InventarioEquipoMedico', equipoId);

    const query = new Parse.Query('InventarioHistorial');
    if (ids.length === 1) query.equalTo('equipoId', ids[0]);
    else query.containedIn('equipoId', ids);
    query.descending('createdAt');
    query.limit(limit);
    query.skip(skip);

    const total = await query.count({ useMasterKey: true });
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        equipoId: item.get('equipoId'),
        accion: item.get('accion'),
        cambios: item.get('cambios'),
        descripcion: item.get('descripcion'),
        usuarioId: item.get('usuarioId'),
        usuarioNombre: item.get('usuarioNombre'),
        archivoNombre: item.get('archivoNombre'),
        archivoUrl: item.get('archivoUrl'),
        createdAt: item.createdAt,
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener historial: ${error.message}`);
  }
});

/**
 * Adjunta un archivo a un equipo del inventario.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('adjuntarArchivoInventario', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { equipoId, fileName, fileUrl, categoria } = request.params;
  if (!equipoId || !fileName || !fileUrl) {
    throw new Parse.Error(400, 'Se requieren equipoId, fileName y fileUrl');
  }

  try {
    const query = new Parse.Query('InventarioEquipoMedico');
    const equipo = await query.get(equipoId, { useMasterKey: true });

    const archivoData = {
      nombre: fileName,
      url: fileUrl,
      tipo: fileName.split('.').pop() || 'desconocido',
      categoria: categoria || 'otro',
      subidoPor: currentUser.get('displayName') || currentUser.get('nombre') || currentUser.getUsername(),
      fecha: new Date().toISOString(),
    };

    const archivos = equipo.get('archivos') || [];
    archivos.push(archivoData);
    equipo.set('archivos', archivos);
    await equipo.save(null, { useMasterKey: true });

    // Registrar en historial
    const categoriaLabels = {
      adquisicion: 'Acta de adquisición',
      baja: 'Acta de baja',
      garantia: 'Garantía',
      manual: 'Manual técnico',
      calibracion: 'Certificado de calibración',
      mantencion: 'Informe de mantención',
      otro: 'Otro',
    };
    const catLabel = categoriaLabels[categoria] || categoria || 'Otro';
    await registrarHistorial(
      equipoId,
      'archivo_adjunto',
      {},
      `Archivo "${fileName}" adjuntado (${catLabel})`,
      currentUser,
      { nombre: fileName, url: fileUrl }
    );

    return archivoData;
  } catch (error) {
    throw new Parse.Error(500, `Error al adjuntar archivo: ${error.message}`);
  }
});

/**
 * Elimina un archivo adjunto de un equipo del inventario.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('eliminarArchivoInventario', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { equipoId, fileName, fileUrl } = request.params;
  if (!equipoId || !fileName) {
    throw new Parse.Error(400, 'Se requieren equipoId y fileName');
  }

  try {
    const query = new Parse.Query('InventarioEquipoMedico');
    const equipo = await query.get(equipoId, { useMasterKey: true });

    const archivos = equipo.get('archivos') || [];
    const nuevosArchivos = archivos.filter(
      (a) => !(a.nombre === fileName && a.url === fileUrl)
    );
    equipo.set('archivos', nuevosArchivos);
    await equipo.save(null, { useMasterKey: true });

    // Registrar en historial
    await registrarHistorial(
      equipoId,
      'archivo_eliminado',
      {},
      `Archivo "${fileName}" eliminado`,
      currentUser,
      { nombre: fileName, url: fileUrl }
    );

    return { success: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar archivo: ${error.message}`);
  }
});

/**
 * Obtiene los archivos adjuntos de un equipo.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getArchivosInventario', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { equipoId } = request.params;
  if (!equipoId) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }

  try {
    const query = new Parse.Query('InventarioEquipoMedico');
    const equipo = await query.get(equipoId, { useMasterKey: true });
    return equipo.get('archivos') || [];
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener archivos: ${error.message}`);
  }
});

// ===============================================
// FUNCIONES DE INVENTARIO DE EQUIPOS INDUSTRIALES
// ===============================================

/**
 * Funcion auxiliar para registrar historial de cambios en InventarioIndustrialHistorial.
 */
async function registrarHistorialIndustrial(equipoId, accion, cambios, descripcion, user, archivoInfo) {
  try {
    const HistorialClass = Parse.Object.extend('InventarioIndustrialHistorial');
    const historial = new HistorialClass();
    historial.set('equipoId', equipoId);
    historial.set('accion', accion);
    historial.set('cambios', cambios || {});
    historial.set('descripcion', descripcion);
    historial.set('usuarioId', user ? user.id : '');
    historial.set('usuarioNombre', user ? (user.get('displayName') || user.get('nombre') || user.getUsername()) : 'Sistema');
    if (archivoInfo) {
      if (archivoInfo.nombre) historial.set('archivoNombre', archivoInfo.nombre);
      if (archivoInfo.url) historial.set('archivoUrl', archivoInfo.url);
    }
    await historial.save(null, { useMasterKey: true });
    return historial;
  } catch (error) {
    console.error('Error registrando historial industrial:', error.message);
  }
}

/**
 * Obtiene equipos industriales del inventario con filtros y paginacion.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    ubicacion,
    tipoEquipo,
    estado,
    criticidad,
    busqueda,
    activo,
    convenio,
    estadoCumplimiento,
    ultimoMttoDesde,
    ultimoMttoHasta,
    limit = 25,
    skip = 0,
  } = request.params || {};

  const mapIndustrialItem = (item) => ({
    id: item.id,
    ubicacion: item.get('ubicacion'),
    tipoEquipo: item.get('tipoEquipo'),
    nombreEquipo: item.get('nombreEquipo'),
    marca: item.get('marca'),
    modelo: item.get('modelo'),
    serie: item.get('serie'),
    inventario: item.get('inventario'),
    capacidad: item.get('capacidad'),
    combustible: item.get('combustible'),
    fechaInstalacion: item.get('fechaInstalacion'),
    vidaUtil: item.get('vidaUtil'),
    estado: item.get('estado'),
    criticidad: item.get('criticidad'),
    frecuencia: item.get('frecuencia'),
    garantiaInicio: item.get('garantiaInicio'),
    garantiaFinal: item.get('garantiaFinal'),
    fechaBaja: item.get('fechaBaja'),
    pautaAsignada: item.get('pautaAsignada') || '',
    requiereAutorizacion: item.get('requiereAutorizacion'),
    activo: item.get('activo'),
    convenioActivo: item.get('convenioActivo') || false,
    proveedorRut: item.get('proveedorRut') || '',
    proveedorNombre: item.get('proveedorNombre') || '',
    numeroLicitacion: item.get('numeroLicitacion') || '',
    fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
    // Etapa 1 — Cumplimiento de mantenimiento
    ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
    ultimoRegistroMantenimientoId: item.get('ultimoRegistroMantenimientoId') || '',
    ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
    ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
    proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
    periodosEsperados: item.get('periodosEsperados') || 0,
    periodosCumplidos: item.get('periodosCumplidos') || 0,
    periodosFaltantes: item.get('periodosFaltantes') || 0,
    cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
    estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
    ultimoCalculoCumplimiento: item.get('ultimoCalculoCumplimiento') || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });

  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');

    if (ubicacion) query.equalTo('ubicacion', ubicacion);
    if (tipoEquipo) query.equalTo('tipoEquipo', tipoEquipo);
    if (estado) query.equalTo('estado', estado);
    if (criticidad) query.equalTo('criticidad', criticidad);
    if (activo === true || activo === false) query.equalTo('activo', activo);
    if (convenio === 'con_convenio') query.equalTo('convenioActivo', true);
    if (convenio === 'sin_convenio') query.notEqualTo('convenioActivo', true);
    if (estadoCumplimiento && estadoCumplimiento !== 'todos') {
      query.equalTo('estadoCumplimientoMantenimiento', estadoCumplimiento);
    }
    if (ultimoMttoDesde) query.greaterThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoDesde);
    if (ultimoMttoHasta) query.lessThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoHasta);

    if (busqueda && busqueda.trim().length > 0) {
      const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
      const termRaw = busqueda.trim().toLowerCase();
      const termNorm = normalize(busqueda.trim());

      const baseQuery = new Parse.Query('InventarioEquipoIndustrial');
      if (ubicacion) baseQuery.equalTo('ubicacion', ubicacion);
      if (tipoEquipo) baseQuery.equalTo('tipoEquipo', tipoEquipo);
      if (estado) baseQuery.equalTo('estado', estado);
      if (criticidad) baseQuery.equalTo('criticidad', criticidad);
      if (activo === true || activo === false) baseQuery.equalTo('activo', activo);
      if (convenio === 'con_convenio') baseQuery.equalTo('convenioActivo', true);
      if (convenio === 'sin_convenio') baseQuery.notEqualTo('convenioActivo', true);
      if (estadoCumplimiento && estadoCumplimiento !== 'todos') {
        baseQuery.equalTo('estadoCumplimientoMantenimiento', estadoCumplimiento);
      }
      if (ultimoMttoDesde) baseQuery.greaterThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoDesde);
      if (ultimoMttoHasta) baseQuery.lessThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoHasta);
      baseQuery.ascending('inventario');
      baseQuery.limit(10000);

      const allResults = await baseQuery.find({ useMasterKey: true });

      const filtered = allResults.filter(item => {
        const invRaw = (item.get('inventario') || '').toLowerCase();
        const serRaw = (item.get('serie') || '').toLowerCase();
        const nombreRaw = (item.get('nombreEquipo') || '').toLowerCase();
        const invNorm = normalize(item.get('inventario'));
        const serNorm = normalize(item.get('serie'));
        const nombreNorm = normalize(item.get('nombreEquipo'));

        return invRaw.includes(termRaw) || serRaw.includes(termRaw) || nombreRaw.includes(termRaw)
            || invNorm.includes(termNorm) || serNorm.includes(termNorm) || nombreNorm.includes(termNorm);
      });

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return {
        results: paged.map(mapIndustrialItem),
        total,
      };
    }

    query.ascending('inventario');
    query.addAscending('nombreEquipo');

    const total = await query.count({ useMasterKey: true });

    query.limit(limit);
    query.skip(skip);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(mapIndustrialItem),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener inventario industrial: ${error.message}`);
  }
});

/**
 * Obtiene un equipo industrial del inventario por ID.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioIndustrialById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }

  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');
    const item = await query.get(id, { useMasterKey: true });

    return {
      id: item.id,
      ubicacion: item.get('ubicacion'),
      tipoEquipo: item.get('tipoEquipo'),
      nombreEquipo: item.get('nombreEquipo'),
      marca: item.get('marca'),
      modelo: item.get('modelo'),
      serie: item.get('serie'),
      inventario: item.get('inventario'),
      capacidad: item.get('capacidad'),
      combustible: item.get('combustible'),
      fechaInstalacion: item.get('fechaInstalacion'),
      vidaUtil: item.get('vidaUtil'),
      estado: item.get('estado'),
      criticidad: item.get('criticidad'),
      frecuencia: item.get('frecuencia'),
      garantiaInicio: item.get('garantiaInicio'),
      garantiaFinal: item.get('garantiaFinal'),
      fechaBaja: item.get('fechaBaja'),
      pautaAsignada: item.get('pautaAsignada') || '',
      requiereAutorizacion: item.get('requiereAutorizacion'),
      activo: item.get('activo'),
      convenioActivo: item.get('convenioActivo') || false,
      proveedorRut: item.get('proveedorRut') || '',
      proveedorNombre: item.get('proveedorNombre') || '',
      numeroLicitacion: item.get('numeroLicitacion') || '',
      fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
      // Etapa 1 — Cumplimiento de mantenimiento
      ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
      ultimoRegistroMantenimientoId: item.get('ultimoRegistroMantenimientoId') || '',
      ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
      ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
      proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
      periodosEsperados: item.get('periodosEsperados') || 0,
      periodosCumplidos: item.get('periodosCumplidos') || 0,
      periodosFaltantes: item.get('periodosFaltantes') || 0,
      cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
      estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
      ultimoCalculoCumplimiento: item.get('ultimoCalculoCumplimiento') || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener equipo industrial: ${error.message}`);
  }
});

/**
 * Crea un nuevo equipo industrial en el inventario.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('createInventarioIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { data, forzarCrear = false } = request.params;
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos del equipo');
  }
  if (!data.nombreEquipo || !data.nombreEquipo.trim()) {
    throw new Parse.Error(400, 'El nombre del equipo es obligatorio');
  }

  // Etapa 5 (revision-inventarios): detectar duplicado eliminado
  if (!forzarCrear) {
    const dup = await _chequearDuplicadoEliminado('InventarioEquipoIndustrial', data);
    if (dup) return { duplicateEliminado: dup };
  }

  try {
    const EquipoClass = Parse.Object.extend('InventarioEquipoIndustrial');
    const equipo = new EquipoClass();

    equipo.set('ubicacion', (data.ubicacion || '').trim());
    equipo.set('tipoEquipo', (data.tipoEquipo || '').trim());
    equipo.set('nombreEquipo', data.nombreEquipo.trim());
    equipo.set('marca', (data.marca || '').trim());
    equipo.set('modelo', (data.modelo || '').trim());
    equipo.set('serie', (data.serie || '').trim());
    equipo.set('inventario', (data.inventario || '').trim());
    equipo.set('capacidad', (data.capacidad || '').trim());
    equipo.set('combustible', data.combustible || 'N/A');
    equipo.set('fechaInstalacion', data.fechaInstalacion || '');
    equipo.set('vidaUtil', parseInt(data.vidaUtil) || 0);
    equipo.set('estado', data.estado || 'B');
    equipo.set('criticidad', data.criticidad || 'Media');
    equipo.set('frecuencia', parseInt(data.frecuencia) || 6);
    equipo.set('garantiaInicio', data.garantiaInicio || '');
    equipo.set('garantiaFinal', data.garantiaFinal || '');
    equipo.set('fechaBaja', data.fechaBaja || '');
    equipo.set('pautaAsignada', (data.pautaAsignada || '').trim());
    equipo.set('requiereAutorizacion', data.requiereAutorizacion === true);
    equipo.set('activo', data.activo !== false);
    equipo.set('archivos', []);
    equipo.set('creadoPor', currentUser.id);

    await equipo.save(null, { useMasterKey: true });

    // Registrar historial de creacion
    const cambiosCreacion = {};
    const camposRegistro = [
      'ubicacion', 'tipoEquipo', 'nombreEquipo', 'marca', 'modelo',
      'serie', 'inventario', 'capacidad', 'combustible', 'fechaInstalacion', 'vidaUtil',
      'estado', 'criticidad', 'frecuencia', 'garantiaInicio', 'garantiaFinal',
      'fechaBaja', 'pautaAsignada', 'requiereAutorizacion', 'activo',
    ];
    for (const campo of camposRegistro) {
      const val = equipo.get(campo);
      if (val !== undefined && val !== '' && val !== null) {
        cambiosCreacion[campo] = { nuevo: val };
      }
    }
    await registrarHistorialIndustrial(
      equipo.id,
      'creacion',
      cambiosCreacion,
      `Equipo industrial "${equipo.get('nombreEquipo')}" creado`,
      currentUser,
      null
    );

    return {
      id: equipo.id,
      ubicacion: equipo.get('ubicacion'),
      tipoEquipo: equipo.get('tipoEquipo'),
      nombreEquipo: equipo.get('nombreEquipo'),
      marca: equipo.get('marca'),
      modelo: equipo.get('modelo'),
      serie: equipo.get('serie'),
      inventario: equipo.get('inventario'),
      capacidad: equipo.get('capacidad'),
      combustible: equipo.get('combustible'),
      fechaInstalacion: equipo.get('fechaInstalacion'),
      vidaUtil: equipo.get('vidaUtil'),
      estado: equipo.get('estado'),
      criticidad: equipo.get('criticidad'),
      frecuencia: equipo.get('frecuencia'),
      garantiaInicio: equipo.get('garantiaInicio'),
      garantiaFinal: equipo.get('garantiaFinal'),
      fechaBaja: equipo.get('fechaBaja'),
      pautaAsignada: equipo.get('pautaAsignada'),
      requiereAutorizacion: equipo.get('requiereAutorizacion'),
      activo: equipo.get('activo'),
      createdAt: equipo.createdAt,
      updatedAt: equipo.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al crear equipo industrial: ${error.message}`);
  }
});

/**
 * Actualiza un equipo industrial del inventario.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('updateInventarioIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { id, data } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos a actualizar');
  }

  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');
    const equipo = await query.get(id, { useMasterKey: true });

    const allowedFields = [
      'ubicacion', 'tipoEquipo', 'nombreEquipo', 'marca', 'modelo',
      'serie', 'inventario', 'capacidad', 'combustible', 'fechaInstalacion', 'vidaUtil',
      'estado', 'criticidad', 'frecuencia', 'garantiaInicio', 'garantiaFinal',
      'fechaBaja', 'pautaAsignada', 'requiereAutorizacion', 'activo',
    ];

    // Capturar valores anteriores para historial
    const valoresAnteriores = {};
    for (const field of allowedFields) {
      valoresAnteriores[field] = equipo.get(field);
    }

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        equipo.set(field, data[field]);
      }
    }
    equipo.set('modificadoPor', currentUser.id);

    await equipo.save(null, { useMasterKey: true });

    // Detectar cambios y registrar historial
    const cambios = {};
    const descripcionParts = [];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const anterior = valoresAnteriores[field];
        const nuevo = equipo.get(field);
        if (String(anterior) !== String(nuevo)) {
          cambios[field] = { anterior, nuevo };
          descripcionParts.push(`${field} de '${anterior}' a '${nuevo}'`);
        }
      }
    }
    if (Object.keys(cambios).length > 0) {
      const descripcion = `Actualizo ${descripcionParts.join(', ')}`;
      await registrarHistorialIndustrial(equipo.id, 'actualizacion', cambios, descripcion, currentUser, null);
    }

    return {
      id: equipo.id,
      ubicacion: equipo.get('ubicacion'),
      tipoEquipo: equipo.get('tipoEquipo'),
      nombreEquipo: equipo.get('nombreEquipo'),
      marca: equipo.get('marca'),
      modelo: equipo.get('modelo'),
      serie: equipo.get('serie'),
      inventario: equipo.get('inventario'),
      capacidad: equipo.get('capacidad'),
      combustible: equipo.get('combustible'),
      fechaInstalacion: equipo.get('fechaInstalacion'),
      vidaUtil: equipo.get('vidaUtil'),
      estado: equipo.get('estado'),
      criticidad: equipo.get('criticidad'),
      frecuencia: equipo.get('frecuencia'),
      garantiaInicio: equipo.get('garantiaInicio'),
      garantiaFinal: equipo.get('garantiaFinal'),
      fechaBaja: equipo.get('fechaBaja'),
      pautaAsignada: equipo.get('pautaAsignada'),
      requiereAutorizacion: equipo.get('requiereAutorizacion'),
      activo: equipo.get('activo'),
      createdAt: equipo.createdAt,
      updatedAt: equipo.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al actualizar equipo industrial: ${error.message}`);
  }
});

/**
 * Elimina un equipo industrial del inventario (hard delete).
 * Requiere accessLevel >= 5 (super administrador).
 */
Parse.Cloud.define('deleteInventarioIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  // Etapa 5 (revision-inventarios): soft delete; baja a ADMIN(4)
  if (accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }

  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');
    const equipo = await query.get(id, { useMasterKey: true });

    const datosEquipo = {};
    const campos = [
      'ubicacion', 'tipoEquipo', 'nombreEquipo', 'marca', 'modelo',
      'serie', 'inventario', 'capacidad', 'combustible', 'fechaInstalacion', 'vidaUtil',
      'estado', 'criticidad', 'frecuencia', 'garantiaInicio', 'garantiaFinal',
      'fechaBaja', 'requiereAutorizacion', 'activo',
    ];
    for (const campo of campos) {
      datosEquipo[campo] = { anterior: equipo.get(campo) };
    }
    await registrarHistorialIndustrial(
      id,
      'eliminacion',
      datosEquipo,
      `Equipo industrial "${equipo.get('nombreEquipo')}" eliminado (soft)`,
      currentUser,
      null
    );

    equipo.set('eliminado', true);
    equipo.set('eliminadoEn', new Date());
    equipo.set('eliminadoPor', currentUser.id);
    await equipo.save(null, { useMasterKey: true });
    return { success: true, softDelete: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar equipo industrial: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de ubicacion del inventario industrial.
 */
Parse.Cloud.define('getInventarioIndustrialUbicaciones', async (request) => {
  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');
    query.select('ubicacion');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('ubicacion')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener ubicaciones: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de tipoEquipo del inventario industrial.
 */
Parse.Cloud.define('getInventarioIndustrialTipos', async (request) => {
  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');
    query.select('tipoEquipo');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('tipoEquipo')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener tipos de equipo: ${error.message}`);
  }
});

/**
 * Importacion masiva de equipos industriales desde un arreglo.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('importarInventarioIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { items } = request.params;
  if (!items || !Array.isArray(items)) {
    throw new Parse.Error(400, 'Se requiere un arreglo de equipos');
  }

  let created = 0;
  let errors = 0;

  const EquipoClass = Parse.Object.extend('InventarioEquipoIndustrial');

  for (const data of items) {
    try {
      if (!data.nombreEquipo || !String(data.nombreEquipo).trim()) {
        errors++;
        continue;
      }

      const equipo = new EquipoClass();
      equipo.set('ubicacion', (data.ubicacion || '').trim());
      equipo.set('tipoEquipo', (data.tipoEquipo || '').trim());
      equipo.set('nombreEquipo', String(data.nombreEquipo).trim());
      equipo.set('marca', (data.marca || '').trim());
      equipo.set('modelo', (data.modelo || '').trim());
      equipo.set('serie', String(data.serie || '').trim());
      equipo.set('inventario', String(data.inventario || '').trim());
      equipo.set('capacidad', (data.capacidad || '').trim());
      equipo.set('combustible', data.combustible || 'N/A');
      equipo.set('fechaInstalacion', data.fechaInstalacion || '');
      equipo.set('vidaUtil', parseInt(data.vidaUtil) || 0);
      equipo.set('estado', data.estado || 'B');
      equipo.set('criticidad', data.criticidad || 'Media');
      equipo.set('frecuencia', parseInt(data.frecuencia) || 6);
      equipo.set('garantiaInicio', data.garantiaInicio || '');
      equipo.set('garantiaFinal', data.garantiaFinal || '');
      equipo.set('fechaBaja', data.fechaBaja || '');
      equipo.set('requiereAutorizacion', data.requiereAutorizacion === true);
      equipo.set('activo', data.activo !== false);
      equipo.set('archivos', []);
      equipo.set('creadoPor', currentUser.id);

      await equipo.save(null, { useMasterKey: true });
      created++;
    } catch (err) {
      errors++;
    }
  }

  return { created, errors, total: items.length };
});

/**
 * Exporta todos los equipos industriales que coincidan con los filtros (sin paginacion).
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('exportarInventarioIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    ubicacion,
    tipoEquipo,
    estado,
    criticidad,
    busqueda,
    convenio,
  } = request.params || {};

  const mapExportIndustrial = (item) => ({
    id: item.id,
    ubicacion: item.get('ubicacion'),
    tipoEquipo: item.get('tipoEquipo'),
    nombreEquipo: item.get('nombreEquipo'),
    marca: item.get('marca'),
    modelo: item.get('modelo'),
    serie: item.get('serie'),
    inventario: item.get('inventario'),
    capacidad: item.get('capacidad'),
    combustible: item.get('combustible'),
    fechaInstalacion: item.get('fechaInstalacion'),
    vidaUtil: item.get('vidaUtil'),
    estado: item.get('estado'),
    criticidad: item.get('criticidad'),
    frecuencia: item.get('frecuencia'),
    garantiaInicio: item.get('garantiaInicio'),
    garantiaFinal: item.get('garantiaFinal'),
    fechaBaja: item.get('fechaBaja'),
    requiereAutorizacion: item.get('requiereAutorizacion'),
    activo: item.get('activo'),
    convenioActivo: item.get('convenioActivo') || false,
    proveedorRut: item.get('proveedorRut') || '',
    proveedorNombre: item.get('proveedorNombre') || '',
    numeroLicitacion: item.get('numeroLicitacion') || '',
    fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
    // Etapa 1 — Cumplimiento de mantenimiento
    ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
    ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
    ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
    proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
    periodosEsperados: item.get('periodosEsperados') || 0,
    periodosCumplidos: item.get('periodosCumplidos') || 0,
    periodosFaltantes: item.get('periodosFaltantes') || 0,
    cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
    estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });

  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');

    if (ubicacion) query.equalTo('ubicacion', ubicacion);
    if (tipoEquipo) query.equalTo('tipoEquipo', tipoEquipo);
    if (estado) query.equalTo('estado', estado);
    if (criticidad) query.equalTo('criticidad', criticidad);
    if (convenio === 'con_convenio') query.equalTo('convenioActivo', true);
    if (convenio === 'sin_convenio') query.notEqualTo('convenioActivo', true);
    if (busqueda && busqueda.trim().length > 0) {
      const term = busqueda.trim();
      const qInv = new Parse.Query('InventarioEquipoIndustrial');
      qInv.contains('inventario', term);
      const qSer = new Parse.Query('InventarioEquipoIndustrial');
      qSer.contains('serie', term);
      const qNom = new Parse.Query('InventarioEquipoIndustrial');
      qNom.contains('nombreEquipo', term);
      const orQ = Parse.Query.or(qInv, qSer, qNom);
      if (ubicacion) orQ.equalTo('ubicacion', ubicacion);
      if (tipoEquipo) orQ.equalTo('tipoEquipo', tipoEquipo);
      if (estado) orQ.equalTo('estado', estado);
      if (criticidad) orQ.equalTo('criticidad', criticidad);
      if (convenio === 'con_convenio') orQ.equalTo('convenioActivo', true);
      if (convenio === 'sin_convenio') orQ.notEqualTo('convenioActivo', true);
      orQ.ascending('inventario');
      orQ.limit(10000);
      const results = await orQ.find({ useMasterKey: true });
      return { results: results.map(mapExportIndustrial) };
    }

    query.ascending('inventario');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(mapExportIndustrial),
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al exportar inventario industrial: ${error.message}`);
  }
});

/**
 * Obtiene el historial de cambios de un equipo industrial.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioIndustrialHistorial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { equipoId, limit = 20, skip = 0 } = request.params;
  if (!equipoId) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }

  try {
    // Etapa 6: incluir historial de versiones previas (identidad de negocio)
    const ids = await _resolverIdsActivoPorIdentidad('InventarioEquipoIndustrial', equipoId);

    const query = new Parse.Query('InventarioIndustrialHistorial');
    if (ids.length === 1) query.equalTo('equipoId', ids[0]);
    else query.containedIn('equipoId', ids);
    query.descending('createdAt');
    query.limit(limit);
    query.skip(skip);

    const total = await query.count({ useMasterKey: true });
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        equipoId: item.get('equipoId'),
        accion: item.get('accion'),
        cambios: item.get('cambios'),
        descripcion: item.get('descripcion'),
        usuarioId: item.get('usuarioId'),
        usuarioNombre: item.get('usuarioNombre'),
        archivoNombre: item.get('archivoNombre'),
        archivoUrl: item.get('archivoUrl'),
        createdAt: item.createdAt,
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener historial industrial: ${error.message}`);
  }
});

/**
 * Adjunta un archivo a un equipo industrial del inventario.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('adjuntarArchivoIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { equipoId, fileName, fileUrl, categoria } = request.params;
  if (!equipoId || !fileName || !fileUrl) {
    throw new Parse.Error(400, 'Se requieren equipoId, fileName y fileUrl');
  }

  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');
    const equipo = await query.get(equipoId, { useMasterKey: true });

    const archivoData = {
      nombre: fileName,
      url: fileUrl,
      tipo: fileName.split('.').pop() || 'desconocido',
      categoria: categoria || 'otro',
      subidoPor: currentUser.get('displayName') || currentUser.get('nombre') || currentUser.getUsername(),
      fecha: new Date().toISOString(),
    };

    const archivos = equipo.get('archivos') || [];
    archivos.push(archivoData);
    equipo.set('archivos', archivos);
    await equipo.save(null, { useMasterKey: true });

    // Registrar en historial
    const categoriaLabels = {
      adquisicion: 'Acta de adquisicion',
      baja: 'Acta de baja',
      garantia: 'Garantia',
      manual: 'Manual tecnico',
      certificacion: 'Certificado de certificacion',
      mantencion: 'Informe de mantencion',
      inspeccion: 'Informe de inspeccion',
      autorizacion: 'Autorizacion de operacion',
      otro: 'Otro',
    };
    const catLabel = categoriaLabels[categoria] || categoria || 'Otro';
    await registrarHistorialIndustrial(
      equipoId,
      'archivo_adjunto',
      {},
      `Archivo "${fileName}" adjuntado (${catLabel})`,
      currentUser,
      { nombre: fileName, url: fileUrl }
    );

    return archivoData;
  } catch (error) {
    throw new Parse.Error(500, `Error al adjuntar archivo: ${error.message}`);
  }
});

/**
 * Elimina un archivo adjunto de un equipo industrial del inventario.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('eliminarArchivoIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { equipoId, fileName, fileUrl } = request.params;
  if (!equipoId || !fileName) {
    throw new Parse.Error(400, 'Se requieren equipoId y fileName');
  }

  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');
    const equipo = await query.get(equipoId, { useMasterKey: true });

    const archivos = equipo.get('archivos') || [];
    const nuevosArchivos = archivos.filter(
      (a) => !(a.nombre === fileName && a.url === fileUrl)
    );
    equipo.set('archivos', nuevosArchivos);
    await equipo.save(null, { useMasterKey: true });

    // Registrar en historial
    await registrarHistorialIndustrial(
      equipoId,
      'archivo_eliminado',
      {},
      `Archivo "${fileName}" eliminado`,
      currentUser,
      { nombre: fileName, url: fileUrl }
    );

    return { success: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar archivo: ${error.message}`);
  }
});

/**
 * Obtiene los archivos adjuntos de un equipo industrial.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getArchivosIndustrial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { equipoId } = request.params;
  if (!equipoId) {
    throw new Parse.Error(400, 'Se requiere el ID del equipo');
  }

  try {
    const query = new Parse.Query('InventarioEquipoIndustrial');
    const equipo = await query.get(equipoId, { useMasterKey: true });
    return equipo.get('archivos') || [];
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener archivos: ${error.message}`);
  }
});

// ===============================================
// FUNCIONES DE INVENTARIO DE FLOTA VEHICULAR
// ===============================================

/**
 * Funcion auxiliar para registrar historial de cambios en FlotaVehicularHistorial.
 */
async function registrarHistorialFlota(vehiculoId, accion, cambios, descripcion, user, archivoInfo) {
  try {
    const HistorialClass = Parse.Object.extend('FlotaVehicularHistorial');
    const historial = new HistorialClass();
    historial.set('vehiculoId', vehiculoId);
    historial.set('accion', accion);
    historial.set('cambios', cambios || {});
    historial.set('descripcion', descripcion);
    historial.set('usuarioId', user ? user.id : '');
    historial.set('usuarioNombre', user ? (user.get('displayName') || user.get('nombre') || user.getUsername()) : 'Sistema');
    if (archivoInfo) {
      if (archivoInfo.nombre) historial.set('archivoNombre', archivoInfo.nombre);
      if (archivoInfo.url) historial.set('archivoUrl', archivoInfo.url);
    }
    await historial.save(null, { useMasterKey: true });
    return historial;
  } catch (error) {
    console.error('Error registrando historial flota vehicular:', error.message);
  }
}

/**
 * Obtiene vehiculos de la flota con filtros y paginacion.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    tipoVehiculo,
    asignadoA,
    estado,
    combustible,
    busqueda,
    activo,
    convenio,
    estadoCumplimiento,
    ultimoMttoDesde,
    ultimoMttoHasta,
    limit = 25,
    skip = 0,
  } = request.params || {};

  // Helper local para agregar campos de cumplimiento al mapeo
  const mapFlotaCumplimiento = (item) => ({
    ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
    ultimoRegistroMantenimientoId: item.get('ultimoRegistroMantenimientoId') || '',
    ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
    ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
    proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
    periodosEsperados: item.get('periodosEsperados') || 0,
    periodosCumplidos: item.get('periodosCumplidos') || 0,
    periodosFaltantes: item.get('periodosFaltantes') || 0,
    cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
    estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
    ultimoCalculoCumplimiento: item.get('ultimoCalculoCumplimiento') || null,
  });

  try {
    const query = new Parse.Query('InventarioFlotaVehicular');

    if (tipoVehiculo) query.equalTo('tipoVehiculo', tipoVehiculo);
    if (asignadoA) query.equalTo('asignadoA', asignadoA);
    if (estado) query.equalTo('estado', estado);
    if (combustible) query.equalTo('combustible', combustible);
    if (activo === true || activo === false) query.equalTo('activo', activo);
    if (convenio === 'con_convenio') query.equalTo('convenioActivo', true);
    if (convenio === 'sin_convenio') query.notEqualTo('convenioActivo', true);
    if (estadoCumplimiento && estadoCumplimiento !== 'todos') {
      query.equalTo('estadoCumplimientoMantenimiento', estadoCumplimiento);
    }
    if (ultimoMttoDesde) query.greaterThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoDesde);
    if (ultimoMttoHasta) query.lessThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoHasta);
    if (busqueda && busqueda.trim().length > 0) {
      // Normalizar: quitar espacios, guiones, puntos, barras y caracteres especiales, lowercase
      const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
      const termRaw = busqueda.trim().toLowerCase();
      const termNorm = normalize(busqueda.trim());

      // Traer todos los vehiculos con los filtros base y buscar en memoria
      const baseQuery = new Parse.Query('InventarioFlotaVehicular');
      if (tipoVehiculo) baseQuery.equalTo('tipoVehiculo', tipoVehiculo);
      if (asignadoA) baseQuery.equalTo('asignadoA', asignadoA);
      if (estado) baseQuery.equalTo('estado', estado);
      if (combustible) baseQuery.equalTo('combustible', combustible);
      if (activo === true || activo === false) baseQuery.equalTo('activo', activo);
      if (convenio === 'con_convenio') baseQuery.equalTo('convenioActivo', true);
      if (convenio === 'sin_convenio') baseQuery.notEqualTo('convenioActivo', true);
      if (estadoCumplimiento && estadoCumplimiento !== 'todos') {
        baseQuery.equalTo('estadoCumplimientoMantenimiento', estadoCumplimiento);
      }
      if (ultimoMttoDesde) baseQuery.greaterThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoDesde);
      if (ultimoMttoHasta) baseQuery.lessThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoHasta);
      baseQuery.ascending('patente');
      baseQuery.limit(10000);

      const allResults = await baseQuery.find({ useMasterKey: true });

      // Filtrar en memoria: busca en patente, numeroInterno, nombreVehiculo, vin
      const filtered = allResults.filter(item => {
        const patenteRaw = (item.get('patente') || '').toLowerCase();
        const numInternoRaw = (item.get('numeroInterno') || '').toLowerCase();
        const nombreRaw = (item.get('nombreVehiculo') || '').toLowerCase();
        const vinRaw = (item.get('vin') || '').toLowerCase();
        const patenteNorm = normalize(item.get('patente'));
        const numInternoNorm = normalize(item.get('numeroInterno'));
        const nombreNorm = normalize(item.get('nombreVehiculo'));
        const vinNorm = normalize(item.get('vin'));

        return patenteRaw.includes(termRaw) || numInternoRaw.includes(termRaw) || nombreRaw.includes(termRaw) || vinRaw.includes(termRaw)
            || patenteNorm.includes(termNorm) || numInternoNorm.includes(termNorm) || nombreNorm.includes(termNorm) || vinNorm.includes(termNorm);
      });

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return {
        results: paged.map(item => ({
          id: item.id,
          tipoVehiculo: item.get('tipoVehiculo'),
          nombreVehiculo: item.get('nombreVehiculo'),
          marca: item.get('marca'),
          modelo: item.get('modelo'),
          anio: item.get('anio'),
          patente: item.get('patente'),
          numeroInterno: item.get('numeroInterno'),
          vin: item.get('vin'),
          color: item.get('color'),
          combustible: item.get('combustible'),
          kilometraje: item.get('kilometraje'),
          capacidadPasajeros: item.get('capacidadPasajeros'),
          asignadoA: item.get('asignadoA'),
          fechaAdquisicion: item.get('fechaAdquisicion'),
          vidaUtil: item.get('vidaUtil'),
          estado: item.get('estado'),
          frecuencia: item.get('frecuencia'),
          revisionTecnicaVigente: item.get('revisionTecnicaVigente'),
          permisoCirculacion: item.get('permisoCirculacion'),
          seguroVigente: item.get('seguroVigente'),
          garantiaInicio: item.get('garantiaInicio'),
          garantiaFinal: item.get('garantiaFinal'),
          fechaBaja: item.get('fechaBaja'),
          activo: item.get('activo'),
          convenioActivo: item.get('convenioActivo') || false,
          proveedorRut: item.get('proveedorRut') || '',
          proveedorNombre: item.get('proveedorNombre') || '',
          numeroLicitacion: item.get('numeroLicitacion') || '',
          fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
          ...mapFlotaCumplimiento(item),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total,
      };
    }

    query.ascending('patente');
    query.addAscending('nombreVehiculo');

    const total = await query.count({ useMasterKey: true });

    query.limit(limit);
    query.skip(skip);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        tipoVehiculo: item.get('tipoVehiculo'),
        nombreVehiculo: item.get('nombreVehiculo'),
        marca: item.get('marca'),
        modelo: item.get('modelo'),
        anio: item.get('anio'),
        patente: item.get('patente'),
        numeroInterno: item.get('numeroInterno'),
        vin: item.get('vin'),
        color: item.get('color'),
        combustible: item.get('combustible'),
        kilometraje: item.get('kilometraje'),
        capacidadPasajeros: item.get('capacidadPasajeros'),
        asignadoA: item.get('asignadoA'),
        fechaAdquisicion: item.get('fechaAdquisicion'),
        vidaUtil: item.get('vidaUtil'),
        estado: item.get('estado'),
        frecuencia: item.get('frecuencia'),
        revisionTecnicaVigente: item.get('revisionTecnicaVigente'),
        permisoCirculacion: item.get('permisoCirculacion'),
        seguroVigente: item.get('seguroVigente'),
        garantiaInicio: item.get('garantiaInicio'),
        garantiaFinal: item.get('garantiaFinal'),
        fechaBaja: item.get('fechaBaja'),
        activo: item.get('activo'),
        convenioActivo: item.get('convenioActivo') || false,
        proveedorRut: item.get('proveedorRut') || '',
        proveedorNombre: item.get('proveedorNombre') || '',
        numeroLicitacion: item.get('numeroLicitacion') || '',
        fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
        ...mapFlotaCumplimiento(item),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener flota vehicular: ${error.message}`);
  }
});

/**
 * Obtiene un vehiculo de la flota por ID.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioFlotaById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del vehiculo');
  }

  try {
    const query = new Parse.Query('InventarioFlotaVehicular');
    const item = await query.get(id, { useMasterKey: true });

    return {
      id: item.id,
      tipoVehiculo: item.get('tipoVehiculo'),
      nombreVehiculo: item.get('nombreVehiculo'),
      marca: item.get('marca'),
      modelo: item.get('modelo'),
      anio: item.get('anio'),
      patente: item.get('patente'),
      numeroInterno: item.get('numeroInterno'),
      vin: item.get('vin'),
      color: item.get('color'),
      combustible: item.get('combustible'),
      kilometraje: item.get('kilometraje'),
      capacidadPasajeros: item.get('capacidadPasajeros'),
      asignadoA: item.get('asignadoA'),
      fechaAdquisicion: item.get('fechaAdquisicion'),
      vidaUtil: item.get('vidaUtil'),
      estado: item.get('estado'),
      frecuencia: item.get('frecuencia'),
      revisionTecnicaVigente: item.get('revisionTecnicaVigente'),
      permisoCirculacion: item.get('permisoCirculacion'),
      seguroVigente: item.get('seguroVigente'),
      garantiaInicio: item.get('garantiaInicio'),
      garantiaFinal: item.get('garantiaFinal'),
      fechaBaja: item.get('fechaBaja'),
      activo: item.get('activo'),
      convenioActivo: item.get('convenioActivo') || false,
      proveedorRut: item.get('proveedorRut') || '',
      proveedorNombre: item.get('proveedorNombre') || '',
      numeroLicitacion: item.get('numeroLicitacion') || '',
      fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
      // Etapa 1 — Cumplimiento de mantenimiento
      ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
      ultimoRegistroMantenimientoId: item.get('ultimoRegistroMantenimientoId') || '',
      ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
      ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
      proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
      periodosEsperados: item.get('periodosEsperados') || 0,
      periodosCumplidos: item.get('periodosCumplidos') || 0,
      periodosFaltantes: item.get('periodosFaltantes') || 0,
      cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
      estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
      ultimoCalculoCumplimiento: item.get('ultimoCalculoCumplimiento') || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener vehiculo: ${error.message}`);
  }
});

/**
 * Crea un nuevo vehiculo en la flota.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('createInventarioFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { data, forzarCrear = false } = request.params;
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos del vehiculo');
  }
  if (!data.nombreVehiculo || !data.nombreVehiculo.trim()) {
    throw new Parse.Error(400, 'El nombre del vehiculo es obligatorio');
  }

  // Etapa 5 (revision-inventarios): detectar duplicado eliminado
  if (!forzarCrear) {
    const dup = await _chequearDuplicadoEliminado('InventarioFlotaVehicular', data);
    if (dup) return { duplicateEliminado: dup };
  }

  try {
    const VehiculoClass = Parse.Object.extend('InventarioFlotaVehicular');
    const vehiculo = new VehiculoClass();

    vehiculo.set('tipoVehiculo', (data.tipoVehiculo || '').trim());
    vehiculo.set('nombreVehiculo', data.nombreVehiculo.trim());
    vehiculo.set('marca', (data.marca || '').trim());
    vehiculo.set('modelo', (data.modelo || '').trim());
    vehiculo.set('anio', parseInt(data.anio) || 0);
    vehiculo.set('patente', (data.patente || '').trim());
    vehiculo.set('numeroInterno', (data.numeroInterno || '').trim());
    vehiculo.set('vin', (data.vin || '').trim());
    vehiculo.set('color', (data.color || '').trim());
    vehiculo.set('combustible', data.combustible || 'Diesel');
    vehiculo.set('kilometraje', parseInt(data.kilometraje) || 0);
    vehiculo.set('capacidadPasajeros', parseInt(data.capacidadPasajeros) || 0);
    vehiculo.set('asignadoA', (data.asignadoA || '').trim());
    vehiculo.set('fechaAdquisicion', data.fechaAdquisicion || '');
    vehiculo.set('vidaUtil', parseInt(data.vidaUtil) || 0);
    vehiculo.set('estado', data.estado || 'B');
    vehiculo.set('frecuencia', parseInt(data.frecuencia) || 3);
    vehiculo.set('revisionTecnicaVigente', data.revisionTecnicaVigente || '');
    vehiculo.set('permisoCirculacion', data.permisoCirculacion || '');
    vehiculo.set('seguroVigente', data.seguroVigente || '');
    vehiculo.set('garantiaInicio', data.garantiaInicio || '');
    vehiculo.set('garantiaFinal', data.garantiaFinal || '');
    vehiculo.set('fechaBaja', data.fechaBaja || '');
    vehiculo.set('pautaAsignada', (data.pautaAsignada || '').trim());
    vehiculo.set('activo', data.activo !== false);
    vehiculo.set('archivos', []);
    vehiculo.set('creadoPor', currentUser.id);

    await vehiculo.save(null, { useMasterKey: true });

    // Registrar historial de creacion
    const cambiosCreacion = {};
    const camposRegistro = [
      'tipoVehiculo', 'nombreVehiculo', 'marca', 'modelo', 'anio',
      'patente', 'numeroInterno', 'vin', 'color', 'combustible',
      'kilometraje', 'capacidadPasajeros', 'asignadoA', 'fechaAdquisicion', 'vidaUtil',
      'estado', 'frecuencia', 'revisionTecnicaVigente', 'permisoCirculacion', 'seguroVigente',
      'garantiaInicio', 'garantiaFinal', 'fechaBaja', 'pautaAsignada', 'activo',
    ];
    for (const campo of camposRegistro) {
      const val = vehiculo.get(campo);
      if (val !== undefined && val !== '' && val !== null) {
        cambiosCreacion[campo] = { nuevo: val };
      }
    }
    await registrarHistorialFlota(
      vehiculo.id,
      'creacion',
      cambiosCreacion,
      `Vehiculo "${vehiculo.get('nombreVehiculo')}" creado`,
      currentUser,
      null
    );

    return {
      id: vehiculo.id,
      tipoVehiculo: vehiculo.get('tipoVehiculo'),
      nombreVehiculo: vehiculo.get('nombreVehiculo'),
      marca: vehiculo.get('marca'),
      modelo: vehiculo.get('modelo'),
      anio: vehiculo.get('anio'),
      patente: vehiculo.get('patente'),
      numeroInterno: vehiculo.get('numeroInterno'),
      vin: vehiculo.get('vin'),
      color: vehiculo.get('color'),
      combustible: vehiculo.get('combustible'),
      kilometraje: vehiculo.get('kilometraje'),
      capacidadPasajeros: vehiculo.get('capacidadPasajeros'),
      asignadoA: vehiculo.get('asignadoA'),
      fechaAdquisicion: vehiculo.get('fechaAdquisicion'),
      vidaUtil: vehiculo.get('vidaUtil'),
      estado: vehiculo.get('estado'),
      frecuencia: vehiculo.get('frecuencia'),
      revisionTecnicaVigente: vehiculo.get('revisionTecnicaVigente'),
      permisoCirculacion: vehiculo.get('permisoCirculacion'),
      seguroVigente: vehiculo.get('seguroVigente'),
      garantiaInicio: vehiculo.get('garantiaInicio'),
      garantiaFinal: vehiculo.get('garantiaFinal'),
      fechaBaja: vehiculo.get('fechaBaja'),
      pautaAsignada: vehiculo.get('pautaAsignada'),
      activo: vehiculo.get('activo'),
      createdAt: vehiculo.createdAt,
      updatedAt: vehiculo.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al crear vehiculo: ${error.message}`);
  }
});

/**
 * Actualiza un vehiculo de la flota.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('updateInventarioFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { id, data } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del vehiculo');
  }
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos a actualizar');
  }

  try {
    const query = new Parse.Query('InventarioFlotaVehicular');
    const vehiculo = await query.get(id, { useMasterKey: true });

    const allowedFields = [
      'tipoVehiculo', 'nombreVehiculo', 'marca', 'modelo', 'anio',
      'patente', 'numeroInterno', 'vin', 'color', 'combustible',
      'kilometraje', 'capacidadPasajeros', 'asignadoA', 'fechaAdquisicion', 'vidaUtil',
      'estado', 'frecuencia', 'revisionTecnicaVigente', 'permisoCirculacion', 'seguroVigente',
      'garantiaInicio', 'garantiaFinal', 'fechaBaja', 'pautaAsignada', 'activo',
    ];

    // Capturar valores anteriores para historial
    const valoresAnteriores = {};
    for (const field of allowedFields) {
      valoresAnteriores[field] = vehiculo.get(field);
    }

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        vehiculo.set(field, data[field]);
      }
    }
    vehiculo.set('modificadoPor', currentUser.id);

    await vehiculo.save(null, { useMasterKey: true });

    // Detectar cambios y registrar historial
    const cambios = {};
    const descripcionParts = [];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const anterior = valoresAnteriores[field];
        const nuevo = vehiculo.get(field);
        if (String(anterior) !== String(nuevo)) {
          cambios[field] = { anterior, nuevo };
          descripcionParts.push(`${field} de '${anterior}' a '${nuevo}'`);
        }
      }
    }
    if (Object.keys(cambios).length > 0) {
      const descripcion = `Actualizo ${descripcionParts.join(', ')}`;
      await registrarHistorialFlota(vehiculo.id, 'actualizacion', cambios, descripcion, currentUser, null);
    }

    return {
      id: vehiculo.id,
      tipoVehiculo: vehiculo.get('tipoVehiculo'),
      nombreVehiculo: vehiculo.get('nombreVehiculo'),
      marca: vehiculo.get('marca'),
      modelo: vehiculo.get('modelo'),
      anio: vehiculo.get('anio'),
      patente: vehiculo.get('patente'),
      numeroInterno: vehiculo.get('numeroInterno'),
      vin: vehiculo.get('vin'),
      color: vehiculo.get('color'),
      combustible: vehiculo.get('combustible'),
      kilometraje: vehiculo.get('kilometraje'),
      capacidadPasajeros: vehiculo.get('capacidadPasajeros'),
      asignadoA: vehiculo.get('asignadoA'),
      fechaAdquisicion: vehiculo.get('fechaAdquisicion'),
      vidaUtil: vehiculo.get('vidaUtil'),
      estado: vehiculo.get('estado'),
      frecuencia: vehiculo.get('frecuencia'),
      revisionTecnicaVigente: vehiculo.get('revisionTecnicaVigente'),
      permisoCirculacion: vehiculo.get('permisoCirculacion'),
      seguroVigente: vehiculo.get('seguroVigente'),
      garantiaInicio: vehiculo.get('garantiaInicio'),
      garantiaFinal: vehiculo.get('garantiaFinal'),
      fechaBaja: vehiculo.get('fechaBaja'),
      pautaAsignada: vehiculo.get('pautaAsignada'),
      activo: vehiculo.get('activo'),
      createdAt: vehiculo.createdAt,
      updatedAt: vehiculo.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al actualizar vehiculo: ${error.message}`);
  }
});

/**
 * Elimina un vehiculo de la flota (hard delete).
 * Requiere accessLevel >= 5 (super administrador).
 */
Parse.Cloud.define('deleteInventarioFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  // Etapa 5 (revision-inventarios): soft delete; baja a ADMIN(4)
  if (accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del vehiculo');
  }

  try {
    const query = new Parse.Query('InventarioFlotaVehicular');
    const vehiculo = await query.get(id, { useMasterKey: true });

    const datosVehiculo = {};
    const campos = [
      'tipoVehiculo', 'nombreVehiculo', 'marca', 'modelo', 'anio',
      'patente', 'numeroInterno', 'vin', 'color', 'combustible',
      'kilometraje', 'capacidadPasajeros', 'asignadoA', 'fechaAdquisicion', 'vidaUtil',
      'estado', 'frecuencia', 'revisionTecnicaVigente', 'permisoCirculacion', 'seguroVigente',
      'garantiaInicio', 'garantiaFinal', 'fechaBaja', 'activo',
    ];
    for (const campo of campos) {
      datosVehiculo[campo] = { anterior: vehiculo.get(campo) };
    }
    await registrarHistorialFlota(
      id,
      'eliminacion',
      datosVehiculo,
      `Vehiculo "${vehiculo.get('nombreVehiculo')}" eliminado (soft)`,
      currentUser,
      null
    );

    vehiculo.set('eliminado', true);
    vehiculo.set('eliminadoEn', new Date());
    vehiculo.set('eliminadoPor', currentUser.id);
    await vehiculo.save(null, { useMasterKey: true });
    return { success: true, softDelete: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar vehiculo: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de tipoVehiculo de la flota.
 */
Parse.Cloud.define('getInventarioFlotaTipos', async (request) => {
  try {
    const query = new Parse.Query('InventarioFlotaVehicular');
    query.select('tipoVehiculo');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('tipoVehiculo')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener tipos de vehiculo: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de asignadoA de la flota.
 */
Parse.Cloud.define('getInventarioFlotaAsignaciones', async (request) => {
  try {
    const query = new Parse.Query('InventarioFlotaVehicular');
    query.select('asignadoA');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('asignadoA')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener asignaciones: ${error.message}`);
  }
});

/**
 * Importacion masiva de vehiculos desde un arreglo.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('importarInventarioFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { items } = request.params;
  if (!items || !Array.isArray(items)) {
    throw new Parse.Error(400, 'Se requiere un arreglo de vehiculos');
  }

  let created = 0;
  let errors = 0;

  const VehiculoClass = Parse.Object.extend('InventarioFlotaVehicular');

  for (const data of items) {
    try {
      if (!data.nombreVehiculo || !String(data.nombreVehiculo).trim()) {
        errors++;
        continue;
      }

      const vehiculo = new VehiculoClass();
      vehiculo.set('tipoVehiculo', (data.tipoVehiculo || '').trim());
      vehiculo.set('nombreVehiculo', String(data.nombreVehiculo).trim());
      vehiculo.set('marca', (data.marca || '').trim());
      vehiculo.set('modelo', (data.modelo || '').trim());
      vehiculo.set('anio', parseInt(data.anio) || 0);
      vehiculo.set('patente', (data.patente || '').trim());
      vehiculo.set('numeroInterno', String(data.numeroInterno || '').trim());
      vehiculo.set('vin', (data.vin || '').trim());
      vehiculo.set('color', (data.color || '').trim());
      vehiculo.set('combustible', data.combustible || 'Diesel');
      vehiculo.set('kilometraje', parseInt(data.kilometraje) || 0);
      vehiculo.set('capacidadPasajeros', parseInt(data.capacidadPasajeros) || 0);
      vehiculo.set('asignadoA', (data.asignadoA || '').trim());
      vehiculo.set('fechaAdquisicion', data.fechaAdquisicion || '');
      vehiculo.set('vidaUtil', parseInt(data.vidaUtil) || 0);
      vehiculo.set('estado', data.estado || 'B');
      vehiculo.set('frecuencia', parseInt(data.frecuencia) || 3);
      vehiculo.set('revisionTecnicaVigente', data.revisionTecnicaVigente || '');
      vehiculo.set('permisoCirculacion', data.permisoCirculacion || '');
      vehiculo.set('seguroVigente', data.seguroVigente || '');
      vehiculo.set('garantiaInicio', data.garantiaInicio || '');
      vehiculo.set('garantiaFinal', data.garantiaFinal || '');
      vehiculo.set('fechaBaja', data.fechaBaja || '');
      vehiculo.set('activo', data.activo !== false);
      vehiculo.set('archivos', []);
      vehiculo.set('creadoPor', currentUser.id);

      await vehiculo.save(null, { useMasterKey: true });
      created++;
    } catch (err) {
      errors++;
    }
  }

  return { created, errors, total: items.length };
});

/**
 * Exporta todos los vehiculos que coincidan con los filtros (sin paginacion).
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('exportarInventarioFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    tipoVehiculo,
    asignadoA,
    estado,
    combustible,
    busqueda,
    convenio,
  } = request.params || {};

  try {
    const query = new Parse.Query('InventarioFlotaVehicular');

    if (tipoVehiculo) query.equalTo('tipoVehiculo', tipoVehiculo);
    if (asignadoA) query.equalTo('asignadoA', asignadoA);
    if (estado) query.equalTo('estado', estado);
    if (combustible) query.equalTo('combustible', combustible);
    if (convenio === 'con_convenio') query.equalTo('convenioActivo', true);
    if (convenio === 'sin_convenio') query.notEqualTo('convenioActivo', true);
    if (busqueda && busqueda.trim().length > 0) {
      const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
      const termRaw = busqueda.trim().toLowerCase();
      const termNorm = normalize(busqueda.trim());

      const baseQuery = new Parse.Query('InventarioFlotaVehicular');
      if (tipoVehiculo) baseQuery.equalTo('tipoVehiculo', tipoVehiculo);
      if (asignadoA) baseQuery.equalTo('asignadoA', asignadoA);
      if (estado) baseQuery.equalTo('estado', estado);
      if (combustible) baseQuery.equalTo('combustible', combustible);
      if (convenio === 'con_convenio') baseQuery.equalTo('convenioActivo', true);
      if (convenio === 'sin_convenio') baseQuery.notEqualTo('convenioActivo', true);
      baseQuery.ascending('patente');
      baseQuery.limit(10000);

      const allResults = await baseQuery.find({ useMasterKey: true });

      const filtered = allResults.filter(item => {
        const patenteRaw = (item.get('patente') || '').toLowerCase();
        const numInternoRaw = (item.get('numeroInterno') || '').toLowerCase();
        const nombreRaw = (item.get('nombreVehiculo') || '').toLowerCase();
        const vinRaw = (item.get('vin') || '').toLowerCase();
        const patenteNorm = normalize(item.get('patente'));
        const numInternoNorm = normalize(item.get('numeroInterno'));
        const nombreNorm = normalize(item.get('nombreVehiculo'));
        const vinNorm = normalize(item.get('vin'));

        return patenteRaw.includes(termRaw) || numInternoRaw.includes(termRaw) || nombreRaw.includes(termRaw) || vinRaw.includes(termRaw)
            || patenteNorm.includes(termNorm) || numInternoNorm.includes(termNorm) || nombreNorm.includes(termNorm) || vinNorm.includes(termNorm);
      });

      return {
        results: filtered.map(item => ({
          id: item.id,
          tipoVehiculo: item.get('tipoVehiculo'),
          nombreVehiculo: item.get('nombreVehiculo'),
          marca: item.get('marca'),
          modelo: item.get('modelo'),
          anio: item.get('anio'),
          patente: item.get('patente'),
          numeroInterno: item.get('numeroInterno'),
          vin: item.get('vin'),
          color: item.get('color'),
          combustible: item.get('combustible'),
          kilometraje: item.get('kilometraje'),
          capacidadPasajeros: item.get('capacidadPasajeros'),
          asignadoA: item.get('asignadoA'),
          fechaAdquisicion: item.get('fechaAdquisicion'),
          vidaUtil: item.get('vidaUtil'),
          estado: item.get('estado'),
          frecuencia: item.get('frecuencia'),
          revisionTecnicaVigente: item.get('revisionTecnicaVigente'),
          permisoCirculacion: item.get('permisoCirculacion'),
          seguroVigente: item.get('seguroVigente'),
          garantiaInicio: item.get('garantiaInicio'),
          garantiaFinal: item.get('garantiaFinal'),
          fechaBaja: item.get('fechaBaja'),
          activo: item.get('activo'),
          convenioActivo: item.get('convenioActivo') || false,
          proveedorRut: item.get('proveedorRut') || '',
          proveedorNombre: item.get('proveedorNombre') || '',
          numeroLicitacion: item.get('numeroLicitacion') || '',
          fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
          // Etapa 1 — Cumplimiento de mantenimiento
          ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
          ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
          ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
          proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
          periodosEsperados: item.get('periodosEsperados') || 0,
          periodosCumplidos: item.get('periodosCumplidos') || 0,
          periodosFaltantes: item.get('periodosFaltantes') || 0,
          cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
          estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      };
    }

    query.ascending('patente');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        tipoVehiculo: item.get('tipoVehiculo'),
        nombreVehiculo: item.get('nombreVehiculo'),
        marca: item.get('marca'),
        modelo: item.get('modelo'),
        anio: item.get('anio'),
        patente: item.get('patente'),
        numeroInterno: item.get('numeroInterno'),
        vin: item.get('vin'),
        color: item.get('color'),
        combustible: item.get('combustible'),
        kilometraje: item.get('kilometraje'),
        capacidadPasajeros: item.get('capacidadPasajeros'),
        asignadoA: item.get('asignadoA'),
        fechaAdquisicion: item.get('fechaAdquisicion'),
        vidaUtil: item.get('vidaUtil'),
        estado: item.get('estado'),
        frecuencia: item.get('frecuencia'),
        revisionTecnicaVigente: item.get('revisionTecnicaVigente'),
        permisoCirculacion: item.get('permisoCirculacion'),
        seguroVigente: item.get('seguroVigente'),
        garantiaInicio: item.get('garantiaInicio'),
        garantiaFinal: item.get('garantiaFinal'),
        fechaBaja: item.get('fechaBaja'),
        activo: item.get('activo'),
        convenioActivo: item.get('convenioActivo') || false,
        proveedorRut: item.get('proveedorRut') || '',
        proveedorNombre: item.get('proveedorNombre') || '',
        numeroLicitacion: item.get('numeroLicitacion') || '',
        fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
        // Etapa 1 — Cumplimiento de mantenimiento
        ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
        ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
        ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
        proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
        periodosEsperados: item.get('periodosEsperados') || 0,
        periodosCumplidos: item.get('periodosCumplidos') || 0,
        periodosFaltantes: item.get('periodosFaltantes') || 0,
        cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
        estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al exportar flota vehicular: ${error.message}`);
  }
});

/**
 * Obtiene el historial de cambios de un vehiculo de la flota.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioFlotaHistorial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { vehiculoId, limit = 20, skip = 0 } = request.params;
  if (!vehiculoId) {
    throw new Parse.Error(400, 'Se requiere el ID del vehiculo');
  }

  try {
    // Etapa 6: incluir historial de versiones previas (identidad de negocio)
    const ids = await _resolverIdsActivoPorIdentidad('InventarioFlotaVehicular', vehiculoId);

    const query = new Parse.Query('FlotaVehicularHistorial');
    if (ids.length === 1) query.equalTo('vehiculoId', ids[0]);
    else query.containedIn('vehiculoId', ids);
    query.descending('createdAt');
    query.limit(limit);
    query.skip(skip);

    const total = await query.count({ useMasterKey: true });
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        vehiculoId: item.get('vehiculoId'),
        accion: item.get('accion'),
        cambios: item.get('cambios'),
        descripcion: item.get('descripcion'),
        usuarioId: item.get('usuarioId'),
        usuarioNombre: item.get('usuarioNombre'),
        archivoNombre: item.get('archivoNombre'),
        archivoUrl: item.get('archivoUrl'),
        createdAt: item.createdAt,
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener historial flota vehicular: ${error.message}`);
  }
});

/**
 * Adjunta un archivo a un vehiculo de la flota.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('adjuntarArchivoFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { vehiculoId, fileName, fileUrl, categoria } = request.params;
  if (!vehiculoId || !fileName || !fileUrl) {
    throw new Parse.Error(400, 'Se requieren vehiculoId, fileName y fileUrl');
  }

  try {
    const query = new Parse.Query('InventarioFlotaVehicular');
    const vehiculo = await query.get(vehiculoId, { useMasterKey: true });

    const archivoData = {
      nombre: fileName,
      url: fileUrl,
      tipo: fileName.split('.').pop() || 'desconocido',
      categoria: categoria || 'otro',
      subidoPor: currentUser.get('displayName') || currentUser.get('nombre') || currentUser.getUsername(),
      fecha: new Date().toISOString(),
    };

    const archivos = vehiculo.get('archivos') || [];
    archivos.push(archivoData);
    vehiculo.set('archivos', archivos);
    await vehiculo.save(null, { useMasterKey: true });

    // Registrar en historial
    const categoriaLabels = {
      adquisicion: 'Acta de adquisicion',
      baja: 'Acta de baja',
      garantia: 'Garantia',
      seguro: 'Poliza de seguro',
      revision_tecnica: 'Revision tecnica',
      permiso_circulacion: 'Permiso de circulacion',
      mantencion: 'Informe de mantencion',
      inspeccion: 'Informe de inspeccion',
      otro: 'Otro',
    };
    const catLabel = categoriaLabels[categoria] || categoria || 'Otro';
    await registrarHistorialFlota(
      vehiculoId,
      'archivo_adjunto',
      {},
      `Archivo "${fileName}" adjuntado (${catLabel})`,
      currentUser,
      { nombre: fileName, url: fileUrl }
    );

    return archivoData;
  } catch (error) {
    throw new Parse.Error(500, `Error al adjuntar archivo: ${error.message}`);
  }
});

/**
 * Elimina un archivo adjunto de un vehiculo de la flota.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('eliminarArchivoFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { vehiculoId, fileName, fileUrl } = request.params;
  if (!vehiculoId || !fileName) {
    throw new Parse.Error(400, 'Se requieren vehiculoId y fileName');
  }

  try {
    const query = new Parse.Query('InventarioFlotaVehicular');
    const vehiculo = await query.get(vehiculoId, { useMasterKey: true });

    const archivos = vehiculo.get('archivos') || [];
    const nuevosArchivos = archivos.filter(
      (a) => !(a.nombre === fileName && a.url === fileUrl)
    );
    vehiculo.set('archivos', nuevosArchivos);
    await vehiculo.save(null, { useMasterKey: true });

    // Registrar en historial
    await registrarHistorialFlota(
      vehiculoId,
      'archivo_eliminado',
      {},
      `Archivo "${fileName}" eliminado`,
      currentUser,
      { nombre: fileName, url: fileUrl }
    );

    return { success: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar archivo: ${error.message}`);
  }
});

/**
 * Obtiene los archivos adjuntos de un vehiculo de la flota.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getArchivosFlota', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { vehiculoId } = request.params;
  if (!vehiculoId) {
    throw new Parse.Error(400, 'Se requiere el ID del vehiculo');
  }

  try {
    const query = new Parse.Query('InventarioFlotaVehicular');
    const vehiculo = await query.get(vehiculoId, { useMasterKey: true });
    return vehiculo.get('archivos') || [];
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener archivos: ${error.message}`);
  }
});

// ===============================================
// FUNCIONES DE INVENTARIO DE INFRAESTRUCTURA
// ===============================================

/**
 * Funcion auxiliar para registrar historial de cambios en InfraestructuraHistorial.
 */
async function registrarHistorialInfra(componenteId, accion, cambios, descripcion, user, archivoInfo) {
  try {
    const HistorialClass = Parse.Object.extend('InfraestructuraHistorial');
    const historial = new HistorialClass();
    historial.set('componenteId', componenteId);
    historial.set('accion', accion);
    historial.set('cambios', cambios || {});
    historial.set('descripcion', descripcion);
    historial.set('usuarioId', user ? user.id : '');
    historial.set('usuarioNombre', user ? (user.get('displayName') || user.get('nombre') || user.getUsername()) : 'Sistema');
    if (archivoInfo) {
      if (archivoInfo.nombre) historial.set('archivoNombre', archivoInfo.nombre);
      if (archivoInfo.url) historial.set('archivoUrl', archivoInfo.url);
    }
    await historial.save(null, { useMasterKey: true });
    return historial;
  } catch (error) {
    console.error('Error registrando historial infraestructura:', error.message);
  }
}

/**
 * Obtiene componentes de infraestructura del inventario con filtros y paginacion.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    sistema,
    ubicacion,
    estado,
    criticidad,
    busqueda,
    activo,
    convenio,
    estadoCumplimiento,
    ultimoMttoDesde,
    ultimoMttoHasta,
    limit = 25,
    skip = 0,
  } = request.params || {};

  // Helper local para agregar campos de cumplimiento al mapeo
  const mapInfraCumplimiento = (item) => ({
    ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
    ultimoRegistroMantenimientoId: item.get('ultimoRegistroMantenimientoId') || '',
    ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
    ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
    proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
    periodosEsperados: item.get('periodosEsperados') || 0,
    periodosCumplidos: item.get('periodosCumplidos') || 0,
    periodosFaltantes: item.get('periodosFaltantes') || 0,
    cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
    estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
    ultimoCalculoCumplimiento: item.get('ultimoCalculoCumplimiento') || null,
  });

  try {
    const query = new Parse.Query('InventarioInfraestructura');

    if (sistema) query.equalTo('sistema', sistema);
    if (ubicacion) query.equalTo('ubicacion', ubicacion);
    if (estado) query.equalTo('estado', estado);
    if (criticidad) query.equalTo('criticidad', criticidad);
    if (activo === true || activo === false) query.equalTo('activo', activo);
    if (convenio === 'con_convenio') query.equalTo('convenioActivo', true);
    if (convenio === 'sin_convenio') query.notEqualTo('convenioActivo', true);
    if (estadoCumplimiento && estadoCumplimiento !== 'todos') {
      query.equalTo('estadoCumplimientoMantenimiento', estadoCumplimiento);
    }
    if (ultimoMttoDesde) query.greaterThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoDesde);
    if (ultimoMttoHasta) query.lessThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoHasta);
    if (busqueda && busqueda.trim().length > 0) {
      // Normalizar: quitar espacios, guiones, puntos, barras y caracteres especiales, lowercase
      const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
      const termRaw = busqueda.trim().toLowerCase();
      const termNorm = normalize(busqueda.trim());

      // Traer todos los componentes con los filtros base y buscar en memoria
      const baseQuery = new Parse.Query('InventarioInfraestructura');
      if (sistema) baseQuery.equalTo('sistema', sistema);
      if (ubicacion) baseQuery.equalTo('ubicacion', ubicacion);
      if (estado) baseQuery.equalTo('estado', estado);
      if (criticidad) baseQuery.equalTo('criticidad', criticidad);
      if (activo === true || activo === false) baseQuery.equalTo('activo', activo);
      if (convenio === 'con_convenio') baseQuery.equalTo('convenioActivo', true);
      if (convenio === 'sin_convenio') baseQuery.notEqualTo('convenioActivo', true);
      if (estadoCumplimiento && estadoCumplimiento !== 'todos') {
        baseQuery.equalTo('estadoCumplimientoMantenimiento', estadoCumplimiento);
      }
      if (ultimoMttoDesde) baseQuery.greaterThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoDesde);
      if (ultimoMttoHasta) baseQuery.lessThanOrEqualTo('ultimaFechaMantenimiento', ultimoMttoHasta);
      baseQuery.ascending('codigoInterno');
      baseQuery.limit(10000);

      const allResults = await baseQuery.find({ useMasterKey: true });

      // Filtrar en memoria: busca en codigoInterno, componente y descripcion
      const filtered = allResults.filter(item => {
        const codRaw = (item.get('codigoInterno') || '').toLowerCase();
        const compRaw = (item.get('componente') || '').toLowerCase();
        const descRaw = (item.get('descripcion') || '').toLowerCase();
        const codNorm = normalize(item.get('codigoInterno'));
        const compNorm = normalize(item.get('componente'));
        const descNorm = normalize(item.get('descripcion'));

        return codRaw.includes(termRaw) || compRaw.includes(termRaw) || descRaw.includes(termRaw)
            || codNorm.includes(termNorm) || compNorm.includes(termNorm) || descNorm.includes(termNorm);
      });

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return {
        results: paged.map(item => ({
          id: item.id,
          sistema: item.get('sistema'),
          componente: item.get('componente'),
          ubicacion: item.get('ubicacion'),
          descripcion: item.get('descripcion'),
          marca: item.get('marca'),
          modelo: item.get('modelo'),
          serie: item.get('serie'),
          codigoInterno: item.get('codigoInterno'),
          capacidad: item.get('capacidad'),
          fechaInstalacion: item.get('fechaInstalacion'),
          vidaUtil: item.get('vidaUtil'),
          estado: item.get('estado'),
          criticidad: item.get('criticidad'),
          frecuencia: item.get('frecuencia'),
          normativaAplicable: item.get('normativaAplicable'),
          fechaUltimaInspeccion: item.get('fechaUltimaInspeccion'),
          proximaInspeccion: item.get('proximaInspeccion'),
          responsable: item.get('responsable'),
          garantiaInicio: item.get('garantiaInicio'),
          garantiaFinal: item.get('garantiaFinal'),
          fechaBaja: item.get('fechaBaja'),
          activo: item.get('activo'),
          convenioActivo: item.get('convenioActivo') || false,
          proveedorRut: item.get('proveedorRut') || '',
          proveedorNombre: item.get('proveedorNombre') || '',
          numeroLicitacion: item.get('numeroLicitacion') || '',
          fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
          ...mapInfraCumplimiento(item),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total,
      };
    }

    query.ascending('codigoInterno');
    query.addAscending('componente');

    const total = await query.count({ useMasterKey: true });

    query.limit(limit);
    query.skip(skip);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        sistema: item.get('sistema'),
        componente: item.get('componente'),
        ubicacion: item.get('ubicacion'),
        descripcion: item.get('descripcion'),
        marca: item.get('marca'),
        modelo: item.get('modelo'),
        serie: item.get('serie'),
        codigoInterno: item.get('codigoInterno'),
        capacidad: item.get('capacidad'),
        fechaInstalacion: item.get('fechaInstalacion'),
        vidaUtil: item.get('vidaUtil'),
        estado: item.get('estado'),
        criticidad: item.get('criticidad'),
        frecuencia: item.get('frecuencia'),
        normativaAplicable: item.get('normativaAplicable'),
        fechaUltimaInspeccion: item.get('fechaUltimaInspeccion'),
        proximaInspeccion: item.get('proximaInspeccion'),
        responsable: item.get('responsable'),
        garantiaInicio: item.get('garantiaInicio'),
        garantiaFinal: item.get('garantiaFinal'),
        fechaBaja: item.get('fechaBaja'),
        activo: item.get('activo'),
        convenioActivo: item.get('convenioActivo') || false,
        proveedorRut: item.get('proveedorRut') || '',
        proveedorNombre: item.get('proveedorNombre') || '',
        numeroLicitacion: item.get('numeroLicitacion') || '',
        fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
        ...mapInfraCumplimiento(item),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener inventario infraestructura: ${error.message}`);
  }
});

/**
 * Obtiene un componente de infraestructura del inventario por ID.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioInfraById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del componente');
  }

  try {
    const query = new Parse.Query('InventarioInfraestructura');
    const item = await query.get(id, { useMasterKey: true });

    return {
      id: item.id,
      sistema: item.get('sistema'),
      componente: item.get('componente'),
      ubicacion: item.get('ubicacion'),
      descripcion: item.get('descripcion'),
      marca: item.get('marca'),
      modelo: item.get('modelo'),
      serie: item.get('serie'),
      codigoInterno: item.get('codigoInterno'),
      capacidad: item.get('capacidad'),
      fechaInstalacion: item.get('fechaInstalacion'),
      vidaUtil: item.get('vidaUtil'),
      estado: item.get('estado'),
      criticidad: item.get('criticidad'),
      frecuencia: item.get('frecuencia'),
      normativaAplicable: item.get('normativaAplicable'),
      fechaUltimaInspeccion: item.get('fechaUltimaInspeccion'),
      proximaInspeccion: item.get('proximaInspeccion'),
      responsable: item.get('responsable'),
      garantiaInicio: item.get('garantiaInicio'),
      garantiaFinal: item.get('garantiaFinal'),
      fechaBaja: item.get('fechaBaja'),
      activo: item.get('activo'),
      convenioActivo: item.get('convenioActivo') || false,
      proveedorRut: item.get('proveedorRut') || '',
      proveedorNombre: item.get('proveedorNombre') || '',
      numeroLicitacion: item.get('numeroLicitacion') || '',
      fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
      // Etapa 1 — Cumplimiento de mantenimiento
      ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
      ultimoRegistroMantenimientoId: item.get('ultimoRegistroMantenimientoId') || '',
      ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
      ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
      proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
      periodosEsperados: item.get('periodosEsperados') || 0,
      periodosCumplidos: item.get('periodosCumplidos') || 0,
      periodosFaltantes: item.get('periodosFaltantes') || 0,
      cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
      estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
      ultimoCalculoCumplimiento: item.get('ultimoCalculoCumplimiento') || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener componente infraestructura: ${error.message}`);
  }
});

/**
 * Crea un nuevo componente de infraestructura en el inventario.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('createInventarioInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { data, forzarCrear = false } = request.params;
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos del componente');
  }
  if (!data.componente || !data.componente.trim()) {
    throw new Parse.Error(400, 'El nombre del componente es obligatorio');
  }

  // Etapa 5 (revision-inventarios): detectar duplicado eliminado
  if (!forzarCrear) {
    const dup = await _chequearDuplicadoEliminado('InventarioInfraestructura', data);
    if (dup) return { duplicateEliminado: dup };
  }

  try {
    const CompClass = Parse.Object.extend('InventarioInfraestructura');
    const comp = new CompClass();

    comp.set('sistema', (data.sistema || '').trim());
    comp.set('componente', data.componente.trim());
    comp.set('ubicacion', (data.ubicacion || '').trim());
    comp.set('descripcion', (data.descripcion || '').trim());
    comp.set('marca', (data.marca || '').trim());
    comp.set('modelo', (data.modelo || '').trim());
    comp.set('serie', (data.serie || '').trim());
    comp.set('codigoInterno', (data.codigoInterno || '').trim());
    comp.set('capacidad', (data.capacidad || '').trim());
    comp.set('fechaInstalacion', data.fechaInstalacion || '');
    comp.set('vidaUtil', parseInt(data.vidaUtil) || 0);
    comp.set('estado', data.estado || 'B');
    comp.set('criticidad', data.criticidad || 'Media');
    comp.set('frecuencia', parseInt(data.frecuencia) || 6);
    comp.set('normativaAplicable', (data.normativaAplicable || '').trim());
    comp.set('fechaUltimaInspeccion', data.fechaUltimaInspeccion || '');
    comp.set('proximaInspeccion', data.proximaInspeccion || '');
    comp.set('responsable', (data.responsable || '').trim());
    comp.set('garantiaInicio', data.garantiaInicio || '');
    comp.set('garantiaFinal', data.garantiaFinal || '');
    comp.set('fechaBaja', data.fechaBaja || '');
    comp.set('pautaAsignada', (data.pautaAsignada || '').trim());
    comp.set('activo', data.activo !== false);
    comp.set('archivos', []);
    comp.set('creadoPor', currentUser.id);

    await comp.save(null, { useMasterKey: true });

    // Registrar historial de creacion
    const cambiosCreacion = {};
    const camposRegistro = [
      'sistema', 'componente', 'ubicacion', 'descripcion', 'marca', 'modelo',
      'serie', 'codigoInterno', 'capacidad', 'fechaInstalacion', 'vidaUtil',
      'estado', 'criticidad', 'frecuencia', 'normativaAplicable',
      'fechaUltimaInspeccion', 'proximaInspeccion', 'responsable',
      'garantiaInicio', 'garantiaFinal', 'fechaBaja', 'pautaAsignada', 'activo',
    ];
    for (const campo of camposRegistro) {
      const val = comp.get(campo);
      if (val !== undefined && val !== '' && val !== null) {
        cambiosCreacion[campo] = { nuevo: val };
      }
    }
    await registrarHistorialInfra(
      comp.id,
      'creacion',
      cambiosCreacion,
      `Componente infraestructura "${comp.get('componente')}" creado`,
      currentUser,
      null
    );

    return {
      id: comp.id,
      sistema: comp.get('sistema'),
      componente: comp.get('componente'),
      ubicacion: comp.get('ubicacion'),
      descripcion: comp.get('descripcion'),
      marca: comp.get('marca'),
      modelo: comp.get('modelo'),
      serie: comp.get('serie'),
      codigoInterno: comp.get('codigoInterno'),
      capacidad: comp.get('capacidad'),
      fechaInstalacion: comp.get('fechaInstalacion'),
      vidaUtil: comp.get('vidaUtil'),
      estado: comp.get('estado'),
      criticidad: comp.get('criticidad'),
      frecuencia: comp.get('frecuencia'),
      normativaAplicable: comp.get('normativaAplicable'),
      fechaUltimaInspeccion: comp.get('fechaUltimaInspeccion'),
      proximaInspeccion: comp.get('proximaInspeccion'),
      responsable: comp.get('responsable'),
      garantiaInicio: comp.get('garantiaInicio'),
      garantiaFinal: comp.get('garantiaFinal'),
      fechaBaja: comp.get('fechaBaja'),
      pautaAsignada: comp.get('pautaAsignada'),
      activo: comp.get('activo'),
      createdAt: comp.createdAt,
      updatedAt: comp.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al crear componente infraestructura: ${error.message}`);
  }
});

/**
 * Actualiza un componente de infraestructura del inventario.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('updateInventarioInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { id, data } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del componente');
  }
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos a actualizar');
  }

  try {
    const query = new Parse.Query('InventarioInfraestructura');
    const comp = await query.get(id, { useMasterKey: true });

    const allowedFields = [
      'sistema', 'componente', 'ubicacion', 'descripcion', 'marca', 'modelo',
      'serie', 'codigoInterno', 'capacidad', 'fechaInstalacion', 'vidaUtil',
      'estado', 'criticidad', 'frecuencia', 'normativaAplicable',
      'fechaUltimaInspeccion', 'proximaInspeccion', 'responsable',
      'garantiaInicio', 'garantiaFinal', 'fechaBaja', 'pautaAsignada', 'activo',
    ];

    // Capturar valores anteriores para historial
    const valoresAnteriores = {};
    for (const field of allowedFields) {
      valoresAnteriores[field] = comp.get(field);
    }

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        comp.set(field, data[field]);
      }
    }
    comp.set('modificadoPor', currentUser.id);

    await comp.save(null, { useMasterKey: true });

    // Detectar cambios y registrar historial
    const cambios = {};
    const descripcionParts = [];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const anterior = valoresAnteriores[field];
        const nuevo = comp.get(field);
        if (String(anterior) !== String(nuevo)) {
          cambios[field] = { anterior, nuevo };
          descripcionParts.push(`${field} de '${anterior}' a '${nuevo}'`);
        }
      }
    }
    if (Object.keys(cambios).length > 0) {
      const descripcion = `Actualizo ${descripcionParts.join(', ')}`;
      await registrarHistorialInfra(comp.id, 'actualizacion', cambios, descripcion, currentUser, null);
    }

    return {
      id: comp.id,
      sistema: comp.get('sistema'),
      componente: comp.get('componente'),
      ubicacion: comp.get('ubicacion'),
      descripcion: comp.get('descripcion'),
      marca: comp.get('marca'),
      modelo: comp.get('modelo'),
      serie: comp.get('serie'),
      codigoInterno: comp.get('codigoInterno'),
      capacidad: comp.get('capacidad'),
      fechaInstalacion: comp.get('fechaInstalacion'),
      vidaUtil: comp.get('vidaUtil'),
      estado: comp.get('estado'),
      criticidad: comp.get('criticidad'),
      frecuencia: comp.get('frecuencia'),
      normativaAplicable: comp.get('normativaAplicable'),
      fechaUltimaInspeccion: comp.get('fechaUltimaInspeccion'),
      proximaInspeccion: comp.get('proximaInspeccion'),
      responsable: comp.get('responsable'),
      garantiaInicio: comp.get('garantiaInicio'),
      garantiaFinal: comp.get('garantiaFinal'),
      fechaBaja: comp.get('fechaBaja'),
      pautaAsignada: comp.get('pautaAsignada'),
      activo: comp.get('activo'),
      createdAt: comp.createdAt,
      updatedAt: comp.updatedAt,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al actualizar componente infraestructura: ${error.message}`);
  }
});

/**
 * Elimina un componente de infraestructura del inventario (hard delete).
 * Requiere accessLevel >= 5 (super administrador).
 */
Parse.Cloud.define('deleteInventarioInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  // Etapa 5 (revision-inventarios): soft delete; baja a ADMIN(4)
  if (accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del componente');
  }

  try {
    const query = new Parse.Query('InventarioInfraestructura');
    const comp = await query.get(id, { useMasterKey: true });

    const datosComp = {};
    const campos = [
      'sistema', 'componente', 'ubicacion', 'descripcion', 'marca', 'modelo',
      'serie', 'codigoInterno', 'capacidad', 'fechaInstalacion', 'vidaUtil',
      'estado', 'criticidad', 'frecuencia', 'normativaAplicable',
      'fechaUltimaInspeccion', 'proximaInspeccion', 'responsable',
      'garantiaInicio', 'garantiaFinal', 'fechaBaja', 'activo',
    ];
    for (const campo of campos) {
      datosComp[campo] = { anterior: comp.get(campo) };
    }
    await registrarHistorialInfra(
      id,
      'eliminacion',
      datosComp,
      `Componente infraestructura "${comp.get('componente')}" eliminado (soft)`,
      currentUser,
      null
    );

    comp.set('eliminado', true);
    comp.set('eliminadoEn', new Date());
    comp.set('eliminadoPor', currentUser.id);
    await comp.save(null, { useMasterKey: true });
    return { success: true, softDelete: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar componente infraestructura: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de sistema del inventario infraestructura.
 */
Parse.Cloud.define('getInventarioInfraSistemas', async (request) => {
  try {
    const query = new Parse.Query('InventarioInfraestructura');
    query.select('sistema');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('sistema')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener sistemas: ${error.message}`);
  }
});

/**
 * Obtiene valores distintos de ubicacion del inventario infraestructura.
 */
Parse.Cloud.define('getInventarioInfraUbicaciones', async (request) => {
  try {
    const query = new Parse.Query('InventarioInfraestructura');
    query.select('ubicacion');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });
    const unique = [...new Set(results.map((r) => r.get('ubicacion')).filter(Boolean))];
    return unique.sort();
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener ubicaciones: ${error.message}`);
  }
});

/**
 * Importacion masiva de componentes de infraestructura desde un arreglo.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('importarInventarioInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { items } = request.params;
  if (!items || !Array.isArray(items)) {
    throw new Parse.Error(400, 'Se requiere un arreglo de componentes');
  }

  let created = 0;
  let errors = 0;

  const CompClass = Parse.Object.extend('InventarioInfraestructura');

  for (const data of items) {
    try {
      if (!data.componente || !String(data.componente).trim()) {
        errors++;
        continue;
      }

      const comp = new CompClass();
      comp.set('sistema', (data.sistema || '').trim());
      comp.set('componente', String(data.componente).trim());
      comp.set('ubicacion', (data.ubicacion || '').trim());
      comp.set('descripcion', (data.descripcion || '').trim());
      comp.set('marca', (data.marca || '').trim());
      comp.set('modelo', (data.modelo || '').trim());
      comp.set('serie', String(data.serie || '').trim());
      comp.set('codigoInterno', String(data.codigoInterno || '').trim());
      comp.set('capacidad', (data.capacidad || '').trim());
      comp.set('fechaInstalacion', data.fechaInstalacion || '');
      comp.set('vidaUtil', parseInt(data.vidaUtil) || 0);
      comp.set('estado', data.estado || 'B');
      comp.set('criticidad', data.criticidad || 'Media');
      comp.set('frecuencia', parseInt(data.frecuencia) || 6);
      comp.set('normativaAplicable', (data.normativaAplicable || '').trim());
      comp.set('fechaUltimaInspeccion', data.fechaUltimaInspeccion || '');
      comp.set('proximaInspeccion', data.proximaInspeccion || '');
      comp.set('responsable', (data.responsable || '').trim());
      comp.set('garantiaInicio', data.garantiaInicio || '');
      comp.set('garantiaFinal', data.garantiaFinal || '');
      comp.set('fechaBaja', data.fechaBaja || '');
      comp.set('activo', data.activo !== false);
      comp.set('archivos', []);
      comp.set('creadoPor', currentUser.id);

      await comp.save(null, { useMasterKey: true });
      created++;
    } catch (err) {
      errors++;
    }
  }

  return { created, errors, total: items.length };
});

/**
 * Exporta todos los componentes de infraestructura que coincidan con los filtros (sin paginacion).
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('exportarInventarioInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    sistema,
    ubicacion,
    estado,
    criticidad,
    busqueda,
    convenio,
  } = request.params || {};

  try {
    const query = new Parse.Query('InventarioInfraestructura');

    if (sistema) query.equalTo('sistema', sistema);
    if (ubicacion) query.equalTo('ubicacion', ubicacion);
    if (estado) query.equalTo('estado', estado);
    if (criticidad) query.equalTo('criticidad', criticidad);
    if (convenio === 'con_convenio') query.equalTo('convenioActivo', true);
    if (convenio === 'sin_convenio') query.notEqualTo('convenioActivo', true);
    if (busqueda && busqueda.trim().length > 0) {
      const term = busqueda.trim();
      const qCod = new Parse.Query('InventarioInfraestructura');
      qCod.contains('codigoInterno', term);
      const qComp = new Parse.Query('InventarioInfraestructura');
      qComp.contains('componente', term);
      const qDesc = new Parse.Query('InventarioInfraestructura');
      qDesc.contains('descripcion', term);
      const orQ = Parse.Query.or(qCod, qComp, qDesc);
      if (sistema) orQ.equalTo('sistema', sistema);
      if (ubicacion) orQ.equalTo('ubicacion', ubicacion);
      if (estado) orQ.equalTo('estado', estado);
      if (criticidad) orQ.equalTo('criticidad', criticidad);
      if (convenio === 'con_convenio') orQ.equalTo('convenioActivo', true);
      if (convenio === 'sin_convenio') orQ.notEqualTo('convenioActivo', true);
      orQ.ascending('codigoInterno');
      orQ.limit(10000);
      const results = await orQ.find({ useMasterKey: true });
      return {
        results: results.map(item => ({
          id: item.id,
          sistema: item.get('sistema'),
          componente: item.get('componente'),
          ubicacion: item.get('ubicacion'),
          descripcion: item.get('descripcion'),
          marca: item.get('marca'),
          modelo: item.get('modelo'),
          serie: item.get('serie'),
          codigoInterno: item.get('codigoInterno'),
          capacidad: item.get('capacidad'),
          fechaInstalacion: item.get('fechaInstalacion'),
          vidaUtil: item.get('vidaUtil'),
          estado: item.get('estado'),
          criticidad: item.get('criticidad'),
          frecuencia: item.get('frecuencia'),
          normativaAplicable: item.get('normativaAplicable'),
          fechaUltimaInspeccion: item.get('fechaUltimaInspeccion'),
          proximaInspeccion: item.get('proximaInspeccion'),
          responsable: item.get('responsable'),
          garantiaInicio: item.get('garantiaInicio'),
          garantiaFinal: item.get('garantiaFinal'),
          fechaBaja: item.get('fechaBaja'),
          activo: item.get('activo'),
          convenioActivo: item.get('convenioActivo') || false,
          proveedorRut: item.get('proveedorRut') || '',
          proveedorNombre: item.get('proveedorNombre') || '',
          numeroLicitacion: item.get('numeroLicitacion') || '',
          fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
          // Etapa 1 — Cumplimiento de mantenimiento
          ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
          ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
          ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
          proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
          periodosEsperados: item.get('periodosEsperados') || 0,
          periodosCumplidos: item.get('periodosCumplidos') || 0,
          periodosFaltantes: item.get('periodosFaltantes') || 0,
          cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
          estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      };
    }

    query.ascending('codigoInterno');
    query.limit(10000);

    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        sistema: item.get('sistema'),
        componente: item.get('componente'),
        ubicacion: item.get('ubicacion'),
        descripcion: item.get('descripcion'),
        marca: item.get('marca'),
        modelo: item.get('modelo'),
        serie: item.get('serie'),
        codigoInterno: item.get('codigoInterno'),
        capacidad: item.get('capacidad'),
        fechaInstalacion: item.get('fechaInstalacion'),
        vidaUtil: item.get('vidaUtil'),
        estado: item.get('estado'),
        criticidad: item.get('criticidad'),
        frecuencia: item.get('frecuencia'),
        normativaAplicable: item.get('normativaAplicable'),
        fechaUltimaInspeccion: item.get('fechaUltimaInspeccion'),
        proximaInspeccion: item.get('proximaInspeccion'),
        responsable: item.get('responsable'),
        garantiaInicio: item.get('garantiaInicio'),
        garantiaFinal: item.get('garantiaFinal'),
        fechaBaja: item.get('fechaBaja'),
        activo: item.get('activo'),
        convenioActivo: item.get('convenioActivo') || false,
        proveedorRut: item.get('proveedorRut') || '',
        proveedorNombre: item.get('proveedorNombre') || '',
        numeroLicitacion: item.get('numeroLicitacion') || '',
        fechaTerminoConvenio: item.get('fechaTerminoConvenio') || '',
        // Etapa 1 — Cumplimiento de mantenimiento
        ultimaFechaMantenimiento: item.get('ultimaFechaMantenimiento') || '',
        ultimoTipoMantenimiento: item.get('ultimoTipoMantenimiento') || '',
        ultimoEstadoMantenimiento: item.get('ultimoEstadoMantenimiento') || 'sin_historial',
        proximaFechaMantenimientoEsperada: item.get('proximaFechaMantenimientoEsperada') || '',
        periodosEsperados: item.get('periodosEsperados') || 0,
        periodosCumplidos: item.get('periodosCumplidos') || 0,
        periodosFaltantes: item.get('periodosFaltantes') || 0,
        cumplimientoPorcentaje: item.get('cumplimientoPorcentaje') || 0,
        estadoCumplimientoMantenimiento: item.get('estadoCumplimientoMantenimiento') || 'sin_configuracion',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al exportar inventario infraestructura: ${error.message}`);
  }
});

/**
 * Obtiene el historial de cambios de un componente de infraestructura.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getInventarioInfraHistorial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { componenteId, limit = 20, skip = 0 } = request.params;
  if (!componenteId) {
    throw new Parse.Error(400, 'Se requiere el ID del componente');
  }

  try {
    // Etapa 6: incluir historial de versiones previas (identidad de negocio)
    const ids = await _resolverIdsActivoPorIdentidad('InventarioInfraestructura', componenteId);

    const query = new Parse.Query('InfraestructuraHistorial');
    if (ids.length === 1) query.equalTo('componenteId', ids[0]);
    else query.containedIn('componenteId', ids);
    query.descending('createdAt');
    query.limit(limit);
    query.skip(skip);

    const total = await query.count({ useMasterKey: true });
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        componenteId: item.get('componenteId'),
        accion: item.get('accion'),
        cambios: item.get('cambios'),
        descripcion: item.get('descripcion'),
        usuarioId: item.get('usuarioId'),
        usuarioNombre: item.get('usuarioNombre'),
        archivoNombre: item.get('archivoNombre'),
        archivoUrl: item.get('archivoUrl'),
        createdAt: item.createdAt,
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener historial infraestructura: ${error.message}`);
  }
});

/**
 * Adjunta un archivo a un componente de infraestructura del inventario.
 * Requiere accessLevel >= 2 (operador).
 */
Parse.Cloud.define('adjuntarArchivoInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { componenteId, fileName, fileUrl, categoria } = request.params;
  if (!componenteId || !fileName || !fileUrl) {
    throw new Parse.Error(400, 'Se requieren componenteId, fileName y fileUrl');
  }

  try {
    const query = new Parse.Query('InventarioInfraestructura');
    const comp = await query.get(componenteId, { useMasterKey: true });

    const archivoData = {
      nombre: fileName,
      url: fileUrl,
      tipo: fileName.split('.').pop() || 'desconocido',
      categoria: categoria || 'otro',
      subidoPor: currentUser.get('displayName') || currentUser.get('nombre') || currentUser.getUsername(),
      fecha: new Date().toISOString(),
    };

    const archivos = comp.get('archivos') || [];
    archivos.push(archivoData);
    comp.set('archivos', archivos);
    await comp.save(null, { useMasterKey: true });

    // Registrar en historial
    const categoriaLabels = {
      adquisicion: 'Acta de adquisicion',
      baja: 'Acta de baja',
      garantia: 'Garantia',
      manual: 'Manual tecnico',
      certificacion: 'Certificacion',
      mantencion: 'Informe de mantencion',
      inspeccion: 'Informe de inspeccion',
      plano: 'Plano o diagrama',
      normativa: 'Documento normativo',
      otro: 'Otro',
    };
    const catLabel = categoriaLabels[categoria] || categoria || 'Otro';
    await registrarHistorialInfra(
      componenteId,
      'archivo_adjunto',
      {},
      `Archivo "${fileName}" adjuntado (${catLabel})`,
      currentUser,
      { nombre: fileName, url: fileUrl }
    );

    return archivoData;
  } catch (error) {
    throw new Parse.Error(500, `Error al adjuntar archivo: ${error.message}`);
  }
});

/**
 * Elimina un archivo adjunto de un componente de infraestructura del inventario.
 * Requiere accessLevel >= 3 (coordinador).
 */
Parse.Cloud.define('eliminarArchivoInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { componenteId, fileName, fileUrl } = request.params;
  if (!componenteId || !fileName) {
    throw new Parse.Error(400, 'Se requieren componenteId y fileName');
  }

  try {
    const query = new Parse.Query('InventarioInfraestructura');
    const comp = await query.get(componenteId, { useMasterKey: true });

    const archivos = comp.get('archivos') || [];
    const nuevosArchivos = archivos.filter(
      (a) => !(a.nombre === fileName && a.url === fileUrl)
    );
    comp.set('archivos', nuevosArchivos);
    await comp.save(null, { useMasterKey: true });

    // Registrar en historial
    await registrarHistorialInfra(
      componenteId,
      'archivo_eliminado',
      {},
      `Archivo "${fileName}" eliminado`,
      currentUser,
      { nombre: fileName, url: fileUrl }
    );

    return { success: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar archivo: ${error.message}`);
  }
});

/**
 * Obtiene los archivos adjuntos de un componente de infraestructura.
 * Requiere accessLevel >= 1 (visor).
 */
Parse.Cloud.define('getArchivosInfra', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { componenteId } = request.params;
  if (!componenteId) {
    throw new Parse.Error(400, 'Se requiere el ID del componente');
  }

  try {
    const query = new Parse.Query('InventarioInfraestructura');
    const comp = await query.get(componenteId, { useMasterKey: true });
    return comp.get('archivos') || [];
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener archivos: ${error.message}`);
  }
});

// ===============================================
// MODULO DE MANTENIMIENTO CENTRAL
// ===============================================

/**
 * Funcion auxiliar para registrar historial de acciones en MantenimientoHistorial.
 */
async function registrarHistorialMantenimiento(registroId, accion, descripcion, user, detalles, archivoInfo) {
  try {
    const HistorialClass = Parse.Object.extend('MantenimientoHistorial');
    const historial = new HistorialClass();
    historial.set('registroId', registroId);
    historial.set('accion', accion);
    historial.set('descripcion', descripcion);
    historial.set('usuarioId', user ? user.id : '');
    historial.set('usuarioNombre', user ? (user.get('displayName') || user.get('nombre') || user.getUsername()) : 'Sistema');
    if (detalles) {
      historial.set('detalles', detalles);
    }
    if (archivoInfo) {
      if (archivoInfo.nombre) historial.set('archivoNombre', archivoInfo.nombre);
      if (archivoInfo.url) historial.set('archivoUrl', archivoInfo.url);
    }
    await historial.save(null, { useMasterKey: true });
    return historial;
  } catch (error) {
    console.error('Error registrando historial de mantenimiento:', error.message);
  }
}

/**
 * Funcion auxiliar para serializar un objeto RegistroMantenimiento.
 */
function serializarRegistroMantenimiento(registro) {
  return {
    id: registro.id,
    dominio: registro.get('dominio'),
    tipoMantenimiento: registro.get('tipoMantenimiento'),
    clasificacionEquipo: registro.get('clasificacionEquipo'),
    activoId: registro.get('activoId'),
    activoClase: registro.get('activoClase'),
    activoResumen: registro.get('activoResumen'),
    fecha: registro.get('fecha'),
    checklist: registro.get('checklist'),
    fotosAdicionales: registro.get('fotosAdicionales'),
    observacionesGenerales: registro.get('observacionesGenerales'),
    proximoMantenimiento: registro.get('proximoMantenimiento'),
    tecnicoId: registro.get('tecnicoId'),
    tecnicoNombre: registro.get('tecnicoNombre'),
    firmaTecnico: registro.get('firmaTecnico'),
    estadoValidacion: registro.get('estadoValidacion'),
    validadorId: registro.get('validadorId'),
    validadorNombre: registro.get('validadorNombre'),
    firmaValidador: registro.get('firmaValidador'),
    fechaValidacion: registro.get('fechaValidacion'),
    motivoRechazo: registro.get('motivoRechazo'),
    registroAnteriorId: registro.get('registroAnteriorId'),
    archivos: registro.get('archivos'),
    creadoPor: registro.get('creadoPor'),
    activo: registro.get('activo'),
    // Etapa 7 — campos de retroactividad
    esRetroactivo: registro.get('esRetroactivo') || false,
    motivoRetroactivo: registro.get('motivoRetroactivo') || '',
    periodoIndice: registro.get('periodoIndice'),
    createdAt: registro.createdAt,
    updatedAt: registro.updatedAt,
  };
}

// -----------------------------------------------
// buscarActivoMantenimiento — OPERATOR (2)
// Busca activos en la clase correspondiente al dominio
// -----------------------------------------------
Parse.Cloud.define('buscarActivoMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { dominio, busqueda } = request.params;
  if (!dominio) {
    throw new Parse.Error(400, 'Se requiere el dominio');
  }
  if (!busqueda || !busqueda.trim()) {
    throw new Parse.Error(400, 'Se requiere el termino de busqueda');
  }

  const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
  const termRaw = busqueda.trim().toLowerCase();
  const termNorm = normalize(busqueda.trim());

  try {
    let className;
    let searchFields;
    let mapFn;

    switch (dominio) {
      case 'equipoMedico':
        className = 'InventarioEquipoMedico';
        searchFields = ['inventario', 'serie', 'nombreEquipo'];
        mapFn = (item) => ({
          id: item.id,
          clase: 'InventarioEquipoMedico',
          nombre: item.get('nombreEquipo') || '',
          identificador: [item.get('serie'), item.get('inventario')].filter(Boolean).join(' / '),
          estado: item.get('estado') || '',
          ubicacion: item.get('servicio') || '',
          clasificacion: item.get('nombreEquipo') || '',
          pautaAsignada: item.get('pautaAsignada') || '',
        });
        break;

      case 'equipoIndustrial':
        className = 'InventarioEquipoIndustrial';
        searchFields = ['inventario', 'serie', 'nombreEquipo'];
        mapFn = (item) => ({
          id: item.id,
          clase: 'InventarioEquipoIndustrial',
          nombre: item.get('nombreEquipo') || '',
          identificador: [item.get('serie'), item.get('inventario')].filter(Boolean).join(' / '),
          estado: item.get('estado') || '',
          ubicacion: item.get('ubicacion') || '',
          clasificacion: item.get('tipoEquipo') || '',
          pautaAsignada: item.get('pautaAsignada') || '',
        });
        break;

      case 'flotaVehicular':
        className = 'InventarioFlotaVehicular';
        searchFields = ['patente', 'numeroInterno', 'nombreVehiculo', 'vin'];
        mapFn = (item) => ({
          id: item.id,
          clase: 'InventarioFlotaVehicular',
          nombre: item.get('nombreVehiculo') || '',
          identificador: [item.get('patente'), item.get('numeroInterno')].filter(Boolean).join(' / '),
          estado: item.get('estado') || '',
          ubicacion: item.get('asignadoA') || '',
          clasificacion: item.get('tipoVehiculo') || '',
          pautaAsignada: item.get('pautaAsignada') || '',
        });
        break;

      case 'infraestructura':
        className = 'InventarioInfraestructura';
        searchFields = ['codigoInterno', 'componente', 'descripcion'];
        mapFn = (item) => ({
          id: item.id,
          clase: 'InventarioInfraestructura',
          nombre: item.get('componente') || '',
          identificador: [item.get('codigoInterno'), item.get('componente')].filter(Boolean).join(' / '),
          estado: item.get('estado') || '',
          ubicacion: item.get('ubicacion') || '',
          clasificacion: item.get('sistema') || '',
          pautaAsignada: item.get('pautaAsignada') || '',
        });
        break;

      default:
        throw new Parse.Error(400, `Dominio no valido: ${dominio}`);
    }

    const query = new Parse.Query(className);
    query.equalTo('activo', true);
    query.limit(10000);
    const allResults = await query.find({ useMasterKey: true });

    const filtered = allResults.filter((item) => {
      for (const field of searchFields) {
        const valRaw = (item.get(field) || '').toLowerCase();
        const valNorm = normalize(item.get(field));
        if (valRaw.includes(termRaw) || valNorm.includes(termNorm)) {
          return true;
        }
      }
      return false;
    });

    return filtered.slice(0, 20).map(mapFn);
  } catch (error) {
    throw new Parse.Error(500, `Error al buscar activo: ${error.message}`);
  }
});

// -----------------------------------------------
// crearRegistroMantenimiento — OPERATOR (2)
// -----------------------------------------------
Parse.Cloud.define('crearRegistroMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { data } = request.params;
  if (!data) {
    throw new Parse.Error(400, 'Se requieren los datos del mantenimiento');
  }

  const dominiosValidos = ['equipoMedico', 'equipoIndustrial', 'flotaVehicular', 'infraestructura'];
  if (!data.dominio || !dominiosValidos.includes(data.dominio)) {
    throw new Parse.Error(400, 'El dominio es obligatorio y debe ser valido');
  }
  const tiposValidos = ['preventivo', 'correctivo', 'predictivo'];
  if (!data.tipoMantenimiento || !tiposValidos.includes(data.tipoMantenimiento)) {
    throw new Parse.Error(400, 'El tipo de mantenimiento es obligatorio y debe ser valido');
  }
  if (!data.activoId || !data.activoId.trim()) {
    throw new Parse.Error(400, 'El ID del activo es obligatorio');
  }
  if (!data.fecha || !data.fecha.trim()) {
    throw new Parse.Error(400, 'La fecha es obligatoria');
  }
  // Etapa 8 — defensa en profundidad: la fecha no puede ser futura.
  // Calculamos "hoy" en zona horaria America/Santiago para que coincida con la
  // hora local del usuario. El servidor corre en UTC y, sin esto, rechazaria
  // erroneamente registros enviados despues de las 21:00 hora Chile.
  let hoyStrBackend;
  try {
    hoyStrBackend = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  } catch (e) {
    hoyStrBackend = new Date().toISOString().slice(0, 10);
  }
  if (data.fecha.trim() > hoyStrBackend) {
    throw new Parse.Error(400, `La fecha del mantenimiento no puede ser futura (recibida: ${data.fecha}, hoy en Chile: ${hoyStrBackend})`);
  }
  if (!data.checklist || !data.checklist.items || !Array.isArray(data.checklist.items) || data.checklist.items.length === 0) {
    throw new Parse.Error(400, 'El checklist debe contener al menos un item');
  }
  if (!data.firmaTecnicoUrl || !data.firmaTecnicoUrl.trim()) {
    throw new Parse.Error(400, 'La firma del tecnico es obligatoria');
  }

  try {
    const RegistroClass = Parse.Object.extend('RegistroMantenimiento');
    const registro = new RegistroClass();

    registro.set('dominio', data.dominio);
    registro.set('tipoMantenimiento', data.tipoMantenimiento);
    registro.set('clasificacionEquipo', (data.clasificacionEquipo || '').trim());
    registro.set('activoId', data.activoId.trim());
    registro.set('activoClase', (data.activoClase || '').trim());
    registro.set('activoResumen', data.activoResumen || {});
    registro.set('fecha', data.fecha.trim());
    registro.set('checklist', data.checklist);
    registro.set('fotosAdicionales', data.fotosAdicionales || {});
    registro.set('observacionesGenerales', (data.observacionesGenerales || '').trim());
    registro.set('proximoMantenimiento', data.proximoMantenimiento || '');
    registro.set('tecnicoId', currentUser.id);
    registro.set('tecnicoNombre', currentUser.get('displayName') || currentUser.get('nombre') || currentUser.getUsername());
    registro.set('firmaTecnico', data.firmaTecnicoUrl.trim());
    registro.set('estadoValidacion', 'pendiente');
    registro.set('archivos', []);
    registro.set('creadoPor', currentUser.id);
    registro.set('activo', true);

    if (data.registroAnteriorId) {
      registro.set('registroAnteriorId', data.registroAnteriorId);
    }

    // Etapa 7 — Soporte de mantenimientos retroactivos
    // Calcula esRetroactivo automaticamente si la fecha del mantenimiento
    // es anterior a hoy en mas de N dias (default 7).
    const UMBRAL_RETROACTIVO_DIAS = 7;
    const cumplUtils = require('./utils/cumplimientoMantenimiento');
    const fechaMtto = cumplUtils.parseFecha(data.fecha);
    const hoyUTC = new Date();
    const hoyMidnight = new Date(Date.UTC(hoyUTC.getUTCFullYear(), hoyUTC.getUTCMonth(), hoyUTC.getUTCDate()));
    let esRetroactivoCalculado = data.esRetroactivo === true;
    let diasDeRetraso = 0;
    if (fechaMtto) {
      diasDeRetraso = cumplUtils.diffDias(hoyMidnight, fechaMtto);
      if (diasDeRetraso > UMBRAL_RETROACTIVO_DIAS) {
        esRetroactivoCalculado = true;
      }
    }
    // Si es retroactivo, motivoRetroactivo es obligatorio
    const motivoRetroactivoNorm = (data.motivoRetroactivo || '').trim();
    if (esRetroactivoCalculado && !motivoRetroactivoNorm) {
      throw new Parse.Error(
        400,
        `Se requiere motivoRetroactivo cuando el mantenimiento es retroactivo (fecha con ${diasDeRetraso} dias de retraso)`
      );
    }
    registro.set('esRetroactivo', esRetroactivoCalculado);
    if (motivoRetroactivoNorm) registro.set('motivoRetroactivo', motivoRetroactivoNorm);

    // Calculo automatico de periodoIndice (Etapa 7.3.5)
    // Solo si tenemos activoId + activoClase para resolver la fechaBase
    if (fechaMtto && data.activoId && data.activoClase && cumplUtils.DOMINIO_POR_CLASE[data.activoClase]) {
      try {
        const qActivo = new Parse.Query(data.activoClase);
        const activoObj = await qActivo.get(data.activoId, { useMasterKey: true });
        const campoBase = cumplUtils.campoFechaBase(data.activoClase);
        const fechaBaseStr = campoBase ? activoObj.get(campoBase) : null;
        const fechaBase = cumplUtils.parseFecha(fechaBaseStr);
        const frecuencia = cumplUtils.obtenerFrecuenciaActivo(activoObj);
        if (fechaBase && frecuencia > 0) {
          // Validar que la fecha cae dentro de [fechaBase, hoy]
          if (fechaMtto.getTime() < fechaBase.getTime()) {
            throw new Parse.Error(
              400,
              `La fecha del mantenimiento (${data.fecha}) es anterior a la fecha base del activo (${fechaBaseStr})`
            );
          }
          // Calcular el indice del periodo: floor((fechaMtto - fechaBase) / frecuencia meses)
          const mesesDiff =
            (fechaMtto.getUTCFullYear() - fechaBase.getUTCFullYear()) * 12 +
            (fechaMtto.getUTCMonth() - fechaBase.getUTCMonth());
          const periodoIdx = Math.max(0, Math.floor(mesesDiff / frecuencia));
          registro.set('periodoIndice', periodoIdx);
        }
      } catch (errPeriodo) {
        if (errPeriodo instanceof Parse.Error) throw errPeriodo;
        // Otros errores (activo no existe) no bloquean: el registro se crea sin periodoIndice
        console.warn('[Etapa 7] no se pudo calcular periodoIndice:', errPeriodo && errPeriodo.message);
      }
    }
    // Permite override manual del periodoIndice si viene en data (caso retroactivo desde timeline)
    if (Number.isFinite(parseInt(data.periodoIndice, 10))) {
      registro.set('periodoIndice', parseInt(data.periodoIndice, 10));
    }

    await registro.save(null, { useMasterKey: true });

    // Registrar historial
    const activoNombre = (data.activoResumen && data.activoResumen.nombre) || data.activoId;
    await registrarHistorialMantenimiento(
      registro.id,
      'creacion',
      `Registro de mantenimiento ${data.tipoMantenimiento} creado para "${activoNombre}"`,
      currentUser,
      { dominio: data.dominio, tipoMantenimiento: data.tipoMantenimiento },
      null
    );

    // Etapa 5 — Sincronizacion inmediata del inventario tras crear el registro.
    // Aunque el trigger afterSave tambien lo dispara, esta llamada sincrona
    // garantiza que el campo `ultimaFechaMantenimiento` quede actualizado en el
    // mismo ciclo del request. Falla silenciosa para no bloquear al tecnico.
    try {
      if (data.activoId && data.activoClase) {
        const cumpl = require('./utils/cumplimientoMantenimiento');
        if (cumpl.DOMINIO_POR_CLASE[data.activoClase]) {
          const r = await cumpl.sincronizarActivoParse(Parse, data.activoId, data.activoClase, { persistir: true });
          if (!r.ok) {
            console.warn(`[Etapa 5] sync inventario fallo para ${data.activoClase}:${data.activoId} -> ${r.error}`);
          }
        }
      }
    } catch (syncErr) {
      console.warn('[Etapa 5] excepcion al sincronizar tras crear registro:', syncErr && syncErr.message);
    }

    return serializarRegistroMantenimiento(registro);
  } catch (error) {
    throw new Parse.Error(500, `Error al crear registro de mantenimiento: ${error.message}`);
  }
});

// -----------------------------------------------
// getRegistrosMantenimiento — VIEWER (1)
// Lista paginada con filtros
// -----------------------------------------------
Parse.Cloud.define('getRegistrosMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    dominio,
    tipoMantenimiento,
    estadoValidacion,
    fechaDesde,
    fechaHasta,
    busqueda,
    registroId,
    tecnicoNombre,
    limit = 20,
    skip = 0,
  } = request.params || {};

  try {
    // Filtro directo por ID de pauta (objectId) — atajo
    if (registroId && registroId.trim().length > 0) {
      try {
        const directQuery = new Parse.Query('RegistroMantenimiento');
        directQuery.equalTo('activo', true);
        const found = await directQuery.get(registroId.trim(), { useMasterKey: true });
        return {
          results: found ? [serializarRegistroMantenimiento(found)] : [],
          total: found ? 1 : 0,
        };
      } catch (e) {
        return { results: [], total: 0 };
      }
    }

    const query = new Parse.Query('RegistroMantenimiento');
    query.equalTo('activo', true);

    if (dominio) query.equalTo('dominio', dominio);
    if (tipoMantenimiento) query.equalTo('tipoMantenimiento', tipoMantenimiento);
    if (estadoValidacion) query.equalTo('estadoValidacion', estadoValidacion);
    if (fechaDesde) query.greaterThanOrEqualTo('fecha', fechaDesde);
    if (fechaHasta) query.lessThanOrEqualTo('fecha', fechaHasta);
    if (tecnicoNombre && tecnicoNombre.trim().length > 0) {
      query.contains('tecnicoNombre', tecnicoNombre.trim());
    }

    if (busqueda && busqueda.trim().length > 0) {
      const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
      const termRaw = busqueda.trim().toLowerCase();
      const termNorm = normalize(busqueda.trim());

      // Busqueda en memoria para soportar normalizacion
      const baseQuery = new Parse.Query('RegistroMantenimiento');
      baseQuery.equalTo('activo', true);
      if (dominio) baseQuery.equalTo('dominio', dominio);
      if (tipoMantenimiento) baseQuery.equalTo('tipoMantenimiento', tipoMantenimiento);
      if (estadoValidacion) baseQuery.equalTo('estadoValidacion', estadoValidacion);
      if (fechaDesde) baseQuery.greaterThanOrEqualTo('fecha', fechaDesde);
      if (fechaHasta) baseQuery.lessThanOrEqualTo('fecha', fechaHasta);
      baseQuery.descending('fecha');
      baseQuery.limit(10000);

      const allResults = await baseQuery.find({ useMasterKey: true });

      const filtered = allResults.filter((item) => {
        const tecNombre = (item.get('tecnicoNombre') || '').toLowerCase();
        const resumen = item.get('activoResumen') || {};
        const activoNombre = (resumen.nombre || '').toLowerCase();
        const activoIdent = (resumen.identificador || '').toLowerCase();
        const clasificacion = (item.get('clasificacionEquipo') || '').toLowerCase();

        const tecNorm = normalize(item.get('tecnicoNombre'));
        const nombreNorm = normalize(resumen.nombre);
        const identNorm = normalize(resumen.identificador);
        const clasNorm = normalize(item.get('clasificacionEquipo'));

        return tecNombre.includes(termRaw) || activoNombre.includes(termRaw) ||
               activoIdent.includes(termRaw) || clasificacion.includes(termRaw) ||
               tecNorm.includes(termNorm) || nombreNorm.includes(termNorm) ||
               identNorm.includes(termNorm) || clasNorm.includes(termNorm);
      });

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return {
        results: paged.map(serializarRegistroMantenimiento),
        total,
      };
    }

    query.descending('fecha');
    const total = await query.count({ useMasterKey: true });
    query.limit(limit);
    query.skip(skip);
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(serializarRegistroMantenimiento),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener registros de mantenimiento: ${error.message}`);
  }
});

// -----------------------------------------------
// getRegistroMantenimientoById — VIEWER (1)
// -----------------------------------------------
Parse.Cloud.define('getRegistroMantenimientoById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del registro');
  }

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    const registro = await query.get(id, { useMasterKey: true });
    return serializarRegistroMantenimiento(registro);
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener registro de mantenimiento: ${error.message}`);
  }
});

// -----------------------------------------------
// aprobarMantenimiento — ADMIN (4)
// -----------------------------------------------
Parse.Cloud.define('aprobarMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador o superior');
  }

  const { id, firmaValidadorUrl } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del registro');
  }
  if (!firmaValidadorUrl || !firmaValidadorUrl.trim()) {
    throw new Parse.Error(400, 'La firma del validador es obligatoria');
  }

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    const registro = await query.get(id, { useMasterKey: true });

    if (registro.get('estadoValidacion') !== 'pendiente') {
      throw new Parse.Error(400, 'Solo se pueden aprobar registros en estado pendiente');
    }

    const validadorNombre = currentUser.get('displayName') || currentUser.get('nombre') || currentUser.getUsername();

    registro.set('estadoValidacion', 'aprobado');
    registro.set('validadorId', currentUser.id);
    registro.set('validadorNombre', validadorNombre);
    registro.set('firmaValidador', firmaValidadorUrl.trim());
    registro.set('fechaValidacion', new Date().toISOString());

    await registro.save(null, { useMasterKey: true });

    await registrarHistorialMantenimiento(
      registro.id,
      'aprobado',
      `Registro aprobado por ${validadorNombre}`,
      currentUser,
      null,
      null
    );

    // Etapa 6 — Sincronizar inventario tras aprobacion.
    // El registro pasa de pendiente a aprobado: cierra el periodo correspondiente
    // y la metrica de cumplimiento sube. Falla silenciosa para no bloquear al admin.
    try {
      const activoId = registro.get('activoId');
      const activoClase = registro.get('activoClase');
      if (activoId && activoClase) {
        const cumpl = require('./utils/cumplimientoMantenimiento');
        if (cumpl.DOMINIO_POR_CLASE[activoClase]) {
          const r = await cumpl.sincronizarActivoParse(Parse, activoId, activoClase, { persistir: true });
          if (!r.ok) {
            console.warn(`[Etapa 6] sync inventario fallo tras aprobar ${activoClase}:${activoId} -> ${r.error}`);
          }
        }
      }
    } catch (syncErr) {
      console.warn('[Etapa 6] excepcion al sincronizar tras aprobar:', syncErr && syncErr.message);
    }

    return serializarRegistroMantenimiento(registro);
  } catch (error) {
    throw new Parse.Error(500, `Error al aprobar mantenimiento: ${error.message}`);
  }
});

// -----------------------------------------------
// rechazarMantenimiento — ADMIN (4)
// -----------------------------------------------
Parse.Cloud.define('rechazarMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 4) {
    throw new Parse.Error(403, 'Se requieren permisos de administrador o superior');
  }

  const { id, motivoRechazo } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del registro');
  }
  if (!motivoRechazo || !motivoRechazo.trim()) {
    throw new Parse.Error(400, 'El motivo del rechazo es obligatorio');
  }

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    const registro = await query.get(id, { useMasterKey: true });

    if (registro.get('estadoValidacion') !== 'pendiente') {
      throw new Parse.Error(400, 'Solo se pueden rechazar registros en estado pendiente');
    }

    const validadorNombre = currentUser.get('displayName') || currentUser.get('nombre') || currentUser.getUsername();

    registro.set('estadoValidacion', 'rechazado');
    registro.set('motivoRechazo', motivoRechazo.trim());
    registro.set('validadorId', currentUser.id);
    registro.set('validadorNombre', validadorNombre);
    registro.set('fechaValidacion', new Date().toISOString());

    await registro.save(null, { useMasterKey: true });

    await registrarHistorialMantenimiento(
      registro.id,
      'rechazado',
      `Registro rechazado por ${validadorNombre}: ${motivoRechazo.trim()}`,
      currentUser,
      { motivoRechazo: motivoRechazo.trim() },
      null
    );

    // Etapa 6 — Sincronizar inventario tras rechazo (REVERSION AUTOMATICA).
    // Si el registro rechazado era la "ultima mantencion visible", el inventario
    // debe apuntar al siguiente no-rechazado mas reciente (pendiente o aprobado),
    // o quedar en sin_historial si no hay otro. Idempotente: depende del estado
    // actual de RegistroMantenimiento. Falla silenciosa para no bloquear al admin.
    let sincResult = null;
    try {
      const activoId = registro.get('activoId');
      const activoClase = registro.get('activoClase');
      if (activoId && activoClase) {
        const cumpl = require('./utils/cumplimientoMantenimiento');
        if (cumpl.DOMINIO_POR_CLASE[activoClase]) {
          sincResult = await cumpl.sincronizarActivoParse(Parse, activoId, activoClase, { persistir: true });
          if (!sincResult.ok) {
            console.warn(`[Etapa 6] sync inventario fallo tras rechazar ${activoClase}:${activoId} -> ${sincResult.error}`);
          }
        }
      }
    } catch (syncErr) {
      console.warn('[Etapa 6] excepcion al sincronizar tras rechazar:', syncErr && syncErr.message);
    }

    // Anexar al response los nuevos valores del activo para que el cliente pueda
    // refrescar la UI sin recargar (opcional, no rompe contrato si esta vacio)
    const responseRegistro = serializarRegistroMantenimiento(registro);
    if (sincResult && sincResult.ok) {
      responseRegistro._inventarioActualizado = {
        ultimaFechaMantenimiento: sincResult.resultado.ultimaFechaMantenimiento,
        ultimoEstadoMantenimiento: sincResult.resultado.ultimoEstadoMantenimiento,
        ultimoRegistroId: sincResult.resultado.ultimoRegistroId,
        estadoCumplimiento: sincResult.resultado.estadoCumplimiento,
      };
    }

    return responseRegistro;
  } catch (error) {
    throw new Parse.Error(500, `Error al rechazar mantenimiento: ${error.message}`);
  }
});

// -----------------------------------------------
// getMantenimientoHistorial — VIEWER (1)
// -----------------------------------------------
Parse.Cloud.define('getMantenimientoHistorial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { registroId, limit = 20, skip = 0 } = request.params;
  if (!registroId) {
    throw new Parse.Error(400, 'Se requiere el ID del registro');
  }

  try {
    const query = new Parse.Query('MantenimientoHistorial');
    query.equalTo('registroId', registroId);
    query.descending('createdAt');

    const total = await query.count({ useMasterKey: true });
    query.limit(limit);
    query.skip(skip);
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map((item) => ({
        id: item.id,
        registroId: item.get('registroId'),
        accion: item.get('accion'),
        descripcion: item.get('descripcion'),
        usuarioId: item.get('usuarioId'),
        usuarioNombre: item.get('usuarioNombre'),
        detalles: item.get('detalles'),
        archivoNombre: item.get('archivoNombre'),
        archivoUrl: item.get('archivoUrl'),
        createdAt: item.createdAt,
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener historial de mantenimiento: ${error.message}`);
  }
});

// -----------------------------------------------
// adjuntarArchivoMantenimiento — OPERATOR (2)
// -----------------------------------------------
Parse.Cloud.define('adjuntarArchivoMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) {
    throw new Parse.Error(403, 'Se requieren permisos de operador o superior');
  }

  const { registroId, fileName, fileUrl, categoria } = request.params;
  if (!registroId || !fileName || !fileUrl) {
    throw new Parse.Error(400, 'Se requieren registroId, fileName y fileUrl');
  }

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    const registro = await query.get(registroId, { useMasterKey: true });

    const archivoData = {
      nombre: fileName,
      url: fileUrl,
      tipo: fileName.split('.').pop() || 'desconocido',
      categoria: categoria || 'otro',
      subidoPor: currentUser.get('displayName') || currentUser.get('nombre') || currentUser.getUsername(),
      fecha: new Date().toISOString(),
    };

    const archivos = registro.get('archivos') || [];
    archivos.push(archivoData);
    registro.set('archivos', archivos);
    await registro.save(null, { useMasterKey: true });

    const categoriaLabels = {
      adquisicion: 'Acta de adquisicion',
      informe: 'Informe tecnico',
      evidencia: 'Evidencia fotografica',
      otro: 'Otro',
    };
    const catLabel = categoriaLabels[categoria] || categoria || 'Otro';
    await registrarHistorialMantenimiento(
      registroId,
      'archivo_adjunto',
      `Archivo "${fileName}" adjuntado (${catLabel})`,
      currentUser,
      null,
      { nombre: fileName, url: fileUrl }
    );

    return archivoData;
  } catch (error) {
    throw new Parse.Error(500, `Error al adjuntar archivo: ${error.message}`);
  }
});

// -----------------------------------------------
// eliminarArchivoMantenimiento — COORDINATOR (3)
// -----------------------------------------------
Parse.Cloud.define('eliminarArchivoMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const { registroId, fileName, fileUrl } = request.params;
  if (!registroId || !fileName) {
    throw new Parse.Error(400, 'Se requieren registroId y fileName');
  }

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    const registro = await query.get(registroId, { useMasterKey: true });

    const archivos = registro.get('archivos') || [];
    const nuevosArchivos = archivos.filter(
      (a) => !(a.nombre === fileName && a.url === fileUrl)
    );
    registro.set('archivos', nuevosArchivos);
    await registro.save(null, { useMasterKey: true });

    await registrarHistorialMantenimiento(
      registroId,
      'archivo_eliminado',
      `Archivo "${fileName}" eliminado`,
      currentUser,
      null,
      { nombre: fileName, url: fileUrl }
    );

    return { success: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar archivo: ${error.message}`);
  }
});

// -----------------------------------------------
// getArchivosMantenimiento — VIEWER (1)
// -----------------------------------------------
Parse.Cloud.define('getArchivosMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { registroId } = request.params;
  if (!registroId) {
    throw new Parse.Error(400, 'Se requiere el ID del registro');
  }

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    const registro = await query.get(registroId, { useMasterKey: true });
    return registro.get('archivos') || [];
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener archivos: ${error.message}`);
  }
});

// -----------------------------------------------
// deleteRegistroMantenimiento — SUPER_ADMIN (5)
// -----------------------------------------------
Parse.Cloud.define('deleteRegistroMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 5) {
    throw new Parse.Error(403, 'Se requieren permisos de super administrador');
  }

  const { id } = request.params;
  if (!id) {
    throw new Parse.Error(400, 'Se requiere el ID del registro');
  }

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    const registro = await query.get(id, { useMasterKey: true });

    // Registrar historial antes de eliminar
    const activoResumen = registro.get('activoResumen') || {};
    const activoNombre = activoResumen.nombre || registro.get('activoId');
    await registrarHistorialMantenimiento(
      registro.id,
      'eliminacion',
      `Registro de mantenimiento para "${activoNombre}" eliminado`,
      currentUser,
      {
        dominio: registro.get('dominio'),
        tipoMantenimiento: registro.get('tipoMantenimiento'),
        activoId: registro.get('activoId'),
      },
      null
    );

    await registro.destroy({ useMasterKey: true });

    return { success: true };
  } catch (error) {
    throw new Parse.Error(500, `Error al eliminar registro de mantenimiento: ${error.message}`);
  }
});

// -----------------------------------------------
// getBandejaValidacion — COORDINATOR (3)
// Igual que getRegistrosMantenimiento pero con contadores y default pendiente
// -----------------------------------------------
Parse.Cloud.define('getBandejaValidacion', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) {
    throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  }

  const {
    dominio,
    tipoMantenimiento,
    estadoValidacion,
    fechaDesde,
    fechaHasta,
    busqueda,
    limit = 20,
    skip = 0,
  } = request.params || {};

  // Default a pendiente si no se especifica
  const estadoFiltro = estadoValidacion || 'pendiente';

  try {
    // Contadores globales
    const baseCountQuery = new Parse.Query('RegistroMantenimiento');
    baseCountQuery.equalTo('activo', true);
    if (dominio) baseCountQuery.equalTo('dominio', dominio);
    if (tipoMantenimiento) baseCountQuery.equalTo('tipoMantenimiento', tipoMantenimiento);
    if (fechaDesde) baseCountQuery.greaterThanOrEqualTo('fecha', fechaDesde);
    if (fechaHasta) baseCountQuery.lessThanOrEqualTo('fecha', fechaHasta);

    const qPendientes = baseCountQuery.clone();
    qPendientes.equalTo('estadoValidacion', 'pendiente');
    const qAprobados = baseCountQuery.clone();
    qAprobados.equalTo('estadoValidacion', 'aprobado');
    const qRechazados = baseCountQuery.clone();
    qRechazados.equalTo('estadoValidacion', 'rechazado');

    const [pendientes, aprobados, rechazados] = await Promise.all([
      qPendientes.count({ useMasterKey: true }),
      qAprobados.count({ useMasterKey: true }),
      qRechazados.count({ useMasterKey: true }),
    ]);

    // Query principal con filtro de estado
    const query = new Parse.Query('RegistroMantenimiento');
    query.equalTo('activo', true);
    if (estadoFiltro !== 'todos') {
      query.equalTo('estadoValidacion', estadoFiltro);
    }
    if (dominio) query.equalTo('dominio', dominio);
    if (tipoMantenimiento) query.equalTo('tipoMantenimiento', tipoMantenimiento);
    if (fechaDesde) query.greaterThanOrEqualTo('fecha', fechaDesde);
    if (fechaHasta) query.lessThanOrEqualTo('fecha', fechaHasta);

    if (busqueda && busqueda.trim().length > 0) {
      const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
      const termRaw = busqueda.trim().toLowerCase();
      const termNorm = normalize(busqueda.trim());

      query.limit(10000);
      // Pendientes se muestran primero (mas antiguos), el resto por fecha desc
      if (estadoFiltro === 'pendiente') {
        query.ascending('fecha');
      } else {
        query.descending('fecha');
      }

      const allResults = await query.find({ useMasterKey: true });

      const filtered = allResults.filter((item) => {
        const tecNombre = (item.get('tecnicoNombre') || '').toLowerCase();
        const resumen = item.get('activoResumen') || {};
        const activoNombre = (resumen.nombre || '').toLowerCase();
        const activoIdent = (resumen.identificador || '').toLowerCase();

        const tecNorm = normalize(item.get('tecnicoNombre'));
        const nombreNorm = normalize(resumen.nombre);
        const identNorm = normalize(resumen.identificador);

        return tecNombre.includes(termRaw) || activoNombre.includes(termRaw) ||
               activoIdent.includes(termRaw) ||
               tecNorm.includes(termNorm) || nombreNorm.includes(termNorm) ||
               identNorm.includes(termNorm);
      });

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return {
        results: paged.map(serializarRegistroMantenimiento),
        total,
        pendientes,
        aprobados,
        rechazados,
      };
    }

    // Pendientes se muestran mas antiguos primero
    if (estadoFiltro === 'pendiente') {
      query.ascending('fecha');
    } else {
      query.descending('fecha');
    }

    const total = await query.count({ useMasterKey: true });
    query.limit(limit);
    query.skip(skip);
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(serializarRegistroMantenimiento),
      total,
      pendientes,
      aprobados,
      rechazados,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener bandeja de validacion: ${error.message}`);
  }
});

// -----------------------------------------------
// getEstadisticasMantenimiento — VIEWER (1)
// -----------------------------------------------
Parse.Cloud.define('getEstadisticasMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    query.equalTo('activo', true);
    query.limit(10000);
    const allResults = await query.find({ useMasterKey: true });

    const porEstado = {};
    const porDominio = {};
    const porTipo = {};

    for (const item of allResults) {
      const estado = item.get('estadoValidacion') || 'pendiente';
      const dominio = item.get('dominio') || 'desconocido';
      const tipo = item.get('tipoMantenimiento') || 'desconocido';

      porEstado[estado] = (porEstado[estado] || 0) + 1;
      porDominio[dominio] = (porDominio[dominio] || 0) + 1;
      porTipo[tipo] = (porTipo[tipo] || 0) + 1;
    }

    return {
      porEstado,
      porDominio,
      porTipo,
      total: allResults.length,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener estadisticas: ${error.message}`);
  }
});

// -----------------------------------------------
// getMantenimientosActivo — VIEWER (1)
// Todos los mantenimientos de un activo especifico
// -----------------------------------------------
Parse.Cloud.define('getMantenimientosActivo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const { activoId, activoClase } = request.params;
  if (!activoId) {
    throw new Parse.Error(400, 'Se requiere el ID del activo');
  }

  try {
    // Etapa 6 (revision-inventarios): buscar tambien por identidad de negocio
    // (serie/inventario/patente/codigoInterno) para incluir registros que
    // pertenecen a versiones anteriores del activo.
    let activoIds = [activoId];
    if (activoClase && _SOFT_DELETE_CLASES[activoClase]) {
      activoIds = await _resolverIdsActivoPorIdentidad(activoClase, activoId);
    }

    const query = new Parse.Query('RegistroMantenimiento');
    if (activoIds.length === 1) {
      query.equalTo('activoId', activoIds[0]);
    } else {
      query.containedIn('activoId', activoIds);
    }
    if (activoClase) {
      query.equalTo('activoClase', activoClase);
    }
    query.equalTo('activo', true);
    query.descending('fecha');
    query.limit(100);

    const results = await query.find({ useMasterKey: true });
    return results.map(serializarRegistroMantenimiento);
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener mantenimientos del activo: ${error.message}`);
  }
});

// -----------------------------------------------
// exportarRegistrosMantenimiento — VIEWER (1)
// Devuelve registros paginados en bloques de 1000 para exportacion a Excel.
// El frontend llama sucesivamente incrementando skip hasta obtener < pageSize.
// Incluye solo campos NO dinamicos (sin checklist/preguntas).
// -----------------------------------------------
Parse.Cloud.define('exportarRegistrosMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) {
    throw new Parse.Error(403, 'Se requiere autenticacion');
  }

  const {
    dominio,
    tipoMantenimiento,
    estadoValidacion,
    fechaDesde,
    fechaHasta,
    tecnicoNombre,
    identificador,
    nombreActivo,
    skip = 0,
    pageSize = 1000,
  } = request.params || {};

  const limitChunk = Math.min(Math.max(parseInt(pageSize, 10) || 1000, 1), 1000);

  try {
    const query = new Parse.Query('RegistroMantenimiento');
    query.equalTo('activo', true);
    if (dominio) query.equalTo('dominio', dominio);
    if (tipoMantenimiento) query.equalTo('tipoMantenimiento', tipoMantenimiento);
    if (estadoValidacion) query.equalTo('estadoValidacion', estadoValidacion);
    if (fechaDesde) query.greaterThanOrEqualTo('fecha', fechaDesde);
    if (fechaHasta) query.lessThanOrEqualTo('fecha', fechaHasta);
    if (tecnicoNombre && tecnicoNombre.trim()) query.contains('tecnicoNombre', tecnicoNombre.trim());

    const needsMemoryFilter = (identificador && identificador.trim()) || (nombreActivo && nombreActivo.trim());

    // Cuenta total solo en la primera llamada (skip === 0) para reducir overhead
    let total = 0;
    if (skip === 0 && !needsMemoryFilter) {
      total = await query.count({ useMasterKey: true });
    }

    query.descending('fecha');
    query.ascending('objectId');
    query.skip(skip);
    query.limit(limitChunk);

    let results = await query.find({ useMasterKey: true });

    if (needsMemoryFilter) {
      const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();
      const idNorm = normalize(identificador || '');
      const nombreNorm = normalize(nombreActivo || '');
      results = results.filter((item) => {
        const resumen = item.get('activoResumen') || {};
        const matchId = !idNorm || normalize(resumen.identificador).includes(idNorm);
        const matchNombre = !nombreNorm || normalize(resumen.nombre).includes(nombreNorm);
        return matchId && matchNombre;
      });
    }

    // Para exportacion basta con los campos no dinamicos (sin checklist)
    const mapExport = (registro) => {
      const resumen = registro.get('activoResumen') || {};
      return {
        id: registro.id,
        fecha: registro.get('fecha') || '',
        dominio: registro.get('dominio') || '',
        tipoMantenimiento: registro.get('tipoMantenimiento') || '',
        clasificacionEquipo: registro.get('clasificacionEquipo') || '',
        estadoValidacion: registro.get('estadoValidacion') || '',
        tecnicoNombre: registro.get('tecnicoNombre') || '',
        validadorNombre: registro.get('validadorNombre') || '',
        fechaValidacion: registro.get('fechaValidacion') || '',
        motivoRechazo: registro.get('motivoRechazo') || '',
        proximoMantenimiento: registro.get('proximoMantenimiento') || '',
        observacionesGenerales: registro.get('observacionesGenerales') || '',
        activoId: registro.get('activoId') || '',
        activoClase: registro.get('activoClase') || '',
        activoNombre: resumen.nombre || '',
        activoIdentificador: resumen.identificador || '',
        activoEstado: resumen.estado || '',
        activoUbicacion: resumen.ubicacion || '',
        // Etapa 7.2.2 — campos de retroactividad
        esRetroactivo: registro.get('esRetroactivo') || false,
        motivoRetroactivo: registro.get('motivoRetroactivo') || '',
        periodoIndice: typeof registro.get('periodoIndice') === 'number' ? registro.get('periodoIndice') : null,
        createdAt: registro.createdAt,
        updatedAt: registro.updatedAt,
      };
    };

    return {
      results: results.map(mapExport),
      total,
      pageSize: limitChunk,
      hasMore: results.length === limitChunk,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al exportar registros de mantenimiento: ${error.message}`);
  }
});

// ===============================================
// FUNCIONES DE PROVEEDORES
// ===============================================

/**
 * Helper: registra historial de proveedor
 */
async function registrarHistorialProveedor(proveedorId, accion, cambios, descripcion, user) {
  try {
    const HistorialClass = Parse.Object.extend('ProveedorHistorial');
    const historial = new HistorialClass();
    historial.set('proveedorId', proveedorId);
    historial.set('accion', accion);
    historial.set('cambios', cambios || {});
    historial.set('descripcion', descripcion);
    historial.set('usuarioId', user ? user.id : '');
    historial.set('usuarioNombre', user ? (user.get('firstName') || '') + ' ' + (user.get('lastName') || '') : 'Sistema');
    await historial.save(null, { useMasterKey: true });
  } catch (err) {
    console.error('Error registrando historial proveedor:', err);
  }
}

/**
 * Valida RUT chileno (modulo 11)
 */
function validarRutBackend(rut) {
  if (!rut || rut.length < 3) return false;
  const cleaned = rut.replace(/[\.\-]/g, '').toUpperCase();
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return dv === expectedDv;
}

/**
 * Formatea RUT a XX.XXX.XXX-X
 */
function formatRutBackend(rut) {
  const cleaned = rut.replace(/[\.\-]/g, '');
  if (cleaned.length < 2) return rut;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv.toUpperCase()}`;
}

/**
 * Obtiene proveedores con filtros y paginacion.
 * Requiere accessLevel >= 1
 */
Parse.Cloud.define('getProveedores', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Acceso insuficiente');

  const { busqueda, activo, limit = 25, skip = 0 } = request.params || {};

  try {
    const query = new Parse.Query('Proveedor');
    if (activo === true || activo === false) query.equalTo('activo', activo);

    if (busqueda && busqueda.trim().length > 0) {
      const term = busqueda.trim().toLowerCase();
      const termClean = term.replace(/[\.\-]/g, '');

      // Busqueda en memoria por RUT y nombre
      const baseQuery = new Parse.Query('Proveedor');
      if (activo === true || activo === false) baseQuery.equalTo('activo', activo);
      baseQuery.ascending('nombre');
      baseQuery.limit(10000);

      const allResults = await baseQuery.find({ useMasterKey: true });
      const filtered = allResults.filter(item => {
        const rutRaw = (item.get('rut') || '').toLowerCase();
        const rutClean = rutRaw.replace(/[\.\-]/g, '');
        const nombre = (item.get('nombre') || '').toLowerCase();
        return rutRaw.includes(term) || rutClean.includes(termClean) || nombre.includes(term);
      });

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return {
        results: paged.map(item => ({
          id: item.id,
          rut: item.get('rut') || '',
          nombre: item.get('nombre') || '',
          correo: item.get('correo') || '',
          telefono: item.get('telefono') || '',
          direccion: item.get('direccion') || '',
          descripcion: item.get('descripcion') || '',
          activo: item.get('activo') !== false,
          createdAt: item.get('createdAt'),
          updatedAt: item.get('updatedAt'),
        })),
        total,
      };
    }

    query.ascending('nombre');
    const total = await query.count({ useMasterKey: true });
    query.limit(limit);
    query.skip(skip);
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(item => ({
        id: item.id,
        rut: item.get('rut') || '',
        nombre: item.get('nombre') || '',
        correo: item.get('correo') || '',
        telefono: item.get('telefono') || '',
        direccion: item.get('direccion') || '',
        descripcion: item.get('descripcion') || '',
        activo: item.get('activo') !== false,
        createdAt: item.get('createdAt'),
        updatedAt: item.get('updatedAt'),
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener proveedores: ${error.message}`);
  }
});

/**
 * Obtiene un proveedor por ID
 */
Parse.Cloud.define('getProveedorById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { id } = request.params;
  if (!id) throw new Parse.Error(400, 'Se requiere id');

  try {
    const query = new Parse.Query('Proveedor');
    const item = await query.get(id, { useMasterKey: true });

    return {
      id: item.id,
      rut: item.get('rut') || '',
      nombre: item.get('nombre') || '',
      correo: item.get('correo') || '',
      telefono: item.get('telefono') || '',
      direccion: item.get('direccion') || '',
      descripcion: item.get('descripcion') || '',
      activo: item.get('activo') !== false,
      createdAt: item.get('createdAt'),
      updatedAt: item.get('updatedAt'),
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener proveedor: ${error.message}`);
  }
});

/**
 * Crea un proveedor.
 * Requiere accessLevel >= 3 (COORDINATOR)
 */
Parse.Cloud.define('createProveedor', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requiere nivel COORDINATOR o superior');

  const { data } = request.params;
  if (!data) throw new Parse.Error(400, 'Se requieren datos');
  if (!data.rut || !data.rut.trim()) throw new Parse.Error(400, 'El RUT es obligatorio');
  if (!data.nombre || !data.nombre.trim()) throw new Parse.Error(400, 'El nombre es obligatorio');

  const rutFormatted = formatRutBackend(data.rut.trim());
  if (!validarRutBackend(rutFormatted)) {
    throw new Parse.Error(400, 'El RUT ingresado no es valido');
  }

  // Verificar RUT unico
  const existingQuery = new Parse.Query('Proveedor');
  existingQuery.equalTo('rut', rutFormatted);
  const existing = await existingQuery.first({ useMasterKey: true });
  if (existing) {
    throw new Parse.Error(400, `Ya existe un proveedor con RUT ${rutFormatted}`);
  }

  try {
    const ProveedorClass = Parse.Object.extend('Proveedor');
    const proveedor = new ProveedorClass();

    proveedor.set('rut', rutFormatted);
    proveedor.set('nombre', data.nombre.trim());
    proveedor.set('correo', (data.correo || '').trim());
    proveedor.set('telefono', (data.telefono || '').trim());
    proveedor.set('direccion', (data.direccion || '').trim());
    proveedor.set('descripcion', (data.descripcion || '').trim());
    proveedor.set('activo', data.activo !== false);
    proveedor.set('creadoPor', currentUser.id);

    await proveedor.save(null, { useMasterKey: true });

    const cambios = {};
    const fields = ['rut', 'nombre', 'correo', 'telefono', 'direccion', 'descripcion'];
    fields.forEach(f => {
      if (proveedor.get(f)) cambios[f] = { anterior: null, nuevo: proveedor.get(f) };
    });

    await registrarHistorialProveedor(
      proveedor.id, 'creacion', cambios,
      `Proveedor "${data.nombre.trim()}" (${rutFormatted}) creado`,
      currentUser
    );

    return {
      id: proveedor.id,
      rut: proveedor.get('rut'),
      nombre: proveedor.get('nombre'),
      correo: proveedor.get('correo'),
      telefono: proveedor.get('telefono'),
      direccion: proveedor.get('direccion'),
      descripcion: proveedor.get('descripcion'),
      activo: proveedor.get('activo'),
      createdAt: proveedor.get('createdAt'),
      updatedAt: proveedor.get('updatedAt'),
    };
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al crear proveedor: ${error.message}`);
  }
});

/**
 * Actualiza un proveedor.
 * Requiere accessLevel >= 3 (COORDINATOR)
 */
Parse.Cloud.define('updateProveedor', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requiere nivel COORDINATOR o superior');

  const { id, data } = request.params;
  if (!id) throw new Parse.Error(400, 'Se requiere id');
  if (!data) throw new Parse.Error(400, 'Se requieren datos');

  try {
    const query = new Parse.Query('Proveedor');
    const proveedor = await query.get(id, { useMasterKey: true });

    const cambios = {};
    const fields = ['nombre', 'correo', 'telefono', 'direccion', 'descripcion', 'activo'];

    // Si se cambia el RUT, validar y verificar unicidad
    if (data.rut !== undefined) {
      const rutFormatted = formatRutBackend(data.rut.trim());
      if (!validarRutBackend(rutFormatted)) {
        throw new Parse.Error(400, 'El RUT ingresado no es valido');
      }
      if (rutFormatted !== proveedor.get('rut')) {
        const existingQuery = new Parse.Query('Proveedor');
        existingQuery.equalTo('rut', rutFormatted);
        existingQuery.notEqualTo('objectId', id);
        const existing = await existingQuery.first({ useMasterKey: true });
        if (existing) {
          throw new Parse.Error(400, `Ya existe otro proveedor con RUT ${rutFormatted}`);
        }
        cambios.rut = { anterior: proveedor.get('rut'), nuevo: rutFormatted };
        proveedor.set('rut', rutFormatted);
      }
    }

    fields.forEach(field => {
      if (data[field] !== undefined) {
        const currentVal = proveedor.get(field);
        const newVal = typeof data[field] === 'string' ? data[field].trim() : data[field];
        if (currentVal !== newVal) {
          cambios[field] = { anterior: currentVal, nuevo: newVal };
          proveedor.set(field, newVal);
        }
      }
    });

    if (Object.keys(cambios).length === 0) {
      return {
        id: proveedor.id,
        rut: proveedor.get('rut'),
        nombre: proveedor.get('nombre'),
        correo: proveedor.get('correo'),
        telefono: proveedor.get('telefono'),
        direccion: proveedor.get('direccion'),
        descripcion: proveedor.get('descripcion'),
        activo: proveedor.get('activo'),
        createdAt: proveedor.get('createdAt'),
        updatedAt: proveedor.get('updatedAt'),
      };
    }

    await proveedor.save(null, { useMasterKey: true });

    await registrarHistorialProveedor(
      proveedor.id, 'actualizacion', cambios,
      `Proveedor "${proveedor.get('nombre')}" actualizado (${Object.keys(cambios).length} campos)`,
      currentUser
    );

    return {
      id: proveedor.id,
      rut: proveedor.get('rut'),
      nombre: proveedor.get('nombre'),
      correo: proveedor.get('correo'),
      telefono: proveedor.get('telefono'),
      direccion: proveedor.get('direccion'),
      descripcion: proveedor.get('descripcion'),
      activo: proveedor.get('activo'),
      createdAt: proveedor.get('createdAt'),
      updatedAt: proveedor.get('updatedAt'),
    };
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al actualizar proveedor: ${error.message}`);
  }
});

/**
 * Elimina un proveedor.
 * Requiere accessLevel >= 5 (SUPER_ADMIN)
 */
Parse.Cloud.define('deleteProveedor', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 5) throw new Parse.Error(403, 'Se requiere nivel SUPER_ADMIN');

  const { id } = request.params;
  if (!id) throw new Parse.Error(400, 'Se requiere id');

  try {
    // Verificar si tiene licitaciones activas
    const licQuery = new Parse.Query('Licitacion');
    licQuery.equalTo('proveedorId', id);
    licQuery.equalTo('activo', true);
    const licCount = await licQuery.count({ useMasterKey: true });
    if (licCount > 0) {
      throw new Parse.Error(400, `No se puede eliminar: el proveedor tiene ${licCount} licitacion(es) activa(s)`);
    }

    const query = new Parse.Query('Proveedor');
    const proveedor = await query.get(id, { useMasterKey: true });

    await registrarHistorialProveedor(
      proveedor.id, 'eliminacion', {},
      `Proveedor "${proveedor.get('nombre')}" (${proveedor.get('rut')}) eliminado`,
      currentUser
    );

    await proveedor.destroy({ useMasterKey: true });
    return { success: true };
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al eliminar proveedor: ${error.message}`);
  }
});

/**
 * Historial de proveedor
 */
Parse.Cloud.define('getProveedorHistorial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { proveedorId, limit = 20, skip = 0 } = request.params;
  if (!proveedorId) throw new Parse.Error(400, 'Se requiere proveedorId');

  try {
    const query = new Parse.Query('ProveedorHistorial');
    query.equalTo('proveedorId', proveedorId);
    query.descending('createdAt');

    const total = await query.count({ useMasterKey: true });
    query.limit(limit);
    query.skip(skip);
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(item => ({
        id: item.id,
        proveedorId: item.get('proveedorId'),
        accion: item.get('accion'),
        cambios: item.get('cambios'),
        descripcion: item.get('descripcion'),
        usuarioId: item.get('usuarioId'),
        usuarioNombre: item.get('usuarioNombre'),
        createdAt: item.get('createdAt'),
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener historial: ${error.message}`);
  }
});

// ===============================================
// FUNCIONES DE LICITACIONES
// ===============================================

/**
 * Helper: registra historial de licitacion
 */
async function registrarHistorialLicitacion(licitacionId, accion, cambios, descripcion, user) {
  try {
    const HistorialClass = Parse.Object.extend('LicitacionHistorial');
    const historial = new HistorialClass();
    historial.set('licitacionId', licitacionId);
    historial.set('accion', accion);
    historial.set('cambios', cambios || {});
    historial.set('descripcion', descripcion);
    historial.set('usuarioId', user ? user.id : '');
    historial.set('usuarioNombre', user ? (user.get('firstName') || '') + ' ' + (user.get('lastName') || '') : 'Sistema');
    await historial.save(null, { useMasterKey: true });
  } catch (err) {
    console.error('Error registrando historial licitacion:', err);
  }
}

/**
 * Calcula estado de licitacion basado en fechas
 */
function calcularEstadoLicitacion(fechaTermino, extensiones) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaEfectiva = new Date(fechaTermino);
  let tieneExtensiones = false;

  if (extensiones && extensiones.length > 0) {
    tieneExtensiones = true;
    extensiones.forEach(ext => {
      const fechaExt = new Date(ext.nuevaFechaTermino);
      if (fechaExt > fechaEfectiva) {
        fechaEfectiva = fechaExt;
      }
    });
  }

  if (fechaEfectiva >= hoy) {
    return { estado: tieneExtensiones ? 'extendida' : 'vigente', fechaTerminoEfectiva: fechaEfectiva.toISOString().split('T')[0] };
  }
  return { estado: 'vencida', fechaTerminoEfectiva: fechaEfectiva.toISOString().split('T')[0] };
}

/**
 * Serializa licitacion con datos de proveedor
 */
async function serializarLicitacion(item) {
  let proveedorRut = '';
  let proveedorNombre = '';

  const proveedorId = item.get('proveedorId');
  if (proveedorId) {
    try {
      const pQuery = new Parse.Query('Proveedor');
      const proveedor = await pQuery.get(proveedorId, { useMasterKey: true });
      proveedorRut = proveedor.get('rut') || '';
      proveedorNombre = proveedor.get('nombre') || '';
    } catch (e) {
      // Proveedor puede haberse eliminado
    }
  }

  const extensiones = item.get('extensiones') || [];
  const { estado, fechaTerminoEfectiva } = calcularEstadoLicitacion(item.get('fechaTermino'), extensiones);

  // Contar equipos asociados
  const eqQuery = new Parse.Query('LicitacionEquipo');
  eqQuery.equalTo('licitacionId', item.id);
  const totalEquipos = await eqQuery.count({ useMasterKey: true });

  return {
    id: item.id,
    proveedorId: item.get('proveedorId') || '',
    proveedorRut,
    proveedorNombre,
    numeroLicitacion: item.get('numeroLicitacion') || '',
    inventarioDestino: item.get('inventarioDestino') || '',
    fechaInicio: item.get('fechaInicio') || '',
    fechaTermino: item.get('fechaTermino') || '',
    fechaTerminoEfectiva,
    extensiones,
    estado,
    activo: item.get('activo') !== false,
    totalEquipos,
    createdAt: item.get('createdAt'),
    updatedAt: item.get('updatedAt'),
  };
}

/**
 * Obtiene licitaciones con filtros
 */
Parse.Cloud.define('getLicitaciones', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { proveedorId, inventarioDestino, estado, busqueda, activo, limit = 25, skip = 0 } = request.params || {};

  try {
    const query = new Parse.Query('Licitacion');
    if (proveedorId) query.equalTo('proveedorId', proveedorId);
    if (inventarioDestino) query.equalTo('inventarioDestino', inventarioDestino);
    if (activo === true || activo === false) query.equalTo('activo', activo);

    query.descending('createdAt');

    // Si hay busqueda o filtro por estado, necesitamos traer todo y filtrar en memoria
    if (busqueda || estado) {
      query.limit(10000);
      const allResults = await query.find({ useMasterKey: true });

      let serialized = [];
      for (const item of allResults) {
        serialized.push(await serializarLicitacion(item));
      }

      if (estado) {
        serialized = serialized.filter(l => l.estado === estado);
      }

      if (busqueda && busqueda.trim()) {
        const term = busqueda.trim().toLowerCase();
        serialized = serialized.filter(l =>
          l.numeroLicitacion.toLowerCase().includes(term) ||
          l.proveedorNombre.toLowerCase().includes(term) ||
          l.proveedorRut.toLowerCase().replace(/[\.\-]/g, '').includes(term.replace(/[\.\-]/g, ''))
        );
      }

      const total = serialized.length;
      const paged = serialized.slice(skip, skip + limit);
      return { results: paged, total };
    }

    const total = await query.count({ useMasterKey: true });
    query.limit(limit);
    query.skip(skip);
    const results = await query.find({ useMasterKey: true });

    const serialized = [];
    for (const item of results) {
      serialized.push(await serializarLicitacion(item));
    }

    return { results: serialized, total };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener licitaciones: ${error.message}`);
  }
});

/**
 * Obtiene una licitacion por ID
 */
Parse.Cloud.define('getLicitacionById', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { id } = request.params;
  if (!id) throw new Parse.Error(400, 'Se requiere id');

  try {
    const query = new Parse.Query('Licitacion');
    const item = await query.get(id, { useMasterKey: true });
    return await serializarLicitacion(item);
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener licitacion: ${error.message}`);
  }
});

/**
 * Crea una licitacion.
 * Requiere accessLevel >= 3 (COORDINATOR)
 */
Parse.Cloud.define('createLicitacion', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requiere nivel COORDINATOR o superior');

  const { data } = request.params;
  if (!data) throw new Parse.Error(400, 'Se requieren datos');
  if (!data.proveedorId) throw new Parse.Error(400, 'Se requiere proveedorId');
  if (!data.numeroLicitacion || !data.numeroLicitacion.trim()) throw new Parse.Error(400, 'El numero de licitacion es obligatorio');
  if (!data.inventarioDestino) throw new Parse.Error(400, 'El inventario destino es obligatorio');
  if (!data.fechaInicio) throw new Parse.Error(400, 'La fecha de inicio es obligatoria');
  if (!data.fechaTermino) throw new Parse.Error(400, 'La fecha de termino es obligatoria');

  const validDestinos = ['medico', 'industrial', 'infraestructura', 'flota'];
  if (!validDestinos.includes(data.inventarioDestino)) {
    throw new Parse.Error(400, 'Inventario destino no valido');
  }

  // Verificar que el proveedor existe
  const pQuery = new Parse.Query('Proveedor');
  let proveedor;
  try {
    proveedor = await pQuery.get(data.proveedorId, { useMasterKey: true });
  } catch (e) {
    throw new Parse.Error(400, 'El proveedor indicado no existe');
  }

  try {
    const LicitacionClass = Parse.Object.extend('Licitacion');
    const licitacion = new LicitacionClass();

    licitacion.set('proveedorId', data.proveedorId);
    licitacion.set('numeroLicitacion', data.numeroLicitacion.trim());
    licitacion.set('inventarioDestino', data.inventarioDestino);
    licitacion.set('fechaInicio', data.fechaInicio);
    licitacion.set('fechaTermino', data.fechaTermino);
    licitacion.set('extensiones', []);
    licitacion.set('activo', true);
    licitacion.set('creadoPor', currentUser.id);

    await licitacion.save(null, { useMasterKey: true });

    const destinoLabels = { medico: 'Equipos Medicos', industrial: 'Equipos Industriales', infraestructura: 'Infraestructura', flota: 'Flota Vehicular' };

    await registrarHistorialLicitacion(
      licitacion.id, 'creacion', {
        numeroLicitacion: { anterior: null, nuevo: data.numeroLicitacion.trim() },
        inventarioDestino: { anterior: null, nuevo: destinoLabels[data.inventarioDestino] },
        fechaInicio: { anterior: null, nuevo: data.fechaInicio },
        fechaTermino: { anterior: null, nuevo: data.fechaTermino },
      },
      `Licitacion "${data.numeroLicitacion.trim()}" creada para ${proveedor.get('nombre')} (${destinoLabels[data.inventarioDestino]})`,
      currentUser
    );

    return await serializarLicitacion(licitacion);
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al crear licitacion: ${error.message}`);
  }
});

/**
 * Actualiza una licitacion.
 * Requiere accessLevel >= 3
 */
Parse.Cloud.define('updateLicitacion', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requiere nivel COORDINATOR o superior');

  const { id, data } = request.params;
  if (!id || !data) throw new Parse.Error(400, 'Se requiere id y datos');

  try {
    const query = new Parse.Query('Licitacion');
    const licitacion = await query.get(id, { useMasterKey: true });

    const cambios = {};
    const fields = ['numeroLicitacion', 'inventarioDestino', 'fechaInicio', 'fechaTermino', 'activo'];

    fields.forEach(field => {
      if (data[field] !== undefined) {
        const currentVal = licitacion.get(field);
        const newVal = typeof data[field] === 'string' ? data[field].trim() : data[field];
        if (currentVal !== newVal) {
          cambios[field] = { anterior: currentVal, nuevo: newVal };
          licitacion.set(field, newVal);
        }
      }
    });

    if (Object.keys(cambios).length > 0) {
      await licitacion.save(null, { useMasterKey: true });
      await registrarHistorialLicitacion(
        licitacion.id, 'actualizacion', cambios,
        `Licitacion "${licitacion.get('numeroLicitacion')}" actualizada (${Object.keys(cambios).length} campos)`,
        currentUser
      );
    }

    return await serializarLicitacion(licitacion);
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al actualizar licitacion: ${error.message}`);
  }
});

/**
 * Elimina una licitacion.
 * Requiere accessLevel >= 5
 */
Parse.Cloud.define('deleteLicitacion', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 5) throw new Parse.Error(403, 'Se requiere nivel SUPER_ADMIN');

  const { id } = request.params;
  if (!id) throw new Parse.Error(400, 'Se requiere id');

  try {
    // Eliminar equipos asociados
    const eqQuery = new Parse.Query('LicitacionEquipo');
    eqQuery.equalTo('licitacionId', id);
    const equipos = await eqQuery.find({ useMasterKey: true });
    if (equipos.length > 0) {
      await Parse.Object.destroyAll(equipos, { useMasterKey: true });
    }

    const query = new Parse.Query('Licitacion');
    const licitacion = await query.get(id, { useMasterKey: true });

    await registrarHistorialLicitacion(
      licitacion.id, 'eliminacion', {},
      `Licitacion "${licitacion.get('numeroLicitacion')}" eliminada`,
      currentUser
    );

    await licitacion.destroy({ useMasterKey: true });
    return { success: true };
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al eliminar licitacion: ${error.message}`);
  }
});

/**
 * Agrega una extension de contrato a una licitacion.
 * Requiere accessLevel >= 3
 */
Parse.Cloud.define('agregarExtensionLicitacion', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requiere nivel COORDINATOR o superior');

  const { licitacionId, extension } = request.params;
  if (!licitacionId) throw new Parse.Error(400, 'Se requiere licitacionId');
  if (!extension || !extension.nuevaFechaTermino) throw new Parse.Error(400, 'Se requiere nuevaFechaTermino en la extension');

  try {
    const query = new Parse.Query('Licitacion');
    const licitacion = await query.get(licitacionId, { useMasterKey: true });

    const extensiones = licitacion.get('extensiones') || [];
    const newExtension = {
      fechaExtension: extension.fechaExtension || new Date().toISOString().split('T')[0],
      nuevaFechaTermino: extension.nuevaFechaTermino,
      descripcion: extension.descripcion || '',
    };
    extensiones.push(newExtension);
    licitacion.set('extensiones', extensiones);

    await licitacion.save(null, { useMasterKey: true });

    await registrarHistorialLicitacion(
      licitacion.id, 'extension', {
        extension: { anterior: null, nuevo: newExtension },
      },
      `Extension agregada a licitacion "${licitacion.get('numeroLicitacion')}": nueva fecha termino ${extension.nuevaFechaTermino}`,
      currentUser
    );

    // Sincronizar convenios despues de agregar extension
    try {
      const invTipo = licitacion.get('inventarioDestino');
      if (invTipo) await sincronizarConveniosParaTipo(invTipo);
    } catch (syncErr) {
      console.error('Error al sincronizar convenios post-extension:', syncErr.message);
    }

    return await serializarLicitacion(licitacion);
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al agregar extension: ${error.message}`);
  }
});

/**
 * Historial de licitacion
 */
Parse.Cloud.define('getLicitacionHistorial', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { licitacionId, limit = 20, skip = 0 } = request.params;
  if (!licitacionId) throw new Parse.Error(400, 'Se requiere licitacionId');

  try {
    const query = new Parse.Query('LicitacionHistorial');
    query.equalTo('licitacionId', licitacionId);
    query.descending('createdAt');

    const total = await query.count({ useMasterKey: true });
    query.limit(limit);
    query.skip(skip);
    const results = await query.find({ useMasterKey: true });

    return {
      results: results.map(item => ({
        id: item.id,
        licitacionId: item.get('licitacionId'),
        accion: item.get('accion'),
        cambios: item.get('cambios'),
        descripcion: item.get('descripcion'),
        usuarioId: item.get('usuarioId'),
        usuarioNombre: item.get('usuarioNombre'),
        createdAt: item.get('createdAt'),
      })),
      total,
    };
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener historial licitacion: ${error.message}`);
  }
});

// ===============================================
// FUNCIONES DE LICITACION-EQUIPO (TABLA PIVOTE)
// ===============================================

/**
 * Carga equipos desde listado a una licitacion (carga masiva).
 * Busca por serie + inventario en el inventario correspondiente.
 * Requiere accessLevel >= 3
 */
Parse.Cloud.define('cargarEquiposLicitacion', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requiere nivel COORDINATOR o superior');

  const { licitacionId, items } = request.params;
  if (!licitacionId) throw new Parse.Error(400, 'Se requiere licitacionId');
  if (!items || !Array.isArray(items) || items.length === 0) throw new Parse.Error(400, 'Se requiere un array de items');

  try {
    const licQuery = new Parse.Query('Licitacion');
    const licitacion = await licQuery.get(licitacionId, { useMasterKey: true });
    const inventarioTipo = licitacion.get('inventarioDestino');
    const proveedorId = licitacion.get('proveedorId');

    // Obtener RUT del proveedor
    const pQuery = new Parse.Query('Proveedor');
    const proveedor = await pQuery.get(proveedorId, { useMasterKey: true });
    const proveedorRut = proveedor.get('rut');

    // Determinar la clase Parse segun inventario
    const classMap = {
      medico: 'InventarioEquipoMedico',
      industrial: 'InventarioEquipoIndustrial',
      infraestructura: 'InventarioInfraestructura',
      flota: 'InventarioFlotaVehicular',
    };
    const parseClassName = classMap[inventarioTipo];
    if (!parseClassName) throw new Parse.Error(400, 'Tipo de inventario no valido');

    // Campos de busqueda segun inventario
    const serieField = 'serie';
    const invField = inventarioTipo === 'infraestructura' ? 'codigoInterno' : (inventarioTipo === 'flota' ? 'patente' : 'inventario');
    const nombreField = inventarioTipo === 'infraestructura' ? 'componente' : (inventarioTipo === 'flota' ? 'tipoVehiculo' : 'nombreEquipo');

    const normalize = (str) => (str || '').replace(/[\s\-\.\/\\_\#\(\)\+\*\,\;\:\|]/g, '').toLowerCase();

    let asociados = 0;
    let errores = 0;
    const noEncontrados = [];

    const LicitacionEquipoClass = Parse.Object.extend('LicitacionEquipo');

    for (const item of items) {
      try {
        const serieItem = (item.serie || item.VIN || '').trim();
        const invItem = (item.inventario || item.codigoInterno || item.patente || '').trim();

        if (!serieItem && !invItem) {
          noEncontrados.push({ ...item, razon: 'Sin serie ni codigo de inventario' });
          continue;
        }

        // Buscar equipo: si ambos campos vienen, ambos deben coincidir.
        // Si solo uno viene, coincidencia exacta en ese campo.
        const invQuery = new Parse.Query(parseClassName);
        invQuery.limit(10000);
        const allEquipos = await invQuery.find({ useMasterKey: true });

        let encontrado = null;
        const termSerie = normalize(serieItem);
        const termInv = normalize(invItem);

        for (const eq of allEquipos) {
          const eqSerie = normalize(eq.get(serieField));
          const eqInv = normalize(eq.get(invField));

          if (termSerie && termInv) {
            // Ambos proporcionados: ambos deben coincidir
            if (eqSerie === termSerie && eqInv === termInv) {
              encontrado = eq;
              break;
            }
          } else if (termSerie) {
            // Solo serie proporcionada
            if (eqSerie === termSerie) {
              encontrado = eq;
              break;
            }
          } else if (termInv) {
            // Solo inventario proporcionado
            if (eqInv === termInv) {
              encontrado = eq;
              break;
            }
          }
        }

        if (!encontrado) {
          noEncontrados.push({ ...item, razon: 'Equipo no encontrado en inventario' });
          continue;
        }

        // Verificar si ya esta asociado a esta licitacion
        const existCheck = new Parse.Query('LicitacionEquipo');
        existCheck.equalTo('licitacionId', licitacionId);
        existCheck.equalTo('equipoId', encontrado.id);
        const exists = await existCheck.first({ useMasterKey: true });
        if (exists) {
          asociados++; // Ya asociado, contar pero no duplicar
          continue;
        }

        const le = new LicitacionEquipoClass();
        le.set('licitacionId', licitacionId);
        le.set('proveedorRut', proveedorRut);
        le.set('equipoId', encontrado.id);
        le.set('inventarioTipo', inventarioTipo);
        le.set('nombreEquipo', encontrado.get(nombreField) || '');
        le.set('marca', encontrado.get('marca') || '');
        le.set('modelo', encontrado.get('modelo') || '');
        le.set('serie', encontrado.get(serieField) || '');
        le.set('inventario', encontrado.get(invField) || '');
        await le.save(null, { useMasterKey: true });
        asociados++;
      } catch (err) {
        errores++;
      }
    }

    await registrarHistorialLicitacion(
      licitacionId, 'carga_equipos', {},
      `Carga masiva: ${asociados} equipos asociados, ${noEncontrados.length} no encontrados, ${errores} errores`,
      currentUser
    );

    // Sincronizar convenios automaticamente despues de carga masiva
    try {
      await sincronizarConveniosParaTipo(inventarioTipo);
    } catch (syncErr) {
      console.error('Error al sincronizar convenios post-carga:', syncErr.message);
    }

    return {
      asociados,
      noEncontrados,
      errores,
      total: items.length,
    };
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error en carga masiva: ${error.message}`);
  }
});

/**
 * Obtiene equipos asociados a una licitacion
 */
Parse.Cloud.define('getEquiposLicitacion', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { licitacionId } = request.params;
  if (!licitacionId) throw new Parse.Error(400, 'Se requiere licitacionId');

  try {
    const query = new Parse.Query('LicitacionEquipo');
    query.equalTo('licitacionId', licitacionId);
    query.ascending('nombreEquipo');
    query.limit(10000);
    const results = await query.find({ useMasterKey: true });

    return results.map(item => ({
      id: item.id,
      licitacionId: item.get('licitacionId'),
      proveedorRut: item.get('proveedorRut'),
      equipoId: item.get('equipoId'),
      inventarioTipo: item.get('inventarioTipo'),
      nombreEquipo: item.get('nombreEquipo'),
      marca: item.get('marca'),
      modelo: item.get('modelo'),
      serie: item.get('serie'),
      inventario: item.get('inventario'),
      createdAt: item.get('createdAt'),
    }));
  } catch (error) {
    throw new Parse.Error(500, `Error al obtener equipos de licitacion: ${error.message}`);
  }
});

/**
 * Desasocia un equipo de una licitacion
 */
Parse.Cloud.define('desasociarEquipoLicitacion', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requiere nivel COORDINATOR o superior');

  const { id } = request.params;
  if (!id) throw new Parse.Error(400, 'Se requiere id');

  try {
    const query = new Parse.Query('LicitacionEquipo');
    const item = await query.get(id, { useMasterKey: true });

    const invTipo = item.get('inventarioTipo');

    await registrarHistorialLicitacion(
      item.get('licitacionId'), 'desasociacion_equipo', {},
      `Equipo "${item.get('nombreEquipo')}" (${item.get('serie')}) desasociado`,
      currentUser
    );

    await item.destroy({ useMasterKey: true });

    // Sincronizar convenios despues de desasociar
    try {
      if (invTipo) await sincronizarConveniosParaTipo(invTipo);
    } catch (syncErr) {
      console.error('Error al sincronizar convenios post-desasociacion:', syncErr.message);
    }

    return { success: true };
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al desasociar equipo: ${error.message}`);
  }
});

// ===============================================
// SINCRONIZACION DE CONVENIOS EN INVENTARIOS
// ===============================================

/**
 * Funcion auxiliar que sincroniza el estado de convenios en un inventario:
 * 1. Recalcula el estado de cada Licitacion involucrada (vigente/vencida/extendida)
 * 2. Actualiza convenioActivo, proveedorRut, proveedorNombre en cada equipo
 * 3. Limpia equipos cuyo convenio vencio o cuyo proveedor cambio
 * 4. Retorna estadisticas detalladas del proceso
 */
async function sincronizarConveniosParaTipo(inventarioTipo) {
  const classMap = {
    medico: 'InventarioEquipoMedico',
    industrial: 'InventarioEquipoIndustrial',
    infraestructura: 'InventarioInfraestructura',
    flota: 'InventarioFlotaVehicular',
  };
  const parseClassName = classMap[inventarioTipo];
  if (!parseClassName) return { tipo: inventarioTipo, error: 'Tipo no valido' };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const stats = {
    tipo: inventarioTipo,
    licitacionesActualizadas: 0,
    licitacionesVencidas: 0,
    equiposConConvenio: 0,
    equiposSinConvenio: 0,
    equiposActualizados: 0,
    proveedoresCambiados: 0,
    licitacionEquiposReasignados: 0, // Etapa 6.3: huerfanos auto-curados
  };

  // Obtener todas las LicitacionEquipo de este tipo
  const leQuery = new Parse.Query('LicitacionEquipo');
  leQuery.equalTo('inventarioTipo', inventarioTipo);
  leQuery.limit(10000);
  const licitacionEquipos = await leQuery.find({ useMasterKey: true });

  // Etapa 6.3 (revision-inventarios): auto-resolver equipoId por identidad.
  // Si el equipoId apunta a un activo eliminado/recreado, intentar localizar
  // el activo vivo por `serie` o `inventario` (o `patente`/`codigoInterno`)
  // y actualizar la LicitacionEquipo.equipoId al objectId actual.
  // Asi `sincronizarConveniosInventario` sigue funcionando aunque haya datos
  // legacy con vinculos rotos.
  const camposIdentByTipo = {
    medico: ['serie', 'inventario'],
    industrial: ['serie', 'inventario'],
    flota: ['patente', 'numeroInterno'],
    infraestructura: ['serie', 'codigoInterno'],
  };
  const camposIdent = camposIdentByTipo[inventarioTipo] || ['serie', 'inventario'];

  // Cache de id viejo -> id resuelto (vivo)
  const resolvedCache = {};
  // Set de id viejos ya verificados como existentes para no consultar 2 veces
  const knownExisting = new Set();

  async function resolverEquipoIdVivo(le) {
    const idActual = le.get('equipoId');
    if (!idActual) return null;
    if (knownExisting.has(idActual)) return idActual;
    if (resolvedCache[idActual]) return resolvedCache[idActual];

    // 1) Si el activo existe (no eliminado), usarlo tal cual
    try {
      const q = new Parse.Query(parseClassName);
      const obj = await q.get(idActual, { useMasterKey: true });
      // beforeFind ya excluyo eliminados; si llego aqui, esta vivo
      if (obj) {
        knownExisting.add(idActual);
        return idActual;
      }
    } catch (e) {
      // No existe o esta eliminado, intentamos resolver por identidad
    }

    // 2) Buscar el activo vivo por serie o inventario (campos en la LE)
    const valoresIdent = camposIdent
      .map((k) => String(le.get(k) || '').trim())
      .filter(Boolean);
    if (valoresIdent.length === 0) return null;

    const queries = camposIdent
      .map((k) => {
        const v = String(le.get(k) || '').trim();
        if (!v) return null;
        const q = new Parse.Query(parseClassName);
        q.equalTo(k, v);
        return q;
      })
      .filter(Boolean);
    if (queries.length === 0) return null;

    const orQ = queries.length > 1 ? Parse.Query.or(...queries) : queries[0];
    orQ.descending('updatedAt');
    orQ.limit(1);
    try {
      const found = await orQ.find({ useMasterKey: true });
      if (found.length > 0) {
        const nuevoId = found[0].id;
        resolvedCache[idActual] = nuevoId;
        return nuevoId;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // Pre-resolver y reasignar equipoId huerfanos
  for (const le of licitacionEquipos) {
    const idActual = le.get('equipoId');
    const idVivo = await resolverEquipoIdVivo(le);
    if (idVivo && idVivo !== idActual) {
      le.set('equipoId', idVivo);
      await le.save(null, { useMasterKey: true });
      stats.licitacionEquiposReasignados++;
    }
  }

  // Agrupar por equipoId (ahora ya saneado)
  const equipoMap = {};
  for (const le of licitacionEquipos) {
    const equipoId = le.get('equipoId');
    if (!equipoId) continue;
    if (!equipoMap[equipoId]) equipoMap[equipoId] = [];
    equipoMap[equipoId].push(le);
  }

  // Cargar licitaciones referenciadas y ACTUALIZAR su estado
  const licitacionIds = [...new Set(licitacionEquipos.map(le => le.get('licitacionId')))];
  const licitacionMap = {};
  const proveedorCache = {}; // Cache para evitar consultas repetidas

  for (const licId of licitacionIds) {
    try {
      const lq = new Parse.Query('Licitacion');
      const lic = await lq.get(licId, { useMasterKey: true });

      // Recalcular estado de la licitacion usando la funcion existente
      const extensiones = lic.get('extensiones') || [];
      const { estado: nuevoEstado, fechaTerminoEfectiva } = calcularEstadoLicitacion(
        lic.get('fechaTermino'), extensiones
      );

      // Si el estado cambio, actualizar la licitacion en BD
      const estadoActual = lic.get('estado');
      if (estadoActual !== nuevoEstado) {
        lic.set('estado', nuevoEstado);
        await lic.save(null, { useMasterKey: true });
        stats.licitacionesActualizadas++;
        if (nuevoEstado === 'vencida') stats.licitacionesVencidas++;
      }

      // Cargar proveedor (con cache)
      const provId = lic.get('proveedorId');
      if (provId && !proveedorCache[provId]) {
        try {
          const pq = new Parse.Query('Proveedor');
          const prov = await pq.get(provId, { useMasterKey: true });
          proveedorCache[provId] = {
            rut: prov.get('rut') || '',
            nombre: prov.get('nombre') || '',
          };
        } catch (e) {
          proveedorCache[provId] = { rut: '', nombre: '' };
        }
      }

      licitacionMap[licId] = lic;
    } catch (e) {
      // Licitacion eliminada, ignorar
    }
  }

  // Para cada equipo con asociaciones, determinar convenio vigente
  for (const [equipoId, asociaciones] of Object.entries(equipoMap)) {
    let tieneConvenioVigente = false;
    let rutProveedor = '';
    let nombreProveedor = '';
    let fechaTerminoConvenio = '';
    let numeroLicitacionVigente = '';

    // Ordenar asociaciones: priorizar licitaciones con fecha termino mas lejana
    const asociacionesConDatos = asociaciones.map(le => {
      const licId = le.get('licitacionId');
      const lic = licitacionMap[licId];
      if (!lic || lic.get('activo') === false) return null;

      const extensiones = lic.get('extensiones') || [];
      const { fechaTerminoEfectiva } = calcularEstadoLicitacion(lic.get('fechaTermino'), extensiones);

      return { le, lic, fechaTerminoEfectiva };
    }).filter(Boolean).sort((a, b) => new Date(b.fechaTerminoEfectiva) - new Date(a.fechaTerminoEfectiva));

    for (const { le, lic, fechaTerminoEfectiva } of asociacionesConDatos) {
      const ft = new Date(fechaTerminoEfectiva);
      ft.setHours(23, 59, 59, 999);

      if (ft >= hoy) {
        tieneConvenioVigente = true;
        const provId = lic.get('proveedorId');
        const provData = proveedorCache[provId] || { rut: '', nombre: '' };

        // Actualizar RUT en LicitacionEquipo si el proveedor cambio de RUT
        const leRut = le.get('proveedorRut') || '';
        if (provData.rut && leRut !== provData.rut) {
          le.set('proveedorRut', provData.rut);
          await le.save(null, { useMasterKey: true });
        }

        rutProveedor = provData.rut;
        nombreProveedor = provData.nombre;
        numeroLicitacionVigente = lic.get('numeroLicitacion') || '';
        fechaTerminoConvenio = fechaTerminoEfectiva;
        break; // Tomar la licitacion vigente con fecha mas lejana
      }
    }

    // Actualizar el equipo en el inventario
    try {
      const eqQuery = new Parse.Query(parseClassName);
      const equipo = await eqQuery.get(equipoId, { useMasterKey: true });

      const anteriorConvenio = equipo.get('convenioActivo') || false;
      const anteriorRut = equipo.get('proveedorRut') || '';

      // Solo actualizar si algo cambio
      const cambio = anteriorConvenio !== tieneConvenioVigente
        || anteriorRut !== (tieneConvenioVigente ? rutProveedor : '')
        || (equipo.get('proveedorNombre') || '') !== (tieneConvenioVigente ? nombreProveedor : '')
        || (equipo.get('numeroLicitacion') || '') !== (tieneConvenioVigente ? numeroLicitacionVigente : '')
        || (equipo.get('fechaTerminoConvenio') || '') !== (tieneConvenioVigente ? fechaTerminoConvenio : '');

      if (cambio) {
        equipo.set('convenioActivo', tieneConvenioVigente);
        equipo.set('proveedorRut', tieneConvenioVigente ? rutProveedor : '');
        equipo.set('proveedorNombre', tieneConvenioVigente ? nombreProveedor : '');
        equipo.set('numeroLicitacion', tieneConvenioVigente ? numeroLicitacionVigente : '');
        equipo.set('fechaTerminoConvenio', tieneConvenioVigente ? fechaTerminoConvenio : '');
        await equipo.save(null, { useMasterKey: true });
        stats.equiposActualizados++;

        if (anteriorRut && rutProveedor && anteriorRut !== rutProveedor) {
          stats.proveedoresCambiados++;
        }
      }

      if (tieneConvenioVigente) {
        stats.equiposConConvenio++;
      } else {
        stats.equiposSinConvenio++;
      }
    } catch (e) {
      // Equipo eliminado del inventario, ignorar
    }
  }

  // Limpiar equipos que tenian convenio pero ya no tienen asociaciones
  const invQuery = new Parse.Query(parseClassName);
  invQuery.equalTo('convenioActivo', true);
  invQuery.limit(10000);
  const equiposConConvenio = await invQuery.find({ useMasterKey: true });

  for (const eq of equiposConConvenio) {
    if (!equipoMap[eq.id]) {
      eq.set('convenioActivo', false);
      eq.set('proveedorRut', '');
      eq.set('proveedorNombre', '');
      eq.set('numeroLicitacion', '');
      eq.set('fechaTerminoConvenio', '');
      await eq.save(null, { useMasterKey: true });
      stats.equiposActualizados++;
      stats.equiposSinConvenio++;
    }
  }

  return stats;
}

/**
 * Sincroniza convenios en todos los inventarios o en uno especifico.
 * Requiere accessLevel >= 3 (COORDINATOR)
 */
Parse.Cloud.define('sincronizarConveniosInventario', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requiere nivel COORDINATOR o superior');

  const { inventarioTipo } = request.params || {};

  try {
    if (inventarioTipo) {
      const result = await sincronizarConveniosParaTipo(inventarioTipo);
      return { resultados: [result] };
    }

    const tipos = ['medico', 'industrial', 'infraestructura', 'flota'];
    const resultados = [];
    for (const tipo of tipos) {
      const result = await sincronizarConveniosParaTipo(tipo);
      resultados.push(result);
    }
    return { resultados };
  } catch (error) {
    if (error.code) throw error;
    throw new Parse.Error(500, `Error al sincronizar convenios: ${error.message}`);
  }
});

// ==================================================================
// ===================================================================
// MODULO: SOLICITUDES DE MANTENIMIENTO / ORDENES DE TRABAJO
// ===================================================================
// Clases Parse usadas:
//   - SolicitudMantenimiento
//   - EncargadoMantenimiento
//   - SolicitudHistorial
//   - NotificacionCorreo
//   - Contador  (folios/OT secuenciales por año)
// ===================================================================

const {
  templateSolicitudRecibida,
  templateSolicitudAceptada,
  templateSolicitudRechazada,
  templateRespuestaSolicitante,
  templateAsignacionEncargado,
  templateAsignacionAlSolicitante,
  templateSolicitudCompletada,
} = require('../services/templates-solicitud');
const { enviarCorreo, estadoConfig } = require('../services/brevo-mailer');

// ---- Helpers ----
function generarTokenOpaco(len = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function pad(n, len) {
  return n.toString().padStart(len, '0');
}

function yyyymmdd(d = new Date()) {
  const m = pad(d.getMonth() + 1, 2);
  const dd = pad(d.getDate(), 2);
  return `${d.getFullYear()}${m}${dd}`;
}

// Atomico: incrementa el contador para (tipo, anio) y devuelve el nuevo valor
async function siguienteSecuencia(tipo, anio) {
  const Contador = Parse.Object.extend('Contador');
  const query = new Parse.Query(Contador);
  query.equalTo('tipo', tipo);
  query.equalTo('anio', anio);
  let contador = await query.first({ useMasterKey: true });
  if (!contador) {
    contador = new Contador();
    contador.set('tipo', tipo);
    contador.set('anio', anio);
    contador.set('ultimo', 0);
  }
  contador.increment('ultimo', 1);
  await contador.save(null, { useMasterKey: true });
  return contador.get('ultimo');
}

async function registrarHistorialSolicitud({
  solicitud, accion, descripcion, estadoAnterior, estadoNuevo, user, detalles = {},
}) {
  try {
    const H = Parse.Object.extend('SolicitudHistorial');
    const h = new H();
    h.set('solicitudId', solicitud.id);
    h.set('folio', solicitud.get('folio'));
    h.set('accion', accion);
    h.set('descripcion', descripcion || '');
    h.set('estadoAnterior', estadoAnterior || '');
    h.set('estadoNuevo', estadoNuevo || '');
    h.set('usuarioId', user ? user.id : '');
    h.set('usuarioNombre', user
      ? `${user.get('firstName') || ''} ${user.get('lastName') || ''}`.trim() || user.get('username')
      : 'Sistema/Publico');
    h.set('detalles', detalles);
    await h.save(null, { useMasterKey: true });
  } catch (err) {
    console.error('[SolicitudHistorial] Error guardando:', err.message);
  }
}

async function logCorreo({ solicitud, tipo, destinatario, asunto, estado, messageId, error }) {
  try {
    const N = Parse.Object.extend('NotificacionCorreo');
    const n = new N();
    n.set('solicitudId', solicitud ? solicitud.id : '');
    n.set('folio', solicitud ? solicitud.get('folio') : '');
    n.set('tipo', tipo);
    n.set('destinatario', destinatario);
    n.set('asunto', asunto);
    n.set('estado', estado);
    if (messageId) n.set('messageId', messageId);
    if (error) n.set('error', error);
    await n.save(null, { useMasterKey: true });
  } catch (err) {
    console.error('[NotificacionCorreo] Error logueando:', err.message);
  }
}

function serializarSolicitud(s) {
  return {
    id: s.id,
    objectId: s.id,
    folio: s.get('folio'),
    tokenConsulta: s.get('tokenConsulta'),
    solicitanteNombre: s.get('solicitanteNombre'),
    solicitanteCargo: s.get('solicitanteCargo'),
    solicitanteAnexo: s.get('solicitanteAnexo'),
    solicitanteTelefono: s.get('solicitanteTelefono'),
    solicitanteEmail: s.get('solicitanteEmail'),
    solicitanteServicio: s.get('solicitanteServicio'),
    descripcion: s.get('descripcion'),
    imagenes: s.get('imagenes') || [],
    archivos: s.get('archivos') || [],
    dominioSugerido: s.get('dominioSugerido'),
    estado: s.get('estado'),
    motivoRechazo: s.get('motivoRechazo'),
    respuestaAdmin: s.get('respuestaAdmin'),
    ordenTrabajoNumero: s.get('ordenTrabajoNumero'),
    fechaAceptacion: s.get('fechaAceptacion'),
    aceptadoPorId: s.get('aceptadoPorId'),
    aceptadoPorNombre: s.get('aceptadoPorNombre'),
    encargadoId: s.get('encargadoId'),
    encargadoNombre: s.get('encargadoNombre'),
    encargadoEmail: s.get('encargadoEmail'),
    encargadoUsuarioParseId: s.get('encargadoUsuarioParseId'),
    instruccionesAdmin: s.get('instruccionesAdmin'),
    fechaAsignacion: s.get('fechaAsignacion'),
    observacionesEncargado: s.get('observacionesEncargado'),
    fechaCompletada: s.get('fechaCompletada'),
    archivosVerificables: s.get('archivosVerificables') || [],
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function serializarEncargado(e) {
  return {
    id: e.id,
    objectId: e.id,
    nombre: e.get('nombre'),
    cargo: e.get('cargo'),
    especialidades: e.get('especialidades') || [],
    dominios: e.get('dominios') || [],
    telefono: e.get('telefono'),
    email: e.get('email'),
    usuarioParseId: e.get('usuarioParseId'),
    activo: e.get('activo') !== false,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// ===================================================================
// CRUD ENCARGADOS (ADMIN 4)
// ===================================================================

Parse.Cloud.define('getEncargados', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 2) throw new Parse.Error(403, 'Se requieren permisos');

  const { soloActivos = true, busqueda = '', dominio = '', limit = 100, skip = 0 } = request.params || {};
  const q = new Parse.Query('EncargadoMantenimiento');
  if (soloActivos) q.equalTo('activo', true);
  if (dominio) q.equalTo('dominios', dominio);
  q.ascending('nombre');
  q.limit(Math.min(limit, 500));
  q.skip(skip);
  let results = await q.find({ useMasterKey: true });
  if (busqueda && busqueda.trim()) {
    const t = busqueda.trim().toLowerCase();
    results = results.filter((e) =>
      (e.get('nombre') || '').toLowerCase().includes(t) ||
      (e.get('cargo') || '').toLowerCase().includes(t) ||
      (e.get('email') || '').toLowerCase().includes(t)
    );
  }
  return { results: results.map(serializarEncargado), total: results.length };
});

Parse.Cloud.define('crearEncargado', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede crear encargados');

  const {
    nombre, cargo, especialidades = [], dominios = [], telefono, email,
    username, password, crearUsuarioParse = true,
  } = request.params || {};

  if (!nombre || !email) throw new Parse.Error(400, 'Nombre y email son obligatorios');

  // Crear cuenta Parse asociada (obligatorio por requisito de negocio)
  let usuarioParseId = '';
  if (crearUsuarioParse) {
    const existingQ = new Parse.Query(Parse.User);
    existingQ.equalTo('email', email);
    const existing = await existingQ.first({ useMasterKey: true });
    if (existing) {
      usuarioParseId = existing.id;
    } else {
      const u = new Parse.User();
      u.set('username', username || email);
      u.set('email', email);
      u.set('password', password || generarTokenOpaco(12));
      u.set('firstName', nombre.split(' ')[0] || nombre);
      u.set('lastName', nombre.split(' ').slice(1).join(' '));
      u.set('accessLevel', 2); // OPERATOR
      u.set('esEncargado', true);
      await u.signUp(null, { useMasterKey: true });
      usuarioParseId = u.id;
    }
  }

  const E = Parse.Object.extend('EncargadoMantenimiento');
  const e = new E();
  e.set('nombre', nombre);
  e.set('cargo', cargo || '');
  e.set('especialidades', especialidades);
  e.set('dominios', dominios);
  e.set('telefono', telefono || '');
  e.set('email', email);
  e.set('usuarioParseId', usuarioParseId);
  e.set('activo', true);
  await e.save(null, { useMasterKey: true });
  return serializarEncargado(e);
});

Parse.Cloud.define('actualizarEncargado', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede modificar encargados');

  const { id, nombre, cargo, especialidades, dominios, telefono, email, activo } = request.params || {};
  if (!id) throw new Parse.Error(400, 'id requerido');
  const q = new Parse.Query('EncargadoMantenimiento');
  const e = await q.get(id, { useMasterKey: true });
  if (nombre !== undefined) e.set('nombre', nombre);
  if (cargo !== undefined) e.set('cargo', cargo);
  if (especialidades !== undefined) e.set('especialidades', especialidades);
  if (dominios !== undefined) e.set('dominios', dominios);
  if (telefono !== undefined) e.set('telefono', telefono);
  if (email !== undefined) e.set('email', email);
  if (activo !== undefined) e.set('activo', !!activo);
  await e.save(null, { useMasterKey: true });
  return serializarEncargado(e);
});

Parse.Cloud.define('eliminarEncargado', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede eliminar encargados');
  const { id } = request.params || {};
  if (!id) throw new Parse.Error(400, 'id requerido');
  const q = new Parse.Query('EncargadoMantenimiento');
  const e = await q.get(id, { useMasterKey: true });
  e.set('activo', false); // soft delete
  await e.save(null, { useMasterKey: true });
  return { success: true };
});

// ===================================================================
// SOLICITUDES — PUBLICAS (SIN AUTH)
// ===================================================================

Parse.Cloud.define('crearSolicitudMantenimientoPublica', async (request) => {
  const {
    solicitanteNombre, solicitanteCargo, solicitanteAnexo, solicitanteTelefono,
    solicitanteEmail, solicitanteServicio, descripcion,
    imagenes = [], archivos = [], dominioSugerido = '',
    captchaRespuesta, captchaEsperado,
  } = request.params || {};

  // Validaciones basicas
  if (!solicitanteNombre || !solicitanteEmail || !descripcion) {
    throw new Parse.Error(400, 'Nombre, email y descripcion son obligatorios');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(solicitanteEmail)) {
    throw new Parse.Error(400, 'Email invalido');
  }
  if ((imagenes || []).length > 2) {
    throw new Parse.Error(400, 'Maximo 2 imagenes permitidas');
  }
  if ((archivos || []).length > 5) {
    throw new Parse.Error(400, 'Maximo 5 archivos adjuntos permitidos');
  }
  // CAPTCHA matematico: el frontend envia la pregunta resuelta y el esperado firmado
  if (!captchaRespuesta || !captchaEsperado || parseInt(captchaRespuesta, 10) !== parseInt(captchaEsperado, 10)) {
    throw new Parse.Error(400, 'Captcha invalido. Intenta nuevamente.');
  }

  const anio = new Date().getFullYear();
  const seq = await siguienteSecuencia('SOL', anio);
  const folio = `SOL-${anio}-${pad(seq, 5)}`;
  const token = generarTokenOpaco(32);

  const S = Parse.Object.extend('SolicitudMantenimiento');
  const s = new S();
  s.set('folio', folio);
  s.set('tokenConsulta', token);
  s.set('solicitanteNombre', solicitanteNombre.trim());
  s.set('solicitanteCargo', (solicitanteCargo || '').trim());
  s.set('solicitanteAnexo', (solicitanteAnexo || '').trim());
  s.set('solicitanteTelefono', (solicitanteTelefono || '').trim());
  s.set('solicitanteEmail', solicitanteEmail.trim().toLowerCase());
  s.set('solicitanteServicio', (solicitanteServicio || '').trim());
  s.set('descripcion', descripcion.trim());
  s.set('imagenes', imagenes);
  s.set('archivos', archivos);
  s.set('dominioSugerido', dominioSugerido);
  s.set('estado', 'pendiente');
  await s.save(null, { useMasterKey: true });

  await registrarHistorialSolicitud({
    solicitud: s, accion: 'creada',
    descripcion: 'Solicitud creada desde formulario publico',
    estadoAnterior: '', estadoNuevo: 'pendiente', user: null,
  });

  // Correo de recibido
  const { subject, html } = templateSolicitudRecibida(serializarSolicitud(s));
  const mailRes = await enviarCorreo({ to: s.get('solicitanteEmail'), subject, html });
  await logCorreo({
    solicitud: s, tipo: 'solicitud_recibida',
    destinatario: s.get('solicitanteEmail'), asunto: subject,
    estado: mailRes.success ? 'enviado' : 'fallido',
    messageId: mailRes.messageId, error: mailRes.error,
  });

  return {
    folio, tokenConsulta: token,
    estado: 'pendiente', id: s.id,
  };
});

Parse.Cloud.define('consultarSolicitudPublica', async (request) => {
  const { folio, token } = request.params || {};
  if (!folio || !token) throw new Parse.Error(400, 'Folio y token requeridos');
  const q = new Parse.Query('SolicitudMantenimiento');
  q.equalTo('folio', folio);
  q.equalTo('tokenConsulta', token);
  const s = await q.first({ useMasterKey: true });
  if (!s) throw new Parse.Error(404, 'Solicitud no encontrada');
  const d = serializarSolicitud(s);
  // Devolvemos datos limitados: no exponer tokens ni detalles sensibles
  return {
    folio: d.folio, estado: d.estado,
    ordenTrabajoNumero: d.ordenTrabajoNumero,
    solicitanteNombre: d.solicitanteNombre,
    descripcion: d.descripcion,
    fechaCreacion: d.createdAt,
    encargadoNombre: d.encargadoNombre,
    respuestaAdmin: d.respuestaAdmin,
    motivoRechazo: d.motivoRechazo,
    observacionesEncargado: d.observacionesEncargado,
    fechaAceptacion: d.fechaAceptacion,
    fechaAsignacion: d.fechaAsignacion,
    fechaCompletada: d.fechaCompletada,
  };
});

// ===================================================================
// SOLICITUDES — ADMIN
// ===================================================================

Parse.Cloud.define('getSolicitudes', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 3) throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');
  const {
    estado, fechaDesde, fechaHasta, busqueda = '', encargadoId,
    limit = 20, skip = 0,
  } = request.params || {};
  const q = new Parse.Query('SolicitudMantenimiento');
  if (estado) q.equalTo('estado', estado);
  if (encargadoId) q.equalTo('encargadoId', encargadoId);
  if (fechaDesde) q.greaterThanOrEqualTo('createdAt', new Date(fechaDesde));
  if (fechaHasta) q.lessThanOrEqualTo('createdAt', new Date(fechaHasta + 'T23:59:59'));
  q.descending('createdAt');
  const total = await q.count({ useMasterKey: true });
  q.limit(limit);
  q.skip(skip);
  let results = await q.find({ useMasterKey: true });
  if (busqueda && busqueda.trim()) {
    const t = busqueda.trim().toLowerCase();
    results = results.filter((s) =>
      (s.get('folio') || '').toLowerCase().includes(t) ||
      (s.get('ordenTrabajoNumero') || '').toLowerCase().includes(t) ||
      (s.get('solicitanteNombre') || '').toLowerCase().includes(t) ||
      (s.get('solicitanteServicio') || '').toLowerCase().includes(t) ||
      (s.get('descripcion') || '').toLowerCase().includes(t)
    );
  }
  return { results: results.map(serializarSolicitud), total };
});

Parse.Cloud.define('getSolicitudById', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 2) throw new Parse.Error(403, 'Se requieren permisos');
  const { id } = request.params || {};
  if (!id) throw new Parse.Error(400, 'id requerido');
  const q = new Parse.Query('SolicitudMantenimiento');
  const s = await q.get(id, { useMasterKey: true });
  return serializarSolicitud(s);
});

Parse.Cloud.define('getSolicitudHistorial', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 2) throw new Parse.Error(403, 'Se requieren permisos');
  const { solicitudId, limit = 100 } = request.params || {};
  if (!solicitudId) throw new Parse.Error(400, 'solicitudId requerido');
  const q = new Parse.Query('SolicitudHistorial');
  q.equalTo('solicitudId', solicitudId);
  q.descending('createdAt');
  q.limit(limit);
  const results = await q.find({ useMasterKey: true });
  return {
    results: results.map((h) => ({
      id: h.id,
      accion: h.get('accion'),
      descripcion: h.get('descripcion'),
      estadoAnterior: h.get('estadoAnterior'),
      estadoNuevo: h.get('estadoNuevo'),
      usuarioId: h.get('usuarioId'),
      usuarioNombre: h.get('usuarioNombre'),
      detalles: h.get('detalles') || {},
      createdAt: h.createdAt,
    })),
  };
});

Parse.Cloud.define('aceptarSolicitud', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede aceptar');
  const { id, comentario = '' } = request.params || {};
  const q = new Parse.Query('SolicitudMantenimiento');
  const s = await q.get(id, { useMasterKey: true });
  const estadoAnterior = s.get('estado');
  if (!['pendiente', 'rechazada'].includes(estadoAnterior)) {
    throw new Parse.Error(400, `No se puede aceptar una solicitud en estado ${estadoAnterior}`);
  }

  // Generar OT: OT-{NNNNN}-{YYYYMMDD}
  const hoy = new Date();
  const seq = await siguienteSecuencia('OT', hoy.getFullYear());
  const ot = `OT-${pad(seq, 5)}-${yyyymmdd(hoy)}`;

  const usuario = request.user;
  s.set('estado', 'aceptada');
  s.set('ordenTrabajoNumero', ot);
  s.set('respuestaAdmin', comentario);
  s.set('fechaAceptacion', hoy);
  s.set('aceptadoPorId', usuario.id);
  s.set('aceptadoPorNombre', `${usuario.get('firstName') || ''} ${usuario.get('lastName') || ''}`.trim());
  // Al reabrir una rechazada: limpiar motivo
  s.set('motivoRechazo', '');
  await s.save(null, { useMasterKey: true });

  await registrarHistorialSolicitud({
    solicitud: s, accion: estadoAnterior === 'rechazada' ? 'reabierta' : 'aceptada',
    descripcion: `${estadoAnterior === 'rechazada' ? 'Reabierta y aceptada' : 'Aceptada'}. OT generada: ${ot}. ${comentario || ''}`.trim(),
    estadoAnterior, estadoNuevo: 'aceptada', user: usuario, detalles: { ordenTrabajoNumero: ot },
  });

  const { subject, html } = templateSolicitudAceptada(serializarSolicitud(s));
  const mailRes = await enviarCorreo({ to: s.get('solicitanteEmail'), subject, html });
  await logCorreo({
    solicitud: s, tipo: 'solicitud_aceptada', destinatario: s.get('solicitanteEmail'),
    asunto: subject, estado: mailRes.success ? 'enviado' : 'fallido',
    messageId: mailRes.messageId, error: mailRes.error,
  });

  return serializarSolicitud(s);
});

Parse.Cloud.define('rechazarSolicitud', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede rechazar');
  const { id, motivo } = request.params || {};
  if (!motivo || !motivo.trim()) throw new Parse.Error(400, 'El motivo es obligatorio');
  const q = new Parse.Query('SolicitudMantenimiento');
  const s = await q.get(id, { useMasterKey: true });
  const estadoAnterior = s.get('estado');
  if (!['pendiente', 'aceptada'].includes(estadoAnterior)) {
    throw new Parse.Error(400, `No se puede rechazar en estado ${estadoAnterior}`);
  }
  s.set('estado', 'rechazada');
  s.set('motivoRechazo', motivo.trim());
  await s.save(null, { useMasterKey: true });

  await registrarHistorialSolicitud({
    solicitud: s, accion: 'rechazada', descripcion: motivo,
    estadoAnterior, estadoNuevo: 'rechazada', user: request.user,
  });

  const { subject, html } = templateSolicitudRechazada(serializarSolicitud(s));
  const mailRes = await enviarCorreo({ to: s.get('solicitanteEmail'), subject, html });
  await logCorreo({
    solicitud: s, tipo: 'solicitud_rechazada', destinatario: s.get('solicitanteEmail'),
    asunto: subject, estado: mailRes.success ? 'enviado' : 'fallido',
    messageId: mailRes.messageId, error: mailRes.error,
  });

  return serializarSolicitud(s);
});

Parse.Cloud.define('responderSolicitud', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede responder');
  const { id, mensaje } = request.params || {};
  if (!mensaje || !mensaje.trim()) throw new Parse.Error(400, 'El mensaje es obligatorio');
  const q = new Parse.Query('SolicitudMantenimiento');
  const s = await q.get(id, { useMasterKey: true });

  await registrarHistorialSolicitud({
    solicitud: s, accion: 'respuesta_admin', descripcion: mensaje.trim(),
    estadoAnterior: s.get('estado'), estadoNuevo: s.get('estado'), user: request.user,
  });

  const { subject, html } = templateRespuestaSolicitante(serializarSolicitud(s), mensaje.trim());
  const mailRes = await enviarCorreo({ to: s.get('solicitanteEmail'), subject, html });
  await logCorreo({
    solicitud: s, tipo: 'respuesta_admin', destinatario: s.get('solicitanteEmail'),
    asunto: subject, estado: mailRes.success ? 'enviado' : 'fallido',
    messageId: mailRes.messageId, error: mailRes.error,
  });
  return { success: true };
});

Parse.Cloud.define('asignarEncargadoSolicitud', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede asignar');
  const { id, encargadoId, instrucciones = '' } = request.params || {};
  if (!id || !encargadoId) throw new Parse.Error(400, 'id y encargadoId requeridos');
  const qS = new Parse.Query('SolicitudMantenimiento');
  const s = await qS.get(id, { useMasterKey: true });
  const qE = new Parse.Query('EncargadoMantenimiento');
  const e = await qE.get(encargadoId, { useMasterKey: true });
  if (!e.get('activo')) throw new Parse.Error(400, 'El encargado no esta activo');

  const estadoAnterior = s.get('estado');
  if (!['aceptada', 'asignada', 'devuelta', 'en_proceso'].includes(estadoAnterior)) {
    throw new Parse.Error(400, `No se puede asignar en estado ${estadoAnterior}`);
  }
  s.set('encargadoId', e.id);
  s.set('encargadoNombre', e.get('nombre'));
  s.set('encargadoEmail', e.get('email'));
  s.set('encargadoUsuarioParseId', e.get('usuarioParseId') || '');
  s.set('instruccionesAdmin', instrucciones);
  s.set('fechaAsignacion', new Date());
  s.set('estado', 'asignada');
  await s.save(null, { useMasterKey: true });

  await registrarHistorialSolicitud({
    solicitud: s, accion: estadoAnterior === 'asignada' ? 'reasignada' : 'asignada',
    descripcion: `Asignada a ${e.get('nombre')}. ${instrucciones || ''}`.trim(),
    estadoAnterior, estadoNuevo: 'asignada', user: request.user,
    detalles: { encargadoId: e.id, encargadoNombre: e.get('nombre') },
  });

  // Correo al encargado
  const sData = serializarSolicitud(s);
  const eData = serializarEncargado(e);
  const t1 = templateAsignacionEncargado(sData, eData);
  const r1 = await enviarCorreo({ to: e.get('email'), subject: t1.subject, html: t1.html });
  await logCorreo({
    solicitud: s, tipo: 'asignacion_encargado', destinatario: e.get('email'),
    asunto: t1.subject, estado: r1.success ? 'enviado' : 'fallido',
    messageId: r1.messageId, error: r1.error,
  });
  // Correo al solicitante
  const t2 = templateAsignacionAlSolicitante(sData, eData);
  const r2 = await enviarCorreo({ to: s.get('solicitanteEmail'), subject: t2.subject, html: t2.html });
  await logCorreo({
    solicitud: s, tipo: 'asignacion_solicitante', destinatario: s.get('solicitanteEmail'),
    asunto: t2.subject, estado: r2.success ? 'enviado' : 'fallido',
    messageId: r2.messageId, error: r2.error,
  });

  return sData;
});

Parse.Cloud.define('devolverSolicitud', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 2) throw new Parse.Error(403, 'Permisos insuficientes');
  const { id, observacion } = request.params || {};
  if (!observacion || !observacion.trim()) throw new Parse.Error(400, 'Observacion requerida');
  const q = new Parse.Query('SolicitudMantenimiento');
  const s = await q.get(id, { useMasterKey: true });
  if (s.get('encargadoUsuarioParseId') && s.get('encargadoUsuarioParseId') !== request.user.id && level < 4) {
    throw new Parse.Error(403, 'Solo el encargado asignado puede devolver');
  }
  const estadoAnterior = s.get('estado');
  s.set('estado', 'devuelta');
  s.set('observacionesEncargado', observacion.trim());
  await s.save(null, { useMasterKey: true });
  await registrarHistorialSolicitud({
    solicitud: s, accion: 'devuelta', descripcion: observacion.trim(),
    estadoAnterior, estadoNuevo: 'devuelta', user: request.user,
  });
  return serializarSolicitud(s);
});

Parse.Cloud.define('iniciarSolicitud', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const { id } = request.params || {};
  const q = new Parse.Query('SolicitudMantenimiento');
  const s = await q.get(id, { useMasterKey: true });
  const level = request.user.get('accessLevel') || 1;
  if (s.get('encargadoUsuarioParseId') !== request.user.id && level < 4) {
    throw new Parse.Error(403, 'Solo el encargado asignado puede iniciar');
  }
  if (!['asignada', 'devuelta'].includes(s.get('estado'))) {
    throw new Parse.Error(400, `No se puede iniciar en estado ${s.get('estado')}`);
  }
  const estadoAnterior = s.get('estado');
  s.set('estado', 'en_proceso');
  await s.save(null, { useMasterKey: true });
  await registrarHistorialSolicitud({
    solicitud: s, accion: 'iniciada', descripcion: 'Trabajo iniciado por el encargado',
    estadoAnterior, estadoNuevo: 'en_proceso', user: request.user,
  });
  return serializarSolicitud(s);
});

Parse.Cloud.define('completarSolicitud', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const { id, observaciones = '', archivosVerificables = [] } = request.params || {};
  const q = new Parse.Query('SolicitudMantenimiento');
  const s = await q.get(id, { useMasterKey: true });
  const level = request.user.get('accessLevel') || 1;
  if (s.get('encargadoUsuarioParseId') !== request.user.id && level < 4) {
    throw new Parse.Error(403, 'Solo el encargado asignado puede completar');
  }
  const estadoAnterior = s.get('estado');
  if (!['asignada', 'en_proceso'].includes(estadoAnterior)) {
    throw new Parse.Error(400, `No se puede completar en estado ${estadoAnterior}`);
  }
  s.set('estado', 'completada');
  s.set('observacionesEncargado', observaciones);
  s.set('archivosVerificables', archivosVerificables);
  s.set('fechaCompletada', new Date());
  await s.save(null, { useMasterKey: true });

  await registrarHistorialSolicitud({
    solicitud: s, accion: 'completada',
    descripcion: `Trabajo marcado completado. ${archivosVerificables.length} archivo(s) verificable(s).`,
    estadoAnterior, estadoNuevo: 'completada', user: request.user,
  });

  const { subject, html } = templateSolicitudCompletada(serializarSolicitud(s));
  const mailRes = await enviarCorreo({ to: s.get('solicitanteEmail'), subject, html });
  await logCorreo({
    solicitud: s, tipo: 'solicitud_completada', destinatario: s.get('solicitanteEmail'),
    asunto: subject, estado: mailRes.success ? 'enviado' : 'fallido',
    messageId: mailRes.messageId, error: mailRes.error,
  });
  return serializarSolicitud(s);
});

Parse.Cloud.define('cerrarSolicitud', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede cerrar');
  const { id } = request.params || {};
  const q = new Parse.Query('SolicitudMantenimiento');
  const s = await q.get(id, { useMasterKey: true });
  const estadoAnterior = s.get('estado');
  if (estadoAnterior !== 'completada') throw new Parse.Error(400, 'Solo solicitudes completadas pueden cerrarse');
  s.set('estado', 'cerrada');
  await s.save(null, { useMasterKey: true });
  await registrarHistorialSolicitud({
    solicitud: s, accion: 'cerrada', descripcion: 'Cerrada administrativamente',
    estadoAnterior, estadoNuevo: 'cerrada', user: request.user,
  });
  return serializarSolicitud(s);
});

Parse.Cloud.define('getMisAsignaciones', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const q = new Parse.Query('SolicitudMantenimiento');
  q.equalTo('encargadoUsuarioParseId', request.user.id);
  q.containedIn('estado', ['asignada', 'en_proceso', 'devuelta']);
  q.descending('fechaAsignacion');
  q.limit(50);
  const results = await q.find({ useMasterKey: true });
  return { results: results.map(serializarSolicitud), total: results.length };
});

// ===================================================================
// DIAGNOSTICO SMTP BREVO
// ===================================================================

// Devuelve estado de configuracion (sin exponer secretos)
Parse.Cloud.define('getEstadoConfigBrevo', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede ver configuracion');
  return estadoConfig();
});

// Fuerza el envio de un correo de prueba
Parse.Cloud.define('enviarCorreoPrueba', async (request) => {
  if (!request.user) throw new Parse.Error(403, 'Se requiere autenticacion');
  const level = request.user.get('accessLevel') || 1;
  if (level < 4) throw new Parse.Error(403, 'Solo admin puede probar correos');
  const { destinatario } = request.params || {};
  if (!destinatario) throw new Parse.Error(400, 'destinatario requerido');
  const html = `
    <div style="font-family:Arial,sans-serif; padding:20px; max-width:500px; margin:auto; border:1px solid #e5e7eb; border-radius:8px;">
      <h2 style="color:#2563eb;">Prueba de correo Brevo — DATACEF</h2>
      <p>Si estas leyendo este mensaje, el sistema de notificaciones por correo esta funcionando correctamente.</p>
      <p style="font-size:12px; color:#9ca3af;">Enviado desde el backend de Mantenimiento a las ${new Date().toISOString()}.</p>
    </div>`;
  const res = await enviarCorreo({
    to: destinatario,
    subject: '[DATACEF] Correo de prueba del sistema de mantenimiento',
    html,
  });
  return {
    ...res,
    config: estadoConfig(),
  };
});

// Log de estado Brevo al arrancar
try {
  const estado = estadoConfig();
  console.log('📧 Brevo config:', JSON.stringify({
    host: estado.host,
    port: estado.port,
    user: estado.userPreview,
    pass: estado.passDefinida ? '[DEFINIDA]' : '[AUSENTE]',
    sender: `${estado.senderName} <${estado.senderEmail}>`,
  }));
  if (!estado.userDefinido || !estado.passDefinida) {
    console.warn('⚠️  Faltan BREVO_SMTP_USER / BREVO_SMTP_PASS en el .env — los correos NO se enviaran hasta corregirlo.');
  }
} catch (e) { /* noop */ }

// =====================================================================
// ETAPA 1 — Motor de cumplimiento de mantenimientos (Inventario × Mantto)
// Ref: context/mmtto/actualizacion-modulo-inventario-mantenimiento.md
// =====================================================================
const cumplimientoMtto = require('./utils/cumplimientoMantenimiento');

/**
 * calcularCumplimientoMantenimiento — VIEWER (1)
 * Calcula cumplimiento on-demand sin persistir. Usada por la pestana de detalle.
 */
Parse.Cloud.define('calcularCumplimientoMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { activoId, activoClase } = request.params || {};
  if (!activoId) throw new Parse.Error(400, 'activoId es obligatorio');
  if (!activoClase) throw new Parse.Error(400, 'activoClase es obligatoria');
  if (!cumplimientoMtto.DOMINIO_POR_CLASE[activoClase]) {
    throw new Parse.Error(400, `activoClase desconocida: ${activoClase}`);
  }

  const r = await cumplimientoMtto.sincronizarActivoParse(Parse, activoId, activoClase, { persistir: false });
  if (!r.ok) throw new Parse.Error(500, r.error);
  return r.resultado;
});

/**
 * sincronizarCumplimientoActivo — OPERATOR (2)
 * Recalcula y PERSISTE los campos denormalizados en el activo.
 */
Parse.Cloud.define('sincronizarCumplimientoActivo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) throw new Parse.Error(403, 'Se requieren permisos de operador o superior');

  const { activoId, activoClase } = request.params || {};
  if (!activoId) throw new Parse.Error(400, 'activoId es obligatorio');
  if (!activoClase) throw new Parse.Error(400, 'activoClase es obligatoria');
  if (!cumplimientoMtto.DOMINIO_POR_CLASE[activoClase]) {
    throw new Parse.Error(400, `activoClase desconocida: ${activoClase}`);
  }

  const r = await cumplimientoMtto.sincronizarActivoParse(Parse, activoId, activoClase, { persistir: true });
  if (!r.ok) throw new Parse.Error(500, r.error);
  return r.resultado;
});

/**
 * sincronizarCumplimientoMasivo — ADMIN (4)
 * Recorre todos los activos del dominio (o todos los dominios) y ejecuta sincronizacion.
 * Paginado por lotes de 200 activos.
 */
Parse.Cloud.define('sincronizarCumplimientoMasivo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 4) throw new Parse.Error(403, 'Se requieren permisos de administrador');

  const { dominio = null, loteSize = 200 } = request.params || {};
  const clases = dominio
    ? [cumplimientoMtto.CLASE_POR_DOMINIO[dominio]].filter(Boolean)
    : cumplimientoMtto.CLASES_INVENTARIO.slice();

  if (clases.length === 0) throw new Parse.Error(400, `dominio invalido: ${dominio}`);

  const reporte = { procesados: 0, ok: 0, errores: 0, porClase: {}, detalleErrores: [] };

  for (const clase of clases) {
    reporte.porClase[clase] = { total: 0, ok: 0, errores: 0 };
    let skip = 0;
    while (true) {
      const q = new Parse.Query(clase);
      q.equalTo('activo', true);
      q.ascending('objectId');
      q.limit(loteSize);
      q.skip(skip);
      q.select('objectId');
      const items = await q.find({ useMasterKey: true });
      if (items.length === 0) break;

      for (const it of items) {
        reporte.procesados++;
        reporte.porClase[clase].total++;
        const r = await cumplimientoMtto.sincronizarActivoParse(Parse, it.id, clase, { persistir: true });
        if (r.ok) {
          reporte.ok++;
          reporte.porClase[clase].ok++;
        } else {
          reporte.errores++;
          reporte.porClase[clase].errores++;
          if (reporte.detalleErrores.length < 50) {
            reporte.detalleErrores.push({ clase, id: it.id, error: r.error });
          }
        }
      }

      if (items.length < loteSize) break;
      skip += items.length;
    }
  }

  return reporte;
});

/**
 * getEstadisticasCumplimiento — VIEWER (1)
 * Agregados por dominio para dashboard.
 */
Parse.Cloud.define('getEstadisticasCumplimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { dominio = null } = request.params || {};
  const clases = dominio
    ? [cumplimientoMtto.CLASE_POR_DOMINIO[dominio]].filter(Boolean)
    : cumplimientoMtto.CLASES_INVENTARIO.slice();

  const estados = ['sin_configuracion', 'sin_historial', 'al_dia', 'con_retraso', 'critico', 'dado_de_baja'];
  const porDominio = {};
  let totalGlobal = 0;
  let sumaPorcentaje = 0;
  let cuentaConPeriodos = 0;

  for (const clase of clases) {
    const dom = cumplimientoMtto.DOMINIO_POR_CLASE[clase];
    porDominio[dom] = { total: 0 };
    estados.forEach((e) => { porDominio[dom][e] = 0; });

    for (const est of estados) {
      const q = new Parse.Query(clase);
      q.equalTo('activo', true);
      q.equalTo('estadoCumplimientoMantenimiento', est);
      const c = await q.count({ useMasterKey: true });
      porDominio[dom][est] = c;
      porDominio[dom].total += c;
      totalGlobal += c;
    }

    // Promedio de porcentaje (solo de los que tienen periodos esperados > 0)
    const qAvg = new Parse.Query(clase);
    qAvg.equalTo('activo', true);
    qAvg.greaterThan('periodosEsperados', 0);
    qAvg.limit(5000);
    qAvg.select('cumplimientoPorcentaje');
    const avgItems = await qAvg.find({ useMasterKey: true });
    for (const it of avgItems) {
      const p = it.get('cumplimientoPorcentaje');
      if (typeof p === 'number') {
        sumaPorcentaje += p;
        cuentaConPeriodos++;
      }
    }
  }

  const porcentajePromedio = cuentaConPeriodos > 0 ? Math.round((sumaPorcentaje / cuentaConPeriodos) * 10) / 10 : 0;

  return {
    porDominio,
    totalActivos: totalGlobal,
    porcentajePromedio,
  };
});

/**
 * getTopActivosCriticos — VIEWER (1) — Etapa 4
 * Devuelve los activos con mayor cantidad de periodos faltantes.
 * Permite filtrar por dominio (opcional). Default: top 20 globales.
 */
Parse.Cloud.define('getTopActivosCriticos', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { dominio = null, servicio = null, ubicacion = null, limit = 20 } = request.params || {};
  const clases = dominio
    ? [cumplimientoMtto.CLASE_POR_DOMINIO[dominio]].filter(Boolean)
    : cumplimientoMtto.CLASES_INVENTARIO.slice();

  const acumulado = [];
  for (const clase of clases) {
    const dom = cumplimientoMtto.DOMINIO_POR_CLASE[clase];
    const q = new Parse.Query(clase);
    q.equalTo('activo', true);
    q.greaterThan('periodosFaltantes', 0);
    q.descending('periodosFaltantes');
    q.addAscending('cumplimientoPorcentaje');
    q.limit(Math.min(limit * 4, 200));

    if (servicio && clase === 'InventarioEquipoMedico') q.equalTo('servicio', servicio);
    if (ubicacion && clase === 'InventarioEquipoIndustrial') q.equalTo('ubicacion', ubicacion);
    if (ubicacion && clase === 'InventarioInfraestructura') q.equalTo('ubicacion', ubicacion);

    const items = await q.find({ useMasterKey: true });
    for (const it of items) {
      acumulado.push({
        id: it.id,
        clase,
        dominio: dom,
        nombre: it.get('nombreEquipo') || it.get('nombreVehiculo') || it.get('componente') || '',
        identificador: it.get('inventario') || it.get('patente') || it.get('codigoInterno') || '',
        servicio: it.get('servicio') || '',
        ubicacion: it.get('ubicacion') || it.get('asignadoA') || '',
        estadoCumplimientoMantenimiento: it.get('estadoCumplimientoMantenimiento') || '',
        periodosCumplidos: it.get('periodosCumplidos') || 0,
        periodosEsperados: it.get('periodosEsperados') || 0,
        periodosFaltantes: it.get('periodosFaltantes') || 0,
        cumplimientoPorcentaje: it.get('cumplimientoPorcentaje') || 0,
        ultimaFechaMantenimiento: it.get('ultimaFechaMantenimiento') || '',
        proximaFechaMantenimientoEsperada: it.get('proximaFechaMantenimientoEsperada') || '',
      });
    }
  }

  // Ordenar globalmente por periodosFaltantes desc, cumplimiento asc
  acumulado.sort((a, b) => {
    if (b.periodosFaltantes !== a.periodosFaltantes) return b.periodosFaltantes - a.periodosFaltantes;
    return a.cumplimientoPorcentaje - b.cumplimientoPorcentaje;
  });

  return { results: acumulado.slice(0, limit), total: acumulado.length };
});

/**
 * getProximosMantenimientos — VIEWER (1) — Etapa 4
 * Lista activos cuya `proximaFechaMantenimientoEsperada` cae en una ventana de N dias.
 * Default: 30 dias. Tambien acepta dominio.
 */
Parse.Cloud.define('getProximosMantenimientos', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { dominio = null, dias = 30, limit = 100 } = request.params || {};
  const clases = dominio
    ? [cumplimientoMtto.CLASE_POR_DOMINIO[dominio]].filter(Boolean)
    : cumplimientoMtto.CLASES_INVENTARIO.slice();

  const hoy = new Date();
  const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  const hasta = new Date(desde.getTime() + parseInt(dias, 10) * 24 * 60 * 60 * 1000);
  const desdeStr = cumplimientoMtto.formatFecha(desde);
  const hastaStr = cumplimientoMtto.formatFecha(hasta);

  const acumulado = [];
  for (const clase of clases) {
    const dom = cumplimientoMtto.DOMINIO_POR_CLASE[clase];
    const q = new Parse.Query(clase);
    q.equalTo('activo', true);
    q.greaterThanOrEqualTo('proximaFechaMantenimientoEsperada', desdeStr);
    q.lessThanOrEqualTo('proximaFechaMantenimientoEsperada', hastaStr);
    q.ascending('proximaFechaMantenimientoEsperada');
    q.limit(Math.min(limit, 500));
    const items = await q.find({ useMasterKey: true });
    for (const it of items) {
      acumulado.push({
        id: it.id,
        clase,
        dominio: dom,
        nombre: it.get('nombreEquipo') || it.get('nombreVehiculo') || it.get('componente') || '',
        identificador: it.get('inventario') || it.get('patente') || it.get('codigoInterno') || '',
        servicio: it.get('servicio') || '',
        ubicacion: it.get('ubicacion') || it.get('asignadoA') || '',
        proximaFechaMantenimientoEsperada: it.get('proximaFechaMantenimientoEsperada') || '',
        ultimaFechaMantenimiento: it.get('ultimaFechaMantenimiento') || '',
        estadoCumplimientoMantenimiento: it.get('estadoCumplimientoMantenimiento') || '',
      });
    }
  }

  acumulado.sort((a, b) => {
    if (a.proximaFechaMantenimientoEsperada < b.proximaFechaMantenimientoEsperada) return -1;
    if (a.proximaFechaMantenimientoEsperada > b.proximaFechaMantenimientoEsperada) return 1;
    return 0;
  });

  return { results: acumulado.slice(0, limit), total: acumulado.length, ventanaDias: parseInt(dias, 10) };
});

/**
 * getCumplimientoLog — COORDINATOR (3) — Etapa 4.5
 * Historial de transiciones de estado de cumplimiento por activo.
 */
Parse.Cloud.define('getCumplimientoLog', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');

  const { activoId = null, activoClase = null, dominio = null, limit = 50, skip = 0 } = request.params || {};

  const q = new Parse.Query('CumplimientoLog');
  if (activoId) q.equalTo('activoId', activoId);
  if (activoClase) q.equalTo('activoClase', activoClase);
  if (dominio) q.equalTo('dominio', dominio);
  q.descending('createdAt');
  q.limit(Math.min(limit, 500));
  q.skip(skip);

  const total = await q.count({ useMasterKey: true });
  const items = await q.find({ useMasterKey: true });
  return {
    total,
    results: items.map((it) => ({
      id: it.id,
      activoId: it.get('activoId'),
      activoClase: it.get('activoClase'),
      dominio: it.get('dominio'),
      estadoAnterior: it.get('estadoAnterior'),
      estadoNuevo: it.get('estadoNuevo'),
      cumplimientoAnterior: it.get('cumplimientoAnterior'),
      cumplimientoNuevo: it.get('cumplimientoNuevo'),
      createdAt: it.createdAt,
    })),
  };
});

/**
 * getRegularizacionesPendientes — COORDINATOR (3) — Etapa 7.4
 * Lista activos con periodos faltantes >= 1, opcionalmente filtrando por
 * meses minimos de retraso. Para cada activo, calcula el listado de fechas
 * de los periodos faltantes (primer dia de cada periodo).
 */
Parse.Cloud.define('getRegularizacionesPendientes', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');

  const { dominio = null, mesesMinRetraso = 0, limit = 100 } = request.params || {};
  const clases = dominio
    ? [cumplimientoMtto.CLASE_POR_DOMINIO[dominio]].filter(Boolean)
    : cumplimientoMtto.CLASES_INVENTARIO.slice();

  const acumulado = [];
  for (const clase of clases) {
    const dom = cumplimientoMtto.DOMINIO_POR_CLASE[clase];
    const q = new Parse.Query(clase);
    q.equalTo('activo', true);
    q.greaterThan('periodosFaltantes', 0);
    q.descending('periodosFaltantes');
    q.limit(Math.min(limit * 2, 500));

    const items = await q.find({ useMasterKey: true });
    for (const it of items) {
      // Obtener historial aprobado del activo
      const historial = await new Parse.Query('RegistroMantenimiento')
        .equalTo('activoId', it.id)
        .equalTo('activoClase', clase)
        .equalTo('activo', true)
        .limit(500)
        .find({ useMasterKey: true });

      const campoBase = cumplimientoMtto.campoFechaBase(clase);
      const activoPlano = {
        fechaBase: campoBase ? it.get(campoBase) : null,
        frecuencia: it.get('frecuencia'),
        fechaBaja: it.get('fechaBaja'),
      };
      const calc = cumplimientoMtto.calcularCumplimiento(activoPlano, historial);
      const fechasFaltantes = (calc.periodos || [])
        .filter((p) => p.estado === 'faltante')
        .map((p) => p.desde);

      // Filtro por meses minimos de retraso
      if (mesesMinRetraso > 0 && fechasFaltantes.length > 0) {
        const ahora = new Date();
        const limite = new Date(ahora.getFullYear(), ahora.getMonth() - mesesMinRetraso, ahora.getDate());
        const fechaMasAntigua = cumplimientoMtto.parseFecha(fechasFaltantes[0]);
        if (!fechaMasAntigua || fechaMasAntigua.getTime() > limite.getTime()) continue;
      }

      acumulado.push({
        id: it.id,
        clase,
        dominio: dom,
        nombre: it.get('nombreEquipo') || it.get('nombreVehiculo') || it.get('componente') || '',
        identificador: it.get('inventario') || it.get('patente') || it.get('codigoInterno') || '',
        servicio: it.get('servicio') || '',
        ubicacion: it.get('ubicacion') || it.get('asignadoA') || '',
        pautaAsignada: it.get('pautaAsignada') || '',
        periodosFaltantes: it.get('periodosFaltantes') || 0,
        periodosEsperados: it.get('periodosEsperados') || 0,
        periodosCumplidos: it.get('periodosCumplidos') || 0,
        cumplimientoPorcentaje: it.get('cumplimientoPorcentaje') || 0,
        estadoCumplimientoMantenimiento: it.get('estadoCumplimientoMantenimiento') || '',
        ultimaFechaMantenimiento: it.get('ultimaFechaMantenimiento') || '',
        ultimoEstadoMantenimiento: it.get('ultimoEstadoMantenimiento') || '',
        fechasFaltantes,
        primerPeriodoFaltanteIndice: (calc.periodos || []).findIndex((p) => p.estado === 'faltante'),
      });
    }
  }

  acumulado.sort((a, b) => b.periodosFaltantes - a.periodosFaltantes);

  return { results: acumulado.slice(0, limit), total: acumulado.length };
});

// ---------------------------------------------------------------------
// Etapa 3 (revision-inventarios): accion atomica Dar de Baja / Reactivar
// ---------------------------------------------------------------------

/**
 * Mapea cada clase de inventario a su funcion de historial y a su campo
 * adicional (si lo hay) para identificar el id del activo en el historial.
 */
const _BAJA_INVENTARIO_HOOKS = {
  InventarioEquipoMedico: {
    registrarHistorial: (id, accion, cambios, descripcion, user, archivoInfo) =>
      registrarHistorial(id, accion, cambios, descripcion, user, archivoInfo),
  },
  InventarioEquipoIndustrial: {
    registrarHistorial: (id, accion, cambios, descripcion, user, archivoInfo) =>
      registrarHistorialIndustrial(id, accion, cambios, descripcion, user, archivoInfo),
  },
  InventarioFlotaVehicular: {
    registrarHistorial: (id, accion, cambios, descripcion, user, archivoInfo) =>
      registrarHistorialFlota(id, accion, cambios, descripcion, user, archivoInfo),
  },
  InventarioInfraestructura: {
    registrarHistorial: (id, accion, cambios, descripcion, user, archivoInfo) =>
      registrarHistorialInfra(id, accion, cambios, descripcion, user, archivoInfo),
  },
};

function _hoyStr() {
  const n = new Date();
  return cumplimientoMtto.formatFecha(
    new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
  );
}

/**
 * darDeBajaActivo — COORDINATOR (3)
 * Da de baja un activo de cualquier inventario en una sola operacion atomica:
 *   - estado = 'Baja'
 *   - fechaBaja = fechaBaja recibida o hoy
 *   - estadoPrevio guardado para soportar reactivacion
 *   - registra historial con accion 'baja' y motivo
 *   - opcionalmente adjunta archivo (acta de baja) al historial
 */
Parse.Cloud.define('darDeBajaActivo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');

  const { clase, id, fechaBaja, motivo, archivoNombre, archivoUrl } = request.params || {};
  if (!clase || !id) throw new Parse.Error(400, 'clase e id son obligatorios');
  if (!_BAJA_INVENTARIO_HOOKS[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  const motivoLimpio = (motivo || '').trim();
  if (!motivoLimpio) throw new Parse.Error(400, 'El motivo de la baja es obligatorio');

  const fechaBajaFinal = (fechaBaja && /^\d{4}-\d{2}-\d{2}$/.test(fechaBaja)) ? fechaBaja : _hoyStr();

  const query = new Parse.Query(clase);
  const obj = await query.get(id, { useMasterKey: true });

  const estadoActual = obj.get('estado') || '';
  const fechaBajaActual = obj.get('fechaBaja') || '';
  const estadoPrevio = estadoActual !== 'Baja' ? estadoActual : (obj.get('estadoPrevio') || 'B');

  obj.set('estado', 'Baja');
  obj.set('fechaBaja', fechaBajaFinal);
  obj.set('estadoPrevio', estadoPrevio);
  obj.set('motivoBaja', motivoLimpio);
  obj.set('modificadoPor', currentUser.id);

  await obj.save(null, { useMasterKey: true });

  const cambios = {
    estado: { anterior: estadoActual, nuevo: 'Baja' },
    fechaBaja: { anterior: fechaBajaActual, nuevo: fechaBajaFinal },
    motivoBaja: { nuevo: motivoLimpio },
  };
  const descripcion = `Activo dado de baja. Motivo: ${motivoLimpio}`;
  const archivoInfo = archivoNombre && archivoUrl ? { nombre: archivoNombre, url: archivoUrl } : null;
  await _BAJA_INVENTARIO_HOOKS[clase].registrarHistorial(id, 'baja', cambios, descripcion, currentUser, archivoInfo);

  return {
    ok: true,
    id,
    clase,
    estado: 'Baja',
    fechaBaja: fechaBajaFinal,
    estadoPrevio,
    motivoBaja: motivoLimpio,
  };
});

/**
 * reactivarActivo — ADMIN (4)
 * Revierte la baja de un activo: estado vuelve al estadoPrevio (o 'B' si no
 * existe), fechaBaja se limpia, motivoBaja se limpia, registra historial.
 */
Parse.Cloud.define('reactivarActivo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 4) throw new Parse.Error(403, 'Se requieren permisos de administrador');

  const { clase, id, motivo } = request.params || {};
  if (!clase || !id) throw new Parse.Error(400, 'clase e id son obligatorios');
  if (!_BAJA_INVENTARIO_HOOKS[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  const motivoLimpio = (motivo || '').trim();
  if (!motivoLimpio) throw new Parse.Error(400, 'El motivo de la reactivacion es obligatorio');

  const query = new Parse.Query(clase);
  const obj = await query.get(id, { useMasterKey: true });

  const estadoActual = obj.get('estado') || '';
  const fechaBajaActual = obj.get('fechaBaja') || '';
  const estadoPrevio = obj.get('estadoPrevio') || 'B';

  if (estadoActual !== 'Baja' && !fechaBajaActual) {
    throw new Parse.Error(400, 'El activo no esta dado de baja');
  }

  const estadoNuevo = ['B', 'M', 'R'].includes(estadoPrevio) ? estadoPrevio : 'B';

  obj.set('estado', estadoNuevo);
  obj.set('fechaBaja', '');
  obj.set('motivoBaja', '');
  obj.set('estadoPrevio', '');
  obj.set('modificadoPor', currentUser.id);

  await obj.save(null, { useMasterKey: true });

  const cambios = {
    estado: { anterior: estadoActual, nuevo: estadoNuevo },
    fechaBaja: { anterior: fechaBajaActual, nuevo: '' },
  };
  const descripcion = `Activo reactivado (estado: ${estadoNuevo}). Motivo: ${motivoLimpio}`;
  await _BAJA_INVENTARIO_HOOKS[clase].registrarHistorial(id, 'reactivacion', cambios, descripcion, currentUser, null);

  return {
    ok: true,
    id,
    clase,
    estado: estadoNuevo,
    fechaBaja: '',
  };
});

// ---------------------------------------------------------------------
// Etapa 2 (revision-inventarios): estadisticas fisicas globales por dominio
// ---------------------------------------------------------------------

/**
 * Devuelve los conteos globales de un inventario por estado fisico (B/M/R/Baja),
 * sin paginar ni filtrar por la query visible. Usado por las cards superiores
 * de cada pagina de inventario.
 *
 * Cuenta como "dadosBaja" tanto los registros con estado='Baja' como los que
 * tienen una fechaBaja vigente (<= hoy), evitando dobles conteos.
 */
Parse.Cloud.define('getInventarioEstadisticasFisicas', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { clase, dominio } = request.params || {};
  let claseFinal = clase;
  if (!claseFinal && dominio) {
    claseFinal = cumplimientoMtto.CLASE_POR_DOMINIO[dominio];
  }
  if (!claseFinal || !cumplimientoMtto.DOMINIO_POR_CLASE[claseFinal]) {
    throw new Parse.Error(400, 'clase o dominio invalido');
  }

  const hoy = new Date();
  const hoyStr = cumplimientoMtto.formatFecha(
    new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
  );

  const qTotal = new Parse.Query(claseFinal);
  qTotal.equalTo('activo', true);

  const qBueno = new Parse.Query(claseFinal);
  qBueno.equalTo('activo', true);
  qBueno.equalTo('estado', 'B');

  const qMalo = new Parse.Query(claseFinal);
  qMalo.equalTo('activo', true);
  qMalo.equalTo('estado', 'M');

  const qRegular = new Parse.Query(claseFinal);
  qRegular.equalTo('activo', true);
  qRegular.equalTo('estado', 'R');

  // Baja: estado='Baja' OR fechaBaja vigente (<= hoy)
  const qBajaPorEstado = new Parse.Query(claseFinal);
  qBajaPorEstado.equalTo('activo', true);
  qBajaPorEstado.equalTo('estado', 'Baja');

  const qBajaPorFecha = new Parse.Query(claseFinal);
  qBajaPorFecha.equalTo('activo', true);
  qBajaPorFecha.notEqualTo('estado', 'Baja');
  qBajaPorFecha.exists('fechaBaja');
  qBajaPorFecha.notEqualTo('fechaBaja', '');
  qBajaPorFecha.lessThanOrEqualTo('fechaBaja', hoyStr);

  const [total, bueno, malo, regular, bajaEstado, bajaFecha] = await Promise.all([
    qTotal.count({ useMasterKey: true }),
    qBueno.count({ useMasterKey: true }),
    qMalo.count({ useMasterKey: true }),
    qRegular.count({ useMasterKey: true }),
    qBajaPorEstado.count({ useMasterKey: true }),
    qBajaPorFecha.count({ useMasterKey: true }),
  ]);

  const dadosBaja = bajaEstado + bajaFecha;
  return {
    total,
    activos: bueno,
    enMantencion: malo + regular,
    dadosBaja,
    detalle: { bueno, malo, regular, bajaPorEstado: bajaEstado, bajaPorFecha: bajaFecha },
    fechaCorte: hoyStr,
  };
});

// ---------------------------------------------------------------------
// Etapa 4 (revision-inventarios): dashboard global consolidado
// ---------------------------------------------------------------------

/**
 * getDashboardInventarios — VIEWER (1)
 * Devuelve en un solo round-trip los conteos por dominio (B/M/R/Baja),
 * los totales globales y el agregado de cumplimiento por estado.
 *
 * Estructura:
 * {
 *   porDominio: {
 *     equipoMedico: { total, activos, enMantencion, dadosBaja },
 *     equipoIndustrial: { ... },
 *     infraestructura: { ... },
 *     flotaVehicular: { ... }
 *   },
 *   totales: { total, activos, enMantencion, dadosBaja },
 *   cumplimiento: { porDominio, totalActivos, porcentajePromedio }
 * }
 */
Parse.Cloud.define('getDashboardInventarios', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Se requiere autenticacion');

  const hoy = new Date();
  const hoyStr = cumplimientoMtto.formatFecha(
    new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
  );

  const clases = cumplimientoMtto.CLASES_INVENTARIO.slice();
  const porDominio = {};
  const totales = { total: 0, activos: 0, enMantencion: 0, dadosBaja: 0 };

  for (const clase of clases) {
    const dom = cumplimientoMtto.DOMINIO_POR_CLASE[clase];

    const qTotal = new Parse.Query(clase); qTotal.equalTo('activo', true);
    const qBueno = new Parse.Query(clase); qBueno.equalTo('activo', true); qBueno.equalTo('estado', 'B');
    const qMalo = new Parse.Query(clase); qMalo.equalTo('activo', true); qMalo.equalTo('estado', 'M');
    const qReg = new Parse.Query(clase); qReg.equalTo('activo', true); qReg.equalTo('estado', 'R');
    const qBajaE = new Parse.Query(clase); qBajaE.equalTo('activo', true); qBajaE.equalTo('estado', 'Baja');
    const qBajaF = new Parse.Query(clase);
    qBajaF.equalTo('activo', true);
    qBajaF.notEqualTo('estado', 'Baja');
    qBajaF.exists('fechaBaja');
    qBajaF.notEqualTo('fechaBaja', '');
    qBajaF.lessThanOrEqualTo('fechaBaja', hoyStr);

    const [total, bueno, malo, regular, bajaE, bajaF] = await Promise.all([
      qTotal.count({ useMasterKey: true }),
      qBueno.count({ useMasterKey: true }),
      qMalo.count({ useMasterKey: true }),
      qReg.count({ useMasterKey: true }),
      qBajaE.count({ useMasterKey: true }),
      qBajaF.count({ useMasterKey: true }),
    ]);

    const dadosBaja = bajaE + bajaF;
    const enMantencion = malo + regular;
    porDominio[dom] = { total, activos: bueno, enMantencion, dadosBaja };
    totales.total += total;
    totales.activos += bueno;
    totales.enMantencion += enMantencion;
    totales.dadosBaja += dadosBaja;
  }

  // Cumplimiento agregado (reuso de getEstadisticasCumplimiento simplificado)
  const estadosCump = ['sin_configuracion', 'sin_historial', 'al_dia', 'con_retraso', 'critico', 'dado_de_baja'];
  const cumplimientoPorDominio = {};
  let totalGlobalCump = 0;
  let sumaPorcentaje = 0;
  let cuentaConPeriodos = 0;

  for (const clase of clases) {
    const dom = cumplimientoMtto.DOMINIO_POR_CLASE[clase];
    cumplimientoPorDominio[dom] = { total: 0 };
    estadosCump.forEach((e) => { cumplimientoPorDominio[dom][e] = 0; });

    for (const est of estadosCump) {
      const q = new Parse.Query(clase);
      q.equalTo('activo', true);
      q.equalTo('estadoCumplimientoMantenimiento', est);
      const c = await q.count({ useMasterKey: true });
      cumplimientoPorDominio[dom][est] = c;
      cumplimientoPorDominio[dom].total += c;
      totalGlobalCump += c;
    }

    const qAvg = new Parse.Query(clase);
    qAvg.equalTo('activo', true);
    qAvg.greaterThan('periodosEsperados', 0);
    qAvg.limit(5000);
    qAvg.select('cumplimientoPorcentaje');
    const avgItems = await qAvg.find({ useMasterKey: true });
    for (const it of avgItems) {
      const p = it.get('cumplimientoPorcentaje');
      if (typeof p === 'number') {
        sumaPorcentaje += p;
        cuentaConPeriodos++;
      }
    }
  }

  const porcentajePromedio = cuentaConPeriodos > 0
    ? Math.round((sumaPorcentaje / cuentaConPeriodos) * 10) / 10
    : 0;

  return {
    porDominio,
    totales,
    cumplimiento: {
      porDominio: cumplimientoPorDominio,
      totalActivos: totalGlobalCump,
      porcentajePromedio,
    },
    fechaCorte: hoyStr,
  };
});

// ---------------------------------------------------------------------
// Etapa 5 (revision-inventarios): papelera + duplicado + adopcion huerfanos
// ---------------------------------------------------------------------

/**
 * Helpers para mapear cada clase a su nombre principal y campos identificadores.
 */
const _SOFT_DELETE_CLASES = {
  InventarioEquipoMedico: {
    nombreCampo: 'nombreEquipo',
    identificadores: ['serie', 'inventario'],
    extras: ['servicio', 'clase', 'subclase', 'marca', 'modelo'],
  },
  InventarioEquipoIndustrial: {
    nombreCampo: 'nombreEquipo',
    identificadores: ['serie', 'inventario'],
    extras: ['ubicacion', 'tipoEquipo', 'marca', 'modelo'],
  },
  InventarioFlotaVehicular: {
    nombreCampo: 'nombreVehiculo',
    identificadores: ['patente', 'numeroInterno', 'vin'],
    extras: ['tipoVehiculo', 'marca', 'modelo', 'asignadoA'],
  },
  InventarioInfraestructura: {
    nombreCampo: 'componente',
    identificadores: ['serie', 'codigoInterno'],
    extras: ['sistema', 'ubicacion', 'marca', 'modelo'],
  },
};

function _hookHistorialPorClase(clase) {
  return (_BAJA_INVENTARIO_HOOKS[clase] && _BAJA_INVENTARIO_HOOKS[clase].registrarHistorial) || null;
}

/**
 * _construirIdentificadoresPosibles — interno
 * Devuelve TODAS las variantes posibles del identificador del activo, tanto
 * los campos sueltos (serie, inventario, patente...) como las concatenaciones
 * que produce `searchActivos` (p.ej. "SN-12345 / INV-001"). Esto evita
 * mismatches por formato cuando se busca en `activoResumen.identificador`.
 */
function _construirIdentificadoresPosibles(clase, activoObj) {
  const get = (k) => String(activoObj.get(k) || '').trim();
  const variantes = new Set();
  const meta = _SOFT_DELETE_CLASES[clase];
  if (meta) {
    for (const k of meta.identificadores) {
      const v = get(k);
      if (v) variantes.add(v);
    }
  }
  switch (clase) {
    case 'InventarioEquipoMedico':
    case 'InventarioEquipoIndustrial': {
      const s = get('serie'), i = get('inventario');
      if (s && i) {
        variantes.add(`${s} / ${i}`);
        variantes.add(`${i} / ${s}`);
      }
      break;
    }
    case 'InventarioFlotaVehicular': {
      const p = get('patente'), n = get('numeroInterno');
      if (p && n) {
        variantes.add(`${p} / ${n}`);
        variantes.add(`${n} / ${p}`);
      }
      break;
    }
    case 'InventarioInfraestructura': {
      const c = get('codigoInterno'), comp = get('componente');
      if (c && comp) {
        variantes.add(`${c} / ${comp}`);
        variantes.add(`${comp} / ${c}`);
      }
      break;
    }
  }
  return Array.from(variantes).filter(Boolean);
}

/**
 * _resolverIdsActivoPorIdentidad — interno
 * Dado un activo (clase, id), devuelve la lista [id, ...idsPrevios] donde
 * idsPrevios son los objectId distintos hallados en RegistroMantenimiento
 * cuyo activoResumen.identificador coincide con la serie/inventario/patente/
 * codigoInterno del activo actual. Permite que las queries de historial y
 * mantenimientos incluyan los registros huerfanos por identidad sin requerir
 * reconciliacion manual.
 */
async function _resolverIdsActivoPorIdentidad(clase, id) {
  const meta = _SOFT_DELETE_CLASES[clase];
  if (!meta) return [id];
  let activoObj;
  try {
    const q = new Parse.Query(clase);
    activoObj = await q.get(id, { useMasterKey: true });
  } catch (e) {
    return [id];
  }
  const identificadoresPosibles = _construirIdentificadoresPosibles(clase, activoObj);
  // Identificadores "puros" (campos sueltos) para las queries en
  // LicitacionEquipo, que SI guarda los campos por separado.
  const identificadoresPuros = meta.identificadores
    .map((k) => String(activoObj.get(k) || '').trim())
    .filter(Boolean);

  if (identificadoresPosibles.length === 0) return [id];

  const ids = new Set([id]);
  // Buscar registros con mismo activoClase + identificador en activoResumen
  const qReg = new Parse.Query('RegistroMantenimiento');
  qReg.equalTo('activoClase', clase);
  qReg.containedIn('activoResumen.identificador', identificadoresPosibles);
  qReg.limit(10000);
  qReg.select('activoId');
  try {
    const rs = await qReg.find({ useMasterKey: true });
    rs.forEach((r) => {
      const aId = r.get('activoId');
      if (aId) ids.add(aId);
    });
  } catch (e) { /* ignore */ }

  // Tambien buscar en LicitacionEquipo: mismo inventarioTipo + serie/inventario
  const inventarioTipoMap = {
    InventarioEquipoMedico: 'medico',
    InventarioEquipoIndustrial: 'industrial',
    InventarioFlotaVehicular: 'flota',
    InventarioInfraestructura: 'infraestructura',
  };
  const inventarioTipo = inventarioTipoMap[clase];
  if (inventarioTipo && identificadoresPuros.length > 0) {
    try {
      const qSerie = new Parse.Query('LicitacionEquipo');
      qSerie.equalTo('inventarioTipo', inventarioTipo);
      qSerie.containedIn('serie', identificadoresPuros);
      const qInv = new Parse.Query('LicitacionEquipo');
      qInv.equalTo('inventarioTipo', inventarioTipo);
      qInv.containedIn('inventario', identificadoresPuros);
      const orQ = Parse.Query.or(qSerie, qInv);
      orQ.limit(1000);
      orQ.select('equipoId');
      const lic = await orQ.find({ useMasterKey: true });
      lic.forEach((l) => {
        const eId = l.get('equipoId');
        if (eId) ids.add(eId);
      });
    } catch (e) { /* ignore */ }
  }

  return Array.from(ids);
}

/**
 * _chequearDuplicadoEliminado — interno
 * Si los identificadores (serie/inventario/patente/codigoInterno) coinciden con
 * un activo eliminado existente, devuelve sus datos. Si no, devuelve null.
 * Si hay coincidencia con un activo NO eliminado, lanza error de duplicado.
 */
async function _chequearDuplicadoEliminado(clase, data) {
  const meta = _SOFT_DELETE_CLASES[clase];
  if (!meta) return null;

  const queries = [];
  for (const campo of meta.identificadores) {
    const valor = String((data && data[campo]) || '').trim();
    if (!valor) continue;
    const q = new Parse.Query(clase);
    q.equalTo(campo, valor);
    queries.push(q);
  }
  if (queries.length === 0) return null;

  const orQ = queries.length > 1 ? Parse.Query.or(...queries) : queries[0];
  // Buscar TODOS los matches (incluidos eliminados) - usamos containedIn fake
  // para forzar bypass del beforeFind. Mas simple: hacemos dos queries:
  //   - una que filtre por eliminado=true
  //   - una que filtre por eliminado=false (o sin restriccion explicita)
  const eliminados = [];
  for (const q of queries) {
    const qEli = new Parse.Query(clase);
    qEli.equalTo('eliminado', true);
    for (const campo of meta.identificadores) {
      const valor = String((data && data[campo]) || '').trim();
      if (valor && q._where && q._where[campo] === valor) {
        qEli.equalTo(campo, valor);
      }
    }
    qEli.descending('eliminadoEn');
    qEli.limit(1);
    const items = await qEli.find({ useMasterKey: true });
    if (items.length > 0) eliminados.push(items[0]);
  }
  if (eliminados.length === 0) return null;

  const it = eliminados[0];
  const datos = {
    id: it.id,
    nombre: it.get(meta.nombreCampo) || '',
    eliminadoEn: it.get('eliminadoEn'),
    estado: it.get('estado') || '',
    fechaBaja: it.get('fechaBaja') || '',
  };
  meta.identificadores.forEach((k) => { datos[k] = it.get(k) || ''; });
  meta.extras.forEach((k) => { datos[k] = it.get(k) || ''; });
  return datos;
}

/**
 * getInventarioEliminados — ADMIN (4)
 * Lista los activos con eliminado=true para una clase dada (papelera).
 */
Parse.Cloud.define('getInventarioEliminados', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 4) throw new Parse.Error(403, 'Se requieren permisos de administrador');

  const { clase, busqueda = '', limit = 50, skip = 0 } = request.params || {};
  if (!clase || !_SOFT_DELETE_CLASES[clase]) {
    throw new Parse.Error(400, `clase invalida: ${clase}`);
  }
  const meta = _SOFT_DELETE_CLASES[clase];

  const query = new Parse.Query(clase);
  query.equalTo('eliminado', true); // beforeFind respeta porque hay constraint explicita
  query.descending('eliminadoEn');
  query.limit(Math.min(parseInt(limit, 10) || 50, 200));
  query.skip(parseInt(skip, 10) || 0);

  const total = await query.count({ useMasterKey: true });
  const items = await query.find({ useMasterKey: true });

  const term = String(busqueda || '').trim().toLowerCase();
  const out = items
    .map((it) => {
      const obj = {
        id: it.id,
        nombre: it.get(meta.nombreCampo) || '',
        eliminadoEn: it.get('eliminadoEn'),
        eliminadoPor: it.get('eliminadoPor') || '',
        estado: it.get('estado') || '',
        fechaBaja: it.get('fechaBaja') || '',
      };
      meta.identificadores.forEach((k) => { obj[k] = it.get(k) || ''; });
      meta.extras.forEach((k) => { obj[k] = it.get(k) || ''; });
      return obj;
    })
    .filter((o) => {
      if (!term) return true;
      const blob = Object.values(o).join(' ').toLowerCase();
      return blob.includes(term);
    });

  return { total, results: out };
});

/**
 * restaurarInventario — ADMIN (4)
 * Marca eliminado=false sin tocar el resto. Registra historial 'restauracion'.
 */
Parse.Cloud.define('restaurarInventario', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 4) throw new Parse.Error(403, 'Se requieren permisos de administrador');

  const { clase, id } = request.params || {};
  if (!clase || !_SOFT_DELETE_CLASES[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  if (!id) throw new Parse.Error(400, 'id es obligatorio');

  const query = new Parse.Query(clase);
  query.equalTo('eliminado', true);
  const obj = await query.get(id, { useMasterKey: true });

  obj.set('eliminado', false);
  obj.unset('eliminadoEn');
  obj.unset('eliminadoPor');
  obj.set('modificadoPor', currentUser.id);
  await obj.save(null, { useMasterKey: true });

  const registrar = _hookHistorialPorClase(clase);
  if (registrar) {
    await registrar(id, 'restauracion', {}, 'Activo restaurado desde papelera', currentUser, null);
  }

  return { ok: true, id, clase };
});

/**
 * purgarInventario — SUPER_ADMIN (5)
 * Hard delete definitivo de un registro ya eliminado. Se conserva el codigo
 * antiguo aqui para casos extremos. NO purga registros vinculados.
 */
Parse.Cloud.define('purgarInventario', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 5) throw new Parse.Error(403, 'Se requieren permisos de super administrador');

  const { clase, id } = request.params || {};
  if (!clase || !_SOFT_DELETE_CLASES[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  if (!id) throw new Parse.Error(400, 'id es obligatorio');

  const query = new Parse.Query(clase);
  query.equalTo('eliminado', true);
  const obj = await query.get(id, { useMasterKey: true });
  await obj.destroy({ useMasterKey: true });
  return { ok: true, id, clase, hardDeleted: true };
});

/**
 * buscarDuplicadoEliminado — OPERATOR (2)
 * Busca un activo eliminado con identificador coincidente para mostrar opciones
 * al usuario antes de crear un nuevo registro. Devuelve el primer match.
 */
Parse.Cloud.define('buscarDuplicadoEliminado', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) throw new Parse.Error(403, 'Se requieren permisos de operador o superior');

  const { clase, identificadores } = request.params || {};
  if (!clase || !_SOFT_DELETE_CLASES[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  if (!identificadores || typeof identificadores !== 'object') {
    return { encontrado: false };
  }
  const meta = _SOFT_DELETE_CLASES[clase];

  // Construir OR de queries por cada identificador no vacio
  const queries = [];
  for (const campo of meta.identificadores) {
    const valor = String(identificadores[campo] || '').trim();
    if (!valor) continue;
    const q = new Parse.Query(clase);
    q.equalTo('eliminado', true);
    q.equalTo(campo, valor);
    queries.push(q);
  }
  if (queries.length === 0) return { encontrado: false };

  const orQ = queries.length > 1 ? Parse.Query.or(...queries) : queries[0];
  // Asegurar que se respete el filtro de eliminado=true (Parse.Query.or no lo trae)
  orQ.equalTo('eliminado', true);
  orQ.descending('eliminadoEn');
  orQ.limit(1);

  const found = await orQ.find({ useMasterKey: true });
  if (found.length === 0) return { encontrado: false };

  const it = found[0];
  const datos = {
    id: it.id,
    nombre: it.get(meta.nombreCampo) || '',
    eliminadoEn: it.get('eliminadoEn'),
    estado: it.get('estado') || '',
    fechaBaja: it.get('fechaBaja') || '',
    estadoCumplimientoMantenimiento: it.get('estadoCumplimientoMantenimiento') || '',
  };
  meta.identificadores.forEach((k) => { datos[k] = it.get(k) || ''; });
  meta.extras.forEach((k) => { datos[k] = it.get(k) || ''; });

  // Conteo de registros vinculados (registros + historial)
  const qReg = new Parse.Query('RegistroMantenimiento');
  qReg.equalTo('activoId', it.id);
  qReg.equalTo('activoClase', clase);
  qReg.equalTo('activo', true);
  const totalRegistros = await qReg.count({ useMasterKey: true }).catch(() => 0);

  return { encontrado: true, activo: datos, totalRegistros };
});

/**
 * restaurarYActualizar — COORDINATOR (3)
 * Restaura un activo eliminado y aplica nuevos datos del formulario en una
 * sola operacion. Evita la doble llamada (restaurar + update).
 */
Parse.Cloud.define('restaurarYActualizar', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 3) throw new Parse.Error(403, 'Se requieren permisos de coordinador o superior');

  const { clase, id, data = {} } = request.params || {};
  if (!clase || !_SOFT_DELETE_CLASES[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  if (!id) throw new Parse.Error(400, 'id es obligatorio');

  const query = new Parse.Query(clase);
  query.equalTo('eliminado', true);
  const obj = await query.get(id, { useMasterKey: true });

  // Whitelist por clase: igual que cada update*. Aceptamos un set generoso y
  // dejamos que beforeSave/triggers reaccionen.
  const camposComunes = [
    'nombreEquipo', 'nombreVehiculo', 'componente',
    'servicio', 'clase', 'subclase', 'sistema', 'ubicacion', 'tipoEquipo', 'tipoVehiculo',
    'marca', 'modelo', 'serie', 'inventario', 'patente', 'numeroInterno', 'vin', 'codigoInterno',
    'valor', 'capacidad', 'combustible', 'color', 'kilometraje', 'capacidadPasajeros', 'asignadoA',
    'fechaAdquisicion', 'fechaInstalacion', 'vidaUtil', 'estado', 'criticoApoyo', 'criticidad',
    'frecuencia', 'garantiaInicio', 'garantiaFinal', 'fechaBaja', 'pautaAsignada', 'activo',
    'requiereAutorizacion', 'normativaAplicable', 'fechaUltimaInspeccion', 'proximaInspeccion',
    'responsable', 'descripcion', 'anio', 'revisionTecnicaVigente', 'permisoCirculacion',
    'seguroVigente',
  ];

  for (const campo of camposComunes) {
    if (data[campo] !== undefined) obj.set(campo, data[campo]);
  }
  obj.set('eliminado', false);
  obj.unset('eliminadoEn');
  obj.unset('eliminadoPor');
  obj.set('modificadoPor', currentUser.id);

  await obj.save(null, { useMasterKey: true });

  const registrar = _hookHistorialPorClase(clase);
  if (registrar) {
    await registrar(id, 'restauracion', {}, 'Activo restaurado y actualizado desde papelera', currentUser, null);
  }

  return { ok: true, id, clase };
});

/**
 * diagnosticarHistorialActivo — OPERATOR (2)
 * Devuelve un diagnostico del historial visible y oculto del activo:
 *   - Cuantos RegistroMantenimiento apuntan a este objectId.
 *   - Cuantos RegistroMantenimiento tienen el mismo activoClase + identificador
 *     en activoResumen pero un activoId distinto (huerfanos por re-creacion).
 *   - Lo mismo para CumplimientoLog.
 *
 * Usado por el detail modal para ofrecer reconciliar histórico.
 */
Parse.Cloud.define('diagnosticarHistorialActivo', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 2) throw new Parse.Error(403, 'Se requieren permisos de operador o superior');

  const { clase, id } = request.params || {};
  if (!clase || !_SOFT_DELETE_CLASES[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  if (!id) throw new Parse.Error(400, 'id es obligatorio');

  const meta = _SOFT_DELETE_CLASES[clase];
  const queryActivo = new Parse.Query(clase);
  const activoObj = await queryActivo.get(id, { useMasterKey: true });

  // Identificadores del activo actual: campos puros + variantes concatenadas
  const identificadores = _construirIdentificadoresPosibles(clase, activoObj);
  const identificadoresPuros = meta.identificadores
    .map((k) => String(activoObj.get(k) || '').trim())
    .filter(Boolean);

  // 1) Registros vinculados al objectId actual
  const qDirectos = new Parse.Query('RegistroMantenimiento');
  qDirectos.equalTo('activoId', id);
  qDirectos.equalTo('activoClase', clase);
  qDirectos.equalTo('activo', true);
  const totalDirectos = await qDirectos.count({ useMasterKey: true });

  // 2) Huerfanos: mismo activoClase + identificador (con variantes) en
  //    activoResumen pero activoId distinto al actual.
  let huerfanos = [];
  if (identificadores.length > 0) {
    const qPosibles = new Parse.Query('RegistroMantenimiento');
    qPosibles.equalTo('activoClase', clase);
    qPosibles.equalTo('activo', true);
    qPosibles.containedIn('activoResumen.identificador', identificadores);
    qPosibles.limit(1000);
    qPosibles.select('objectId', 'activoId', 'activoResumen', 'fecha', 'estadoValidacion');
    const posibles = await qPosibles.find({ useMasterKey: true });
    huerfanos = posibles
      .filter((it) => it.get('activoId') !== id) // filtrar en memoria (Parse.or + notEqualTo problematico)
      .map((it) => ({
        id: it.id,
        activoId: it.get('activoId'),
        identificador: (it.get('activoResumen') || {}).identificador || '',
        fecha: it.get('fecha') || '',
        estadoValidacion: it.get('estadoValidacion') || '',
      }));
  }

  // 3) Agrupar huerfanos por activoId previo
  const porActivoIdPrevio = {};
  for (const h of huerfanos) {
    if (!porActivoIdPrevio[h.activoId]) porActivoIdPrevio[h.activoId] = 0;
    porActivoIdPrevio[h.activoId]++;
  }
  const idsPrevios = Object.keys(porActivoIdPrevio);

  // 4) LicitacionEquipo huerfanas (asociaciones convenio): mismo
  //    inventarioTipo + serie/inventario coincidente, equipoId distinto.
  const inventarioTipoMap = {
    InventarioEquipoMedico: 'medico',
    InventarioEquipoIndustrial: 'industrial',
    InventarioFlotaVehicular: 'flota',
    InventarioInfraestructura: 'infraestructura',
  };
  const inventarioTipo = inventarioTipoMap[clase];
  let licitacionesHuerfanas = 0;
  if (inventarioTipo && identificadoresPuros.length > 0) {
    const qLE = new Parse.Query('LicitacionEquipo');
    qLE.equalTo('inventarioTipo', inventarioTipo);
    qLE.notEqualTo('equipoId', id);
    qLE.containedIn('serie', identificadoresPuros);
    qLE.limit(1000);
    licitacionesHuerfanas = await qLE.count({ useMasterKey: true });
    const qLE2 = new Parse.Query('LicitacionEquipo');
    qLE2.equalTo('inventarioTipo', inventarioTipo);
    qLE2.notEqualTo('equipoId', id);
    qLE2.containedIn('inventario', identificadoresPuros);
    qLE2.limit(1000);
    const c2 = await qLE2.count({ useMasterKey: true });
    licitacionesHuerfanas = Math.max(licitacionesHuerfanas, c2);
  }

  return {
    activoId: id,
    clase,
    identificadores,
    totalDirectos,
    totalHuerfanos: huerfanos.length,
    huerfanosPorActivoIdPrevio: porActivoIdPrevio,
    idsPrevios,
    licitacionesHuerfanas,
    sample: huerfanos.slice(0, 10),
  };
});

/**
 * reconciliarHuerfanosPorIdentidad — ADMIN (4)
 * Reasigna al activo dado todos los RegistroMantenimiento, CumplimientoLog
 * e InventarioHistorial que apunten a otros objectId pero coincidan en
 * activoClase + activoResumen.identificador. Util cuando el activo fue
 * eliminado y recreado antes de la Etapa 5 (cuando aun era hard-delete).
 */
Parse.Cloud.define('reconciliarHuerfanosPorIdentidad', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 4) throw new Parse.Error(403, 'Se requieren permisos de administrador');

  const { clase, id } = request.params || {};
  if (!clase || !_SOFT_DELETE_CLASES[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  if (!id) throw new Parse.Error(400, 'id es obligatorio');

  const meta = _SOFT_DELETE_CLASES[clase];
  const queryActivo = new Parse.Query(clase);
  const activoObj = await queryActivo.get(id, { useMasterKey: true });

  const identificadores = _construirIdentificadoresPosibles(clase, activoObj);
  const identificadoresPuros = meta.identificadores
    .map((k) => String(activoObj.get(k) || '').trim())
    .filter(Boolean);
  if (identificadores.length === 0) {
    return { ok: false, error: 'El activo no tiene identificadores (serie/inventario/patente/codigoInterno)' };
  }

  // 1) RegistroMantenimiento huerfanos por identidad
  const qReg = new Parse.Query('RegistroMantenimiento');
  qReg.equalTo('activoClase', clase);
  qReg.containedIn('activoResumen.identificador', identificadores);
  qReg.limit(10000);
  const candidatos = await qReg.find({ useMasterKey: true });
  // Filtrar en memoria los que ya apuntan al activo actual
  const registros = candidatos.filter((r) => r.get('activoId') !== id);
  const idsPrevios = new Set();
  for (const reg of registros) {
    idsPrevios.add(reg.get('activoId'));
    reg.set('activoId', id);
    const resumen = reg.get('activoResumen') || {};
    resumen.id = id;
    reg.set('activoResumen', resumen);
  }
  const migradosRegistros = registros.length;
  if (registros.length > 0) {
    await Parse.Object.saveAll(registros, { useMasterKey: true });
  }

  // 2) CumplimientoLog: por idsPrevios
  let migradosLogs = 0;
  if (idsPrevios.size > 0) {
    const qLog = new Parse.Query('CumplimientoLog');
    qLog.equalTo('activoClase', clase);
    qLog.containedIn('activoId', Array.from(idsPrevios));
    qLog.limit(10000);
    const logs = await qLog.find({ useMasterKey: true });
    for (const log of logs) log.set('activoId', id);
    if (logs.length > 0) {
      await Parse.Object.saveAll(logs, { useMasterKey: true });
      migradosLogs = logs.length;
    }
  }

  // 3) InventarioHistorial por idsPrevios
  let migradosHistorial = 0;
  const histClassByClase = {
    InventarioEquipoMedico: { clase: 'InventarioHistorial', campo: 'equipoId' },
    InventarioEquipoIndustrial: { clase: 'InventarioIndustrialHistorial', campo: 'equipoId' },
    InventarioFlotaVehicular: { clase: 'FlotaVehicularHistorial', campo: 'vehiculoId' },
    InventarioInfraestructura: { clase: 'InfraestructuraHistorial', campo: 'componenteId' },
  }[clase];
  if (histClassByClase && idsPrevios.size > 0) {
    const qH = new Parse.Query(histClassByClase.clase);
    qH.containedIn(histClassByClase.campo, Array.from(idsPrevios));
    qH.limit(10000);
    const items = await qH.find({ useMasterKey: true });
    for (const h of items) h.set(histClassByClase.campo, id);
    if (items.length > 0) {
      await Parse.Object.saveAll(items, { useMasterKey: true });
      migradosHistorial = items.length;
    }
  }

  // 4) LicitacionEquipo huerfanas (asociaciones de convenio)
  let migradosLicitaciones = 0;
  const inventarioTipoMap = {
    InventarioEquipoMedico: 'medico',
    InventarioEquipoIndustrial: 'industrial',
    InventarioFlotaVehicular: 'flota',
    InventarioInfraestructura: 'infraestructura',
  };
  const inventarioTipo = inventarioTipoMap[clase];
  if (inventarioTipo) {
    // Buscar por serie OR inventario en LicitacionEquipo (campos puros)
    const qSerie = new Parse.Query('LicitacionEquipo');
    qSerie.equalTo('inventarioTipo', inventarioTipo);
    qSerie.containedIn('serie', identificadoresPuros);

    const qInv = new Parse.Query('LicitacionEquipo');
    qInv.equalTo('inventarioTipo', inventarioTipo);
    qInv.containedIn('inventario', identificadoresPuros);

    const orQ = Parse.Query.or(qSerie, qInv);
    orQ.limit(10000);
    const asociaciones = await orQ.find({ useMasterKey: true });
    // Deduplicar por id y filtrar los que ya apuntan al activo actual
    const seen = new Set();
    const unicas = [];
    for (const le of asociaciones) {
      if (seen.has(le.id)) continue;
      if (le.get('equipoId') === id) continue;
      seen.add(le.id);
      unicas.push(le);
    }
    for (const le of unicas) {
      le.set('equipoId', id);
      le.set('nombreEquipo', activoObj.get(meta.nombreCampo) || le.get('nombreEquipo'));
    }
    if (unicas.length > 0) {
      await Parse.Object.saveAll(unicas, { useMasterKey: true });
      migradosLicitaciones = unicas.length;
    }

    // Resincronizar convenios para que el activo herede convenioActivo, etc.
    try {
      await sincronizarConveniosParaTipo(inventarioTipo);
    } catch (e) {
      console.warn(`[reconciliar] sincronizarConvenios fallo: ${e && e.message}`);
    }
  }

  // 5) Recalcular cumplimiento del activo actual
  try {
    await cumplimientoMtto.sincronizarActivoParse(Parse, id, clase, { persistir: true });
  } catch (e) {
    console.warn(`[reconciliar] sync fallo: ${e && e.message}`);
  }

  // 6) Historial
  const registrar = _hookHistorialPorClase(clase);
  if (registrar) {
    await registrar(
      id,
      'reconciliacion',
      {
        migradosRegistros,
        migradosLogs,
        migradosHistorial,
        migradosLicitaciones,
        idsPrevios: Array.from(idsPrevios),
      },
      `Reconciliacion por identidad: ${migradosRegistros} registros, ${migradosLogs} logs, ${migradosHistorial} historial, ${migradosLicitaciones} licitaciones`,
      currentUser,
      null
    );
  }

  return {
    ok: true,
    migradosRegistros,
    migradosLogs,
    migradosHistorial,
    migradosLicitaciones,
    idsPrevios: Array.from(idsPrevios),
  };
});

/**
 * adoptarRegistrosHuerfanos — ADMIN (4)
 * Re-asigna RegistroMantenimiento e InventarioHistorial cuyo activo ya no
 * existe (o cuya identidad coincide con la del nuevo activo) al nuevo objectId.
 *
 * Estrategia de match: por activoClase + activoResumen.identificador igual al
 * inventario / serie / patente / codigoInterno del nuevo activo.
 */
Parse.Cloud.define('adoptarRegistrosHuerfanos', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 4) throw new Parse.Error(403, 'Se requieren permisos de administrador');

  const { clase, idNuevo, idAnterior } = request.params || {};
  if (!clase || !_SOFT_DELETE_CLASES[clase]) throw new Parse.Error(400, `clase invalida: ${clase}`);
  if (!idNuevo) throw new Parse.Error(400, 'idNuevo es obligatorio');

  let migradosRegistros = 0;
  let migradosLogs = 0;
  let migradosHistorial = 0;

  // 1) RegistroMantenimiento: reapuntar activoId
  if (idAnterior) {
    const qReg = new Parse.Query('RegistroMantenimiento');
    qReg.equalTo('activoId', idAnterior);
    qReg.equalTo('activoClase', clase);
    qReg.limit(10000);
    const registros = await qReg.find({ useMasterKey: true });
    for (const reg of registros) {
      reg.set('activoId', idNuevo);
      const resumen = reg.get('activoResumen') || {};
      resumen.id = idNuevo;
      reg.set('activoResumen', resumen);
    }
    if (registros.length > 0) {
      await Parse.Object.saveAll(registros, { useMasterKey: true });
      migradosRegistros = registros.length;
    }

    // 2) CumplimientoLog
    const qLog = new Parse.Query('CumplimientoLog');
    qLog.equalTo('activoId', idAnterior);
    qLog.equalTo('activoClase', clase);
    qLog.limit(10000);
    const logs = await qLog.find({ useMasterKey: true });
    for (const log of logs) log.set('activoId', idNuevo);
    if (logs.length > 0) {
      await Parse.Object.saveAll(logs, { useMasterKey: true });
      migradosLogs = logs.length;
    }

    // 3) InventarioHistorial — el nombre del campo varia por clase
    const histClassByClase = {
      InventarioEquipoMedico: { clase: 'InventarioHistorial', campo: 'equipoId' },
      InventarioEquipoIndustrial: { clase: 'InventarioIndustrialHistorial', campo: 'equipoId' },
      InventarioFlotaVehicular: { clase: 'FlotaVehicularHistorial', campo: 'vehiculoId' },
      InventarioInfraestructura: { clase: 'InfraestructuraHistorial', campo: 'componenteId' },
    }[clase];
    if (histClassByClase) {
      const qH = new Parse.Query(histClassByClase.clase);
      qH.equalTo(histClassByClase.campo, idAnterior);
      qH.limit(10000);
      const items = await qH.find({ useMasterKey: true });
      for (const h of items) h.set(histClassByClase.campo, idNuevo);
      if (items.length > 0) {
        await Parse.Object.saveAll(items, { useMasterKey: true });
        migradosHistorial = items.length;
      }
    }
  }

  // 4) Disparar resincronizacion para que el nuevo activo herede
  //    la fecha del ultimo mantenimiento, periodos, etc.
  try {
    await cumplimientoMtto.sincronizarActivoParse(Parse, idNuevo, clase, { persistir: true });
  } catch (e) {
    console.warn(`[adoptar] sync fallo: ${e && e.message}`);
  }

  // Registrar historial de la adopcion
  const registrar = _hookHistorialPorClase(clase);
  if (registrar) {
    await registrar(
      idNuevo,
      'adopcion',
      { migradosRegistros, migradosLogs, migradosHistorial, idAnterior },
      `Adopcion de huerfanos: ${migradosRegistros} registros, ${migradosLogs} logs, ${migradosHistorial} historial`,
      currentUser,
      null
    );
  }

  return { ok: true, migradosRegistros, migradosLogs, migradosHistorial };
});

// ---------------------------------------------------------------------
// Carta Gantt de Mantenimiento (context/mmtto/carta-gantt-mantenimiento.md)
// ---------------------------------------------------------------------

function _parseFechaMmYY(s, fallback) {
  if (typeof s !== 'string' || !s) return fallback;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return fallback;
  return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)));
}

function _formatYYYYMM(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function _generarMesesEntre(desde, hasta) {
  const out = [];
  let cur = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), 1));
  const fin = new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), 1));
  while (cur.getTime() <= fin.getTime()) {
    out.push(_formatYYYYMM(cur));
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }
  return out;
}

function _percentil(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

const _CONFIG_DOMINIO_GANTT = {
  equipoMedico: {
    clase: 'InventarioEquipoMedico',
    campoBase: 'fechaAdquisicion',
    nombre: (it) => it.get('nombreEquipo') || '',
    identificador: (it) => [it.get('serie'), it.get('inventario')].filter(Boolean).join(' / '),
    grupo: (it) => it.get('servicio') || '',
    pauta: (it) => it.get('pautaAsignada') || '',
  },
  equipoIndustrial: {
    clase: 'InventarioEquipoIndustrial',
    campoBase: 'fechaInstalacion',
    nombre: (it) => it.get('nombreEquipo') || '',
    identificador: (it) => [it.get('serie'), it.get('inventario')].filter(Boolean).join(' / '),
    grupo: (it) => it.get('ubicacion') || '',
    pauta: (it) => it.get('pautaAsignada') || '',
  },
  flotaVehicular: {
    clase: 'InventarioFlotaVehicular',
    campoBase: 'fechaAdquisicion',
    nombre: (it) => it.get('nombreVehiculo') || '',
    identificador: (it) => [it.get('patente'), it.get('numeroInterno')].filter(Boolean).join(' / '),
    grupo: (it) => it.get('asignadoA') || '',
    pauta: (it) => it.get('pautaAsignada') || '',
  },
  infraestructura: {
    clase: 'InventarioInfraestructura',
    campoBase: 'fechaInstalacion',
    nombre: (it) => it.get('componente') || '',
    identificador: (it) => [it.get('codigoInterno'), it.get('componente')].filter(Boolean).join(' / '),
    grupo: (it) => it.get('ubicacion') || '',
    pauta: (it) => it.get('pautaAsignada') || '',
  },
};

async function _resolverHistorialActivoConHuerfanos(activoId, activoClase, activoObj) {
  // Identificadores con variantes (concatenadas) — Etapa 6.2
  const camposIdent = {
    InventarioEquipoMedico: ['serie', 'inventario'],
    InventarioEquipoIndustrial: ['serie', 'inventario'],
    InventarioFlotaVehicular: ['patente', 'numeroInterno', 'vin'],
    InventarioInfraestructura: ['serie', 'codigoInterno'],
  }[activoClase] || [];
  const get = (k) => String(activoObj.get(k) || '').trim();
  const variantes = new Set();
  for (const k of camposIdent) {
    const v = get(k);
    if (v) variantes.add(v);
  }
  if (activoClase === 'InventarioEquipoMedico' || activoClase === 'InventarioEquipoIndustrial') {
    const s = get('serie'), i = get('inventario');
    if (s && i) { variantes.add(`${s} / ${i}`); variantes.add(`${i} / ${s}`); }
  } else if (activoClase === 'InventarioFlotaVehicular') {
    const p = get('patente'), n = get('numeroInterno');
    if (p && n) { variantes.add(`${p} / ${n}`); variantes.add(`${n} / ${p}`); }
  } else if (activoClase === 'InventarioInfraestructura') {
    const c = get('codigoInterno'), comp = get('componente');
    if (c && comp) { variantes.add(`${c} / ${comp}`); variantes.add(`${comp} / ${c}`); }
  }
  const identificadores = Array.from(variantes);

  const qDirectos = new Parse.Query('RegistroMantenimiento');
  qDirectos.equalTo('activoId', activoId);
  qDirectos.equalTo('activoClase', activoClase);
  qDirectos.equalTo('activo', true);
  qDirectos.limit(1000);
  const directos = await qDirectos.find({ useMasterKey: true });

  let huerfanos = [];
  if (identificadores.length > 0) {
    const qHuer = new Parse.Query('RegistroMantenimiento');
    qHuer.equalTo('activoClase', activoClase);
    qHuer.containedIn('activoResumen.identificador', identificadores);
    qHuer.equalTo('activo', true);
    qHuer.limit(1000);
    const todos = await qHuer.find({ useMasterKey: true });
    huerfanos = todos.filter((r) => r.get('activoId') !== activoId);
  }
  const seen = new Set();
  const todos = [];
  for (const r of [...directos, ...huerfanos]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    todos.push(r);
  }
  return todos;
}

/**
 * getGanttMantenimiento — VIEWER (1)
 * Devuelve los activos filtrados con sus periodos teoricos hasta `hasta`.
 */
Parse.Cloud.define('getGanttMantenimiento', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Se requiere autenticacion');

  const {
    desde,
    hasta,
    dominio,
    filtrosInventario = {},
    limit = 200,
    skip = 0,
  } = request.params || {};

  const ahora = new Date();
  const fechaDesde = _parseFechaMmYY(desde, new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 6, 1)));
  const fechaHasta = _parseFechaMmYY(hasta, new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 12, 1)));

  const dominios = dominio
    ? [dominio]
    : Object.keys(_CONFIG_DOMINIO_GANTT);

  const filas = [];
  let total = 0;

  for (const dom of dominios) {
    const cfg = _CONFIG_DOMINIO_GANTT[dom];
    if (!cfg) continue;

    const q = new Parse.Query(cfg.clase);
    q.equalTo('activo', true);
    if (filtrosInventario.estado) q.equalTo('estado', filtrosInventario.estado);
    if (filtrosInventario.estadoCumplimiento) q.equalTo('estadoCumplimientoMantenimiento', filtrosInventario.estadoCumplimiento);
    if (filtrosInventario.servicio && dom === 'equipoMedico') q.equalTo('servicio', filtrosInventario.servicio);
    if (filtrosInventario.ubicacion && (dom === 'equipoIndustrial' || dom === 'infraestructura')) q.equalTo('ubicacion', filtrosInventario.ubicacion);
    if (filtrosInventario.asignadoA && dom === 'flotaVehicular') q.equalTo('asignadoA', filtrosInventario.asignadoA);
    if (filtrosInventario.clase && dom === 'equipoMedico') q.equalTo('clase', filtrosInventario.clase);
    if (filtrosInventario.tipoEquipo && dom === 'equipoIndustrial') q.equalTo('tipoEquipo', filtrosInventario.tipoEquipo);
    if (filtrosInventario.tipoVehiculo && dom === 'flotaVehicular') q.equalTo('tipoVehiculo', filtrosInventario.tipoVehiculo);
    if (filtrosInventario.sistema && dom === 'infraestructura') q.equalTo('sistema', filtrosInventario.sistema);
    if (filtrosInventario.criticoApoyo && dom === 'equipoMedico') q.equalTo('criticoApoyo', filtrosInventario.criticoApoyo);
    if (filtrosInventario.criticidad && (dom === 'equipoIndustrial' || dom === 'infraestructura')) q.equalTo('criticidad', filtrosInventario.criticidad);
    if (filtrosInventario.convenio === 'con_convenio') q.equalTo('convenioActivo', true);
    if (filtrosInventario.convenio === 'sin_convenio') q.notEqualTo('convenioActivo', true);
    if (filtrosInventario.pautaAsignada) q.equalTo('pautaAsignada', filtrosInventario.pautaAsignada);
    if (filtrosInventario.busqueda && filtrosInventario.busqueda.trim()) {
      // Filtrado in-memory por simplicidad (sin regex en BD)
      // se aplica luego del fetch
    }
    q.greaterThan('frecuencia', 0); // solo activos con frecuencia configurada

    q.descending('updatedAt');
    q.limit(Math.min(parseInt(limit, 10) || 200, 1000));
    q.skip(parseInt(skip, 10) || 0);

    const items = await q.find({ useMasterKey: true });
    total += items.length;

    for (const it of items) {
      // Filtro de busqueda en memoria (nombre / identificador)
      if (filtrosInventario.busqueda && filtrosInventario.busqueda.trim()) {
        const term = filtrosInventario.busqueda.trim().toLowerCase();
        const nombre = String(cfg.nombre(it)).toLowerCase();
        const ident = String(cfg.identificador(it)).toLowerCase();
        if (!nombre.includes(term) && !ident.includes(term)) continue;
      }

      const historial = await _resolverHistorialActivoConHuerfanos(it.id, cfg.clase, it);
      const activoPlano = {
        fechaBase: it.get(cfg.campoBase),
        frecuencia: it.get('frecuencia'),
        fechaBaja: it.get('fechaBaja'),
        estado: it.get('estado'),
      };
      const r = cumplimientoMtto.generarPeriodosGantt(activoPlano, historial, { hastaFecha: fechaHasta });

      // Filtrar periodos en el rango de visualizacion
      const desdeStr = cumplimientoMtto.formatFecha(fechaDesde);
      const hastaStr = cumplimientoMtto.formatFecha(fechaHasta);
      const periodosVisibles = r.periodos.filter((p) => p.hasta >= desdeStr && p.desde <= hastaStr);

      filas.push({
        activoId: it.id,
        activoClase: cfg.clase,
        dominio: dom,
        nombre: cfg.nombre(it),
        identificador: cfg.identificador(it),
        grupo: cfg.grupo(it),
        pautaAsignada: cfg.pauta(it),
        frecuencia: it.get('frecuencia') || 0,
        fechaBase: it.get(cfg.campoBase) || '',
        fechaBaja: it.get('fechaBaja') || '',
        estado: it.get('estado') || '',
        convenioActivo: !!it.get('convenioActivo'),
        proveedorNombre: it.get('proveedorNombre') || '',
        numeroLicitacion: it.get('numeroLicitacion') || '',
        ultimaFechaMantenimiento: it.get('ultimaFechaMantenimiento') || '',
        proximaFechaMantenimientoEsperada: it.get('proximaFechaMantenimientoEsperada') || '',
        estadoCumplimiento: r.estado,
        cumplimientoPorcentaje: r.cumplimientoPorcentaje || 0,
        periodosEsperados: r.periodosEsperadosHastaHoy || 0,
        periodosCumplidos: r.periodosCumplidosHastaHoy || 0,
        periodosFaltantes: r.periodosFaltantesHastaHoy || 0,
        periodos: periodosVisibles,
      });
    }
  }

  // Ordenar por periodosFaltantes desc (criticos primero)
  filas.sort((a, b) => (b.periodosFaltantes || 0) - (a.periodosFaltantes || 0));

  return {
    total: filas.length,
    rangoDesde: cumplimientoMtto.formatFecha(fechaDesde),
    rangoHasta: cumplimientoMtto.formatFecha(fechaHasta),
    meses: _generarMesesEntre(fechaDesde, fechaHasta),
    filas,
  };
});

/**
 * getCargaMantenimientoPorMes — VIEWER (1)
 * Devuelve la matriz de carga (cuantos mantenimientos vencen por mes) para
 * el heatmap. Usa los mismos filtros que getGanttMantenimiento.
 */
Parse.Cloud.define('getCargaMantenimientoPorMes', async (request) => {
  const currentUser = request.user;
  if (!currentUser) throw new Parse.Error(403, 'Se requiere autenticacion');
  const accessLevel = currentUser.get('accessLevel') || 1;
  if (accessLevel < 1) throw new Parse.Error(403, 'Se requiere autenticacion');

  const { desde, hasta, filtrosInventario = {} } = request.params || {};

  const ahora = new Date();
  const fechaDesde = _parseFechaMmYY(desde, new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1)));
  const fechaHasta = _parseFechaMmYY(hasta, new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 12, 1)));
  const meses = _generarMesesEntre(fechaDesde, fechaHasta);

  const porDominio = {
    equipoMedico: meses.map(() => 0),
    equipoIndustrial: meses.map(() => 0),
    flotaVehicular: meses.map(() => 0),
    infraestructura: meses.map(() => 0),
  };
  const totales = meses.map(() => 0);

  for (const [dom, cfg] of Object.entries(_CONFIG_DOMINIO_GANTT)) {
    const q = new Parse.Query(cfg.clase);
    q.equalTo('activo', true);
    q.greaterThan('frecuencia', 0);
    if (filtrosInventario.servicio && dom === 'equipoMedico') q.equalTo('servicio', filtrosInventario.servicio);
    if (filtrosInventario.ubicacion && (dom === 'equipoIndustrial' || dom === 'infraestructura')) q.equalTo('ubicacion', filtrosInventario.ubicacion);
    if (filtrosInventario.asignadoA && dom === 'flotaVehicular') q.equalTo('asignadoA', filtrosInventario.asignadoA);
    if (filtrosInventario.convenio === 'con_convenio') q.equalTo('convenioActivo', true);
    if (filtrosInventario.convenio === 'sin_convenio') q.notEqualTo('convenioActivo', true);
    q.limit(10000);
    q.select('objectId', cfg.campoBase, 'frecuencia', 'fechaBaja', 'estado');

    const items = await q.find({ useMasterKey: true });
    for (const it of items) {
      const fechaBase = cumplimientoMtto.parseFecha(it.get(cfg.campoBase));
      const f = parseInt(it.get('frecuencia'), 10);
      if (!fechaBase || !f) continue;
      const fechaBaja = cumplimientoMtto.parseFecha(it.get('fechaBaja'));
      if (it.get('estado') === 'Baja') continue;

      // Generar periodos teoricos en el rango
      let cursor = fechaBase;
      let safety = 0;
      while (cursor.getTime() <= fechaHasta.getTime() && safety < 1000) {
        const fin = cumplimientoMtto.addMeses(cursor, f);
        // El "vencimiento" cuenta cuando fin >= fechaDesde y fin <= fechaHasta
        if (fin.getTime() >= fechaDesde.getTime() && fin.getTime() <= fechaHasta.getTime()) {
          if (!fechaBaja || fin.getTime() < fechaBaja.getTime()) {
            const mesKey = _formatYYYYMM(fin);
            const idx = meses.indexOf(mesKey);
            if (idx !== -1) {
              porDominio[dom][idx]++;
              totales[idx]++;
            }
          }
        }
        cursor = fin;
        safety++;
      }
    }
  }

  // Cuartiles del array de totales (excluyendo ceros)
  const muestraNoZero = totales.filter((v) => v > 0);
  const cuartiles = {
    p25: _percentil(muestraNoZero, 25),
    p50: _percentil(muestraNoZero, 50),
    p75: _percentil(muestraNoZero, 75),
    p90: _percentil(muestraNoZero, 90),
    max: muestraNoZero.length ? Math.max(...muestraNoZero) : 0,
  };

  return { meses, porDominio, totales, cuartiles };
});

// ---------------------------------------------------------------------
// Triggers — mantienen los campos denormalizados sincronizados
// ---------------------------------------------------------------------

/**
 * Dispara sincronizacion no bloqueante tras cambios en RegistroMantenimiento.
 * La llamada se hace fire-and-forget con log en caso de error.
 */
function _dispararSincronizacionAsync(activoId, activoClase) {
  if (!activoId || !activoClase) return;
  if (!cumplimientoMtto.DOMINIO_POR_CLASE[activoClase]) return;
  cumplimientoMtto
    .sincronizarActivoParse(Parse, activoId, activoClase, { persistir: true })
    .then((r) => {
      if (!r.ok) {
        console.warn(`[cumplimiento] sync fallo para ${activoClase}:${activoId} → ${r.error}`);
      }
    })
    .catch((e) => {
      console.warn(`[cumplimiento] sync excepcion para ${activoClase}:${activoId} → ${e && e.message}`);
    });
}

Parse.Cloud.afterSave('RegistroMantenimiento', (request) => {
  try {
    const reg = request.object;
    const activoId = reg.get('activoId');
    const activoClase = reg.get('activoClase');
    _dispararSincronizacionAsync(activoId, activoClase);
  } catch (e) {
    console.warn('[cumplimiento] afterSave(RegistroMantenimiento) error:', e && e.message);
  }
});

Parse.Cloud.afterDelete('RegistroMantenimiento', (request) => {
  try {
    const reg = request.object;
    const activoId = reg.get('activoId');
    const activoClase = reg.get('activoClase');
    _dispararSincronizacionAsync(activoId, activoClase);
  } catch (e) {
    console.warn('[cumplimiento] afterDelete(RegistroMantenimiento) error:', e && e.message);
  }
});

// Triggers sobre los 4 inventarios: si cambian fechaBase, frecuencia o fechaBaja,
// recalcular. Se evita el loop detectando si el save solo toco los campos
// denormalizados (esos cambios NO deben re-disparar el calculo).
const CAMPOS_DENORMALIZADOS_CUMPLIMIENTO = [
  'ultimaFechaMantenimiento',
  'ultimoRegistroMantenimientoId',
  'ultimoTipoMantenimiento',
  'ultimoEstadoMantenimiento',
  'proximaFechaMantenimientoEsperada',
  'periodosEsperados',
  'periodosCumplidos',
  'periodosFaltantes',
  'cumplimientoPorcentaje',
  'estadoCumplimientoMantenimiento',
  'ultimoCalculoCumplimiento',
];

function _debeResincronizarInventario(request, camposRelevantes) {
  try {
    // Si es creacion: sincronizar siempre
    if (!request.original) return true;
    const dirty = request.object.dirtyKeys ? request.object.dirtyKeys() : [];
    if (!dirty || dirty.length === 0) return false;
    // Si todos los dirty son denormalizados, NO re-disparar
    const soloDenorm = dirty.every((k) => CAMPOS_DENORMALIZADOS_CUMPLIMIENTO.includes(k));
    if (soloDenorm) return false;
    // Si hay cambio en los campos que afectan al calculo, si
    return dirty.some((k) => camposRelevantes.includes(k));
  } catch (e) {
    return false;
  }
}

function _registrarTriggerInventario(clase) {
  const campoBase = cumplimientoMtto.CAMPO_FECHA_BASE_POR_CLASE[clase];
  // Etapa 1 (revision-inventarios): incluir 'estado' para que cambiar a Baja recalcule
  const camposRelevantes = [campoBase, 'frecuencia', 'fechaBaja', 'estado'].filter(Boolean);

  // Etapa 5 (revision-inventarios): excluir registros con eliminado=true
  // de cualquier listado, salvo que la query lo pida explicitamente
  // (papelera lo pasa con .equalTo('eliminado', true)).
  Parse.Cloud.beforeFind(clase, (request) => {
    try {
      const where = request.query && request.query._where;
      if (where && Object.prototype.hasOwnProperty.call(where, 'eliminado')) return;
      request.query.notEqualTo('eliminado', true);
    } catch (e) {
      console.warn(`[soft-delete] beforeFind(${clase}) error:`, e && e.message);
    }
  });

  // Etapa 3 (revision-inventarios): coherencia entre estado y fechaBaja.
  // Cuando se setea estado='Baja' sin fechaBaja, asignar hoy automaticamente.
  // Asi cualquier flujo (form, importacion, update directo) deja el activo en
  // estado consistente para el motor de cumplimiento y los conteos.
  Parse.Cloud.beforeSave(clase, (request) => {
    try {
      const obj = request.object;
      const estado = obj.get('estado');
      const fechaBaja = obj.get('fechaBaja');
      if (estado === 'Baja' && (!fechaBaja || fechaBaja === '')) {
        const n = new Date();
        const hoy = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
        obj.set('fechaBaja', hoy);
      }
    } catch (e) {
      console.warn(`[baja-coherencia] beforeSave(${clase}) error:`, e && e.message);
    }
  });

  Parse.Cloud.afterSave(clase, (request) => {
    try {
      if (!_debeResincronizarInventario(request, camposRelevantes)) return;
      _dispararSincronizacionAsync(request.object.id, clase);
    } catch (e) {
      console.warn(`[cumplimiento] afterSave(${clase}) error:`, e && e.message);
    }
  });
}

cumplimientoMtto.CLASES_INVENTARIO.forEach(_registrarTriggerInventario);

console.log('✅ Cloud code cargado correctamente — Sistema de Mantenimiento');
console.log('✅ Motor de cumplimiento de mantenimientos (Etapa 1) registrado');
