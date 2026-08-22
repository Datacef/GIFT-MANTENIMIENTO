# Carta Gantt de Mantenimiento — Propuesta de implementación

**Fecha**: 2026-04-25
**Autor**: Análisis de diseño (Claude)
**Alcance**: Visualización tipo Gantt + heatmap de carga de mantenimiento sobre los 4 inventarios del sistema, basada en `frecuencia` de cada activo, `fechaBase` (`fechaAdquisicion` / `fechaInstalacion`) y `ultimaFechaMantenimiento`.

---

## 1. Objetivo

Que el encargado de mantenimiento pueda **ver de un vistazo**:

1. **Cuándo** corresponde el próximo mantenimiento de cada activo (línea de tiempo).
2. **Qué períodos están sobrecargados** (mes/semana con muchos vencimientos simultáneos), para redistribuir o anticipar.
3. **El cumplimiento histórico**: períodos pasados realizados (verde), faltantes (rojo), en curso (azul).
4. **Capacidad de planificación**: reagendar manualmente un mantenimiento futuro y ver el efecto en la carga.

Casos de uso típicos:

- *"En octubre tengo 14 ecógrafos + 2 calderas + 3 ambulancias venciendo la misma semana. ¿Cuántos puedo absorber?"*
- *"Adelantar a septiembre la mitad para descongestionar octubre."*
- *"Un activo tiene 5 períodos faltantes — ¿cuándo eran cada uno?"*
- *"¿Qué proporción de mi flota va a vencer en Q1 2026?"*
- *"Equipos en convenio vs sin convenio en el próximo trimestre."*

---

## 2. Datos disponibles (modelo actual)

Ya existen en los 4 inventarios los campos denormalizados que produce el motor de cumplimiento (`backend/cloud/utils/cumplimientoMantenimiento.js`):

| Campo del activo | Tipo | Significado |
|---|---|---|
| `fechaAdquisicion` / `fechaInstalacion` | `YYYY-MM-DD` | Fecha base — origen de los períodos teóricos |
| `frecuencia` | número | Cada cuántos **meses** corresponde mantenimiento |
| `fechaBaja` | `YYYY-MM-DD` opcional | Cierra la línea de tiempo (Etapa 1 del plan de revisión) |
| `ultimaFechaMantenimiento` | `YYYY-MM-DD` | Último mantenimiento aprobado/pendiente |
| `proximaFechaMantenimientoEsperada` | `YYYY-MM-DD` | Próximo período teórico abierto |
| `periodosEsperados` / `periodosCumplidos` / `periodosFaltantes` | número | Métricas globales |
| `cumplimientoPorcentaje` | número | % cumplido |
| `estadoCumplimientoMantenimiento` | string | `al_dia` / `con_retraso` / `critico` / `dado_de_baja` / `sin_historial` / `sin_configuracion` |
| `pautaAsignada` | string | Clasificación de pauta |
| `convenioActivo`, `proveedorRut`, `numeroLicitacion` | varios | Para colorear/filtrar por proveedor |

Y `RegistroMantenimiento` con: `activoId`, `activoClase`, `fecha`, `tipoMantenimiento`, `estadoValidacion`, `proximoMantenimiento`.

> **Importante**: el motor ya calcula los períodos teóricos en `calcularCumplimiento(activo, historial)` línea por línea (`{ desde, hasta, estado: 'cumplido'|'faltante'|'en_curso' }`). El Gantt **lee** esa estructura, no la duplica.

---

## 3. Vistas propuestas

### 3.1. **Gantt Activo × Tiempo** (vista principal)

```
                    │ Ene │ Feb │ Mar │ Abr │ May │ Jun │ Jul │ Ago │ Sep │ Oct │ Nov │ Dic │
─────────────────────────────────────────────────────────────────────────────────────────────
ECOGRAFO (med 6m)   │  ●──────────────────────●──────────────────────●  │     │     │     │
                    │ ✓ ene/15            ⚠ jul/15            ▢ proximo
CALDERA (ind 3m)    │  ●──────●──────●─────●──────●──────●──────●──────●──────●──────●──────●
                    │ ✓     ✓      ✓     ✗     ✓     ✓     ✓     ▢
AMBULANCIA (flo 3m) │  ●──────●─────●──────●──────●──────●──────●──────●──────●──────●──────●
                    │ ✓     ✓     ✗     ✓     ✓     ▢
```

