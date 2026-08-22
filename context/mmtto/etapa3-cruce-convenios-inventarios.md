# Etapa 3 — Cruce Inventario-Licitacion e Indicadores de Convenio

## Estado actual (implementado en Equipos Medicos)

Se implemento la sincronizacion automatica de convenios entre licitaciones y el inventario de equipos medicos. A continuacion se documenta **que se hizo** y **por que debe replicarse** a los otros 3 inventarios.

---

## Cambios realizados

### 1. Backend — Funcion `sincronizarConveniosParaTipo(inventarioTipo)`

**Archivo**: `backend/cloud/main.js`

Funcion auxiliar que recibe un tipo de inventario (`medico`, `industrial`, `infraestructura`, `flota`) y ejecuta:

1. **Recalcula el estado de cada Licitacion** asociada al tipo (vigente/vencida/extendida) usando `calcularEstadoLicitacion()`. Si una licitacion vencio desde la ultima sincronizacion, se actualiza su estado en BD.

2. **Recorre LicitacionEquipo** agrupado por equipo. Para cada equipo determina si tiene al menos una licitacion vigente (considerando extensiones de contrato).

3. **Actualiza campos denormalizados** en el equipo del inventario:
   - `convenioActivo` (Boolean) — true si hay licitacion vigente
   - `proveedorRut` (String) — RUT del proveedor con convenio vigente
   - `proveedorNombre` (String) — Nombre del proveedor
   - `numeroLicitacion` (String) — Numero de la licitacion vigente
   - `fechaTerminoConvenio` (String) — Fecha de termino efectiva (con extensiones)

4. **Detecta cambios de proveedor**: si el RUT del proveedor cambio (ej: correccion de datos), actualiza tanto el equipo como el registro pivote.

5. **Limpia equipos huerfanos**: equipos que tenian `convenioActivo = true` pero ya no tienen ninguna asociacion en LicitacionEquipo.

6. **Retorna estadisticas detalladas**:
   - `equiposActualizados`: cuantos equipos cambiaron de estado
   - `equiposConConvenio` / `equiposSinConvenio`: totales
   - `licitacionesVencidas`: cuantas se detectaron como recien vencidas
   - `proveedoresCambiados`: cuantos RUTs se actualizaron

### 2. Backend — Cloud Function `sincronizarConveniosInventario`

Expuesta como cloud function (COORDINATOR+). Acepta `inventarioTipo` opcional; si no se envia, sincroniza los 4 inventarios.

### 3. Backend — Sincronizacion automatica (triggers)

Se llama automaticamente despues de:
- `cargarEquiposLicitacion` — al cargar equipos masivamente desde Excel
- `agregarExtensionLicitacion` — al agregar extension de contrato
- `desasociarEquipoLicitacion` — al quitar un equipo de una licitacion

### 4. Backend — Filtro `convenio` en queries de listado

Se agrego el parametro `convenio` (valores: `con_convenio`, `sin_convenio`) a:
- `getInventarioEquipos`
- `exportarInventarioEquipos`

Los campos de convenio se retornan en el mapeo de resultados de ambas funciones y tambien en `getInventarioEquipoById`.

### 5. Backend — Logica de matching mejorada en `cargarEquiposLicitacion`

Cuando se suben equipos desde Excel:
- Si vienen **ambos** campos (serie + inventario): ambos deben coincidir exactamente
- Si solo viene **serie**: coincidencia exacta en serie
- Si solo viene **inventario**: coincidencia exacta en inventario

### 6. Frontend — Types (`inventario-equipo.types.ts`)

Campos nuevos en `InventarioEquipo`:
```typescript
convenioActivo: boolean;
proveedorRut: string;
proveedorNombre: string;
numeroLicitacion: string;
fechaTerminoConvenio: string;
```

Filtro nuevo en `InventarioEquipoFilters`:
```typescript
convenio?: string; // 'con_convenio' | 'sin_convenio'
```

### 7. Frontend — Service (`inventario-equipo.service.ts`)

`mapItem()` actualizado para incluir los 5 campos nuevos de convenio.

### 8. Frontend — Pagina de inventario (`inventario/page.tsx`)

- **Boton "Actualizar Convenios"** (visible COORDINATOR+): llama a `sincronizarConveniosInventario` con tipo `medico`, muestra estadisticas al completar, refresca la tabla.
- **Filtro "Convenio"**: dropdown con opciones Todos / Con Convenio / Sin Convenio.
- **Columna "Convenio"** en tabla: icono verde (check) para convenio activo, rojo (X) para sin convenio.
- **Excel export** incluye 5 columnas nuevas: En Convenio, RUT Proveedor, Nombre Proveedor, N° Licitacion, Fecha Termino Convenio.

