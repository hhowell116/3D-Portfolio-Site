import { Timestamp } from 'firebase/firestore';

// ─── RBAC ────────────────────────────────────────────────
export type UserRole = 'it_admin' | 'hr' | 'csuite';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  createdBy: string;
}

// ─── Employees ───────────────────────────────────────────
export type PhotoStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface Employee {
  id?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  department: string;
  employeeId: string;
  phoneLast4: string;
  photoUrl: string | null;
  photoStatus: PhotoStatus;
  birthMonth: number;
  birthDay: number;
  hireDate: Timestamp | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Campaigns ───────────────────────────────────────────
export type CampaignType = 'rockstar' | 'birthday' | 'anniversary' | 'custom';

export interface Campaign {
  id?: string;
  type: CampaignType;
  title: string;
  month: string;
  year: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface CampaignEntry {
  id?: string;
  employeeRef: string;
  employeeName: string;
  employeeTitle: string;
  employeeTenure: string;
  employeeInitials: string;
  photoUrl: string | null;
  quote: string;
  badgeText: string;
  isVisible: boolean;
  displayOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Display ─────────────────────────────────────────────
export type DisplayContentType = 'rockstar' | 'birthday' | 'anniversary';

export interface DisplayContent {
  id?: string;
  type: DisplayContentType;
  campaignId: string;
  entryId: string;
  employeeName: string;
  employeeTitle: string;
  employeeTenure: string;
  employeeInitials: string;
  photoUrl: string | null;
  quote: string;
  badgeText: string;
  displayOrder: number;
  isActive: boolean;
  updatedAt: Timestamp;
}

export interface DisplayConfig {
  rotationSpeed: number;
  transitionDuration: number;
  showProgressBar: boolean;
  showDotNav: boolean;
  isLive: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Photo Submissions ──────────────────────────────────
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface PhotoSubmission {
  id?: string;
  employeeId: string;
  employeeName: string;
  photoData: string; // base64 data URL
  status: SubmissionStatus;
  submittedAt: Timestamp;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null;
}

// ─── Permissions ─────────────────────────────────────────
export type AccessLevel = 'none' | 'read' | 'manage';

export interface RolePermissions {
  manageUsers: boolean;
  manageRoster: boolean;
  manageCampaigns: boolean;
  manageContent: boolean;
  viewDashboard: boolean;
  viewItOverview: boolean;
}

export interface RoleAccessConfig {
  [capability: string]: AccessLevel;
}
