'use client';
import { useRef } from 'react';
import { MdAddAPhoto, MdClose } from 'react-icons/md';
import { FOTOS_CATEGORIAS_POR_DOMINIO } from 'types/mantenimiento.types';

export interface FotoLocal {
  file: File;
  url: string;
  nombre: string;
}

interface Props {
  dominio: string;
  fotos: Record<string, FotoLocal[]>;
  onChange: (fotos: Record<string, FotoLocal[]>) => void;
}

const MantenimientoFotosAdicionales = ({ dominio, fotos, onChange }: Props) => {
  const categorias = FOTOS_CATEGORIAS_POR_DOMINIO[dominio] || ['Estado general', 'Otros'];

  const handleAddFoto = (categoria: string, file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const url = URL.createObjectURL(file);
    const foto: FotoLocal = { file, url, nombre: file.name };
    const updated = { ...fotos };
    updated[categoria] = [...(updated[categoria] || []), foto];
    onChange(updated);
  };

  const handleRemoveFoto = (categoria: string, index: number) => {
    const updated = { ...fotos };
    const catFotos = [...(updated[categoria] || [])];
    const removed = catFotos[index];
    if (removed?.url && removed.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(removed.url);
      } catch (e) {
        // ignore
      }
    }
    catFotos.splice(index, 1);
    updated[categoria] = catFotos;
    onChange(updated);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-navy-700 dark:text-white">
          Fotos Adicionales
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Registre evidencia fotografica adicional organizada por categoria. Este paso es opcional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {categorias.map((cat) => (
          <FotoCategoriaCard
            key={cat}
            categoria={cat}
            fotos={fotos[cat] || []}
            onAdd={(file) => handleAddFoto(cat, file)}
            onRemove={(index) => handleRemoveFoto(cat, index)}
          />
        ))}
      </div>
    </div>
  );
};

// Sub-component for each category
const FotoCategoriaCard = ({
  categoria,
  fotos,
  onAdd,
  onRemove,
}: {
  categoria: string;
  fotos: FotoLocal[];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-navy-600 dark:bg-navy-800">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-navy-700 dark:text-white">{categoria}</h4>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
        >
          <MdAddAPhoto className="h-3.5 w-3.5" />
          Agregar foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAdd(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {fotos.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400">Sin fotos</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((foto, index) => (
            <div key={index} className="relative">
              <img
                src={foto.url}
                alt={foto.nombre}
                className="h-20 w-full rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600"
              >
                <MdClose className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MantenimientoFotosAdicionales;
