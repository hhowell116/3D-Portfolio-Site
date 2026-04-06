import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DISPLAY_DEFAULTS } from '@rco/shared';
import type { DisplayConfig } from '@rco/shared';

export function useDisplayConfig() {
  const [config, setConfig] = useState<DisplayConfig>({
    ...DISPLAY_DEFAULTS,
    updatedAt: null as any,
    updatedBy: '',
  });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'displayConfig', 'default'),
      (snap) => {
        if (snap.exists()) {
          setConfig(snap.data() as DisplayConfig);
        }
      },
      (err) => console.error('Display config listener error:', err)
    );
    return () => unsub();
  }, []);

  return config;
}
