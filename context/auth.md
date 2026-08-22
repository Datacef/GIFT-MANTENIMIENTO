Módulo de autenticación — documentación técnica

Resumen

El sistema de autenticación está implementado sobre Parse Server y Parse JS SDK.
El frontend Next.js autentica directamente contra la API de Parse publicada en `/api/parse`.
El backend expone Parse Server, define configuración de sesiones y agrega Cloud Functions para administración de usuarios.

Arquitectura

1. Frontend
   - Inicializa Parse en cliente.
   - Ejecuta login, registro, logout y reset de contraseña usando `Parse.User`.
   - Protege rutas con guards de cliente.
   - Usa `accessLevel` como atributo principal de autorización.

2. Backend
   - Levanta Parse Server sobre Express.
   - Usa MongoDB como storage principal.
   - Habilita login por email.
   - Crea o corrige automáticamente el super administrador al iniciar.
   - Expone Cloud Functions para gestión de usuarios y cambios de nivel de acceso.

Archivos principales

Frontend

- `frontend/src/utils/parseClient.ts`
  - Punto único de inicialización de Parse en navegador.
  - Lee `NEXT_PUBLIC_PARSE_APP_ID`, `NEXT_PUBLIC_PARSE_JS_KEY` y `NEXT_PUBLIC_PARSE_SERVER_URL`.
  - Si no existe `NEXT_PUBLIC_PARSE_SERVER_URL`, usa `/api/parse`.
  - Se autoejecuta al importarse en cliente.

- `frontend/src/services/auth.service.ts`
  - Fachada principal de autenticación del frontend.
  - Expone:
    - `getCurrentUser()`
    - `getCurrentUserProfile()`
    - `login(identifier, password)`
    - `register(email, password, name)`
    - `logout()`
    - `resetPassword(email)`
    - `updateProfile(...)`
  - Mapea el `Parse.User` a un perfil simplificado con `id`, `email`, `displayName`, `photoURL` y `accessLevel`.

- `frontend/src/app/auth/sign-in/page.tsx`
  - Pantalla de inicio de sesión.
  - Llama `AuthService.login(email, password)`.
  - Implementa recuperación de contraseña desde la misma vista con `AuthService.resetPassword(email)`.
  - Redirige a `/admin/default` cuando el login es exitoso.

- `frontend/src/app/auth/sign-up/default/page.tsx`
  - Pantalla de registro.
  - Llama `AuthService.register(email, password, name)`.
  - Solicita solo nombre, correo y contraseña. No incluye selector de establecimiento (se asigna despues por el admin desde gestion de usuarios).
  - Tras crear la cuenta muestra confirmación y redirige a `/auth/sign-in`.

- `frontend/src/app/AuthGuard.tsx`
  - Guard global de autenticación.
  - Permite solo dos rutas públicas:
    - `/auth/sign-in`
    - `/auth/sign-up/default`
  - Si no hay usuario autenticado y la ruta no es pública, redirige a `/auth/sign-in`.
  - Si ya hay usuario autenticado y entra a una ruta pública, redirige a `/admin/default`.

- `frontend/src/app/AppWrappers.tsx`
  - Aplica `AuthGuard` a toda la aplicación en cliente.
  - Se monta desde `frontend/src/app/layout.tsx`.

- `frontend/src/components/auth/AdminGuard.tsx`
  - Guard específico de autorización para administración.
  - Exige `accessLevel >= 4`.
  - Si no hay sesión, redirige a `/auth/sign-in`.
  - Si la sesión existe pero no cumple permisos, redirige a `/admin/default`.

- `frontend/src/components/navbar/index.tsx`
  - Implementa el logout visible desde la UI.
  - Llama `AuthService.logout()`.
  - Luego fuerza `window.location.href = '/auth/sign-in'` para limpiar el estado React y la sesión cacheada en cliente.

- `frontend/src/services/user-management.service.ts`
  - Servicio administrativo para operar usuarios vía Cloud Functions.
  - Usa `getAllUsers`, `deleteUser`, `updateUserAccessLevel` y `updateUser`.
  - También puede crear usuarios directamente con `new Parse.User().signUp()`.

- `frontend/src/types/user.types.ts`
  - Define el contrato de roles de UI y su equivalencia con `accessLevel`.
  - `VIEWER=1`, `OPERATOR=2`, `COORDINATOR=3`, `ADMIN=4`, `SUPER_ADMIN=5`.

Backend

