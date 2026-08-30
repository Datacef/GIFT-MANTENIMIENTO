/**
 * Contenido del Manual de Usuario del Sistema de Gestion de Mantenimiento.
 * Es CONTENIDO de la aplicacion (consumido por el modulo /admin/ayuda), no
 * documentacion de proyecto: la documentacion del proyecto vive en el vault
 * GIFT-MANTENIMIENTO-DATACEF (ver ACT-07).
 *
 * Estructura: secciones con id, categoria, titulo, palabras clave para el
 * buscador y contenido en markdown ligero (## titulo, - vineta, **negrita**,
 * > nota, bloques `codigo`).
 */

export interface SeccionGuia {
  id: string;
  categoria: string;
  titulo: string;
  palabras: string[];
  contenido: string;
}

export const CATEGORIAS_GUIA = [
  'Inicio',
  'Inventarios',
  'Mantenimientos',
  'Solicitudes',
  'Preguntas y pautas',
  'Proveedores',
  'Reportes y KPIs',
  'Alertas',
  'Administracion',
  'Despliegue',
] as const;

export const GUIA_USUARIO: SeccionGuia[] = [
  // ---------------------------------------------------------------- Inicio
  {
    id: 'bienvenida',
    categoria: 'Inicio',
    titulo: 'Bienvenida y conceptos basicos',
    palabras: ['inicio', 'bienvenida', 'que es', 'sistema', 'acreditacion', 'eq', 'ins', 'manual'],
    contenido: `## Que es este sistema
Es la plataforma para **gestionar el mantenimiento** de tu establecimiento de salud: dispositivos medicos, equipamiento industrial, flota vehicular e infraestructura. Esta pensada para responder a los estandares del **Manual de Acreditacion** (ambitos EQ - Seguridad del Equipamiento, e INS - Seguridad de las Instalaciones) y dejarte la **evidencia documentada**: que equipo existe, cuando se le hizo mantenimiento, quien lo hizo y con que resultados.

## Los 4 inventarios
- **Equipos Medicos** (dominio equipoMedico): monitores, ventiladores, balmas, etc. Se distinguen por criticidad: **C (critico)** o **A (apoyo)**.
- **Equipos Industriales**: calderas, generadores, HVAC, ascensores, lavanderia y cocina industrial.
- **Flota Vehicular**: vehiculos del establecimiento.
- **Infraestructura**: instalaciones electricas, sanitarias, gases clinicos, proteccion contra incendios, senaletica.

## Como se organiza el trabajo
1. **Inventario**: registras todos tus activos con su frecuencia de mantencion.
2. **Pautas de preguntas**: defines el checklist que se le aplica a cada tipo de equipo.
3. **Registros de mantenimiento**: cada mantencion ejecutada se registra con esa pauta y queda en una bandeja de validacion.
4. **Cumplimiento**: el sistema calcula automaticamente si cada activo esta al dia, con retraso o critico.
5. **Reportes y alertas**: imprimes la agenda semanal/mensual para los tecnicos y recibes alertas de vencimientos.

> Usa el **buscador de esta ayuda** (arriba a la izquierda) para ir directo al tema que necesitas, o **preguntale al asistente** en el panel de la derecha.`,
  },
  {
    id: 'roles-acceso',
    categoria: 'Inicio',
    titulo: 'Roles y niveles de acceso',
    palabras: ['roles', 'acceso', 'permisos', 'viewer', 'operator', 'coordinator', 'admin', 'super admin', 'nivel'],
    contenido: `## Niveles de usuario
- **1 · VIEWER**: solo lectura. Ve dashboards e inventarios, no puede modificar.
- **2 · OPERATOR**: tecnico de campo. Registra mantenimientos, ve sus asignaciones y el reporte semanal.
- **3 · COORDINATOR**: coordina el mantenimiento. Valida pautas (bandeja), gestiona solicitudes, ve cumplimiento y alertas.
- **4 · ADMIN**: administra el sistema. Gestiona usuarios, encargados, preguntas, proveedores, diagnostico de correo y sincronizaciones masivas.
- **5 · SUPER_ADMIN**: control total.

## Como funciona en la practica
- El **menu lateral** muestra solo lo que tu rol puede usar.
- Si intentas entrar a una pagina no autorizada, el sistema te devuelve al dashboard.
- Toda accion sensible se valida **en el backend** aunque vengas de una pantalla autorizada.

> Los roles se asignan desde **Gestion Usuarios** (solo ADMIN o superior). Ver la seccion "Gestion de usuarios".`,
  },
  {
    id: 'primeros-pasos',
    categoria: 'Inicio',
    titulo: 'Primeros pasos: implementacion inicial',
    palabras: ['primeros pasos', 'empezar', 'inicial', 'implementacion', 'orden', 'configuracion inicial'],
    contenido: `## Orden recomendado para partir de cero
1. **Levanta el sistema** con el Coordinador (ver seccion "Despliegue con el Coordinador") y **actualiza las credenciales** del archivo .env antes del primer arranque.
2. **Ingresa** con el usuario administrador inicial (definido en .env con DEFAULT_ADMIN_USER / DEFAULT_ADMIN_PASS).
3. **Carga establecimientos** (opcion 14 del Coordinador) si trabajas con varios.
4. **Crea las pautas de preguntas** para cada clasificacion de equipo (seccion "Preguntas de mantenimiento").
5. **Llena los inventarios**: puedes importar desde Excel (ver "Importar y exportar inventarios").
6. **Crea los encargados** tecnicos con sus especialidades (seccion "Encargados de mantenimiento").
7. **Registra mantenimientos** y revisa el **Cumplimiento** para ponerte al dia (hay flujo de regularizacion para atrasos historicos).
8. Activa **reportes semanales** para los tecnicos y, si corresponde, las **alertas** de vencimiento.`,
  },

  // ------------------------------------------------------------ Inventarios
  {
    id: 'inventario-crear-editar',
    categoria: 'Inventarios',
    titulo: 'Inventarios: crear y editar activos',
    palabras: ['inventario', 'crear', 'agregar', 'equipo', 'nuevo', 'editar', 'activo', 'critico', 'apoyo', 'frecuencia', 'vida util'],
    contenido: `## Donde
Menu **Inventarios**: Equipos Medicos, Equipos Industriales, Flota Vehicular e Infraestructura. Cada uno tiene su propia pagina con tabla, filtros y botones de accion.

## Crear un activo (paso a paso)
1. Entra al inventario correspondiente y presiona el boton de **nuevo** ( formulario en pantalla emergente).
2. Completa los campos obligatorios:
   - **Nombre** del equipo e **identificador** (codigo de inventario, patente o codigo interno).
   - **Ubicacion/servicio** donde esta instalado.
   - **Fecha de adquisicion** (o instalacion, segun dominio) y **vida util** estimada.
   - **Estado fisico** (B/Bueno, M/Medio, R/Regular; Baja solo al dar de baja).
   - **Frecuencia de mantencion en meses** (ej: 6 = cada 6 meses). Es la base del calculo de cumplimiento.
   - Equipos medicos: **Critico/Apoyo** (C o A). Industriales: **criticidad** Alta/Media/Baja.
   - Si tienes pauta creada: **pauta asignada** (obligatoria para que el sistema calcule cumplimiento).
3. Guarda. El sistema calcula automaticamente el **proximo mantenimiento esperado** y el estado de cumplimiento inicial.

## Editar
Usa el menu de acciones de la fila (o doble clic). Cambiar la frecuencia recalcula los periodos esperados a futuro (el historial ya validado no se toca).

> Sin pauta asignada y sin frecuencia, el activo queda como **sin configuracion** y no participa del cumplimiento. Asignale ambas lo antes posible.`,
  },
  {
    id: 'inventario-archivos-baja',
    categoria: 'Inventarios',
    titulo: 'Inventarios: archivos adjuntos, baja y papelera',
    palabras: ['archivos', 'adjuntos', 'acta', 'garantia', 'calibracion', 'manual', 'baja', 'papelera', 'eliminar', 'restaurar', 'huérfanos', 'duplicados'],
    contenido: `## Archivos por activo
Cada activo acepta **archivos categorizados**: actas de adquisicion/baja, garantias, certificados de calibracion, manuales tecnicos e informes de mantencion. Son la evidencia para acreditacion.
1. Abre el detalle del activo y ve al panel de **archivos**.
2. Sube el documento y selecciona su **categoria**.
3. Quedan versionados y accesibles desde el detalle (con permiso de OPERATOR+ para subir; lectura para todos).

## Dar de baja un activo
1. Accion **dar de baja** en la fila (requiere confirmacion).
2. Registra el motivo; el sistema fija la **fecha de baja** automaticamente si no la indicas.
3. Un activo de baja deja de contar para el cumplimiento y las alertas, pero **conserva todo su historial**.
4. Puedes **reactivarlo** despues si vuelve a servicio.

## Papelera y duplicados
- Al **eliminar**, el activo pasa a la **Papelera** (menu Inventarios, solo ADMIN): se puede **restaurar** o purgar.
- Si creas un activo con los mismos datos que uno eliminado, el sistema **detecta el duplicado** y ofrece **adoptar/recuperar** ese registro en vez de crear uno nuevo.
- Herramientas de mantenimiento para ADMIN: **reconciliar huerfanos** (registros de mantenimiento sin activo asociado).`,
  },
  {
    id: 'inventario-importar-exportar',
    categoria: 'Inventarios',
    titulo: 'Importar y exportar inventarios (Excel)',
    palabras: ['importar', 'exportar', 'excel', 'masivo', 'carga', 'plantilla', 'descargar'],
    contenido: `## Exportar
Cada pagina de inventario tiene **Exportar Excel**: descarga todos los activos visibles (respeta los filtros aplicados). El dashboard de cumplimiento tambien exporta su reporte, y la seccion de KPIs exporta **evidencia de acreditacion**.

## Importar (carga masiva)
1. Descarga primero tu inventario con **Exportar**: te sirve de plantilla con las columnas exactas.
2. Prepara tu Excel respetando esas columnas (nombre, identificador, servicio/ubicacion, fechas, estado, frecuencia, etc.).
3. Usa **Importar Excel** en la pagina del inventario y selecciona el archivo.
4. Revisa el resultado: el sistema informa creados, actualizados y filas con error (corrige el Excel y reintenta solo esas filas).

> Recomendacion: importa primero a un inventario de prueba o revisa bien la plantilla. Nunca subas credenciales ni datos ajenos en los archivos.`,
  },

  // ---------------------------------------------------------- Mantenimientos
  {
    id: 'mantenimiento-registrar',
    categoria: 'Mantenimientos',
    titulo: 'Registrar un mantenimiento (pauta de checklist)',
    palabras: ['registro', 'registrar', 'nuevo mantenimiento', 'pauta', 'checklist', 'preventivo', 'correctivo', 'predictivo', 'wizard'],
    contenido: `## Donde
Menu **Mantenimiento > Bandeja**, boton de **nuevo registro** (o desde un activo). Se abre un asistente paso a paso.

## Paso a paso
1. **Selecciona el dominio** (equipo medico, industrial, flota, infraestructura) y **busca el activo** por nombre o identificador.
2. El sistema carga la **pauta de preguntas** asignada al activo (checklist dinamico).
3. Responde el **checklist**: cada pregunta admite respuesta (si/no, texto o segun su tipo) y observa si falla algo.
4. Indica **tipo** (preventivo, correctivo, predictivo), **fecha de ejecucion** y **tecnico** que lo realizo.
5. Adjunta evidencia si corresponde (fotos, informe del proveedor).
6. Guarda. El registro queda **pendiente de validacion**.

## Que pasa despues
- Un COORDINATOR lo **aprueba o rechaza** en la Bandeja de validacion.
- Al aprobarse, el sistema **actualiza automaticamente** el cumplimiento del activo: ultima mantencion, proxima fecha esperada y porcentaje.
- Si es un **correctivo** por una falla, puedes asociarlo a una solicitud si existe.`,
  },
  {
    id: 'mantenimiento-bandeja',
    categoria: 'Mantenimientos',
    titulo: 'Bandeja de validacion: aprobar o rechazar pautas',
    palabras: ['bandeja', 'validacion', 'aprobar', 'rechazar', 'pendiente', 'coordinator', 'revisar'],
    contenido: `## Que es
La **Bandeja** (Mantenimiento > Bandeja) lista los registros de mantenimiento **pendientes de validacion**. Es el control de calidad: nadie deberia aprobar su propio trabajo sin revision.

## Flujo
1. Filtra por dominio, fecha o tecnico.
2. Abre el registro: revisa el checklist completo, las observaciones y los archivos adjuntos.
3. Decide:
   - **Aprobar**: el cumplimiento del activo se recalcula al instante.
   - **Rechazar**: escribe el motivo; el registro queda rechazado y el tecnico puede corregirlo y volver a enviarlo.

## Regularizaciones (mantenciones atrasadas)
En el **dashboard de Cumplimiento** hay una tabla de **Regularizaciones Pendientes**: activos con periodos vencidos sin registro. Con el boton **"Registrar atrasado"** se abre el mismo asistente en modo retroactivo, precargando el **primer periodo faltante**. Asi regularizas el historial mes a mes hasta ponerte al dia.

> El estado "critico" suele significar varios periodos faltantes: prioriza esos activos (la tabla los ordena por cantidad de periodos faltantes).`,
  },
  {
    id: 'mantenimiento-cumplimiento',
    categoria: 'Mantenimientos',
    titulo: 'Dashboard de cumplimiento (como leerlo)',
    palabras: ['cumplimiento', 'dashboard', 'al dia', 'retraso', 'critico', 'sin historial', 'regularizacion', 'sincronizar'],
    contenido: `## Estados de cumplimiento por activo
- **al_dia**: todos los periodos esperados estan registrados y aprobados.
- **con_retraso**: falta al menos un periodo (el proximo esperado ya paso).
- **critico**: acumula varios periodos faltantes. Es la prioridad de acreditacion.
- **sin_historial**: tiene pauta y frecuencia, pero nunca se le registro mantenimiento.
- **sin_configuracion**: le falta pauta asignada o frecuencia. Corrigelo en el inventario.
- **dado_de_baja**: excluido del calculo.

## Como leer el dashboard (Mantenimiento > Cumplimiento)
- **Tarjetas KPI**: cumplimiento global, al dia, con retraso, criticos y sin historial.
- **Indicadores de Acreditacion (EQ/INS)**: K1-K9 con semaforo vs umbrales del Manual (equipos criticos 100%, apoyo >= 50%, etc.). Boton **"Exportar evidencia"** para la carpeta de acreditacion.
- **Grafico por dominio**: distribucion de estados en los 4 inventarios.
- **Top criticos**: los activos con mas periodos faltantes (con acceso directo para regularizar).
- **Proximos vencimientos**: activos que vencen en la ventana seleccionada (7 a 90 dias).
- **Regularizaciones pendientes**: para ponerte al dia con registros retroactivos.

> Boton **"Sincronizar todos"** (solo ADMIN): recalcula el cumplimiento de todos los activos. Usalo despues de cambios masivos (importaciones, cambios de frecuencia). El recalculo normal es automatico tras cada aprobacion.`,
  },

  // ------------------------------------------------------------ Solicitudes
  {
    id: 'solicitudes-flujo',
    categoria: 'Solicitudes',
    titulo: 'Solicitudes y ordenes de trabajo (flujo completo)',
    palabras: ['solicitud', 'solicitudes', 'orden de trabajo', 'folio', 'asignar', 'encargado', 'aceptar', 'rechazar', 'completar', 'mis asignaciones'],
    contenido: `## Para que sirve
Cualquier funcionario del hospital puede **pedir un mantenimiento sin tener cuenta**, desde el formulario publico. El equipo tecnico lo gestiona como orden de trabajo con notificaciones por correo en cada paso.

## Flujo completo
1. **Solicitante** ingresa a **/solicitud/nueva** (sin login), describe el problema y deja su correo.
2. El sistema genera un **folio** y envia correo de recepcion con un **link de seguimiento** (folio + token).
3. Un COORDINATOR revisa la **bandeja de solicitudes** y: **acepta** (pasa a gestion), **rechaza** (con motivo) o **responde** pidiendo mas informacion.
4. Al aceptarla, **asigna un encargado**: el tecnico recibe correo con la orden y esta aparece en su vista **"Mis asignaciones"**.
5. El encargado ejecuta y marca la orden **completada** (con observaciones).
6. El solicitante recibe correo de completado y puede **cerrar** la solicitud (o el sistema la cierra).
7. Todo el historial queda en la solicitud (con su registro de correos enviados).

> Si el correctivo requiere registro formal de mantenimiento, crealo desde **Mantenimiento > nuevo** y vincula el activo; la solicitud queda como su origen.`,
  },

  // ------------------------------------------------------- Preguntas y pautas
  {
    id: 'preguntas-pautas',
    categoria: 'Preguntas y pautas',
    titulo: 'Preguntas de mantenimiento (crear pautas)',
    palabras: ['preguntas', 'pauta', 'checklist', 'clasificacion', 'crear preguntas', 'importar preguntas', 'activar'],
    contenido: `## Que son
Las **preguntas** forman el checklist que se le aplica a cada activo al registrar un mantenimiento. Se agrupan por **clasificacion de equipo** (ej: "Monitor de signos", "Caldera", "Ascensor") y por **dominio**.

## Crear una pauta (paso a paso)
1. Entra a **Preguntas Mantenimiento** (menu de configuracion, rol ADMIN).
2. Crea o elige una **clasificacion** dentro del dominio correspondiente.
3. Agrega preguntas: texto de la pregunta, **tipo de respuesta** y si es obligatoria.
4. Marca la pregunta como **activa** para que aparezca en la pauta.
5. Asocia la clasificacion a tus activos: al crear/editar un equipo, o asignando la **pauta** directamente en el inventario.
6. Verificacion rapida: abre **Mantenimiento > nuevo**, busca un activo de esa clasificacion y confirma que el checklist cargue completo.

## Importar preguntas
Hay **importacion masiva de preguntas** en formato JSON/Excel desde la misma pagina: util para replicar pautas estandar entre establecimientos.

> Consejo para acreditacion: incluye preguntas de **operacion segura** y referencias al estandar (campo de referencia de acreditacion) cuando corresponda (EQ-2, EQ-3, INS-3).`,
  },

  // ------------------------------------------------------------ Proveedores
  {
    id: 'proveedores-licitaciones',
    categoria: 'Proveedores',
    titulo: 'Proveedores, licitaciones y convenios',
    palabras: ['proveedores', 'licitacion', 'convenio', 'extension', 'prorroga', 'vencimiento', 'equipos asociados', 'cruce'],
    contenido: `## Proveedores
Menu **Proveedores** (ADMIN): registro de proveedores con RUT, datos de contacto y **historial de cambios**. A cada proveedor le puedes asociar sus **licitaciones/convenios**.

## Licitaciones (convenios de mantencion)
1. Crea la licitacion con **numero**, **inventario destino** (que inventario cubre), **fecha de inicio** y **fecha de termino**.
2. **Asocia equipos**: dentro de la licitacion, carga o vincula los equipos que cubre (incluye carga por Excel). El sistema cruza los convenios con los inventarios para saber que activos estan cubiertos por que proveedor.
3. **Extensiones/prorrogas**: agrega extensiones con nueva fecha de termino; el **estado** se calcula solo: Vigente, Extendida o **Vencida** (considera la fecha efectiva con extensiones).
4. Todo cambio queda en el **historial** de la licitacion.

## Donde se ve el cruce
- En cada activo del inventario puedes ver su **convenio asociado** (proveedor y vigencia).
- El panel de **KPIs** incluye licitaciones vigentes, vencidas y por vencer (60 dias).
- Las **alertas de vencimiento** incluyen licitaciones por vencer (ver seccion Alertas).`,
  },

  // --------------------------------------------------------- Reportes y KPIs
  {
    id: 'reporte-imprimible',
    categoria: 'Reportes y KPIs',
    titulo: 'Reporte semanal/mensual imprimible para tecnicos',
    palabras: ['reporte', 'imprimir', 'imprimible', 'semana', 'mensual', 'tecnico', 'papel', 'agenda', 'orden del dia'],
    contenido: `## Para que sirve
Entregar a los tecnicos, **en papel**, la lista de mantenimientos de la semana o del mes, agrupada para que cada uno sepa que le toca.

## Como generar e imprimir (paso a paso)
1. Menu **Mantenimiento > Reporte Semanal**.
2. Elige el **periodo**: "Esta semana", "Este mes" o un **rango personalizado**.
3. Filtra por **dominio** si quieres separar por especialidad (ej: solo equipos medicos).
4. Elige la **agrupacion**: por servicio, por ubicacion o por dominio.
5. Pulsa **Imprimir**: se abre el dialogo de impresion del navegador. Elige impresora o "Guardar como PDF".
6. En el papel, cada item trae **casilla de realizado, linea de observaciones y linea de firma** del tecnico.

## Consejos
- Los items marcados **VENCIDO** (fecha ya pasada) se distinguen en texto para priorizarlos.
- Imprime una copia por servicio y pegala en la pizarra del taller.
- El encabezado del reporte indica periodo, fecha de emision y quien lo genero (trazabilidad).`,
  },
  {
    id: 'kpis-acreditacion',
    categoria: 'Reportes y KPIs',
    titulo: 'KPIs de acreditacion y evidencia (EQ/INS)',
    palabras: ['kpi', 'indicadores', 'acreditacion', 'eq-2', 'ins-3', 'umbral', 'evidencia', 'exportar evidencia', 'auditor'],
    contenido: `## Donde
Dashboard **Mantenimiento > Cumplimiento**, seccion **"Indicadores de Acreditacion (EQ/INS)"**.

## Que miden
- **K2 · EQ-2 criticos**: % de equipos medicos criticos (C) al dia. **Umbral 100%**: es el estandar duro.
- **K3 · EQ-2 apoyo**: % de equipos medicos de apoyo (A) al dia. Umbral >= 50%.
- **K4 · INS-3 infraestructura**: % de activos de infraestructura al dia.
- **K5 industrial**, **K1 cumplimiento global**, **K6 vencidos**, **K7 proximos 30 dias**, **K8 sin datos**, **K9 licitaciones**.

## Semaforo
- **Verde (CUMPLE)**: alcanzaste el umbral.
- **Amarillo (RIESGO)**: cerca pero no seguro.
- **Rojo (NO CUMPLE)**: accion correctiva. Para K2, cualquier equipo critico fuera de "al dia" es rojo, y la tarjeta te deja ver cuales.

## Evidencia para el auditor
1. Pulsa **"Exportar evidencia"**.
2. Descarga un Excel con dos hojas: **KPIs** del periodo y **detalle de equipos criticos incumplidos**.
3. Guardalo (con fecha) en la carpeta de acreditacion junto a los informes de mantencion de cada activo.`,
  },
  {
    id: 'exportaciones-excel',
    categoria: 'Reportes y KPIs',
    titulo: 'Exportaciones a Excel (historial de mantenimientos)',
    palabras: ['excel', 'exportar', 'historial', 'mantenimientos', 'filtros', 'descargar', 'gantt', 'carga mensual'],
    contenido: `## Historial de mantenimientos
Desde **Mantenimiento**, el boton de **exportacion** abre un modal con filtros: **dominio, fecha desde/hasta, identificador o ID de pauta**. Descarga un Excel con todos los registros que cumplen el filtro.

## Otros botones de exportacion
- Cada **inventario**: exporta sus activos (ver seccion "Importar y exportar inventarios").
- **Cumplimiento**: "Descargar Reporte" (top criticos + proximos + resumen por dominio) y "Exportar regularizaciones".
- **Cumplimiento > Exportar evidencia**: KPIs de acreditacion + criticos incumplidos.
- **Carta Gantt** (Mantenimiento > Carta Gantt): linea de tiempo de proximos mantenimientos por activo y carga por mes; ayuda a detectar periodos sobrecargados y redistribuir.`,
  },

  // ---------------------------------------------------------------- Alertas
  {
    id: 'alertas-vencimientos',
    categoria: 'Alertas',
    titulo: 'Alertas de vencimiento (mantenimientos y licitaciones)',
    palabras: ['alertas', 'vencimiento', 'correo', 'notificacion', 'cron', 'diario', 'licitacion vencida', 'modo prueba'],
    contenido: `## Que vigilan
- **Mantenimientos vencidos** (proxima fecha esperada ya pasada) y **proximos** (ventana de 7 dias por defecto).
- **Licitaciones por vencer** (ventana de 30 dias por defecto) y **vencidas**.

## Panel (Mantenimiento > Alertas Vencimientos, COORDINATOR+)
Ves 4 tablas con todo lo detectado, en vivo, sin esperar el correo.

## Correo diario automatico
Si el administrador activo el planificador (**ASISTENTE_CRON... ver abajo), todos los dias a la hora configurada (08:00 Chile por defecto) llega un **correo resumen** a los usuarios nivel 3+ con las 4 secciones. Nunca llega mas de un correo por dia y por persona (idempotencia).

## Botones para ADMIN
- **Modo prueba**: muestra exactamente que se enviaria (destinatarios, asunto, totales) **sin enviar nada**. Usalo para validar la configuracion.
- **Enviar ahora**: dispara el envio respetando la idempotencia del dia.

> Para el administrador: las alertas se activan con las variables de entorno ALERTAS_CRON_ENABLED=true, ALERTAS_CRON_HORA, ALERTAS_MANTENIMIENTO_DIAS y ALERTAS_LICITACION_DIAS (ver .env.example). Requiere el servidor de correo (Brevo) configurado.`,
  },

  // ---------------------------------------------------------- Administracion
  {
    id: 'usuarios',
    categoria: 'Administracion',
    titulo: 'Gestion de usuarios (crear, roles, desactivar)',
    palabras: ['usuarios', 'gestion usuarios', 'crear usuario', 'rol', 'access level', 'desactivar', 'cambiar nivel'],
    contenido: `## Donde
Menu de configuracion > **Gestion Usuarios** (solo ADMIN / SUPER_ADMIN).

## Crear un usuario
1. Boton **nuevo usuario**: nombre, correo, usuario y contraseña inicial.
2. Asigna el **nivel de acceso** (1 Viewer a 5 Super Admin) segun su funcion.
3. Guarda: la persona ya puede iniciar sesion con esas credenciales.

## Cambiar rol o desactivar
- **Cambiar nivel**: edita el usuario y ajusta su nivel; aplica en el proximo inicio de accion y en la navegacion.
- Buscador de usuarios para encontrarlos rapido por nombre o correo.
- Las acciones sensibles (crear, cambiar nivel) quedan registradas.

> Buenas practicas: minimos privilegios (tecnicos = OPERATOR, jefe de turno = COORDINATOR, jefatura = ADMIN). Nunca repartas la cuenta de administrador entre varias personas.`,
  },
  {
    id: 'encargados',
    categoria: 'Administracion',
    titulo: 'Encargados de mantenimiento (equipo tecnico)',
    palabras: ['encargados', 'equipo tecnico', 'tecnico', 'especialidad', 'asignacion', 'crear cuenta'],
    contenido: `## Que son
El **CRUD del equipo tecnico interno o externo**: personas a las que se les puede **asignar solicitudes**. Un encargado puede ser distinto de un usuario del sistema; si ademas necesita entrar a la plataforma, se le crea cuenta automaticamente.

## Crear un encargado (ADMIN)
1. Menu de configuracion > **Encargados**.
2. Datos: nombre, correo, **especialidades** (ej: equipos medicos, refrigeracion) y **dominios** en que trabaja.
3. Si marcas que necesita acceso, el sistema **crea su cuenta Parse** automaticamente con rol OPERATOR.
4. Ese encargado ya aparece en el selector de **asignacion de solicitudes** y verá sus ordenes en **"Mis asignaciones"**.

## Buen uso
- Mantén especialidades al dia: la asignacion sugerida depende de eso.
- Cuando alguien deja el establecimiento, desactiva su cuenta y reasigna sus ordenes pendientes.`,
  },
  {
    id: 'diagnostico-correo',
    categoria: 'Administracion',
    titulo: 'Diagnostico de correo (Brevo SMTP)',
    palabras: ['correo', 'email', 'brevo', 'smtp', 'diagnostico', 'prueba', 'no llegan correos', 'plantillas'],
    contenido: `## Cuando usarlo
Si las **notificaciones por correo** no llegan (solicitudes, asignaciones, alertas), el modulo de configuracion > **Diagnostico Correo** (ADMIN) permite verificarlo en vivo.

## Que hace
1. **Estado de configuracion**: muestra servidor, puerto y usuario (enmascarado) y si la contraseña esta definida. Nunca muestra la contraseña.
2. **Enviar correo de prueba**: escribe un destinatario y envia un correo de verificacion al instante.

## Problemas tipicos
- **No llega nada**: verifica que el dominio del remitente este verificado en Brevo (SPF/DKIM) y revisa spam.
- **Error de variables**: cada variable BREVO_* debe ir en su propia linea del .env, sin comillas ni espacios extra. Tras corregir, reinicia el backend (Coordinador opcion 3 o 6).
- Cada envio (exitoso o fallido) queda registrado en la clase **NotificacionCorreo** con su messageId para rastreo.`,
  },

  // -------------------------------------------------------------- Despliegue
  {
    id: 'despliegue-coordinador',
    categoria: 'Despliegue',
    titulo: 'Despliegue con el Coordinador y credenciales',
    palabras: ['coordinador', 'despliegue', 'docker', 'levantar', 'rebuild', 'reset', 'logs', 'credenciales', 'env', 'backup'],
    contenido: `## El Coordinador
Todo el sistema se administra con **scripts/coordinador.py** (requiere Python 3 y Docker Desktop): es un menu que controla MongoDB, backend, frontend, Mongo Express y Nginx.

## Opciones que usaras a diario
- **1 · Rebuild completo**: despliegue inicial o despues de cambios mayores (construye sin cache).
- **2 · Actualizar sin rebuild** y **3 · Reiniciar servicios**.
- **r · Rescate rapido**: levanta servicios en orden de dependencia si algo quedo caido.
- **8 · Estado** y **9 · Logs** en tiempo real (por servicio).
- **10/11 · Parar/Levantar** todo. **14 · Cargar establecimientos** desde Excel.

## Zonas de riesgo
- **12 · Reset total** **borra la base de datos completa** (pide escribir confirmacion). Usalo solo en desarrollo.
- **13 · Limpieza Docker** (prune): libera espacio; no toca los volumenes de datos sin confirmacion.

## Credenciales (importante)
Antes del primer arranque: copia .env.example a .env y **reemplaza TODO lo que dice CAMBIAR_ESTO_*** por claves propias y fuertes. El backend **se niega a iniciar** con credenciales por defecto (validacion de arranque). Si las credenciales se filtraron alguna vez, **rotalas**: cambiar el .env no borra el pasado.`,
  },
  {
    id: 'respaldo-datos',
    categoria: 'Despliegue',
    titulo: 'Respaldos y cuidado de los datos',
    palabras: ['backup', 'respaldo', 'datos', 'volumen', 'mongo', 'restaurar', 'perder datos'],
    contenido: `## Donde viven los datos
En el **volumen Docker de MongoDB**. Parar contenedores (opcion 10) **no** borra datos; el **Reset total (opcion 12)** si los borra: pide confirmacion escrita a proposito.

## Recomendaciones
1. Programa respaldos periodicos del volumen de MongoDB (mongodump) fuera del servidor.
2. Antes de un reset o una importacion masiva, **haz respaldo**.
3. Los archivos adjuntos (actas, informes) se guardan en el volumen del backend: incluyelo en el respaldo.
4. Si algo queda inconsistente despues de una caida: usa **Reconciliar huerfanos** (ADMIN, inventarios) y **Sincronizar todos** (cumplimiento).`,
  },

  // --------------------------------------------------------- Ayuda (modulo)
  {
    id: 'como-usar-ayuda',
    categoria: 'Inicio',
    titulo: 'Como usar esta ayuda (buscador y asistente)',
    palabras: ['ayuda', 'buscador', 'asistente', 'ia', 'manual', 'buscar', 'preguntar'],
    contenido: `## Buscador
Escribe en el cuadro de busqueda de la izquierda: el listado filtra al instante por titulo, palabras clave y contenido. Clic en una seccion para leerla. No necesitas conexion a ninguna IA: el buscador funciona siempre.

## Asistente (cuadro derecho)
1. Escribe tu pregunta en lenguaje natural (ej: "como doy de baja un equipo", "que significa estado critico").
2. El sistema envia al servidor de IA local (instalado en la red del establecimiento) **solo el fragmento del manual** relevante a tu pregunta.
3. La respuesta cita la **seccion del manual** que uso. Si no encuentra la respuesta, te lo dira en vez de inventar.

## Privacidad y seguridad
- El asistente usa un **modelo local**: el contenido del manual y tu pregunta **no salen a internet**.
- La comunicacion backend-servidor IA viaja con **token, firma HMAC y cifrado AES-256-GCM**; tus credenciales de la plataforma nunca viajan al asistente.
- Si el servidor de IA no esta disponible, el modulo te lo indica y puedes seguir usando el buscador.`,
  },
];

/** Busca secciones por texto: puntua titulo (x3), palabras clave (x2) y contenido. */
export function buscarSecciones(texto: string, maximo = 6): { seccion: SeccionGuia; puntaje: number }[] {
  const normaliza = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').trim();
  const terminos = normaliza(texto).split(/\s+/).filter((t) => t.length >= 2);
  if (terminos.length === 0) return [];
  const resultados: { seccion: SeccionGuia; puntaje: number }[] = [];
  for (const seccion of GUIA_USUARIO) {
    const titulo = normaliza(seccion.titulo);
    const contenido = normaliza(seccion.contenido);
    const palabras = seccion.palabras.map(normaliza).join(' ');
    let puntaje = 0;
    for (const t of terminos) {
      if (titulo.includes(t)) puntaje += 3;
      if (palabras.includes(t)) puntaje += 2;
      if (contenido.includes(t)) puntaje += 1;
    }
    if (puntaje > 0) resultados.push({ seccion, puntaje });
  }
  return resultados.sort((a, b) => b.puntaje - a.puntaje).slice(0, maximo);
}
