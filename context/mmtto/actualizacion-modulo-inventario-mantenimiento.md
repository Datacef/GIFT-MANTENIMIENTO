# Actualizacion Modulo Inventario — Seguimiento de Cumplimiento de Mantenimientos

## Contexto y Objetivo

Actualmente los 4 modulos de inventario (`InventarioEquipoMedico`, `InventarioEquipoIndustrial`, `InventarioFlotaVehicular`, `InventarioInfraestructura`) mantienen el campo `frecuencia` (meses entre mantenimientos) y una fecha base (`fechaAdquisicion` o `fechaInstalacion`), pero **no exponen cuando fue el ultimo mantenimiento realizado ni si los periodos esperados desde la adquisicion se han cumplido**.

El modulo central de mantenimiento (`RegistroMantenimiento`) ya guarda cada ejecucion con `activoId`, `activoClase`, `fecha` y `estadoValidacion`. Sin embargo, esta informacion solo se consulta explicitamente (via `getMantenimientosActivo`) y no esta reflejada en los listados ni en los detalles del inventario.

### Necesidad de negocio

1. **Visibilidad operativa**: el coordinador necesita saber de un vistazo cuando se realizo el ultimo mantenimiento de cada activo y cuando corresponde el proximo.
2. **Trazabilidad de cumplimiento**: el sistema debe ser capaz de indicar, para cualquier activo, si **todos los mantenimientos esperados** desde su fecha de adquisicion / instalacion se han ejecutado y aprobado, o si existen **periodos faltantes** (gaps en el historial).
3. **Evidencia para acreditacion**: los estandares EQ 2.1, EQ 2.2, INS 3.1, INS 3.2 exigen constancia de ejecucion periodica. Un indicador de cumplimiento automatizado ayuda a priorizar la regularizacion antes de auditorias.
4. **Priorizacion**: permitir filtrar activos por estado de cumplimiento (al dia, con retraso, critico) para dirigir los recursos de mantenimiento.

### Alcance de la nueva caracteristica

- Agregar al inventario los campos calculados: **fecha ultimo mantenimiento, proxima fecha esperada, cumplimiento de periodos, porcentaje de cumplimiento, estado de cumplimiento**.
- Mostrar estos datos en tablas, filtros y modales de detalle de los 4 inventarios.
- Visualizar una **linea de tiempo de periodos** con el historial cumplido vs faltantes para cada activo.
- Proveer un dashboard de cumplimiento a nivel global para priorizar intervenciones.
- Mantener la fuente de verdad en `RegistroMantenimiento` (los campos del inventario son denormalizados por rendimiento).

### Fuera de alcance (intencionalmente NO se incluye)

- No se modifica la logica del wizard de mantenimiento (`/admin/mantenimiento/nuevo`) ni el flujo de validacion.
- No se alteran los datos historicos ya existentes en `RegistroMantenimiento`.
- No se implementa generacion automatica de ordenes de trabajo (esto queda como extension opcional).
- No se modifica el modulo de solicitudes/ordenes de trabajo (aunque la Etapa 4 puede engancharse).

---

## Modelo mental del cumplimiento

### Parametros de entrada

Por cada activo se calculan a partir de:

| Parametro | Fuente | Descripcion |
|-----------|--------|-------------|
| `fechaBase` | `fechaAdquisicion` (medicos, flota) o `fechaInstalacion` (industriales, infra) | Fecha desde la que se contabilizan los periodos |
| `frecuencia` | Campo `frecuencia` del activo (meses) | Intervalo esperado entre mantenimientos |
| `fechaActual` | Fecha del servidor al momento del calculo | Corte para contar periodos transcurridos |
| `historial` | `RegistroMantenimiento` filtrado por `activoId` + `activoClase` + `estadoValidacion='aprobado'` + `activo=true`, ordenado por `fecha` ascendente | Mantenimientos efectivamente aprobados |

> **Nota sobre validacion**: solo se consideran registros con `estadoValidacion = 'aprobado'`. Los registros en estado `pendiente` o `rechazado` NO cuentan como cumplimiento. Esto asegura que la metrica refleje constancia real, no intentos.

### Algoritmo de calculo

```
# Pseudocodigo del calculo de cumplimiento

Si frecuencia <= 0 o fechaBase vacia:
    estado = "sin_configuracion"
    return { periodos: [], cumplimientoPorcentaje: 0, ... }

Si fechaBaja esta definida y fechaBaja <= fechaActual:
    # Activo dado de baja: solo se evalua hasta la fecha de baja
    fechaCorte = fechaBaja
Sino:
    fechaCorte = fechaActual

# Generar ventanas teoricas desde fechaBase hasta fechaCorte
periodos = []
fechaInicioPeriodo = fechaBase
i = 0
Mientras fechaInicioPeriodo <= fechaCorte:
    fechaFinPeriodo = addMeses(fechaInicioPeriodo, frecuencia)
    periodos.push({
        indice: i,
        desde: fechaInicioPeriodo,
        hasta: fechaFinPeriodo,
        estado: "pendiente"  # se completa en la siguiente fase
    })
    fechaInicioPeriodo = fechaFinPeriodo
    i++

# Emparejar cada mantenimiento aprobado con el periodo que le corresponde
# Un mantenimiento aprobado "cubre" el periodo si su fecha esta dentro del rango
# [desde, hasta). Si varios caen en el mismo periodo, se considera cumplido UNA vez
# y los adicionales se marcan como "extra" (no cuentan doble).
para cada registro en historial:
    periodo = periodos.find(p => registro.fecha >= p.desde && registro.fecha < p.hasta)
    si periodo y periodo.estado != "cumplido":
        periodo.estado = "cumplido"
        periodo.registroId = registro.id
        periodo.fechaRealizado = registro.fecha
    sino si periodo:
        periodo.extras.push({ registroId: registro.id, fecha: registro.fecha })

# Para los periodos no cubiertos
para cada periodo no "cumplido":
    si periodo.hasta > fechaActual:
        periodo.estado = "en_curso"      # periodo vigente que aun no vence
    sino:
        periodo.estado = "faltante"      # periodo cerrado sin ejecucion

# Metricas agregadas
periodosEsperados = cantidad de periodos con estado != "en_curso"
periodosCumplidos = cantidad de periodos con estado == "cumplido"
periodosFaltantes = cantidad de periodos con estado == "faltante"

cumplimientoPorcentaje = (periodosCumplidos / periodosEsperados) * 100

# Estado general
si historial vacio y periodosEsperados > 0:
    estadoCumplimiento = "sin_historial"
sino si periodosFaltantes == 0:
    estadoCumplimiento = "al_dia"
sino si periodosFaltantes <= 1:
    estadoCumplimiento = "con_retraso"
sino:
    estadoCumplimiento = "critico"

# Ultimo mantenimiento y proximo esperado
ultimoMtto = ultimo registro aprobado del historial
proximoEsperado = periodos.find(p => p.estado == "en_curso").hasta
                  o periodos.find(p => p.estado == "faltante").hasta
```

### Estados posibles

| Estado | Condicion | Color badge | Descripcion |
|--------|-----------|-------------|-------------|
| `sin_configuracion` | `frecuencia <= 0` o sin `fechaBase` | Gris | No se puede calcular: falta configuracion del activo |
| `sin_historial` | Hay periodos esperados pero el activo no tiene ningun mantenimiento aprobado | Rojo oscuro | El equipo existe pero nunca se ha registrado mantenimiento |
| `al_dia` | `periodosFaltantes == 0` | Verde | Todos los periodos esperados estan cubiertos |
| `con_retraso` | `periodosFaltantes == 1` | Amarillo | Falta solo el ultimo periodo (puede ser en ejecucion o atrasado) |
| `critico` | `periodosFaltantes >= 2` | Rojo | Multiples periodos sin ejecutar — requiere regularizacion urgente |
| `dado_de_baja` | `fechaBaja` vigente | Gris oscuro | Activo fuera de servicio — no se exige mantenimiento posterior a la baja |

### Casos borde documentados

1. **Activo sin `frecuencia` configurada** → `sin_configuracion`. No se calculan periodos. El coordinador debe completar la ficha primero.
2. **Activo con `fechaAdquisicion` posterior a hoy** → no hay periodos; el calculo devuelve `periodos = []` y `estadoCumplimiento = "al_dia"` (no corresponde aun).
3. **Activo dado de baja** → la linea de tiempo se corta en `fechaBaja`. Si hubo mantenimientos posteriores a la baja, se listan como informativos pero no afectan el calculo.
4. **Mantenimientos rechazados** → NO cuentan como cumplimiento. Se muestran en la pestana de mantenimientos del detalle con badge rojo, pero el periodo correspondiente sigue en estado `faltante`.
5. **Mantenimientos pendientes de validacion** → se muestran como "en validacion" en el timeline pero tampoco cierran el periodo hasta su aprobacion.
6. **Varios mantenimientos en el mismo periodo** → cuentan como cumplido UNA vez. Los adicionales quedan registrados como `extras` del periodo y se listan como "mantenimiento adicional fuera de plan" en el timeline.
7. **Mantenimientos anteriores a `fechaBase`** → se listan en el timeline como "fuera de plan" pero no cierran periodos teoricos.

---

## Modelo de datos — campos nuevos

### Campos calculados denormalizados en cada Parse Class del inventario

Se agregan a `InventarioEquipoMedico`, `InventarioEquipoIndustrial`, `InventarioFlotaVehicular`, `InventarioInfraestructura`:

| Campo | Tipo | Descripcion | Default |
|-------|------|-------------|---------|
| `ultimaFechaMantenimiento` | String (YYYY-MM-DD) | Fecha del ultimo mantenimiento aprobado | `""` |
| `ultimoRegistroMantenimientoId` | String | objectId de `RegistroMantenimiento` referenciado | `""` |
| `ultimoTipoMantenimiento` | String | `preventivo` \| `correctivo` \| `predictivo` del ultimo aprobado | `""` |
| `proximaFechaMantenimientoEsperada` | String (YYYY-MM-DD) | Calculada como `ultimaFechaMantenimiento + frecuencia` (si hay historial) o `fechaBase + frecuencia * (periodosTranscurridos + 1)` (si no hay) | `""` |
| `periodosEsperados` | Number | Cantidad de periodos cerrados desde `fechaBase` hasta hoy | `0` |
| `periodosCumplidos` | Number | Cantidad de periodos con mantenimiento aprobado | `0` |
| `periodosFaltantes` | Number | `periodosEsperados - periodosCumplidos` | `0` |
| `cumplimientoPorcentaje` | Number (0-100) | `(periodosCumplidos / periodosEsperados) * 100` (redondeado a 1 decimal) | `0` |
| `estadoCumplimientoMantenimiento` | String | `sin_configuracion` \| `sin_historial` \| `al_dia` \| `con_retraso` \| `critico` \| `dado_de_baja` | `"sin_configuracion"` |
| `ultimoCalculoCumplimiento` | Date | Timestamp del ultimo recalculo (para auditoria y evitar recalculos innecesarios) | `null` |
| `ultimoEstadoMantenimiento` | String | Estado del registro al que corresponde `ultimaFechaMantenimiento`: `pendiente` \| `aprobado` \| `rechazado` \| `sin_historial`. **Usado por Etapas 5 y 6** para diferenciar visualmente si la fecha refleja un mantenimiento validado o uno en espera de validacion | `"sin_historial"` |

> **Justificacion de la denormalizacion**: los listados del inventario pueden tener miles de activos y la UI requiere filtrar/ordenar por estos campos en tiempo real. Un calculo on-demand por cada fila haria N+1 queries. Los campos se mantienen sincronizados desde triggers en `RegistroMantenimiento`.

### Nueva Parse Class: `CumplimientoMantenimientoPeriodo` (opcional — ver Etapa 4)

Tabla auxiliar para persistir la linea de tiempo calculada y evitar recalculos repetidos en el detalle:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `activoId` | String | objectId del activo |
| `activoClase` | String | `InventarioEquipoMedico`, etc. |
| `dominio` | String | `equipoMedico`, `equipoIndustrial`, `flotaVehicular`, `infraestructura` |
| `indice` | Number | Numero de periodo (0-based) |
| `fechaDesde` | String (YYYY-MM-DD) | Inicio del periodo |
| `fechaHasta` | String (YYYY-MM-DD) | Fin del periodo |
| `estado` | String | `cumplido` \| `faltante` \| `en_curso` |
| `registroId` | String | objectId de `RegistroMantenimiento` que cubre el periodo (si aplica) |
| `fechaRealizado` | String | Fecha del mantenimiento que cubre el periodo |
| `extras` | Array | `[{ registroId, fecha }]` de mantenimientos adicionales en el mismo periodo |
| `calculadoEn` | Date | Timestamp del calculo |

> **Decision a evaluar en Etapa 4**: si el volumen de activos es bajo (< 5.000), no es necesario persistir; se calcula on-demand en el detalle. Si es alto y el dashboard requiere consultas agregadas rapidas, se persiste.

---

## Plan de Implementacion en 4 Etapas

### ETAPA 1 — Motor de calculo backend y denormalizacion

**Objetivo**: tener un calculo correcto del cumplimiento y los campos denormalizados sincronizados, sin tocar la UI aun. Esta etapa es 100% backend.

#### 1.1 Utilidades compartidas

Crear modulo `backend/cloud/utils/cumplimientoMantenimiento.js` que exponga:

- `calcularCumplimiento(activo, historial, fechaActual)` — Funcion pura que recibe:
  - `activo`: objeto con `fechaBase`, `frecuencia`, `fechaBaja`
  - `historial`: array de `RegistroMantenimiento` aprobados ordenados por fecha
  - `fechaActual`: Date opcional (default: new Date())
  - Retorna el objeto con todas las metricas y el array de periodos.

