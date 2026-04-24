#!/bin/bash

# ============================================================================
# AI Notary / Document Verification - Start Script
# ============================================================================
# This script:
#   1. Kills processes on used ports (3000, 3001)
#   2. Ensures PostgreSQL is running
#   3. Creates the database if needed
#   4. Installs dependencies
#   5. Seeds the database
#   6. Starts backend (with nodemon for hot reload) and frontend (Vite HMR)
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${PURPLE}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          AI Notary / Document Verification System           ║"
echo "║                    Starting Application                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# Step 1: Clean up ports
# ============================================================================
echo -e "${CYAN}[1/6] Cleaning up ports...${NC}"

cleanup_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}  Killing processes on port $port (PIDs: $pids)${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    else
        echo -e "${GREEN}  Port $port is free${NC}"
    fi
}

cleanup_port 3000
cleanup_port 3001

# ============================================================================
# Step 2: Check PostgreSQL
# ============================================================================
echo -e "${CYAN}[2/6] Checking PostgreSQL...${NC}"

# Check if PostgreSQL is running
if command -v pg_isready &> /dev/null; then
    if pg_isready -q 2>/dev/null; then
        echo -e "${GREEN}  PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
        if command -v brew &> /dev/null; then
            brew services start postgresql@14 2>/dev/null || \
            brew services start postgresql@15 2>/dev/null || \
            brew services start postgresql@16 2>/dev/null || \
            brew services start postgresql@17 2>/dev/null || \
            brew services start postgresql 2>/dev/null || true
            sleep 3
        elif command -v pg_ctl &> /dev/null; then
            pg_ctl -D /usr/local/var/postgres start 2>/dev/null || \
            pg_ctl -D /opt/homebrew/var/postgres start 2>/dev/null || true
            sleep 3
        fi

        if pg_isready -q 2>/dev/null; then
            echo -e "${GREEN}  PostgreSQL started successfully${NC}"
        else
            echo -e "${RED}  ERROR: Could not start PostgreSQL. Please start it manually.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}  pg_isready not found. Assuming PostgreSQL is running...${NC}"
fi

# ============================================================================
# Step 3: Create database
# ============================================================================
echo -e "${CYAN}[3/6] Setting up database...${NC}"

# Load env vars
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | grep -v '^$' | xargs)
fi

DB_NAME="${DB_NAME:-ai_notary_db}"
DB_USER="${DB_USER:-postgres}"

# Create database if it doesn't exist
if psql -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}  Database '$DB_NAME' already exists${NC}"
else
    echo -e "${YELLOW}  Creating database '$DB_NAME'...${NC}"
    createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || \
    psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || \
    echo -e "${YELLOW}  Database may already exist or requires manual creation${NC}"
fi

# ============================================================================
# Step 4: Install dependencies
# ============================================================================
echo -e "${CYAN}[4/6] Installing dependencies...${NC}"

echo -e "${BLUE}  Installing backend dependencies...${NC}"
cd "$BACKEND_DIR"
npm install --silent 2>&1 | tail -1

echo -e "${BLUE}  Installing frontend dependencies...${NC}"
cd "$FRONTEND_DIR"
npm install --silent 2>&1 | tail -1

cd "$PROJECT_DIR"

# ============================================================================
# Step 5: Seed database
# ============================================================================
echo -e "${CYAN}[5/6] Seeding database...${NC}"

cd "$BACKEND_DIR"
node seed.js
echo -e "${GREEN}  Database seeded successfully${NC}"

cd "$PROJECT_DIR"

# ============================================================================
# Step 6: Start application
# ============================================================================
echo -e "${CYAN}[6/6] Starting application...${NC}"

# Trap to clean up background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Application stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend with nodemon (hot reload)
echo -e "${BLUE}  Starting backend on port 3001 (with hot reload)...${NC}"
cd "$BACKEND_DIR"
npx nodemon server.js &
BACKEND_PID=$!

# Start frontend with Vite (HMR)
echo -e "${BLUE}  Starting frontend on port 3000 (with HMR)...${NC}"
cd "$FRONTEND_DIR"
npx vite --port 3000 &
FRONTEND_PID=$!

cd "$PROJECT_DIR"

sleep 3

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║              Application Started Successfully!              ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}║  Frontend:  ${CYAN}http://localhost:3000${GREEN}                            ║${NC}"
echo -e "${GREEN}${BOLD}║  Backend:   ${CYAN}http://localhost:3001${GREEN}                            ║${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}║  Login:     ${YELLOW}admin@notary.com / password123${GREEN}                 ║${NC}"
echo -e "${GREEN}${BOLD}║            (or click 'Demo Login' button)                    ║${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}║  Press Ctrl+C to stop all services                           ║${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
