"""Quick state probe before UI tests: worker login, pending requests, worker status."""
import requests
import os

BASE = os.environ.get("API_BASE_URL", "http://localhost:8001")

def login(phone):
    r = requests.post(f"{BASE}/api/auth/login", json={"phone": phone, "password": "demo123"}, timeout=30)
    print("login", phone, r.status_code)
    data = r.json().get("data", r.json())
    return data.get("token") or data.get("access_token")

wt = login("9876543210")
ct = login("9825044321")
wh = {"Authorization": f"Bearer {wt}"}
ch = {"Authorization": f"Bearer {ct}"}

r = requests.get(f"{BASE}/api/jobs/requests", headers=wh, timeout=30)
print("worker requests:", r.status_code)
jobs = r.json()
for j in jobs:
    print(" -", j.get("id"), j.get("job_number"), j.get("service_type"), "|", j.get("title"), "|", j.get("status"), "|", j.get("customer_name") or j.get("company_name"))

r = requests.get(f"{BASE}/api/worker/status", headers=wh, timeout=30)
print("worker status:", r.status_code, r.text[:200])

r = requests.get(f"{BASE}/api/customer/jobs?limit=20", headers=ch, timeout=30)
print("customer jobs:", r.status_code)
try:
    data = r.json()
    items = data.get("items", data if isinstance(data, list) else [])
    for j in items:
        print(" -", j.get("id"), j.get("job_number"), j.get("service_type"), "|", j.get("title"), "|", j.get("status"))
except Exception as e:
    print(r.text[:300])
