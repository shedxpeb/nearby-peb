import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000"

async def test_completed_job_chat():
    async with httpx.AsyncClient() as client:
        # Worker login
        print("=== Worker Login ===")
        login_response = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "9876543210", "password": "worker123"}
        )
        token_data = login_response.json()
        access_token = token_data.get("data", {}).get("token")
        headers = {"Authorization": f"Bearer {access_token}"}

        # Try to access chat for a completed job
        completed_job_id = "bc8694c6-d96d-440c-9861-cbd117799b85"  # SDX-J-1006 (COMPLETED)
        print(f"\n=== Test COMPLETED job chat {completed_job_id} ===")

        conv_response = await client.get(
            f"{BASE_URL}/api/jobs/{completed_job_id}/conversation",
            headers=headers
        )
        print(f"Conversation status: {conv_response.status_code}")
        if conv_response.status_code == 200:
            conv_data = conv_response.json()
            print(f"Conversation accessible: YES")
            print(f"Conversation ID: {conv_data.get('data', {}).get('id')}")
        else:
            print(f"Conversation accessible: NO")
            print(f"Response: {conv_response.text}")

        # Try to send message to completed job
        send_response = await client.post(
            f"{BASE_URL}/api/jobs/{completed_job_id}/messages",
            headers=headers,
            json={"message_text": "Test message to completed job"}
        )
        print(f"\nSend message status: {send_response.status_code}")
        if send_response.status_code == 200:
            print(f"Can send to completed job: YES")
        else:
            print(f"Can send to completed job: NO")
            print(f"Response: {send_response.text}")

        print("\n=== Test Complete ===")

if __name__ == '__main__':
    asyncio.run(test_completed_job_chat())
