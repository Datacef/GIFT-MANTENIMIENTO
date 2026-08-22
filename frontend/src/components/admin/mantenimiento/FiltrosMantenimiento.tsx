'use client';
import { useState } from 'react';
import {
  DOMINIO_MANTENIMIENTO_OPTIONS,
  TIPO_MANTENIMIENTO_OPTIONS,
  ESTADO_VALIDACION_OPTIONS,
  IDENTIFICADOR_LABEL_POR_DOMINIO,
} from 'types/mantenimiento.types';
import { MdSearch, MdExpandMore, MdExpandLess, MdClear } from 'react-icons/md';

export interface FiltrosMantenimientoValue {
  dominio: string;
  fechaDesde: string;
  fechaHasta: string;
  identificador: string;
  nombreActivo: string;
  registroId: string;
  tipoMantenimiento: string;
  estadoValidacion: string;
  tecnicoNombre: string;
}

export const FILTROS_MTTO_INICIAL: FiltrosMantenimientoValue = {
  dominio: '',
  fechaDesde: '',
  fechaHasta: '',
  identificador: '',
  nombreActivo: '',
  registroId: '',
  tipoMantenimiento: '',
  estadoValidacion: '',
  tecnicoNombre: '',
};

interface Props {
  value: FiltrosMantenimientoValue;
  onChange: (v: FiltrosMantenimientoValue) => void;
  onBuscar: () => void;
  onLimpiar: () => void;
  loading?: boolean;
}

export default function FiltrosMantenimiento({
  value,
  onChange,
  onBuscar,
  onLimpiar,
  loading,
}: Props) {
  const [showSecundarios, setShowSecundarios] = useState(false);

  const set = (campo: keyof FiltrosMantenimientoValue, v: string) => {
    onChange({ ...value, [campo]: v });
  };

  const identificadorLabel = value.dominio
    ? IDENTIFICADOR_LABEL_POR_DOMINIO[value.dominio] || 'Identificador'
    : 'Identificador (Serie / Inv. / Patente / Codigo)';

  const inputBase =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-navy-600 dark:bg-navy-800 dark:text-white';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-600 dark:bg-navy-800">
      {/* FILA 1 — principales */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
            Tipo de inventario
          </label>
          <select
            className={inputBase}
            value={value.dominio}
            onChange={(e) => set('dominio', e.target.value)}
          >
            <option value="">Todos</option>
            {DOMINIO_MANTENIMIENTO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
            Fecha desde
          </label>
          <input
            type="date"
            className={inputBase}
            value={value.fechaDesde}
            onChange={(e) => set('fechaDesde', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
            Fecha hasta
          </label>
          <input
            type="date"
            className={inputBase}
            value={value.fechaHasta}
            onChange={(e) => set('fechaHasta', e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={onBuscar}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <MdSearch className="h-4 w-4" />
            Buscar
          </button>
          <button
            onClick={onLimpiar}
            disabled={loading}
            title="Limpiar filtros"
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            <MdClear className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* FILA 2 — identificadores contextuales */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
            {identificadorLabel}
          </label>
          <input
            type="text"
            placeholder="Ej: SN-12345 / INV-001 / AB-CD-12"
            className={inputBase}
            value={value.identificador}
            onChange={(e) => set('identificador', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
            Nombre del equipo
          </label>
          <input
            type="text"
            placeholder="Ej: Ecografo, Caldera, Generador..."
            className={inputBase}
            value={value.nombreActivo}
            onChange={(e) => set('nombreActivo', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
            ID de la pauta (busqueda directa)
          </label>
          <input
            type="text"
            placeholder="objectId del registro"
            className={inputBase}
            value={value.registroId}
            onChange={(e) => set('registroId', e.target.value)}
          />
        </div>
      </div>

      {/* Toggle secundarios */}
      <div className="mt-3">
        <button
          onClick={() => setShowSecundarios(!showSecundarios)}
          className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600"
        >
          {showSecundarios ? (
            <>
              <MdExpandLess className="h-4 w-4" /> Ocultar filtros avanzados
            </>
          ) : (
            <>
              <MdExpandMore className="h-4 w-4" /> Mostrar filtros avanzados
            </>
          )}
        </button>
      </div>

      {showSecundarios && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 dark:border-navy-700 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Tipo de mantenimiento
            </label>
            <select
              className={inputBase}
              value={value.tipoMantenimiento}
              onChange={(e) => set('tipoMantenimiento', e.target.value)}
            >
              <option value="">Todos</option>
              {TIPO_MANTENIMIENTO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Estado de validacion
            </label>
            <select
              className={inputBase}
              value={value.estadoValidacion}
              onChange={(e) => set('estadoValidacion', e.target.value)}
            >
              <option value="">Todos</option>
              {ESTADO_VALIDACION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Tecnico
            </label>
            <input
              type="text"
              placeholder="Nombre del tecnico"
              className={inputBase}
              value={value.tecnicoNombre}
              onChange={(e) => set('tecnicoNombre', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
