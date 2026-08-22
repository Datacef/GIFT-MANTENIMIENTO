export enum EvidenceStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  LATE = 'LATE',
  NO_RECORDS = 'NO_RECORDS',
  MISSING = 'MISSING'
}

export interface IAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface IEvidence {
  id: string;
  indicatorId: string;
  periodStartDate: Date | any; // Type 'any' allowed for Firestore Timestamp
  periodEndDate: Date | any;
  status: EvidenceStatus;
  description: string;
  attachments: IAttachment[];
  submittedBy: string; // Email or UID
  submittedAt: Date | any;
  isLate: boolean;
}