### 9. Frontend — Modal detalle (`InventarioDetailModal.tsx`)

Seccion "Convenio de Mantenimiento" al final de la pestana Detalle:
- Si tiene convenio: muestra RUT, nombre proveedor, N° licitacion, fecha termino
- Si no: muestra "Sin convenio vigente"

---

## Por que replicar a los otros 3 inventarios

### El backend ya soporta los 4 tipos

La funcion `sincronizarConveniosParaTipo` ya opera con los 4 tipos de inventario (`medico`, `industrial`, `infraestructura`, `flota`). El classMap interno resuelve la clase Parse correcta para cada tipo. **No se necesitan cambios backend adicionales** para que funcione con los otros inventarios.

### Lo que falta en cada inventario del frontend

Para cada uno de los 3 inventarios restantes, se deben replicar los mismos cambios del frontend:

#### Inventario Industrial (`/admin/inventario-industrial`)

| Archivo | Cambio |
|---------|--------|
| `types/inventario-industrial.types.ts` | Agregar `convenioActivo`, `proveedorRut`, `proveedorNombre`, `numeroLicitacion`, `fechaTerminoConvenio` a interfaz + `convenio` a filtros |
| `services/inventario-industrial.service.ts` | Agregar campos en `mapItem()` |
| `app/admin/inventario-industrial/page.tsx` | Boton sync (tipo `industrial`), filtro convenio, columna convenio con iconos, export Excel con campos convenio |
| `components/admin/inventario-industrial/InventarioIndustrialDetailModal.tsx` | Seccion convenio en detalle |

#### Inventario Infraestructura (`/admin/infraestructura`)

| Archivo | Cambio |
|---------|--------|
| `types/inventario-infraestructura.types.ts` | Agregar campos convenio a interfaz + filtro |
| `services/inventario-infraestructura.service.ts` | Agregar campos en `mapItem()` |
| `app/admin/infraestructura/page.tsx` | Boton sync (tipo `infraestructura`), filtro convenio, columna convenio, export Excel |
| `components/admin/infraestructura/InfraestructuraDetailModal.tsx` | Seccion convenio en detalle |

#### Flota Vehicular (`/admin/flota-vehicular`)

| Archivo | Cambio |
|---------|--------|
| `types/inventario-flota.types.ts` | Agregar campos convenio a interfaz + filtro |
| `services/inventario-flota.service.ts` | Agregar campos en `mapItem()` |
| `app/admin/flota-vehicular/page.tsx` | Boton sync (tipo `flota`), filtro convenio, columna convenio, export Excel |
| `components/admin/flota-vehicular/FlotaVehicularDetailModal.tsx` | Seccion convenio en detalle |

### Backend — queries de listado de los otros 3 inventarios

Las funciones `getInventarioIndustrial`, `getInventarioInfra`, `getInventarioFlota` (o sus nombres reales) deben:
1. Aceptar el parametro `convenio` (`con_convenio` / `sin_convenio`)
2. Aplicar el filtro `query.equalTo('convenioActivo', true)` o `query.notEqualTo('convenioActivo', true)`
3. Incluir los 5 campos de convenio en el mapeo de resultados
4. Lo mismo para las funciones de export y getById

### Razon de la replicacion

La denormalizacion de `convenioActivo` y `proveedorRut` directamente en los documentos del inventario es una decision de rendimiento: evita JOINs costosos (Parse/MongoDB no soporta joins nativos) cada vez que se lista el inventario. La sincronizacion se ejecuta:

- **Automaticamente** cuando se cargan equipos, se agregan extensiones o se desasocian equipos
- **Manualmente** con el boton "Actualizar Convenios" para detectar licitaciones que vencieron por paso del tiempo

Sin esta replicacion, los otros 3 inventarios no mostrarian:
- Si un equipo tiene convenio activo o no
- Quien es el proveedor responsable del mantenimiento
- Cuando vence el convenio

Esto afecta directamente el cumplimiento de los ambitos EQ e INS del Manual de Acreditacion, donde se requiere trazabilidad de los convenios de mantenimiento preventivo.

---

## Orden de implementacion sugerido

1. **Industrial** — estructura similar a equipos medicos, menor complejidad
2. **Flota Vehicular** — campos de matching diferentes (patente/VIN en lugar de inventario/serie)
3. **Infraestructura** — campos de matching diferentes (codigoInterno en lugar de inventario)

El backend ya maneja estas diferencias en `cargarEquiposLicitacion` (lineas con `invField` y `serieField`), asi que solo se requieren los cambios de frontend listados arriba.
