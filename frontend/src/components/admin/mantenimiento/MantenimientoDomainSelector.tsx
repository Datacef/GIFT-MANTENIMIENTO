'use client';
import {
  MdMedicalServices,
  MdPrecisionManufacturing,
  MdDirectionsCar,
  MdBusiness,
} from 'react-icons/md';

const DOMINIOS = [
  {
    value: 'equipoMedico',
    label: 'Equipos Medicos',
    icon: MdMedicalServices,
    color: 'blue',
    bgSelected: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30',
    bgDefault: 'border-gray-200 dark:border-navy-600',
    iconColor: 'text-blue-500',
  },
  {
    value: 'equipoIndustrial',
    label: 'Equipos Industriales',
    icon: MdPrecisionManufacturing,
    color: 'orange',
    bgSelected: 'border-orange-500 bg-orange-50 dark:bg-orange-900/30',
    bgDefault: 'border-gray-200 dark:border-navy-600',
    iconColor: 'text-orange-500',
  },
  {
    value: 'flotaVehicular',
    label: 'Flota Vehicular',
    icon: MdDirectionsCar,
    color: 'purple',
    bgSelected: 'border-purple-500 bg-purple-50 dark:bg-purple-900/30',
    bgDefault: 'border-gray-200 dark:border-navy-600',
    iconColor: 'text-purple-500',
  },
  {
    value: 'infraestructura',
    label: 'Infraestructura',
    icon: MdBusiness,
    color: 'green',
    bgSelected: 'border-green-500 bg-green-50 dark:bg-green-900/30',
    bgDefault: 'border-gray-200 dark:border-navy-600',
    iconColor: 'text-green-500',
  },
];

interface Props {
  selectedDominio: string;
  onSelect: (dominio: string) => void;
}

const MantenimientoDomainSelector = ({ selectedDominio, onSelect }: Props) => {
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-navy-700 dark:text-white">
        Seleccione el dominio del activo
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DOMINIOS.map((d) => {
          const Icon = d.icon;
          const isSelected = selectedDominio === d.value;
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => onSelect(d.value)}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
                isSelected ? d.bgSelected : d.bgDefault
              } dark:bg-navy-700`}
            >
              <div
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${
                  isSelected ? `bg-white dark:bg-navy-800` : 'bg-gray-50 dark:bg-navy-600'
                }`}
              >
                <Icon className={`h-8 w-8 ${d.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-navy-700 dark:text-white">
                  {d.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MantenimientoDomainSelector;
