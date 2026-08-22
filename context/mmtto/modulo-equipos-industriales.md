Modulo de Inventario de Equipos Industriales — documentacion detallada

Resumen

Modulo CRUD independiente para gestionar el inventario de equipos industriales de un establecimiento de salud. Cubre calderas, generadores electricos, sistemas HVAC, ascensores, lavanderia industrial, cocina industrial, sistemas de tratamiento de agua, compresores y bombas. Alineado con el estandar INS-3.1 (Programa de mantenimiento preventivo de instalaciones) del Manual de Acreditacion.

Ruta: `/admin/inventario-industrial`
Acceso minimo en sidebar: OPERATOR (accessLevel >= 2).

Archivos involucrados

### Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `src/app/admin/inventario-industrial/page.tsx` | Pagina principal: tabla, filtros, estadisticas, paginacion, importar/exportar |
| `src/components/admin/inventario-industrial/InventarioIndustrialFormModal.tsx` | Modal de creacion y edicion (19 campos) |
| `src/components/admin/inventario-industrial/InventarioIndustrialDetailModal.tsx` | Modal de detalle con 3 pestanas: Detalle, Historial, Archivos |
| `src/components/admin/inventario-industrial/InventarioIndustrialHistorialPanel.tsx` | Timeline de cambios con diff campo a campo |
| `src/components/admin/inventario-industrial/InventarioIndustrialArchivosPanel.tsx` | Gestion de archivos con categorias industriales y filtro |
| `src/services/inventario-industrial.service.ts` | Servicio: todas las llamadas a Cloud Functions |
| `src/types/inventario-industrial.types.ts` | Tipos, interfaces, constantes y opciones |

### Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `backend/cloud/main.js` (lineas ~1946-2790) | 13 Cloud Functions + helper `registrarHistorialIndustrial` |

### Parse Classes (MongoDB)

| Clase | Uso |
|-------|-----|
| `InventarioEquipoIndustrial` | Datos de cada equipo + array de archivos |
| `InventarioIndustrialHistorial` | Registro de auditoria de cambios |

Modelo de datos

### InventarioEquipoIndustrial

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| ubicacion | String | No | Ubicacion fisica (Sala de Calderas, Casa de Fuerza, Lavanderia, Cocina, etc.) |
| tipoEquipo | String | No | Tipo de equipo industrial (ver opciones abajo) |
| nombreEquipo | String | Si | Nombre del equipo (ej: Caldera Vapor Central) |
| marca | String | No | Marca del fabricante |
| modelo | String | No | Modelo especifico |
| serie | String | No | Numero de serie |
| inventario | String | No | Codigo de inventario interno |
| capacidad | String | No | Capacidad o potencia (ej: "500 kW", "2000 kg/h vapor") |
| combustible | String | No | Tipo de combustible o energia |
| fechaInstalacion | String | No | Fecha de instalacion |
| vidaUtil | Number | No | Vida util en anios |
| estado | String | No | `B` (Bueno), `M` (Malo), `R` (Regular), `Baja` |
| criticidad | String | No | `Alta`, `Media`, `Baja` (default: Media) |
| frecuencia | Number | No | Frecuencia de mantencion en meses (default: 6) |
| garantiaInicio | String | No | Fecha inicio garantia |
| garantiaFinal | String | No | Fecha fin garantia |
| fechaBaja | String | No | Fecha de baja |
| pautaAsignada | String | No | Clasificacion de pauta de mantenimiento pre-asignada. Selector en el formulario de edicion carga valores unicos desde las pautas existentes del dominio. Permite auto-skip de la seleccion de pauta al crear mantenimiento |
| requiereAutorizacion | Boolean | No | Si requiere autorizacion especial para operar (default: false) |
| activo | Boolean | No | Activo/inactivo (default: true) |
| archivos | Array | No | Array de archivos adjuntos |
| creadoPor | String | Auto | userId del creador |

### Valores predefinidos

**Tipo de equipo:**

| Valor | Descripcion |
|-------|-------------|
| Caldera | Calderas de vapor y agua caliente |
| Generador Electrico | Generadores de emergencia y respaldo |
| Sistema HVAC | Climatizacion, calefaccion, ventilacion |
| Ascensor | Ascensores y montacargas |
| Lavadora Industrial | Equipos de lavanderia hospitalaria |
| Secadora Industrial | Secadoras industriales |
| Equipo Cocina Industrial | Equipos de cocina hospitalaria |
| Sistema Tratamiento Agua | Plantas de tratamiento y purificacion |
| Compresor | Compresores de aire y gases |
| Bomba | Bombas de agua, vacio, etc. |
| Otro | Otros equipos industriales |

