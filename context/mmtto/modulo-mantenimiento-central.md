Modulo de Mantenimiento Central — diseño y documentacion

Resumen

Modulo centralizado para registrar, ejecutar y validar mantenimientos (preventivos, correctivos y predictivos) sobre cualquiera de los 4 inventarios del sistema: Equipos Medicos, Equipos Industriales, Flota Vehicular e Infraestructura. El proceso se ejecuta en etapas tipo wizard: seleccion del dominio, busqueda del activo, seleccion de pauta de mantenimiento, ejecucion del checklist de preguntas, registro fotografico, firma del tecnico y envio a validacion. El administrador o coordinador revisa, aprueba o rechaza desde una bandeja centralizada. Se genera PDF del informe completo.

**Pauta asignada (pautaAsignada)**: Cada item del inventario puede tener una pauta de mantenimiento pre-asignada por el coordinador desde el formulario de edicion del inventario. Cuando el tecnico inicia un mantenimiento sobre un activo con pauta pre-asignada, el wizard salta automaticamente al checklist. Si no tiene pauta o desea usar otra, el tecnico selecciona manualmente entre las pautas disponibles.

Ruta principal: `/admin/mantenimiento`
Parse Class principal: `RegistroMantenimiento`
Historial: `MantenimientoHistorial`

Este documento describe el diseño completo en 7 pasos. No incluye codigo.

---

PASO 1 — Seleccion del dominio y activo

### Objetivo
El tecnico selecciona sobre que tipo de activo va a realizar el mantenimiento y lo identifica.

### Flujo

1. **Seleccion de dominio**: 4 cards grandes con icono, color y conteo de activos:
   - Equipos Medicos (azul, MdMedicalServices) → busca en `InventarioEquipoMedico`
   - Equipos Industriales (naranja, MdPrecisionManufacturing) → busca en `InventarioEquipoIndustrial`
   - Flota Vehicular (morado, MdDirectionsCar) → busca en `InventarioFlotaVehicular`
   - Infraestructura (verde, MdBusiness) → busca en `InventarioInfraestructura`

2. **Busqueda del activo**: campo de busqueda normalizado (igual que en cada modulo de inventario). Segun el dominio seleccionado:

   | Dominio | Campos de busqueda | Identificador visible |
   |---------|-------------------|----------------------|
   | Equipos Medicos | inventario, serie, nombreEquipo | N° Serie + N° Inventario |
   | Equipos Industriales | inventario, serie, nombreEquipo | N° Serie + N° Inventario |
   | Flota Vehicular | patente, numeroInterno, nombreVehiculo, vin | Patente + N° Interno |
   | Infraestructura | codigoInterno, componente, descripcion | Codigo Interno + Componente |

3. **Seleccion del activo**: resultados en lista. Al seleccionar uno se muestra una card resumen con los datos principales del activo (nombre, identificadores, estado, ubicacion/servicio, ultimo mantenimiento registrado).

4. **Seleccion de tipo de mantenimiento**: Preventivo, Correctivo o Predictivo.

