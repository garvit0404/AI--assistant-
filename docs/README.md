# Personal AI Assistant (Local-First)

A privacy-first AI assistant platform running in a containerized ecosystem.

The system runs inside a controlled Docker environment so that AI agents interact with a sandboxed Linux environment before gaining access to host resources.

## Core Principles

- Local-first architecture
- Permission-based execution
- Zero-trust security model
- Docker sandbox for system access
- Modular monorepo architecture

## High-Level Architecture

User → AI Agent → Permission Engine → Tool Executor → Workspace Sandbox

## Technology Stack

- Node.js / TypeScript
- Next.js Dashboard
- Docker / Docker Compose
- Redis (fast memory)
- MongoDB (persistent memory)
- OpenAI API (reasoning engine)

## Directory Structure

apps/
packages/
infra/
workspace/
docs/

## Start System

docker compose up