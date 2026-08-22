<div align="center">

<img src="https://img.shields.io/badge/DATACEF-Especialistas%20en%20Tecnolog%C3%ADa%20Inform%C3%A1tica-0A66C2?style=for-the-badge&logo=data&logoColor=white" alt="DATACEF"/>

<h1>🏥 Sistema de Gestión de Mantenimiento</h1>

<h3>Plataforma integral para establecimientos de salud de atención cerrada</h3>

<p>
  <img src="https://img.shields.io/badge/Next.js-13+-000000?style=flat-square&logo=next.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white"/>
  <img src="https://img.shields.io/badge/Parse_Server-169CEE?style=flat-square&logo=parse&logoColor=white"/>
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white"/>
  <img src="https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white"/>
</p>

<p>
  <img src="https://img.shields.io/badge/Deployment-Local-success?style=flat-square"/>
  <img src="https://img.shields.io/badge/Language-Espa%C3%B1ol-yellow?style=flat-square"/>
  <img src="https://img.shields.io/badge/Compliance-EQ%20%7C%20INS-blueviolet?style=flat-square"/>
</p>

</div>

---

<h2>🎯 Objetivo General</h2>

<table>
<tr>
<td>

Plataforma web diseñada para la <strong>gestión integral del mantenimiento</strong> en establecimientos de salud de atención cerrada en Chile, orientada al cumplimiento del <strong>Manual de Acreditación</strong> en sus ámbitos:

<ul>
  <li><strong>EQ</strong> — Seguridad del Equipamiento</li>
  <li><strong>INS</strong> — Seguridad de las Instalaciones</li>
</ul>

Permite <em>planificar, ejecutar y trazar</em> el mantenimiento preventivo y correctivo de dispositivos médicos, equipamiento industrial e infraestructura, apoyando a los equipos técnicos y de calidad con la evidencia documental requerida por los estándares de acreditación.

</td>
</tr>
</table>

---

<h2>🔐 Advertencia: Actualice las Credenciales antes de Usar el Sistema</h2>

<table>
<tr>
<td>

⚠️ <strong>ADVERTENCIA CRÍTICA — NO LEVANTE EL SISTEMA SIN ACTUALIZAR LAS CREDENCIALES</strong>

El uso de las credenciales de ejemplo, o de credenciales filtradas, expone el sistema a <strong>ataques directos e inmediatos</strong>. Por ello el backend incorpora una validación de arranque (<code>backend/validate-env.js</code>) que <strong>bloquea el inicio del servidor</strong> si detecta credenciales ausentes, sin actualizar (valores <code>CAMBIAR_ESTO_*</code>) o débiles: no hay forma de levantar el sistema sin pasar por esa verificación.

</td>
</tr>
</table>

<h3>🚨 Peligros de NO actualizar las credenciales</h3>

<table>
  <thead>
    <tr>
      <th align="left">Credencial expuesta</th>
      <th align="left">Qué puede hacer un atacante</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>🔑 <code>PARSE_MASTER_KEY</code></td>
      <td><strong>Control total del backend sin iniciar sesión</strong>: leer, alterar o borrar toda la base de datos (equipos, pautas, historiales, usuarios), crear cuentas con nivel SUPER_ADMIN y saltarse todos los niveles de acceso del sistema.</td>
    </tr>
    <tr>
      <td>🗄️ <code>MONGO_ROOT_USER</code> + <code>MONGO_ROOT_PASSWORD</code></td>
      <td><strong>Acceso directo a la base de datos</strong>, incluido el panel Mongo Express (que usa estas mismas credenciales): robo de información de mantenimiento del establecimiento de salud, cifrado por rescate (ransomware) o borrado destructivo de todos los datos.</td>
    </tr>
    <tr>
      <td>👑 <code>DEFAULT_ADMIN_PASS</code></td>
      <td><strong>Suplantación del super administrador</strong> (nivel 5): administración completa del sistema, gestión de usuarios y roles, y eliminación de registros sin dejar rastro de responsabilidad.</td>
    </tr>
    <tr>
      <td>📧 <code>BREVO_SMTP_PASS</code></td>
      <td><strong>Uso fraudulento de su cuenta de correo</strong>: envío de spam y phishing en su nombre, suspensión de la cuenta Brevo, agotamiento de su cuota e inclusión de su dominio en listas negras.</td>
    </tr>
  </tbody>
</table>