**Combustible/energia:** Gas Natural, Gas Licuado, Diesel, Electrico, Vapor, N/A

**Estado:** B (Bueno), M (Malo), R (Regular), Baja

**Criticidad:** Alta (rojo), Media (amarillo), Baja (azul)

### Estructura de archivo adjunto

```json
{
  "nombre": "certificacion-caldera-2026.pdf",
  "url": "https://...",
  "tipo": "pdf",
  "categoria": "certificacion",
  "subidoPor": "Juan Perez",
  "fecha": "2026-04-05T12:00:00.000Z"
}
```

**Categorias de archivos:**

| Valor | Label | Color | Uso |
|-------|-------|-------|-----|
| `adquisicion` | Acta de adquisicion | Verde | Documentar compra |
| `baja` | Acta de baja | Rojo | Documentar retiro |
| `garantia` | Garantia | Azul | Cobertura del fabricante |
| `manual` | Manual tecnico | Morado | Documentacion de operacion |
| `certificacion` | Certificado de certificacion | Amarillo | Certificaciones obligatorias (SEC, SERNAGEOMIN, etc.) |
| `mantencion` | Informe de mantencion | Naranja | Constancia de ejecucion (INS-3.1) |
| `inspeccion` | Informe de inspeccion | Teal | Inspecciones periodicas |
| `autorizacion` | Autorizacion de operacion | Indigo | Permisos de operacion especial |
| `otro` | Otro | Gris | Documentos miscelaneos |

Los archivos se acumulan (nunca se reemplazan). Cada operacion queda registrada en el historial.

### InventarioIndustrialHistorial

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| equipoId | String | ID del equipo |
| accion | String | `creacion`, `actualizacion`, `eliminacion`, `archivo_adjunto`, `archivo_eliminado` |
| cambios | Object | Mapa de campo → `{ anterior, nuevo }` |
| descripcion | String | Texto legible |
| usuarioId | String | ID del usuario |
| usuarioNombre | String | Nombre del usuario |
| archivoNombre | String | Nombre del archivo (si aplica) |
| archivoUrl | String | URL del archivo (si aplica) |

Cloud Functions

### CRUD principal

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `getInventarioIndustrial` | VIEWER (1) | `ubicacion`, `tipoEquipo`, `estado`, `criticidad`, `busqueda`, `activo`, `limit`, `skip` | Lista con filtros y paginacion. Busqueda normalizada por inventario, serie y nombreEquipo |
| `getInventarioIndustrialById` | VIEWER (1) | `id` | Obtiene equipo por ID |
| `createInventarioIndustrial` | OPERATOR (2) | `data` | Crea equipo. Valida nombreEquipo obligatorio. Registra historial |
| `updateInventarioIndustrial` | COORDINATOR (3) | `id`, `data` | Actualiza equipo. Compara campo a campo para historial |
| `deleteInventarioIndustrial` | SUPER_ADMIN (5) | `id` | Elimina equipo. Registra en historial |

### Valores de filtro

| Funcion | Acceso | Descripcion |
|---------|--------|-------------|
| `getInventarioIndustrialUbicaciones` | VIEWER (1) | Valores unicos de `ubicacion` |
| `getInventarioIndustrialTipos` | VIEWER (1) | Valores unicos de `tipoEquipo` |

### Importacion y exportacion

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `importarInventarioIndustrial` | COORDINATOR (3) | `items` (array) | Importacion masiva. Retorna `{ created, errors, total }` |
| `exportarInventarioIndustrial` | VIEWER (1) | Filtros opcionales | Exporta todos (limit 10000) |

### Historial

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `getInventarioIndustrialHistorial` | VIEWER (1) | `equipoId`, `limit`, `skip` | Historial paginado, orden descendente |

### Archivos

| Funcion | Acceso | Parametros | Descripcion |
|---------|--------|------------|-------------|
| `adjuntarArchivoIndustrial` | OPERATOR (2) | `equipoId`, `fileName`, `fileUrl`, `categoria` | Agrega archivo con categoria. Registra en historial |
| `eliminarArchivoIndustrial` | COORDINATOR (3) | `equipoId`, `fileName`, `fileUrl` | Elimina archivo. Registra en historial |
| `getArchivosIndustrial` | VIEWER (1) | `equipoId` | Lista archivos del equipo |

