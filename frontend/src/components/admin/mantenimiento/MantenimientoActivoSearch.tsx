'use client';
import { useState, useCallback } from 'react';
import { MdSearch, MdCheckCircle } from 'react-icons/md';
import { MantenimientoService } from 'services/mantenimiento.service';
import { ActivoBusquedaResult } from 'types/mantenimiento.types';

interface Props {
  dominio: string;
  selectedActivo: ActivoBusquedaResult | null;
  onSelect: (activo: ActivoBusquedaResult) => void;
}

const ESTADO_BADGE: Record<string, string> = {
  B: 'bg-green-100 text-green-800',
  Bueno: 'bg-green-100 text-green-800',
  R: 'bg-yellow-100 text-yellow-800',
  Regular: 'bg-yellow-100 text-yellow-800',
  M: 'bg-red-100 text-red-800',
  Malo: 'bg-red-100 text-red-800',
  Baja: 'bg-gray-100 text-gray-800',
};

const MantenimientoActivoSearch = ({ dominio, selectedActivo, onSelect }: Props) => {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ActivoBusquedaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!busqueda.trim() || !dominio) return;
    setLoading(true);
    setSearched(true);
    try {
      const results = await MantenimientoService.buscarActivo(dominio, busqueda.trim());
      setResultados(results);
    } catch (error) {
      console.error('Error buscando activo:', error);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [busqueda, dominio]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="mt-5">
      <h3 className="mb-3 text-base font-semibold text-navy-700 dark:text-white">
        Buscar activo
      </h3>

      {/* Search input */}
      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-700">
          <MdSearch className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por nombre, serie, inventario, patente..."
            className="ml-2 h-10 w-full bg-transparent text-sm outline-none dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !busqueda.trim()}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <MdSearch className="h-4 w-4" />
          )}
          Buscar
        </button>
      </div>

      {/* Selected asset summary */}
      {selectedActivo && (
        <div className="mt-4 rounded-xl border-2 border-brand-500 bg-brand-50 p-4 dark:border-brand-400 dark:bg-brand-900/20">
          <div className="flex items-start gap-3">
            <MdCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
            <div>
              <p className="text-sm font-bold text-navy-700 dark:text-white">
                {selectedActivo.nombre}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {selectedActivo.identificador}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    ESTADO_BADGE[selectedActivo.estado] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {selectedActivo.estado}
                </span>
                {selectedActivo.ubicacion && (
                  <span className="text-xs text-gray-500">{selectedActivo.ubicacion}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Clasificacion: <strong>{selectedActivo.clasificacion}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results list */}
      {!selectedActivo && searched && (
        <div className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : resultados.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No se encontraron activos con ese criterio de busqueda.
            </p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {resultados.map((activo) => (
                <button
                  key={`${activo.clase}-${activo.id}`}
                  type="button"
                  onClick={() => onSelect(activo)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-navy-600 dark:bg-navy-700 dark:hover:bg-navy-600"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">
                      {activo.nombre}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activo.identificador}
                    </p>
                    {activo.ubicacion && (
                      <p className="text-xs text-gray-400">{activo.ubicacion}</p>
                    )}
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      ESTADO_BADGE[activo.estado] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {activo.estado}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MantenimientoActivoSearch;
