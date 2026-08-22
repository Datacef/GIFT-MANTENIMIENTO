Modulo de Inventario de Equipos Medicos — documentacion detallada

Resumen

Modulo CRUD completo para gestionar el inventario de equipos medicos de un establecimiento de salud. Permite registrar, clasificar, buscar, importar/exportar equipos, adjuntar documentos categorizados y mantener un historial auditado de todos los cambios. Es el modulo central para cumplir con los estandares EQ-1 (Adquisicion y Reposicion) y EQ-2 (Mantenimiento Preventivo) del Manual de Acreditacion.

Ruta: `/admin/inventario`
Acceso minimo: OPERATOR (accessLevel >= 2) para ver en sidebar; VIEWER (1) para consultar datos via API.

Archivos involucrados

### Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `src/app/admin/inventario/page.tsx` | Pagina principal: tabla, filtros, estadisticas, paginacion, importar/exportar |
| `src/components/admin/inventario/InventarioFormModal.tsx` | Modal de creacion y edicion de equipos (18 campos) |
| `src/components/admin/inventario/InventarioDetailModal.tsx` | Modal de detalle con 3 pestanas: Detalle, Historial, Archivos |
| `src/components/admin/inventario/InventarioHistorialPanel.tsx` | Timeline de cambios con diff campo a campo |
| `src/components/admin/inventario/InventarioArchivosPanel.tsx` | Gestion de archivos con categorias y filtro |
| `src/services/inventario-equipo.service.ts` | Servicio: todas las llamadas a Cloud Functions |
| `src/types/inventario-equipo.types.ts` | Tipos, interfaces, constantes y opciones |

### Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `backend/cloud/main.js` (lineas ~1081-1879) | 15 Cloud Functions del modulo |

### Parse Classes (MongoDB)

| Clase | Uso |
|-------|-----|
| `InventarioEquipoMedico` | Datos de cada equipo + array de archivos |
| `InventarioHistorial` | Registro de auditoria de cambios |

Modelo de datos

### InventarioEquipoMedico

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| servicio | String | No | Servicio clinico (Neonatologia, Urgencia, Pabellon, etc.) |
| clase | String | No | Clase del equipo (Apoyo Diagnostico, Monitoreo, Terapeutico, etc.) |
| subclase | String | No | Nivel de costo: `Alto Costo`, `Mediano Costo`, `Bajo Costo` |
| nombreEquipo | String | Si | Nombre del equipo (ECOGRAFO, VENTILADOR MECANICO, etc.) |
| marca | String | No | Marca del fabricante |
| modelo | String | No | Modelo especifico |
| serie | String | No | Numero de serie unico del fabricante |
| inventario | String | No | Codigo de inventario interno del establecimiento |
| valor | String | No | Valor monetario (texto libre, ej: "45000000" o "S/I") |
| fechaAdquisicion | String | No | Fecha de adquisicion (formato YYYY-MM-DD) |
| vidaUtil | Number | No | Vida util en anios (relevante para EQ 1.2) |
| estado | String | No | Estado actual: `B` (Bueno), `M` (Malo), `R` (Regular), `Baja` |
| criticoApoyo | String | No | Clasificacion: `C` (Critico), `A` (Apoyo) |
| frecuencia | Number | No | Frecuencia de mantencion en meses |
| garantiaInicio | String | No | Fecha inicio de garantia |
| garantiaFinal | String | No | Fecha fin de garantia |
| fechaBaja | String | No | Fecha de baja del equipo |
| pautaAsignada | String | No | Clasificacion de pauta de mantenimiento pre-asignada (valor de `clasificacionEquipo` de `PreguntaMantenimiento`). Al crear un mantenimiento, si este campo coincide con una pauta disponible, el wizard salta automaticamente al checklist. Selector en el formulario de edicion carga valores unicos desde las pautas existentes |
| activo | Boolean | No | Si el equipo esta activo (default: true) |
| archivos | Array | No | Array de archivos adjuntos (ver estructura abajo) |
| creadoPor | String | Auto | userId del creador (asignado por backend) |

Valores predefinidos:

- **Estado**: B (Bueno), M (Malo), R (Regular), Baja
- **Criticidad**: C (Critico), A (Apoyo)
- **Subclase**: Alto Costo, Mediano Costo, Bajo Costo
- **Servicio y Clase**: valores libres, con selector combo que muestra existentes + opcion "Nueva"

### Estructura de archivo adjunto

Cada elemento del array `archivos` tiene:

