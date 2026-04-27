import { db } from '../lib/firebase-admin';

async function fixDanglingNotices() {
  const violationsSnapshot = await db.collection('violations').where('dmca_notice_id', '!=', null).get();
  let fixedCount = 0;
  
  for (const doc of violationsSnapshot.docs) {
    const data = doc.data();
    if (data.dmca_notice_id) {
      const noticeDoc = await db.collection('dmca_notices').doc(data.dmca_notice_id).get();
      if (!noticeDoc.exists) {
        console.log(`Fixing violation ${doc.id}: dangling notice ${data.dmca_notice_id}`);
        await doc.ref.update({
          dmca_status: null,
          dmca_notice_id: null
        });
        fixedCount++;
      }
    }
  }
  console.log(`Done. Fixed ${fixedCount} dangling references.`);
}

fixDanglingNotices().catch(console.error);
