import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

// Syncs campaign entries to the flat /displayContent collection
export const onCampaignEntryWrite = onDocumentWritten(
  'campaigns/{campaignId}/entries/{entryId}',
  async (event) => {
    const campaignId = event.params.campaignId;
    const entryId = event.params.entryId;
    const displayDocId = `${campaignId}_${entryId}`;
    const displayRef = db.collection('displayContent').doc(displayDocId);

    // Delete case
    if (!event.data?.after.exists) {
      await displayRef.delete();
      console.log(`Deleted displayContent: ${displayDocId}`);
      return;
    }

    const entry = event.data.after.data()!;

    // Check if parent campaign is active
    const campaignSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campaignSnap.exists) {
      await displayRef.delete();
      return;
    }

    const campaign = campaignSnap.data()!;
    const isActive = campaign.isActive && entry.isVisible !== false;

    await displayRef.set({
      type: campaign.type || 'rockstar',
      campaignId,
      entryId,
      employeeName: entry.employeeName || '',
      employeeTitle: entry.employeeTitle || '',
      employeeTenure: entry.employeeTenure || '',
      employeeInitials: entry.employeeInitials || '',
      photoUrl: entry.photoUrl || null,
      quote: entry.quote || '',
      badgeText: entry.badgeText || '',
      displayOrder: entry.displayOrder || 0,
      isActive,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Synced displayContent: ${displayDocId} (active: ${isActive})`);
  }
);