- `addMeses(fecha, meses)` — Helper que suma meses preservando el dia del mes, con manejo de fines de mes (ej: 31 ene + 1 mes → 28/29 feb).

- `obtenerFechaBaseActivo(activo, activoClase)` — Devuelve `fechaAdquisicion` o `fechaInstalacion` segun el tipo de clase.

#### 1.2 Nuevas Cloud Functions

| Funcion | Acceso | Descripcion |
|---------|--------|-------------|
| `calcularCumplimientoMantenimiento` | VIEWER (1) | Recibe `activoId`, `activoClase`. Retorna calculo completo incluyendo array `periodos` sin persistir. Usada en la pestana del detalle. |
| `sincronizarCumplimientoActivo` | OPERATOR (2) | Recibe `activoId`, `activoClase`. Recalcula y **persiste** los campos denormalizados en el activo. Se invoca desde triggers. |
| `sincronizarCumplimientoMasivo` | ADMIN (4) | Recorre todos los activos de un dominio (o todos los dominios) y ejecuta `sincronizarCumplimientoActivo` en lote. Paginado para evitar timeouts. |
| `getEstadisticasCumplimiento` | VIEWER (1) | Agregados por dominio: `{ alDia, conRetraso, critico, sinHistorial, total, porcentajePromedio }`. Para el dashboard. |

#### 1.3 Triggers (Parse.Cloud.afterSave / afterDelete)

Agregar hooks para mantener la denormalizacion sin intervencion manual:

- **`afterSave` en `RegistroMantenimiento`**:
  - Si cambio `estadoValidacion` a `aprobado` o la `fecha`, invocar `sincronizarCumplimientoActivo` con `activoId` y `activoClase` del registro.
  - Si se modifico a `rechazado` un registro que antes cerraba un periodo, tambien recalcular.

- **`afterDelete` en `RegistroMantenimiento`**:
  - Resincronizar el activo afectado.

- **`afterSave` en los 4 `InventarioXxx`**:
  - Si cambio `frecuencia`, `fechaAdquisicion`, `fechaInstalacion` o `fechaBaja`, recalcular.

> **Consideracion de rendimiento**: los triggers deben ejecutarse en modo `useMasterKey` y **no deben bloquear la respuesta al usuario**. Si el calculo es costoso, ejecutar de forma asincrona (fire-and-forget) o encolar.

#### 1.4 Modificacion de Cloud Functions de listado existentes

Cada una de estas funciones debe devolver los nuevos campos denormalizados:

| Funcion | Archivo | Cambio |
|---------|---------|--------|
| `getInventarioEquipos` | `backend/cloud/main.js` | Agregar campos al `mapEquipoItem` |
| `getInventarioIndustrial` (nombre real a verificar) | Idem | Idem |
| `getInventarioInfra` (nombre real a verificar) | Idem | Idem |
| `getInventarioFlota` / equivalente | Idem | Idem |
| Cada `getXxxById` | Idem | Incluir los nuevos campos |
| Cada `exportarInventarioXxx` | Idem | Incluir los nuevos campos |

Ademas, los filtros actuales deben extenderse para aceptar:
- `estadoCumplimiento`: `todos` (default), `sin_historial`, `al_dia`, `con_retraso`, `critico`
- `ultimoMttoDesde` / `ultimoMttoHasta`: rango de fechas

#### 1.5 Migracion inicial de datos

Script one-shot (`scripts/sincronizar-cumplimiento-inicial.js` o mejor, cloud function `migrarCumplimientoInicial` ejecutada desde admin) que:

1. Recorre los 4 inventarios paginados (500 por lote).
2. Para cada activo ejecuta `sincronizarCumplimientoActivo`.
3. Reporta progreso: procesados / total, con timestamp.
4. Se ejecuta una sola vez en produccion tras el deploy inicial.

#### Entregable Etapa 1

- Modulo de utilidades de calculo testeable en aislamiento.
- 4 Cloud Functions nuevas de calculo y sincronizacion.
- Triggers automaticos sobre `RegistroMantenimiento` y los 4 `InventarioXxx`.
- Campos denormalizados poblados en todos los activos tras ejecutar la migracion inicial.
- Cloud Functions de listado y detalle exponen los campos nuevos.
- Sin cambios visibles aun en la UI (solo disponibles via API).

---

### ETAPA 2 — Integracion en listados y filtros de los 4 inventarios

**Objetivo**: mostrar al coordinador la informacion de cumplimiento en las tablas y permitir filtrar por ella.

#### 2.1 Tipos TypeScript

Extender las interfaces en:

- `frontend/src/types/inventario-equipo.types.ts`
- `frontend/src/types/inventario-industrial.types.ts`
- `frontend/src/types/inventario-flota.types.ts`
- `frontend/src/types/inventario-infraestructura.types.ts`

Agregar a cada `InventarioXxx`:

```
ultimaFechaMantenimiento: string;
ultimoRegistroMantenimientoId: string;
ultimoTipoMantenimiento: string;
proximaFechaMantenimientoEsperada: string;
periodosEsperados: number;
periodosCumplidos: number;
periodosFaltantes: number;
cumplimientoPorcentaje: number;
estadoCumplimientoMantenimiento: string;
```

Agregar a cada `InventarioXxxFilters`:

```
estadoCumplimiento?: string;
ultimoMttoDesde?: string;
ultimoMttoHasta?: string;
```

#### 2.2 Constantes de UI (reutilizables)

Crear `frontend/src/types/cumplimiento-mantenimiento.types.ts`:

```
export const ESTADO_CUMPLIMIENTO_OPTIONS = [
  { value: 'sin_configuracion', label: 'Sin configuracion' },
  { value: 'sin_historial', label: 'Sin historial' },
  { value: 'al_dia', label: 'Al dia' },
  { value: 'con_retraso', label: 'Con retraso' },
  { value: 'critico', label: 'Critico' },
  { value: 'dado_de_baja', label: 'Dado de baja' },
];

export const ESTADO_CUMPLIMIENTO_COLORS: Record<string, string> = {
  sin_configuracion: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  sin_historial: 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200',
  al_dia: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  con_retraso: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  critico: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  dado_de_baja: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300',
};

export const ESTADO_CUMPLIMIENTO_LABELS: Record<string, string> = { ... };
```

#### 2.3 Services

En los 4 services:

- Actualizar `mapItem` para mapear los nuevos campos.
- Verificar que el filtro `estadoCumplimiento` y rangos de fecha viajen al backend.

#### 2.4 Componente reutilizable `CumplimientoBadge`

Crear `frontend/src/components/admin/mantenimiento/CumplimientoBadge.tsx`:

- Props: `estado`, `porcentaje?`, `periodosFaltantes?`, `size?` (`sm` \| `md`).
- Renderiza badge con color segun estado + opcionalmente tooltip con `"{cumplidos}/{esperados} periodos ({porcentaje}%)"`.

Este componente se usara en 4 paginas de inventario + detalle + dashboard.

#### 2.5 Modificacion de las 4 paginas de listado

Archivos afectados:

- `frontend/src/app/admin/inventario/page.tsx` (medicos)
- `frontend/src/app/admin/inventario-industrial/page.tsx`
- `frontend/src/app/admin/flota-vehicular/page.tsx`
- `frontend/src/app/admin/infraestructura/page.tsx`

Cambios comunes en cada una:

1. **Nueva columna "Ultimo Mantto"** despues de Estado. Muestra `ultimaFechaMantenimiento` formateado o "Nunca" con badge rojo si esta vacio.
2. **Nueva columna "Cumplimiento"** despues de Ultimo Mantto. Usa `CumplimientoBadge`.
3. **Nueva columna "Proximo Mantto"** (opcional, togglable). Muestra `proximaFechaMantenimientoEsperada` con color rojo si ya paso, amarillo si esta dentro de los proximos 30 dias.
4. **Nuevo filtro "Estado cumplimiento"** en la barra de filtros (dropdown con las 6 opciones).
5. **Nuevo filtro "Rango ultimo mantto"** (date range picker opcional, expandible).
6. **Nuevo indicador de resumen** sobre la tabla: 4 tarjetas pequenas con conteos (Al dia / Con retraso / Critico / Sin historial) que actuan como filtros rapidos al clickear.

#### 2.6 Exportacion Excel

Modificar las exportaciones existentes de cada inventario para incluir columnas:

- `Ultimo mantto` (fecha)
- `Proximo mantto esperado` (fecha)
- `Periodos cumplidos / Esperados`
- `Cumplimiento %`
- `Estado cumplimiento`

#### Entregable Etapa 2

- Los 4 listados de inventario muestran fecha de ultimo mantto y estado de cumplimiento.
- Filtros funcionales por estado de cumplimiento y rango de fechas.
- Tarjetas de resumen con conteos al dia / con retraso / critico / sin historial.
- Exportacion Excel incluye las metricas nuevas.

---

### ETAPA 3 — Pestana de Mantenimientos y Timeline en el Detalle

**Objetivo**: permitir al usuario explorar en detalle la linea de tiempo de mantenimientos de cada activo, con periodos cumplidos y faltantes visualizados.

#### 3.1 Nuevo componente: `ActivoMantenimientosPanel`

Crear componente reutilizable en `frontend/src/components/admin/mantenimiento/ActivoMantenimientosPanel.tsx`.

Props:

```
{
  activoId: string;
  activoClase: string;
  dominio: string;        // para redirecciones a "Nuevo mantenimiento"
  fechaBase: string;      // fechaAdquisicion o fechaInstalacion
  frecuencia: number;
  fechaBaja?: string;
  onAbrirRegistro?: (registroId: string) => void;
}
```

Al montar, invoca `calcularCumplimientoMantenimiento(activoId, activoClase)` y renderiza tres secciones:

**Seccion A — Tarjetas de metricas**

4 cards con:
- Ultimo mantenimiento (fecha + tipo + link "ver")
- Proximo esperado (fecha + "faltan N dias" o "vencido hace N dias" en rojo)
- Cumplimiento (% + badge estado)
- Periodos cumplidos / esperados (con `N / M` y barra de progreso)

**Seccion B — Timeline de periodos**

Lista vertical (o horizontal en desktop) con todos los periodos teoricos desde `fechaBase`:

