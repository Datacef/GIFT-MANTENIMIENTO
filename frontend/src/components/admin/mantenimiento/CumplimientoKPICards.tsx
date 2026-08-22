'use client';
import Card from 'components/card';
import { MdCheckCircle, MdWarning, MdError, MdAssignment } from 'react-icons/md';

interface Props {
  porcentajePromedio: number;
  totalActivos: number;
  totalAlDia: number;
  totalConRetraso: number;
  totalCriticos: number;
  totalSinHistorial: number;
}

export default function CumplimientoKPICards(props: Props) {
  const { porcentajePromedio, totalActivos, totalAlDia, totalConRetraso, totalCriticos, totalSinHistorial } = props;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card extra="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cumplimiento Global</p>
            <p className="mt-2 text-2xl font-bold text-navy-700 dark:text-white">
              {porcentajePromedio}%
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {totalActivos} activos
            </p>
          </div>
          <MdAssignment className="h-7 w-7 text-brand-500" />
        </div>
      </Card>

      <Card extra="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Al dia</p>
            <p className="mt-2 text-2xl font-bold text-green-500">{totalAlDia}</p>
            <p className="mt-1 text-xs text-gray-400">
              {totalActivos > 0 ? Math.round((totalAlDia / totalActivos) * 100) : 0}% del total
            </p>
          </div>
          <MdCheckCircle className="h-7 w-7 text-green-500" />
        </div>
      </Card>

      <Card extra="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Con retraso</p>
            <p className="mt-2 text-2xl font-bold text-yellow-500">{totalConRetraso}</p>
            <p className="mt-1 text-xs text-gray-400">
              {totalActivos > 0 ? Math.round((totalConRetraso / totalActivos) * 100) : 0}% del total
            </p>
          </div>
          <MdWarning className="h-7 w-7 text-yellow-500" />
        </div>
      </Card>

      <Card extra="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Criticos</p>
            <p className="mt-2 text-2xl font-bold text-red-500">{totalCriticos}</p>
            <p className="mt-1 text-xs text-gray-400">
              {totalActivos > 0 ? Math.round((totalCriticos / totalActivos) * 100) : 0}% del total
            </p>
          </div>
          <MdError className="h-7 w-7 text-red-500" />
        </div>
      </Card>

      <Card extra="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sin historial</p>
            <p className="mt-2 text-2xl font-bold text-red-700">{totalSinHistorial}</p>
            <p className="mt-1 text-xs text-gray-400">
              {totalActivos > 0 ? Math.round((totalSinHistorial / totalActivos) * 100) : 0}% del total
            </p>
          </div>
          <MdError className="h-7 w-7 text-red-700" />
        </div>
      </Card>
    </div>
  );
}
