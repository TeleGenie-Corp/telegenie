import firebase_admin
from firebase_admin import credentials, firestore, auth
import json
import time

# Initialize with project ID. This will attempt to use default credentials
try:
    firebase_admin.initialize_app(options={'projectId': 'telegenie-studio'})
except Exception as e:
    print(f"❌ Initialization failed: {e}")
    exit(1)

db = firestore.client()

def migrate():
    print("🚀 Starting user migration via Python...")
    
    try:
        with open('users.json', 'r') as f:
            data = json.load(f)
            users = data.get('users', [])
    except Exception as e:
        print(f"❌ Failed to load users.json: {e}")
        return

    print(f"📊 Processing {len(users)} users...")
    
    created = 0
    updated = 0
    skipped = 0

    for user in users:
        uid = user['localId']
        email = user.get('email', 'no-email')
        
        user_ref = db.collection('users').document(uid)
        doc = user_ref.get()
        
        if not doc.exists:
            user_ref.set({
                'userId': uid,
                'savedStrategies': [],
                'generationHistory': [],
                'balance': 1000,
                'createdAt': int(time.time() * 1000),
                'migrated': True
            })
            print(f"✅ Created profile for {email} ({uid})")
            created += 1
        else:
            data = doc.to_dict()
            if 'balance' not in data:
                user_ref.update({'balance': 1000, 'migrated': True})
                print(f"🆙 Updated balance for {email} ({uid})")
                updated += 1
            else:
                print(f"⏩ User {email} already has a profile. Skipping.")
                skipped += 1

    print(f"\n✨ Migration Complete!")
    print(f"🆕 Created: {created}")
    print(f"🆙 Updated: {updated}")
    print(f"⏭️ Skipped: {skipped}")

if __name__ == "__main__":
    migrate()
