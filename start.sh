#!/usr/bin/env bash
set -e

# ── Colors ──
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Paths ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# ── Cleanup on exit ──
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    echo -e "${GREEN}✅ Done.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── Header ──
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Professional Blog Generator Launcher       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Check prerequisites ──
echo -e "${YELLOW}[1/4] Checking prerequisites...${NC}"

# Python
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ python3 not found. Please install Python 3.9+.${NC}"
    exit 1
fi

# Node
if ! command -v node &>/dev/null; then
    echo -e "${RED}❌ node not found. Please install Node.js 18+.${NC}"
    exit 1
fi

# .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}❌ backend/.env not found. Run: cp backend/.env.example backend/.env${NC}"
    exit 1
fi

# .venv
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "${YELLOW}⚠️  No .venv found, creating one...${NC}"
    python3 -m venv "$BACKEND_DIR/.venv"
    source "$BACKEND_DIR/.venv/bin/activate"
    pip install -r "$BACKEND_DIR/requirements.txt"
else
    source "$BACKEND_DIR/.venv/bin/activate"
fi

# node_modules
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found, installing...${NC}"
    cd "$FRONTEND_DIR" && npm install
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# ── 2. Kill any existing processes on our ports ──
echo -e "${YELLOW}[2/4] Checking for existing processes...${NC}"

kill_port() {
    local pid=$(lsof -ti ":$1" 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "  Killing existing process on port $1 (PID $pid)..."
        kill "$pid" 2>/dev/null
        sleep 1
    fi
}
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"
echo -e "${GREEN}✅ Ports clear${NC}"
echo ""

# ── 3. Start services ──
echo -e "${YELLOW}[3/4] Starting services...${NC}"

# Backend
echo "  Starting backend on port $BACKEND_PORT..."
cd "$BACKEND_DIR"
uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" &
BACKEND_PID=$!

# Frontend
echo "  Starting frontend on port $FRONTEND_PORT..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

# ── 4. Wait for readiness ──
echo ""
echo -e "${YELLOW}[4/4] Waiting for services to be ready...${NC}"

# Wait for backend
echo -n "  Backend: "
for i in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:$BACKEND_PORT/api/health" 2>/dev/null; then
        echo -e "${GREEN}ready${NC}"
        break
    fi
    sleep 1
done
if [ "$i" = "30" ]; then
    echo -e "${RED}timeout${NC}"
    cleanup
    exit 1
fi

# Wait for frontend
echo -n "  Frontend: "
for i in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:$FRONTEND_PORT" 2>/dev/null; then
        echo -e "${GREEN}ready${NC}"
        break
    fi
    sleep 1
done
if [ "$i" = "30" ]; then
    echo -e "${RED}timeout${NC}"
    cleanup
    exit 1
fi

# ── Done ──
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🚀 All services running!                    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   Backend:  http://localhost:$BACKEND_PORT              ║${NC}"
echo -e "${GREEN}║   Frontend: http://localhost:$FRONTEND_PORT              ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   Press Ctrl+C to stop all services.         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Keep running ──
wait
