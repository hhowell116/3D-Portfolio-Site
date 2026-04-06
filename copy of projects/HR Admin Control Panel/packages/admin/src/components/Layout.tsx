import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useRole } from '../rbac/useRole';
import { GuidedTour, TourLauncher } from './GuidedTour';
import {
  LayoutDashboard,
  Users,
  Cake,
  Award,
  Trophy,
  UserCog,
  LogOut,
  Menu,
  Monitor,
  Server,
  Tv,
  Settings,
  Camera,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { to: '/employees', label: 'Employee Roster', icon: Users, permission: 'manageRoster' as const },
  { to: '/birthdays', label: 'Birthdays', icon: Cake, permission: 'manageContent' as const },
  { to: '/anniversaries', label: 'Anniversaries', icon: Award, permission: 'manageContent' as const },
  { to: '/campaigns', label: 'Campaigns', icon: Trophy, permission: 'manageCampaigns' as const },
  { to: '/photo-submissions', label: 'Photo Submissions', icon: Camera, permission: 'manageRoster' as const },
  { to: '/displays', label: 'View Displays', icon: Tv, permission: null },
  { to: '/display-settings', label: 'Display Settings', icon: Settings, permission: 'manageCampaigns' as const },
];

const IT_NAV_ITEMS = [
  { to: '/users', label: 'User Management', icon: UserCog, permission: 'manageUsers' as const },
  { to: '/it-overview', label: 'IT Overview', icon: Server, permission: 'viewItOverview' as const },
];

export function Layout() {
  const { appUser, logOut } = useAuth();
  const { permissions } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const location = useLocation();

  // Auto-launch tour on first visit
  useEffect(() => {
    const seen = localStorage.getItem('rco-tour-seen');
    if (!seen) setShowTour(true);
  }, []);

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === null || permissions[item.permission]
  );
  const visibleItItems = IT_NAV_ITEMS.filter(
    (item) => permissions[item.permission]
  );

  return (
    <div className="flex h-screen bg-brand-off-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-brand-border
          transform transition-transform duration-200 lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-border">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-warm-brown to-brand-taupe flex items-center justify-center">
              <span className="text-white text-xs font-bold">RC</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-brand-deep-brown">Rowe Casa</h1>
              <p className="text-[11px] text-brand-taupe">HR TV Admin</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                data-tour={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-cream text-brand-warm-brown font-medium'
                      : 'text-brand-text-brown hover:bg-brand-off-white'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}

            {/* IT Section */}
            {visibleItItems.length > 0 && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <div className="border-t border-brand-border mb-2" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-500">
                    IT Eyes Only
                  </p>
                </div>
                {visibleItItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-tour={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-brand-text-brown hover:bg-brand-off-white'
                      }`
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* Help & Tour */}
          <div className="px-3 pb-1">
            <TourLauncher onClick={() => setShowTour(true)} />
          </div>

          {/* User footer */}
          <div className="border-t border-brand-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-light-gray flex items-center justify-center text-xs font-medium text-brand-warm-brown">
                {appUser?.displayName?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-deep-brown truncate">
                  {appUser?.displayName}
                </p>
                <p className="text-[11px] text-brand-taupe capitalize">{appUser?.role}</p>
              </div>
              <button
                onClick={logOut}
                className="p-1.5 rounded hover:bg-brand-off-white text-brand-taupe hover:text-brand-warm-brown transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-brand-border">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu size={20} className="text-brand-warm-brown" />
          </button>
          <h1 className="text-sm font-semibold text-brand-deep-brown">RCO HR TV Admin</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Guided Tour */}
      {showTour && (
        <GuidedTour
          onClose={() => {
            setShowTour(false);
            localStorage.setItem('rco-tour-seen', '1');
          }}
        />
      )}
    </div>
  );
}
