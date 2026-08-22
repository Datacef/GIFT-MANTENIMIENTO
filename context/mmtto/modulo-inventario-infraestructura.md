Modulo de Inventario de Infraestructura — documentacion detallada

Resumen

Modulo CRUD independiente para gestionar los componentes de infraestructura de un establecimiento de salud. Cubre sistemas electricos, sanitarios, gases clinicos, proteccion contra incendios, senaletica, estructura del edificio, techumbre, climatizacion, agua potable e iluminacion de emergencia. Es el modulo mas directamente vinculado al Ambito 8 (Seguridad de las Instalaciones — INS) del Manual de Acreditacion, soportando INS-1.1, INS-2.1, INS-2.2, INS-3.1 e INS-3.2.

Ruta: `/admin/infraestructura`
Acceso minimo en sidebar: OPERATOR (accessLevel >= 2).

Archivos involucrados

### Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `src/app/admin/infraestructura/page.tsx` | Pagina principal: tabla, filtros, estadisticas, paginacion, importar/exportar |
| `src/components/admin/infraestructura/InfraestructuraFormModal.tsx` | Modal de creacion y edicion (22 campos) |
| `src/components/admin/infraestructura/InfraestructuraDetailModal.tsx` | Modal de detalle con 3 pestanas: Detalle, Historial, Archivos |
| `src/components/admin/infraestructura/InfraestructuraHistorialPanel.tsx` | Timeline de cambios con diff campo a campo |
| `src/components/admin/infraestructura/InfraestructuraArchivosPanel.tsx` | Gestion de archivos con categorias de infraestructura y filtro |
| `src/services/inventario-infraestructura.service.ts` | Servicio: todas las llamadas a Cloud Functions |
| `src/types/inventario-infraestructura.types.ts` | Tipos, interfaces, constantes y opciones |

### Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `backend/cloud/main.js` (lineas ~3729-4590) | 13 Cloud Functions + helper `registrarHistorialInfra` |

### Parse Classes (MongoDB)

| Clase | Uso |
|-------|-----|
| `InventarioInfraestructura` | Datos de cada componente + array de archivos |
| `InfraestructuraHistorial` | Registro de auditoria de cambios |

Modelo de datos

### InventarioInfraestructura

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| sistema | String | No | Sistema de infraestructura (10 opciones predefinidas) |
| componente | String | Si | Componente especifico (ej: "Tablero electrico principal") |
| ubicacion | String | No | Ubicacion fisica (Edificio A Piso 1, Sala de Maquinas, etc.) |
| descripcion | String | No | Descripcion detallada del elemento |
| marca | String | No | Marca del fabricante |
| modelo | String | No | Modelo especifico |
| serie | String | No | Numero de serie |
| codigoInterno | String | No | Codigo interno del establecimiento |
| capacidad | String | No | Especificacion tecnica (ej: "200 A", "500 L/min") |
| fechaInstalacion | String | No | Fecha de instalacion |
| vidaUtil | Number | No | Vida util en anios |
| estado | String | No | `B` (Bueno), `M` (Malo), `R` (Regular), `Baja` |
| criticidad | String | No | `Alta`, `Media`, `Baja` (default: Media) |
| frecuencia | Number | No | Frecuencia de mantencion en meses (default: 6) |
| normativaAplicable | String | No | Referencia normativa (ej: INS-1.1, INS-3.1, NCh 2095) |
| fechaUltimaInspeccion | String | No | Fecha de la ultima inspeccion realizada |
| proximaInspeccion | String | No | Fecha programada de proxima inspeccion |
| responsable | String | No | Responsable designado (exigido por INS-3.1) |
| garantiaInicio | String | No | Fecha inicio garantia |
| garantiaFinal | String | No | Fecha fin garantia |
| fechaBaja | String | No | Fecha de baja |
| pautaAsignada | String | No | Clasificacion de pauta de mantenimiento pre-asignada. Selector en el formulario de edicion carga valores unicos desde las pautas existentes del dominio. Permite pre-seleccion automatica al crear mantenimiento |
| activo | Boolean | No | Activo/inactivo (default: true) |
| archivos | Array | No | Array de archivos adjuntos |
| creadoPor | String | Auto | userId del creador |

### Valores predefinidos

**Sistema:**

