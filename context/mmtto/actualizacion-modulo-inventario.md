# Actualizacion del Modulo de Inventario — Plan de Implementacion

## Contexto y Objetivo

El sistema de mantenimiento actualmente cuenta con 4 modulos de inventario operativos:

| Modulo | Parse Class | Ruta | Estado actual |
|--------|------------|------|---------------|
| Equipos Medicos | `InventarioEquipoMedico` | `/admin/inventario` | Completo (CRUD, historial, archivos, import/export) |
| Equipos Industriales | `InventarioEquipoIndustrial` | `/admin/inventario-industrial` | Completo |
| Infraestructura | `InventarioInfraestructura` | `/admin/infraestructura` | Completo |
| Flota Vehicular | `InventarioFlotaVehicular` | `/admin/flota-vehicular` | Completo |

**Lo que falta**: no existe gestion de proveedores ni licitaciones, no hay cruce entre proveedores y equipos en convenio, y no existe el campo "calidad del equipo" (propio/arriendo/comodato/cedido).

### Nuevas funcionalidades requeridas

1. **CRUD de Proveedores** con datos completos (RUT, nombre, contacto, direccion, descripcion)
2. **Gestion de Licitaciones** asociadas a proveedores, con fechas, extensiones de contrato y segregacion por inventario
3. **Carga masiva de equipos por licitacion** via Excel con formato especifico por inventario
4. **Cruce automatico licitacion-inventario** que asigne el RUT del proveedor a cada equipo en convenio
5. **Indicadores visuales de convenio** (ticket verde/rojo) en las tablas de inventario con filtro convenio/sin convenio
6. **Historial de licitaciones** por equipo y proveedor
7. **Campo "Calidad del equipo"** (PROPIO, ARRIENDO, COMODATO, CEDIDO) en equipos medicos, industriales y flota vehicular
8. **Las cargas masivas si no encuentra el equipo en el inventario, debe enviar mensaje con los equipos no encontrados, con posiblidad de desgar en el excel esos equipos**

---

## Modelo de datos nuevo

### Parse Class: `Proveedor`

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| rut | String | Si | RUT del proveedor (unico, formato XX.XXX.XXX-X) |
| nombre | String | Si | Razon social |
| correo | String | No | Email de contacto |
| telefono | String | No | Telefono de contacto |
| direccion | String | No | Direccion |
| descripcion | String | No | Descripcion o giro comercial |
| activo | Boolean | No | Default: true |
| creadoPor | String | Auto | userId del creador |

### Parse Class: `Licitacion`

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| proveedorId | Pointer(Proveedor) | Si | Referencia al proveedor adjudicatario |
| numeroLicitacion | String | Si | Numero o codigo de la licitacion |
| inventarioDestino | String | Si | `medico`, `industrial`, `infraestructura`, `flota` |
| fechaInicio | Date | Si | Fecha de inicio del contrato |
| fechaTermino | Date | Si | Fecha de termino del contrato |
| extensiones | Array | No | Array de `{ fechaExtension, nuevaFechaTermino, descripcion }` |
| estado | String | Auto | `vigente`, `vencida`, `extendida` (calculado segun fechas) |
| activo | Boolean | No | Default: true |
| creadoPor | String | Auto | userId |

### Parse Class: `LicitacionEquipo`

Tabla pivote que asocia equipos de cualquier inventario con una licitacion.

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| licitacionId | Pointer(Licitacion) | Si | Referencia a la licitacion |
| proveedorRut | String | Si | RUT del proveedor (denormalizado para consulta rapida) |
| equipoId | String | Si | objectId del equipo en su inventario |
| inventarioTipo | String | Si | `medico`, `industrial`, `infraestructura`, `flota` |
| nombreEquipo | String | No | Denormalizado para vistas rapidas |
| marca | String | No | Denormalizado |
| modelo | String | No | Denormalizado |
| serie | String | No | Denormalizado |
| inventario | String | No | Codigo de inventario denormalizado |

### Campos nuevos en inventarios existentes