Cada **fila** es un activo (filtrable). Cada **marca** es un período teórico con su `desde/hasta`. Códigos de color:

| Estado | Color | Símbolo |
|---|---|---|
| Cumplido (aprobado) | Verde 500 | ✓ |
| Cumplido (pendiente validación) | Amarillo 500 | ⏳ |
| Faltante (vencido) | Rojo 500 | ✗ |
| En curso (período actual) | Azul 500 | ▢ |
| Próximo (futuro) | Gris 300 | ─ |
| Dado de baja | Gris 200 punteado | ⌀ |

Hover sobre cada marca: tooltip con `desde / hasta`, `fechaRealizado`, `tipoMantenimiento`, `estadoValidacion`, link al `RegistroMantenimiento`.

### 3.2. **Heatmap de carga** (vista ejecutiva)

Matriz `Mes × Tipo activo` que cuenta cuántos mantenimientos vencen cada mes.

```
                Ene   Feb   Mar   Abr   May   Jun   Jul   Ago   Sep   Oct   Nov   Dic
Eq. Médicos     12    8     14    9     11    18    10    7     22    35    18    9
Eq. Industriales 3    2     5     2     3     6     2     2     7     12    5     3
Flota           5     4     8     5     6     9     5     4     11    14    8     5
Infraestructura 2     2     4     2     3     5     2     2     6     8     4     2
─────────────────────────────────────────────────────────────────────────────────────
TOTAL          22    16    31    18    23    38    19    15    46    69    35    19
```

Color del fondo de cada celda según carga (cuartiles automáticos del periodo):

- 🟢 baja (≤ p25)
- 🟡 media (p25 – p75)
- 🟠 alta (p75 – p90)
- 🔴 crítica (> p90)

Click en una celda → drill-down a la lista de activos que vencen en ese mes / dominio.

### 3.3. **Gantt Servicio/Ubicación × Tiempo**

Agrupa por `servicio` (médico) / `ubicacion` (industrial/infra) / `asignadoA` (flota). Cada fila es un grupo y muestra **conteo de mantenimientos por celda mensual**, no marcas individuales.

Útil para responder *"¿cuál servicio tiene más carga este trimestre?"*.

### 3.4. **Calendario semanal/mensual** (vista operativa)

Vista tipo calendario tradicional con tarjetas de mantenimientos en cada día. Permite arrastrar y reordenar fechas (interacción Etapa 3 — opcional).

---

## 4. Cálculos clave

### 4.1. Generar la línea de tiempo de un activo

Reusar exactamente lo que ya hace `calcularCumplimiento`:

```js
// Pseudocode
function periodosGantt(activo, hasta = +12 meses) {
  const fechaBase = activo.fechaAdquisicion || activo.fechaInstalacion;
  const f = activo.frecuencia;
  if (!fechaBase || !f) return []; // sin_configuracion

  const periodos = [];
  let inicio = parseFecha(fechaBase);
  let i = 0;
  const limite = addMeses(hoy, hasta);

  while (inicio <= limite && (!activo.fechaBaja || inicio <= activo.fechaBaja)) {
    const fin = addMeses(inicio, f);
    periodos.push({ indice: i, desde: inicio, hasta: fin });
    inicio = fin;
    i++;
  }
  // luego emparejar con `historialAprobado` para resolver el estado:
  // cumplido | en_curso | faltante (Etapa 6.2 ya incluye huerfanos por identidad)
  return periodos;
}
```

El motor actual ya lo produce hasta `fechaCorte` (= `hoy` o `fechaBaja`). **Para Gantt necesitamos extender la línea hacia el futuro** N períodos (típicamente 12 meses adelante).

### 4.2. Carga por período (heatmap)

```js
// Por mes calendario:
const carga = {};
for (const activo of activos) {
  const periodos = periodosGantt(activo, hasta = +12 meses);
  for (const p of periodos) {
    if (p.estado === 'en_curso' || p.estado === 'faltante' || p.estado === 'futuro') {
      const claveMes = formatYYYYMM(p.hasta);
      carga[claveMes] = (carga[claveMes] || 0) + 1;
    }
  }
}
```

