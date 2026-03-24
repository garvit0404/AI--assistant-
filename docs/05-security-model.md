# Security Model

The system follows a zero-trust architecture. AI agents do not receive direct host system access.

## Isolation Flow
`AI Agent → Intent Parser → Permission Engine → Policy Validator → Tool Execution (Container)`

## Key Protections

- **Containerized Execution**: All code execution happens in a sandbox.
- **Restricted Filesystem**: The AI only has access to the `/workspace` volume.
- **Explicit Permissions**: High-risk actions (delete, network access) require manual approval.
- **No Root Privileges**: Containers run with restricted user permissions where possible.
- **Zero-Trust**: Every request is validated by the Permission Engine.
