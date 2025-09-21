import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { validateApiKeyFormat, maskApiKey } from "@/features/auth/utils/validation";
import { demoAuthService } from "@/features/auth/services/demoAuthService";
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
  const [loginMode, setLoginMode] = useState<"apikey" | "credentials">("credentials");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { loginWithApiKey, loginWithDemo } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError("");

    try {
      let result;

      if (loginMode === "apikey") {
        // API Key login mode
        if (!apiKey) {
          setError("API key is required");
          return;
        }

        const validation = validateApiKeyFormat(apiKey);
        if (!validation.isValid) {
          setError(validation.error || "Invalid API key format");
          return;
        }

        result = await loginWithApiKey({ apiKey });
        if (result.success) {
          console.log("Login successful with API key:", maskApiKey(apiKey));
        }
      } else {
        // Credentials login mode (email/password)
        // For now, we'll treat this as API key mode where email field contains API key
        // This maintains backward compatibility
        if (!email) {
          setError("Email or API key is required");
          return;
        }

        // Check if the email field looks like an API key
        if (email.startsWith('kb_')) {
          // Treat as API key
          const validation = validateApiKeyFormat(email);
          if (!validation.isValid) {
            setError(validation.error || "Invalid API key format");
            return;
          }
          result = await loginWithApiKey({ apiKey: email });
          if (result.success) {
            console.log("Login successful with API key:", maskApiKey(email));
          }
        } else {
          // Traditional email/password - for now, show error as this requires backend implementation
          setError("Email/password login is not yet implemented. Please use your API key or try the demo account.");
          return;
        }
      }

      if (result.success) {
        navigate("/dashboard", { replace: true });
      } else {
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
      const result = await loginWithDemo();

      if (result.success) {
        console.log("Demo login successful");
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.error?.message || "Demo login failed");
      }
    } catch (error) {
      console.error("Demo login error:", error);
      setError("An unexpected error occurred during demo login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoCredentials = () => {
    const demoUser = demoAuthService.getDemoUserInfo();
    
    if (loginMode === "credentials") {
      setEmail(demoUser.email);
      setPassword(demoUser.password);
    } else {
      setApiKey(demoUser.apiKey);
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
        {demoAuthService.isDemoModeAvailable() && (
          <DemoUserInfo 
            onFillCredentials={handleFillDemoCredentials}
            loginMode={loginMode}
          />
        )}
        
        {error && <ErrorMessage message={error} />}

        {/* Login Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setLoginMode("credentials")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMode === "credentials"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMode("apikey")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMode === "apikey"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            API Key
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {loginMode === "credentials" ? (
            <>
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
            </>
          ) : (
            <AuthInput
              id="apiKey"
              name="apiKey"
              type="text"
              label="API Key"
              placeholder="Enter your API key (kb_...)"
              value={apiKey}
              onChange={setApiKey}
              autoComplete="off"
              required
            />
          )}

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
