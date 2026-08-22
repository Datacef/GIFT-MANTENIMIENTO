Modulo de Preguntas de Mantenimiento — documentacion detallada

Resumen

Modulo CRUD para gestionar las preguntas del checklist de mantenimiento organizadas por dominio, tipo y clasificacion de equipo. Las preguntas son la base para las evaluaciones y rondas de mantenimiento: definen que se debe verificar, en que equipo, con que tipo de respuesta y si la pregunta es critica para la acreditacion. Permite importacion masiva desde JSON.

Ruta: `/admin/preguntas`
Acceso minimo en sidebar: COORDINATOR (accessLevel >= 3).

Archivos involucrados

### Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `src/app/admin/preguntas/page.tsx` | Pagina principal: tabs de dominio, filtros, tabla, paginacion, importar |
| `src/components/admin/preguntas/PreguntaFormModal.tsx` | Modal de creacion y edicion (14 campos) |
| `src/services/pregunta-mantenimiento.service.ts` | Servicio: todas las llamadas a Cloud Functions |
| `src/types/pregunta-mantenimiento.types.ts` | Enums, interfaces, labels y colores |

### Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `backend/cloud/main.js` (lineas ~616-1070) | 9 Cloud Functions del modulo |

### Parse Class (MongoDB)

| Clase | Uso |
|-------|-----|
| `PreguntaMantenimiento` | Cada pregunta del checklist |

Modelo de datos

### PreguntaMantenimiento

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| dominio | String (enum) | Si | Dominio de mantenimiento |
| tipoMantenimiento | String (enum) | Si | Tipo de mantenimiento |
| clasificacionEquipo | String | Si | Clasificacion libre del equipo (ej: Ventilador Mecanico, Caldera) |
| categoria | String | Si | Categoria de la pregunta (ej: Estado General, Seguridad) |
| pregunta | String | Si | Texto de la pregunta |
| descripcion | String | No | Texto de ayuda o instrucciones adicionales |
| tipoRespuesta | String (enum) | No | Tipo de respuesta esperada (default: siNo) |
| opcionesRespuesta | Array | No | Opciones si tipoRespuesta = `seleccion` |
| estadoGeneral | String (enum) | No | Estado general del equipo evaluado |
| requiereFoto | Boolean | No | Exige foto como evidencia (default: false) |
| requiereObservacion | Boolean | No | Exige observacion textual (default: false) |
| esCritica | Boolean | No | Pregunta marcada como critica (default: false) |
| orden | Number | No | Orden de presentacion (default: 0) |
| activo | Boolean | No | Activa/inactiva (default: true) |
| referenciaAcreditacion | String | No | Referencia al manual (ej: EQ-2.1, INS-3.1) |
| creadoPor | String | Auto | userId del creador (asignado por backend) |

### Enums y valores validos

**Dominio:**

| Valor | Label | Color | Icono |
|-------|-------|-------|-------|
| `equipoMedico` | Equipo Medico | Azul | MdMedicalServices |
| `equipoIndustrial` | Equipo Industrial | Naranja | MdPrecisionManufacturing |
| `infraestructura` | Infraestructura | Verde | MdBusiness |
| `flotaVehicular` | Flota Vehicular | Morado | MdDirectionsCar |

**Tipo de mantenimiento:**

| Valor | Label | Color |
|-------|-------|-------|
| `preventivo` | Preventivo | Verde |
| `correctivo` | Correctivo | Rojo |
| `predictivo` | Predictivo | Azul |

**Estado general:**

| Valor | Label | Color |
|-------|-------|-------|
| `bueno` | Bueno | Verde |
| `regular` | Regular | Amarillo |
| `malo` | Malo | Rojo |
| `baja` | Baja | Gris |

**Tipo de respuesta:**

| Valor | Label | Descripcion |
|-------|-------|-------------|
| `siNo` | Si / No | Respuesta binaria |
| `escala` | Escala | Valor numerico en rango |
| `texto` | Texto Libre | Respuesta abierta |
| `seleccion` | Seleccion | Elegir entre opciones predefinidas |

### Jerarquia de clasificacion

Las preguntas se organizan en una jerarquia de 4 niveles:

```
Dominio → Clasificacion Equipo → Categoria → Pregunta
```

Ejemplo:
```
equipoMedico → Ventilador Mecanico → Estado General → ¿El equipo enciende correctamente?
equipoMedico → Ventilador Mecanico → Seguridad → ¿Las alarmas funcionan correctamente?
infraestructura → Caldera → Mantencion → ¿Se realizo purga del sistema?
```