<blockquote>
🧷 <strong>Importante:</strong> eliminar un archivo <code>.env</code> del repositorio <em>no</em> borra las credenciales del historial de git: una vez filtradas, la única mitigación efectiva es <strong>rotarlas</strong> (generar nuevas y revocar las antiguas en cada servicio). El sistema maneja datos de establecimientos de salud, considerados <strong>datos sensibles</strong> conforme a la legislación chilena de protección de datos.
</blockquote>

<h3>⚙️ Cómo configurar sus credenciales</h3>

**Paso 1** — Copie las plantillas de variables de entorno:

```bash
cp .env.example .env            # backend, Docker Compose y Mongo
cp .env.local.example .env.local  # entorno local del frontend
```

**Paso 2** — Reemplace **todos** los valores `CAMBIAR_ESTO_*` por credenciales propias y únicas:

```bash
# Generar claves fuertes (ejemplo):
openssl rand -hex 32
```

| Variable | Requisito mínimo |
|---|---|
| `PARSE_MASTER_KEY` / `PARSE_JS_KEY` | ≥ 20 caracteres, aleatorias |
| `MONGO_ROOT_PASSWORD` | ≥ 12 caracteres |
| `DEFAULT_ADMIN_PASS` | ≥ 10 caracteres, no trivial |
| `BREVO_SMTP_PASS` | Su clave SMTP real de Brevo |

Los archivos `.env` y `.env.local` están excluidos de git (ver `.gitignore`): **nunca deben subirse al repositorio**. Si el backend bloquea el arranque, revise el error en los logs del servicio (opción 9 del Coordinador): indicará exactamente qué credencial debe corregir.

---

<h2>🐳 Despliegue Local — Coordinador</h2>

<blockquote>
<strong>Todo el sistema se levanta y administra mediante el Coordinador</strong> (<code>scripts/coordinador.py</code>), el centro de control de los contenedores Docker del proyecto: MongoDB, backend (Parse Server), frontend (Next.js), Mongo Express y Nginx. Requiere <strong>Python 3</strong> y <strong>Docker Desktop en ejecución</strong>; el script verifica ambos prerrequisitos al iniciar. El proyecto se ejecuta <strong>100% en entorno local</strong> y no requiere servicios cloud externos.
</blockquote>

```bash
python scripts/coordinador.py     # menú interactivo
python scripts/coordinador.py 1   # uso directo: opción 1 = rebuild completo
```

Para un despliegue desde cero, use la <strong>opción 1 (rebuild completo)</strong>: hace <code>down</code>, construye sin caché y levanta todos los servicios. En el primer arranque, el backend valida las credenciales y <strong>se negará a iniciar si no fueron actualizadas</strong> (ver advertencia anterior).

<h3>🎛️ Opciones del Coordinador</h3>

<table>
  <thead>
    <tr>
      <th align="center">Opción</th>
      <th align="left">Acción</th>
    </tr>
  </thead>
  <tbody>
    <tr><td align="center"><strong>1</strong></td><td>🔄 <strong>Rebuild completo</strong> (down → build sin caché → up) — despliegue inicial o cambios mayores</td></tr>
    <tr><td align="center"><strong>2</strong></td><td>⬆️ Actualizar sin rebuild (down → up)</td></tr>
    <tr><td align="center"><strong>3</strong></td><td>🔁 Reiniciar todos los servicios</td></tr>
    <tr><td align="center"><strong>r</strong></td><td>🚑 <strong>Rescate rápido</strong> — levanta los servicios uno a uno en orden de dependencia (MongoDB → backend → frontend → Mongo Express → Nginx)</td></tr>
    <tr><td align="center"><strong>4</strong></td><td>⚙️ Rebuild solo <strong>backend</strong> (Parse Server)</td></tr>
    <tr><td align="center"><strong>5</strong></td><td>🎨 Rebuild solo <strong>frontend</strong> (Next.js)</td></tr>
    <tr><td align="center"><strong>6</strong></td><td>🌐 Reiniciar Nginx (aplica cambios de <code>default.conf</code>)</td></tr>
    <tr><td align="center"><strong>7</strong></td><td>🗄️ Reiniciar Mongo Express</td></tr>
    <tr><td align="center"><strong>8</strong></td><td>📊 Estado de servicios (contenedores + consumo de recursos)</td></tr>
    <tr><td align="center"><strong>9</strong></td><td>📜 Logs en tiempo real (por servicio o todos)</td></tr>
    <tr><td align="center"><strong>10</strong></td><td>⏹️ Parar todos los servicios (los volúmenes se preservan)</td></tr>
    <tr><td align="center"><strong>11</strong></td><td>▶️ Levantar todos los servicios</td></tr>
    <tr><td align="center"><strong>12</strong></td><td>💥 <strong>Reset total</strong> — <strong>borra el volumen de MongoDB y toda la data</strong> (pide confirmación escrita)</td></tr>
    <tr><td align="center"><strong>13</strong></td><td>🧹 Limpieza de Docker (prune de imágenes, contenedores, volúmenes y caché)</td></tr>
    <tr><td align="center"><strong>14</strong></td><td>🏥 Cargar establecimientos desde Excel (<code>scripts/load_data_ss.py</code>)</td></tr>
  </tbody>