| Campo | Aplica a | Tipo | Descripcion |
|-------|----------|------|-------------|
| `calidadEquipo` | Eq. Medicos, Eq. Industriales, Flota | String | `PROPIO`, `ARRIENDO`, `COMODATO`, `CEDIDO` |
| `convenioActivo` | Los 4 inventarios | Boolean | Calculado: true si existe LicitacionEquipo vigente |
| `proveedorRut` | Los 4 inventarios | String | RUT del proveedor con convenio vigente (denormalizado) |

> **Nota sobre `convenioActivo` y `proveedorRut`**: se denormalizan en el equipo para evitar JOINs costosos en las consultas de listado. Se actualizan automaticamente al cargar/actualizar licitaciones.

---

## Plan de Implementacion en 4 Etapas

### ETAPA 1 — CRUD de Proveedores y Licitaciones

**Objetivo**: Crear el modulo de proveedores y licitaciones como entidad independiente, sin afectar los inventarios existentes.

#### Backend (Cloud Functions)

**Proveedores:**
- `createProveedor` — COORDINATOR (3). Valida RUT unico y obligatorio, nombre obligatorio.
- `updateProveedor` — COORDINATOR (3). Registra historial de cambios.
- `deleteProveedor` — SUPER_ADMIN (5). Solo si no tiene licitaciones activas.
- `getProveedores` — VIEWER (1). Paginado con filtros: busqueda (RUT, nombre), activo.
- `getProveedorById` — VIEWER (1). Incluye lista de licitaciones asociadas.

**Licitaciones:**
- `createLicitacion` — COORDINATOR (3). Valida proveedorId, numero, fechas, inventarioDestino.
- `updateLicitacion` — COORDINATOR (3). Registra cambios.
- `deleteLicitacion` — SUPER_ADMIN (5). Solo si no tiene equipos asociados.
- `getLicitaciones` — VIEWER (1). Filtros: proveedorId, inventarioDestino, estado (vigente/vencida), busqueda.
- `getLicitacionById` — VIEWER (1). Incluye proveedor y conteo de equipos.
- `agregarExtensionLicitacion` — COORDINATOR (3). Agrega extension al array, actualiza fechaTermino efectiva, registra historial.

**Parse Classes nuevas:** `Proveedor`, `Licitacion`, `ProveedorHistorial`, `LicitacionHistorial`

#### Frontend

**Ruta nueva:** `/admin/proveedores`

**Componentes:**
- `src/app/admin/proveedores/page.tsx` — Pagina principal con tabla de proveedores
- `src/components/admin/proveedores/ProveedorFormModal.tsx` — CRUD proveedor
- `src/components/admin/proveedores/ProveedorDetailModal.tsx` — Detalle con pestanas: Datos, Licitaciones, Historial
- `src/components/admin/proveedores/LicitacionFormModal.tsx` — CRUD licitacion (anidado en proveedor)
- `src/components/admin/proveedores/LicitacionDetailModal.tsx` — Detalle licitacion con lista de equipos y extensiones
- `src/components/admin/proveedores/ExtensionFormModal.tsx` — Formulario para agregar extension de contrato
- `src/services/proveedor.service.ts`
- `src/services/licitacion.service.ts`
- `src/types/proveedor.types.ts`
- `src/types/licitacion.types.ts`

**Sidebar:** Agregar entrada "Proveedores" en `routes.tsx` (acceso OPERATOR+)

**Flujo de uso:**
1. Crear proveedor con datos basicos (RUT, nombre, contacto)
2. Dentro del proveedor, crear licitacion indicando inventario destino, numero y fechas
3. Un proveedor puede tener multiples licitaciones en distintos inventarios
4. Las extensiones se agregan desde el detalle de la licitacion

#### Entregable Etapa 1
- Modulo de proveedores funcional con CRUD completo
- Modulo de licitaciones funcional con extensiones de contrato
- Historial auditado de cambios en proveedores y licitaciones
- Sin conexion con inventarios todavia

---

### ETAPA 2 — Carga Masiva de Equipos por Licitacion y Tabla Pivote

**Objetivo**: Permitir cargar equipos desde Excel asociados a una licitacion y crear la asociacion licitacion-equipo.

#### Backend (Cloud Functions)

