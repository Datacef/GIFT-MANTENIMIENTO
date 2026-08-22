import { IIndicator, MeasurementPeriod } from './indicator.types';
import { IEvidence } from './evidence.types';

/**
 * Tipos de acciones administrativas
 */
export enum AdminActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  EVIDENCE_UPLOAD = 'EVIDENCE_UPLOAD',
  EVIDENCE_UPDATE = 'EVIDENCE_UPDATE',
  EVIDENCE_DELETE = 'EVIDENCE_DELETE',
  BULK_DELETE = 'BULK_DELETE',
  BULK_UPDATE_STATUS = 'BULK_UPDATE_STATUS',
  BULK_ASSIGN = 'BULK_ASSIGN',
}

/**
 * Registro de acción administrativa
 * Cada operación admin se registra en la collection 'admin_actions'
 */
export interface IAdminAction {
  id: string;
  indicatorId: string;
  actionType: AdminActionType;
  performedBy: string; // UID del admin
  performedByEmail: string; // Email del admin
  onBehalfOf?: string; // UID del usuario responsable (si aplica)
  onBehalfOfEmail?: string; // Email del responsable
  timestamp: Date | any; // Firestore Timestamp compatible
  previousData?: any; // Snapshot antes del cambio
  newData?: any; // Snapshot después del cambio
  reason?: string; // Motivo del cambio
  affectedIds?: string[]; // Para operaciones masivas
}

/**
 * Filtros de búsqueda para admin
 */
export interface IAdminIndicatorFilters {
  responsibleEmail?: string;
  department?: string;
  measurementPeriod?: MeasurementPeriod;
  isActive?: boolean;
  hasEvidence?: boolean;
  isLate?: boolean;
  isAdminManaged?: boolean;
  searchQuery?: string; // Búsqueda de texto libre
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Información del usuario responsable
 */
export interface IResponsibleUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

/**
 * Vista extendida de indicador para admin
 * Incluye información agregada y calculada
 */
export interface IAdminIndicatorView extends IIndicator {
  evidenceCount: number; // Total de evidencias
  lastEvidenceDate?: Date | any; // Fecha de última evidencia
  isOverdue: boolean; // Si está atrasado
  daysOverdue?: number; // Días de retraso
  responsibleUser?: IResponsibleUser; // Info del responsable
  lastAdminActionDate?: Date | any; // Última acción admin
  lastAdminActionType?: AdminActionType; // Tipo de última acción
}

/**
 * Datos para crear/actualizar indicador desde admin
 */
export interface IAdminIndicatorInput {
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
  adminNotes?: string;
  isActive?: boolean;
}

/**
 * Datos para subir evidencia como admin
 */
export interface IAdminEvidenceInput {
  indicatorId: string;
  periodStartDate: Date;
  periodEndDate: Date;
  description: string;
  attachments: File[];
  onBehalfOfEmail: string; // Email del responsable
  reason: string; // Motivo de la carga por admin
}

/**
 * Resultado de operación masiva
 */
export interface IBulkOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
  actionId?: string; // ID del registro de auditoría
}

/**
 * Opciones para operaciones admin
 */
export interface IAdminOperationOptions {
  reason: string; // Motivo obligatorio
  notifyUser?: boolean; // Si notificar al responsable
  skipAudit?: boolean; // Solo para operaciones internas
}

/**
 * Estadísticas del módulo admin
 */
export interface IAdminStats {
  totalIndicators: number;
  activeIndicators: number;
  inactiveIndicators: number;
  overdueIndicators: number;
  indicatorsWithoutEvidence: number;
  adminManagedCount: number;
  totalAdminActions: number;
  actionsThisMonth: number;
}

/**
 * Preset de filtros guardado
 */
export interface IFilterPreset {
  id: string;
  name: string;
  filters: IAdminIndicatorFilters;
  createdBy: string;
  createdAt: Date | any;
  isDefault?: boolean;
}