5. **Determinacion de la pauta de mantenimiento**: Al presionar "Siguiente", el sistema consulta las clasificaciones (pautas) disponibles que tienen preguntas configuradas para la combinacion dominio + tipo de mantenimiento seleccionados, usando la cloud function `getClasificacionesConPreguntas`.

   **Logica de auto-seleccion (pautaAsignada)**:
   - Si el activo tiene un campo `pautaAsignada` definido (asignado previamente por el coordinador desde el inventario), y este valor coincide exactamente con una de las clasificaciones disponibles, el wizard salta automaticamente al checklist (Paso 2).
   - Si el activo NO tiene pauta asignada, o la pauta no coincide con ninguna clasificacion disponible, se muestra la **etapa de seleccion de pauta** (Paso 1b) donde el tecnico ve todas las clasificaciones disponibles con la cantidad de preguntas de cada una y selecciona manualmente.
   - El tecnico siempre puede volver atras y cambiar la pauta, incluso si fue auto-seleccionada.

   **Clasificaciones disponibles**: Se obtienen de `PreguntaMantenimiento` agrupando por `clasificacionEquipo` donde `dominio` y `tipoMantenimiento` coinciden y `activo = true`. Cada clasificacion muestra: nombre, cantidad de preguntas, categorias.

   | Dominio | Ejemplos de clasificaciones/pautas |
   |---------|------------------------------------|
   | Equipos Medicos | "Monitor de Signos Vitales", "Ecografo", "Ventilador Mecanico" |
   | Equipos Industriales | "Caldera", "Generador Electrico", "Ascensor" |
   | Flota Vehicular | "Ambulancia", "Camioneta", "Furgon" |
   | Infraestructura | "Electrico", "Proteccion Incendios", "Gases Clinicos" |

### Datos que se fijan en este paso
- `dominio`: equipoMedico | equipoIndustrial | flotaVehicular | infraestructura
- `activoId`: ID del objeto Parse del activo seleccionado
- `activoClase`: nombre de la Parse Class (ej: InventarioEquipoMedico)
- `activoResumen`: snapshot de datos clave del activo (nombre, serie/patente, estado)
- `clasificacionEquipo`: valor extraido del activo que mapea a las preguntas (ej: "Ambulancia", "Caldera", "Monitor de signos vitales")
- `tipoMantenimiento`: preventivo | correctivo | predictivo
- `fecha`: fecha del mantenimiento (default: hoy, editable)
- `tecnicoId`: userId del usuario que inicia el mantenimiento
- `tecnicoNombre`: displayName del tecnico

### Acceso
- OPERATOR (2) o superior puede iniciar un mantenimiento

---

PASO 2 — Ejecucion del checklist de preguntas

### Objetivo
El tecnico responde las preguntas de mantenimiento configuradas para el dominio, tipo y clasificacion del activo seleccionado.

### Carga de preguntas — la triada dominio + tipo + clasificacion

Las preguntas se cargan de `PreguntaMantenimiento` con filtros **obligatorios**:
- `dominio` = dominio seleccionado en Paso 1
- `tipoMantenimiento` = tipo seleccionado en Paso 1
- `clasificacionEquipo` = clasificacion extraida del activo seleccionado en Paso 1
- `activo` = true

Esta triada (dominio + tipo + clasificacion) es la que define **que formulario de preguntas ve el tecnico**. No es un formulario generico: es especifico para cada combinacion.

**Ejemplo concreto:**

```
Activo seleccionado: Ambulancia SAMU (Flota Vehicular, tipoVehiculo="Ambulancia")
Tipo mantenimiento: Preventivo

→ Se busca: PreguntaMantenimiento WHERE
    dominio = "flotaVehicular"
    tipoMantenimiento = "preventivo"
    clasificacionEquipo = "Ambulancia"
    activo = true

→ Resultado: preguntas como "Revision de luces", "Estado de neumaticos", 
   "Funcionamiento de sirena", agrupadas por categoria
```

```
Activo seleccionado: Monitor de signos vitales INV-002 (Equipo Medico)
Tipo mantenimiento: Preventivo

→ Se busca: PreguntaMantenimiento WHERE
    dominio = "equipoMedico"
    tipoMantenimiento = "preventivo"
    clasificacionEquipo = "Monitor de signos vitales"
    activo = true

→ Resultado: preguntas como "Revision de modulo de oximetria", 
   "Verificacion de alarmas", "Calibracion de sensores"
```

Las preguntas se agrupan por `categoria` para mostrarlas en secciones dentro del formulario.

### Estructura del checklist

