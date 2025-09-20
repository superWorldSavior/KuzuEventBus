import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getDefaultDemoUser } from "@/shared/lib/demo-users";
import SEO from "@/shared/ui/seo/SEO";
import { 
  AuthLayout, 
  AuthInput, 
  PasswordInput, 
  ErrorMessage, 
  AuthButton, 
  FormDivider 
} from "@/features/auth/components/AuthFormComponents";
import { DemoUserInfo } from "@/features/auth/components/DemoUserInfo";

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
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await loginWithApiKey({ apiKey: email }); // Treat email field as API key for now

      if (result.success) {
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
    setIsLoading(true);
    setError("");

    try {
      const demoUser = getDefaultDemoUser();
      // Use demo user email as API key for demo purposes
      const result = await loginWithApiKey({ apiKey: demoUser.email });

      if (result.success) {
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.error?.message || "Demo login failed");
      }
    } catch (error) {
      console.error("Demo login error:", error);
      setError("Demo login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
        <DemoUserInfo />
        
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
