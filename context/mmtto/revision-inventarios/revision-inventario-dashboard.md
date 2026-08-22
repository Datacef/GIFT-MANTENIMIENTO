# Revisión de los 4 inventarios — Dashboards, estado "Baja" y cumplimiento

**Fecha**: 2026-04-25
**Autor**: Análisis previo a implementación (Claude)
**Alcance**: Los 4 módulos de inventario del sistema y su interacción con el motor de cumplimiento de mantenimiento.

---

## 1. Mapa de los 4 inventarios

| # | Dominio | URL | Clase Parse | Componente página | Servicio | Tipo | Campo fecha base |
|---|---|---|---|---|---|---|---|
| 1 | Equipos médicos (EQ) | `/admin/inventario` | `InventarioEquipoMedico` | `app/admin/inventario/page.tsx` | `inventario-equipo.service.ts` | `equipoMedico` | `fechaAdquisicion` |
| 2 | Equipos industriales | `/admin/inventario-industrial` | `InventarioEquipoIndustrial` | `app/admin/inventario-industrial/page.tsx` | `inventario-industrial.service.ts` | `equipoIndustrial` | `fechaInstalacion` |
| 3 | Infraestructura (INS) | `/admin/infraestructura` | `InventarioInfraestructura` | `app/admin/infraestructura/page.tsx` | `inventario-infraestructura.service.ts` | `infraestructura` | `fechaInstalacion` |
| 4 | Flota vehicular | `/admin/flota-vehicular` | `InventarioFlotaVehicular` | `app/admin/flota-vehicular/page.tsx` | `inventario-flota.service.ts` | `flotaVehicular` | `fechaAdquisicion` |

Cada inventario expone:

- 4 widgets de resumen: **Total**, **Activos/Operativos (Bueno)**, **En Mantención**, **Dados de Baja**.
- Tabla paginada (25 items por página) con columnas: Estado, Convenio, Último Mantto., **Cumplimiento**, Crítico/Criticidad, Frecuencia, Acciones.
- Botón **Sincronizar** (≥ accessLevel 3) que ejecuta `sincronizarConveniosInventario` + `sincronizarCumplimientoMasivo`.

### Estados existentes en los 4 inventarios

| Campo | Valores | Origen |
|---|---|---|
| `estado` | `B` (Bueno) · `M` (Malo) · `R` (Regular) · `Baja` | seleccionable en el formulario |
| `fechaBaja` | `YYYY-MM-DD` o vacío | seleccionable en el formulario (independiente) |
| `activo` | `true` / `false` | bandera técnica de soft-delete |
| `estadoCumplimientoMantenimiento` | `sin_configuracion` · `sin_historial` · `al_dia` · `con_retraso` · `critico` · `dado_de_baja` | calculado por el motor |

---

## 2. Síntomas reportados por el usuario

1. Los widgets **"En Mantención = 0"** y **"Dados de Baja = 0"** aparecen en cero aunque existen equipos con esos estados.
2. **No hay acción** específica para "Dar de Baja" un equipo: el usuario debe editar el formulario, cambiar `estado='Baja'` y manualmente poner `fechaBaja`.
3. Los equipos dados de baja **no aparecen reflejados** en ningún dashboard general/conteo.
4. La columna **Cumplimiento** debería mostrar **"Dado de baja"** cuando el activo está dado de baja — hoy a veces no lo muestra.
5. Al actualizar varios activos, **algunos cambian de estado minutos después** ("eso está raro").
6. En los otros inventarios el estado **no se actualiza** después de editar.
7. El **dashboard de conteo general no es correcto**.

---

## 3. Análisis técnico — por qué fallan

### 3.1. Bug crítico: stats calculados sobre la página actual (los 4 inventarios)

**Archivos afectados** (mismo defecto en los 4):

| Archivo | Líneas |
|---|---|
| `frontend/src/app/admin/inventario/page.tsx` | 156–163 |
| `frontend/src/app/admin/inventario-industrial/page.tsx` | 153–160 |
| `frontend/src/app/admin/infraestructura/page.tsx` | 154–161 |
| `frontend/src/app/admin/flota-vehicular/page.tsx` | 151–158 |

**Patrón problemático**:

```ts
const stats = useMemo(() => {
  return {
    total,                                                     // ← global (correcto)
    activos: equipos.filter((e) => e.estado === 'B').length,   // ← solo página visible
    enMantencion: equipos.filter((e) => e.estado === 'M' || e.estado === 'R').length,
    dadosBaja: equipos.filter((e) => e.estado === 'Baja').length,
  };
}, [equipos, total]);
```

`equipos` contiene únicamente los **25 registros de la página actual** devueltos por `getInventarioEquipos` con `limit/skip`. Si en esa página no aparece ningún equipo en estado `Baja`, el contador muestra 0 aunque existan en la BD. Lo mismo para "En Mantención".

**Consecuencia**: la card "Total" sí es global (porque viene del `total` de `getInventarioX`), pero los otros 3 contadores no tienen relación con el universo real → discrepancia visible.

### 3.2. No hay acción específica "Dar de Baja"

- El componente `InventarioFormModal.tsx` (líneas 376–391 y 450–461) expone `Estado` y `Fecha de Baja` como dos campos sueltos.
- El usuario puede dejar inconsistencias: `estado='Baja'` sin `fechaBaja`, o `fechaBaja` poblada con `estado='B'`.
- No existe un botón "Dar de Baja" en `InventarioDetailModal.tsx` ni en la tabla.
- No hay una transición atómica: `estado='Baja'` + `fechaBaja=hoy` + `activo=false` (opcional) + adjuntar acta de baja + registrar en historial con motivo.