| Valor | Color badge | Descripcion | Estandar INS |
|-------|-------------|-------------|--------------|
| Electrico | Amarillo | Tableros, circuitos, transformadores | INS-3.2 |
| Sanitario | Azul | Redes de agua, alcantarillado | INS-3.1 |
| Gases Clinicos | Cyan | Manifolds, redes de oxigeno, vacio, aire comprimido | INS-3.1 |
| Proteccion Incendios | Rojo | Extintores, red seca/humeda, detectores, rociadores | INS-1.1 |
| Senaletica | Verde | Senaletica de evacuacion, seguridad, ubicacion | INS-2.2 |
| Estructura | Gris | Muros, pisos, puertas, ventanas, estructura portante | INS-3.1 |
| Techumbre | Naranja | Cubiertas, canaletas, impermeabilizacion | INS-3.1 |
| Climatizacion | Indigo | Ductos, difusores, unidades de aire | INS-3.1 |
| Agua Potable | Teal | Estanques, bombas de agua, tratamiento | INS-3.2 |
| Iluminacion Emergencia | Morado | Luminarias de emergencia, senalizacion luminosa | INS-3.2 |

**Estado:** B (Bueno), M (Malo), R (Regular), Baja

**Criticidad:** Alta (rojo), Media (amarillo), Baja (azul)

### Estructura de archivo adjunto

```json
{
  "nombre": "plano-red-electrica-piso2.pdf",
  "url": "https://...",
  "tipo": "pdf",
  "categoria": "plano",
  "subidoPor": "Juan Perez",
  "fecha": "2026-04-05T12:00:00.000Z"
}
```

**Categorias de archivos:**

| Valor | Label | Color | Uso |
|-------|-------|-------|-----|
| `adquisicion` | Acta de adquisicion | Verde | Documentar compra/instalacion |
| `baja` | Acta de baja | Rojo | Documentar retiro |
| `garantia` | Garantia | Azul | Cobertura del proveedor |
| `manual` | Manual tecnico | Morado | Documentacion de operacion |
| `certificacion` | Certificacion | Cyan | Certificaciones SEC, sanitarias, etc. |
| `mantencion` | Informe de mantencion | Naranja | Constancia de ejecucion (INS-3.1) |
| `inspeccion` | Informe de inspeccion | Amarillo | Inspecciones periodicas (bomberos, SEC) |
| `plano` | Plano o diagrama | Indigo | Planos electricos, sanitarios, evacuacion, isometricos |
| `normativa` | Documento normativo | Teal | Normativas aplicables, resoluciones, protocolos |
| `otro` | Otro | Gris | Documentos miscelaneos |

Las categorias `plano` y `normativa` son exclusivas de este modulo.

### InfraestructuraHistorial

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| componenteId | String | ID del componente |
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
| `getInventarioInfra` | VIEWER (1) | `sistema`, `ubicacion`, `estado`, `criticidad`, `busqueda`, `activo`, `limit`, `skip` | Lista con filtros y paginacion. Busqueda normalizada por codigoInterno, componente y descripcion |
| `getInventarioInfraById` | VIEWER (1) | `id` | Obtiene componente por ID |
| `createInventarioInfra` | OPERATOR (2) | `data` | Crea componente. Valida `componente` obligatorio. Registra historial |
| `updateInventarioInfra` | COORDINATOR (3) | `id`, `data` | Actualiza. Compara campo a campo para historial |
| `deleteInventarioInfra` | SUPER_ADMIN (5) | `id` | Elimina. Registra en historial |

### Valores de filtro

| Funcion | Acceso | Descripcion |
|---------|--------|-------------|
| `getInventarioInfraSistemas` | VIEWER (1) | Valores unicos de `sistema` |
| `getInventarioInfraUbicaciones` | VIEWER (1) | Valores unicos de `ubicacion` |

### Importacion y exportacion

| Funcion | Acceso | Descripcion |
|---------|--------|-------------|
| `importarInventarioInfra` | COORDINATOR (3) | Importacion masiva. Retorna `{ created, errors, total }` |
| `exportarInventarioInfra` | VIEWER (1) | Exporta todos (limit 10000) |

### Historial y archivos

| Funcion | Acceso | Descripcion |
|---------|--------|-------------|
| `getInventarioInfraHistorial` | VIEWER (1) | Historial paginado, orden descendente |
| `adjuntarArchivoInfra` | OPERATOR (2) | Agrega archivo con categoria. Registra historial |
| `eliminarArchivoInfra` | COORDINATOR (3) | Elimina archivo. Registra historial |
| `getArchivosInfra` | VIEWER (1) | Lista archivos |