Para responder por dominio/servicio basta sumar agrupando.

### 4.3. Reagendamiento manual (opcional Etapa 3)

Si se mueve la `fechaProgramada` de un período a otro mes, se persiste en una nueva colección `MantenimientoProgramado(activoId, periodoIndice, fechaProgramada, motivo)`. La carta Gantt usa esa fecha en lugar de la teórica para el dibujo.

---

## 5. UI / UX

### 5.1. Página `/admin/mantenimiento/gantt`

Permisos: `OPERATOR (2)` para ver, `COORDINATOR (3)` para reagendar.

**Header**:

- Título "Carta Gantt de Mantenimiento"
- Selector de **rango de fechas** (default: hoy − 6 meses → hoy + 12 meses)
- Botón "Exportar Excel" (matriz por mes)
- Botón "Imprimir / PDF"

**Filtros** (reutilizar UI de inventario):

| Filtro | Comportamiento |
|---|---|
| Dominio | médico / industrial / flota / infraestructura / todos |
| Servicio / Ubicación / Asignado-a | dependiente del dominio |
| Clase / Tipo / Sistema | dependiente del dominio |
| Estado cumplimiento | al_dia / con_retraso / critico / etc. |
| Convenio | con / sin |
| Crítico/Apoyo (médico) | C / A / todos |
| Pauta asignada | combo |
| Búsqueda | nombre / serie / inventario |

**Tabs de vista**:

1. **Gantt** (activo × tiempo)
2. **Heatmap** (mes × dominio)
3. **Resumen ejecutivo** (cards: total a hacer este mes, próximo mes, % al día, top 5 servicios saturados)

### 5.2. Componente Gantt (frontend)

Recomendado usar una librería ligera y compatible con React (sin dragdrop si no es necesario):

| Librería | Pros | Contras |
|---|---|---|
| `react-calendar-timeline` (MIT) | Activa, bien tipada, soporte de grupos, items, custom rendering | Última actualización menor; razonable. |
| `frappe-gantt` (MIT) wrapper React | Liviana, look limpio | Más orientada a tareas con dependencias, no necesario aquí. |
| **Render manual con CSS Grid + SVG** | Cero dependencias, fit perfecto al diseño Horizon UI del proyecto, total control sobre los chips de estado | Más código inicial, paginación/scroll vertical hay que implementarlo. |

**Recomendación**: empezar con render manual (CSS Grid horizontal + chips por mes). El proyecto ya usa Tailwind; encaja directo. Si en el futuro se quiere drag&drop, migrar a `react-calendar-timeline`.

Esquema simplificado:

```tsx
<div className="grid" style={{ gridTemplateColumns: `300px repeat(${nMeses}, minmax(40px, 1fr))` }}>
  {/* Header de meses */}
  <div /> {/* esquina */}
  {meses.map(m => <div key={m}>{m}</div>)}

  {/* Filas de activos */}
  {activos.map(a => (
    <Fragment key={a.id}>
      <div className="sticky left-0">{a.nombre}</div>
      {meses.map(m => (
        <CeldaPeriodo
          key={m}
          activo={a}
          mes={m}
          onClick={() => abrirDetalle(a, m)}
        />
      ))}
    </Fragment>
  ))}
</div>
```

### 5.3. Heatmap

Tabla simple pintada por cuartiles. Click en celda abre modal con la lista de activos y link al detalle.

---

## 6. Backend — cloud functions necesarias

### 6.1. `getGanttMantenimiento` *(VIEWER)*

