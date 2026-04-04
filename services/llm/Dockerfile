FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY services/llm/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY services/llm/ .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=3020
ENV REDIS_URL=redis://ai_redis:6379
ENV MONGO_URL=mongodb://ai_mongodb:27017/ai_os

EXPOSE 3020

# Run FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3020", "--reload"]
