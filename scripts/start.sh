#!/bin/bash

# Peninsula Health - Docker Start Script
# Starts the application using docker-compose

set -e

echo "==============================================="
echo "Peninsula Health Shift Happens - Starting"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create data directories if they don't exist
echo -e "${YELLOW}Creating data directories...${NC}"
mkdir -p data logs backups

# Start containers
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 5

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Application started successfully!${NC}"
    echo ""
    echo "Access the application at:"
    echo "  Frontend: http://localhost"
    echo "  Backend API: http://localhost:3001/api"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop: ./scripts/stop.sh"
else
    echo "Error: Services failed to start"
    echo "Check logs with: docker-compose logs"
    exit 1
fi