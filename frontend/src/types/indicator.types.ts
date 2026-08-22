export enum MeasurementPeriod {
  WEEKLY = 'Semanal',
  MONTHLY = 'Mensual',
  QUARTERLY = 'Trimestral',
  SEMESTER = 'Semestral',
  ANNUAL = 'Anual'
}

export enum ChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE'
}

export interface IIndicator {
  id: string;
  process: string;
  subProcess: string;
  stage: string;
  genericStrategy: string;
  strategyDescription: string;
  responsibleDepartment: string;
  achievementIndicator: string;
  measurementPeriod: MeasurementPeriod;
  evidence: string;
  responsibleEmail: string;
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: Date | any; // Type 'any' allowed for Firestore Timestamp compatibility
  updatedAt: Date | any;
  isActive: boolean;
  nextNotificationDate?: Date | any;
  lastNotificationDate?: Date | any;
  
  // Admin management fields
  managedBy?: string;               // UID del admin que gestionó
  managedByEmail?: string;          // Email del admin
  isAdminManaged?: boolean;         // Si fue gestionado por admin
  lastAdminAction?: Date | any;     // Última acción administrativa
  adminNotes?: string;              // Notas internas del admin
}

export interface IIndicatorHistory {
  id: string;
  indicatorId: string;
  previousData: IIndicator | null; // Null if it's a creation event
  changedBy: string;
  changeDate: Date | any;
  changeType: ChangeType;
  reason?: string;
}
