# System Architecture

The AI Assistant platform follows a layered architecture to ensure security, modularity, and scalability.

## Layer 1 – User Interaction

Interfaces:
- Telegram Bot (Planned)
- Voice Interface (Planned)
- Dashboard UI (Next.js)

## Layer 2 – API Server

Responsible for:
- Request routing
- AI reasoning
- Permission checks
- Task orchestration

## Layer 3 – Permission Engine

Validates whether requested actions are allowed.
Example: User → "Delete file" → Permission Engine → requires explicit approval.

## Layer 4 – Tool Execution

Tools run inside a Docker sandbox and include:
- Filesystem access
- Code execution
- Automation tasks

## Layer 5 – Data Storage

- **Redis**: Fast runtime memory / session cache
- **MongoDB**: Persistent AI memory / chat history
