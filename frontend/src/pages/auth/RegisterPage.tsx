import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import SEO from "@/shared/ui/seo/SEO";
import { 
  AuthLayout, 
  AuthInput, 
  PasswordInput, 
  ErrorMessage, 
  AuthButton, 
  FormDivider 
} from "@/features/auth/components/AuthFormComponents";

export function RegisterPage() {
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminEmail || !password || !tenantName || !organizationName) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await register({ 
        tenantName, 
        organizationName, 
        adminEmail 
      });
      
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error?.message || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Register - Kuzu Event Bus"
        description="Create your Kuzu Event Bus account to get started with graph database management"
      />
      <AuthLayout
        title="Create Account"
        subtitle="Get started with Kuzu Event Bus"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorMessage message={error} />}
          
          <div className="space-y-4">
            <AuthInput
              id="tenant-name"
              name="tenantName"
              type="text"
              label="Tenant Name"
              placeholder="my-organization"
              value={tenantName}
              onChange={setTenantName}
              required
              autoComplete="organization"
            />
            
            <AuthInput
              id="organization-name"
              name="organizationName"
              type="text"
              label="Organization Name"
              placeholder="My Organization Inc."
              value={organizationName}
              onChange={setOrganizationName}
              required
              autoComplete="organization"
            />
            
            <AuthInput
              id="admin-email"
              name="adminEmail"
              type="email"
              label="Admin Email Address"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={setAdminEmail}
              required
              autoComplete="email"
            />
            
            <PasswordInput
              id="password"
              name="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={setPassword}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              required
              autoComplete="new-password"
            />
            
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              required
              autoComplete="new-password"
            />
          </div>

          <AuthButton type="submit" isLoading={isLoading} loadingText="Creating Account...">
            Create Account
          </AuthButton>

          <FormDivider />

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </AuthLayout>
    </>
  );
}