**Clasificacion y Categoria son campos libres**: no tienen catalogo predefinido. Los selectores se llenan con valores existentes en la base de datos (filtrados por dominio y clasificacion). El boton "Nueva" permite agregar valores nuevos. Esto permite que el sistema se adapte a cualquier establecimiento.

Cloud Functions

### CRUD principal

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `getPreguntasMantenimiento` | OPERATOR (2) | `dominio`, `tipoMantenimiento`, `clasificacionEquipo`, `categoria`, `activo`, `estadoGeneral`, `busqueda`, `limit`, `skip` | Lista con filtros y paginacion. Busqueda textual por `pregunta` y `descripcion` (OR, `contains`). Orden: dominio ASC, clasificacion ASC, categoria ASC, orden ASC |
| `getPreguntaById` | OPERATOR (2) | `id` | Obtiene pregunta por ID |
| `createPregunta` | COORDINATOR (3) | `data` | Crea pregunta. Valida dominio (4 valores), tipoMantenimiento (3 valores), tipoRespuesta (4 valores), y campos obligatorios (clasificacionEquipo, categoria, pregunta) |
| `updatePregunta` | COORDINATOR (3) | `id`, `data` | Actualiza pregunta. Solo modifica campos presentes en `data` |
| `deletePregunta` | COORDINATOR (3) | `id`, `hard` | Si `hard=true`: elimina el objeto. Si `hard=false`: marca `activo=false` (soft delete) |
| `togglePreguntaActivo` | COORDINATOR (3) | `id` | Invierte el valor de `activo`. Retorna `{ activo: boolean }` |

### Valores de filtro

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `getClasificacionesEquipo` | OPERATOR (2) | `dominio` (opcional) | Valores unicos de `clasificacionEquipo` en preguntas activas. Filtro opcional por dominio |
| `getClasificacionesConPreguntas` | OPERATOR (2) | `dominio`, `tipoMantenimiento` | Retorna clasificaciones agrupadas con cantidad de preguntas y categorias. Usado por el wizard de mantenimiento para mostrar pautas disponibles |
| `getCategoriasPreguntas` | Publico | `dominio` (opcional), `clasificacionEquipo` (opcional) | Valores unicos de `categoria` en preguntas activas. Filtros opcionales en cascada |

### Importacion masiva

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `importarPreguntas` | COORDINATOR (3) | `preguntas` (array de objetos) | Crea cada pregunta individualmente. Valida dominio y tipoMantenimiento por cada item. Retorna `{ created, errors, total }` |

Servicio frontend

`PreguntaMantenimientoService` en `services/pregunta-mantenimiento.service.ts`:

| Metodo | Cloud Function | Descripcion |
|--------|---------------|-------------|
| `getPreguntas(filters)` | `getPreguntasMantenimiento` | Lista paginada con filtros |
| `getPreguntaById(id)` | `getPreguntaById` | Una pregunta por ID |
| `createPregunta(data)` | `createPregunta` | Crear pregunta |
| `updatePregunta(id, data)` | `updatePregunta` | Actualizar pregunta |
| `deletePregunta(id, hard)` | `deletePregunta` | Eliminar (soft o hard) |
| `toggleActivo(id)` | `togglePreguntaActivo` | Alternar activo/inactivo |
| `getClasificaciones(dominio?)` | `getClasificacionesEquipo` | Valores unicos de clasificacion |
| `getCategorias(dominio?, clasificacion?)` | `getCategoriasPreguntas` | Valores unicos de categoria |
| `importarPreguntas(preguntas)` | `importarPreguntas` | Importacion masiva |

Interfaz de usuario

### Pagina principal (`/admin/preguntas`)

**Header:**
- Titulo "Preguntas de Mantenimiento"
- Boton "Importar" — carga masiva desde archivo JSON
- Boton "Nueva Pregunta" — abre modal de creacion

**Estadisticas:**
- 4 cards: Total, Activas (verde), Inactivas (gris), Criticas (rojo)

**Tabs de dominio:**
- 5 botones: Todos, Equipo Medico (azul), Equipo Industrial (naranja), Infraestructura (verde), Flota Vehicular (morado)
- Cada tab tiene icono representativo y colores distintivos
- Cambiar de tab recarga clasificaciones y categorias disponibles, y resetea los filtros de clasificacion y categoria

