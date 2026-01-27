import admin from 'firebase-admin';

// Initialize with default credentials
admin.initializeApp({
  projectId: 'telegenie-studio'
});

const auth = admin.auth();
const db = admin.firestore();

async function migrateUsers() {
  console.log('🚀 Starting user migration and credit seeding (ESM)...');
  
  try {
    const listUsersResult = await auth.listUsers();
    console.log(`📊 Found ${listUsersResult.users.length} users in Firebase Auth.`);
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const userRecord of listUsersResult.users) {
      const userRef = db.collection('users').doc(userRecord.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        // Create profile with $1000
        await userRef.set({
          userId: userRecord.uid,
          savedStrategies: [],
          generationHistory: [],
          balance: 1000,
          createdAt: Date.now(),
          migrated: true
        });
        console.log(`✅ Created profile for user ${userRecord.uid} (${userRecord.email || 'no-email'}) with $1000`);
        createdCount++;
      } else {
        const data = doc.data();
        if (data.balance === undefined) {
          await userRef.update({ balance: 1000, migrated: true });
          console.log(`🆙 Updated balance for user ${userRecord.uid} to $1000`);
          createdCount++;
        } else {
          console.log(`⏩ User ${userRecord.uid} already has a profile. Skipping.`);
          skippedCount++;
        }
      }
    }

    console.log('\n✨ Migration Complete!');
    console.log(`🆕 Created/Updated: ${createdCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateUsers().then(() => process.exit(0));
