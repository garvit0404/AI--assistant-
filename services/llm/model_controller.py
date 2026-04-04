import os
import json
import redis.asyncio as redis
import logging

logger = logging.getLogger(__name__)

class ModelController:
    def __init__(self, redis_url=None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://ai_redis:6379")
        self.redis = None
        
    async def _get_redis(self):
        if not self.redis:
            self.redis = await redis.from_url(self.redis_url)
        return self.redis

    async def get_state(self):
        """
        Get global model state.
        """
        r = await self._get_redis()
        state = await r.get("MODAL_SYSTEM_STATE")
        if not state:
            return {
                "mode": "local",
                "model": "phi3:mini",
                "cloud_model": "gpt-4.1",
                "auto_routing": True
            }
        return json.loads(state)

    async def _set_state(self, state):
        """
        Persist global model state.
        """
        r = await self._get_redis()
        await r.set("MODAL_SYSTEM_STATE", json.dumps(state))

    async def set_mode(self, mode):
        """
        Sets the execution mode (local | cloud).
        """
        state = await self.get_state()
        state["mode"] = mode
        await self._set_state(state)
        logger.info(f"Execution mode set to: {mode}")

    async def toggle_mode(self):
        """
        Toggles between local and cloud modes.
        """
        state = await self.get_state()
        state["mode"] = "cloud" if state["mode"] == "local" else "local"
        await self._set_state(state)
        logger.info(f"Execution mode toggled to: {state['mode']}")

    async def set_auto_routing(self, enabled: bool):
        """
        Enables or disables smart auto-routing.
        """
        state = await self.get_state()
        state["auto_routing"] = enabled
        await self._set_state(state)
        logger.info(f"Auto-routing enabled: {enabled}")

    async def set_model(self, model_name, type="local"):
        """
        Sets the model name for a specific mode.
        """
        state = await self.get_state()
        if type == "local":
            state["model"] = model_name
        else:
            state["cloud_model"] = model_name
        await self._set_state(state)
        logger.info(f"Model updated for {type}: {model_name}")