```json
{
  "nombre": "acta-adquisicion-2023.pdf",
  "url": "https://parsefiles.back4app.com/...",
  "tipo": "pdf",
  "categoria": "adquisicion",
  "subidoPor": "Juan Perez",
  "fecha": "2026-04-05T12:00:00.000Z"
}
```

**Categorias disponibles:**

| Valor | Label | Color | Uso en acreditacion |
|-------|-------|-------|-------------------|
| `adquisicion` | Acta de adquisicion | Verde | EQ 1.1 — documentar procedimiento de adquisicion |
| `baja` | Acta de baja | Rojo | EQ 1.2 — registrar fin de vida util |
| `garantia` | Garantia | Azul | Respaldo de cobertura del fabricante |
| `manual` | Manual tecnico | Morado | EQ 3.1 — documentacion para operacion segura |
| `calibracion` | Certificado de calibracion | Amarillo | EQ 2.1/2.2 — evidencia de mantenimiento |
| `mantencion` | Informe de mantencion | Naranja | EQ 2.1/2.2 — constancia de ejecucion |
| `otro` | Otro | Gris | Documentos miscelaneos |

Los archivos se **acumulan** en el array, nunca se reemplazan. Subir un acta de baja no borra el acta de adquisicion. Cada operacion queda registrada en el historial.

### InventarioHistorial

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| equipoId | String | ID del equipo |
| accion | String | Tipo: `creacion`, `actualizacion`, `eliminacion`, `archivo_adjunto`, `archivo_eliminado` |
| cambios | Object | Mapa de campo → `{ anterior, nuevo }` (para actualizaciones) |
| descripcion | String | Texto legible (ej: `Equipo "ECOGRAFO" creado`) |
| usuarioId | String | ID del usuario que realizo la accion |
| usuarioNombre | String | Nombre del usuario |
| archivoNombre | String | Nombre del archivo (si aplica) |
| archivoUrl | String | URL del archivo (si aplica) |

Cloud Functions

### CRUD principal

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `getInventarioEquipos` | VIEWER (1) | `servicio`, `clase`, `subclase`, `estado`, `criticoApoyo`, `busqueda`, `activo`, `limit`, `skip` | Lista con filtros y paginacion. Busqueda normalizada por inventario y serie (OR). Normaliza quitando espacios, guiones, puntos y caracteres especiales, y convierte a minusculas para comparar. Orden: inventario ASC, serie ASC |
| `getInventarioEquipoById` | VIEWER (1) | `id` | Obtiene un equipo por ID |
| `createInventarioEquipo` | OPERATOR (2) | `data` (objeto con campos) | Crea equipo. Valida nombreEquipo obligatorio. Registra historial con todos los campos iniciales |
| `updateInventarioEquipo` | COORDINATOR (3) | `id`, `data` | Actualiza equipo. Compara campo a campo para registrar solo los cambios reales en historial |
| `deleteInventarioEquipo` | COORDINATOR (3) | `id` | Elimina equipo. Registra en historial antes de borrar |

### Valores de filtro

| Funcion | Acceso | Descripcion |
|---------|--------|-------------|
| `getInventarioServicios` | VIEWER (1) | Valores unicos de `servicio` en equipos existentes |
| `getInventarioClases` | VIEWER (1) | Valores unicos de `clase` en equipos existentes |

### Importacion y exportacion

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `importarInventarioEquipos` | COORDINATOR (3) | `items` (array de objetos) | Importacion masiva. Crea cada equipo individualmente. Retorna `{ created, errors, total }` |
| `exportarInventarioEquipos` | VIEWER (1) | Filtros opcionales | Exporta todos los equipos (limit 10000). Mismos filtros que getInventarioEquipos |

### Historial

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `getInventarioHistorial` | VIEWER (1) | `equipoId`, `limit` (default 20), `skip` | Historial paginado, orden descendente por fecha |

### Archivos

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `adjuntarArchivoInventario` | OPERATOR (2) | `equipoId`, `fileName`, `fileUrl`, `categoria` | Agrega archivo al array. Registra en historial con categoria |
| `eliminarArchivoInventario` | COORDINATOR (3) | `equipoId`, `fileName`, `fileUrl` | Filtra archivo del array por nombre+URL. Registra en historial |
| `getArchivosInventario` | VIEWER (1) | `equipoId` | Retorna array de archivos del equipo |

Funcion auxiliar interna (no expuesta):
- `registrarHistorial(equipoId, accion, cambios, descripcion, user, archivoInfo)` — crea registro en InventarioHistorial