```ts
input: {
  desde: string;            // 'YYYY-MM-DD'
  hasta: string;            // 'YYYY-MM-DD'
  dominio?: string;         // opcional
  filtrosInventario?: {     // mismo shape que cada inventario
    servicio?, ubicacion?, asignadoA?, sistema?,
    clase?, tipoEquipo?, tipoVehiculo?, criticidad?,
    estado?, estadoCumplimiento?, convenio?, busqueda?
  };
  limit?: number;           // default 200
  skip?: number;
}
output: {
  total: number;
  filas: [{
    activoId: string;
    activoClase: string;
    dominio: string;
    nombre: string;
    identificador: string;     // 'SN-XXX / INV-YYY' (formato unificado, ya disponible)
    servicio: string;
    pautaAsignada: string;
    convenioActivo: boolean;
    estadoCumplimiento: string;
    cumplimientoPorcentaje: number;
    periodos: [{
      indice: number;
      desde: string;            // YYYY-MM-DD
      hasta: string;
      estado: 'cumplido'|'pendiente'|'faltante'|'en_curso'|'futuro'|'dado_de_baja';
      registroId?: string;
      fechaRealizado?: string;
      tipoMantenimientoRealizado?: string;
      proveedor?: string;       // si convenioActivo
    }];
  }];
}
```

Internamente: para cada activo, recolecta historial (incluyendo huérfanos por identidad — Etapa 6.2 ya hecha), llama `calcularCumplimiento` extendiendo el horizonte hasta `hasta`, y serializa los períodos.

### 6.2. `getCargaMantenimientoPorMes` *(VIEWER)*

```ts
input: {
  desde: string;
  hasta: string;
  filtrosInventario?: {...};
}
output: {
  meses: ['2026-01', '2026-02', ...];
  porDominio: {
    equipoMedico:      [12, 8, 14, ...],
    equipoIndustrial:  [3, 2, 5, ...],
    flotaVehicular:    [5, 4, 8, ...],
    infraestructura:   [2, 2, 4, ...],
  };
  totales: [22, 16, 31, ...];
  cuartiles: { p25: 18, p50: 22, p75: 35, p90: 46 };
}
```

Útil para el heatmap. Recorre los 4 inventarios filtrando los con `frecuencia > 0` y calcula los `proximaFechaMantenimientoEsperada` + sucesivos hasta `hasta`.

### 6.3. `exportarGanttExcel` *(VIEWER)*

Devuelve la matriz `Activo × Mes` lista para Excel con columnas auxiliares (servicio, frecuencia, último mantto., próximo, % cumplimiento). Frontend usa `xlsx` como en los demás módulos.

### 6.4. `programarMantenimientoActivo` *(COORDINATOR)* — opcional Etapa 3

```ts
input: { activoId, activoClase, periodoIndice, fechaProgramada, motivo }
```

Persiste en colección `MantenimientoProgramado` y dispara recálculo del Gantt para ese activo. La carta Gantt prefiere la `fechaProgramada` si existe, sino usa la teórica.

---

## 7. Plan de implementación — 4 etapas

### Etapa 1 — Backend: endpoints base *(1 PR)*

- Implementar `getGanttMantenimiento` extendiendo `calcularCumplimiento` con un parámetro `hastaFecha`.
- Implementar `getCargaMantenimientoPorMes` (cuartiles para heatmap).
- Tests unitarios de los cálculos de períodos futuros + integración usando el test_13 como base.
- **Aceptación**: las funciones devuelven datos correctos en JSON contra el servidor real para los 4 dominios.

### Etapa 2 — Frontend: vista Gantt + heatmap *(1 PR)*

- Página `/admin/mantenimiento/gantt` con `AuthGuard` + `OPERATOR(2)`.
- Tab Gantt: tabla CSS-Grid con sticky columna de activos, scroll horizontal por meses, chips de estado coloreados.
- Tab Heatmap: matriz por mes y dominio con cuartiles.
- Tab Resumen: 4 cards (total este mes, próximo, % al día global, top 5 servicios saturados).
- Filtros reutilizando los 4 inventarios.
- Link "Carta Gantt" en sidebar bajo `Mantenimiento`.
- **Aceptación**: el encargado abre la página, filtra por dominio + rango y ve la línea de tiempo correcta.

### Etapa 3 — Reagendar manualmente *(1 PR)* — opcional

- Colección `MantenimientoProgramado(activoId, activoClase, periodoIndice, fechaProgramada, motivo, creadoPor)`.
- Click en una celda futura del Gantt abre modal "Reagendar este período" con date-picker + motivo.
- `getGanttMantenimiento` aplica `MantenimientoProgramado` antes de devolver.
- Historial registra `accion: 'reagendamiento'`.
- **Aceptación**: el encargado puede mover un mantenimiento de octubre a septiembre con un click; la nueva fecha aparece en el Gantt y la carga del heatmap se actualiza.