Funcion auxiliar: `registrarHistorialInfra(componenteId, accion, cambios, descripcion, user, archivoInfo)`

Servicio frontend

`InventarioInfraestructuraService` en `services/inventario-infraestructura.service.ts`:

| Metodo | Cloud Function | Descripcion |
|--------|---------------|-------------|
| `getInventario(filters)` | `getInventarioInfra` | Lista paginada |
| `getById(id)` | `getInventarioInfraById` | Un componente por ID |
| `create(data)` | `createInventarioInfra` | Crear |
| `update(id, data)` | `updateInventarioInfra` | Actualizar |
| `delete(id)` | `deleteInventarioInfra` | Eliminar |
| `getSistemas()` | `getInventarioInfraSistemas` | Valores unicos de sistema |
| `getUbicaciones()` | `getInventarioInfraUbicaciones` | Valores unicos de ubicacion |
| `importar(items)` | `importarInventarioInfra` | Importacion masiva |
| `exportar(filters)` | `exportarInventarioInfra` | Exportacion |
| `getHistorial(id, limit, skip)` | `getInventarioInfraHistorial` | Historial paginado |
| `adjuntarArchivo(id, file, cat)` | `adjuntarArchivoInfra` | Sube archivo + asocia |
| `eliminarArchivo(id, name, url)` | `eliminarArchivoInfra` | Elimina archivo |
| `getArchivos(id)` | `getArchivosInfra` | Lista archivos |

Interfaz de usuario

### Pagina principal (`/admin/infraestructura`)

**Header:**
- Titulo "Inventario de Infraestructura"
- Botones: Descargar Formato, Importar Excel, Descargar Excel, Nuevo Componente

**Estadisticas:** 4 cards: Total Componentes, Operativos, En Mantencion, Dados de Baja

**Filtros:** 5 filtros: Sistema, Ubicacion, Estado, Criticidad, Busqueda

**Tabla:** Componente (+codigo), Sistema (badge color), Ubicacion, Marca/Modelo, Criticidad, Estado, Prox. Inspeccion, Frecuencia, Acciones

**Paginacion:** 25 por pagina

### Modal de formulario (22 campos)

| Campo | Tipo input | Notas |
|-------|-----------|-------|
| Sistema | Select combo | 10 predefinidos + BD + "Nueva" |
| Componente * | Text input | Obligatorio |
| Ubicacion | Select combo + "Nueva" | Valores existentes + libre |
| Descripcion | Textarea | Detalle del elemento |
| Marca | Text input | |
| Modelo | Text input | |
| Serie | Text input | |
| Codigo Interno | Text input | |
| Capacidad | Text input | Especificacion tecnica |
| Fecha Instalacion | Date input | |
| Vida Util (anios) | Number input | |
| Estado | Select | B, M, R, Baja |
| Criticidad | Select | Alta, Media, Baja |
| Frecuencia (meses) | Number input | Default: 6 |
| Normativa Aplicable | Text input | Ej: INS-1.1 |
| Fecha Ultima Inspeccion | Date input | |
| Proxima Inspeccion | Date input | |
| Responsable | Text input | Persona designada |
| Garantia Inicio | Date input | |
| Garantia Final | Date input | |
| Fecha de Baja | Date input | |
| Activo | Checkbox | Default: true |

### Modal de detalle (3 pestanas)

**Detalle:** Header con componente y badges. Seccion destacada (teal) con normativa, inspecciones y responsable. Grid con todos los campos.

**Historial:** Timeline con diff expandible y paginacion.

**Archivos:** 10 categorias incluyendo plano y normativa. Soporte iconos DWG/DXF.

### Importacion/Exportacion

Template: 2 filas ejemplo (Tablero electrico + Red humeda).
Exportacion: `inventario_infraestructura.xlsx`.

Permisos por operacion

| Operacion | accessLevel | Rol |
|-----------|------------|-----|
| Ver lista, detalle, historial, archivos | 1 | VIEWER |
| Exportar Excel | 1 | VIEWER |
| Crear componente | 2 | OPERATOR |
| Subir archivo | 2 | OPERATOR |
| Descargar formato | 2 | OPERATOR |
| Importar Excel | 3 | COORDINATOR |
| Editar componente | 3 | COORDINATOR |
| Eliminar archivo | 3 | COORDINATOR |
| Eliminar componente | 5 | SUPER_ADMIN |