**Filtros:**
- 5 filtros en fila:
  - Tipo mantenimiento (Preventivo, Correctivo, Predictivo)
  - Clasificacion equipo (valores dinamicos, filtrados por dominio)
  - Categoria (valores dinamicos, filtrados por dominio + clasificacion)
  - Estado (Activas / Inactivas)
  - Busqueda textual (por texto de pregunta o descripcion)
- Filtros en cascada: cambiar dominio recarga clasificaciones; cambiar clasificacion recarga categorias
- Cambiar cualquier filtro resetea la paginacion a pagina 0

**Tabla:**
- Columnas: Pregunta (+ icono critica + badge referencia acreditacion), Dominio (badge con icono y color), Tipo Mantenimiento (badge con color), Clasificacion, Categoria, Tipo Respuesta, Estado (toggle on/off interactivo), Acciones
- Columnas responsivas: algunas se ocultan en pantallas pequenas
- Pregunta muestra icono de advertencia rojo si `esCritica = true`
- Pregunta muestra badge gris con `referenciaAcreditacion` si existe
- Estado es un toggle interactivo: click directo activa/desactiva la pregunta
- Acciones: Editar, Eliminar (ambas con confirmacion)

**Paginacion:**
- 50 registros por pagina (server-side)
- Navegacion: Anterior / pagina actual / Siguiente

### Modal de creacion/edicion (`PreguntaFormModal`)

Formulario con campos organizados:

**Dominio (obligatorio):**
- Grid de 4 botones con iconos y colores por dominio
- Cambiar dominio limpia clasificacion y categoria, y recarga opciones

**Tipo de Mantenimiento (obligatorio):**
- 3 botones: Preventivo, Correctivo, Predictivo

**Clasificacion de Equipo (obligatorio):**
- Select combo con valores existentes (filtrados por dominio seleccionado)
- Boton "Nueva" para escribir valor libre
- Boton "Seleccionar" para volver al dropdown

**Categoria (obligatorio):**
- Select combo con valores existentes (filtrados por dominio + clasificacion)
- Boton "Nueva" para escribir valor libre
- Boton "Seleccionar" para volver al dropdown

**Pregunta (obligatorio):**
- Input de texto

**Descripcion (opcional):**
- Textarea de 3 filas

**Tipo de Respuesta:**
- Select: Si/No, Escala, Texto Libre, Seleccion

**Opciones de Respuesta (condicional):**
- Solo visible cuando tipoRespuesta = `seleccion`
- Lista de opciones agregadas con boton eliminar individual
- Input + boton "Agregar" (tambien con Enter)

**Orden + Referencia Acreditacion:**
- Grid 2 columnas
- Orden: input numerico
- Referencia: texto libre (ej: EQ-2.1, INS-3.1)

**Checkboxes:**
- Requiere Foto
- Requiere Observacion
- Pregunta Critica (estilo rojo para destacar)
- Activo

**Validacion del formulario:**
- Campos obligatorios: pregunta, clasificacionEquipo, categoria (+ dominio y tipoMantenimiento que siempre tienen valor)
- Boton "Crear/Actualizar" deshabilitado si faltan campos obligatorios

### Importacion masiva

Flujo:
1. Usuario hace clic en "Importar"
2. Se abre selector de archivos (.json)
3. Frontend lee el archivo y parsea JSON
4. Valida que sea un array
5. Llama `importarPreguntas` con el array
6. Resultado: "Creadas: X, Errores: Y"
7. Recarga la tabla

Formato JSON esperado:
```json
[
  {
    "dominio": "equipoMedico",
    "tipoMantenimiento": "preventivo",
    "clasificacionEquipo": "Ventilador Mecanico",
    "categoria": "Estado General",
    "pregunta": "¿El equipo enciende correctamente?",
    "tipoRespuesta": "siNo",
    "esCritica": true,
    "referenciaAcreditacion": "EQ-2.1"
  }
]
```

Permisos por operacion

| Operacion | accessLevel minimo | Rol |
|-----------|-------------------|-----|
| Ver lista de preguntas | 2 | OPERATOR |
| Ver clasificaciones | 2 | OPERATOR |
| Ver categorias | Publico | — |
| Crear pregunta | 3 | COORDINATOR |
| Editar pregunta | 3 | COORDINATOR |
| Eliminar pregunta | 3 | COORDINATOR |
| Toggle activo/inactivo | 3 | COORDINATOR |
| Importar preguntas | 3 | COORDINATOR |

