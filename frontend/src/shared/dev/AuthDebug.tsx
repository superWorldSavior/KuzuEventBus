import { useAuth } from "@/features/auth/hooks/useAuth";
import { useLocation } from "react-router-dom";

export function AuthDebug() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono max-w-sm z-50">
      <div className="font-bold mb-2">Auth Debug</div>
      <div>Path: {location.pathname}</div>
      <div>Loading: {isLoading ? "true" : "false"}</div>
      <div>Authenticated: {isAuthenticated ? "true" : "false"}</div>
      <div>User: {user ? user.adminEmail : "null"}</div>
      <div>Token: {user ? "present" : "null"}</div>
    </div>
  );
}