### 3.3. El estado `dado_de_baja` del cumplimiento solo depende de `fechaBaja`

**Archivo**: `backend/cloud/utils/cumplimientoMantenimiento.js:274`

```js
// Caso: activo dado de baja
if (fechaBaja && diffDias(fechaBaja, hoy) <= 0) {
  return { estadoCumplimiento: ESTADOS_CUMPLIMIENTO.DADO_DE_BAJA, ... };
}
```

El motor evalúa **solo** `fechaBaja`. Por tanto:

- Si el usuario marcó `estado='Baja'` y NO escribió `fechaBaja`, el badge **Cumplimiento** mostrará el último estado calculado (p.ej. `con_retraso`) en lugar de `dado_de_baja`.
- La columna "Cumplimiento" pierde el sentido de "este equipo no debe contar para mi cumplimiento porque está dado de baja".

### 3.4. El trigger `afterSave` no se dispara cuando solo cambia `estado`

**Archivo**: `backend/cloud/main.js:8657`

```js
function _registrarTriggerInventario(clase) {
  const campoBase = cumplimientoMtto.CAMPO_FECHA_BASE_POR_CLASE[clase];
  const camposRelevantes = [campoBase, 'frecuencia', 'fechaBaja'].filter(Boolean);
  Parse.Cloud.afterSave(clase, (request) => {
    if (!_debeResincronizarInventario(request, camposRelevantes)) return;
    _dispararSincronizacionAsync(request.object.id, clase);
  });
}
```

Los `camposRelevantes` que disparan recálculo son **solo** `fechaAdquisicion/fechaInstalacion`, `frecuencia`, `fechaBaja`. Cambiar `estado` (B/M/R/Baja) NO dispara el trigger → el `estadoCumplimientoMantenimiento` queda con el valor anterior.

Esto explica directamente:

- "**en los otros inventarios no se actualizó**" → cuando solo se editó `estado`.
- "**algunos cambiaron de estado minutos después**" → si en paralelo había un job (`sincronizarCumplimientoMasivo`, `afterSave` de `RegistroMantenimiento` o un guardado posterior que sí tocó `fechaBaja`/`frecuencia`), entonces `_dispararSincronizacionAsync` (fire-and-forget con `setTimeout`/`then`) recalcula con latencia perceptible.

### 3.5. No existe dashboard global consolidado

- `app/admin/default/page.tsx` (la home `/admin/default`) tiene 6 `Widget` con `subtitle={'—'}` literal. Son placeholders, no hay fetch real.
- La función backend `getEstadisticasCumplimiento` ya devuelve agregados por dominio (`equipoMedico`, `equipoIndustrial`, `infraestructura`, `flotaVehicular`) con conteos por `estadoCumplimientoMantenimiento`, pero **no está consumida** por el dashboard general.
- No existe un endpoint que agregue por `estado` físico (B/M/R/Baja) en los 4 dominios — habría que agregarlo o calcularlo a partir de `getEstadisticasCumplimiento` + un nuevo `getEstadisticasInventarioFisico`.

### 3.6. Inconsistencia conceptual: dos ejes de "estado"

El sistema mezcla dos conceptos sin reconciliarlos:

| Eje | Campo | Uso |
|---|---|---|
| Estado físico/operativo | `estado` (B/M/R/Baja) | declarado por el operador |
| Estado de cumplimiento | `estadoCumplimientoMantenimiento` | calculado del historial |

El badge **"Cumplimiento"** en la tabla mira el segundo, pero el usuario espera que **si `estado='Baja'`** el badge diga "Dado de baja" sin importar el cálculo. La fuente de verdad para "está dado de baja" debería ser cualquiera de las dos señales (regla de OR), no únicamente `fechaBaja`.

---

## 4. Propuesta — diseño objetivo

### 4.1. Una sola fuente de verdad para "Dado de baja"

Definir el **Predicado de baja**:

```
estaDeBaja(activo) ≡ (estado === 'Baja') OR (fechaBaja && fechaBaja ≤ hoy)
```

Aplicarlo en:

1. Motor `cumplimientoMantenimiento.js` — al inicio de `calcularCumplimiento`, antes del cálculo de períodos.
2. Frontend `CumplimientoBadge` — fallback: si `estadoCumplimientoMantenimiento` no es `dado_de_baja` pero el activo trae `estado='Baja'`, mostrar "Dado de baja".
3. Filtros, dashboards y reportes.

### 4.2. Acción atómica "Dar de Baja" / "Reactivar"

- Botón nuevo en `InventarioDetailModal` (todos los 4) y opcionalmente en la tabla:
  - **"Dar de baja"** → modal con: `fechaBaja` (default = hoy), `motivoBaja` (texto), upload opcional de acta, ¿desactivar (`activo=false`)?.
  - **"Reactivar"** → solo si `estado='Baja'` o `fechaBaja` existe → limpia ambos y registra en historial.
- Endpoint backend nuevo: `darDeBajaActivo(clase, id, { fechaBaja, motivo, archivoUrl })` que en un solo `save` actualice `estado='Baja'`, `fechaBaja`, opcionalmente `activo=false`, registre historial y dispare recálculo.
- Esto **garantiza que `estado` y `fechaBaja` queden sincronizados** y elimina inconsistencias.

### 4.3. Trigger backend extendido

Incluir `estado` en `camposRelevantes` (`backend/cloud/main.js:8657`):

