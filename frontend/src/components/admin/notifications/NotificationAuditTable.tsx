import React from 'react';
import { INotificationLog, NotificationStatus, NotificationType } from '../../../types/notification.types';

interface NotificationAuditTableProps {
  logs: INotificationLog[];
  loading: boolean;
}

export const NotificationAuditTable: React.FC<NotificationAuditTableProps> = ({ logs, loading }) => {
  if (loading) {
    return <div className="p-4 text-center text-gray-500">Cargando historial...</div>;
  }

  if (logs.length === 0) {
    return <div className="p-4 text-center text-gray-500">No hay registros de notificaciones.</div>;
  }

  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case NotificationType.WARNING: return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Advertencia</span>;
      case NotificationType.DUE_TODAY: return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Vence Hoy</span>;
      case NotificationType.OVERDUE: return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">Atrasado</span>;
      case NotificationType.MANUAL: return <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Manual</span>;
      default: return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  const getStatusBadge = (status: NotificationStatus) => {
    return status === NotificationStatus.SENT 
      ? <span className="text-green-600">Enviado</span>
      : <span className="text-red-600">Error</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicador</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ejecutado Por</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref. Vencimiento</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {log.sentAt ? new Date(log.sentAt).toLocaleString('es-CL') : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={log.indicatorName}>
                {log.indicatorName}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {log.recipientEmail}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getTypeBadge(log.type)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {log.triggeredBy?.replace('MANUAL: ', '') || 'Sistema'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {log.dueDateReference ? new Date(log.dueDateReference).toLocaleDateString('es-CL') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {getStatusBadge(log.status)}
                {log.error && <div className="text-xs text-red-500 mt-1 max-w-xs truncate" title={log.error}>{log.error}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