Cada item del checklist contiene:
```
{
  preguntaId: string         // ID de la pregunta original
  pregunta: string           // Texto de la pregunta
  categoria: string          // Categoria para agrupacion
  tipoRespuesta: string      // siNo | escala | texto | seleccion
  opcionesRespuesta: string[] // Opciones si tipo = seleccion
  respuesta: any             // Valor respondido por el tecnico
  estado: string             // Bueno | Regular | Malo | N/A
  observaciones: string      // Observaciones del tecnico
  foto: { file, url, nombre } | null  // Foto adjunta (si requiereFoto)
  esCritica: boolean         // Heredado de la pregunta
  requiereFoto: boolean      // Heredado de la pregunta
  requiereObservacion: boolean // Heredado de la pregunta
  referenciaAcreditacion: string // Heredado de la pregunta
}
```

### Interfaz del checklist

- Preguntas agrupadas por categoria con header de seccion
- Cada pregunta muestra:
  - Texto de la pregunta (con icono de advertencia si `esCritica`)
  - Selector de estado: Bueno (verde), Regular (amarillo), Malo (rojo), N/A (gris)
  - Segun `tipoRespuesta`:
    - `siNo`: toggle Si/No
    - `escala`: slider o input numerico 1-10
    - `texto`: textarea
    - `seleccion`: radio buttons con las opciones
  - Campo de observaciones (obligatorio si `requiereObservacion`)
  - Boton de camara/foto (obligatorio si `requiereFoto`, opcional siempre)
  - Badge de referencia de acreditacion si existe

- Validacion al avanzar:
  - Todas las preguntas deben tener estado seleccionado
  - Si `requiereFoto`: debe tener foto adjunta
  - Si `requiereObservacion`: debe tener texto
  - Items con error se resaltan en rojo

- Navegacion por pasos si hay muchas preguntas (ej: 5 preguntas por paso)

### Fotos del checklist
- Se capturan via input type="file" con accept="image/*" (permite camara en moviles)
- Preview en miniatura junto a la pregunta
- Maximo 5MB por foto
- Se suben a Parse.File al guardar el mantenimiento

---

PASO 3 — Evidencia fotografica adicional

### Objetivo
Registrar fotos adicionales que no corresponden a preguntas especificas, organizadas por categoria.

### Categorias de fotos
Dependen del dominio:

| Dominio | Categorias sugeridas |
|---------|---------------------|
| Equipos Medicos | Estado general, Placa de identificacion, Accesorios, Otros |
| Equipos Industriales | Estado general, Placa de datos, Componentes, Otros |
| Flota Vehicular | Exterior, Interior, Motor, Neumaticos, Documentos, Otros |
| Infraestructura | Estado general, Detalle de dano, Senaletica, Otros |

