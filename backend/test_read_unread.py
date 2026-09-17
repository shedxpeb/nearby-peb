import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000"

async def test_read_unread():
    async with httpx.AsyncClient() as client:
        # Customer login
        print("=== Customer Login ===")
        login_response = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "9825044321", "password": "customer123"}
        )
        token_data = login_response.json()
        access_token = token_data.get("data", {}).get("token")
        headers = {"Authorization": f"Bearer {access_token}"}

        job_id = "31d2b07c-8c9c-4cd5-930d-77746ed07008"

        # Get messages before worker marks as read
        print("\n=== Customer GET messages (before Worker read) ===")
        msgs_response = await client.get(
            f"{BASE_URL}/api/jobs/{job_id}/messages",
            headers=headers
        )
        msgs_data = msgs_response.json()
        for msg in msgs_data.get('data', {}).get('messages', []):
            print(f'{msg.get("sender_role")}: read_at={msg.get("read_at")}')

        # Worker login
        print("\n=== Worker Login ===")
        worker_login = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "9876543210", "password": "worker123"}
        )
        worker_token = worker_login.json().get("data", {}).get("token")
        worker_headers = {"Authorization": f"Bearer {worker_token}"}

        # Worker fetches messages (should mark Customer messages as read)
        print("\n=== Worker GET messages (marks Customer messages as read) ===")
        worker_msgs = await client.get(
            f"{BASE_URL}/api/jobs/{job_id}/messages",
            headers=worker_headers
        )
        worker_msgs_data = worker_msgs.json()
        for msg in worker_msgs_data.get('data', {}).get('messages', []):
            print(f'{msg.get("sender_role")}: read_at={msg.get("read_at")}')

        # Customer fetches again to see read status
        print("\n=== Customer GET messages (after Worker read) ===")
        customer_msgs = await client.get(
            f"{BASE_URL}/api/jobs/{job_id}/messages",
            headers=headers
        )
        customer_msgs_data = customer_msgs.json()
        for msg in customer_msgs_data.get('data', {}).get('messages', []):
            print(f'{msg.get("sender_role")}: read_at={msg.get("read_at")}')

        print("\n=== Test Complete ===")

if __name__ == '__main__':
    asyncio.run(test_read_unread())