```js
const camposRelevantes = [campoBase, 'frecuencia', 'fechaBaja', 'estado'].filter(Boolean);
```

Adicionalmente: cuando el motor detecte el predicado de baja vía `estado='Baja'` aunque `fechaBaja` esté vacía, debe igualmente devolver `dado_de_baja` para que el badge sea consistente al instante.

### 4.4. Stats globales correctos en los 4 inventarios

Dos opciones (recomendamos ambas combinadas):

**Opción A (rápida)**: nuevo cloud function `getInventarioEstadisticasFisicas(clase)` que devuelve `{total, activos, enMantencion, dadosBaja}` con `Parse.Query.count()` por estado. El frontend pide estos contadores **separados de la página visible**, en paralelo a `fetchEquipos`.

**Opción B (estructural)**: ampliar el response de `getInventarioEquipos`/`Industrial`/`Infraestructura`/`Flota` para incluir `stats: { activos, enMantencion, dadosBaja, dadosDeBajaPorEstado, dadosDeBajaPorFecha }` agregados por la query base (sin paginar), de modo que el frontend ya no tenga que calcular nada. Esto evita 2 round-trips y mantiene los stats coherentes con los filtros activos.

### 4.5. Dashboard global consolidado (`/admin/default`)

Reemplazar los placeholders por:

- 4 cards "Total inventario" por dominio (equipos médicos / industriales / infraestructura / flota).
- 1 card "Equipos en mantención" (suma de `M`+`R` en los 4 dominios).
- 1 card "Equipos dados de baja" (suma del predicado de baja en los 4 dominios).
- 1 panel "Estado de cumplimiento" — agregado del que ya devuelve `getEstadisticasCumplimiento`, mostrando `al_dia / con_retraso / critico / dado_de_baja / sin_historial` por dominio.
- 1 panel "Próximos mantenimientos (30 días)" — usa `getProximosMantenimientos`.

### 4.6. UX: badge **Cumplimiento** en la tabla

Cuando el activo cumpla el predicado de baja, mostrar SIEMPRE el chip **"Dado de baja"** (gris) en la columna `Cumplimiento`, aunque el cálculo backend aún no se haya propagado. Para esto basta con tomar también `estado` y `fechaBaja` de la fila al renderizar el badge.

---

## 5. Plan de implementación — 4 etapas

> Cada etapa es **incremental** y se aplica a los **4 inventarios** (médico, industrial, infraestructura, flota). El orden minimiza riesgo: backend primero (origen de verdad), luego dashboards locales, luego acción de baja, finalmente dashboard global.

### Etapa 1 — Backend: predicado de baja unificado y trigger por `estado` *(1 PR)*

**Objetivo**: que el motor de cumplimiento y los triggers reaccionen al campo `estado='Baja'`, no solo a `fechaBaja`.

**Cambios**:

1. `backend/cloud/utils/cumplimientoMantenimiento.js`
   - Agregar helper `obtenerEstadoFisico(activo)` y un predicado `esActivoDeBaja(activo, hoy)` que devuelva true si `estado === 'Baja'` o `fechaBaja ≤ hoy`.
   - En `sincronizarActivoParse` pasar `estado` dentro de `activoPlano` además de `fechaBase/frecuencia/fechaBaja`.
   - En `calcularCumplimiento` reemplazar el chequeo único de `fechaBaja` por el predicado `esActivoDeBaja`.
2. `backend/cloud/main.js:8657` — incluir `'estado'` en `camposRelevantes` para los 4 triggers.
3. Test manual: cambiar `estado='Baja'` desde el form, sin tocar `fechaBaja` → la fila debe quedar con `estadoCumplimientoMantenimiento='dado_de_baja'` en segundos.

**Aceptación**:

- Editar un equipo a `estado='Baja'` → `estadoCumplimientoMantenimiento` queda `dado_de_baja` automáticamente (vía trigger) y el badge en la tabla refleja "Dado de baja".
- `getEstadisticasCumplimiento` cuenta correctamente esos equipos en `dado_de_baja`.

---

### Etapa 2 — Frontend: stats correctos por inventario y badge robusto *(1 PR)*

**Objetivo**: corregir el bug de los widgets locales y hacer el badge "Dado de baja" inmediato sin esperar al recálculo backend.

**Cambios**:

1. Nuevo cloud function `getInventarioEstadisticasFisicas` en `backend/cloud/main.js` que recibe `{ clase }` y devuelve `{ total, activos: count(estado='B'), enMantencion: count(estado in ['M','R']), dadosBaja: count(estado='Baja' OR fechaBaja<=hoy) }`. Usa `Parse.Query.count` con filtros — no devuelve registros.
2. En cada `page.tsx` de los 4 inventarios:
   - Reemplazar el `useMemo(stats)` actual por un `useState(stats)` que se llene con `Promise.all([fetchEquipos(), fetchStats()])`.
   - El servicio `inventario-X.service.ts` expone `getEstadisticasFisicas()` que llama al cloud function.
   - Stats se refrescan también después de un cambio (crear/editar/baja/import).
3. `components/admin/mantenimiento/CumplimientoBadge.tsx` — añadir prop opcional `estadoFisico` y `fechaBaja`. Si `estadoFisico === 'Baja'` o `fechaBaja ≤ hoy`, renderizar el chip "Dado de baja" sin esperar a `estadoCumplimientoMantenimiento`.
4. Pasar las nuevas props desde la tabla en los 4 `page.tsx`.

**Aceptación**:

