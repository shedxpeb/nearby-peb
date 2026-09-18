import os
import pytest
import requests


def _base_url() -> str:
    url = os.environ.get("EXPO_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("API_BASE_URL")
    if not url:
        # Fall back to localhost
        url = "http://localhost:8001"
    return url.rstrip("/")


BASE_URL = _base_url()

# Updated to match seed_demo.py output
CUSTOMER = {"phone": "9825044321", "password": "demo123"}
WORKER = {"phone": "9876543210", "password": "demo123"}


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def _login(client, creds):
    resp = client.post(f"{BASE_URL}/api/auth/login", json=creds)
    if resp.status_code != 200:
        # Try worker-specific endpoint
        resp = client.post(f"{BASE_URL}/api/worker/auth/login", json=creds)
    if resp.status_code != 200:
        # Try customer-specific endpoint
        resp = client.post(f"{BASE_URL}/api/customer/auth/login", json=creds)
    assert resp.status_code == 200, f"Login failed with status {resp.status_code}: {resp.text}"
    return resp.json()["data"]["token"]


@pytest.fixture(scope="session")
def customer_token(api_client):
    return _login(api_client, CUSTOMER)


@pytest.fixture(scope="session")
def worker_token(api_client):
    return _login(api_client, WORKER)


@pytest.fixture(scope="session")
def customer_headers(customer_token):
    return {"Authorization": f"Bearer {customer_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def worker_headers(worker_token):
    return {"Authorization": f"Bearer {worker_token}", "Content-Type": "application/json"}
