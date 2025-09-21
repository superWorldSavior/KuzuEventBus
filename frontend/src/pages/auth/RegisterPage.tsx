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
  // Organization Name retiré du formulaire: valeur par défaut "default"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  // Backend constraints reminder for tenant_name:
  // - 3..50 chars
  // - ^[a-z0-9][a-z0-9-]*[a-z0-9]$
  // - no consecutive '--'
  const sanitizeTenant = (name: string): string => {
    // to lowercase
    let n = name.toLowerCase();
    // replace anything not [a-z0-9-] by '-'
    n = n.replace(/[^a-z0-9-]+/g, "-");
    // collapse multiple '-'
    n = n.replace(/-{2,}/g, "-");
    // trim leading/trailing '-'
    n = n.replace(/^-+/, "").replace(/-+$/, "");
    // limit length 50
    if (n.length > 50) n = n.slice(0, 50);
    return n;
  };
  const getTenantValidationError = (name: string): string | null => {
    const n = name.trim();
    if (n.length < 3 || n.length > 50) {
      return "Tenant name must be between 3 and 50 characters";
    }
    if (n.includes("--")) {
      return "Tenant name cannot contain consecutive hyphens ('--')";
    }
    const re = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!re.test(n)) {
      return "Tenant name must be lowercase alphanumerics and hyphens only, cannot start/end with '-'";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminEmail || !password || !tenantName) {
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

    // Sanitize inputs
    const sanitizedTenant = sanitizeTenant(tenantName);
    const sanitizedOrg = "default";
    const sanitizedEmail = adminEmail.trim();

    // Validate tenant_name against backend rules to avoid 422
    const tenantErr = getTenantValidationError(sanitizedTenant);
    if (tenantErr) {
      setError(tenantErr);
      return;
    }

    // Basic org/email checks
    // Organization name forcé à "default" (pas de validation nécessaire)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await register({ 
        tenantName: sanitizedTenant, 
        organizationName: sanitizedOrg, 
        adminEmail: sanitizedEmail,
        password: password,
      });
      
      if (result.success) {
        navigate("/dashboard");
      } else {
        // Surface more explicit validation hints
        const msg = result.error?.message || "Registration failed. Please try again.";
        if (msg.includes("422")) {
          setError("Registration failed (422). Please check Tenant Name formatting (lowercase letters, digits, hyphens; no start/end hyphen; no '--').");
        } else {
          setError(msg);
        }
      }
    } catch (err: any) {
      const msg = err?.message || "Registration failed. Please try again.";
      if (msg.includes("422")) {
        setError("Registration failed (422). Please check Tenant Name formatting (lowercase letters, digits, hyphens; no start/end hyphen; no '--').");
      } else {
        setError(msg);
      }
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
              onChange={(v) => setTenantName(v)}
              required
              autoComplete="organization"
            />
            
            {/* Organization Name removed: default handled in code */}
            
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