- Las 4 cards superiores reflejan los conteos globales (no de la página).
- Cambiar a la página 2/3/N del paginador no altera los conteos.
- Si edito un equipo a `estado='Baja'`, el badge "Cumplimiento" inmediatamente dice "Dado de baja" (sin recargar), y al refrescar la card "Dados de Baja" sube en 1.

---

### Etapa 3 — Acción atómica "Dar de Baja" / "Reactivar" *(1 PR)*

**Objetivo**: ofrecer la acción correcta en UI y eliminar inconsistencias entre `estado` y `fechaBaja`.

**Cambios**:

1. Backend: 4 cloud functions `darDeBaja{Equipo|Industrial|Infraestructura|Flota}` y `reactivar{...}`.
   - `darDeBaja` recibe `{ id, fechaBaja?, motivo, archivoUrl? }`. Setea `estado='Baja'`, `fechaBaja=fechaBaja||hoy`, registra historial con acción `baja`, archivo opcional con `categoria='baja'`. Una sola operación atómica → un solo `save` → un solo trigger.
   - `reactivar` recibe `{ id, motivo }`. Setea `estado='B'` (o el último estado conocido si lo guardamos en `estadoPrevio`), limpia `fechaBaja`, registra historial.
   - Permisos: `darDeBaja` ≥ COORDINATOR (3); `reactivar` ≥ ADMIN (4).
2. Frontend: en `InventarioDetailModal` agregar:
   - Botón "Dar de baja" (rojo) si el activo NO está de baja. Abre `BajaActivoModal` con form de `fechaBaja` (default hoy), `motivo` (textarea), upload opcional de acta.
   - Botón "Reactivar" (verde) si el activo SÍ está de baja.
   - Mismo patrón en los 4 detail modals (`InventarioDetailModal.tsx`, `InventarioIndustrialDetailModal.tsx`, `InfraestructuraDetailModal.tsx`, `FlotaVehicularDetailModal.tsx`) — extraer un componente compartido `BajaActivoModal` parametrizado por `dominio`.
3. En `InventarioFormModal` (los 4) — quitar el campo "Fecha de Baja" del formulario regular y dejar `estado='Baja'` también deshabilitado para creación; el camino canónico es la acción "Dar de baja". Editar la `fechaBaja` directamente queda solo para SUPER_ADMIN como excepción.
4. Validación: si `data.estado === 'Baja'` y no viene `data.fechaBaja`, el cloud function `update*` setea `fechaBaja=hoy` automáticamente para mantener la coherencia con el predicado.

**Aceptación**:

- Botón "Dar de baja" abre modal, escribe motivo y opcionalmente acta, se ejecuta en una sola operación.
- Tras dar de baja: `estado='Baja'`, `fechaBaja` poblada, badge "Dado de baja" instantáneo, card "Dados de Baja" +1, historial con entrada `baja` + archivo.
- Botón "Reactivar" disponible solo en activos de baja, con confirmación y motivo.

---

### Etapa 4 — Dashboard global `/admin/default` consolidado *(1 PR)*

**Objetivo**: convertir la home en un panel real que sume los 4 inventarios.

**Cambios**:

1. Backend: nuevo cloud function `getDashboardInventarios` que retorne en un solo round-trip:

   ```json
   {
     "porDominio": {
       "equipoMedico":      { "total": N, "activos": A, "enMantencion": M, "dadosBaja": B },
       "equipoIndustrial":  { ... },
       "infraestructura":   { ... },
       "flotaVehicular":    { ... }
     },
     "totales": { "total": ..., "activos": ..., "enMantencion": ..., "dadosBaja": ... },
     "cumplimiento": { /* salida actual de getEstadisticasCumplimiento */ },
     "proximos30Dias": [ /* salida actual de getProximosMantenimientos */ ]
   }
   ```

2. Frontend: rehacer `app/admin/default/page.tsx` con:
   - Fila 1 (4 widgets clicables → al inventario respectivo): total por dominio.
   - Fila 2 (3 widgets globales): Activos, En Mantención, Dados de Baja (suma de los 4).
   - Panel "Estado de cumplimiento" — gráfico/lista por dominio reutilizando `CumplimientoBadge`.
   - Panel "Próximos mantenimientos (30 días)" — top 10 con link al activo.
3. Botón global "Sincronizar todo" (≥ ADMIN) que ejecuta `sincronizarCumplimientoMasivo` sin filtro de dominio (recorre los 4).

**Aceptación**:

- Abrir `/admin/default` muestra valores reales y coherentes con cada `/admin/X`.
- Los conteos de la home cuadran (±0) con la suma de los 4 inventarios.
- Click en una card lleva al inventario filtrado.

---

## 6. Riesgos y consideraciones

| Riesgo | Mitigación |
|---|---|
| Re-ejecución masiva del trigger al agregar `estado` a `camposRelevantes` durante un import grande | Mantener el guard `_debeResincronizarInventario` (ignora si todos los dirty keys son denormalizados); eventualmente coalescer por activoId con un debounce. |
| Inconsistencias históricas: equipos viejos con `estado='Baja'` pero sin `fechaBaja` | Migración one-shot: para cada activo con `estado='Baja'` y `fechaBaja` vacía, setear `fechaBaja=updatedAt` o pedir al usuario completar. Logear en `CumplimientoLog`. |
| Acción "Reactivar" pierde el último estado real (B/M/R) | Persistir `estadoPrevio` al ejecutar `darDeBaja`, restaurarlo en `reactivar`; default a `B` si falta. |
| Permisos: hoy `delete` requiere SUPER_ADMIN(5), `darDeBaja` debería ser ≥ COORDINATOR(3) | Documentar y exponer ambas en la UI según `accessLevel`. |
| Stats por count() vs filtros activos en la tabla | Decisión de producto: las cards muestran TOTAL global por dominio (independiente de filtros) o reflejan filtros activos. Recomendado: **globales**; los filtros aplican solo a la tabla. |

