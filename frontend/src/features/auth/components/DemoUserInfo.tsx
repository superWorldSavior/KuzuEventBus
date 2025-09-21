import { User, Key, Copy } from "@phosphor-icons/react";
import { getDefaultDemoUser } from "@/shared/lib/demo-users";

interface DemoUserInfoProps {
  onFillCredentials?: () => void;
  loginMode?: "credentials" | "apikey";
}

export function DemoUserInfo({ onFillCredentials, loginMode }: DemoUserInfoProps) {
  const demoUser = getDefaultDemoUser();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-blue-900">Demo Account Available</h4>
          <p className="text-xs text-blue-700 mt-1">
            Use the "Try Demo Account" button for instant access, or manually enter:
          </p>
          <div className="text-xs text-blue-600 mt-2 space-y-1">
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>Email: {demoUser.email}</span>
            </div>
            {loginMode === "credentials" && (
              <div className="flex items-center space-x-1">
                <Key className="w-3 h-3" />
                <span>Password: {demoUser.password}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Key className="w-3 h-3" />
              <span className="font-mono">API Key: {demoUser.apiKey.substring(0, 15)}...</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-blue-500 font-medium">
              No registration required • Full feature access
            </div>
            {onFillCredentials && (
              <button
                type="button"
                onClick={onFillCredentials}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>Fill Form</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}