**Asociacion licitacion-equipo:**
- `cargarEquiposLicitacion` — COORDINATOR (3). Recibe `licitacionId` + array de equipos desde Excel. Para cada equipo:
  1. Busca en el inventario correspondiente por `serie` + `inventario` (coincidencia exacta normalizada)
  2. Si encuentra: crea `LicitacionEquipo` con la asociacion
  3. Si NO encuentra: reporta como "equipo no encontrado" en el resultado
  4. Retorna `{ asociados, noEncontrados, errores, total }`
- `getEquiposLicitacion` — VIEWER (1). Lista equipos asociados a una licitacion.
- `desasociarEquipoLicitacion` — COORDINATOR (3). Elimina asociacion individual.

**Parse Class nueva:** `LicitacionEquipo`

#### Frontend

**En el detalle de la licitacion (`LicitacionDetailModal`):**
- Pestana "Equipos en Convenio" con tabla de equipos asociados
- Boton "Cargar Equipos (Excel)" — abre selector de archivo
- Boton "Descargar Formato" — genera Excel con columnas segun inventarioDestino:
  - **Medicos/Industriales**: nombreEquipo, marca, modelo, inventario, serie
  - **Infraestructura**: componente, marca, modelo, codigoInterno, serie
  - **Flota**: tipoVehiculo, marca, modelo, patente, VIN
- Resultado de carga muestra resumen (asociados vs no encontrados) con detalle de errores

**Componentes nuevos:**
- `src/components/admin/proveedores/LicitacionEquiposPanel.tsx` — Lista y carga de equipos
- `src/components/admin/proveedores/CargaMasivaResultModal.tsx` — Resumen de resultado de carga

**Flujo de uso:**
1. Desde el detalle de una licitacion, descargar formato Excel segun inventario
2. Completar con los equipos que cubre la licitacion
3. Cargar el Excel → el sistema cruza por serie/inventario y asocia
4. Revisar resultado: equipos encontrados vs no encontrados
5. Los no encontrados pueden cargarse primero al inventario correspondiente y luego reintentar

#### Entregable Etapa 2
- Carga masiva funcional con formatos diferenciados por inventario
- Tabla pivote `LicitacionEquipo` operativa
- Vista de equipos asociados a cada licitacion
- Proceso de match por serie/inventario con reporte de discrepancias

---

### ETAPA 3 — Cruce Inventario-Licitacion e Indicadores Visuales

**Objetivo**: Reflejar el estado de convenio en cada inventario y permitir filtrar por convenio/sin convenio.

#### Backend (Cloud Functions)

**Actualizacion de campos denormalizados:**
- `sincronizarConveniosInventario` — ADMIN (4). Recorre `LicitacionEquipo` y actualiza `convenioActivo` y `proveedorRut` en cada equipo segun licitaciones vigentes. Se ejecuta:
  - Automaticamente al finalizar `cargarEquiposLicitacion`
  - Automaticamente al agregar extension o cambiar fechas de licitacion
  - Manualmente desde un boton de admin "Sincronizar convenios"

**Logica de estado de convenio:**
- `convenioActivo = true` si existe al menos una `LicitacionEquipo` cuya `Licitacion` tenga `fechaTermino >= hoy` (considerando extensiones)
- `convenioActivo = false` si todas las licitaciones asociadas estan vencidas o no tiene ninguna
- Al adjudicar nueva licitacion y cargar equipos: se actualizan los nuevos. Los que estaban en la licitacion anterior pero no en la nueva → `convenioActivo = false`
- `proveedorRut` = RUT del proveedor de la licitacion vigente mas reciente

**Modificaciones a Cloud Functions existentes de listado:**
- `getInventarioEquipos` — agregar filtro `convenio` (valores: `todos`, `con_convenio`, `sin_convenio`)
- `getInventarioIndustrial` — idem
- `getInventarioInfra` — idem
- `getInventarioFlota` (nombre real a verificar) — idem
- Cada funcion `getById` retorna tambien `convenioActivo`, `proveedorRut`

#### Frontend — Modificaciones a los 4 inventarios

