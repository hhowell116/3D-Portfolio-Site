import type { UserRole, RolePermissions } from './types';

// ─── Brand Colors ────────────────────────────────────────
export const BRAND = {
  deepBrown: '#473C31',
  warmBrown: '#5f4b3c',
  taupe: '#bd9979',
  gold: '#d4a04a',
  bronze: '#C4721C',
  offWhite: '#F9F8F6',
  cream: '#f9f6f2',
  lightGray: '#d7d1ca',
  border: '#E8E4DF',
  textDark: '#25282a',
  textBrown: '#3d3228',
  white: '#FFFFFF',
} as const;

// ─── RBAC Permissions Map ────────────────────────────────
// it_admin: full access + IT overview tab
// hr: manages employees, content, campaigns, display
// csuite: same as HR (executive visibility)
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  it_admin: {
    manageUsers: true,
    manageRoster: true,
    manageCampaigns: true,
    manageContent: true,
    viewDashboard: true,
    viewItOverview: true,
  },
  hr: {
    manageUsers: false,
    manageRoster: true,
    manageCampaigns: true,
    manageContent: true,
    viewDashboard: true,
    viewItOverview: false,
  },
  csuite: {
    manageUsers: false,
    manageRoster: true,
    manageCampaigns: true,
    manageContent: true,
    viewDashboard: true,
    viewItOverview: false,
  },
};

// ─── Display Defaults ────────────────────────────────────
export const DISPLAY_DEFAULTS = {
  rotationSpeed: 10000,
  transitionDuration: 1200,
  showProgressBar: true,
  showDotNav: true,
  isLive: true,
} as const;

// ─── Months ──────────────────────────────────────────────
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
