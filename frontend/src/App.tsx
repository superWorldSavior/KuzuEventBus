import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RealTimeProvider } from "@/app/providers/RealTimeProvider";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DashboardLayout } from "@/shared/ui/layout/DashboardLayout";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { DatabasesPage } from "@/pages/databases/DatabasesPage";
import { QueriesPage } from "@/pages/queries/QueriesPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { Toaster } from "@/shared/ui/toaster";
import { AuthDebug } from "@/shared/dev/AuthDebug";

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <RealTimeProvider>
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Public routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <RegisterPage />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <DashboardLayout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/databases/*" element={<DatabasesPage />} />
                  <Route path="/queries/*" element={<QueriesPage />} />
                  <Route path="/settings/*" element={<SettingsPage />} />
                  <Route
                    path="/*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      <Toaster />
      <AuthDebug />
    </RealTimeProvider>
  );
}

export default App;