**Tabla de listado (los 4 modulos):**
- Nueva columna "Convenio" despues de Estado: muestra icono de ticket
  - Verde con check: convenio activo
  - Rojo con X: sin convenio o convenio vencido
  - Sin icono: nunca ha tenido convenio
- Nuevo filtro "Convenio": `Todos | Con Convenio | Sin Convenio`

**Modal de detalle (los 4 modulos):**
- En la pestana Detalle, seccion nueva "Convenio de Mantenimiento":
  - Si tiene convenio activo: muestra RUT y nombre del proveedor (link al proveedor), numero de licitacion, fecha de termino
  - Si no tiene: muestra "Sin convenio vigente"

**Archivos a modificar por cada inventario:**
- `page.tsx` — agregar filtro y columna
- `DetailModal.tsx` — agregar seccion convenio en pestana Detalle
- `types.ts` — agregar campos `convenioActivo`, `proveedorRut` a la interfaz

#### Entregable Etapa 3
- Campos `convenioActivo` y `proveedorRut` sincronizados en los 4 inventarios
- Indicadores visuales (ticket verde/rojo) en las 4 tablas de inventario
- Filtro por convenio en los 4 inventarios
- Detalle del convenio visible en el modal de detalle de cada equipo
- Sincronizacion automatica al cargar licitaciones y manual desde admin

---

### ETAPA 4 — Campo "Calidad del Equipo" y Ajustes Finales

**Objetivo**: Agregar el campo de tipo de propiedad a los inventarios correspondientes y cerrar funcionalidades transversales.

#### 4A. Campo "Calidad del Equipo"

**Aplica a:** Equipos Medicos, Equipos Industriales, Flota Vehicular (NO infraestructura)

**Valores:** `PROPIO`, `ARRIENDO`, `COMODATO`, `CEDIDO`

| Valor | Descripcion | Color badge |
|-------|-------------|-------------|
| PROPIO | Equipo adquirido por el establecimiento | Verde |
| ARRIENDO | Equipo en arriendo con contrato vigente | Azul |
| COMODATO | Equipo cedido sin costo por proveedor/otro organismo | Amarillo |
| CEDIDO | Equipo transitorio, cedido por periodo definido | Naranja |

**Backend — Modificaciones:**
- `createInventarioEquipo` / `updateInventarioEquipo` — aceptar campo `calidadEquipo`
- `createInventarioIndustrial` / `updateInventarioIndustrial` — idem
- Cloud functions de flota vehicular — idem
- Import/export de los 3 modulos — incluir columna `calidadEquipo`

**Frontend — Modificaciones en 3 modulos:**
- `FormModal` — agregar select "Calidad" con las 4 opciones
- `DetailModal` — mostrar badge con color
- `page.tsx` — agregar columna "Calidad" en tabla, agregar filtro
- `types.ts` — agregar `calidadEquipo` a la interfaz
- Templates de importacion — agregar columna

#### 4B. Historial consolidado por proveedor

**En el detalle del proveedor**, pestana "Historial":
- Timeline unificada que muestra: cambios al proveedor, licitaciones creadas/modificadas, equipos asociados/desasociados, extensiones de contrato

#### 4C. Dashboard de convenios (opcional)

**Vista resumen** en la pagina de proveedores:
- Total proveedores activos
- Total licitaciones vigentes / por vencer (30 dias) / vencidas
- Distribucion por inventario
- Equipos con convenio vs sin convenio por inventario

#### Entregable Etapa 4
- Campo `calidadEquipo` funcional en 3 inventarios (formulario, tabla, filtro, detalle, import/export)
- Historial consolidado de proveedores
- Ajustes finales de UX y validaciones

---

## Resumen de impacto por archivo existente

### Backend (`backend/cloud/main.js`)

| Etapa | Accion |
|-------|--------|
| 1 | Agregar Cloud Functions de Proveedor (~10 funciones) y Licitacion (~8 funciones) |
| 2 | Agregar funciones de LicitacionEquipo (~4 funciones) |
| 3 | Modificar 4 funciones `getInventario*` para filtro convenio. Agregar `sincronizarConveniosInventario` |
| 4 | Modificar 6 funciones `create/update` para campo `calidadEquipo`. Modificar import/export |