### Etapa 4 — Exportación + alertas *(1 PR)*

- `exportarGanttExcel` con formato listo para imprimir A3 horizontal.
- Notificación automática (correo Brevo) al encargado cuando un mes excede el cuartil P90 de carga (configurable).
- Cron `getCargaMantenimientoPorMes` semanal que actualiza un widget en `/admin/default`.
- **Aceptación**: el encargado recibe alerta cuando se acumula carga; puede exportar la planificación para reuniones.

---

## 8. Mejoras de presentación — recomendaciones de UX

### 8.1. Para identificar **mayor carga**

- **Heatmap principal arriba** del Gantt, no al revés. La pregunta más frecuente del encargado es *"¿cuándo me satura?"* — esa información debe estar visible al cargar la página, antes que el detalle por activo.
- **Banda visual de saturación** en el Gantt: barra horizontal de fondo que se intensifica en color naranja/rojo cuando el conteo de períodos vencidos en ese mes supera el promedio.
- **Línea vertical roja** en "hoy" para anclaje visual.
- **Zoom**: tres niveles — mensual (default), trimestral (vista anual completa), semanal (próximas 8 semanas).

### 8.2. Para identificar **activos en riesgo**

- Ordenar filas por `periodosFaltantes desc` por defecto → los críticos arriba.
- Badge a la izquierda del nombre con `cumplimientoPorcentaje` (ya existe `CumplimientoBadge`).
- Indicador rojo si `estado='Baja'` o `estadoCumplimiento='dado_de_baja'` — fila atenuada.

### 8.3. Para acciones rápidas

- Click en una marca verde → abre el `RegistroMantenimiento` correspondiente.
- Click en una marca azul (en curso) → atajo "Crear mantenimiento ahora" → redirige a `/admin/mantenimiento/nuevo` con el activo precargado.
- Click en una marca roja (faltante) → atajo "Crear mantenimiento retroactivo" (ya existe esa lógica en el plan original).

### 8.4. Layout responsivo

- Desktop ancho: Gantt completo + heatmap a la derecha.
- Tablet: tabs.
- Móvil: solo heatmap + lista de "próximos 30 días".

### 8.5. Persistencia de filtros

Guardar los filtros aplicados en `localStorage` por usuario para que la vista persista entre sesiones.

---

## 9. Datos legacy y sincronización

La carta Gantt depende de que `proximaFechaMantenimientoEsperada` y los períodos del motor estén actualizados. Dos consideraciones:

1. **Auto-sync al abrir la página**: si el activo tiene `ultimoCalculoCumplimiento` con > 24 horas de antigüedad, disparar `sincronizarCumplimientoActivo` antes de renderizar (paralelo, no bloqueante).
2. **Soporte de huérfanos por identidad**: ya cubierto por Etapa 6.2 — el motor incluye registros con `activoResumen.identificador` coincidente aunque el `activoId` apunte a un objectId previo.

---

## 10. Resumen ejecutivo

| Tema | Decisión |
|---|---|
| Vista principal | Gantt activo × tiempo, scroll horizontal, sticky columna izquierda |
| Vista ejecutiva | Heatmap mes × dominio con cuartiles automáticos |
| Datos | Reusar campos denormalizados existentes + extender `calcularCumplimiento` con horizonte futuro |
| Librería | Render manual CSS Grid + Tailwind (cero dependencias nuevas) |
| Permisos | VIEWER ve, COORDINATOR reagenda |
| Endpoints nuevos | `getGanttMantenimiento`, `getCargaMantenimientoPorMes`, `exportarGanttExcel`, opcional `programarMantenimientoActivo` |
| Cobertura | Los 4 dominios (médico / industrial / flota / infraestructura) en una sola vista, filtrable |
| Etapas | 4 incrementales, pueden enviarse en PRs separados |

> Tras la Etapa 2, el encargado tendrá una herramienta visual para responder *"¿cuál es mi carga del próximo trimestre y dónde está el cuello de botella?"* en menos de 5 segundos. Tras la Etapa 3, podrá redistribuirla con un click.
