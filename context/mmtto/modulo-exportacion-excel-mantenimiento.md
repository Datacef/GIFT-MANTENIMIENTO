# Módulo: Exportación de Mantenimientos a Excel + Filtros en Cascada

**Fecha:** 2026-04-12
**Ubicación en la app:** `/admin/mantenimiento`
**Estado:** Implementado

---

## 1. Objetivo

Permitir al usuario **descargar en formato Excel (.xlsx)** el historial de mantenimientos aplicando filtros por fecha, tipo de inventario, equipo e identificadores. El archivo resultante debe contener **únicamente los campos no dinámicos** de la pauta (datos del activo, metadatos del mantenimiento y firmas/validación); las preguntas dinámicas del checklist se excluyen por ser variables entre pautas y por tanto inútiles en una planilla tabular.

Adicionalmente, permitir **buscar un registro específico por su ID de pauta** (`objectId`) usando el mismo identificador que aparece en el Excel, habilitando el flujo: _"Excel → copiar ID → pegar en buscador → ver detalle"_.

---

## 2. Decisiones de diseño

### 2.1 Columnas incluidas en el Excel

| Orden | Columna | Origen |
|---|---|---|
| 1 | **ID Pauta** | `RegistroMantenimiento.objectId` — primera columna para búsqueda inversa |
| 2 | Fecha Mantenimiento | `fecha` |
| 3 | Dominio | `dominio` (labeled) |
| 4 | Tipo Mantenimiento | `tipoMantenimiento` (labeled) |
| 5 | Clasificación Equipo | `clasificacionEquipo` |
| 6 | Estado Validación | `estadoValidacion` (labeled) |
| 7 | Técnico | `tecnicoNombre` |
| 8 | Validador | `validadorNombre` |
| 9 | Fecha Validación | `fechaValidacion` |
| 10 | Motivo Rechazo | `motivoRechazo` |
| 11 | Próximo Mantenimiento | `proximoMantenimiento` |
| 12 | Observaciones Generales | `observacionesGenerales` |
| 13 | Clase Activo | `activoClase` (labeled a `Equipo Médico / Industrial / Flota / Infraestructura`) |
| 14 | ID Activo | `activoId` |
| 15 | Nombre Activo | `activoResumen.nombre` |
| 16 | Identificador | `activoResumen.identificador` (serie/inventario/patente/código) |
| 17 | Estado Activo | `activoResumen.estado` |
| 18 | Ubicación | `activoResumen.ubicacion` |
| 19 | Fecha Creación | `createdAt` |
| 20 | Fecha Actualización | `updatedAt` |

### 2.2 Columnas excluidas (y por qué)

- **Checklist dinámico** (`checklist.items[]`): cada pauta tiene preguntas distintas por clasificación. Volcar preguntas como columnas haría el Excel inconsistente entre equipos.
- **Fotos adicionales** (`fotosAdicionales`): son URLs blob, no aportan valor tabular.
- **Firmas** (`firmaTecnico`, `firmaValidador`): URLs de imagen, se consultan en la vista de detalle.
- **Archivos adjuntos** (`archivos[]`): array variable, se gestiona en el panel de archivos.

### 2.3 Paginación y el límite de 1000 de Parse

Parse Server limita a **1000 registros por query** (incluso con master key). La exportación trabaja así:

1. El frontend llama a `exportarRegistrosMantenimiento` con `skip=0, pageSize=1000`.
2. La cloud function devuelve `{ results, total, hasMore }`.
3. Si `hasMore === true`, el frontend vuelve a llamar con `skip += results.length`.
4. Se repite hasta que una página traiga menos de 1000 registros (o 0).
5. El modal muestra progreso (`Descargando 1000/3500`).
6. Al completar, se genera el `.xlsx` con `xlsx.writeFile()`.

Esto está encapsulado en `MantenimientoExportService.fetchAll()`.

### 2.4 Nombre del archivo

Formato: `mantenimientos_{dominio}_{desde-YYYY-MM-DD}_{hasta-YYYY-MM-DD}.xlsx`

Si no hay rango de fechas, se añade la fecha actual como sufijo.

---

## 3. Filtros en `/admin/mantenimiento`

Estructura propuesta y aprobada: **cascada visual de lo general a lo específico**.

### Fila 1 — Principales (siempre visibles)

- **Tipo de inventario** (dropdown: todos los dominios o uno específico)
- **Fecha desde** / **Fecha hasta**
- **Buscar** / **Limpiar**

### Fila 2 — Identificadores contextuales

Cambian la etiqueta según el dominio elegido (`IDENTIFICADOR_LABEL_POR_DOMINIO`):

| Dominio | Label del campo identificador |
|---|---|
| Equipo Médico | N° Serie / Inventario |
| Equipo Industrial | N° Serie / Inventario |
| Flota Vehicular | Patente / N° Interno / VIN |
| Infraestructura | Código interno / Serie |