---

## 7. Resumen ejecutivo (qué se entrega cuándo)

| Etapa | Backend | Frontend | Resultado visible |
|---|---|---|---|
| 1 | Predicado baja unificado + trigger reactivo a `estado` | — | Cambiar a `Baja` recalcula cumplimiento al instante |
| 2 | `getInventarioEstadisticasFisicas` | Stats globales en 4 inventarios + badge "Dado de baja" inmediato | Cards correctas, badge consistente |
| 3 | `darDeBaja*` + `reactivar*` (×4) | Botón "Dar de baja"/"Reactivar" en los 4 detail modals con motivo + acta | Flujo limpio, sin inconsistencias |
| 4 | `getDashboardInventarios` | Home `/admin/default` real | Conteo global y panel cumplimiento real |

> Tras la Etapa 4, los 4 síntomas reportados quedan cerrados:
> ① conteos correctos · ② acción de baja existe · ③ baja visible en dashboard · ④ columna "Cumplimiento" muestra "Dado de baja" siempre que corresponda · ⑤ no hay desfase de "minutos después" porque el trigger se dispara al cambio relevante.

---

## 8. Problema adicional — Pautas y registros huérfanos al borrar y recrear un equipo

**Reportado por el usuario** *(2026-04-25)*: al eliminar un equipo del inventario, las **pautas de mantenimiento siguen disponibles** (correcto). Sin embargo, al **volver a crear el equipo** (mismo nombre, serie o inventario), **el sistema no reconoce la existencia de las pautas anteriores ni del historial vinculado**, aunque los datos sí están presentes en la BD.

### 8.1. Modelo de datos — qué se vincula a qué

| Entidad | Campo de vínculo | A qué apunta |
|---|---|---|
| `PreguntaMantenimiento` (pautas) | `dominio` + `clasificacionEquipo` + `tipoMantenimiento` | **No tiene FK al equipo**. Es una plantilla reutilizable. |
| `InventarioEquipoMedico/...` | `pautaAsignada` (string) | Nombre de la `clasificacionEquipo` elegida — es una **referencia débil por nombre**. |
| `RegistroMantenimiento` | `activoId` + `activoClase` | **`objectId` del equipo** — vínculo duro. |
| `InventarioHistorial` (×4 dominios) | `equipoId` / `vehiculoId` / `componenteId` | **`objectId` del equipo** — vínculo duro. |
| `archivos[]` (array dentro del equipo) | dentro del documento | Se borra junto con el equipo. |
| `CumplimientoLog` | `activoId` + `activoClase` | **`objectId` del equipo** — vínculo duro. |

### 8.2. Por qué falla

Las cloud functions `deleteInventarioEquipo`, `deleteInventarioIndustrial`, `deleteInventarioInfra` y `deleteInventarioFlota` ejecutan **hard delete** (`equipo.destroy()`):

```js
// backend/cloud/main.js:1595 (y análogos en los otros 3)
await equipo.destroy({ useMasterKey: true });
```

Consecuencias:

1. El documento del equipo desaparece — **archivos adjuntos se pierden**.
2. **Los registros de mantenimiento NO se eliminan** (RegistroMantenimiento queda con `activoId` apuntando a un objectId inexistente).
3. **El historial NO se elimina** (InventarioHistorial queda huérfano).
4. **Los logs de cumplimiento NO se eliminan** (CumplimientoLog queda huérfano).
5. Al recrear el equipo, Parse asigna un **nuevo `objectId`** → todo lo anterior queda **desvinculado para siempre**, aunque sigue ocupando espacio.

> Las **pautas en sí mismas no se pierden** (están vinculadas por nombre de clasificación, no por objectId), pero:
> - El campo `pautaAsignada` del equipo recreado queda vacío — el usuario tiene que volver a elegir.
> - Los **registros de mantenimiento históricos del equipo eliminado se vuelven invisibles**, aunque siguen en la BD.
> - El badge "Cumplimiento" del equipo recreado parte como `sin_historial`, ignorando el trabajo previo.

### 8.3. Síntomas concretos

- Tras recrear el equipo: la columna **Cumplimiento** muestra `sin_historial` aunque haya 5 mantenimientos hechos antes con los mismos datos.
- El campo **Pauta de mantenimiento asignada** aparece vacío en el detalle.
- En la pestaña **Historial** del equipo no se ven los cambios anteriores.
- En la pestaña **Mantenimientos** no se ven los registros previos.
- En la BD existen `RegistroMantenimiento` con `activoId` que ya no resuelve a ningún equipo (datos zombi).

### 8.4. Causa raíz

El sistema **mezcla dos identidades del activo** sin separarlas:

| Identidad | Persistencia | Estable ante eliminación |
|---|---|---|
| **Identidad técnica** (`objectId`) | Asignada por Parse | NO — cambia al recrear |
| **Identidad de negocio** (`serie`, `inventario`, `patente`, `codigoInterno`) | Asignada por el usuario | SÍ — el usuario puede volver a tipearla idéntica |

Todos los vínculos cruzados usan la identidad **técnica** (`objectId`), no la **de negocio**. Por eso cualquier eliminación + recreación rompe la trazabilidad.

### 8.5. Propuesta — diseño objetivo

Dos cambios complementarios:

