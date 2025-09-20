import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeSlash, Lock, Building, Envelope } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function RegisterPage() {
  const [formData, setFormData] = useState({
    tenant_name: "",
    organization_name: "",
    admin_email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Tenant name validation
    if (!formData.tenant_name.trim()) {
      errors.tenant_name = "Tenant name is required";
    } else if (formData.tenant_name.length < 3) {
      errors.tenant_name = "Tenant name must be at least 3 characters";
    } else if (!/^[a-z0-9-]+$/.test(formData.tenant_name)) {
      errors.tenant_name = "Tenant name can only contain lowercase letters, numbers, and hyphens";
    }

    // Organization name validation
    if (!formData.organization_name.trim()) {
      errors.organization_name = "Organization name is required";
    } else if (formData.organization_name.length < 2) {
      errors.organization_name = "Organization name must be at least 2 characters";
    }

    // Email validation
    if (!formData.admin_email.trim()) {
      errors.admin_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      errors.admin_email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return errors;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    setError("");
    setValidationErrors({});

    try {
      const registrationData = {
        tenant_name: formData.tenant_name,
        organization_name: formData.organization_name,
        admin_email: formData.admin_email,
      };

      const result = await register(registrationData);

      if (result.success) {
        // Registration successful, redirect to dashboard
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <div className="text-white font-bold text-lg">KB</div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign up for Kuzu EventBus and start managing your graph databases
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {/* Tenant Name */}
            <div>
              <label htmlFor="tenant_name" className="block text-sm font-medium text-gray-700 mb-1">
                Tenant Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="tenant_name"
                  type="text"
                  value={formData.tenant_name}
                  onChange={(e) => handleInputChange("tenant_name", e.target.value)}
                  className={`pl-10 ${validationErrors.tenant_name ? "border-red-500" : ""}`}
                  placeholder="my-organization"
                  disabled={isLoading}
                />
              </div>
              {validationErrors.tenant_name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.tenant_name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only. This will be your unique identifier.
              </p>
            </div>

            {/* Organization Name */}
            <div>
              <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="organization_name"
                  type="text"
                  value={formData.organization_name}
                  onChange={(e) => handleInputChange("organization_name", e.target.value)}
                  className={`pl-10 ${validationErrors.organization_name ? "border-red-500" : ""}`}
                  placeholder="My Organization Inc."
                  disabled={isLoading}
                />
              </div>
              {validationErrors.organization_name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.organization_name}</p>
              )}
            </div>

            {/* Admin Email */}
            <div>
              <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Envelope className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="admin_email"
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => handleInputChange("admin_email", e.target.value)}
                  className={`pl-10 ${validationErrors.admin_email ? "border-red-500" : ""}`}
                  placeholder="admin@myorganization.com"
                  disabled={isLoading}
                />
              </div>
              {validationErrors.admin_email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.admin_email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={`pl-10 pr-10 ${validationErrors.password ? "border-red-500" : ""}`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeSlash className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={`pl-10 pr-10 ${validationErrors.confirmPassword ? "border-red-500" : ""}`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeSlash className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          {/* Login Link */}
          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