- **Nombre del equipo** (match parcial en `activoResumen.nombre`)
- **ID de la pauta** (búsqueda directa por `objectId` — bypass de todos los otros filtros)

### Fila 3 — Avanzados (colapsables)

- Tipo de mantenimiento (preventivo/correctivo/predictivo)
- Estado de validación (pendiente/aprobado/rechazado)
- Técnico

### Justificación del orden

1. **Dominio primero** → acota el universo a 1/4 y habilita los identificadores correctos.
2. **Fechas** → filtro más usado (reportes mensuales de acreditación).
3. **Identificador contextual** → específico al dominio, permite búsqueda directa por n° serie/patente/etc.
4. **Nombre** → alternativa cuando no se conoce el identificador.
5. **ID pauta** → atajo para búsqueda inversa desde Excel.
6. **Avanzados colapsados** → no contaminan la UI para uso común.

---

## 4. Contrato de la cloud function `exportarRegistrosMantenimiento`

```js
Parse.Cloud.run('exportarRegistrosMantenimiento', {
  dominio?: string,
  tipoMantenimiento?: string,
  estadoValidacion?: string,
  fechaDesde?: string,      // YYYY-MM-DD
  fechaHasta?: string,      // YYYY-MM-DD
  tecnicoNombre?: string,
  identificador?: string,   // filtrado en memoria (serie/patente/etc.)
  nombreActivo?: string,    // filtrado en memoria
  skip?: number,            // default 0
  pageSize?: number,        // default 1000, max 1000
});
// Respuesta:
// { results: RegistroMantenimientoExport[], total: number, pageSize: number, hasMore: boolean }
```

**Nivel de acceso:** VIEWER (1) — todos los usuarios autenticados.

**Nota sobre `identificador` y `nombreActivo`:** Parse no permite consultas directas sobre campos anidados dentro de `activoResumen` (es un objeto JSON embebido). Se filtra en memoria tras la query principal. Esto reduce el total efectivo por página pero mantiene consistencia con la normalización (quita guiones, espacios, puntos).

---

## 5. Modificación al filtro `getRegistrosMantenimiento`

Se añadieron dos parámetros:

- `registroId`: si viene, se hace un `Query.get()` directo y se bypassea el resto de filtros.
- `tecnicoNombre`: filtro exacto con `contains` (por si hay homónimos).

---

## 6. Mapa de archivos tocados

### Creados
- `backend/cloud/main.js` → nueva función `exportarRegistrosMantenimiento`
- `frontend/src/services/mantenimiento-export.service.ts`
- `frontend/src/utils/excel-mantenimiento.ts`
- `frontend/src/components/admin/mantenimiento/FiltrosMantenimiento.tsx`
- `frontend/src/components/admin/mantenimiento/ModalExportarExcel.tsx`

### Modificados
- `backend/cloud/main.js` → `getRegistrosMantenimiento` acepta `registroId` y `tecnicoNombre`
- `frontend/src/types/mantenimiento.types.ts` → nuevos tipos `MantenimientoExportFilters`, `RegistroMantenimientoExport`, constante `IDENTIFICADOR_LABEL_POR_DOMINIO`, filtro `registroId` en `MantenimientoFilters`
- `frontend/src/app/admin/mantenimiento/page.tsx` → integra filtros, paginación de listado y botón de exportación

---

## 7. Flujos clave de usuario

### 7.1 Exportar mantenimientos de un solo equipo

1. Usuario selecciona **Tipo de inventario** (ej. Equipo Médico).
2. Ingresa el **N° Serie** en el campo Identificador (ej. `SN-12345`).
3. Opcionalmente acota por **fechas**.
4. Click en **Buscar** → ve en tabla el historial.
5. Click en **Exportar a Excel** → modal con resumen de filtros y progreso.
6. Se descarga `mantenimientos_equipoMedico_desde-2026-01-01_hasta-2026-04-12.xlsx`.

### 7.2 Búsqueda inversa desde Excel

1. Usuario abre un Excel exportado previamente.
2. Copia el valor de la columna **ID Pauta**.
3. Lo pega en el campo **ID de la pauta** en `/admin/mantenimiento`.
4. Click en **Buscar** → aparece únicamente ese registro.
5. Click en el ícono de detalle → navega a `/admin/mantenimiento/[id]`.

---

## 8. Consideraciones de performance

- La función paginada no cuenta el total en cada llamada (solo en `skip=0`). Esto evita un `count()` caro por cada bloque.
- El ordenamiento combinado `descending('fecha')` + `ascending('objectId')` da una paginación estable incluso con empates de fecha.
- Para volúmenes > 10.000 registros, el modal muestra progreso continuo; no bloquea la UI porque las páginas son secuenciales con `await`.
- La carga de la librería `xlsx` es dinámica (`await import('xlsx')`) para no inflar el bundle inicial.