Cada periodo se renderiza como un nodo con:
- Numero de periodo (#1, #2, ...)
- Rango `desde - hasta`
- Icono y color segun estado:
  - `cumplido`: verde con check, muestra fecha real de ejecucion + tipo de mantto + link al registro
  - `faltante`: rojo con X, muestra "No ejecutado" + boton "Registrar retroactivo" (si rol OPERATOR+) que lleva al wizard con datos prellenados
  - `en_curso`: azul con reloj, muestra "Periodo actual (vence dd/mm/yyyy)" + boton "Iniciar mantenimiento"
- Si el periodo tiene `extras`: mostrar chip "+N mantos adicionales" expandible

**Seccion C — Tabla cronologica de TODOS los registros del activo**

- Lista todos los `RegistroMantenimiento` del activo (incluso los pendientes/rechazados).
- Columnas: Fecha, Tipo, Clasificacion, Tecnico, Estado validacion, Acciones.
- Filtro por estadoValidacion.
- Link "Ver detalle" abre el modal del mantenimiento.

#### 3.2 Integracion en los 4 DetailModals de inventario

Archivos:

- `frontend/src/components/admin/inventario/InventarioDetailModal.tsx`
- `frontend/src/components/admin/inventario-industrial/InventarioIndustrialDetailModal.tsx`
- `frontend/src/components/admin/flota-vehicular/FlotaVehicularDetailModal.tsx`
- `frontend/src/components/admin/infraestructura/InfraestructuraDetailModal.tsx`

Cambios en cada uno:

1. Agregar nueva tab "Mantenimientos" entre "Detalle" y "Historial":
   - Tab label: "Mantenimientos" con icono (`MdBuild` o `MdHandyman`) y badge con `periodosFaltantes` si > 0.
2. Renderizar `<ActivoMantenimientosPanel ... />` cuando la tab este activa.
3. En la pestana "Detalle" agregar una mini-seccion "Cumplimiento de mantenimiento" con las 4 tarjetas de metricas (version compacta) + link "Ver timeline completo" que cambia a la tab Mantenimientos.

#### 3.3 Navegacion cruzada con modulo de mantenimiento

- Boton "Nuevo mantenimiento" en el panel: lleva a `/admin/mantenimiento/nuevo?dominio=...&activoId=...` (query params que el wizard debe aceptar — si aun no soporta, agregar soporte).
- Link "Ver registro" en cada periodo cumplido: lleva a `/admin/mantenimiento/[id]`.
- Boton "Registrar retroactivo" en periodos faltantes: abre wizard con `dominio` + `activoId` + fecha sugerida (inicio del periodo faltante) + banner informativo "Estas registrando un mantenimiento retroactivo del periodo #N".

#### 3.4 Vista impresa del timeline (opcional esta etapa, opcional 4)

Boton "Exportar cumplimiento" en el panel que genere PDF con:
- Datos del activo
- Tarjetas de metricas
- Timeline completo
- Firma del responsable + fecha de generacion

Util para auditorias y acreditacion.

#### Entregable Etapa 3

- Nuevo componente `ActivoMantenimientosPanel` funcional y reutilizable.
- Los 4 DetailModals del inventario tienen nueva pestana "Mantenimientos" con timeline visual.
- Acciones cruzadas al wizard de mantenimiento con prellenado.
- (Opcional) Exportacion PDF del cumplimiento por activo.

---

### ETAPA 4 — Dashboard, Alertas y Extensiones

**Objetivo**: vista global del cumplimiento, notificaciones proactivas, integraciones opcionales.

#### 4.1 Dashboard de cumplimiento

Nueva ruta: `/admin/mantenimiento/cumplimiento`

**Acceso**: COORDINATOR (3) o superior.

**Vista**:

1. **KPIs globales** (4 cards grandes):
   - % cumplimiento global (promedio ponderado de los 4 dominios)
   - Total activos criticos
   - Total activos con retraso
   - Total activos al dia

2. **Grafico por dominio**: barras apiladas mostrando distribucion de estados por dominio (medicos / industriales / flota / infraestructura).

3. **Tabla "Top 20 activos criticos"**: ordenados por `periodosFaltantes` descendente, con filtros por dominio, servicio, ubicacion. Cada fila permite ir directamente al detalle del activo.

4. **Filtros globales**: dominio, servicio/ubicacion, criticidad, fecha desde/hasta para ultimo mantto.

5. **Boton "Sincronizar todos los cumplimientos"**: ADMIN (4). Dispara `sincronizarCumplimientoMasivo` con progress bar en vivo.

6. **Boton "Descargar reporte"**: Excel con todos los activos y sus metricas (no solo top 20).

**Archivos**:

- `frontend/src/app/admin/mantenimiento/cumplimiento/page.tsx`
- `frontend/src/components/admin/mantenimiento/CumplimientoDashboard.tsx`
- `frontend/src/components/admin/mantenimiento/CumplimientoKPICards.tsx`
- `frontend/src/components/admin/mantenimiento/CumplimientoPorDominioChart.tsx`
- `frontend/src/components/admin/mantenimiento/CumplimientoTopCriticos.tsx`

**Sidebar**: agregar entrada "Cumplimiento" dentro del grupo Mantenimiento en `routes.tsx`.

#### 4.2 Alertas y notificaciones

**Backend** — nueva cloud function:

- `getProximosMantenimientos` — VIEWER (1). Retorna lista de activos cuyo `proximaFechaMantenimientoEsperada` cae en los proximos N dias (default 30). Ordenado por fecha ascendente.

**Integracion con modulo de notificaciones Brevo** (ya existente — ver `modulo-notificaciones-brevo.md`):

- Nueva plantilla "Mantenimiento proximo a vencer" que se envia al coordinador responsable del servicio/ubicacion del activo.
- Trigger: cron diario a las 08:00 que ejecuta `getProximosMantenimientos(7)` y envia resumen agrupado.
- Nueva plantilla "Activo paso a estado critico" que se envia cuando `estadoCumplimientoMantenimiento` pasa a `critico`.

**Indicador visual en sidebar**:

- Badge numerico en la entrada "Mantenimiento" del sidebar con la cantidad de activos en estado `critico`. Similar al badge de la bandeja de validacion.

#### 4.3 Persistencia opcional de periodos (Parse Class `CumplimientoMantenimientoPeriodo`)

Solo si el volumen lo justifica (> 5.000 activos). Incluye:

- Clase Parse creada con el esquema definido arriba.
- Cloud function `persistirPeriodosActivo` que regenera registros para un activo.
- Modificar `sincronizarCumplimientoActivo` para persistir tambien.
- Dashboard usa queries agregadas en `CumplimientoMantenimientoPeriodo` para los KPIs en vez de recalcular en tiempo real.

> **Decision diferida**: medir primero rendimiento del dashboard con calculo on-demand. Implementar solo si los tiempos de respuesta superan 2s en produccion.

#### 4.4 Integracion con Solicitudes / Ordenes de Trabajo

Ajuste en el modulo existente `/admin/solicitudes`:

- Nueva opcion en el formulario de solicitud: checkbox "Auto-crear desde cumplimiento" (solo visible al seleccionar un activo). Al marcar, prellena tipo = Preventivo y fecha sugerida = `proximaFechaMantenimientoEsperada`.
- Boton "Crear solicitud" en el timeline de cumplimiento (Etapa 3) para periodos `faltantes` o `en_curso`. Genera una solicitud prellenada y abre su formulario.

#### 4.5 Historial de cambios de cumplimiento

Registrar en `MantenimientoHistorial` (o nueva coleccion `CumplimientoLog`) las transiciones de estado de cumplimiento por activo:

- Cada vez que `sincronizarCumplimientoActivo` detecte un cambio de `estadoCumplimientoMantenimiento`, insertar entrada con: activoId, estadoAnterior, estadoNuevo, timestamp.
- Util para auditorias: "este equipo estuvo critico desde X hasta Y".

#### 4.6 Permisos y seguridad

Consolidar permisos finales:

| Operacion | accessLevel |
|-----------|-------------|
| Ver cumplimiento en listados y detalle | 1 (VIEWER) |
| Ver dashboard global | 3 (COORDINATOR) |
| Ejecutar sincronizacion masiva | 4 (ADMIN) |
| Crear mantenimiento retroactivo | 2 (OPERATOR) |
| Crear solicitud desde cumplimiento | 2 (OPERATOR) |
| Ver historial de cambios de cumplimiento | 3 (COORDINATOR) |

#### Entregable Etapa 4

- Dashboard `/admin/mantenimiento/cumplimiento` con KPIs, graficos y top criticos.
- Notificaciones Brevo de proximos vencimientos y pasos a critico.
- Badge en sidebar con cantidad de criticos.
- (Opcional) Persistencia de periodos en Parse Class dedicada.
- Integracion con solicitudes de trabajo.
- Historial de transiciones de estado de cumplimiento.

---

### ETAPA 5 — Actualizacion inmediata del inventario al registrar mantenimiento

**Objetivo**: que al momento en que un tecnico crea un `RegistroMantenimiento` (aunque quede en estado `pendiente`), el inventario correspondiente refleje de forma **inmediata** la fecha del mantenimiento recien creado y el registro asociado, sin esperar a la validacion del administrador.

#### 5.1 Flujo actual vs flujo propuesto

**Flujo actual (ya implementado en `backend/cloud/main.js` lineas 4893–4973)**:

1. `crearRegistroMantenimiento` recibe `data`, valida campos obligatorios.
2. Crea el objeto `RegistroMantenimiento` con `estadoValidacion = 'pendiente'` y `activo = true`.
3. Lo guarda con `useMasterKey` y registra en `MantenimientoHistorial` accion `creacion`.
4. Retorna el registro serializado.
5. **No toca el inventario**. El coordinador solo vera el cambio tras la aprobacion (Etapa 1).

**Flujo propuesto**:

La misma funcion `crearRegistroMantenimiento`, tras el `registro.save()` exitoso y antes del `return`, debe invocar una **unica operacion centralizada** sobre el activo asociado. Esta operacion es responsabilidad de Etapa 1 y se formaliza aqui como la funcion **`sincronizarUltimaMantencionActivo(activoId, activoClase)`**, que ya forma parte del motor de calculo definido en la Etapa 1. No se crea una funcion nueva: se **extiende el contrato** de `sincronizarCumplimientoActivo` para que tambien gestione `ultimaFechaMantenimiento`, `ultimoRegistroMantenimientoId`, `ultimoTipoMantenimiento` y `ultimoEstadoMantenimiento`.

#### 5.2 Logica centralizada de "ultima mantencion"

En `backend/cloud/utils/cumplimientoMantenimiento.js` (ya definido en Etapa 1), extender el algoritmo con:

```
funcion resolverUltimoMantenimiento(activoId, activoClase):
  registros = RegistroMantenimiento
    .equalTo('activoId', activoId)
    .equalTo('activoClase', activoClase)
    .equalTo('activo', true)
    .descending('fecha')       # más reciente primero
    .limit(50)
    .find(masterKey)

  # Caso 1: sin historial
  si registros vacio:
    retornar { fecha: '', id: '', tipo: '', estado: 'sin_historial' }

  # Caso 2: tomar el registro NO rechazado mas reciente
  # Un registro rechazado NO puede ser la "ultima mantencion" visible
  noRechazados = registros.filter(r => r.estadoValidacion != 'rechazado')

  si noRechazados vacio:
    # Todos estan rechazados: no hay "ultima mantencion" valida que mostrar
    retornar { fecha: '', id: '', tipo: '', estado: 'sin_historial' }

  ultimoValido = noRechazados[0]   # ya ordenados por fecha desc

  retornar {
    fecha: ultimoValido.fecha,
    id: ultimoValido.id,
    tipo: ultimoValido.tipoMantenimiento,
    estado: ultimoValido.estadoValidacion   # 'pendiente' o 'aprobado'
  }
```

> **Regla clave**: `ultimaFechaMantenimiento` muestra el registro mas reciente **no rechazado**. Un registro rechazado nunca aparece como "ultima mantencion". Los periodos de cumplimiento (`periodosCumplidos`) siguen contabilizando SOLO aprobados (regla de Etapa 1). La distincion entre pendiente y aprobado se hace via `ultimoEstadoMantenimiento`.

#### 5.3 Integracion en `crearRegistroMantenimiento`

Modificar la funcion existente (NO crear una nueva). Tras `registro.save()` en linea 4956, agregar:

```
# Pseudocodigo de la extension
try:
  await sincronizarCumplimientoActivo(
    activoId: data.activoId,
    activoClase: data.activoClase
  )   # recalcula cumplimiento Y ultima mantencion
catch e:
  # log pero NO fallar la creacion del registro
  console.warn('No se pudo sincronizar inventario tras crear registro', e)
```

El bloque se ejecuta dentro del mismo `try` del handler pero con su propio `try/catch` interno: si la sincronizacion falla (por ej. activo eliminado), el registro de mantenimiento queda creado correctamente y se puede reintentar desde admin con `sincronizarCumplimientoMasivo`. Esto evita que un error de denormalizacion bloquee la operacion principal.

#### 5.4 Comportamiento visual

Una vez aplicada Etapa 5, los listados de inventario (modificados en Etapa 2) muestran para cada activo:

- `ultimaFechaMantenimiento` con su badge segun `ultimoEstadoMantenimiento`:
  - `pendiente`: fecha + badge amarillo "En validacion" (icono reloj)
  - `aprobado`: fecha + badge verde (check)
  - `sin_historial`: guion + badge rojo "Nunca"

En la pestana "Mantenimientos" del detalle (Etapa 3), el timeline ya diferencia visualmente los registros `pendientes` (con tinte azul/ocre). Etapa 5 no requiere cambios de UI adicionales; solo cableado de datos.

#### 5.5 Trigger `afterSave` en `RegistroMantenimiento`

El trigger definido en Etapa 1.3 ya cubre este caso: cuando `afterSave` detecta que el registro es nuevo O cambio de `estadoValidacion`/`fecha`, invoca `sincronizarCumplimientoActivo`. La llamada directa en 5.3 es redundante pero **intencional** — asegura propagacion sincrona en el mismo ciclo de request para que la respuesta ya contenga datos actualizados si el frontend los necesitara (opcional).

> **Decision de implementacion**: si en Etapa 1 el trigger es suficientemente rapido, la llamada directa en 5.3 puede omitirse. Si se prefiere maxima inmediatez y evitar race conditions del trigger, se deja la llamada sincrona.

#### 5.6 Impacto sobre `crearRegistroMantenimiento`

| Aspecto | Cambio |
|---------|--------|
| Firma de la funcion | Sin cambios (mismos parametros) |
| Nivel de acceso | Sin cambios (OPERATOR 2) |
| Validaciones existentes | Se preservan |
| Historial `MantenimientoHistorial` | Sin cambios: sigue registrando accion `creacion` |
| Nueva responsabilidad | Despues de guardar, invocar `sincronizarCumplimientoActivo` (o confiar en el trigger `afterSave`) |
| Manejo de errores | La sincronizacion falla silenciosa (log) para no bloquear al tecnico |

#### Entregable Etapa 5

- `crearRegistroMantenimiento` en `backend/cloud/main.js` extendida para disparar sincronizacion inmediata del activo (directa o via trigger).
- `sincronizarCumplimientoActivo` (definida en Etapa 1) ampliada para resolver y persistir `ultimaFechaMantenimiento`, `ultimoRegistroMantenimientoId`, `ultimoTipoMantenimiento`, `ultimoEstadoMantenimiento`.
- `ultimoEstadoMantenimiento` poblado en `sin_historial` \| `pendiente` \| `aprobado` segun el ultimo registro no rechazado del activo.
- Listados de inventario (ya preparados en Etapa 2) diferencian visualmente pendientes y aprobados sin cambios de codigo adicionales (solo datos).

---

### ETAPA 6 — Reversion automatica al rechazar mantenimiento

**Objetivo**: cuando el administrador rechaza un mantenimiento pendiente que esta siendo mostrado como "ultima mantencion" en el inventario, el sistema debe **revertir** el estado del inventario al **ultimo mantenimiento APROBADO previo** (o dejarlo en `sin_historial` si no existe ninguno aprobado).

Simetricamente, cuando el administrador aprueba un pendiente, la Etapa 5 ya garantiza que el inventario refleja esa fecha; en Etapa 6 se cierra el ciclo actualizando `ultimoEstadoMantenimiento` a `aprobado` y recalculando cumplimiento (periodos cumplidos).

#### 6.1 Flujo actual vs flujo propuesto para `rechazarMantenimiento`

**Flujo actual (`backend/cloud/main.js` lineas 5174–5223)**:

1. Valida permisos ADMIN (4).
2. Valida `motivoRechazo` obligatorio.
3. Obtiene el registro y verifica `estadoValidacion === 'pendiente'`.
4. Cambia a `rechazado`, guarda `motivoRechazo`, `validadorId`, `validadorNombre`, `fechaValidacion`.
5. Guarda con master key.
6. Registra historial con accion `rechazado`.
7. **No toca el inventario**.

**Flujo propuesto**: despues del `registro.save()` (linea 5208), invocar `sincronizarCumplimientoActivo(activoId, activoClase)` del mismo registro. La funcion, al ejecutarse:

1. Busca registros del activo ordenados por fecha desc (ver 5.2).
2. Descarta los `rechazados`.
3. Si el registro recien rechazado era el que mostraba el inventario, ahora el "mas reciente no rechazado" sera OTRO (pendiente o aprobado anterior, o ninguno).
4. Actualiza `ultimaFechaMantenimiento`, `ultimoRegistroMantenimientoId`, `ultimoTipoMantenimiento`, `ultimoEstadoMantenimiento` en consecuencia.
5. Recalcula `periodosCumplidos`, `cumplimientoPorcentaje`, `estadoCumplimientoMantenimiento`.

> **Caso clave**: si el unico registro del activo era el que se acaba de rechazar, el activo vuelve a `ultimoEstadoMantenimiento = 'sin_historial'` y `ultimaFechaMantenimiento = ''`. El historial en `MantenimientoHistorial` y el propio `RegistroMantenimiento` rechazado siguen existiendo — solo se oculta del indicador de "ultima mantencion".

#### 6.2 Flujo actual vs flujo propuesto para `aprobarMantenimiento`

**Flujo actual (`backend/cloud/main.js` lineas 5120–5169)**:

1. Valida permisos ADMIN (4) y firma del validador.
2. Verifica `estadoValidacion === 'pendiente'`.
3. Cambia a `aprobado`, guarda firma y metadata del validador.
4. Registra historial.
5. **No toca el inventario**.

**Flujo propuesto**: despues del `registro.save()` (linea 5154), invocar `sincronizarCumplimientoActivo`. La funcion:

1. Detecta que el registro mas reciente no rechazado ahora es `aprobado`.
2. Actualiza `ultimoEstadoMantenimiento = 'aprobado'` (si antes estaba en `pendiente`).
3. Recalcula cumplimiento: este registro ahora cierra el periodo correspondiente → `periodosCumplidos++` (si el activo estaba atrasado, puede pasar de `critico` a `con_retraso` o `al_dia`).

#### 6.3 Reversion a traves de `deleteRegistroMantenimiento`

La funcion `deleteRegistroMantenimiento` (SUPER_ADMIN 5) **tambien** debe disparar la misma sincronizacion. Si se elimina un registro que era la "ultima mantencion", el inventario debe apuntar al siguiente vigente.

> Ya cubierto por el trigger `afterDelete` definido en Etapa 1.3 — no requiere cambio explicito en la funcion, siempre que el trigger este implementado.

#### 6.4 Coherencia con el historial del inventario

El inventario tiene su propio historial (`InventarioHistorial` / `InventarioIndustrialHistorial` / `InventarioFlotaHistorial` / `InventarioInfraHistorial`). Cada vez que cambien los campos denormalizados, NO es necesario registrar entrada de historial de inventario — son campos derivados, no editables por el usuario. El historial real del cambio de estado esta en `MantenimientoHistorial` del registro rechazado.

> **Excepcion opcional**: si el negocio requiere auditoria explicita, agregar entrada al historial del inventario con accion `reversion_ultima_mantencion`, descripcion tipo "Ultima mantencion revertida a {fecha anterior} por rechazo del registro {id}". Esto es opcional y se deja como decision final en revision.

#### 6.5 Notificaciones al rechazar (integracion con Brevo — ya existente)

Extender la logica del rechazo para enviar notificacion al tecnico original Y al coordinador del servicio/ubicacion del activo, indicando:

- Activo afectado (nombre, identificador, servicio)
- Registro rechazado (fecha, tipo, motivo)
- Efecto en el inventario: "La ultima mantencion visible ha vuelto a {fecha anterior}" o "El activo vuelve a estado sin historial"
- Link al activo y al registro rechazado

Se reutiliza el servicio ya implementado en `modulo-notificaciones-brevo.md` (no se crea nueva infraestructura), solo se anade una nueva plantilla `mantenimiento_rechazado_reversion_inventario`.

#### 6.6 Condiciones de carrera y concurrencia

Escenario: dos administradores actuan simultaneamente sobre dos registros del mismo activo (uno aprueba otro, otro rechaza otro).

- Parse garantiza serializacion por documento, pero la sincronizacion del activo depende del orden de ejecucion de los `save()`.
- Estrategia: `sincronizarCumplimientoActivo` es **idempotente** — siempre recalcula desde el estado actual de `RegistroMantenimiento`, sin depender del estado previo del activo. Cualquier orden de ejecucion converge al mismo resultado final.
- Si ambas invocaciones ocurren en ventanas sobrepuestas, el `save` mas tardio gana. Aceptable porque ambos ven una base de datos consistente en cada ciclo.

#### 6.7 Impacto sobre `aprobarMantenimiento` y `rechazarMantenimiento`

| Aspecto | Cambio |
|---------|--------|
| Firma de las funciones | Sin cambios |
| Nivel de acceso | Sin cambios (ADMIN 4) |
| Validaciones existentes | Se preservan |
| Registro en `MantenimientoHistorial` | Sin cambios: sigue registrando `aprobado` o `rechazado` |
| Nueva responsabilidad | Tras `save()`, invocar `sincronizarCumplimientoActivo(activoId, activoClase)` |
| Manejo de errores | Sincronizacion en `try/catch` interno — falla silenciosa con log |
| Notificaciones Brevo | Nueva plantilla solo si se adopta 6.5 (opcional) |

#### 6.8 Backfill y consistencia

Despues de desplegar las Etapas 5 y 6, ejecutar una unica vez `sincronizarCumplimientoMasivo` (definida en Etapa 1.2) para que todos los activos queden con `ultimoEstadoMantenimiento` correctamente poblado segun los registros historicos ya existentes. Este backfill es el mismo de Etapa 1 — no es un nuevo proceso.

#### Entregable Etapa 6

- `aprobarMantenimiento` y `rechazarMantenimiento` en `backend/cloud/main.js` invocan `sincronizarCumplimientoActivo` tras guardar el cambio de estado.
- Los 4 inventarios reflejan en tiempo real que al rechazar un pendiente la fecha vuelve al ultimo aprobado (o a vacio).
- Al aprobar, el activo transita de `pendiente` a `aprobado` y su cumplimiento se recalcula (pudiendo cambiar de `critico` a `al_dia`).
- Comportamiento idempotente: la sincronizacion siempre deriva del estado vigente de `RegistroMantenimiento`, tolerando concurrencia.
- (Opcional) Notificacion Brevo al tecnico y coordinador sobre reversion.
- (Opcional) Entrada en el historial del inventario con accion `reversion_ultima_mantencion`.

---

### ETAPA 7 — Centralizacion de pautas por coleccion, Excel completo y gestion de pautas retroactivas

**Objetivo**: asegurar que la logica de cumplimiento respete el modelo ya existente de pautas centralizadas por dominio, que las exportaciones Excel incluyan los nuevos campos de forma legible, y que se pueda registrar mantenimientos atrasados/olvidados sin perder trazabilidad ni crear modulos paralelos.

#### 7.1 Pautas centralizadas por coleccion — alineacion con el modelo existente

**Modelo actual** (ver `context/mmtto/modulo-preguntas.md` y `backend/cloud/main.js`):

- Las pautas viven en `PreguntaMantenimiento` agrupadas por la triada `dominio + tipoMantenimiento + clasificacionEquipo`.
- `dominio` tiene 4 valores fijos (`equipoMedico`, `equipoIndustrial`, `flotaVehicular`, `infraestructura`) que corresponden a las 4 colecciones de inventario.
- `clasificacionEquipo` es el nombre de la pauta (ej: "Caldera", "Monitor de signos vitales", "Ambulancia").
- Cada activo puede tener el campo `pautaAsignada` que preselecciona la clasificacion en el wizard.

**Implicacion para el motor de cumplimiento**:

La funcion `sincronizarCumplimientoActivo(activoId, activoClase)` definida en Etapas 1/5/6 debe derivar el `dominio` a partir de `activoClase` con el mapeo:

```
activoClase → dominio
InventarioEquipoMedico     → equipoMedico
InventarioEquipoIndustrial → equipoIndustrial
InventarioFlotaVehicular   → flotaVehicular
InventarioInfraestructura  → infraestructura
```

Esta correspondencia es **1 a 1 y no cambia**; se formaliza como constante compartida en `backend/cloud/utils/cumplimientoMantenimiento.js` (`DOMINIO_POR_CLASE` — aprovecha el mapeo que el frontend ya usa en `frontend/src/app/admin/mantenimiento/nuevo/page.tsx` como `ACTIVO_CLASE`).

**Filtro de registros contabilizables**: al contar mantenimientos aprobados para el cumplimiento, la funcion ya filtra por `activoId` + `activoClase`. Esto es suficiente porque `RegistroMantenimiento` guarda ambos campos denormalizados. La `clasificacionEquipo` del registro NO se usa para el conteo (un mismo activo podria ejecutar mantenimientos bajo distintas clasificaciones si cambia la pauta, y todos contabilizan).

> **Regla de negocio a confirmar**: si se desea que solo cuenten mantenimientos ejecutados bajo la pauta asignada (`activo.pautaAsignada === registro.clasificacionEquipo`), se debe parametrizar. Propuesta: **NO** filtrar por pauta para el conteo — cualquier mantenimiento aprobado del activo cierra el periodo. Esto es coherente con el uso actual del sistema y evita penalizar cambios de pauta.

#### 7.2 Exportacion Excel con los nuevos campos

**Alcance**: 4 exportaciones de inventario + 1 exportacion de registros de mantenimiento.

**7.2.1 Exportaciones de inventario** (`exportarInventarioEquipos`, `exportarInventarioIndustrial`, `exportarInventarioFlota` / nombre real, `exportarInventarioInfra`):

Agregar al final de cada fila las siguientes columnas en este orden, **con encabezados legibles en espanol**:

| Columna (header) | Campo origen | Formato |
|------------------|--------------|---------|
| Ultimo mantto (fecha) | `ultimaFechaMantenimiento` | dd/mm/yyyy o vacio |
| Ultimo mantto (tipo) | `ultimoTipoMantenimiento` | "Preventivo" / "Correctivo" / "Predictivo" |
| Ultimo mantto (estado) | `ultimoEstadoMantenimiento` | "Aprobado" / "En validacion" / "Sin historial" |
| Proximo mantto esperado | `proximaFechaMantenimientoEsperada` | dd/mm/yyyy |
| Periodos cumplidos | `periodosCumplidos` | Entero |
| Periodos esperados | `periodosEsperados` | Entero |
| Periodos faltantes | `periodosFaltantes` | Entero |
| Cumplimiento (%) | `cumplimientoPorcentaje` | Numero con 1 decimal + "%" |
| Estado cumplimiento | `estadoCumplimientoMantenimiento` | "Al dia" / "Con retraso" / "Critico" / "Sin historial" / "Sin configuracion" / "Dado de baja" |
| Proveedor en convenio (RUT) | `proveedorRut` | Texto (ya existia, mantener) |
| Convenio vigente | `convenioActivo` | "Si" / "No" (ya existia, mantener) |

**Reglas de legibilidad**:

- Los codigos internos (`'aprobado'`, `'al_dia'`, `'B'`) se **traducen a etiquetas humanas** al momento de exportar. No se exponen codigos crudos al usuario final.
- Las fechas siempre en `dd/mm/yyyy` usando locale `es-CL`. Si el backend entrega `YYYY-MM-DD`, el frontend transforma antes de enviar a la libreria Excel (o lo hace el cloud function si se genera en servidor).
- Celdas vacias → guion `—` o cadena vacia, nunca `null` ni `undefined`.
- Porcentajes: se exportan como numero (no texto), con formato de columna `0.0"%"` en la hoja.

**Implementacion**: las funciones `exportarInventario*` ya existen. Se **modifican** para incluir los campos nuevos en el objeto que retornan. La capa que construye el Excel (libreria `xlsx` o similar ya instalada) se ajusta para sumar las columnas. **No se crean nuevos cloud functions ni nuevos services**.

**7.2.2 Exportacion de registros de mantenimiento** (`exportarRegistrosMantenimiento`):

Agregar columnas al objeto `RegistroMantenimientoExport` (archivo `frontend/src/types/mantenimiento.types.ts`) y a su serializacion en backend (`backend/cloud/main.js` funcion `exportarRegistrosMantenimiento` lineas ~5662+):

| Columna | Descripcion |
|---------|-------------|
| Tipo (legible) | Traducido de `tipoMantenimiento` a "Preventivo" / "Correctivo" / "Predictivo" |
| Estado (legible) | Traducido de `estadoValidacion` |
| Dominio (legible) | Traducido de `dominio` |
| Clasificacion / Pauta | `clasificacionEquipo` (ya existia) — confirmar header legible "Pauta / Clasificacion" |
| Es retroactivo | "Si" / "No" — calculado: `true` si la diferencia entre `createdAt` y `fecha` supera X dias (parametro, default 7 dias) |
| Periodo que cubre | Numero de periodo del cumplimiento (del 1 al N) — calculado al momento de exportar a partir de `fechaBase` del activo y la frecuencia |
| Observacion del motivo retroactivo | Nuevo campo `motivoRetroactivo` que se guarda al registrar mantenimientos atrasados (ver 7.3) |

**Reutilizacion**: el flujo paginado existente (`MantenimientoExportService.fetchAll`, ver `frontend/src/services/mantenimiento-export.service.ts`) se mantiene sin cambios. Solo cambia el payload por fila.

**7.2.3 Reporte combinado opcional de cumplimiento**

Como parte de Etapa 4 ya se propuso un reporte Excel desde el dashboard. Ese reporte se **reutiliza** aqui: las mismas columnas de 7.2.1 aplican para el listado de cumplimiento. No se crean nuevas rutas ni componentes.

#### 7.3 Gestion de pautas faltantes / atrasadas / olvidadas

**Problema**: un activo puede tener periodos faltantes porque:

1. Nunca se ejecuto el mantenimiento (olvido).
2. Se ejecuto fisicamente pero no se registro en el sistema (deuda de registro).
3. El activo es nuevo y apenas se esta configurando en el sistema.

El sistema debe permitir **regularizar** estos casos **sin crear modulos paralelos** ni duplicar flujos.

**Propuesta: modo "Mantenimiento atrasado" integrado en el wizard existente `/admin/mantenimiento/nuevo`**

Se reutiliza el wizard actual (`MantenimientoNuevoPage`) y se anaden los siguientes comportamientos controlados por contexto, no por un wizard nuevo:

1. **Entrada al wizard con contexto de retraso**:
   - Desde el timeline de cumplimiento del activo (Etapa 3), cada periodo `faltante` muestra un boton "Registrar mantenimiento atrasado".
   - Este boton lleva a `/admin/mantenimiento/nuevo` con query params:
     - `dominio`
     - `activoId`
     - `periodoIndice` (numero del periodo faltante)
     - `fechaSugerida` (fecha media del periodo, o `fechaHasta - 1 dia`)
     - `retroactivo=1`
     - `motivoRetroactivo` (opcional, prellenable tras preguntar al usuario)

2. **Indicador visual en el wizard**:
   - Al detectar `retroactivo=1`, el wizard muestra un banner informativo amarillo: "Estas registrando un mantenimiento atrasado del periodo #N (fecha teorica: dd/mm/yyyy – dd/mm/yyyy)".
   - El campo de fecha (ver Etapa 8) queda prellenado con `fechaSugerida`.
   - El tipo de mantenimiento se fija automaticamente en `preventivo` (no editable si es retroactivo de un periodo preventivo).

3. **Campo nuevo `motivoRetroactivo`** en `RegistroMantenimiento`:
   - Texto libre obligatorio cuando `retroactivo=true`.
   - Se guarda junto con `esRetroactivo: true` en el registro.
   - Se visualiza en la pestana Mantenimientos del activo con un chip "Retroactivo" al lado de la fecha.

4. **Validacion y permisos**:
   - Registrar un mantenimiento retroactivo requiere los **mismos permisos** que uno normal (OPERATOR 2).
   - El admin mantiene la responsabilidad de aprobar/rechazar.
   - Al aprobar un retroactivo, el cumplimiento se recalcula y el periodo correspondiente pasa a `cumplido`.

5. **Deteccion automatica del periodo cubierto**:
   - Al momento de guardar, el backend calcula a que periodo pertenece la fecha indicada (usando el algoritmo de `calcularCumplimiento`).
   - Si la fecha cae fuera de todos los periodos esperados (ej: anterior a `fechaBase`), se rechaza con error HTTP 400 y mensaje claro.

6. **Tolerancia de solapamiento**:
   - Si ya existe un mantenimiento aprobado en el mismo periodo, el sistema acepta el retroactivo pero lo marca como `extra` del periodo (ya definido en Etapa 1). No se genera doble conteo.

**Campo nuevo en `RegistroMantenimiento`**:

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| `esRetroactivo` | Boolean | No | Default `false`. Se setea `true` si `retroactivo=1` en el wizard o si `createdAt - fecha > 7 dias` |
| `motivoRetroactivo` | String | Solo si `esRetroactivo=true` | Justificacion del registro tardio |
| `periodoIndice` | Number | No | Periodo teorico que cubre (se autocalcula pero se guarda para trazabilidad) |

> Estos campos NO requieren clase Parse nueva — se suman a `RegistroMantenimiento`.

#### 7.4 Detalle de pautas faltantes en el Dashboard (Etapa 4)

La vista de cumplimiento `/admin/mantenimiento/cumplimiento` (Etapa 4) se extiende con:

- Seccion "Regularizaciones pendientes": lista de activos con `periodosFaltantes >= 1`, agrupados por dominio y servicio.
- Cada fila tiene un boton directo "Registrar atrasado" que lleva al wizard con `retroactivo=1` y el periodo mas antiguo faltante precargado.
- Filtro "Solo con retraso > X meses" para priorizar.

Esto **no anade rutas nuevas** — es una seccion dentro del dashboard existente.

#### 7.5 Reporte Excel de pautas faltantes

Desde el dashboard, un boton "Exportar regularizaciones" genera un Excel con columnas:

| Columna | Descripcion |
|---------|-------------|
| Dominio | equipoMedico / equipoIndustrial / flotaVehicular / infraestructura (legible) |
| Activo | Nombre del activo |
| Identificador | Serie+Inventario / Patente / Codigo |
| Pauta asignada | `pautaAsignada` del activo |
| Periodos faltantes | Cantidad |
| Periodos esperados | Cantidad |
| Fechas periodos faltantes | Lista separada por `;` (ej: "01/03/2025; 01/09/2025") |
| Ultimo mantenimiento | Fecha + estado |
| Estado cumplimiento | Legible |
| Responsable (servicio/ubicacion) | Del activo |

Se reutiliza la infraestructura de exportacion ya existente (paginacion en bloques de 1000).

#### Entregable Etapa 7

- Constante `DOMINIO_POR_CLASE` en backend que formaliza el mapeo activoClase → dominio, alineado con el frontend.
- `exportarInventario*` modificados para incluir columnas de cumplimiento con etiquetas legibles.
- `exportarRegistrosMantenimiento` modificada para incluir traducciones legibles y flag `esRetroactivo`.
- Campos `esRetroactivo`, `motivoRetroactivo`, `periodoIndice` agregados a `RegistroMantenimiento` (sin nueva clase).
- Wizard `/admin/mantenimiento/nuevo` reconoce query params `retroactivo`, `periodoIndice`, `fechaSugerida`, `motivoRetroactivo` y muestra banner + prellenado.
- Dashboard Etapa 4 extendido con seccion "Regularizaciones pendientes" + exportacion Excel.
- No se crean modulos paralelos: todo reutiliza el wizard, services y componentes existentes.

---

### ETAPA 8 — Edicion de la fecha del mantenimiento y regla no-regresiva

**Objetivo**: permitir al tecnico editar la fecha del mantenimiento en el wizard (`/admin/mantenimiento/nuevo`), de modo que pueda registrar correctamente un mantenimiento ejecutado en fecha pasada (por retraso, olvido o registro tardio). Al mismo tiempo, garantizar que la `ultimaFechaMantenimiento` del inventario **NO retroceda** si la fecha ingresada es anterior a la que ya esta visible.

#### 8.1 Estado actual

En `frontend/src/app/admin/mantenimiento/nuevo/page.tsx` linea 119:

```
const fecha = new Date().toISOString().slice(0, 10);
```

La fecha esta **hardcoded al dia actual** y se envia tal cual al cloud function `crearRegistroMantenimiento`. No hay UI para editarla. Esto impide registrar mantenimientos atrasados con la fecha real.

#### 8.2 Cambio propuesto en el wizard

**Ubicacion del control**: Paso 4 del wizard ("Observaciones y Firma"), seccion superior, junto a "Fecha sugerida proximo mantenimiento" (actualmente linea 680). El input de fecha del mantenimiento debe ser el **primer campo** de ese paso para maxima visibilidad.

**Reemplazar** la derivacion constante por estado editable:

```
// En lugar de:
// const fecha = new Date().toISOString().slice(0, 10);

// Usar:
const [fecha, setFecha] = useState<string>(
  searchParams.get('fechaSugerida') || new Date().toISOString().slice(0, 10)
);
```

**UI del campo**:

- Label: "Fecha de ejecucion del mantenimiento"
- Tipo: `<input type="date" />`
- Valor inicial: `fechaSugerida` de query params (si existe, caso retroactivo de Etapa 7) o la fecha de hoy.
- Restricciones en el input:
  - `max = fechaActual` (nunca futuro)
  - `min = fechaBase del activo seleccionado` (nunca anterior a adquisicion/instalacion). Se obtiene del activo seleccionado en el paso 1.
- Ayuda contextual bajo el input (texto pequeno gris):
  - "Puedes indicar la fecha real en que se ejecuto el mantenimiento, incluso si fue en dias anteriores. No se permiten fechas futuras ni anteriores a la fecha de adquisicion/instalacion del activo."

**Banner informativo condicional**:

Al seleccionar una fecha anterior al dia de hoy en **mas de N dias** (configurable, default 7), mostrar banner amarillo:

```
Este mantenimiento se esta registrando en modo retroactivo
(ejecutado hace X dias). Si esta cubriendo un periodo faltante,
indica el motivo en el campo "Motivo del registro tardio".
```

Y se revela un textarea **obligatorio** `motivoRetroactivo` (integra con Etapa 7.3).

Ademas, si la fecha ingresada es **anterior** a `ultimaFechaMantenimiento` actual del activo (que conocemos del paso 1, al buscar el activo), se agrega un mensaje azul informativo:

```
Nota: este mantenimiento quedara registrado en el historial del activo,
pero NO reemplazara la fecha de ultima mantencion visible (ya existe un
mantenimiento posterior con fecha dd/mm/yyyy).
```

#### 8.3 Validaciones en el wizard

Antes de permitir pasar del paso 4 al envio:

1. `fecha` no vacia.
2. `fecha <= hoy`.
3. `fecha >= fechaBase` del activo seleccionado.
4. Si `fecha < hoy - 7 dias` → `motivoRetroactivo` obligatorio y no vacio.
5. Si `proximoMantenimiento` esta presente → `proximoMantenimiento > fecha`.

Si alguna falla, se resalta en rojo con mensaje de error y SweetAlert2 al intentar enviar.

#### 8.4 Propagacion al backend

`crearRegistroMantenimiento` ya recibe `data.fecha` y lo persiste. **No requiere cambios de firma**. Si Etapa 7 esta en vigor:

- Agregar validacion en backend:
  - `data.fecha` no futura (doble validacion, por seguridad).
  - `data.fecha >= fechaBase` del activo (consulta al inventario).
- Setear `esRetroactivo = true` si `createdAt - fecha > 7 dias`.
- Setear `motivoRetroactivo = data.motivoRetroactivo` si aplica.
- Calcular y guardar `periodoIndice` (ver Etapa 7.3).

#### 8.5 Regla no-regresiva en `sincronizarCumplimientoActivo`

Esta es la regla clave solicitada. La funcion centralizada (definida en Etapas 1/5/6) se extiende con:

```
# Pseudocodigo
funcion resolverUltimoMantenimiento(activoId, activoClase):
  registros = RegistroMantenimiento
    .equalTo('activoId', activoId)
    .equalTo('activoClase', activoClase)
    .equalTo('activo', true)
    .notEqualTo('estadoValidacion', 'rechazado')
    .descending('fecha')    # SIEMPRE por fecha desc, no por createdAt
    .limit(50)
    .find(masterKey)

  si registros vacio:
    retornar { fecha: '', estado: 'sin_historial', ... }

  ultimoValido = registros[0]   # el de mayor fecha real, NO el mas recien creado

  retornar {
    fecha: ultimoValido.fecha,
    id: ultimoValido.id,
    tipo: ultimoValido.tipoMantenimiento,
    estado: ultimoValido.estadoValidacion
  }
```

**Comportamiento resultante**:

| Escenario | Fecha ingresada | Ultima fecha existente | Resultado |
|-----------|-----------------|------------------------|-----------|
| Mantenimiento al dia (hoy) | 24/04/2026 | 15/03/2026 | `ultimaFechaMantenimiento` = 24/04/2026 (avanza) |
| Retroactivo no-regresivo | 10/02/2026 | 15/03/2026 | `ultimaFechaMantenimiento` = 15/03/2026 (sin cambio; el nuevo registro queda en historial pero no "pisa" el mas reciente) |
| Primer registro | cualquier | vacio | `ultimaFechaMantenimiento` = la ingresada |
| Retroactivo que SI actualiza | 20/03/2026 | 15/03/2026 | `ultimaFechaMantenimiento` = 20/03/2026 (es posterior a la existente aunque se ingreso hoy) |

> **Justificacion**: ordenar por `fecha` desc (no por `createdAt`) implementa naturalmente la regla no-regresiva. Un registro retroactivo con fecha anterior a la ultima visible simplemente NO sera el primero del resultado ordenado, por lo que no actualiza el campo denormalizado. Sigue siendo parte del historial y contabiliza para el cumplimiento de su periodo.

#### 8.6 Impacto en el timeline (Etapa 3)

El timeline ya ordena cronologicamente los registros por `fecha`. Al registrar un retroactivo, aparece en el periodo que le corresponde (no al final). Si hay `extras` del periodo (otros registros posteriores), se visualizan dentro del mismo nodo.

Adicionalmente, cada nodo con registro retroactivo muestra un chip "Retroactivo" y el `motivoRetroactivo` en tooltip al hacer hover.

#### 8.7 Impacto en el historial del registro

En `MantenimientoHistorial`, la accion `creacion` se enriquece con detalles:

```
{
  accion: 'creacion',
  descripcion: 'Registro de mantenimiento preventivo creado para "Caldera #3" (retroactivo, ejecutado el 10/02/2026)',
  detalles: {
    dominio: 'equipoIndustrial',
    tipoMantenimiento: 'preventivo',
    esRetroactivo: true,
    diasDeRetraso: 73,
    motivoRetroactivo: 'Ejecutado en terreno; registro pendiente por falla de conectividad'
  }
}
```

Esto permite a los auditores identificar patrones de registros tardios.

#### 8.8 Impacto en las exportaciones Excel (Etapa 7.2.2)

Las nuevas columnas `Es retroactivo`, `Periodo que cubre` y `Observacion del motivo retroactivo` (definidas en 7.2.2) se nutren directamente de los campos `esRetroactivo`, `periodoIndice` y `motivoRetroactivo`.

#### 8.9 Pruebas criticas a documentar

1. **Wizard con fecha hoy**: flujo estandar, banner no aparece, no se pide motivo.
2. **Wizard con fecha -10 dias**: banner aparece, campo motivo obligatorio, se envia correctamente.
3. **Wizard con fecha futura**: bloqueado por `max` del input y por validacion de backend.
4. **Wizard con fecha anterior a fechaBase**: bloqueado por `min` del input y por validacion de backend.
5. **Mantenimiento retroactivo que NO supera la ultima fecha**: inventario conserva la fecha previa, timeline muestra el registro en su periodo correcto.
6. **Mantenimiento retroactivo que SI supera la ultima fecha** (caso poco comun pero posible): inventario actualiza `ultimaFechaMantenimiento`.
7. **Rechazo posterior de un registro retroactivo**: Etapa 6 revierte correctamente al siguiente no-rechazado ordenado por fecha.

#### Entregable Etapa 8

- Campo `fecha` del wizard convertido en `useState` editable con validaciones `min`/`max` basadas en `fechaBase` del activo y `hoy`.
- Banner informativo y textarea `motivoRetroactivo` obligatorio cuando la fecha supera el umbral de retraso.
- Mensaje informativo cuando la fecha ingresada es anterior a la `ultimaFechaMantenimiento` existente.
- Validacion de backend en `crearRegistroMantenimiento` (rango de fecha + motivo si retroactivo).
- Regla no-regresiva implementada naturalmente via `descending('fecha')` en `resolverUltimoMantenimiento`.
- Historial y exportaciones Excel enriquecidos con la informacion de retroactividad.
- No se crean rutas, wizards ni componentes nuevos: se modifica el existente.

---

### ETAPA 9 — Boton "Sincronizar" consolidado en los 4 inventarios

**Objetivo**: simplificar la operacion del coordinador unificando dos sincronizaciones (convenios + cumplimiento de mantenimiento) en un unico boton dentro de cada inventario, evitando que tenga que ejecutar cada operacion por separado desde puntos distintos del sistema.

#### 9.1 Estado previo a la Etapa 9

Cada uno de los 4 inventarios (`/admin/inventario`, `/admin/inventario-industrial`, `/admin/flota-vehicular`, `/admin/infraestructura`) tenia un boton verde **"Actualizar Convenios"** que invocaba unicamente `sincronizarConveniosInventario` (modulo de proveedores, Etapa 3 de aquel modulo).

Por separado, el dashboard `/admin/mantenimiento/cumplimiento` (Etapa 4) ofrecia un boton "Sincronizar todos" que ejecutaba `sincronizarCumplimientoMasivo`.

**Problema operativo**: el coordinador tenia que recordar que despues de tocar licitaciones debia ejecutar convenios; y despues de aprobar/rechazar mantenimientos en bulk debia ir al dashboard para refrescar cumplimiento. Dos flujos separados, mismo objetivo de "tener el inventario actualizado".

#### 9.2 Cambio propuesto (implementado)

**Botón unificado**: el boton de cada inventario se renombra a **"Sincronizar"** (handler renombrado de `handleSyncConvenios` a `handleSync`) y dispara las dos cloud functions en paralelo, **filtradas al inventario donde esta parado el usuario**:

```
Promise.all([
  Parse.Cloud.run('sincronizarConveniosInventario', { inventarioTipo: 'medico' }).catch((e) => ({ _error: e?.message })),
  Parse.Cloud.run('sincronizarCumplimientoMasivo',   { dominio: 'equipoMedico' }).catch((e) => ({ _error: e?.message })),
])
```

**Mapeo inventario → params**:

| Pagina | inventarioTipo (convenios) | dominio (cumplimiento) |
|--------|----------------------------|------------------------|
| `/admin/inventario` | `medico` | `equipoMedico` |
| `/admin/inventario-industrial` | `industrial` | `equipoIndustrial` |
| `/admin/flota-vehicular` | `flota` | `flotaVehicular` |
| `/admin/infraestructura` | `infraestructura` | `infraestructura` |

**Tolerancia a fallos parciales**: cada `Parse.Cloud.run` esta envuelto en `.catch()` que retorna `{ _error: msg }` en lugar de rechazar la promesa. Esto permite que si el usuario es solo COORDINATOR (sin permisos ADMIN para `sincronizarCumplimientoMasivo`), los convenios se sincronicen igual y el resultado de cumplimiento muestre el error con un hint `"(requiere permisos ADMIN)"`.

**SweetAlert resultado consolidado**:

```
Sincronizacion completada
  Convenios
    Equipos actualizados: 8
    Con convenio vigente: 5
    Sin convenio: 3

  Cumplimiento de mantenimiento
    Procesados: 8
    OK: 8
    (Errores: 0)
```

#### 9.3 Permisos y gating

| Operacion | accessLevel | Comportamiento |
|-----------|-------------|----------------|
| Ver el boton "Sincronizar" | 3 (COORDINATOR) | Boton visible |
| Ejecutar `sincronizarConveniosInventario` | 3 (COORDINATOR) | Funciona |
| Ejecutar `sincronizarCumplimientoMasivo` | 4 (ADMIN) | Falla controlada en COORDINATOR; el SweetAlert lo aclara |

El boton sigue restringido a `userAccessLevel >= 3`. Un coordinador podra ver convenios actualizados pero el cumplimiento mostrara error explicativo (no bloqueante para el resto).

#### 9.4 Tooltip y UX

- Tooltip del boton: `"Sincronizar convenios + cumplimiento de mantenimiento"`.
- Confirmacion previa con SweetAlert que enumera las dos operaciones y advierte que puede tomar varios segundos.
- El icono `MdSync` se mantiene; aparece girando durante la operacion (`syncing` flag).
- Tras completar, se invoca `fetchEquipos()` / `fetchVehiculos()` / `fetchComponentes()` para refrescar la tabla.

#### 9.5 Decision sobre cloud function unificada (descartada)

Se evaluo crear una nueva cloud function `sincronizarInventarioCompleto(inventarioTipo)` que internamente invocara ambas. Se descarto porque:

- Las funciones existentes ya cubren el caso aisladamente.
- Tener una funcion compuesta agregaria una capa de duplicacion sin ganancia.
- La orquestacion en frontend permite mostrar errores parciales con mas claridad.
- Mantenimiento mas simple: cada cloud function evoluciona independientemente.

#### 9.6 Permisos minimos de la operacion (para una mejora futura)

Si se desea que un COORDINATOR pueda ejecutar `sincronizarCumplimientoMasivo` (hoy bloqueado), podria:

a) Crear una version reducida `sincronizarCumplimientoDominio(dominio)` con permisos COORDINATOR (3) que solo opere sobre un dominio (no global). Esto mantiene la regla de seguridad: un coordinador no puede correr todo el sistema, pero si su dominio.

