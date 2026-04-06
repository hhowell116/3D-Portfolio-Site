import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { DISPLAY_DEFAULTS } from '@rco/shared';
import type { DisplayConfig } from '@rco/shared';
import { Monitor, Save } from 'lucide-react';

export function DisplaySettings() {
  const { user } = useAuth();
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'displayConfig', 'default'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as DisplayConfig);
      } else {
        setConfig({
          ...DISPLAY_DEFAULTS,
          updatedAt: null as any,
          updatedBy: '',
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateField = (key: keyof DisplayConfig, value: any) => {
    setConfig((c) => c ? { ...c, [key]: value } : c);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    await setDoc(doc(db, 'displayConfig', 'default'), {
      ...config,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
    });
    setSaving(false);
    setDirty(false);
  };

  if (loading || !config) {
    return <div className="text-sm text-brand-taupe">Loading...</div>;
  }

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-brand-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Display Settings</h2>
          <p className="text-sm text-brand-taupe mt-0.5">Configure the facility display rotation</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-brand-border divide-y divide-brand-border">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="font-medium text-brand-deep-brown">Display Live</p>
            <p className="text-xs text-brand-taupe">Master on/off for all facility screens</p>
          </div>
          <button
            onClick={() => updateField('isLive', !config.isLive)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              config.isLive ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                config.isLive ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Rotation speed */}
        <div className="p-5">
          <p className="font-medium text-brand-deep-brown mb-1">Rotation Speed</p>
          <p className="text-xs text-brand-taupe mb-3">How long each card stays on screen</p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={3000}
              max={30000}
              step={1000}
              value={config.rotationSpeed}
              onChange={(e) => updateField('rotationSpeed', parseInt(e.target.value))}
              className="flex-1 accent-brand-warm-brown"
            />
            <span className="text-sm font-medium text-brand-deep-brown min-w-[60px] text-right">
              {config.rotationSpeed / 1000}s
            </span>
          </div>
        </div>

        {/* Transition duration */}
        <div className="p-5">
          <p className="font-medium text-brand-deep-brown mb-1">Transition Duration</p>
          <p className="text-xs text-brand-taupe mb-3">Fade transition between cards</p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={200}
              max={3000}
              step={100}
              value={config.transitionDuration}
              onChange={(e) => updateField('transitionDuration', parseInt(e.target.value))}
              className="flex-1 accent-brand-warm-brown"
            />
            <span className="text-sm font-medium text-brand-deep-brown min-w-[60px] text-right">
              {(config.transitionDuration / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Show progress bar */}
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="font-medium text-brand-deep-brown">Progress Bar</p>
            <p className="text-xs text-brand-taupe">Show timer bar at bottom of display</p>
          </div>
          <button
            onClick={() => updateField('showProgressBar', !config.showProgressBar)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              config.showProgressBar ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                config.showProgressBar ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Show dot nav */}
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="font-medium text-brand-deep-brown">Dot Navigation</p>
            <p className="text-xs text-brand-taupe">Show slide indicator dots</p>
          </div>
          <button
            onClick={() => updateField('showDotNav', !config.showDotNav)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              config.showDotNav ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                config.showDotNav ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
