import { ReactNode } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <div className="text-white font-bold text-lg">KB</div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

interface AuthInputProps {
  id: string;
  name: string;
  type?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  autoComplete?: string;
}

export function AuthInput({
  id,
  name,
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  autoComplete,
}: AuthInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1">
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`block w-full px-3 py-2 border ${
            error ? "border-red-300" : "border-gray-300"
          } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 ${
            error ? "focus:ring-red-500" : "focus:ring-blue-500"
          } focus:border-transparent`}
          placeholder={placeholder}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface PasswordInputProps extends Omit<AuthInputProps, "type"> {
  showPassword: boolean;
  onTogglePassword: () => void;
}

export function PasswordInput({
  showPassword,
  onTogglePassword,
  ...props
}: PasswordInputProps) {
  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">
        {props.label}
      </label>
      <div className="mt-1 relative">
        <input
          id={props.id}
          name={props.name}
          type={showPassword ? "text" : "password"}
          autoComplete={props.autoComplete}
          required={props.required}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={`block w-full px-3 py-2 pr-10 border ${
            props.error ? "border-red-300" : "border-gray-300"
          } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 ${
            props.error ? "focus:ring-red-500" : "focus:ring-blue-500"
          } focus:border-transparent`}
          placeholder={props.placeholder}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          onClick={onTogglePassword}
        >
          {showPassword ? (
            <EyeSlash className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
      {props.error && <p className="mt-1 text-sm text-red-600">{props.error}</p>}
    </div>
  );
}

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
      {message}
    </div>
  );
}

interface AuthButtonProps {
  type?: "button" | "submit";
  isLoading: boolean;
  loadingText: string;
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function AuthButton({
  type = "submit",
  isLoading,
  loadingText,
  children,
  onClick,
  variant = "primary",
}: AuthButtonProps) {
  const baseClasses = "group relative w-full flex justify-center py-2 px-4 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  
  const variantClasses = {
    primary: "border border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "border-2 border-dashed border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 focus:ring-blue-500",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className={`w-4 h-4 border-2 ${variant === "primary" ? "border-white" : "border-blue-600"} border-t-transparent rounded-full animate-spin`}></div>
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}

export function FormDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white text-gray-500">Or</span>
      </div>
    </div>
  );
}