b) Mantener el comportamiento actual y exigir ADMIN.

**Decision actual**: mantener (b). La degradacion controlada del SweetAlert es suficiente para indicarle al coordinador que pida apoyo a un admin si el cumplimiento queda desactualizado.

#### Entregable Etapa 9

- 4 paginas de inventario con boton renombrado a "Sincronizar" (texto, handler, tooltip).
- `handleSync` ejecuta `Promise.all([convenios, cumplimiento])` con `.catch()` por operacion.
- SweetAlert resultado consolidado con secciones diferenciadas para Convenios y Cumplimiento.
- Tolerancia a fallos parciales: si una operacion falla por permisos, la otra sigue.
- Sin cloud functions nuevas: reutiliza `sincronizarConveniosInventario` y `sincronizarCumplimientoMasivo`.
- Sin cambios en `routes.tsx` ni en sidebar: el boton ya existia, solo cambia comportamiento.

---

## Resumen de impacto por archivo

### Backend (`backend/cloud/`)

| Etapa | Accion |
|-------|--------|
| 1 | Crear `utils/cumplimientoMantenimiento.js`. Agregar ~5 cloud functions nuevas. Agregar triggers `afterSave`/`afterDelete` en `RegistroMantenimiento` y los 4 `InventarioXxx`. Modificar 8 funciones `getInventarioXxx` + `getInventarioXxxById` + `exportarInventarioXxx` |
| 2 | Ninguna |
| 3 | Ninguna nueva. Posible: `generarPDFCumplimientoActivo` (opcional) |
| 4 | Agregar `getProximosMantenimientos`, `getEstadisticasCumplimiento` extendida, cron de alertas. Opcional: clase `CumplimientoMantenimientoPeriodo` + funciones |
| 5 | **Modificar** `crearRegistroMantenimiento` (lineas 4893–4973 de `main.js`) para invocar `sincronizarCumplimientoActivo` tras `registro.save()`. **Extender** `sincronizarCumplimientoActivo` para resolver y persistir `ultimaFechaMantenimiento`, `ultimoRegistroMantenimientoId`, `ultimoTipoMantenimiento`, `ultimoEstadoMantenimiento`. No se crean funciones nuevas |
| 6 | **Modificar** `aprobarMantenimiento` (lineas 5120–5169) y `rechazarMantenimiento` (lineas 5174–5223) para invocar `sincronizarCumplimientoActivo` tras el `save`. Opcional: nueva plantilla Brevo `mantenimiento_rechazado_reversion_inventario`. No se crean funciones nuevas |
| 7 | **Modificar** `exportarInventarioEquipos`, `exportarInventarioIndustrial`, `exportarInventarioFlota`, `exportarInventarioInfra` y `exportarRegistrosMantenimiento` para traducir a etiquetas legibles y sumar columnas nuevas. **Agregar** campos `esRetroactivo`, `motivoRetroactivo`, `periodoIndice` al schema de `RegistroMantenimiento` (via Parse.Object — no requiere migracion explicita). **Modificar** `crearRegistroMantenimiento` para calcular `esRetroactivo`, `periodoIndice` y validar `motivoRetroactivo`. Agregar constante `DOMINIO_POR_CLASE` a utilidades |
| 8 | **Modificar** `crearRegistroMantenimiento` para validar rango de `fecha` (`fechaBase <= fecha <= hoy`). Extender `resolverUltimoMantenimiento` (funcion de utilidades Etapa 5) para ordenar SIEMPRE por `fecha` desc. No se crean funciones nuevas |
| 9 | **Sin cambios en backend**. Reutiliza `sincronizarConveniosInventario` (modulo proveedores) y `sincronizarCumplimientoMasivo` (Etapa 1). Solo cambian llamadas en frontend |

