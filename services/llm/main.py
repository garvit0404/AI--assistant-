import os
import time
import uuid
import logging
from fastapi import FastAPI, Request, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from .ollama_client import OllamaClient
from .openai_client import OpenAIClient
from .model_controller import ModelController
from .router import AI_Router

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Hybrid AI OS - LLM Routing Layer")

# Initialize services
ollama = OllamaClient(base_url="http://host.docker.internal:11434")
openai = OpenAIClient()
controller = ModelController()
router = AI_Router(ollama, openai, controller)

# DB setup for observability
MONGO_URL = os.getenv("MONGO_URL", "mongodb://ai_mongodb:27017/ai_os")
db_client = AsyncIOMotorClient(MONGO_URL)
db = db_client.get_database("ai_os")
ai_logs = db.get_collection("ai_execution_logs")

@app.post("/chat")
async def chat(request: Request):
    """
    Unified chat endpoint with dynamic routing and logging.
    """
    body = await request.json()
    prompt = body.get("prompt")
    system_prompt = body.get("system_prompt", "You are a helpful assistant.")
    user_id = body.get("user_id", "anonymous")
    options = body.get("options", {})
    
    start_time = time.time()
    task_id = str(uuid.uuid4())[:8]

    try:
        # Route and generate
        response = await router.route_request(prompt, system_prompt, options)
        latency = (time.time() - start_time) * 1000 # in ms

        # Observability Log (Phase 7)
        log_entry = {
            "taskId": task_id,
            "userId": user_id,
            "prompt": prompt,
            "response": response.get("text"),
            "model": response.get("model"),
            "latency_ms": latency,
            "tokens": response.get("usage", {}),
            "cost": response.get("cost", 0.0),
            "source": response.get("source"),
            "timestamp": time.time()
        }
        await ai_logs.insert_one(log_entry)
        
        return {
            "success": True,
            "taskId": task_id,
            "data": response,
            "latency": latency
        }

    except Exception as e:
        logger.error(f"Routing error: {str(e)}")
        # Failover logging
        await ai_logs.insert_one({
            "taskId": task_id,
            "userId": user_id,
            "status": "error",
            "error": str(e),
            "timestamp": time.time()
        })
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mode")
async def update_mode(request: Request):
    """
    Endpoint to switch mode or toggle auto-routing.
    """
    body = await request.json()
    mode = body.get("mode")
    auto = body.get("auto")
    
    if mode in ["local", "cloud"]:
        await controller.set_mode(mode)
    
    if auto is not None:
        await controller.set_auto_routing(auto)
        
    state = await controller.get_state()
    return {"status": "ok", "state": state}

@app.get("/status")
async def get_status():
    """
    Get current model status.
    """
    state = await controller.get_state()
    return router.get_status(state)

@app.get("/health")
async def health():
    """
    Health check for service and Ollama.
    """
    ollama_ok = await ollama.health_check()
    return {
        "status": "ok",
        "service": "llm-hybrid-layer",
        "ollama_ready": ollama_ok
    }
