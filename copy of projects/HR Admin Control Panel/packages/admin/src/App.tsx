import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { EmployeeRoster } from './pages/EmployeeRoster';
import { Birthdays } from './pages/Birthdays';
import { Anniversaries } from './pages/Anniversaries';
import { Campaigns } from './pages/Campaigns';
import { DisplaySettings } from './pages/DisplaySettings';
import { UserManagement } from './pages/UserManagement';
import { ItOverview } from './pages/ItOverview';
import { ViewDisplays } from './pages/ViewDisplays';
import { SeedData } from './pages/SeedData';
import { ImportRoster } from './pages/ImportRoster';
import { QuickCampaign } from './pages/QuickCampaign';
import { CsvImport } from './pages/CsvImport';
import { PhotoSubmissions } from './pages/PhotoSubmissions';
import { RoleGuard } from './rbac/RoleGuard';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-off-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-warm-brown border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-brand-taupe">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/employees"
          element={
            <RoleGuard requiredPermission="manageRoster" fallback={<Navigate to="/" />}>
              <EmployeeRoster />
            </RoleGuard>
          }
        />
        <Route
          path="/birthdays"
          element={
            <RoleGuard requiredPermission="manageContent" fallback={<Navigate to="/" />}>
              <Birthdays />
            </RoleGuard>
          }
        />
        <Route
          path="/anniversaries"
          element={
            <RoleGuard requiredPermission="manageContent" fallback={<Navigate to="/" />}>
              <Anniversaries />
            </RoleGuard>
          }
        />
        <Route
          path="/campaigns"
          element={
            <RoleGuard requiredPermission="manageCampaigns" fallback={<Navigate to="/" />}>
              <Campaigns />
            </RoleGuard>
          }
        />
        <Route
          path="/photo-submissions"
          element={
            <RoleGuard requiredPermission="manageRoster" fallback={<Navigate to="/" />}>
              <PhotoSubmissions />
            </RoleGuard>
          }
        />
        <Route path="/displays" element={<ViewDisplays />} />
        <Route
          path="/display-settings"
          element={
            <RoleGuard requiredPermission="manageCampaigns" fallback={<Navigate to="/" />}>
              <DisplaySettings />
            </RoleGuard>
          }
        />
        <Route
          path="/users"
          element={
            <RoleGuard requiredPermission="manageUsers" fallback={<Navigate to="/" />}>
              <UserManagement />
            </RoleGuard>
          }
        />
        <Route
          path="/it-overview"
          element={
            <RoleGuard allowedRoles={['it_admin']} fallback={<Navigate to="/" />}>
              <ItOverview />
            </RoleGuard>
          }
        />
        <Route
          path="/seed-data"
          element={
            <RoleGuard allowedRoles={['it_admin']} fallback={<Navigate to="/" />}>
              <SeedData />
            </RoleGuard>
          }
        />
        <Route
          path="/csv-import"
          element={
            <RoleGuard requiredPermission="manageRoster" fallback={<Navigate to="/" />}>
              <CsvImport />
            </RoleGuard>
          }
        />
        <Route
          path="/quick-campaign"
          element={
            <RoleGuard requiredPermission="manageCampaigns" fallback={<Navigate to="/" />}>
              <QuickCampaign />
            </RoleGuard>
          }
        />
        <Route
          path="/import-roster"
          element={
            <RoleGuard allowedRoles={['it_admin']} fallback={<Navigate to="/" />}>
              <ImportRoster />
            </RoleGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