### Frontend — archivos nuevos

| Etapa | Archivos nuevos |
|-------|----------------|
| 2 | `types/cumplimiento-mantenimiento.types.ts`, `components/admin/mantenimiento/CumplimientoBadge.tsx` |
| 3 | `components/admin/mantenimiento/ActivoMantenimientosPanel.tsx`, `ActivoMantenimientosTimeline.tsx`, `ActivoMantenimientosMetricas.tsx` |
| 4 | `app/admin/mantenimiento/cumplimiento/page.tsx`, `components/admin/mantenimiento/CumplimientoDashboard.tsx`, `CumplimientoKPICards.tsx`, `CumplimientoPorDominioChart.tsx`, `CumplimientoTopCriticos.tsx` |
| 5 | **Ninguno**. Se reutilizan `CumplimientoBadge` (Etapa 2) y el mapeo del service; el nuevo campo `ultimoEstadoMantenimiento` solo requiere agregarse a los tipos ya existentes de Etapa 2 |
| 6 | **Ninguno**. Se reutiliza la UI de listado y detalle; el usuario percibe el cambio de `ultimaFechaMantenimiento` automaticamente al rechazar |
| 7 | **Ninguno**. Se reutiliza el wizard `MantenimientoNuevoPage`, el `ActivoMantenimientosPanel` (Etapa 3) y el dashboard de cumplimiento (Etapa 4). Solo se anaden props y query params |
| 8 | **Ninguno**. Se modifica el paso 4 del wizard existente para editar fecha + agregar textarea `motivoRetroactivo` condicional |
| 9 | **Ninguno**. Se modifican los handlers existentes de las 4 paginas de inventario (renombre `handleSyncConvenios` → `handleSync` y nueva logica) |

