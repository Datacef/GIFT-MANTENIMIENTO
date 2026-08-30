# AGENTS.md — Instrucciones obligatorias para agentes (GIFT-MANTENIMIENTO)

Estas reglas aplican a **cualquier trabajo** en este repositorio. Son de cumplimiento obligatorio: no son sugerencias.

## 1. Fuentes de verdad (no mezclar responsabilidades)

| Dominio | Herramienta obligatoria | Ubicación |
|---|---|---|
| **Código** (análisis, búsqueda, trazas, impacto) | MCP `codebase-memory-mcp` (`search_graph`, `search_code`, `trace_path`, `get_architecture`, `detect_changes`, …) | Este repositorio: `E:\GitHub\GIFT-MANTENIMIENTO` |
| **Documentación** (leer y escribir) | MCP `obsidian` (`vault_read`, `vault_write`, `vault_patch`, `vault_get_document_map`, …) | Vault DATACEF: carpeta `GIFT-MANTENIMIENTO-DATACEF` en `C:\Users\Ferna\OneDrive\Documentos\DATACEF` |

- **PROHIBIDO** crear o mantener carpetas de documentación dentro del repo (`docs/` fue eliminada del repo y de todo el historial git; que no vuelva).
- Si las herramientas MCP de Obsidian fallan, escribir los `.md` directamente en la ruta del vault (Obsidian los toma nativamente).

## 2. Antes de hacer cualquier cambio: CONSULTAR la documentación

No se puede hacer **nada** (código, fix, feature, refactor, despliegue, scripts) sin antes:

1. Leer en el vault los documentos relevantes al módulo afectado (índice en `GIFT-MANTENIMIENTO-DATACEF/README.md`):
   - `00-PLAN/` — contexto normativo (Manual de Acreditación EQ/INS).
   - `01-ARQUITECTURA/` — plataforma, backend, frontend, autenticación (ARQ-01…04).
   - `02-MODULOS/` — dossier del módulo a tocar (MOD-01…10).
   - `03-ACTUALIZACIONES/` — cambios y etapas previas (ACT-01…03).
   - `04-QA-CALIDAD/` — revisiones y pruebas (QA-01).
2. Verificar contra el código con `codebase-memory-mcp` lo que diga la documentación. **Si el código contradice al documento, prevalece el código** y se corrige el documento.

## 3. Después de cualquier cambio: DOCUMENTAR

No se puede dar por terminado un trabajo sin actualizar la documentación en el vault:

1. Actualizar el documento del módulo afectado (`vault_patch` sobre la sección correspondiente; mantener IDs y rutas).
2. Registrar los cambios funcionales en el documento correspondiente de `03-ACTUALIZACIONES/` (crear `ACT-*` nuevo si el cambio es mayor).
3. Si el cambio altera arquitectura, actualizar `01-ARQUITECTURA/`.
4. Actualizar el índice `README.md` de la carpeta si se crea o mueve un documento.

## 4. Estándar de documentación (obligatorio)

- Idioma: español; términos técnicos y código en inglés.
- Archivos: kebab-case con prefijo numérico de orden (`01-`, `02-`, …).
- IDs estables: `PLAN-*`, `ARQ-*`, `MOD-*`, `ACT-*`, `QA-*`.
- Cada documento declara su **Estado** en el encabezado: 📝 borrador / 🔍 en revisión / ✅ aprobado.
- Estructura mínima de cada documento: `🎯 Objetivo` · `📌 Alcance` · `📚 Contenido` · `💡 Ejemplos` · `✅ Checklist de verificación`.
- **PROHIBIDO escribir credenciales reales** en la documentación (Parse, MongoDB, Brevo, contraseñas). Referenciar solo variables de entorno.

## 5. Checklist antes de cerrar cualquier tarea

- [ ] Consulté la documentación del vault antes de empezar.
- [ ] Verifiqué la documentación contra el código con `codebase-memory-mcp`.
- [ ] Actualicé la documentación del módulo afectado en el vault.
- [ ] Actualicé el índice `README.md` del vault si correspondía.
- [ ] No creé documentación dentro del repo ni subí credenciales a ningún lado.
