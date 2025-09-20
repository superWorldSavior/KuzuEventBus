import { User } from "@phosphor-icons/react";
import { getDefaultDemoUser } from "@/shared/lib/demo-users";

export function DemoUserInfo() {
  const demoUser = getDefaultDemoUser();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium text-blue-900">Demo Account</h4>
          <p className="text-xs text-blue-700 mt-1">
            Use the demo account to explore the platform:
          </p>
          <div className="text-xs text-blue-600 mt-1 font-mono">
            Email: {demoUser.email}
            <br />
            Password: {demoUser.password}
          </div>
        </div>
      </div>
    </div>
  );
}