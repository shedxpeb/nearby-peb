import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000"

async def test_customer_chat():
    async with httpx.AsyncClient() as client:
        # Step 1: Customer login
        print("=== Step 1: Customer Login ===")
        login_response = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "9825044321", "password": "customer123"}
        )
        print(f"Login status: {login_response.status_code}")
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return

        token_data = login_response.json()
        access_token = token_data.get("data", {}).get("token")
        print(f"Access token: {access_token[:50]}..." if access_token else "No token")

        headers = {"Authorization": f"Bearer {access_token}"}

        # Step 2: Get conversation for assigned job
        job_id = "31d2b07c-8c9c-4cd5-930d-77746ed07008"  # SDX-J-1007
        print(f"\n=== Step 2: GET conversation for job {job_id} ===")
        conv_response = await client.get(
            f"{BASE_URL}/api/jobs/{job_id}/conversation",
            headers=headers
        )
        print(f"Conversation status: {conv_response.status_code}")
        if conv_response.status_code == 200:
            conv_data = conv_response.json()
            print(f"Full response: {conv_data}")
            print(f"Conversation ID: {conv_data.get('data', {}).get('id')}")
            print(f"Worker: {conv_data.get('data', {}).get('worker', {}).get('full_name')}")
        else:
            print(f"Conversation failed: {conv_response.text}")

        # Step 3: Get messages
        print(f"\n=== Step 3: GET messages ===")
        msgs_response = await client.get(
            f"{BASE_URL}/api/jobs/{job_id}/messages",
            headers=headers
        )
        print(f"Messages status: {msgs_response.status_code}")
        if msgs_response.status_code == 200:
            msgs_data = msgs_response.json()
            print(f"Full response: {msgs_data}")
            print(f"Messages count: {len(msgs_data.get('data', {}).get('messages', []))}")
            for msg in msgs_data.get('data', {}).get('messages', []):
                print(f"  - {msg.get('sender_role')}: {msg.get('message_text')[:50]}")
                print(f"    Read at: {msg.get('read_at')}")
        else:
            print(f"Messages failed: {msgs_response.text}")

        # Step 4: Send a message
        print(f"\n=== Step 4: POST message ===")
        send_response = await client.post(
            f"{BASE_URL}/api/jobs/{job_id}/messages",
            headers=headers,
            json={"message_text": "Hello from Customer API test"}
        )
        print(f"Send status: {send_response.status_code}")
        if send_response.status_code == 200:
            send_data = send_response.json()
            print(f"Full response: {send_data}")
            print(f"Message ID: {send_data.get('data', {}).get('id')}")
            print(f"Message: {send_data.get('data', {}).get('message_text')}")
        else:
            print(f"Send failed: {send_response.text}")

        print("\n=== Test Complete ===")

if __name__ == '__main__':
    asyncio.run(test_customer_chat())