</table>

Todos los servicios quedan expuestos a través de un <strong>reverse proxy Nginx</strong> en el puerto <code>5771</code>.

<h3>🌐 URLs Principales</h3>

<table>
  <thead>
    <tr>
      <th>Servicio</th>
      <th>URL</th>
      <th>Descripción</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>🖥️ <strong>Aplicación Web</strong></td>
      <td><code>http://localhost:5771/</code></td>
      <td>Interfaz principal Next.js</td>
    </tr>
    <tr>
      <td>⚙️ <strong>API Parse Server</strong></td>
      <td><code>http://localhost:5771/api/parse</code></td>
      <td>Backend BaaS con Cloud Functions</td>
    </tr>
    <tr>
      <td>🗄️ <strong>Mongo Admin</strong></td>
      <td><code>http://localhost:5771/mongo-admin/</code></td>
      <td>Panel de administración de MongoDB</td>
    </tr>
  </tbody>
</table>

<h3>🌍 Rutas Públicas (sin login)</h3>

<table>
  <thead>
    <tr>
      <th>Ruta</th>
      <th>Descripción</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>📝 <code>/solicitud/nueva</code></td>
      <td>Formulario público para que cualquier usuario del hospital solicite un mantenimiento (sin necesidad de cuenta)</td>
    </tr>
    <tr>
      <td>🔍 <code>/solicitud/estado/[folio]?t=[token]</code></td>
      <td>Consulta pública del estado de una solicitud mediante folio + token enviado por correo</td>
    </tr>
  </tbody>
</table>

<h3>🔐 Rutas Administrativas</h3>

<table>
  <thead>
    <tr>
      <th>Ruta</th>
      <th>Descripción</th>
      <th>Rol mínimo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>🏠 <code>/admin/default</code></td>
      <td>Dashboard principal</td>
      <td>VIEWER</td>
    </tr>
    <tr>
      <td>🏥 <code>/admin/inventario</code></td>
      <td>Inventario de equipos médicos</td>
      <td>OPERATOR</td>
    </tr>
    <tr>
      <td>⚙️ <code>/admin/inventario-industrial</code></td>
      <td>Inventario de equipamiento industrial</td>
      <td>OPERATOR</td>
    </tr>
    <tr>
      <td>🚗 <code>/admin/flota-vehicular</code></td>
      <td>Inventario de flota vehicular</td>
      <td>OPERATOR</td>
    </tr>
    <tr>
      <td>🏗️ <code>/admin/infraestructura</code></td>
      <td>Inventario de infraestructura</td>
      <td>OPERATOR</td>
    </tr>
    <tr>
      <td>🔧 <code>/admin/mantenimiento</code></td>
      <td>Pautas de mantenimiento + exportación Excel + filtros por dominio/fecha/ID</td>
      <td>OPERATOR</td>
    </tr>
    <tr>
      <td>➕ <code>/admin/mantenimiento/nuevo</code></td>
      <td>Crear nuevo registro de mantenimiento</td>
      <td>OPERATOR</td>
    </tr>
    <tr>
      <td>📋 <code>/admin/mantenimiento/bandeja</code></td>
      <td>Bandeja de validación de pautas</td>
      <td>COORDINATOR</td>
    </tr>
    <tr>
      <td>📥 <code>/admin/solicitudes</code></td>
      <td>Bandeja de solicitudes recibidas del formulario público</td>
      <td>COORDINATOR</td>
    </tr>
    <tr>
      <td>📄 <code>/admin/solicitudes/[id]</code></td>
      <td>Detalle de solicitud · aceptar / rechazar / asignar / completar / cerrar</td>
      <td>OPERATOR</td>
    </tr>
    <tr>
      <td>👷 <code>/admin/solicitudes/mis-asignaciones</code></td>
      <td>Órdenes de trabajo asignadas al encargado autenticado</td>
      <td>OPERATOR</td>
    </tr>
    <tr>
      <td>👥 <code>/admin/encargados</code></td>
      <td>CRUD del equipo técnico (crea cuenta Parse automáticamente)</td>
      <td>ADMIN</td>
    </tr>
    <tr>
      <td>❓ <code>/admin/preguntas</code></td>
      <td>Gestión de preguntas dinámicas para las pautas de mantenimiento</td>
      <td>ADMIN</td>
    </tr>
    <tr>
      <td>🤝 <code>/admin/proveedores</code></td>
      <td>Gestión de proveedores y convenios</td>
      <td>ADMIN</td>
    </tr>
    <tr>
      <td>🔑 <code>/admin/user-management</code></td>
      <td>Gestión de usuarios y roles del sistema</td>
      <td>ADMIN</td>
    </tr>
  </tbody>
