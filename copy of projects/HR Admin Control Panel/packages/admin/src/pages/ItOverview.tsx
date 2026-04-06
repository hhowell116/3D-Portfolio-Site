import { useEffect, useState } from 'react';
import {
  collection, query, getDocs, where, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { AppUser, Employee, Campaign, DisplayConfig, AccessLevel } from '@rco/shared';
import type { UserRole } from '@rco/shared';
import {
  Server, Users, Shield, Monitor, AlertTriangle, CheckCircle,
  Activity, UserCheck, Trophy,
} from 'lucide-react';
import { useRolePermissions, CAPABILITIES } from '../hooks/useRolePermissions';
import type { CapabilityKey } from '../hooks/useRolePermissions';

interface SystemStatus {
  users: AppUser[];
  employeeCount: number;
  employeesWithoutPhotos: number;
  employeesWithoutBirthdays: number;
  employeesWithoutHireDate: number;
  activeCampaigns: number;
  totalCampaigns: number;
  displayConfig: DisplayConfig | null;
  displayContentCount: number;
}

export function ItOverview() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { matrix, updateAccess } = useRolePermissions();

  useEffect(() => {
    async function loadStatus() {
      try {
        // Users
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));

        // Employees
        const employeesSnap = await getDocs(collection(db, 'employees'));
        const employees = employeesSnap.docs.map((d) => d.data() as Employee);
        const active = employees.filter((e) => e.isActive);

        // Campaigns
        const campaignsSnap = await getDocs(collection(db, 'campaigns'));
        const campaigns = campaignsSnap.docs.map((d) => d.data() as Campaign);

        // Display config
        const configSnap = await getDoc(doc(db, 'displayConfig', 'default'));
        const displayConfig = configSnap.exists() ? (configSnap.data() as DisplayConfig) : null;

        // Display content
        const displaySnap = await getDocs(
          query(collection(db, 'displayContent'), where('isActive', '==', true))
        );

        setStatus({
          users,
          employeeCount: active.length,
          employeesWithoutPhotos: active.filter((e) => !e.photoUrl).length,
          employeesWithoutBirthdays: active.filter((e) => !e.birthMonth).length,
          employeesWithoutHireDate: active.filter((e) => !e.hireDate).length,
          activeCampaigns: campaigns.filter((c) => c.isActive).length,
          totalCampaigns: campaigns.length,
          displayConfig,
          displayContentCount: displaySnap.size,
        });
      } catch (err) {
        console.error('Failed to load IT overview:', err);
      }
      setLoading(false);
    }
    loadStatus();
  }, []);

  if (loading || !status) {
    return (
      <div className="text-sm text-brand-taupe">Loading system status...</div>
    );
  }

  const issues: { level: 'warning' | 'info'; message: string }[] = [];

  if (status.employeesWithoutPhotos > 0) {
    issues.push({ level: 'info', message: `${status.employeesWithoutPhotos} employees missing photos` });
  }
  if (status.employeesWithoutBirthdays > 0) {
    issues.push({ level: 'info', message: `${status.employeesWithoutBirthdays} employees missing birthday data` });
  }
  if (status.employeesWithoutHireDate > 0) {
    issues.push({ level: 'info', message: `${status.employeesWithoutHireDate} employees missing hire date` });
  }
  if (status.displayContentCount === 0) {
    issues.push({ level: 'warning', message: 'No active display content — screens are showing idle' });
  }
  if (!status.displayConfig) {
    issues.push({ level: 'warning', message: 'Display settings not configured yet' });
  }
  if (status.displayConfig && !status.displayConfig.isLive) {
    issues.push({ level: 'warning', message: 'Display is turned OFF — screens are idle' });
  }
  if (status.users.length === 0) {
    issues.push({ level: 'warning', message: 'No users in the system' });
  }

  const warnings = issues.filter((i) => i.level === 'warning');
  const infos = issues.filter((i) => i.level === 'info');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">IT Overview</h2>
        <p className="text-sm text-brand-taupe mt-0.5">System health and data quality at a glance</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatusCard icon={Server} label="Firebase Project" value="rco-hr-admin" color="bg-brand-warm-brown" />
        <StatusCard icon={Users} label="Active Employees" value={String(status.employeeCount)} color="bg-brand-gold" />
        <StatusCard icon={Trophy} label="Active Campaigns" value={`${status.activeCampaigns} / ${status.totalCampaigns}`} color="bg-brand-bronze" />
        <StatusCard icon={Monitor} label="Display Slides" value={String(status.displayContentCount)} color="bg-brand-taupe" />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Attention Needed</h3>
          </div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info items */}
      {infos.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-800">Data Completeness</h3>
          </div>
          <ul className="space-y-1">
            {infos.map((info, i) => (
              <li key={i} className="text-sm text-blue-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {info.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {issues.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm text-green-700 font-medium">All systems healthy — no issues detected</p>
        </div>
      )}

      {/* User access table */}
      <div className="bg-white rounded-xl border border-brand-border overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-brand-border bg-brand-off-white flex items-center gap-2">
          <UserCheck size={16} className="text-brand-taupe" />
          <h3 className="text-sm font-semibold text-brand-deep-brown">User Access</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="text-left px-4 py-2.5 font-medium text-brand-taupe">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-brand-taupe">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-brand-taupe hidden md:table-cell">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {status.users.map((u) => (
                <tr key={u.uid} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-brand-deep-brown">{u.displayName}</p>
                    <p className="text-xs text-brand-taupe">{u.email}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-2.5 text-brand-text-brown hidden md:table-cell">
                    {u.lastLogin
                      ? (u.lastLogin as any).toDate
                        ? (u.lastLogin as any).toDate().toLocaleString()
                        : '—'
                      : 'Never'}
                  </td>
                </tr>
              ))}
              {status.users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-brand-taupe">
                    No users have signed in yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Access Matrix */}
      <div className="bg-white rounded-xl border border-brand-border overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-brand-border bg-brand-off-white flex items-center gap-2">
          <Shield size={16} className="text-brand-taupe" />
          <h3 className="text-sm font-semibold text-brand-deep-brown">Role Access Matrix</h3>
          <span className="ml-auto text-[10px] text-brand-taupe">Click to toggle access levels</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-off-white/50">
                <th className="text-left px-4 py-2.5 font-medium text-brand-taupe">Capability</th>
                <th className="text-center px-3 py-2.5 font-medium text-brand-taupe">
                  <RoleBadge role="it_admin" />
                </th>
                <th className="text-center px-3 py-2.5 font-medium text-brand-taupe">
                  <RoleBadge role="hr" />
                </th>
                <th className="text-center px-3 py-2.5 font-medium text-brand-taupe">
                  <RoleBadge role="csuite" />
                </th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap) => (
                <tr key={cap.key} className="border-b border-brand-border last:border-0 hover:bg-brand-off-white/30">
                  <td className="px-4 py-2.5 text-brand-text-brown">{cap.label}</td>
                  {/* IT Admin — always full, not toggleable */}
                  <td className="text-center px-3 py-2.5">
                    <AccessBadge level="manage" locked />
                  </td>
                  {/* HR — toggleable */}
                  <td className="text-center px-3 py-2.5">
                    <AccessToggle
                      level={matrix.hr[cap.key as CapabilityKey]}
                      onChange={(lvl) => updateAccess('hr', cap.key as CapabilityKey, lvl)}
                    />
                  </td>
                  {/* C-Suite — toggleable */}
                  <td className="text-center px-3 py-2.5">
                    <AccessToggle
                      level={matrix.csuite[cap.key as CapabilityKey]}
                      onChange={(lvl) => updateAccess('csuite', cap.key as CapabilityKey, lvl)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-brand-off-white/50 border-t border-brand-border">
          <div className="flex flex-wrap gap-4 text-[11px] text-brand-taupe mb-2">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Manage — full access</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Read Only — can view but not edit</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" /> Can't See — hidden from this role</span>
          </div>
          <p className="text-xs text-brand-taupe">
            Only <strong>@rowecasaorganics.com</strong> Google accounts can sign in.
            IT Admin always has full access and cannot be restricted. Changes save automatically and apply to all users.
          </p>
        </div>
      </div>

    </div>
  );
}

function StatusCard({ icon: Icon, label, value, color }: { icon: typeof Server; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-brand-border">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} w-9 h-9 rounded-lg flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
        <span className="text-sm text-brand-taupe">{label}</span>
      </div>
      <p className="text-2xl font-bold text-brand-deep-brown">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    it_admin: 'bg-purple-50 text-purple-700',
    hr: 'bg-brand-cream text-brand-warm-brown',
    csuite: 'bg-amber-50 text-amber-700',
  };
  const labels: Record<string, string> = {
    it_admin: 'IT Admin',
    hr: 'HR',
    csuite: 'C-Suite',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-600'}`}>
      {labels[role] || role}
    </span>
  );
}

const ACCESS_CYCLE: AccessLevel[] = ['none', 'read', 'manage'];
const ACCESS_STYLES: Record<AccessLevel, { bg: string; text: string; label: string }> = {
  manage: { bg: 'bg-green-100', text: 'text-green-700', label: 'Manage' },
  read: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Read Only' },
  none: { bg: 'bg-gray-100', text: 'text-gray-400', label: "Can't See" },
};

function AccessBadge({ level, locked }: { level: AccessLevel; locked?: boolean }) {
  const s = ACCESS_STYLES[level];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${s.bg} ${s.text} ${locked ? 'opacity-60' : ''}`}>
      {s.label}
    </span>
  );
}

function AccessToggle({ level, onChange }: { level: AccessLevel; onChange: (l: AccessLevel) => void }) {
  const cycle = () => {
    const idx = ACCESS_CYCLE.indexOf(level);
    const next = ACCESS_CYCLE[(idx + 1) % ACCESS_CYCLE.length];
    onChange(next);
  };
  const s = ACCESS_STYLES[level];
  return (
    <button
      onClick={cycle}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${s.bg} ${s.text} hover:ring-2 hover:ring-brand-gold/40 transition-all cursor-pointer`}
      title={`Click to change — currently: ${s.label}`}
    >
      {s.label}
    </button>
  );
}
