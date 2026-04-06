import { useEffect, useState, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { compressPhoto } from '../utils/photos';
import { syncEmployeeCampaigns } from '../utils/autoCampaign';
import type { Employee } from '@rco/shared';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('lastName', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEmployees(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee))
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addEmployee = useCallback(
    async (data: Partial<Employee>, photo?: File) => {
      let photoUrl: string | null = null;
      if (photo) {
        photoUrl = await compressPhoto(photo);
      }

      const docRef = await addDoc(collection(db, 'employees'), {
        ...data,
        photoUrl,
        photoStatus: 'none',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      });

      // Auto-create birthday/anniversary campaigns
      await syncEmployeeCampaigns(
        { id: docRef.id, ...data, photoUrl } as any,
        user?.uid || ''
      );

      return docRef.id;
    },
    [user]
  );

  const updateEmployee = useCallback(
    async (id: string, data: Partial<Employee>, photo?: File) => {
      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      };

      if (photo) {
        updateData.photoUrl = await compressPhoto(photo);
      }

      await updateDoc(doc(db, 'employees', id), updateData);

      // Re-read the full employee doc to get merged data for campaign sync
      const snap = await getDoc(doc(db, 'employees', id));
      if (snap.exists()) {
        await syncEmployeeCampaigns(
          { id, ...snap.data() } as any,
          user?.uid || ''
        );
      }
    },
    [user]
  );

  const deleteEmployee = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
  }, []);

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      await updateDoc(doc(db, 'employees', id), {
        isActive,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      });
    },
    [user]
  );

  return { employees, loading, addEmployee, updateEmployee, deleteEmployee, toggleActive };
}
