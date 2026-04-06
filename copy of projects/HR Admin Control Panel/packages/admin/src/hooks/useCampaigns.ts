import { useEffect, useState, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, getDocs, setDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import type { Campaign, CampaignEntry } from '@rco/shared';
import { MONTHS } from '@rco/shared';

// ─── Client-side displayContent sync (replaces Cloud Functions) ────────

function campaignSortOrder(campaign?: Pick<Campaign, 'month' | 'year'> | null): number {
  if (!campaign) return 0;
  const monthIdx = MONTHS.indexOf(campaign.month as any);
  return (campaign.year || 0) * 100 + (monthIdx >= 0 ? monthIdx + 1 : 0);
}

async function syncEntryToDisplay(
  campaignId: string,
  entryId: string,
  entry: Partial<CampaignEntry>,
  campaignType: string,
  campaignIsActive: boolean,
  campaign?: Pick<Campaign, 'month' | 'year'> | null
) {
  const displayDocId = `${campaignId}_${entryId}`;
  await setDoc(doc(db, 'displayContent', displayDocId), {
    type: campaignType || 'rockstar',
    campaignId,
    entryId,
    employeeName: entry.employeeName || '',
    employeeTitle: entry.employeeTitle || '',
    employeeTenure: entry.employeeTenure || '',
    employeeInitials: entry.employeeInitials || '',
    photoUrl: entry.photoUrl || null,
    quote: entry.quote || '',
    badgeText: entry.badgeText || '',
    displayOrder: campaignSortOrder(campaign),
    isActive: campaignIsActive && entry.isVisible !== false,
    updatedAt: serverTimestamp(),
  });
}

async function deleteDisplayEntry(campaignId: string, entryId: string) {
  const displayDocId = `${campaignId}_${entryId}`;
  await deleteDoc(doc(db, 'displayContent', displayDocId));
}

async function bulkUpdateDisplayActive(campaignId: string, isActive: boolean) {
  const entriesSnap = await getDocs(collection(db, 'campaigns', campaignId, 'entries'));
  for (const entryDoc of entriesSnap.docs) {
    const entry = entryDoc.data();
    const displayDocId = `${campaignId}_${entryDoc.id}`;
    await updateDoc(doc(db, 'displayContent', displayDocId), {
      isActive: isActive && entry.isVisible !== false,
      updatedAt: serverTimestamp(),
    }).catch(() => {}); // ignore if display doc doesn't exist yet
  }
}

// ─── Campaigns Hook ────────────────────────────────────────────────────
export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('displayOrder', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addCampaign = useCallback(
    async (data: Partial<Campaign>) => {
      const docRef = await addDoc(collection(db, 'campaigns'), {
        ...data,
        isActive: false,
        displayOrder: campaigns.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      });
      return docRef.id;
    },
    [user, campaigns.length]
  );

  const updateCampaign = useCallback(
    async (id: string, data: Partial<Campaign>) => {
      await updateDoc(doc(db, 'campaigns', id), {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      });
    },
    [user]
  );

  const deleteCampaign = useCallback(async (id: string) => {
    // Delete all entries + their display content
    const entriesSnap = await getDocs(collection(db, 'campaigns', id, 'entries'));
    for (const entry of entriesSnap.docs) {
      await deleteDisplayEntry(id, entry.id);
      await deleteDoc(entry.ref);
    }
    await deleteDoc(doc(db, 'campaigns', id));
  }, []);

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      await updateDoc(doc(db, 'campaigns', id), {
        isActive,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      });
      // Sync all entries' display state
      await bulkUpdateDisplayActive(id, isActive);
    },
    [user]
  );

  return { campaigns, loading, addCampaign, updateCampaign, deleteCampaign, toggleActive };
}

// ─── Campaign Entries Hook ─────────────────────────────────────────────
export function useCampaignEntries(campaignId: string | null, campaign?: Campaign | null) {
  const [entries, setEntries] = useState<CampaignEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignId) { setEntries([]); return; }
    setLoading(true);
    const q = query(
      collection(db, 'campaigns', campaignId, 'entries'),
      orderBy('displayOrder', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CampaignEntry)));
      setLoading(false);
    });
    return () => unsub();
  }, [campaignId]);

  const addEntry = useCallback(
    async (data: Partial<CampaignEntry>) => {
      if (!campaignId) return;
      const entryData = {
        ...data,
        isVisible: true,
        displayOrder: entries.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'campaigns', campaignId, 'entries'), entryData);

      // Sync to displayContent
      await syncEntryToDisplay(
        campaignId,
        docRef.id,
        { ...data, isVisible: true, displayOrder: entries.length },
        campaign?.type || 'rockstar',
        campaign?.isActive || false,
        campaign
      );
    },
    [campaignId, entries.length, campaign]
  );

  const updateEntry = useCallback(
    async (entryId: string, data: Partial<CampaignEntry>) => {
      if (!campaignId) return;
      await updateDoc(doc(db, 'campaigns', campaignId, 'entries', entryId), {
        ...data,
        updatedAt: serverTimestamp(),
      });

      // Re-sync to displayContent with merged data
      const existing = entries.find((e) => e.id === entryId);
      const merged = { ...existing, ...data };
      await syncEntryToDisplay(
        campaignId,
        entryId,
        merged,
        campaign?.type || 'rockstar',
        campaign?.isActive || false,
        campaign
      );
    },
    [campaignId, entries, campaign]
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!campaignId) return;
      await deleteDoc(doc(db, 'campaigns', campaignId, 'entries', entryId));
      await deleteDisplayEntry(campaignId, entryId);
    },
    [campaignId]
  );

  return { entries, loading, addEntry, updateEntry, deleteEntry };
}
