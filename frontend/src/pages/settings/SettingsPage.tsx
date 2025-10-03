import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { apiService } from '@/shared/api/client';

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Compute API URL from env or current origin (proxy)
    const base = (import.meta as any).env?.VITE_API_URL || window.location.origin || "";
    setApiUrl(base);

    const init = async () => {
      try {
        setLoading(true);
        const me = await apiService.getMe();
        setApiKey(me.api_key);
        setError("");
      } catch (e: any) {
        setError("Impossible de récupérer votre clé API (êtes-vous connecté ?)");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">API URL</label>
        <div className="flex gap-2">
          <Input readOnly value={apiUrl} />
          <Button onClick={() => copy(apiUrl)}>Copy</Button>
        </div>
        <p className="text-xs text-gray-500">Modifiez VITE_API_URL pour changer l’URL si nécessaire.</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">API Key</label>
        {loading ? (
          <div className="text-sm text-gray-500">Chargement…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div className="flex gap-2 items-center">
            <Input readOnly type={showKey ? 'text' : 'password'} value={apiKey} />
            <Button variant="secondary" onClick={() => setShowKey((v) => !v)}>
              {showKey ? 'Masquer' : 'Afficher'}
            </Button>
            <Button onClick={() => copy(apiKey)}>Copier</Button>
          </div>
        )}
        <p className="text-xs text-gray-500">Utilisez-la dans l’en-tête Authorization: Bearer.</p>
      </div>
    </div>
  );
}
