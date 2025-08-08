#!/bin/bash

# Peninsula Health - Docker Stop Script
# Stops the application containers

echo "==============================================="
echo "Peninsula Health Shift Happens - Stopping"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping Docker containers...${NC}"
docker-compose down

echo -e "${GREEN}✓ Application stopped${NC}"