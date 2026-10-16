export type Status = 'active' | 'decided';
export type UserRole = 'superadmin' | 'associate';

export interface Associate {
  id: string;
  name: string;
  phone: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  associateId?: string; // Links to Associate id if role is associate
  createdAt: string;
  sessionVersion?: number;
}

export interface Case {
  id: string;
  title: string;
  caseNo: string;
  court: string;
  judge: string;
  clientName: string;
  clientPhone: string;
  opposing: string;
  type: string;
  fir: string;
  station: string;
  sections: string;
  stage: string;
  status: Status;
  next: string; // YYYY-MM-DD, active cases only
  decidedOn: string; // YYYY-MM-DD, decided cases only
  outcome: string;
  assoc: string[];
}

export interface LogEntry {
  key: string;
  to: string;
  num: string;
  t: string;
}

export interface ChamberData {
  cases: Case[];
  assoc: Associate[];
  users: User[];
  phone: string;
  log: LogEntry[];
}

export const OUTCOMES = ['Acquitted', 'Bail granted', 'Sentence reduced', 'Convicted', 'Dismissed', 'Compromise'];
export const CASE_TYPES = ['Murder (302 PPC)', 'Narcotics (CNSA)', 'Bail application', 'Criminal appeal', 'Revision', 'Other'];
export const STAGES = ['Notices', 'Evidence', 'Arguments', 'Judgment reserved', 'Bail hearing', 'Other'];

export const blankCase = (): Case => ({
  id: '', title: '', caseNo: '', court: '', judge: '', clientName: '', clientPhone: '', opposing: 'State',
  type: CASE_TYPES[0], fir: '', station: '', sections: '', stage: STAGES[0], status: 'active',
  next: '', decidedOn: '', outcome: '', assoc: [],
});