### Frontend — archivos existentes modificados

| Archivo | Etapa | Cambio |
|---------|-------|--------|
| `types/inventario-equipo.types.ts` | 2 | Agregar campos de cumplimiento + filtros |
| `types/inventario-industrial.types.ts` | 2 | Idem |
| `types/inventario-flota.types.ts` | 2 | Idem |
| `types/inventario-infraestructura.types.ts` | 2 | Idem |
| `services/inventario-equipo.service.ts` | 2 | `mapItem` con campos nuevos + filtros |
| `services/inventario-industrial.service.ts` | 2 | Idem |
| `services/inventario-flota.service.ts` | 2 | Idem |
| `services/inventario-infraestructura.service.ts` | 2 | Idem |
| `services/mantenimiento.service.ts` | 1 | Agregar wrapper para `calcularCumplimientoMantenimiento` |
| `app/admin/inventario/page.tsx` | 2 | Columnas, filtros, tarjetas resumen |
| `app/admin/inventario-industrial/page.tsx` | 2 | Idem |
| `app/admin/flota-vehicular/page.tsx` | 2 | Idem |
| `app/admin/infraestructura/page.tsx` | 2 | Idem |
| `components/admin/inventario/InventarioDetailModal.tsx` | 3 | Nueva tab "Mantenimientos" + mini-seccion en Detalle |
| `components/admin/inventario-industrial/InventarioIndustrialDetailModal.tsx` | 3 | Idem |
| `components/admin/flota-vehicular/FlotaVehicularDetailModal.tsx` | 3 | Idem |
| `components/admin/infraestructura/InfraestructuraDetailModal.tsx` | 3 | Idem |
| `app/admin/mantenimiento/nuevo/page.tsx` (wizard) | 3 | Aceptar query params `dominio`, `activoId`, `fechaSugerida`, `registroRetroactivoPeriodo` |
| `routes.tsx` | 4 | Nueva entrada "Cumplimiento" en el grupo Mantenimiento |
| `app/admin/solicitudes/...` | 4 | Prellenado desde cumplimiento (opcional) |
| `backend/cloud/main.js` — `crearRegistroMantenimiento` (lineas ~4893–4973) | 5 | Agregar llamada a `sincronizarCumplimientoActivo` tras `registro.save()` en bloque `try/catch` interno no bloqueante |
| `backend/cloud/main.js` — `aprobarMantenimiento` (lineas ~5120–5169) | 6 | Idem: llamada a `sincronizarCumplimientoActivo` tras guardar la aprobacion |
| `backend/cloud/main.js` — `rechazarMantenimiento` (lineas ~5174–5223) | 6 | Idem: llamada a `sincronizarCumplimientoActivo` tras guardar el rechazo (reversion automatica al ultimo aprobado) |
| `backend/cloud/utils/cumplimientoMantenimiento.js` | 5 | Extender algoritmo con `resolverUltimoMantenimiento(activoId, activoClase)` que descarta rechazados y devuelve `{ fecha, id, tipo, estado }` |
| Los 4 `types/inventario-*.types.ts` | 5 | Agregar campo `ultimoEstadoMantenimiento: string` a la interfaz (complementa los 10 campos introducidos en Etapa 2) |
| Los 4 services `inventario-*.service.ts` | 5 | Mapear `ultimoEstadoMantenimiento` en `mapItem` |
| `CumplimientoBadge.tsx` (Etapa 2) | 5 | Ampliar props para aceptar `ultimoEstadoMantenimiento` y renderizar badge amarillo "En validacion" cuando corresponde |
| `backend/cloud/main.js` — `exportarInventarioEquipos` / `exportarInventarioIndustrial` / `exportarInventarioFlota` / `exportarInventarioInfra` | 7 | Agregar columnas legibles (ultimo mantto, cumplimiento %, estado, etc.) con etiquetas en espanol |
| `backend/cloud/main.js` — `exportarRegistrosMantenimiento` (lineas ~5662+) | 7 | Agregar columnas `Tipo legible`, `Estado legible`, `Dominio legible`, `Pauta / Clasificacion`, `Es retroactivo`, `Periodo que cubre`, `Motivo retroactivo` |
| `backend/cloud/main.js` — `crearRegistroMantenimiento` (lineas ~4893–4973) | 7, 8 | Validar `fecha` en rango, setear `esRetroactivo` / `periodoIndice` / `motivoRetroactivo`. Validacion duplicada en backend como defensa en profundidad |
| `types/mantenimiento.types.ts` — `RegistroMantenimiento` y `MantenimientoFormData` | 7 | Agregar `esRetroactivo: boolean`, `motivoRetroactivo: string`, `periodoIndice: number` |
| `types/mantenimiento.types.ts` — `RegistroMantenimientoExport` | 7 | Agregar las columnas exportables legibles |
| `app/admin/mantenimiento/nuevo/page.tsx` | 7, 8 | Leer query params (`retroactivo`, `periodoIndice`, `fechaSugerida`, `motivoRetroactivo`). Reemplazar `const fecha` por `useState`. Banner amarillo si retraso > 7 dias. Textarea `motivoRetroactivo` condicional. Mensaje informativo si fecha < ultimaFechaMantenimiento existente. Validaciones min/max |
| `services/mantenimiento.service.ts` — `crearRegistro` | 7, 8 | Propagar nuevos campos en `MantenimientoFormData` |
| Timeline de Etapa 3 (`ActivoMantenimientosTimeline.tsx`) | 7 | Chip "Retroactivo" y tooltip con `motivoRetroactivo` |
| Dashboard de Etapa 4 | 7 | Seccion "Regularizaciones pendientes" + boton "Exportar regularizaciones" + boton "Registrar atrasado" por fila |
| `app/admin/inventario/page.tsx` (medicos) | 9 | Renombrar `handleSyncConvenios` → `handleSync`. Promise.all([convenios, cumplimiento]). SweetAlert consolidado. Boton renombrado a "Sincronizar" |
| `app/admin/inventario-industrial/page.tsx` | 9 | Idem. Params: `inventarioTipo: 'industrial'`, `dominio: 'equipoIndustrial'` |
| `app/admin/flota-vehicular/page.tsx` | 9 | Idem. Params: `inventarioTipo: 'flota'`, `dominio: 'flotaVehicular'` |
| `app/admin/infraestructura/page.tsx` | 9 | Idem. Params: `inventarioTipo: 'infraestructura'`, `dominio: 'infraestructura'` |