Servicio frontend

`InventarioEquipoService` en `services/inventario-equipo.service.ts`:

| Metodo | Cloud Function | Descripcion |
|--------|---------------|-------------|
| `getInventario(filters)` | `getInventarioEquipos` | Lista paginada con filtros |
| `getById(id)` | `getInventarioEquipoById` | Un equipo por ID |
| `create(data)` | `createInventarioEquipo` | Crear equipo |
| `update(id, data)` | `updateInventarioEquipo` | Actualizar equipo |
| `delete(id)` | `deleteInventarioEquipo` | Eliminar equipo |
| `getServicios()` | `getInventarioServicios` | Valores unicos de servicio |
| `getClases()` | `getInventarioClases` | Valores unicos de clase |
| `importar(items)` | `importarInventarioEquipos` | Importacion masiva |
| `exportar(filters)` | `exportarInventarioEquipos` | Exportacion |
| `getHistorial(equipoId, limit, skip)` | `getInventarioHistorial` | Historial paginado |
| `adjuntarArchivo(equipoId, file, categoria)` | `adjuntarArchivoInventario` | Sube archivo con Parse.File + asocia |
| `eliminarArchivo(equipoId, fileName, fileUrl)` | `eliminarArchivoInventario` | Elimina archivo |
| `getArchivos(equipoId)` | `getArchivosInventario` | Lista archivos |

El metodo `adjuntarArchivo` hace dos pasos:
1. Sube el binario con `new Parse.File(file.name, file)` → `parseFile.save()` → obtiene URL (GridFS)
2. Llama la Cloud Function con la URL, nombre y categoria para asociar al equipo

Interfaz de usuario

### Pagina principal (`/admin/inventario`)

**Header:**
- Titulo "Inventario de Equipos Medicos"
- Botones (segun accessLevel):
  - "Descargar Formato" (OPERATOR+) — descarga Excel con headers y 2 filas de ejemplo
  - "Importar Excel" (OPERATOR+) — carga masiva desde archivo .xlsx/.xls
  - "Descargar Excel" (todos) — exporta datos actuales con filtros aplicados
  - "Nuevo Equipo" (OPERATOR+) — abre modal de creacion

**Estadisticas:**
- 4 cards: Total Equipos, Activos (Bueno), En Mantencion (Malo+Regular), Dados de Baja

**Filtros:**
- 6 filtros en fila: Servicio (valores dinamicos), Clase (valores dinamicos), Subclase (predefinido), Estado (predefinido), Critico/Apoyo (predefinido), Busqueda textual (por inventario o serie, con normalizacion)
- Cambiar cualquier filtro resetea la paginacion a pagina 0

**Tabla:**
- Columnas: Nombre Equipo (+ codigo inventario), Servicio, Clase, Marca/Modelo, Serie, Estado (badge color), Critico (badge color), Frecuencia, Acciones
- Columnas responsivas: algunas se ocultan en pantallas pequenas (md:, lg:, xl:)
- Acciones por fila:
  - Ver detalle (todos) → abre InventarioDetailModal
  - Editar (COORDINATOR+) → abre InventarioFormModal
  - Eliminar (SUPER_ADMIN) → confirmacion SweetAlert2

**Paginacion:**
- 25 registros por pagina (server-side)
- Navegacion: Anterior / pagina actual / Siguiente
- Muestra "X - Y de Z"

### Modal de creacion/edicion (`InventarioFormModal`)

Formulario en grid 2 columnas con 18 campos:

| Campo | Tipo input | Notas |
|-------|-----------|-------|
| Servicio | Select combo + input "Nueva" | Carga valores existentes; boton para agregar nuevo |
| Clase | Select combo + input "Nueva" | Idem servicio |
| Subclase | Select fijo | Alto Costo, Mediano Costo, Bajo Costo |
| Nombre Equipo * | Text input | Unico campo obligatorio |
| Marca | Text input | |
| Modelo | Text input | |
| Serie | Text input | |
| Inventario | Text input | Codigo interno |
| Valor | Text input | Texto libre (permite "S/I") |
| Fecha Adquisicion | Date input | |
| Vida Util (anios) | Number input | |
| Estado | Select | B, M, R, Baja |
| Critico / Apoyo | Select | C, A |
| Frecuencia mantencion (meses) | Number input | Default: 12 |
| Garantia Inicio | Date input | |
| Garantia Final | Date input | |
| Fecha de Baja | Date input | Opcional |
| Activo | Checkbox | Default: true |

