import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/hooks/useAuth";
// Email/password login: plus d'auth par API key ici
// Removed demo user utilities - no more demo authentication
import SEO from "@/shared/ui/seo/SEO";
import { 
  AuthLayout, 
  AuthInput, 
  PasswordInput, 
  ErrorMessage, 
  AuthButton 
} from "@/features/auth/components/AuthFormComponents";
// Removed DemoUserInfo - authentication now requires real API keys

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { handleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email requis");
      return;
    }
    if (!password) {
      setError("Mot de passe requis");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await handleLogin({ email, password });

      if (result.success) {
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.error?.message || "Échec de la connexion");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login supprimé: authentification via email/mot de passe uniquement

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

          {/* Removed demo account button */}
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
