import logging
from typing import Dict, Any, List
# We'll use our other clients to route
from .ollama_client import OllamaClient
from .openai_client import OpenAIClient
from .model_controller import ModelController

logger = logging.getLogger(__name__)

class AI_Router:
    def __init__(self, ollama: OllamaClient, openai: OpenAIClient, controller: ModelController):
        self.ollama = ollama
        self.openai = openai
        self.controller = controller

    async def route_request(self, prompt: str, system_prompt: str = None, options: Dict[str, Any] = None):
        """
        Main routing logic to select and execute request.
        """
        state = await self.controller.get_state()
        options = options or {}
        
        # 1. Determine Target Mode
        if state.get("auto_routing", False):
            target_mode = self._classify_task(prompt, options)
        else:
            target_mode = state.get("mode", "local")

        # 2. Execute with Fallback Support
        try:
            return await self._execute_request(target_mode, prompt, system_prompt, options)
        except Exception as e:
            logger.warning(f"Primary engine ({target_mode}) failed: {str(e)}. Falling back.")
            fallback_mode = "cloud" if target_mode == "local" else "local"
            return await self._execute_request(fallback_mode, prompt, system_prompt, options)

    def _classify_task(self, prompt: str, options: Dict[str, Any]) -> str:
        """
        Classification based on intent, token estimate, and complexity score.
        """
        prompt_lower = prompt.lower()
        
        # Logic: simple tasks, low context tasks use local model
        # Complex tasks with tool requirements or large context use cloud.
        
        is_simple = any(kw in prompt_lower for kw in ["hello", "status", "ping", "help", "list", "check"])
        is_complex = any(kw in prompt_lower for kw in ["code", "refactor", "analyze", "debug", "complex", "plan"])
        
        # Token estimate (rough)
        token_estimate = len(prompt.split()) * 1.5
        
        if options.get("task_type") == "simple" or (is_simple and token_estimate < 100):
            return "local"
        
        if options.get("task_type") == "complex" or is_complex or token_estimate > 500:
            return "cloud"
        
        # Default to local for anything else in auto mode
        return "local"

    async def _execute_request(self, mode: str, prompt: str, system_prompt: str, options: Dict[str, Any]):
        """
        Dispatches request to appropriate client.
        """
        if mode == "local":
            return await self.ollama.generate(prompt, options=options)
        else:
            # Format as messages for OpenAI
            messages = [
                {"role": "system", "content": system_prompt or "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ]
            return await self.openai.generate(messages, options=options)
    
    def get_status(self, state: Dict[str, Any]):
        """Returns visual status of current mode/model."""
        mode = state.get("mode", "local").upper()
        if state.get("auto_routing"):
            mode = "AUTO [" + mode + "]"
        return {
            "mode": mode,
            "local_model": state.get("model", "phi3:mini"),
            "cloud_model": state.get("cloud_model", "gpt-4.1")
        }
