export enum NotificationType {
  WARNING = 'WARNING',       // 1 semana antes
  DUE_TODAY = 'DUE_TODAY',   // Día del vencimiento
  OVERDUE = 'OVERDUE',       // Atrasado (reiterativo)
  MANUAL = 'MANUAL'          // Disparado por admin
}

export enum NotificationStatus {
  SENT = 'SENT',
  FAILED = 'FAILED'
}

export interface INotificationLog {
  id: string;
  indicatorId: string;
  indicatorName: string;
  recipientEmail: string;
  type: NotificationType;
  sentAt: Date | any; // Firestore Timestamp support
  dueDateReference: Date | any;
  status: NotificationStatus;
  messageId?: string;
  error?: string;
  triggeredBy: string; // 'SYSTEM' o UID del Admin
}