> **Considerar**: si `main.js` crece demasiado, evaluar separar en archivos por dominio (ej: `cloud/proveedores.js`, `cloud/licitaciones.js`)

### Frontend — Archivos nuevos

| Etapa | Archivos nuevos |
|-------|----------------|
| 1 | ~8 componentes + 2 services + 2 types (modulo proveedores completo) |
| 2 | ~2 componentes (carga masiva y resultado) |
| 3 | Ninguno nuevo — solo modificaciones |
| 4 | Ninguno nuevo — solo modificaciones |

### Frontend — Archivos existentes modificados

| Archivo | Etapa | Cambio |
|---------|-------|--------|
| `src/routes.tsx` | 1 | Agregar entrada "Proveedores" en sidebar |
| `src/app/admin/inventario/page.tsx` | 3, 4 | Filtro convenio, columna convenio, filtro calidad, columna calidad |
| `src/app/admin/inventario-industrial/page.tsx` | 3, 4 | Idem |
| `src/app/admin/infraestructura/page.tsx` | 3 | Solo filtro y columna convenio (sin calidad) |
| `src/app/admin/flota-vehicular/page.tsx` | 3, 4 | Filtro convenio, columna convenio, filtro calidad, columna calidad |
| `src/components/admin/inventario/InventarioDetailModal.tsx` | 3 | Seccion convenio |
| `src/components/admin/inventario/InventarioFormModal.tsx` | 4 | Select calidad |
| `src/components/admin/inventario-industrial/InventarioIndustrialDetailModal.tsx` | 3 | Seccion convenio |
| `src/components/admin/inventario-industrial/InventarioIndustrialFormModal.tsx` | 4 | Select calidad |
| `src/components/admin/infraestructura/InfraestructuraDetailModal.tsx` | 3 | Seccion convenio |
| `src/components/admin/flota-vehicular/FlotaVehicularDetailModal.tsx` | 3 | Seccion convenio |
| `src/components/admin/flota-vehicular/FlotaVehicularFormModal.tsx` | 4 | Select calidad |
| `src/types/inventario-equipo.types.ts` | 3, 4 | Campos convenio + calidad |
| `src/types/inventario-industrial.types.ts` | 3, 4 | Idem |
| `src/types/inventario-infraestructura.types.ts` | 3 | Solo campos convenio |
| `src/types/inventario-flota.types.ts` | 3, 4 | Campos convenio + calidad |
| `src/services/inventario-equipo.service.ts` | 3 | Parametro filtro convenio |
| `src/services/inventario-industrial.service.ts` | 3 | Idem |
| `src/services/inventario-infraestructura.service.ts` | 3 | Idem |
| `src/services/inventario-flota.service.ts` | 3 | Idem |

---

## Dependencias entre etapas

```
Etapa 1 (Proveedores + Licitaciones)
  └──► Etapa 2 (Carga masiva + Tabla pivote)
         └──► Etapa 3 (Cruce con inventarios + indicadores)
                └──► Etapa 4 (Calidad equipo + ajustes finales)
```

- **Etapa 1 es independiente** — no modifica nada existente
- **Etapa 2 depende de Etapa 1** — necesita proveedores y licitaciones
- **Etapa 3 depende de Etapa 2** — necesita la tabla pivote para cruzar
- **Etapa 4A (calidad) es independiente** — podria implementarse en paralelo con cualquier etapa, pero se deja al final para no interferir con las pruebas de las etapas anteriores

## Consideraciones tecnicas

- **Validacion de RUT**: implementar algoritmo de validacion de RUT chileno (modulo 11) en backend
- **Denormalizacion**: los campos `convenioActivo` y `proveedorRut` en los inventarios son denormalizados por rendimiento. La fuente de verdad es `LicitacionEquipo` + `Licitacion`
- **Vencimiento automatico**: considerar un job periodico o calculo en tiempo de consulta para detectar licitaciones vencidas y actualizar `convenioActivo`
- **Permisos**: el modulo de proveedores sigue el mismo esquema de acceso (VIEWER ve, OPERATOR crea, COORDINATOR edita, SUPER_ADMIN elimina)
