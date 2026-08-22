'use client';
import { useState, useMemo } from 'react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import MantenimientoChecklistItem, {
  ChecklistItemLocal,
} from 'components/admin/mantenimiento/MantenimientoChecklistItem';

interface Props {
  checklist: ChecklistItemLocal[];
  onChange: (checklist: ChecklistItemLocal[]) => void;
  errors: Set<string>; // Set of preguntaId with errors
}

const MantenimientoChecklist = ({ checklist, onChange, errors }: Props) => {
  // Group by categoria
  const categorias = useMemo(() => {
    const map = new Map<string, ChecklistItemLocal[]>();
    checklist.forEach((item) => {
      const cat = item.categoria || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries());
  }, [checklist]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategoria = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleItemChange = (
    preguntaId: string,
    changes: Partial<ChecklistItemLocal>
  ) => {
    const updated = checklist.map((item) =>
      item.preguntaId === preguntaId ? { ...item, ...changes } : item
    );
    onChange(updated);
  };

  if (checklist.length === 0) {
    return (
      <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-700 dark:bg-yellow-900/20">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          No hay preguntas configuradas para esta clasificacion. Contacte al coordinador
          para crear las preguntas necesarias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-navy-700 dark:text-white">
          Checklist de Mantenimiento
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {checklist.length} preguntas en {categorias.length} categorias
        </span>
      </div>

      {categorias.map(([cat, items]) => {
        const isCollapsed = collapsed[cat];
        const catErrors = items.filter((it) => errors.has(it.preguntaId)).length;

        return (
          <div key={cat} className="rounded-xl border border-gray-200 dark:border-navy-600">
            <button
              type="button"
              onClick={() => toggleCategoria(cat)}
              className="flex w-full items-center justify-between rounded-t-xl bg-gray-50 px-4 py-3 text-left dark:bg-navy-700"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-navy-700 dark:text-white">
                  {cat}
                </span>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-navy-600 dark:text-gray-300">
                  {items.length}
                </span>
                {catErrors > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {catErrors} con errores
                  </span>
                )}
              </div>
              {isCollapsed ? (
                <MdExpandMore className="h-5 w-5 text-gray-400" />
              ) : (
                <MdExpandLess className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {!isCollapsed && (
              <div className="space-y-3 p-4">
                {items.map((item) => (
                  <MantenimientoChecklistItem
                    key={item.preguntaId}
                    item={item}
                    onChange={(changes) => handleItemChange(item.preguntaId, changes)}
                    error={errors.has(item.preguntaId)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MantenimientoChecklist;
