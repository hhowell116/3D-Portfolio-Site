import { useState } from 'react';
import { Monitor, ExternalLink, Maximize, Trophy, Layers, X } from 'lucide-react';

const DISPLAY_BASE = 'https://rco-hr-display.web.app';

const DISPLAYS = [
  {
    id: 'celebrations',
    label: 'Birthdays & Anniversaries',
    description: "Auto-generated from employee data — only shows birthdays and anniversaries on the employee's actual day",
    path: '/',
    icon: Layers,
    color: 'bg-brand-warm-brown',
  },
  {
    id: 'rockstars',
    label: 'Rockstars Only',
    description: 'Monthly rockstar recognition slides from active campaigns',
    path: '/rockstars',
    icon: Trophy,
    color: 'bg-brand-gold',
  },
];

export function ViewDisplays() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState('');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Displays</h2>
        <p className="text-sm text-brand-taupe mt-0.5">
          Preview and launch facility display screens. Point Airtame to any of these URLs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {DISPLAYS.map((display) => (
          <div
            key={display.id}
            className="bg-white rounded-xl border border-brand-border p-5 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`${display.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                <display.icon size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-brand-deep-brown">{display.label}</h3>
            </div>

            <p className="text-sm text-brand-taupe mb-4 flex-1">{display.description}</p>

            <div className="text-xs text-brand-light-gray bg-brand-off-white rounded-lg px-3 py-2 mb-4 font-mono break-all select-all">
              {DISPLAY_BASE}{display.path}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPreviewUrl(`${DISPLAY_BASE}${display.path}?v=${Date.now()}`);
                  setPreviewLabel(display.label);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-brand-border text-sm text-brand-text-brown hover:bg-brand-off-white transition-colors"
              >
                <Monitor size={15} />
                Preview
              </button>
              <a
                href={`${DISPLAY_BASE}${display.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors"
              >
                <ExternalLink size={15} />
                Open
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Inline preview */}
      {previewUrl && (
        <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-off-white">
            <div className="flex items-center gap-2">
              <Monitor size={16} className="text-brand-taupe" />
              <span className="text-sm font-medium text-brand-deep-brown">
                Preview: {previewLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
                title="Open fullscreen in new tab"
              >
                <Maximize size={15} />
              </a>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={previewUrl}
              className="absolute inset-0 w-full h-full"
              title={`Display Preview: ${previewLabel}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
