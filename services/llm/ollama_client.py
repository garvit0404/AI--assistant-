import httpx
import json
import logging
import asyncio

logger = logging.getLogger(__name__)

class OllamaClient:
    def __init__(self, base_url="http://host.docker.internal:11434", default_model="phi3:mini"):
        self.base_url = base_url
        self.default_model = default_model
        self.timeout = httpx.Timeout(60.0, connect=5.0)

    async def generate(self, prompt, context=None, options=None):
        """
        Generate a response using Ollama.
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.default_model,
            "prompt": prompt,
            "stream": False,
            "options": options or {}
        }
        if context:
            payload["context"] = context

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                return {
                    "text": data.get("response", ""),
                    "model": self.default_model,
                    "usage": {
                        "prompt_tokens": data.get("prompt_eval_count", 0),
                        "completion_tokens": data.get("eval_count", 0),
                        "total_tokens": data.get("prompt_eval_count", 0) + data.get("eval_count", 0)
                    },
                    "source": "ollama"
                }
        except Exception as e:
            logger.error(f"Ollama generation failed: {str(e)}")
            raise Exception(f"Ollama error: {str(e)}")

    async def health_check(self):
        """
        Check if Ollama server is reachable.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except:
            return False
