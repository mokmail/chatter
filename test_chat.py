#!/usr/bin/env python3
"""Quick test script to verify basic chat functionality."""
import asyncio
import httpx
import json

async def test_chat():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # First check if backend is up
        try:
            r = await client.get("http://localhost:8000/api/models")
            print(f"Models endpoint: {r.status_code}")
            data = r.json()
            print(f"Active model: {data.get('active_model')}")
            print(f"Active provider: {data.get('active_provider_id')}")
        except Exception as e:
            print(f"Backend error: {e}")
            return

        # Try sending a chat message
        print("\n--- Testing /api/chat ---")
        try:
            response = await client.post(
                "http://localhost:8000/api/chat",
                json={"message": "Hello, say a brief greeting", "knowledge_base_ids": [], "notes": []},
                timeout=60.0
            )
            print(f"Chat status: {response.status_code}")
            if response.status_code != 200:
                print(f"Error: {response.text[:500]}")
            else:
                print(f"Response: {response.text[:500]}")
        except Exception as e:
            print(f"Chat error: {e}")


if __name__ == "__main__":
    asyncio.run(test_chat())