---

## Dependencias entre etapas

```
Etapa 1 (Backend: motor de calculo + denormalizacion)
  ├──► Etapa 2 (Listados + filtros en 4 inventarios)
  │      ├──► Etapa 3 (Pestana de Mantenimientos con timeline)
  │      │      └──► Etapa 4 (Dashboard + alertas + integraciones)
  │      │             └──► Etapa 7 (Pautas centralizadas + Excel + retroactivos)
  │      │                    └──► Etapa 8 (Edicion fecha + regla no-regresiva)
  │      └──► Etapa 9 (Boton "Sincronizar" consolidado en 4 inventarios)
  └──► Etapa 5 (Actualizacion inmediata al registrar)
         └──► Etapa 6 (Reversion automatica al rechazar / aprobar)
```

- **Etapa 1**: bloqueante. Nada de UI puede avanzar sin los campos denormalizados y las cloud functions.
- **Etapa 2**: requiere Etapa 1 completada y migracion inicial ejecutada.
- **Etapa 3**: requiere Etapa 2 (al menos los tipos y services) y la cloud function `calcularCumplimientoMantenimiento`.
- **Etapa 4**: depende de Etapa 3 para la navegacion cruzada. El dashboard puede desarrollarse en paralelo una vez completada Etapa 2.
- **Etapa 5**: depende de Etapa 1 (utiliza `sincronizarCumplimientoActivo`). Es **independiente de Etapas 2, 3 y 4**, puede desplegarse en cualquier momento despues de Etapa 1. Aporta valor incluso sin UI nueva (los datos quedan correctos en backend).
- **Etapa 6**: depende de Etapa 5 (comparten la misma logica centralizada). Se puede implementar en la misma iteracion que Etapa 5, ya que solo anade dos llamadas simetricas mas (`aprobarMantenimiento` y `rechazarMantenimiento`).
- **Etapa 7**: depende de Etapa 4 (extiende dashboard y exportaciones) y Etapa 5 (los campos denormalizados deben existir para ser exportados). Introduce campos `esRetroactivo`, `motivoRetroactivo`, `periodoIndice` en `RegistroMantenimiento`.
- **Etapa 8**: depende de Etapa 7 (usa los campos y banner de retroactivo). Completa el ciclo permitiendo la edicion real de la fecha en el wizard con la regla no-regresiva.
- **Etapa 9**: depende de Etapa 1 (necesita `sincronizarCumplimientoMasivo`) y de la existencia previa del modulo de proveedores (Etapa 3 de aquel modulo, ya implementado). Es independiente de Etapas 2-8 — puede ejecutarse en cualquier orden despues de tener Etapa 1 desplegada. Aporta valor incluso sin Etapas 7/8 ya que solo unifica botones existentes.

---

## Consideraciones tecnicas transversales

### Rendimiento

- **Calculo on-demand vs denormalizado**: el listado SIEMPRE lee los campos denormalizados (rapido, consistente con paginacion y filtros). El detalle usa `calcularCumplimientoMantenimiento` en tiempo real para tener precision absoluta al minuto (historial pudo actualizarse desde la ultima sincronizacion).

- **Triggers asincronos**: `afterSave` en `RegistroMantenimiento` dispara `sincronizarCumplimientoActivo`. Si esto demora, considerar encolar con job externo o `setImmediate`/promise no awaited — pero cuidar con errores silenciosos.

- **Migracion masiva**: paginada en lotes de 500 activos. Con 10.000 activos ≈ 20 lotes. Ejecutar fuera de horario pico.

### Consistencia

- **Re-sincronizacion periodica**: un cron semanal que ejecute `sincronizarCumplimientoMasivo` para corregir eventuales desincronizaciones por triggers fallidos.

- **Version del calculo**: agregar campo `cumplimientoVersion` al activo (numero) e incrementarlo si se modifica el algoritmo para forzar recalculos.

### Internacionalizacion

- Todos los labels en espanol, siguiendo la convencion del proyecto (`ESTADO_CUMPLIMIENTO_LABELS` etc.).
- Formato de fechas: `dd/mm/yyyy` (locale `es-CL`) en UI; `YYYY-MM-DD` en almacenamiento.

### Pruebas

- **Unitarias** sobre `calcularCumplimiento` con casos borde: sin historial, con baja, multiples mantenimientos por periodo, fechaBase futura, periodo en curso, etc.
- **Integracion**: crear activo, crear mantenimientos, verificar que los campos denormalizados quedan correctos tras cada `afterSave`.
- **UI**: snapshot del `ActivoMantenimientosPanel` con datos sintéticos que cubran los 6 estados.

### Relacion con el Manual de Acreditacion

| Estandar | Beneficio del nuevo modulo |
|----------|----------------------------|
| EQ 2.1 (100%) | Identifica inmediatamente equipos criticos sin cumplimiento para priorizar regularizacion |
| EQ 2.2 (>=50%) | Metrica porcentual directa comparable con el umbral |
| INS 3.1 (100%) | Timeline de periodos permite demostrar ejecucion sistematica en auditoria |
| INS 3.2 (>=75%) | Dashboard agrupado por sistema para foco en electrico y agua |

Cada activo con `estadoCumplimientoMantenimiento = "al_dia"` constituye evidencia objetiva de cumplimiento continuo.

---

## Preguntas abiertas para resolver antes de implementar

1. **Tipo de mantenimiento a contar**: ¿solo `preventivo` cubre periodos, o tambien `correctivo` y `predictivo`? Propuesta: solo `preventivo` cuenta (correctivos son ad-hoc). Confirmar con negocio.
2. **Tolerancia en el cierre de periodos**: ¿un mantenimiento ejecutado 5 dias despues del fin del periodo sigue "cumpliendo" ese periodo? Propuesta: si la fecha cae en el siguiente periodo pero dentro de una tolerancia configurable (ej: 15 dias), se acepta como cumplimiento del anterior. Parametrizable.
3. **Granularidad del dashboard**: ¿filtros por servicio/ubicacion o solo por dominio? Requiere inputs del coordinador operativo.
4. **Frecuencia del cron de alertas**: diario, semanal, configurable. Propuesta: diario 08:00 con opt-out por usuario.
5. **Persistencia de `CumplimientoMantenimientoPeriodo`**: decidir en Etapa 4 segun performance real.

---

## Plan de Pruebas por Etapa

Cada etapa debe entregarse con pruebas que validen las nuevas funcionalidades antes de considerarla cerrada. El proyecto no tiene suite formal configurada aun, por lo que cada etapa introduce los archivos necesarios dentro de `backend/tests/` y/o `frontend/src/__tests__/` siguiendo el stack ya disponible (`jest` + `@testing-library/react` para frontend, `jest` puro para cloud functions con mocks de Parse).

> **Principio comun**: cada test se ejecuta contra datos en memoria (Parse mock) o contra una instancia aislada del backend. NO se corren contra la base productiva.

### Tests de la Etapa 1 — Motor de calculo

**Unitarios puros** (`backend/tests/cumplimientoMantenimiento.test.js`):

| ID | Caso | Resultado esperado |
|----|------|--------------------|
| T1.1 | `frecuencia = 0` | `estadoCumplimiento = 'sin_configuracion'`, `periodos = []` |
| T1.2 | `fechaBase` futura | `periodos = []`, `estadoCumplimiento = 'al_dia'` |
| T1.3 | `fechaBase = hoy - 12 meses`, `frecuencia = 6`, sin historial | `periodosEsperados = 2`, `periodosCumplidos = 0`, estado `sin_historial` |
| T1.4 | Mismo T1.3 con 2 aprobados en los 2 periodos | estado `al_dia`, `cumplimientoPorcentaje = 100` |
| T1.5 | 2 aprobados en el **mismo** periodo | uno cumple, otro queda en `extras`; cumplimiento no pasa del 100% |
| T1.6 | Aprobado fuera de periodos (anterior a fechaBase) | se lista como "fuera de plan", no cierra ningun periodo |
| T1.7 | `fechaBaja` vigente | linea de tiempo se corta; no se cuentan periodos posteriores a la baja |
| T1.8 | Registros `rechazados` y `pendientes` | NO cuentan para `periodosCumplidos` |

**Integracion** (`backend/tests/sincronizarCumplimientoActivo.integration.test.js`):

- T1.9: crear activo, crear mantenimiento aprobado, invocar `sincronizarCumplimientoActivo`, verificar campos denormalizados.
- T1.10: idempotencia — invocar 3 veces consecutivas, verificar mismo resultado.
- T1.11: `sincronizarCumplimientoMasivo` con 100 activos sinteticos, verificar paginacion y completitud.
- T1.12: triggers `afterSave`/`afterDelete` disparan recalculo automaticamente (fixture con fake timers).

### Tests de la Etapa 2 — Listados y filtros

**Backend**:

- T2.1: `getInventarioEquipos?estadoCumplimiento=critico` devuelve solo equipos con estado critico.
- T2.2: `getInventarioEquipos?ultimoMttoDesde=...&ultimoMttoHasta=...` filtra correctamente por rango.
- T2.3: exportaciones incluyen columnas de cumplimiento.

**Frontend** (`frontend/src/__tests__/components/CumplimientoBadge.test.tsx`):

- T2.4: render del badge por cada uno de los 6 estados.
- T2.5: tooltip muestra `"{cumplidos}/{esperados} ({porcentaje}%)"`.
- T2.6: `InventarioPage` aplica filtro de cumplimiento y recarga la lista.
- T2.7: columnas "Ultimo Mantto" y "Cumplimiento" se muestran con datos mockeados.

### Tests de la Etapa 3 — Pestana Mantenimientos con timeline

