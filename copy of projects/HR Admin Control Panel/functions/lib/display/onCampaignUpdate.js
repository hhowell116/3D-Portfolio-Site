"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCampaignUpdate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
// When a campaign's isActive changes, bulk-update all related displayContent docs
exports.onCampaignUpdate = (0, firestore_1.onDocumentUpdated)('campaigns/{campaignId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (before.isActive === after.isActive)
        return;
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
        batch.set(displayRef, {
            isActive: after.isActive && entry.isVisible !== false,
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    await batch.commit();
    console.log(`Bulk-updated ${entriesSnap.size} displayContent docs for campaign ${campaignId} (active: ${after.isActive})`);
});
//# sourceMappingURL=onCampaignUpdate.js.map