Relacion con el Manual de Acreditacion

### INS 1.1 — Riesgo de incendio (umbral >= 80%)

| Requisito | Solucion |
|-----------|----------|
| Responsable prevencion | Campo `responsable` en componentes de Proteccion Incendios |
| Plan documentado | Archivos `normativa` |
| Informe evaluacion bomberos | Archivos `inspeccion` con `fechaUltimaInspeccion` |
| Recarga extintores | Componentes individuales con `frecuencia` y archivos `mantencion` |
| Sistemas de mitigacion | Historial de mantenciones |

### INS 2.1/2.2 — Evacuacion y senaletica (umbral >= 75%)

| Requisito | Solucion |
|-----------|----------|
| Planes de evacuacion | Archivos `normativa` y `plano` |
| Simulacros | Archivos `inspeccion` |
| Senaletica funcional | Componentes de Senaletica con estado y frecuencia |

### INS 3.1 — Mantenimiento preventivo (umbral 100%)

| Requisito | Solucion |
|-----------|----------|
| Responsable designado | Campo `responsable` |
| Programa documentado | Campos `frecuencia`, `normativaAplicable`, archivos `normativa` |
| Gases clinicos | Sistema = "Gases Clinicos" |
| Techumbre | Sistema = "Techumbre" |
| Climatizacion | Sistema = "Climatizacion" |
| Constancia ejecucion | Archivos `mantencion`, historial auditado |

### INS 3.2 — Contingencia electrica y agua (umbral >= 75%)

| Requisito | Solucion |
|-----------|----------|
| Iluminacion emergencia | Sistema = "Iluminacion Emergencia" |
| Agua de emergencia | Sistema = "Agua Potable" |
| Calidad agua estanques | Archivos `inspeccion` y `certificacion` |

Complementariedad con Equipos Industriales

| Infraestructura (instalacion) | Equipo Industrial (maquinaria) |
|-------------------------------|-------------------------------|
| Red de gases clinicos | Compresor de aire medicinal |
| Ductos de climatizacion | Sistema HVAC (unidad manejadora) |
| Pozo de ascensor, guias, puertas | Ascensor (motor, cabina, control) |
| Red electrica, tableros | Generador electrico |
| Red de agua potable | Sistema tratamiento agua |

Infraestructura registra la **instalacion fisica**; Equipos Industriales registra la **maquinaria** asociada.

Diferencias clave vs otros modulos

| Aspecto | Eq. Medicos | Eq. Industriales | Flota | **Infraestructura** |
|---------|-------------|-----------------|-------|---------------------|
| Parse Class | InventarioEquipoMedico | InventarioEquipoIndustrial | InventarioFlotaVehicular | **InventarioInfraestructura** |
| Entidad | Equipo | Equipo | Vehiculo | **Componente** |
| Clasificacion | servicio/clase | ubicacion/tipoEquipo | tipoVehiculo/asignadoA | **sistema/componente** |
| Campos unicos | criticoApoyo | capacidad, combustible, requiereAutorizacion | patente, VIN, km, docs | **normativa, inspecciones, responsable, descripcion** |
| Frecuencia default | 12 meses | 6 meses | 3 meses | **6 meses** |
| Categorias archivo | calibracion | certificacion, autorizacion | seguro, rev. tecnica | **plano, normativa** |
| Campos totales | 18 | 19 | 24 | **22** |

Notas tecnicas

- **Sistema tiene opciones predefinidas con colores**: 10 sistemas con color distintivo en badge. Tambien carga valores de BD y permite nuevos.

- **Busqueda normalizada**: elimina caracteres especiales, convierte a minusculas. Busca en codigoInterno, componente y descripcion. Se ejecuta en memoria.

- **Campos de inspeccion**: `fechaUltimaInspeccion` y `proximaInspeccion` visibles en tabla como columna.

- **Campo responsable**: responde al requisito INS-3.1 de "responsable designado".

- **Planos y normativa**: categorias exclusivas de este modulo para documentacion tecnica de instalaciones.

- **Historial inmutable**: append-only.

- **Archivos en GridFS**: maximo 20MB, acumulativos.

- **Paginacion server-side**: 25 items por pagina.