- T3.1: `ActivoMantenimientosPanel` renderiza 4 tarjetas con metricas de un payload mockeado.
- T3.2: timeline pinta nodos en estados `cumplido`, `faltante`, `en_curso` con colores correctos.
- T3.3: click en "Ver registro" dispara el router push al detalle del mantenimiento.
- T3.4: boton "Registrar retroactivo" solo visible para OPERATOR+.
- T3.5: navegacion a `/admin/mantenimiento/nuevo` incluye query params `dominio`, `activoId`, `fechaSugerida`, `retroactivo=1`.
- T3.6: badge de cantidad de `periodosFaltantes` en la tab "Mantenimientos" del modal.

### Tests de la Etapa 4 — Dashboard y alertas

- T4.1: `getEstadisticasCumplimiento` agrega correctamente por dominio (fixture con 50 activos).
- T4.2: KPIs del dashboard reflejan los conteos correctos ante mock de backend.
- T4.3: `getProximosMantenimientos(7)` devuelve activos con fecha esperada en ventana de 7 dias.
- T4.4: cron de alertas genera payloads agrupados por coordinador (test unitario del builder).
- T4.5: badge de sidebar muestra cantidad de criticos de forma reactiva.
- T4.6: boton "Sincronizar todos" invoca `sincronizarCumplimientoMasivo` y muestra progreso.

### Tests de la Etapa 5 — Actualizacion inmediata al registrar

- T5.1: crear registro via `crearRegistroMantenimiento` — tras el save, el inventario del activo tiene `ultimaFechaMantenimiento` = fecha del registro y `ultimoEstadoMantenimiento = 'pendiente'`.
- T5.2: crear dos registros del mismo activo en distintas fechas — el mas reciente queda como visible.
- T5.3: crear registro cuando el activo no existe — la falla de sincronizacion NO bloquea la creacion; el registro queda guardado; se log warn.
- T5.4: `resolverUltimoMantenimiento` descarta registros rechazados correctamente.
- T5.5: `ultimoEstadoMantenimiento = 'sin_historial'` si el activo no tiene registros.

### Tests de la Etapa 6 — Reversion al aprobar / rechazar

- T6.1: rechazar un registro pendiente que era la ultima mantencion — el inventario revierte al anterior aprobado.
- T6.2: rechazar el unico registro del activo — el inventario queda en `sin_historial`.
- T6.3: aprobar un pendiente — `ultimoEstadoMantenimiento` pasa de `pendiente` a `aprobado` y el cumplimiento se recalcula cerrando el periodo correspondiente.
- T6.4: rechazar un registro que NO era la ultima mantencion — el inventario no cambia.
- T6.5: concurrencia — dos rechazos en registros distintos del mismo activo ejecutados casi en paralelo convergen al mismo estado final (test con `Promise.all`).
- T6.6: `deleteRegistroMantenimiento` resincroniza igual que un rechazo.

### Tests de la Etapa 7 — Pautas, Excel y retroactivos

**Pautas centralizadas**:

- T7.1: `DOMINIO_POR_CLASE` mapea las 4 clases correctamente; clase desconocida lanza error.
- T7.2: un mantenimiento aprobado bajo clasificacion `"Caldera"` cuenta para el cumplimiento aunque `activo.pautaAsignada === "Caldera Industrial"` (no se filtra por clasificacion).

**Excel**:

- T7.3: `exportarInventarioEquipos` retorna filas con las nuevas columnas y valores traducidos a etiquetas humanas.
- T7.4: ninguna celda contiene codigos crudos (`'B'`, `'al_dia'`, `'aprobado'`) — todos traducidos.
- T7.5: fechas en formato `dd/mm/yyyy`; vacias como `—`.
- T7.6: `exportarRegistrosMantenimiento` incluye `Es retroactivo`, `Periodo que cubre`, `Motivo retroactivo`.
- T7.7: paginacion a 2500 registros produce 3 llamadas y acumulado correcto (reutiliza test existente si ya existe).

**Retroactivos**:

- T7.8: wizard con query `retroactivo=1&periodoIndice=3&fechaSugerida=2026-02-10` prellena fecha y muestra banner.
- T7.9: `crearRegistroMantenimiento` setea `esRetroactivo = true` automaticamente si `hoy - fecha > 7 dias`.
- T7.10: `motivoRetroactivo` obligatorio cuando `esRetroactivo = true` — el backend rechaza con 400 si falta.
- T7.11: `periodoIndice` se autocalcula correctamente segun `fechaBase` y `frecuencia`.
- T7.12: intento de registrar con fecha < `fechaBase` es rechazado por backend.

### Tests de la Etapa 8 — Edicion de fecha con regla no-regresiva

**Frontend (wizard)**:

- T8.1: input de fecha inicia con `hoy` si no hay `fechaSugerida`; con `fechaSugerida` si viene en query.
- T8.2: input respeta `min = fechaBase` y `max = hoy`; intentos fuera de rango se bloquean.
- T8.3: ingresar fecha con retraso > 7 dias revela banner amarillo y textarea `motivoRetroactivo` obligatorio.
- T8.4: ingresar fecha < `ultimaFechaMantenimiento` muestra mensaje informativo azul (no bloqueante).
- T8.5: envio sin motivo cuando es retroactivo es bloqueado con SweetAlert2.
- T8.6: envio con datos validos propaga `fecha`, `esRetroactivo`, `motivoRetroactivo` al service.

**Backend**:

- T8.7: `fecha` futura rechazada con 400 (defensa en profundidad).
- T8.8: `fecha` anterior a `fechaBase` rechazada con 400.
- T8.9: retroactivo sin `motivoRetroactivo` rechazado con 400.

**Regla no-regresiva** (`resolverUltimoMantenimiento`):

- T8.10: activo con aprobado en 15/03/2026 + nuevo retroactivo en 10/02/2026 → `ultimaFechaMantenimiento` sigue siendo 15/03/2026.
- T8.11: activo con aprobado en 15/03/2026 + nuevo retroactivo en 20/03/2026 → `ultimaFechaMantenimiento` actualiza a 20/03/2026.
- T8.12: activo sin historial + retroactivo en 05/01/2026 → `ultimaFechaMantenimiento` = 05/01/2026.
- T8.13: el retroactivo cierra el `periodoIndice` correspondiente aunque NO actualice `ultimaFechaMantenimiento`.
- T8.14: retroactivo rechazado luego — Etapa 6 revierte correctamente al siguiente ordenado por `fecha` desc.

### Tests de la Etapa 9 — Boton "Sincronizar" consolidado

**Verificacion estatica de las 4 paginas de inventario** (`scripts/test/test_9InventarioMantenimiento.js`):

- T9.1: las 4 paginas declaran `handleSync` y NO conservan `handleSyncConvenios` viejo.
- T9.2: el boton se renombra a `"Sincronizar"` (texto) y desaparece `"Actualizar Convenios"`.
- T9.3: cada `handleSync` invoca `sincronizarConveniosInventario` y `sincronizarCumplimientoMasivo` dentro de un `Promise.all`.
- T9.4: cada pagina invoca con su `inventarioTipo` y `dominio` correctos:
  - `inventario` → `medico` / `equipoMedico`
  - `inventario-industrial` → `industrial` / `equipoIndustrial`
  - `flota-vehicular` → `flota` / `flotaVehicular`
  - `infraestructura` → `infraestructura` / `infraestructura`
- T9.5: cada `Parse.Cloud.run` tiene `.catch()` para tolerar fallos parciales.
- T9.6: el SweetAlert resultante muestra dos secciones: `Convenios` y `Cumplimiento de mantenimiento` (titulo `Sincronizacion completada`).
- T9.7: el boton sigue restringido a `userAccessLevel >= 3` (COORDINATOR+).
- T9.8: tooltip del boton: `"Sincronizar convenios + cumplimiento de mantenimiento"`.
- T9.9: tras la sincronizacion, la tabla del inventario se recarga (`fetchEquipos` / `fetchVehiculos` / `fetchComponentes`).
- T9.10: si la operacion de cumplimiento falla (ej: usuario sin permisos ADMIN), el SweetAlert lo aclara con el hint `"(requiere permisos ADMIN)"`.

**Total Etapa 9**: 10 tests, exclusivamente verificacion estatica del codigo modificado en las 4 paginas (cubre las 40 aserciones reales — 10 por pagina).

### Criterio de aceptacion global

- **Cobertura minima**: ≥ 80% en los archivos de logica pura (`cumplimientoMantenimiento.js`, `CumplimientoBadge.tsx`).
- **Smoke test E2E** manual documentado como checklist en `context/mmtto/qa-checklist-cumplimiento.md` (creacion fuera del alcance de este documento).
- **No regresion**: los tests existentes del modulo de mantenimiento y de inventario siguen pasando sin modificaciones.
- Todo PR que implemente una etapa debe incluir los tests correspondientes; ningun PR se mergea sin tests verdes.

---

## Contrato unificado de sincronizacion (Etapas 1, 5 y 6)

Dado que las Etapas 1, 5 y 6 convergen en una unica funcion centralizada, este apartado consolida su contrato definitivo para evitar duplicacion:

### Funcion: `sincronizarCumplimientoActivo(activoId, activoClase)`

**Ubicacion**: `backend/cloud/main.js` como `Parse.Cloud.define`, con logica interna en `backend/cloud/utils/cumplimientoMantenimiento.js`.

**Responsabilidades**:

1. **Resolver ultimo mantenimiento** (responsabilidad de Etapa 5/6):
   - Buscar `RegistroMantenimiento` con `activoId` + `activoClase` + `activo=true`, ordenado por fecha desc.
   - Descartar registros con `estadoValidacion = 'rechazado'`.
   - Tomar el mas reciente. Si no existe, setear estado `sin_historial`.
   - Persistir: `ultimaFechaMantenimiento`, `ultimoRegistroMantenimientoId`, `ultimoTipoMantenimiento`, `ultimoEstadoMantenimiento`.

2. **Recalcular cumplimiento de periodos** (responsabilidad de Etapa 1):
   - Filtrar SOLO registros con `estadoValidacion = 'aprobado'`.
   - Ejecutar `calcularCumplimiento(activo, historialAprobados, fechaActual)`.
   - Persistir: `periodosEsperados`, `periodosCumplidos`, `periodosFaltantes`, `cumplimientoPorcentaje`, `estadoCumplimientoMantenimiento`, `proximaFechaMantenimientoEsperada`.

3. **Timestamping**:
   - Setear `ultimoCalculoCumplimiento = new Date()`.

4. **Idempotencia**: el calculo depende solo del estado actual de `RegistroMantenimiento` y del activo. Multiples invocaciones sucesivas producen el mismo resultado.

5. **Manejo de errores**: errores dentro de esta funcion NO deben propagarse a los callers criticos (`crearRegistroMantenimiento`, `aprobarMantenimiento`, `rechazarMantenimiento`). Se loggea y se sigue.

**Invocadores**:

| Origen | Etapa | Cuando |
|--------|-------|--------|
| Trigger `afterSave` en `RegistroMantenimiento` | 1 | Siempre que cambie un registro |
| Trigger `afterDelete` en `RegistroMantenimiento` | 1 | Al borrar un registro |
| Trigger `afterSave` en los 4 `InventarioXxx` | 1 | Al cambiar `frecuencia`, `fechaAdquisicion`/`fechaInstalacion`, `fechaBaja` |
| `crearRegistroMantenimiento` (llamada explicita) | 5 | Tras `registro.save()` (puede omitirse si el trigger es confiable) |
| `aprobarMantenimiento` (llamada explicita) | 6 | Tras `registro.save()` con estado `aprobado` |
| `rechazarMantenimiento` (llamada explicita) | 6 | Tras `registro.save()` con estado `rechazado` |
| `sincronizarCumplimientoMasivo` (admin) | 1 | Backfill y reconciliacion periodica |
| `migrarCumplimientoInicial` (one-shot) | 1 | Primera ejecucion tras deploy |

### Principios de diseno consolidados

- **Una sola fuente de verdad**: `RegistroMantenimiento` + `Inventario*` (campos base). Los campos denormalizados son siempre derivables.
- **Un solo punto de entrada**: `sincronizarCumplimientoActivo` es la unica funcion que escribe los campos denormalizados. Evita inconsistencias por escrituras paralelas descoordinadas.
- **Aprobados = cumplimiento de periodo; No-rechazados = visibilidad**: separacion clara entre "que se ve" (ultima fecha, incluye pendientes) y "que cuenta" (periodos cumplidos, solo aprobados).
- **Fallo suave**: una falla de sincronizacion nunca bloquea la operacion principal del tecnico ni del admin.

---

## Glosario

| Termino | Definicion |
|---------|------------|
| Periodo | Ventana de tiempo de `frecuencia` meses dentro de la cual se espera un mantenimiento preventivo |
| Periodo cumplido | Periodo con al menos un `RegistroMantenimiento` aprobado cuya `fecha` cae dentro del rango |
| Periodo faltante | Periodo ya cerrado (fin < hoy) sin mantenimiento aprobado |
| Periodo en curso | Periodo vigente (fin >= hoy) |
| Cumplimiento % | `(periodosCumplidos / periodosEsperados) * 100` — excluye periodos en curso |
| Fecha base | `fechaAdquisicion` para medicos/flota, `fechaInstalacion` para industriales/infraestructura |
| Mantenimiento retroactivo | Registro creado a posteriori con fecha anterior a la actual, para regularizar un periodo faltante |
| Ultima mantencion visible | Registro `RegistroMantenimiento` mas reciente del activo cuyo `estadoValidacion` NO es `rechazado`. Puede estar `pendiente` o `aprobado`. Es lo que muestra el inventario como `ultimaFechaMantenimiento` |
| Reversion de ultima mantencion | Consecuencia automatica del rechazo: el inventario deja de mostrar el registro rechazado y apunta al siguiente no-rechazado mas reciente, o a `sin_historial` si no hay |