Modo edicion: precarga todos los campos del equipo existente.
Modo creacion: todos los campos vacios excepto estado (B), criticoApoyo (A), frecuencia (12), activo (true).

### Modal de detalle (`InventarioDetailModal`)

3 pestanas con tabs visuales:

**Pestana Detalle:**
- Header con nombre, marca/modelo, badges de estado y criticidad
- Grid 2 columnas con todos los campos formateados
- Fechas en formato chileno (dd/mm/yyyy)

**Pestana Historial (`InventarioHistorialPanel`):**
- Timeline visual con linea vertical y iconos por tipo de accion:
  - Creacion (verde, icono +)
  - Actualizacion (azul, icono lapiz)
  - Eliminacion (rojo, icono basurero)
  - Archivo adjuntado (morado, icono clip)
  - Archivo eliminado (naranja, icono basurero)
- Cada entrada muestra: tipo, fecha, usuario, descripcion
- Para actualizaciones: boton expandible "N campos modificados" con diff anterior → nuevo (rojo tachado → verde)
- Para archivos: link directo al archivo
- Paginacion con "Cargar mas" (10 registros por carga, acumulativo)

**Pestana Archivos (`InventarioArchivosPanel`):**
- Selector de tipo de documento (7 categorias) + boton "Subir archivo" (OPERATOR+)
- Barra de progreso durante upload
- Filtro por categoria con badges contadores (muestra solo categorias con archivos)
- Lista de archivos con:
  - Icono de color segun extension (PDF rojo, DOC azul, XLS verde, imagenes morado)
  - Nombre como link (abre en nueva pestana)
  - Badge de categoria con color
  - "Subido por [usuario] el [fecha]"
  - Boton eliminar (COORDINATOR+) con confirmacion SweetAlert2
- Mensaje diferenciado: "No hay archivos adjuntos" vs "No hay archivos en esta categoria"

### Importacion desde Excel

Flujo:
1. Usuario hace clic en "Importar Excel"
2. Se abre selector de archivos (.xlsx, .xls)
3. Frontend lee el archivo con libreria `xlsx`
4. Parsea primera hoja a JSON
5. Mapea columnas esperadas: servicio, clase, subclase, nombreEquipo, marca, modelo, serie, inventario, valor, fechaAdquisicion, vidaUtil, estado, criticoApoyo, frecuencia, garantiaInicio, garantiaFinal, fechaBaja
6. Confirmacion: "Se importaran N equipos. Desea continuar?"
7. Llama `importarInventarioEquipos` con el array
8. Resultado: "Creados: X, Errores: Y, Total: Z"
9. Recarga tabla y opciones de filtro

### Exportacion a Excel

Flujo:
1. Usuario hace clic en "Descargar Excel"
2. Frontend llama `exportarInventarioEquipos` con los filtros actuales
3. Recibe todos los equipos (hasta 10000)
4. Genera Excel con `xlsx` en cliente
5. Archivo: `inventario_equipos_medicos.xlsx`
6. Columnas con labels legibles y valores traducidos (estado Bueno/Malo/Regular, etc.)

### Template de importacion

Boton "Descargar Formato" genera un Excel con:
- Headers correctos en la primera fila
- 2 filas de ejemplo (ECOGRAFO GE Healthcare y MONITOR SIGNOS VITALES Philips)
- Archivo: `formato_inventario_equipos.xlsx`

Permisos por operacion

| Operacion | accessLevel minimo | Rol |
|-----------|-------------------|-----|
| Ver lista de equipos | 1 | VIEWER |
| Ver detalle de equipo | 1 | VIEWER |
| Ver historial | 1 | VIEWER |
| Ver archivos | 1 | VIEWER |
| Exportar Excel | 1 | VIEWER |
| Crear equipo | 2 | OPERATOR |
| Subir archivo | 2 | OPERATOR |
| Descargar formato de importacion | 2 | OPERATOR |
| Importar Excel | 2 (UI) / 3 (backend) | OPERATOR (UI) / COORDINATOR (backend) |
| Editar equipo | 3 | COORDINATOR |
| Eliminar archivo | 3 | COORDINATOR |
| Eliminar equipo | 5 (UI) / 3 (backend) | SUPER_ADMIN (UI) / COORDINATOR (backend) |

Nota: la UI restringe la eliminacion de equipos a SUPER_ADMIN (accessLevel >= 5), pero el backend la permite desde COORDINATOR (>= 3). Esto es una restriccion adicional de UI.