- `backend/parse-config.js`
  - Configuración central de Parse Server.
  - Habilita `enableEmailSignIn: true`, por lo que `Parse.User.logIn` acepta username o email.
  - Define:
    - `revokeSessionOnPasswordReset: true`
    - `enableAnonymousUsers: false`
    - `verifyUserEmails: false`
    - `sessionLength: 31536000`

- `backend/index.js`
  - Arranque del servidor Express + Parse Server.
  - Espera disponibilidad de MongoDB antes de iniciar.
  - Monta Parse en `/parse`.
  - Al terminar el arranque ejecuta `initSuperAdmin()` con retardo de 3 segundos.

- `backend/init-super-admin.js`
  - Garantiza la existencia del usuario administrador por defecto.
  - Busca el usuario `DEFAULT_ADMIN_USER`.
  - Si existe, corrige `accessLevel` a 5.
  - Si no existe, lo crea con:
    - `username`
    - `password`
    - `email`
    - `firstName`
    - `lastName`
    - `accessLevel: 5`
    - `emailVerified: true`

- `backend/cloud/main.js`
  - Define Cloud Functions de administración.
  - Relevantes para auth/autorización:
    - `getAllUsers`
    - `searchUsers`
    - `getUserById`
    - `updateUser`
    - `updateUserAccessLevel`
    - `deleteUser`
    - `setSuperAdmin`
    - `emergencyUpdateUserAccessLevel`

Flujo de inicialización

1. El navegador carga una página del frontend.
2. `parseClient.ts` inicializa Parse JS si corre en cliente.
3. `layout.tsx` monta `AppWrappers`.
4. `AppWrappers` envuelve todo con `AuthGuard`.
5. `AuthGuard` revisa `Parse.User.current()` para decidir si deja pasar o redirige.

Cómo funciona el login

Pantalla

- La pantalla está en `frontend/src/app/auth/sign-in/page.tsx`.
- El formulario solicita:
  - correo o usuario
  - contraseña

Ejecución

1. `handleLogin()` valida que ambos campos tengan valor.
2. Llama `AuthService.login(email, password)`.
3. `AuthService.login()` ejecuta `Parse.User.logIn(identifier, password)`.
4. Parse valida credenciales contra `_User`.
5. Parse deja la sesión actual disponible para `Parse.User.current()`.
6. La vista redirige a `/admin/default`.

Detalles técnicos

- Aunque el label dice "Correo Electrónico o Usuario", el método recibe un solo `identifier`.
- El backend tiene `enableEmailSignIn: true`, por eso Parse permite autenticación por email además de username.
- En el registro se persiste `username = email`, así que ambos caminos quedan alineados.

Cómo funciona la persistencia de sesión

- El frontend no implementa almacenamiento manual de tokens.
- La persistencia se delega a Parse JS SDK.
- La sesión vigente se consulta con `Parse.User.current()`.
- Todas las decisiones del guard dependen de ese valor.

Cómo funciona el logout

Punto de entrada

- El botón de cerrar sesión está en `frontend/src/components/navbar/index.tsx`.

Ejecución

1. `handleLogout()` llama `AuthService.logout()`.
2. `AuthService.logout()` ejecuta `Parse.User.logOut()`.
3. Después se fuerza navegación dura con `window.location.href = '/auth/sign-in'`.

Por qué se usa navegación dura

- El propio código indica que se hace para limpiar completamente estado React y sesión cacheada.
- Esto evita que queden componentes renderizados con datos del usuario previo.

Cómo funciona el registro

Pantalla

- La pantalla está en `frontend/src/app/auth/sign-up/default/page.tsx`.
- Solicita:
  - nombre completo
  - correo
  - contraseña

Ejecución

1. `handleRegister()` valida que nombre, correo y contraseña existan.
2. Llama `AuthService.register(email, password, name)`. No se envia establecimiento — se asigna despues por el admin.
3. `register()` crea `new Parse.User()`.
4. Guarda:
   - `username = email`
   - `email = email`
   - `password = password`
   - `firstName`
   - `lastName`
   - `displayName`
   - `accessLevel = 1`
5. Ejecuta `user.signUp()`.
6. La UI muestra éxito y redirige a `/auth/sign-in`.

Detalles importantes

- Parse normalmente deja autenticado al usuario luego de `signUp()`.
- Esta implementación, sin embargo, redirige al login en vez de llevar al dashboard.
- Eso significa que la experiencia final exige volver a iniciar sesión manualmente, aunque internamente `signUp()` ya haya creado la sesión.

