# Docker Development Setup

This setup provides a complete development environment with live reload for both frontend and backend.

## Quick Start

1. **Copy environment variables:**
   ```bash
   cp .env.docker.example .env
   ```
   
2. **Edit `.env` and add your API keys:**
   - `ELEVENLABS_API_KEY` - Required for TTS audio generation
   - `ANTHROPIC_API_KEY` - Required for story script generation  
   - `REPLICATE_API_TOKEN` - Required for cover image generation
   - Trello keys are optional

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173 (with HMR)
   - Backend API: http://localhost:3001
   - PostgreSQL: localhost:5433 (postgres/postgres/fablino)

## Development

- **Live reload**: Both frontend (Vite HMR) and backend (nodemon) automatically reload on file changes
- **Volumes**: Source code is mounted, so changes are immediately reflected
- **Database**: PostgreSQL data persists in a Docker volume

## Useful Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Stop services
docker-compose down

# Rebuild images after dependency changes
docker-compose build

# Reset database (removes all data!)
docker-compose down -v
```

## Services

- **backend**: Node.js with Express, nodemon for live reload
- **frontend**: React + Vite with HMR enabled
- **db**: PostgreSQL 16 with persistent volume

## Environment Variables

The backend automatically detects if it's running in Docker and uses the appropriate database connection. It falls back to localhost:5433 for local development without Docker.

## Troubleshooting

- If you change package.json dependencies, rebuild: `docker-compose build`
- Database connection issues: ensure the `db` service is healthy
- Port conflicts: modify ports in docker-compose.yml if needed