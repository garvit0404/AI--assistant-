import os
import httpx
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class OpenAIClient:
    def __init__(self, api_key=None, default_model="gpt-4.1"):
        """
        OpenAI API client wrapper.
        Note: The user specified 'gpt-4.1'. Assuming they'll provide 
        the actual model name in their env.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.default_model = default_model
        self.base_url = "https://api.openai.com/v1"
        self.timeout = httpx.Timeout(120.0, connect=5.0)

    async def generate(self, messages: List[Dict[str, str]], options: Dict[str, Any] = None):
        """
        Generate a response via OpenAI.
        Supports system prompt, temperature, max tokens.
        """
        url = f"{self.base_url}/chat/completions"
        options = options or {}
        payload = {
            "model": options.get("model", self.default_model),
            "messages": messages,
            "temperature": options.get("temperature", 0.7),
            "max_tokens": options.get("max_tokens", 2048),
            "response_format": {"type": "json_object"} if options.get("json_mode") else {"type": "text"}
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})
                
                # Tracking tokens for cost calculation
                # (Costs: typically $0.03 / 1k input, $0.06 / 1k output for GPT-4)
                # But actual GPT-4.1 exact costs might slightly differ.
                cost = self._calculate_cost(usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))

                return {
                    "text": content,
                    "model": data["model"],
                    "usage": {
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "total_tokens": usage.get("total_tokens", 0)
                    },
                    "cost": cost,
                    "source": "openai"
                }

        except Exception as e:
            logger.error(f"OpenAI generation failed: {str(e)}")
            raise Exception(f"OpenAI error: {str(e)}")

    def _calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """
        Calculates the estimated cost (assuming GPT-4 pricing).
        """
        # Costs per 1M tokens
        PROMPT_COST_PER_MILLION = 30.0
        COMPLETION_COST_PER_MILLION = 60.0
        
        cost = (prompt_tokens / 1_000_000 * PROMPT_COST_PER_MILLION) + \
               (completion_tokens / 1_000_000 * COMPLETION_COST_PER_MILLION)
        return cost