</table>

<h3>🔓 Rutas de Autenticación</h3>

<table>
  <tbody>
    <tr>
      <td>🔑 <code>/auth/sign-in</code></td>
      <td>Inicio de sesión</td>
    </tr>
    <tr>
      <td>📝 <code>/auth/sign-up/default</code></td>
      <td>Registro de usuarios</td>
    </tr>
  </tbody>
</table>

<blockquote>
🔐 El panel <strong>Mongo Admin</strong> está protegido con <strong>Basic Auth</strong> usando las credenciales definidas en <code>.env</code> (<code>MONGO_ROOT_USER</code> / <code>MONGO_ROOT_PASSWORD</code>).
</blockquote>

---

<h2>📦 Módulos del Proyecto</h2>

<table>
  <tr>
    <td width="33%" align="center" valign="top">
      <h3>🏥</h3>
      <h3>Dispositivos Médicos</h3>
      <em>Ámbito EQ</em>
      <hr/>
      <ul align="left">
        <li>Inventario clínico</li>
        <li>Mantenimiento preventivo</li>
        <li>Órdenes correctivas</li>
        <li>Calibraciones metrológicas</li>
        <li>Trazabilidad por equipo</li>
      </ul>
    </td>
    <td width="33%" align="center" valign="top">
      <h3>⚙️</h3>
      <h3>Equipamiento Industrial</h3>
      <em>Soporte operacional</em>
      <hr/>
      <ul align="left">
        <li>Calderas y generadores</li>
        <li>Sistemas HVAC</li>
        <li>Ascensores y elevadores</li>
        <li>Lavandería industrial</li>
        <li>Cocina industrial</li>
      </ul>
    </td>
    <td width="33%" align="center" valign="top">
      <h3>🏗️</h3>
      <h3>Infraestructura</h3>
      <em>Ámbito INS</em>
      <hr/>
      <ul align="left">
        <li>Instalaciones eléctricas</li>
        <li>Instalaciones sanitarias</li>
        <li>Gases clínicos</li>
        <li>Protección contra incendios</li>
        <li>Señalética y estructura</li>
      </ul>
    </td>
  </tr>
</table>

<h3>🔧 Módulos Transversales</h3>

<table>
  <tr>
    <td>📥 <strong>Solicitudes / Órdenes de Trabajo</strong></td>
    <td>Formulario público sin login + bandeja admin + asignación a encargados + seguimiento por correo (Brevo SMTP)</td>
  </tr>
  <tr>
    <td>👷 <strong>Encargados de Mantenimiento</strong></td>
    <td>CRUD del equipo técnico con especialidades y dominios; crea cuenta Parse automáticamente</td>
  </tr>
  <tr>
    <td>📊 <strong>Exportación a Excel</strong></td>
    <td>Descarga de historial de mantenimientos con filtros (dominio, fecha, identificador, ID de pauta)</td>
  </tr>
  <tr>
    <td>🤝 <strong>Proveedores y Convenios</strong></td>
    <td>Gestión de proveedores, licitaciones y vínculo con inventarios</td>
  </tr>
  <tr>
    <td>👥 <strong>Gestión de Usuarios y Roles</strong></td>
    <td>Administración centralizada de cuentas y permisos</td>
  </tr>
  <tr>
    <td>🔑 <strong>Autenticación</strong></td>
    <td>Inicio de sesión, registro y gestión de sesiones (Parse.User)</td>
  </tr>
  <tr>
    <td>📧 <strong>Notificaciones por Correo</strong></td>
    <td>Brevo SMTP integrado en backend con plantillas HTML para cada evento del ciclo de solicitud</td>
  </tr>
  <tr>
    <td>🎛️ <strong>Panel de Administración</strong></td>
    <td>Vistas dinámicas según nivel de acceso del usuario</td>
  </tr>
</table>

---

<h2>🛠️ Stack Tecnológico</h2>

