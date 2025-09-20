import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

interface UserProfile {
  name: string;
  email: string;
  organization: string;
}

interface DatabaseSettings {
  defaultTimeout: number;
  maxConnections: number;
  autoCommit: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  queryAlerts: boolean;
  systemMaintenance: boolean;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'database' | 'notifications'>('profile');
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john.doe@company.com',
    organization: 'Acme Corp'
  });
  const [databaseSettings, setDatabaseSettings] = useState<DatabaseSettings>({
    defaultTimeout: 30,
    maxConnections: 10,
    autoCommit: true
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    queryAlerts: false,
    systemMaintenance: true
  });

  const handleProfileSave = () => {
    console.log('Saving profile:', profile);
    // TODO: API call to save profile
  };

  const handleDatabaseSettingsSave = () => {
    console.log('Saving database settings:', databaseSettings);
    // TODO: API call to save settings
  };

  const handleNotificationsSave = () => {
    console.log('Saving notifications:', notifications);
    // TODO: API call to save notifications
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: '👤' },
    { id: 'database' as const, label: 'Database', icon: '🗄️' },
    { id: 'notifications' as const, label: 'Notifications', icon: '🔔' }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <Input
                  id="organization"
                  value={profile.organization}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, organization: e.target.value })}
                  placeholder="Enter your organization"
                />
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={handleProfileSave}>Save Profile</Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Database Configuration</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="timeout" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Query Timeout (seconds)
                </label>
                <Input
                  id="timeout"
                  type="number"
                  value={databaseSettings.defaultTimeout.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDatabaseSettings({ 
                    ...databaseSettings, 
                    defaultTimeout: parseInt(e.target.value) || 30 
                  })}
                />
              </div>
              <div>
                <label htmlFor="connections" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Connections
                </label>
                <Input
                  id="connections"
                  type="number"
                  value={databaseSettings.maxConnections.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDatabaseSettings({ 
                    ...databaseSettings, 
                    maxConnections: parseInt(e.target.value) || 10 
                  })}
                />
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={databaseSettings.autoCommit}
                    onChange={(e) => setDatabaseSettings({ 
                      ...databaseSettings, 
                      autoCommit: e.target.checked 
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Auto-commit</span>
                </label>
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={handleDatabaseSettingsSave}>Save Settings</Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={notifications.emailNotifications}
                  onChange={(e) => setNotifications({ 
                    ...notifications, 
                    emailNotifications: e.target.checked 
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                  <p className="text-sm text-gray-500">Receive general notifications via email</p>
                </div>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={notifications.queryAlerts}
                  onChange={(e) => setNotifications({ 
                    ...notifications, 
                    queryAlerts: e.target.checked 
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Query Alerts</span>
                  <p className="text-sm text-gray-500">Get notified about long-running queries</p>
                </div>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={notifications.systemMaintenance}
                  onChange={(e) => setNotifications({ 
                    ...notifications, 
                    systemMaintenance: e.target.checked 
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">System Maintenance</span>
                  <p className="text-sm text-gray-500">Receive updates about system maintenance</p>
                </div>
              </label>
            </div>
            <div className="mt-6">
              <Button onClick={handleNotificationsSave}>Save Preferences</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