### Interfaz
- Grid de categorias, cada una con:
  - Titulo de la categoria
  - Boton "Agregar foto" (input file image/*)
  - Galeria de miniaturas con boton eliminar
- Maximo 5MB por foto, se previsualizan con URL.createObjectURL()
- Las fotos se suben a Parse.File al guardar

---

PASO 4 — Observaciones generales y firma

### Objetivo
El tecnico completa observaciones finales y firma digitalmente el registro.

### Campos de este paso

- **Observaciones generales** (textarea): resumen libre del tecnico sobre el mantenimiento realizado
- **Proximo mantenimiento** (date input): fecha sugerida para el proximo mantenimiento
- **Firma del tecnico**: componente SignaturePad (canvas HTML5)

### SignaturePad
Componente de firma digital:
- Canvas HTML5 donde el tecnico dibuja su firma con mouse o tactil
- Botones: Limpiar, Guardar firma
- Al guardar: convierte canvas a imagen base64 (PNG)
- La imagen se sube a Parse.File
- Obligatorio: no se puede enviar sin firma

### Validacion final antes de enviar
- Fecha presente
- Tecnico identificado
- Checklist completo (todas las preguntas con estado)
- Items criticos con foto/observacion si requeridos
- Firma capturada
- Confirmacion SweetAlert2: "Se enviara el mantenimiento para validacion. Desea continuar?"

### Datos que se guardan en `RegistroMantenimiento`

```
{
  // Identificacion
  dominio: string
  tipoMantenimiento: string
  activoId: string
  activoClase: string
  activoResumen: object    // snapshot del activo al momento del mantenimiento

  // Ejecucion
  fecha: string
  checklist: { items: [...] }  // Array completo de respuestas
  fotosAdicionales: { categoria1: [urls], categoria2: [urls] }
  observacionesGenerales: string
  proximoMantenimiento: string

  // Responsables
  tecnicoId: string
  tecnicoNombre: string
  firmaTecnico: string     // URL de la imagen de firma en Parse.File

  // Validacion (se llena despues)
  estadoValidacion: string  // pendiente | aprobado | rechazado
  validadorId: string
  validadorNombre: string
  firmaValidador: string    // URL de firma del validador
  fechaValidacion: string
  motivoRechazo: string     // Si fue rechazado

  // Archivos adicionales
  archivos: ArchivoAdjunto[]

  // Metadata
  creadoPor: string
  activo: boolean
}
```

---

PASO 5 — Bandeja de validacion (Administrador)

### Objetivo
El coordinador o administrador revisa los mantenimientos realizados, los aprueba con su firma o los rechaza con motivo.

### Ruta
`/admin/mantenimiento/bandeja`

### Acceso
- COORDINATOR (3) o superior para ver la bandeja
- ADMIN (4) o superior para aprobar/rechazar

### Vista de la bandeja

**Filtros:**
- Estado: Pendientes (default), Aprobados, Rechazados, Todos
- Dominio: Todos, Equipos Medicos, Equipos Industriales, Flota Vehicular, Infraestructura
- Tipo mantenimiento: Todos, Preventivo, Correctivo, Predictivo
- Fecha desde / hasta
- Busqueda por tecnico o activo

**Tabla:**
- Columnas: Fecha, Activo (nombre + identificador), Dominio (badge), Tipo (badge), Tecnico, Estado Validacion (badge: pendiente amarillo, aprobado verde, rechazado rojo), Acciones
- Acciones: Ver detalle, Aprobar (si pendiente), Rechazar (si pendiente)

**Contadores:**
- Cards resumen: Total registros, Pendientes de validacion, Aprobados, Rechazados

### Flujo de aprobacion

1. Administrador hace clic en "Ver detalle" de un registro pendiente
2. Se abre el modal o pagina de detalle completo (ver Paso 6)
3. Revisa checklist, fotos, observaciones, firma del tecnico
4. Dos opciones:
   - **Aprobar**: se abre SignaturePad para que el validador firme → se guarda `estadoValidacion: 'aprobado'`, `validadorId`, `validadorNombre`, `firmaValidador`, `fechaValidacion`
   - **Rechazar**: se abre modal con campo de texto obligatorio "Motivo del rechazo" → se guarda `estadoValidacion: 'rechazado'`, `motivoRechazo`, `validadorId`, `validadorNombre`, `fechaValidacion`

### Flujo de rechazo y re-ejecucion

Cuando un mantenimiento es rechazado:
1. El registro original queda con `estadoValidacion: 'rechazado'` y el motivo — no se borra
2. El tecnico original ve en su lista de mantenimientos el estado "Rechazado" con el motivo
3. El tecnico puede iniciar un nuevo mantenimiento sobre el mismo activo
4. El nuevo registro es independiente pero referencia al anterior via campo `registroAnteriorId`
5. Ambos registros quedan en el historial — trazabilidad completa

### Notificacion visual
- Badge con numero de pendientes en el icono del sidebar
- La bandeja muestra primero los pendientes ordenados por fecha ascendente (mas antiguos primero)

---

PASO 6 — Detalle, PDF e historial

### Objetivo
Visualizar el registro completo de un mantenimiento, generar PDF para impresion/archivo, y consultar el historial.

### Vista de detalle

Pagina o modal con secciones:

**Seccion 1 — Encabezado**
- Estado de validacion (badge grande: Pendiente/Aprobado/Rechazado)
- Si rechazado: banner rojo con motivo
- Datos del activo (resumen)
- Datos del mantenimiento (fecha, tipo, dominio)

**Seccion 2 — Informacion del activo**
- Card con datos clave del activo al momento del mantenimiento (snapshot guardado)
- Link "Ver activo actual" que navega al inventario correspondiente

**Seccion 3 — Checklist de respuestas**
- Tabla/grid con todas las preguntas respondidas:
  - Pregunta | Estado (badge color) | Respuesta | Observaciones | Foto (thumbnail clickeable)
- Estadisticas resumen: total preguntas, buenos, regulares, malos
- Items criticos resaltados

**Seccion 4 — Fotos adicionales**
- Galeria organizada por categoria
- Click para ampliar

**Seccion 5 — Observaciones y proximo mantenimiento**
- Texto de observaciones generales
- Fecha proximo mantenimiento

**Seccion 6 — Firmas y validacion**
- Firma del tecnico (imagen)
- Nombre del tecnico, fecha de ejecucion
- Si aprobado: firma del validador (imagen), nombre, fecha de validacion
- Si rechazado: motivo, nombre del validador, fecha

**Seccion 7 — Archivos adjuntos**
- Lista de archivos adicionales (mismo patron que los otros modulos)

### Generacion de PDF

Se genera con `@react-pdf/renderer`. El PDF incluye:

1. **Header**: logo/titulo del establecimiento, "INFORME DE MANTENIMIENTO [TIPO]", fecha de generacion
2. **Informacion del activo**: nombre, identificadores, estado
3. **Informacion del mantenimiento**: fecha, tecnico, tipo, dominio
4. **Checklist**: tabla con pregunta, estado (con color), observaciones. Items criticos marcados
5. **Estadisticas**: conteo de Bueno/Regular/Malo
6. **Observaciones generales**
7. **Fotos**: thumbnails de evidencia (checklist + adicionales)
8. **Firmas**: imagen de firma del tecnico + imagen de firma del validador (si aprobado)
9. **Pie de pagina**: estado de validacion, fecha validacion, generado por

Boton "Descargar PDF" disponible en el detalle. Solo se puede generar si el registro esta aprobado O si el usuario es ADMIN+.

### Historial del mantenimiento

Coleccion `MantenimientoHistorial` registra:
- Creacion del registro
- Envio a validacion
- Aprobacion (quien, cuando)
- Rechazo (quien, cuando, motivo)
- Adjuntar archivo
- Eliminar archivo
- Cualquier modificacion posterior

Mismo patron de timeline que los modulos de inventario.

---

Modelo de datos completo

### RegistroMantenimiento (Parse Class)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| dominio | String | equipoMedico, equipoIndustrial, flotaVehicular, infraestructura |
| tipoMantenimiento | String | preventivo, correctivo, predictivo |
| clasificacionEquipo | String | Clasificacion extraida del activo (ej: "Ambulancia", "Caldera", "Monitor de signos vitales") |
| activoId | String | ID del activo en su coleccion |
| activoClase | String | Nombre de la Parse Class del activo |
| activoResumen | Object | Snapshot de datos clave del activo |
| fecha | String | Fecha del mantenimiento |
| checklist | Object | `{ items: [...] }` con todas las respuestas |
| fotosAdicionales | Object | `{ categoria: [{ nombre, url }] }` |
| observacionesGenerales | String | Texto libre del tecnico |
| proximoMantenimiento | String | Fecha sugerida |
| tecnicoId | String | userId del tecnico |
| tecnicoNombre | String | Nombre del tecnico |
| firmaTecnico | String | URL de imagen de firma (Parse.File) |
| estadoValidacion | String | pendiente, aprobado, rechazado |
| validadorId | String | userId del validador |
| validadorNombre | String | Nombre del validador |
| firmaValidador | String | URL de imagen de firma del validador |
| fechaValidacion | String | Fecha/hora de la validacion |
| motivoRechazo | String | Texto si fue rechazado |
| registroAnteriorId | String | ID del registro rechazado que origino este (si aplica) |
| archivos | Array | Archivos adjuntos adicionales |
| creadoPor | String | userId del creador |
| activo | Boolean | Activo/inactivo |

### MantenimientoHistorial

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| registroId | String | ID del RegistroMantenimiento |
| accion | String | creacion, envio_validacion, aprobado, rechazado, archivo_adjunto, archivo_eliminado |
| descripcion | String | Texto legible |
| usuarioId | String | Quien realizo la accion |
| usuarioNombre | String | Nombre |
| detalles | Object | Datos adicionales (motivo rechazo, etc.) |
| archivoNombre | String | Si aplica |
| archivoUrl | String | Si aplica |

Cloud Functions necesarias

| Funcion | Acceso | Descripcion |
|---------|--------|-------------|
| `getClasificacionesConPreguntas` | OPERATOR (2) | Retorna clasificaciones con preguntas activas para dominio + tipoMantenimiento. Usado para la seleccion de pauta |
| `crearRegistroMantenimiento` | OPERATOR (2) | Crea registro con checklist, fotos, firma. Estado = pendiente |
| `getRegistrosMantenimiento` | VIEWER (1) | Lista con filtros: dominio, tipo, estadoValidacion, fecha, tecnico, activo. Paginado |
| `getRegistroMantenimientoById` | VIEWER (1) | Detalle completo de un registro |
| `aprobarMantenimiento` | ADMIN (4) | Cambia estado a aprobado, guarda firma validador |
| `rechazarMantenimiento` | ADMIN (4) | Cambia estado a rechazado, guarda motivo |
| `getMantenimientoHistorial` | VIEWER (1) | Historial de un registro |
| `adjuntarArchivoMantenimiento` | OPERATOR (2) | Adjuntar archivo al registro |
| `eliminarArchivoMantenimiento` | COORDINATOR (3) | Eliminar archivo |
| `getArchivosMantenimiento` | VIEWER (1) | Listar archivos |
| `deleteRegistroMantenimiento` | SUPER_ADMIN (5) | Eliminar registro (solo super admin) |
| `getBandejaValidacion` | COORDINATOR (3) | Lista registros pendientes para el panel del validador |
| `getEstadisticasMantenimiento` | VIEWER (1) | Conteos por estado, dominio, tipo para dashboard |
| `getMantenimientosActivo` | VIEWER (1) | Todos los mantenimientos de un activo especifico |

Estructura de rutas frontend

| Ruta | Componente | Descripcion |
|------|-----------|-------------|
| `/admin/mantenimiento` | MantenimientoPage | Vista principal: dashboard + acceso rapido |
| `/admin/mantenimiento/nuevo` | MantenimientoWizard | Wizard de 5 etapas para crear mantenimiento (con seleccion de pauta) |
| `/admin/mantenimiento/bandeja` | BandejaValidacion | Bandeja para validadores |
| `/admin/mantenimiento/[id]` | MantenimientoDetalle | Detalle completo + PDF + historial |
| `/admin/mantenimiento/historial` | MantenimientoHistorialPage | Historial general con filtros |

Estructura de componentes frontend

```
src/components/admin/mantenimiento/
├── MantenimientoDomainSelector.tsx    # Paso 1: seleccion de dominio
├── MantenimientoActivoSearch.tsx      # Paso 1: busqueda y seleccion de activo
├── MantenimientoChecklist.tsx         # Paso 2: ejecucion del checklist
├── MantenimientoChecklistItem.tsx     # Paso 2: item individual del checklist
├── MantenimientoFotosAdicionales.tsx  # Paso 3: evidencia fotografica
├── MantenimientoFirmaPanel.tsx        # Paso 4: observaciones + firma
├── MantenimientoSignaturePad.tsx      # Componente reutilizable de firma digital
├── MantenimientoDetailModal.tsx       # Paso 6: detalle completo
├── MantenimientoHistorialPanel.tsx    # Timeline de historial
├── MantenimientoArchivosPanel.tsx     # Archivos adjuntos
├── MantenimientoPDF.tsx               # Generacion PDF con @react-pdf/renderer
├── BandejaValidacionTable.tsx         # Tabla de la bandeja
└── BandejaValidacionActions.tsx       # Botones aprobar/rechazar + firma validador
```

Permisos por operacion

| Operacion | accessLevel | Rol |
|-----------|------------|-----|
| Ver lista y detalle de mantenimientos | 1 | VIEWER |
| Ver historial | 1 | VIEWER |
| Ver archivos | 1 | VIEWER |
| Crear registro de mantenimiento | 2 | OPERATOR |
| Subir archivo adjunto | 2 | OPERATOR |
| Ver bandeja de validacion | 3 | COORDINATOR |
| Aprobar mantenimiento | 4 | ADMIN |
| Rechazar mantenimiento | 4 | ADMIN |
| Descargar PDF (aprobados) | 1 | VIEWER |
| Descargar PDF (pendientes) | 4 | ADMIN |
| Eliminar registro | 5 | SUPER_ADMIN |

Relacion con el Manual de Acreditacion

Este modulo genera la **evidencia directa** de cumplimiento:

| Estandar | Que evidencia genera |
|----------|---------------------|
| EQ 2.1 (100%) | Registros de mantenimiento preventivo de equipos criticos con checklist, fotos y firmas |
| EQ 2.2 (>=50%) | Registros de mantenimiento de equipos de apoyo |
| INS 1.1 (>=80%) | Registros de inspeccion/mantenimiento de sistemas contra incendio |
| INS 2.1 (>=75%) | Registros de verificacion de planes de evacuacion |
| INS 3.1 (100%) | Registros de mantenimiento preventivo de instalaciones con constancia de ejecucion |
| INS 3.2 (>=75%) | Registros de verificacion de contingencia electrica y agua |

Cada registro aprobado constituye una **constancia de ejecucion** auditable: quien lo hizo, cuando, que se verifico, que estado tenia cada componente, evidencia fotografica y firma de conformidad del tecnico y del validador.

Dependencias tecnicas adicionales

| Libreria | Uso |
|----------|-----|
| `@react-pdf/renderer` | Generacion de PDF en cliente |
| `sweetalert2` | Confirmaciones y alertas |
| `react-icons` | Iconos MdXxx |
| HTML5 Canvas | SignaturePad para firma digital |
| `Parse.File` | Almacenamiento de fotos y firmas en GridFS |

Resumen de los 6 pasos

| Paso | Nombre | Actor | Resultado |
|------|--------|-------|-----------|
| 1 | Seleccion dominio y activo | Tecnico | Activo identificado, tipo de mantenimiento definido |
| 1b | Seleccion de pauta | Tecnico | Pauta/clasificacion seleccionada (auto-skip si pautaAsignada coincide) |
| 2 | Ejecucion checklist | Tecnico | Preguntas respondidas con estado, fotos y observaciones |
| 3 | Evidencia fotografica | Tecnico | Fotos adicionales organizadas por categoria |
| 4 | Firma y envio | Tecnico | Observaciones finales, firma digital, registro creado como "pendiente" |
| 5 | Validacion | Admin/Coordinador | Registro aprobado (con firma validador) o rechazado (con motivo) |
| 6 | Detalle y PDF | Todos | Consulta del registro, generacion de PDF, historial de acciones |
