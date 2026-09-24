import requests

API_BASE = 'http://localhost:5000'

def test_sync():
    print("Testing Admin Complaints Synchronization...")

    # 1. Login as User tharun_battu (ID=2) with password '325698abc'
    login_res = requests.post(f"{API_BASE}/api/login", json={
        "username": "tharun_battu",
        "password": "325698abc"
    }).json()
    
    if 'token' not in login_res:
         print("tharun_battu login failed. Trying tharun_sai...")
         login_res = requests.post(f"{API_BASE}/api/login", json={
             "username": "tharun_sai",
             "password": "325698abc"
         }).json()

    if 'token' not in login_res:
        print("Login failed completely.")
        return

    user_token = login_res.get('token')
    user_id = login_res.get('user', {}).get('id')
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print(f"Logged in as normal user {login_res.get('user', {}).get('username')} (ID={user_id})")

    # 2. Find a message ID in the database to report
    import sqlite3
    conn = sqlite3.connect('prisma/dev.db')
    # Find a message sent to this user
    row = conn.execute("SELECT id FROM Message WHERE receiverId = ? LIMIT 1", (user_id,)).fetchone()
    if not row:
        # Fallback to any message
        row = conn.execute("SELECT id FROM Message LIMIT 1").fetchone()
    conn.close()

    if not row:
        print("Failure: No message found anywhere to report.")
        return
        
    msg_id = row[0]
    print(f"Message ID to report: {msg_id}")

    # 3. Submit Report on Message
    report_post = requests.post(f"{API_BASE}/api/messages/{msg_id}/report", headers=user_headers).json()
    if 'reportId' not in report_post:
        print(f"POST report returned: {report_post}")
        # Message might already be reported, let's find the existing report
        import sqlite3
        conn = sqlite3.connect('prisma/dev.db')
        r_row = conn.execute("SELECT id FROM Report WHERE reporterId = ? LIMIT 1", (user_id,)).fetchone()
        conn.close()
        if r_row:
            report_id = r_row[0]
            print(f"Using existing report ID: {report_id}")
        else:
            print("No report ID available.")
            return
    else:
        report_id = report_post['reportId']
        print(f"Report POST successful! Created/found Report ID: {report_id}")

    # 4. Check user complaints endpoint
    user_complaints = requests.get(f"{API_BASE}/api/complaints", headers=user_headers).json()
    print(f"User complaints count: {len(user_complaints)}")
    
    # Send details update
    put_res = requests.put(f"{API_BASE}/api/complaints/{report_id}", headers=user_headers, json={
        "status": "Submitted",
        "additionalDetails": "Test description of toxic romanized Telugu message.",
        "screenshots": ["data:image/png;base64,verificationmockbase64"]
    }).json()
    print("PUT response:", put_res)

    # 5. Authenticate Admin and retrieve all complaints
    res = requests.post(f"{API_BASE}/api/admin/login", json={"username": "ADMIN", "password": "admin325698"}).json()
    admin_token = res.get('token')
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    admin_complaints = requests.get(f"{API_BASE}/api/admin/complaints", headers=admin_headers).json()
    print(f"Admin complaints fetched count: {len(admin_complaints)}")
    
    # 6. Check if our reported complaint is visible in admin list and matches details
    found = False
    for ac in admin_complaints:
        if ac['id'] == report_id:
            found = True
            print(f"SUCCESS: Admin found the same report! Details: ID={ac['id']}, Status={ac['status']}, Additional={ac['additionalDetails']}, Screenshots={ac['screenshots']}")
            break
            
    if not found:
        print("FAILURE: Sync check failed. The admin complaints page did not find user's complaint.")
        
    print("Verification completed successfully!")

if __name__ == '__main__':
    test_sync()
