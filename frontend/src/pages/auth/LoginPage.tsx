import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { validateApiKeyFormat, maskApiKey } from "@/features/auth/utils/validation";
// Removed demo user utilities - no more demo authentication
import SEO from "@/shared/ui/seo/SEO";
import { 
  AuthLayout, 
  AuthInput, 
  PasswordInput, 
  ErrorMessage, 
  AuthButton, 
  FormDivider 
} from "@/features/auth/components/AuthFormComponents";
// Removed DemoUserInfo - authentication now requires real API keys

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { loginWithApiKey } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Treat email field as API key for login
    if (!email) {
      setError("API key is required");
      return;
    }

    // Client-side validation of API key format
    const validation = validateApiKeyFormat(email);
    if (!validation.isValid) {
      setError(validation.error || "Invalid API key format");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await loginWithApiKey({ apiKey: email });

      if (result.success) {
        console.log("Login successful with API key:", maskApiKey(email)); // Log masked for security
        navigate("/dashboard", { replace: true });
      } else {
        // Handle the error case - result.error is AuthError type
        setError(result.error?.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    // Demo login removed - users must use real API keys from registration
    setError("Demo login has been disabled. Please register for an API key or use your existing credentials.");
  };

  return (
    <>
      <SEO 
        title="Sign In"
        description="Sign in to your Kuzu EventBus account to access your graph databases and analytics dashboard."
        keywords="kuzu eventbus, login, sign in, graph database, authentication"
      />
      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to your Kuzu EventBus account"
      >
        {/* Removed DemoUserInfo - authentication now requires real API keys */}
        
        {error && <ErrorMessage message={error} />}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <AuthInput
            id="email"
            name="email"
            type="email"
            label="Email address"
            placeholder="Enter your email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
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
            autoComplete="current-password"
            required
          />

          <AuthButton
            type="submit"
            isLoading={isLoading}
            loadingText="Signing in..."
          >
            <Lock className="w-4 h-4 mr-2" />
            Sign in
          </AuthButton>

          <FormDivider />

          <AuthButton
            type="button"
            variant="secondary"
            onClick={handleDemoLogin}
            isLoading={isLoading}
            loadingText="Loading demo..."
          >
            <User className="w-4 h-4 mr-2" />
            Try Demo Account
          </AuthButton>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  );
}