Relacion con el Manual de Acreditacion

### EQ 1.1 — Procedimiento de adquisicion
- Campo `fechaAdquisicion` registra cuando se adquirio
- Categoria de archivo `adquisicion` permite adjuntar el acta/orden de compra
- Historial documenta quien creo el registro y cuando

### EQ 1.2 — Vida util y reposicion
- Campo `vidaUtil` (en anios) registra la vida util esperada
- Campo `criticoApoyo` = `C` identifica equipos criticos
- Campo `estado` = `Baja` + `fechaBaja` documentan la baja
- Categoria de archivo `baja` permite adjuntar el acta de baja
- Se puede calcular el % de equipos criticos con vida util conocida (umbral >= 50%)

### EQ 2.1/2.2 — Mantenimiento preventivo
- Campo `frecuencia` define la periodicidad de mantencion
- Categoria de archivo `mantencion` permite adjuntar informes de ejecucion
- Categoria de archivo `calibracion` permite adjuntar certificados
- Historial completo documenta la trazabilidad de cambios

### EQ 3.1 — Operacion segura
- Categoria de archivo `manual` permite adjuntar manuales tecnicos
- Campo `clase` y `subclase` permiten clasificar equipos por tipo

Flujo de datos completo

### Crear equipo

```
1. Frontend: InventarioFormModal.handleSubmit()
2. Service:  InventarioEquipoService.create(formData)
3. Parse:    Cloud.run('createInventarioEquipo', { data })
4. Backend:  valida accessLevel >= 2, valida nombreEquipo
5. Backend:  crea objeto InventarioEquipoMedico en MongoDB
6. Backend:  registrarHistorial(id, 'creacion', cambios, desc, user, null)
7. Backend:  retorna equipo creado como JSON plano
8. Frontend: cierra modal, recarga tabla
```

### Adjuntar archivo

```
1. Frontend: InventarioArchivosPanel — selecciona categoria + archivo
2. Service:  new Parse.File(file.name, file).save() → obtiene URL (GridFS)
3. Service:  Cloud.run('adjuntarArchivoInventario', { equipoId, fileName, fileUrl, categoria })
4. Backend:  valida accessLevel >= 2
5. Backend:  equipo.get('archivos').push(archivoData) — ACUMULA, no reemplaza
6. Backend:  equipo.save()
7. Backend:  registrarHistorial(id, 'archivo_adjunto', {}, desc, user, archivoInfo)
8. Frontend: muestra confirmacion, recarga lista de archivos
```

### Actualizar equipo

```
1. Frontend: InventarioFormModal.handleSubmit() (modo edicion)
2. Service:  InventarioEquipoService.update(id, formData)
3. Parse:    Cloud.run('updateInventarioEquipo', { id, data })
4. Backend:  valida accessLevel >= 3
5. Backend:  compara cada campo actual vs nuevo → construye mapa de cambios
6. Backend:  solo guarda campos que realmente cambiaron
7. Backend:  registrarHistorial(id, 'actualizacion', cambios, desc, user, null)
8. Frontend: cierra modal, recarga tabla
```

Notas tecnicas

- **Servicio y Clase son campos libres**: no tienen catalogo predefinido. Los selectores se llenan con valores existentes (`getInventarioServicios`, `getInventarioClases`). El boton "Nueva" permite escribir un valor nuevo. Esto permite que el sistema se adapte a cualquier establecimiento sin configuracion previa.

- **Busqueda textual normalizada**: busca por `inventario` y `serie` (OR). Tanto el termino buscado como los valores almacenados se normalizan antes de comparar: se eliminan espacios, guiones, puntos, barras, parentesis y otros caracteres especiales, y se convierte a minusculas. Ejemplo: buscar "SN 123" encuentra equipos con serie "SN-123", "SN.123" o "sn123". La busqueda se realiza en memoria (no en query MongoDB) para poder aplicar la normalizacion.

- **Paginacion server-side**: 25 items por pagina. El total se calcula con `query.count()` separado del `query.find()`.

- **Archivos en GridFS**: Parse.File almacena binarios en MongoDB GridFS. No hay limite de cantidad de archivos por equipo. El tamaño maximo por archivo es 20MB (configurado en `parse-config.js`).

- **Historial inmutable**: los registros de InventarioHistorial no se modifican ni eliminan. Son append-only.

- **Exportacion incluye filtros**: si el usuario tiene filtros activos, la exportacion solo incluye los equipos filtrados (con limit 10000).
