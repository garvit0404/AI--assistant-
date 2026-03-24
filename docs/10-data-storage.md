# Data Storage

## MongoDB
Persistent storage for long-term data.
- **Collections**:
  - `history`: Full chat and task logs.
  - `memory`: Distilled facts and long-term AI memory.
  - `settings`: System and user configurations.

## Redis
High-performance, volatile storage.
- **Usage**:
  - `Session Cache`: Fast access to active user sessions.
  - `Task Queue`: Management of background tasks.
  - `Rate Limiting`: Protecting API endpoints.