**(A) Soft delete por defecto** (preferido): la operación "Eliminar" ya no destruye el documento; lo marca como `eliminado=true` + `eliminadoEn`/`eliminadoPor`. El documento desaparece de los listados pero **conserva todos sus vínculos**. Un SUPER_ADMIN puede restaurarlo desde una "papelera" con un click.

**(B) Re-hidratación al recrear** (complementario): cuando se intenta crear un equipo cuya `serie` o `inventario` (o `patente`/`codigoInterno`) coincide con uno **eliminado o de baja**, el formulario detecta el match y ofrece:

- **"Restaurar el equipo anterior"** — recupera el `objectId` original con sus vínculos intactos (registros, historial, archivos, pautaAsignada).
- **"Crear como nuevo"** — crea un objectId nuevo y, si el usuario lo desea, **migra los `RegistroMantenimiento`/historial huérfanos** al nuevo objectId (UPDATE en lote: `activoId = nuevoId WHERE serie = X AND ...`).

Adicionalmente, **al asignar una pauta** (o detectar que el equipo no la tiene), inferirla automáticamente del campo `clase`/`subclase`/`tipoEquipo` cuando coincida con una `clasificacionEquipo` existente — para que la pauta no se "pierda" aunque el campo `pautaAsignada` esté vacío.

### 8.6. Plan de implementación — Etapa 5 *(post-Etapa 4)*

> Continuamos la numeración del plan principal. Esta etapa requiere migración de datos y permisos cuidadosos, por eso queda separada.

#### Cambios

1. **Backend — soft delete**:
   - Añadir campo `eliminado: boolean` (default `false`), `eliminadoEn: string`, `eliminadoPor: string` a las 4 clases.
   - En las 4 funciones `delete*` reemplazar `destroy()` por `set('eliminado', true)` + `set('eliminadoEn', isoNow())` + `save()`. Mantener accessLevel ≥ ADMIN(4) (antes era SUPER_ADMIN).
   - En todas las queries `getInventario*` agregar `query.notEqualTo('eliminado', true)` para ocultarlos del listado normal.
   - El cloud function `getInventarioEstadisticasFisicas` y `getDashboardInventarios` también deben excluir eliminados.
   - Nueva función `getInventarioEliminados(clase, busqueda?)` (≥ ADMIN) que lista los eliminados. Y `restaurarInventario(clase, id)` (≥ SUPER_ADMIN) que setea `eliminado=false` y registra historial `restauracion`.

2. **Backend — detección de duplicado al crear**:
   - Antes de `equipo.save()` en los 4 `create*`, buscar:
     - Equipo **activo** con misma `serie`/`inventario`/`patente`/`codigoInterno` → error como hoy.
     - Equipo **eliminado** o de **baja** con misma `serie`/etc → si existe, devolver `{ duplicateEliminado: { id, ... } }` en lugar de crear, dejando la decisión al UI.
   - Nueva función `restaurarYActualizarInventario(clase, id, data)` que combina restauración + edición + adopción de huérfanos en una sola operación.
   - Nueva función `adoptarRegistrosHuerfanos(clase, idActivo, criterio)` que actualiza `RegistroMantenimiento` huérfanos cuyo `activoResumen.identificador` coincida — útil cuando ya hay registros sueltos y se quiere asociarlos al equipo recreado.

3. **Frontend — modal de duplicado**:
   - En el `InventarioFormModal` de los 4 dominios, al recibir `duplicateEliminado` del backend mostrar un sub-modal con tres opciones:
     - **Restaurar** (recomendado) — usa `restaurarYActualizarInventario`.
     - **Adoptar registros y crear nuevo** — crea el equipo y luego ejecuta `adoptarRegistrosHuerfanos`.
     - **Crear nuevo (descartar histórico)** — comportamiento actual.

4. **Frontend — papelera de inventario**:
   - Nueva página `/admin/inventario/papelera` (y rutas análogas para los otros 3 dominios) que lista los `eliminado=true`. Botón "Restaurar" por fila (≥ SUPER_ADMIN).
   - Link "Ver eliminados" en cada inventario para usuarios ≥ ADMIN.

5. **Frontend — inferencia de pauta al editar**:
   - En `InventarioFormModal` (los 4): si `form.pautaAsignada === ''` y `form.clase`/`form.tipoEquipo`/`form.sistema` coincide exactamente con una `clasificacionEquipo` disponible, **prellenar** automáticamente `pautaAsignada` con esa clasificación.

#### Aceptación

- Eliminar un equipo lo oculta del listado pero **mantiene archivos, historial, registros y pautaAsignada**.
- Crear un equipo con misma serie/inventario que uno eliminado dispara el modal de duplicado.
- Restaurar un equipo desde la papelera lo trae con todos sus vínculos.
- Si se elige "Adoptar y crear nuevo", los `RegistroMantenimiento` y `InventarioHistorial` huérfanos del equipo anterior quedan re-vinculados al nuevo objectId y aparecen en las pestañas correspondientes.
- Las cards globales y `/admin/default` siguen reflejando los conteos correctos (eliminados se excluyen de todo conteo de inventario activo).

