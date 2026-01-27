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
    
    # We use a POST to create or PATCH to update.
    # Actually for creation in subcollection-like paths, PATCH with name works.
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
    
    # Direct PATCH to the document path
    # Using REST API v1
    res = requests.patch(f"{url_base}/{uid}", json=payload)
    if res.status_code == 200:
        print(f"✅ Success: {email}")
    else:
        print(f"❌ Failed {email}: {res.status_code} - {res.text}")