Nota: la pagina en el frontend valida accessLevel >= 3 para acceder. Los OPERATOR pueden consultar preguntas via API pero no ven la ruta en el sidebar ni pueden acceder a la pagina directamente.

Relacion con el Manual de Acreditacion

El campo `referenciaAcreditacion` vincula cada pregunta con el estandar especifico del manual:

| Dominio | Estandares relacionados | Ejemplos de preguntas |
|---------|------------------------|----------------------|
| `equipoMedico` | EQ-1.1, EQ-1.2, EQ-2.1, EQ-2.2, EQ-3.1 | ¿Tiene programa de mantencion documentado?, ¿Se conoce la vida util del equipo?, ¿Personal autorizado esta identificado? |
| `equipoIndustrial` | INS-3.1 | ¿Caldera tiene programa de mantencion?, ¿Se realizo prueba de generador de emergencia? |
| `infraestructura` | INS-1.1, INS-2.1, INS-2.2, INS-3.1, INS-3.2 | ¿Extintores estan recargados?, ¿Senaletica de evacuacion es visible?, ¿Plan de contingencia electrica esta documentado? |
| `flotaVehicular` | — | Verificaciones de ambulancias y vehiculos de emergencia |

Las preguntas con `esCritica = true` son aquellas cuyo incumplimiento afecta directamente los umbrales del manual de acreditacion (100% para EQ-2.1, >= 50% para EQ-1.2, etc.).

Flujo de datos

### Crear pregunta

```
1. Frontend: PreguntaFormModal.handleSubmit()
2. Valida: pregunta, clasificacionEquipo, categoria no vacios
3. Service: PreguntaMantenimientoService.createPregunta(formData)
4. Parse: Cloud.run('createPregunta', { data })
5. Backend: valida accessLevel >= 3
6. Backend: valida dominio en [equipoMedico, equipoIndustrial, infraestructura, flotaVehicular]
7. Backend: valida tipoMantenimiento en [preventivo, correctivo, predictivo]
8. Backend: valida tipoRespuesta en [siNo, escala, texto, seleccion]
9. Backend: crea objeto PreguntaMantenimiento en MongoDB
10. Frontend: cierra modal, recarga tabla
```

### Filtros en cascada

```
1. Usuario selecciona dominio "equipoMedico" en tabs
2. Frontend: llama getClasificacionesEquipo({ dominio: "equipoMedico" })
3. Backend: busca valores unicos de clasificacionEquipo donde dominio = equipoMedico AND activo = true
4. Frontend: llena dropdown de clasificaciones (ej: Ventilador Mecanico, Monitor, Ecografo)
5. Usuario selecciona clasificacion "Ventilador Mecanico"
6. Frontend: llama getCategoriasPreguntas({ dominio: "equipoMedico", clasificacionEquipo: "Ventilador Mecanico" })
7. Backend: busca valores unicos de categoria filtrados
8. Frontend: llena dropdown de categorias (ej: Estado General, Seguridad, Alarmas)
```

Notas tecnicas

- **Paginacion a 50**: mas alta que inventario (25) porque las preguntas son registros mas livianos y es comun necesitar ver mas a la vez.

- **Soft vs hard delete**: `deletePregunta` acepta parametro `hard`. La pagina siempre pasa `hard=true` (elimina permanentemente). El soft delete existe como opcion para el futuro pero no se usa actualmente en la UI.

- **Toggle directo en tabla**: el estado activo/inactivo se cambia con un click directo en el icono toggle de la tabla, sin confirmacion. Esto permite activar/desactivar preguntas rapidamente durante la configuracion de un checklist.

- **Sin historial de cambios**: a diferencia del modulo de inventario, las preguntas no tienen tabla de historial. Los cambios no se auditan individualmente.

- **Importacion solo JSON**: a diferencia del inventario que importa Excel, las preguntas se importan desde archivos JSON. Esto es porque las preguntas tienen campos anidados (opcionesRespuesta como array) que son mas naturales en JSON.

- **Busqueda textual**: funciona por `contains` en los campos `pregunta` y `descripcion` (OR query). Es case-sensitive en MongoDB por defecto.

- **Clasificacion y categoria son datos derivados**: no existen como colecciones independientes. Se obtienen con `distinct` sobre las preguntas existentes. Si se eliminan todas las preguntas de una clasificacion, esa clasificacion desaparece de los selectores.
