import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { DisplayContent } from '@rco/shared';

export function useActiveContent() {
  const [content, setContent] = useState<DisplayContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'displayContent'),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setContent(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as DisplayContent))
        );
        setLoading(false);
      },
      (err) => {
        console.error('Display content listener error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { content, loading };
}