<table>
  <tr>
    <th align="left">Capa</th>
    <th align="left">Tecnologías</th>
  </tr>
  <tr>
    <td>🎨 <strong>Frontend</strong></td>
    <td>Next.js 13+ (App Router) · TypeScript · Tailwind CSS · Parse JS SDK · Horizon UI</td>
  </tr>
  <tr>
    <td>⚙️ <strong>Backend</strong></td>
    <td>Parse Server · Express.js · Cloud Functions · LiveQuery (WebSockets)</td>
  </tr>
  <tr>
    <td>🗄️ <strong>Base de Datos</strong></td>
    <td>MongoDB · Mongo Express</td>
  </tr>
  <tr>
    <td>🐳 <strong>Infraestructura</strong></td>
    <td>Docker · Docker Compose · Nginx (reverse proxy — puerto 5771)</td>
  </tr>
</table>

---

<h2>🔐 Seguridad y Control de Acceso</h2>

<p>El sistema implementa un modelo de <strong>autenticación y autorización por niveles jerárquicos</strong>:</p>

<table>
  <thead>
    <tr>
      <th align="center">Nivel</th>
      <th>Rol</th>
      <th>Descripción</th>
    </tr>
  </thead>
  <tbody>
    <tr><td align="center">1</td><td>👁️ <strong>VIEWER</strong></td><td>Acceso de solo lectura</td></tr>
    <tr><td align="center">2</td><td>🔧 <strong>OPERATOR</strong></td><td>Operador técnico de campo</td></tr>
    <tr><td align="center">3</td><td>📋 <strong>COORDINATOR</strong></td><td>Coordinador de mantenimiento</td></tr>
    <tr><td align="center">4</td><td>🛡️ <strong>ADMIN</strong></td><td>Administrador del sistema</td></tr>
    <tr><td align="center">5</td><td>👑 <strong>SUPER_ADMIN</strong></td><td>Control total de la plataforma</td></tr>
  </tbody>
</table>

<h3>🔒 Mecanismos de Seguridad</h3>

<table>
  <tr>
    <td>🎫</td>
    <td><strong>Autenticación Parse</strong> — sesiones seguras gestionadas por <code>Parse.User</code></td>
  </tr>
  <tr>
    <td>🚧</td>
    <td><strong>AuthGuard</strong> — redirige a usuarios no autenticados hacia login</td>
  </tr>
  <tr>
    <td>🛡️</td>
    <td><strong>AdminGuard</strong> — restringe rutas admin a <code>accessLevel >= 4</code></td>
  </tr>
  <tr>
    <td>✅</td>
    <td><strong>Validación en backend</strong> — toda Cloud Function valida <code>request.user</code> y nivel</td>
  </tr>
  <tr>
    <td>🧭</td>
    <td><strong>Filtrado de navegación</strong> — sidebar dinámico por <code>allowedRoles</code></td>
  </tr>
  <tr>
    <td>🔐</td>
    <td><strong>Basic Auth</strong> en el panel Mongo Admin</td>
  </tr>
  <tr>
    <td>🗝️</td>
    <td><strong>Variables sensibles</strong> gestionadas vía <code>.env</code> no versionados</td>
  </tr>
  <tr>
    <td>⚡</td>
    <td><strong>Super Admin inicial</strong> creado automáticamente por <code>init-super-admin.js</code></td>
  </tr>
</table>

---

<h2>🌎 Idioma</h2>

<p align="center">
Todo el sistema —<em>interfaz, datos y documentación funcional</em>— está en <strong>español</strong>, conforme al contexto regulatorio chileno.
</p>

---

<h2>🙏 Agradecimientos</h2>

<p align="center">
La interfaz de usuario está construida sobre la plantilla de código abierto <strong>Horizon UI</strong>,<br/>
desarrollada por <strong>Simmmple</strong> y distribuida bajo licencia <a href="https://opensource.org/licenses/MIT">MIT</a>.
</p>

<p align="center">
🌐 <a href="https://horizon-ui.com/"><strong>horizon-ui.com</strong></a>
</p>

---

<div align="center">

<h2>💼 Autoría</h2>

<h3>DATACEF</h3>
<strong>Especialistas en Tecnología Informática</strong>

<br/><br/>

<em>Empresa chilena dedicada al desarrollo de soluciones informáticas<br/>
para el sector salud, con foco en sistemas de gestión alineados<br/>
a los estándares nacionales de acreditación.</em>

<br/><br/>

<sub>© DATACEF — Todos los derechos reservados. Ver [LICENSE](./LICENSE).</sub>

</div>