Funcion auxiliar interna:
- `registrarHistorialIndustrial(equipoId, accion, cambios, descripcion, user, archivoInfo)` — crea registro en `InventarioIndustrialHistorial`

Servicio frontend

`InventarioIndustrialService` en `services/inventario-industrial.service.ts`:

| Metodo | Cloud Function | Descripcion |
|--------|---------------|-------------|
| `getInventario(filters)` | `getInventarioIndustrial` | Lista paginada con filtros |
| `getById(id)` | `getInventarioIndustrialById` | Un equipo por ID |
| `create(data)` | `createInventarioIndustrial` | Crear equipo |
| `update(id, data)` | `updateInventarioIndustrial` | Actualizar equipo |
| `delete(id)` | `deleteInventarioIndustrial` | Eliminar equipo |
| `getUbicaciones()` | `getInventarioIndustrialUbicaciones` | Valores unicos de ubicacion |
| `getTiposEquipo()` | `getInventarioIndustrialTipos` | Valores unicos de tipo |
| `importar(items)` | `importarInventarioIndustrial` | Importacion masiva |
| `exportar(filters)` | `exportarInventarioIndustrial` | Exportacion |
| `getHistorial(equipoId, limit, skip)` | `getInventarioIndustrialHistorial` | Historial paginado |
| `adjuntarArchivo(equipoId, file, categoria)` | `adjuntarArchivoIndustrial` | Sube archivo Parse.File + asocia |
| `eliminarArchivo(equipoId, fileName, fileUrl)` | `eliminarArchivoIndustrial` | Elimina archivo |
| `getArchivos(equipoId)` | `getArchivosIndustrial` | Lista archivos |

Interfaz de usuario

### Pagina principal (`/admin/inventario-industrial`)

**Header:**
- Titulo "Inventario de Equipos Industriales"
- Descripcion: "Gestione el inventario de equipos industriales, calderas, generadores, HVAC y otros."
- Botones: Descargar Formato (OPERATOR+), Importar Excel (OPERATOR+), Descargar Excel (todos), Nuevo Equipo (OPERATOR+)

**Estadisticas:**
- 4 cards: Total Equipos, Operativos (Bueno), En Mantencion (Malo+Regular), Dados de Baja

**Filtros:**
- 5 filtros: Ubicacion (dinamico), Tipo Equipo (dinamico), Estado (predefinido), Criticidad (predefinido), Busqueda textual normalizada (inventario, serie, nombre)

**Tabla:**
- Columnas: Nombre Equipo (+inventario), Ubicacion, Tipo, Marca/Modelo, Capacidad, Estado (badge), Criticidad (badge), Frecuencia, Acciones
- Columnas responsivas en pantallas pequenas
- Acciones: Ver detalle (todos), Editar (COORDINATOR+), Eliminar (SUPER_ADMIN)

**Paginacion:** 25 registros por pagina (server-side)

### Modal de formulario (`InventarioIndustrialFormModal`)

19 campos en grid 2 columnas:

| Campo | Tipo input | Notas |
|-------|-----------|-------|
| Ubicacion | Select combo + "Nueva" | Valores existentes + texto libre |
| Tipo Equipo | Select combo + "Nueva" | 11 opciones predefinidas + texto libre |
| Nombre Equipo * | Text input | Unico campo obligatorio |
| Marca | Text input | |
| Modelo | Text input | |
| Serie | Text input | |
| Inventario | Text input | Codigo interno |
| Capacidad | Text input | Texto libre (ej: "500 kW") |
| Combustible | Select | Gas Natural, Gas Licuado, Diesel, Electrico, Vapor, N/A |
| Fecha Instalacion | Date input | |
| Vida Util (anios) | Number input | |
| Estado | Select | B, M, R, Baja |
| Criticidad | Select | Alta, Media, Baja (default: Media) |
| Frecuencia mantencion (meses) | Number input | Default: 6 |
| Garantia Inicio | Date input | |
| Garantia Final | Date input | |
| Fecha de Baja | Date input | |
| Requiere Autorizacion | Checkbox | Equipos con permiso especial |
| Activo | Checkbox | Default: true |

### Modal de detalle (`InventarioIndustrialDetailModal`)

