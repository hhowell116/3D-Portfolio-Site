import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

// When a campaign's isActive changes, bulk-update all related displayContent docs
export const onCampaignUpdate = onDocumentUpdated(
  'campaigns/{campaignId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;
    if (before.isActive === after.isActive) return;

    const campaignId = event.params.campaignId;
    const entriesSnap = await db
      .collection('campaigns')
      .doc(campaignId)
      .collection('entries')
      .get();

    const batch = db.batch();
    for (const entryDoc of entriesSnap.docs) {
      const displayDocId = `${campaignId}_${entryDoc.id}`;
      const displayRef = db.collection('displayContent').doc(displayDocId);
      const entry = entryDoc.data();

      batch.set(
        displayRef,
        {
          isActive: after.isActive && entry.isVisible !== false,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(
      `Bulk-updated ${entriesSnap.size} displayContent docs for campaign ${campaignId} (active: ${after.isActive})`
    );
  }
);