Recuperación de contraseña

- No existe una ruta separada para forgot password.
- El flujo vive dentro de `sign-in/page.tsx`.
- `handleForgotPassword()` llama `AuthService.resetPassword(email)`.
- `resetPassword()` usa `Parse.User.requestPasswordReset(email)`.

Dependencia operativa

- Para que el correo de recuperación funcione realmente, Parse Server debe tener proveedor de email configurado.
- En el código revisado no aparece configuración SMTP o adapter de correo dentro de `parse-config.js`.
- Por eso el método cliente existe, pero la entrega real del email depende de configuración externa no documentada aquí.

Control de acceso y autorización

Modelo

- El sistema usa `accessLevel` numérico como fuente principal de autorización.
- También existe un campo `role`, pero en la práctica el control se decide mayormente por `accessLevel`.

Niveles de acceso

| Nivel | Rol UI | UserRole | Uso principal |
|---|---|---|---|
| 1 | Visualizador | VIEWER | Login y vistas básicas |
| 2 | Operador | OPERATOR | Operaciones funcionales autenticadas |
| 3 | Coordinador | COORDINATOR | Operación extendida |
| 4 | Administrador | ADMIN | Gestión de usuarios |
| 5 | Super Administrador | SUPER_ADMIN | Control total, cambio de niveles y eliminación |

Enforcement en frontend

- `AuthGuard` protege acceso autenticado.
- `AdminGuard` protege acceso administrativo con `accessLevel >= 4`.

Enforcement en backend

- `getAllUsers`, `searchUsers`, `getUserById`, `updateUser` exigen `accessLevel >= 4`.
- `updateUserAccessLevel` y `deleteUser` elevan el requisito a super admin.
- `deleteUser` además impide autoeliminación.

Excepciones temporales de bootstrap

- `getAllUsers` y `updateUserAccessLevel` contienen un bypass temporal:
  - si el usuario autenticado no tiene `accessLevel`, se concede acceso temporal para configuración inicial.
- Esto está implementado en backend y debe considerarse una excepción de arranque, no una política final de seguridad.

Super administrador por defecto

Origen

- Se crea o corrige al iniciar backend mediante `backend/init-super-admin.js`.
- Usa variables de entorno:
  - `DEFAULT_ADMIN_USER`
  - `DEFAULT_ADMIN_PASS`
  - `DEFAULT_ADMIN_EMAIL`
  - opcionalmente `DEFAULT_ADMIN_FIRSTNAME`
  - opcionalmente `DEFAULT_ADMIN_LASTNAME`

Comportamiento

- Si el usuario ya existe y no tiene nivel 5, lo actualiza.
- Si no existe, lo crea con `accessLevel = 5`.

Administración de usuarios

Frontend

- `UserManagementService.getAllUsers()` consulta `Parse.Cloud.run('getAllUsers')`.
- `updateUserRole()` actualiza tanto:
  - `accessLevel`
  - `role`
- `toggleUserStatus()` persiste `isActive`.
- `removeUser()` llama `deleteUser`.

Backend

- `updateUser()` actualiza datos perfil y también:
  - `role`
  - `isActive`
- `updateUserAccessLevel()` solo cambia `accessLevel`.

Observaciones técnicas relevantes

- El checkbox "Mantener sesión iniciada" en la pantalla de login no modifica actualmente el comportamiento del SDK.
- La decisión de sesión persistente está delegada a Parse y no a una bandera explícita del formulario.
- El registro público está habilitado desde cliente y no se observa en el código una whitelist obligatoria previa de correos.
- `verifyUserEmails: false` implica que la verificación de correo no bloquea autenticación.
- `revokeSessionOnPasswordReset: true` invalida sesiones existentes cuando se cambia contraseña por flujo de reset.

Secuencia resumida

Login

1. Usuario abre `/auth/sign-in`.
2. Frontend llama `Parse.User.logIn`.
3. Parse genera sesión.
4. `AuthGuard` detecta usuario actual.
5. Se habilita navegación a rutas protegidas.

Logout

1. Usuario hace clic en "Cerrar Sesión".
2. Frontend llama `Parse.User.logOut`.
3. Se redirige por recarga completa a `/auth/sign-in`.
4. `Parse.User.current()` pasa a ser `null`.

Registro

1. Usuario abre `/auth/sign-up/default`.
2. Frontend crea `Parse.User`.
3. Se guarda con `accessLevel = 1`.
4. Se completa `signUp`.
5. UI redirige al login.
