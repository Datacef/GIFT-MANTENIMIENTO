import React from 'react';

interface NotificationStatsProps {
  stats: {
    sentToday: number;
    errorsToday: number;
    overdueTotal: number;
    warningsToday: number;
  };
}

export const NotificationStats: React.FC<NotificationStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Enviados Hoy</div>
        <div className="text-2xl font-bold text-blue-600">{stats.sentToday}</div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Advertencias Hoy</div>
        <div className="text-2xl font-bold text-yellow-600">{stats.warningsToday}</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Errores</div>
        <div className="text-2xl font-bold text-red-600">{stats.errorsToday}</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Total Atrasados</div>
        <div className="text-2xl font-bold text-orange-600">{stats.overdueTotal}</div>
      </div>
    </div>
  );
};
