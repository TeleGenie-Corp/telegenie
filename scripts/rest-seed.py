import requests
import json
import time

project_id = 'telegenie-studio'
url_base = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users"

with open('users.json', 'r') as f:
    data = json.load(f)
    users = data.get('users', [])

for user in users:
    uid = user['localId']
    email = user.get('email', 'no-email')
    
    payload = {
        "fields": {
            "userId": {"stringValue": uid},
            "savedStrategies": {"arrayValue": {"values": []}},
            "generationHistory": {"arrayValue": {"values": []}},
            "balance": {"doubleValue": 1000.0},
            "createdAt": {"integerValue": str(int(time.time() * 1000))},
            "migrated": {"booleanValue": True}
        }
    }
    
    res = requests.patch(f"{url_base}/{uid}", params={"updateMask.fieldPaths": ["userId", "balance", "migrated", "createdAt", "savedStrategies", "generationHistory"]}, json=payload)
    if res.status_code == 200:
        print(f"✅ Seeded {email}")
    else:
        print(f"❌ Failed {email}: {res.text}")