### 8.7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Datos legacy: equipos ya borrados con hard delete dejaron `RegistroMantenimiento` huérfanos | Script one-shot `migrarHuerfanos.js` que recorre RegistroMantenimiento y los marca con `huerfano=true` para que aparezcan en una vista especial. |
| Coincidencia falsa de duplicado (dos equipos legítimamente con misma serie en distintos servicios) | Comparar `serie + servicio` (médico) o `inventario + ubicacion` (industrial/infra) — combinaciones más específicas según el dominio. |
| Crecimiento de la BD por no borrar nunca | Job mensual `purgarEliminadosAntiguos.js` que hace hard-delete de los `eliminado=true` con más de 12 meses de antigüedad (configurable, ≥ SUPER_ADMIN). |
| Permisos confusos | Documentar claramente: COORDINATOR(3) hace soft-delete · ADMIN(4) ve papelera · SUPER_ADMIN(5) restaura y purga definitivamente. |

### 8.8. Resumen ejecutivo (Etapa 5)

| Sub-tarea | Backend | Frontend | Resultado visible |
|---|---|---|---|
| 5.1 Soft delete | `eliminado` flag + queries excluyen + soft `delete*` | — | Eliminar oculta sin destruir |
| 5.2 Papelera | `getInventarioEliminados` + `restaurarInventario` | Página papelera por dominio | Restaurar con un click |
| 5.3 Detección duplicado | `create*` detecta + `restaurarYActualizar` | Modal de duplicado al crear | El usuario decide qué hacer |
| 5.4 Adoptar huérfanos | `adoptarRegistrosHuerfanos` | Opción dentro del modal | Histórico se reasigna al nuevo objectId |
| 5.5 Inferencia de pauta | — | Auto-fill en `pautaAsignada` | Pauta no se "pierde" al recrear |

> Cierre conceptual: hoy se confunde *identidad técnica* (`objectId`) con *identidad de negocio* (`serie`/`inventario`/`patente`). Esta etapa hace explícita esa distinción y evita que datos válidos queden invisibles por una eliminación que en muchos casos era reversible.

---

## 9. Etapa 6 — Reconciliación de huérfanos por identidad *(retro-fix)*

**Reportado por el usuario** *(2026-04-25)* tras desplegar Etapa 5: el equipo INV-001 / SN-12345 (ECOGRAFO) tiene 2 registros de mantenimiento aprobados visibles en la tabla de mantenimientos, pero su columna **Cumplimiento** muestra "Sin historial / 0%". Lo mismo pasa con la **sincronización de convenios**, que no reconoce las licitaciones existentes.

### 9.1. Diagnóstico

El equipo fue eliminado con **hard delete** *antes* de Etapa 5, y luego recreado. El nuevo equipo recibe un `objectId` distinto, pero los registros antiguos siguen apuntando al `objectId` original:

- `RegistroMantenimiento.activoId` apunta al objectId viejo → la query `equalTo('activoId', equipo.id)` no los devuelve → cumplimiento queda en `sin_historial`.
- `LicitacionEquipo.equipoId` apunta al objectId viejo → `sincronizarConveniosParaTipo` agrupa por `equipoId` y nunca llega al equipo nuevo → `convenioActivo=false`.
- `CumplimientoLog.activoId` igual → el historial de transiciones tampoco se hereda.
- `InventarioHistorial.equipoId` (variantes por dominio) igual.

La Etapa 5 cubre el flujo *futuro* (al recrear, ofrece restaurar/adoptar), pero no resuelve los **huérfanos legacy** ya creados antes del fix.

### 9.2. Solución — diagnóstico + reconciliación retroactiva

**Backend** (`backend/cloud/main.js`):

| Cloud function | Permiso | Qué hace |
|---|---|---|
| `diagnosticarHistorialActivo` | OPERATOR(2) | Cuenta `RegistroMantenimiento` que apuntan directo al activo vs. los que pertenecen por `activoResumen.identificador` pero apuntan a otros objectId. También cuenta `LicitacionEquipo` huérfanas. Reporta los `idsPrevios` detectados. |
| `reconciliarHuerfanosPorIdentidad` | ADMIN(4) | Busca por `activoClase + activoResumen.identificador in identificadores` y reasigna `activoId` al objectId actual. Hace lo mismo con `CumplimientoLog`, `InventarioHistorial` (las 4 variantes) y `LicitacionEquipo` (por `serie` o `inventario`). Recalcula cumplimiento y sincroniza convenios. Registra historial de la operación. |

La reconciliación se basa en la **identidad de negocio**: si el `activoResumen.identificador` (= serie/inventario/patente/codigoInterno) coincide con uno de los identificadores actuales del activo, se reasigna.

**Frontend**:

- `services/inventario-shared.service.ts`: nuevos métodos `diagnosticarHistorial(clase, id)` y `reconciliarHuerfanos(clase, id)`.
- `components/admin/inventario-shared/ReconciliarHistorialButton.tsx`: widget que detecta huérfanos automáticamente al abrir el detalle. Si encuentra ≥1 registro o ≥1 licitación huérfana, muestra una **alerta amarilla** con el conteo y un botón **"Reconciliar histórico"** (solo ADMIN+). Si no hay huérfanos, no se renderiza nada.
- Integrado en los **4 detail modals** después de la card de Convenio.

### 9.3. Aceptación

- Abrir el detalle del ECOGRAFO INV-001/SN-12345 muestra el cartel amarillo: *"2 registros de mantenimiento huérfanos · N asociaciones a licitaciones huérfanas"*.
- Click en "Reconciliar histórico" → operación atómica que:
  - Reasigna los 2 registros al objectId actual.
  - Reasigna las `LicitacionEquipo` y dispara `sincronizarConveniosParaTipo`.
  - Recalcula cumplimiento → la columna pasa a `al_dia` o el estado real correspondiente.
- Tras la reconciliación, el cartel desaparece (no quedan huérfanos).

### 9.4. Riesgos