3 pestanas:

**Detalle:** Header con nombre, marca/modelo, badges de estado y criticidad (+ badge "Requiere Autorizacion" si aplica). Grid con todos los campos.

**Historial:** Timeline con iconos por accion, diff expandible, paginacion "Cargar mas".

**Archivos:** Selector de categoria (9 tipos) + boton subir. Filtro por categoria. Lista con iconos, badges, datos de subida. Eliminar con confirmacion.

### Importacion/Exportacion

**Template** (`formato_inventario_industrial.xlsx`): headers + 2 filas ejemplo (Caldera + Generador Electrico).

**Exportacion** (`inventario_equipos_industriales.xlsx`): respeta filtros, labels traducidos.

Permisos por operacion

| Operacion | accessLevel minimo | Rol |
|-----------|-------------------|-----|
| Ver lista de equipos | 1 | VIEWER |
| Ver detalle y historial | 1 | VIEWER |
| Ver archivos | 1 | VIEWER |
| Exportar Excel | 1 | VIEWER |
| Crear equipo | 2 | OPERATOR |
| Subir archivo | 2 | OPERATOR |
| Descargar formato | 2 | OPERATOR |
| Importar Excel | 3 | COORDINATOR |
| Editar equipo | 3 | COORDINATOR |
| Eliminar archivo | 3 | COORDINATOR |
| Eliminar equipo | 5 | SUPER_ADMIN |

Relacion con el Manual de Acreditacion

### INS 3.1 — Programa de mantenimiento preventivo de instalaciones (umbral 100%)

| Requisito INS 3.1 | Solucion en el modulo |
|--------------------|-----------------------|
| Responsable designado | Campo `requiereAutorizacion` identifica equipos con requisitos especiales |
| Programa documentado | Inventario con `tipoEquipo`, `frecuencia`, archivos de tipo `mantencion` |
| Constancia de ejecucion | Archivos `mantencion` e `inspeccion`, historial auditado |
| Ascensores | tipoEquipo = "Ascensor" |
| Calderas | tipoEquipo = "Caldera" |
| Gases clinicos | tipoEquipo = "Compresor" |
| Climatizacion | tipoEquipo = "Sistema HVAC" |

### INS 3.2 — Plan de contingencia electrico y agua potable (umbral >= 75%)

| Requisito INS 3.2 | Solucion en el modulo |
|--------------------|-----------------------|
| Generadores de emergencia | tipoEquipo = "Generador Electrico", frecuencia, archivos inspeccion |
| Calidad del agua | tipoEquipo = "Sistema Tratamiento Agua", archivos certificacion |

Diferencias clave vs otros modulos

| Aspecto | Equipos Medicos | **Equipos Industriales** | Flota Vehicular | Infraestructura |
|---------|----------------|-------------------------|-----------------|-----------------|
| Parse Class | InventarioEquipoMedico | **InventarioEquipoIndustrial** | InventarioFlotaVehicular | InventarioInfraestructura |
| Campos propios | servicio, clase, subclase, criticoApoyo | **ubicacion, tipoEquipo, capacidad, combustible, requiereAutorizacion** | patente, VIN, km, docs vigentes | sistema, componente, normativa, inspecciones |
| Criticidad | C/A (Critico/Apoyo) | **Alta/Media/Baja** | — | Alta/Media/Baja |
| Frecuencia default | 12 meses | **6 meses** | 3 meses | 6 meses |
| Categorias archivo unicas | calibracion | **certificacion, inspeccion, autorizacion** | seguro, rev. tecnica, permiso circ. | plano, normativa |

Notas tecnicas

- **Ubicacion y Tipo Equipo son campos libres con combo**: selectores se llenan con valores existentes + boton "Nueva" para agregar nuevos. Permite adaptarse a cualquier establecimiento.

- **Busqueda normalizada**: elimina espacios, guiones, puntos y caracteres especiales, convierte a minusculas. Busca en inventario, serie y nombreEquipo. Se ejecuta en memoria tras traer todos los equipos con filtros base.

- **Historial inmutable**: registros de InventarioIndustrialHistorial son append-only.

- **Archivos en GridFS**: almacenados via Parse.File en MongoDB GridFS. Maximo 20MB por archivo. Se acumulan sin reemplazar.

- **Paginacion server-side**: 25 items por pagina. Total calculado con query.count() separado.