| Riesgo | Mitigación |
|---|---|
| Identificadores cortos o duplicados (p.ej. dos equipos legítimos con misma serie) podrían atraer registros del otro | El match exige `activoClase` + `identificador` exactos; si se requiere afinar, se podría agregar `servicio` o `ubicacion` al criterio. |
| Reconciliación masiva accidental | Operación restringida a ADMIN(4) con confirmación SweetAlert que muestra contadores antes de ejecutar. |
| Si el activo no tiene identificadores poblados, no se puede reconciliar | El cloud function devuelve `{ ok: false, error }` y el botón no aparece (no hay huérfanos detectables sin identificadores). |

---

## 10. Etapa 6.2 — Identificadores concatenados *(post-fix Etapa 6)*

**Reportado por el usuario** *(2026-04-25)* tras Etapa 6: el ECOGRAFO INV-001/SN-12345 sigue mostrando "Sin historial" aunque hay 3 mantenimientos aprobados visibles en el módulo Mantenimiento.

### 10.1. Diagnóstico

El campo `activoResumen.identificador` no se guarda como `'SN-12345'` ni `'INV-001'` solos, sino **concatenado** por el helper `searchActivos` (`backend/cloud/main.js:5088`):

```js
identificador: [item.get('serie'), item.get('inventario')].filter(Boolean).join(' / ')
// → "SN-12345 / INV-001"
```

Mi query inicial en Etapa 6 buscaba `containedIn('activoResumen.identificador', ['SN-12345', 'INV-001'])` con valores **exactos** → 0 matches → "Sin historial".

| Clase | Formato `activoResumen.identificador` |
|---|---|
| `InventarioEquipoMedico` | `serie / inventario` |
| `InventarioEquipoIndustrial` | `serie / inventario` |
| `InventarioFlotaVehicular` | `patente / numeroInterno` |
| `InventarioInfraestructura` | `codigoInterno / componente` |

### 10.2. Solución

Helper `_construirIdentificadoresPosibles(clase, activoObj)` que devuelve TODAS las variantes (campos puros + concatenadas en ambos órdenes). Aplicado en:

- `_resolverIdsActivoPorIdentidad` — usado por `getMantenimientosActivo` y los 4 historiales.
- `diagnosticarHistorialActivo` — el cartel amarillo del detail modal.
- `reconciliarHuerfanosPorIdentidad` — el botón "Reconciliar histórico".
- `sincronizarActivoParse` (en `cumplimientoMantenimiento.js`) — el motor de cumplimiento.

### 10.3. Aceptación

Test de integración (`scripts/test/test_13ReconciliarHuerfanosIntegration.js`) ahora reproduce con identificador concatenado real y pasa **14/14**.

---

## 11. Etapa 6.3 — Convenios huérfanos *(post-fix)*

**Reportado por el usuario** *(2026-04-25)*: la sincronización de convenios sigue sin reconocer las licitaciones del ECOGRAFO recreado, aunque la columna Cumplimiento ya funciona.

### 11.1. Diagnóstico

`sincronizarConveniosParaTipo(inventarioTipo)` en `backend/cloud/main.js`:

1. Carga todas las `LicitacionEquipo` filtradas por `inventarioTipo`.
2. Las **agrupa por `equipoId`**.
3. Para cada `equipoId` hace `eqQuery.get(equipoId)` para actualizar `convenioActivo`, `proveedorRut`, `numeroLicitacion`, `fechaTerminoConvenio`.
4. **Si `equipoId` apunta al objectId del equipo eliminado** (legacy hard-delete), `.get()` falla → `try/catch` lo ignora → el equipo nuevo **nunca se actualiza**.
5. Peor: la limpieza del final recorre equipos con `convenioActivo=true` cuyo `id` no está en `equipoMap`. Como las LE legacy apuntan al id viejo, el equipo nuevo nunca aparece en `equipoMap` y la rutina podría borrarle el `convenioActivo` que ya tenía.

Mismo patrón que mantenimiento: vínculo por `objectId` que no sobrevive a delete+recreate.

### 11.2. Solución — auto-resolución por identidad ANTES de sincronizar

Modificar `sincronizarConveniosParaTipo` con un pre-paso de saneamiento:

1. Para cada `LicitacionEquipo`, intentar `query.get(equipoId)`. Si responde, OK.
2. Si falla, buscar en el inventario por `serie`/`inventario` (`patente`/`numeroInterno` para flota; `serie`/`codigoInterno` para infra) un activo vivo (gracias al `beforeFind` de Etapa 5, esto ya excluye eliminados).
3. Si lo encuentra, `LE.equipoId = nuevoId` y `save()`.
4. Después continuar con la lógica normal de agrupar por `equipoId` y actualizar el equipo.

Ventajas:

- **Auto-cura** los datos legacy en la primera sincronización; no requiere acción manual.
- Reporta `stats.licitacionEquiposReasignados` para auditoría.
- No rompe casos donde el `equipoId` es válido (sólo redirige cuando `.get()` falla).

### 11.3. Aceptación

Test integrado `test_14ConveniosIntegration.js` end-to-end:

- Crea proveedor + licitación + activo.
- Asocia activo a licitación (`LicitacionEquipo`).
- Hard-delete del activo (simula legacy) + recrear con misma serie.
- Antes del fix: `sincronizarConveniosInventario` no actualiza el equipo nuevo.
- Después del fix: el equipo nuevo aparece con `convenioActivo=true`, RUT/proveedor/numeroLicitacion correctos, y la `LicitacionEquipo` ahora apunta al nuevo `equipoId`.
