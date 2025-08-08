#!/bin/bash

# Peninsula Health - Docker Build Script
# Builds both frontend and backend Docker images

set -e  # Exit on error

echo "==============================================="
echo "Peninsula Health Shift Happens - Docker Build"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}Building Frontend Image...${NC}"
docker build -f Dockerfile.frontend -t peninsula-health-frontend:latest . || {
    echo -e "${RED}Frontend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend image built successfully${NC}"

echo -e "${YELLOW}Building Backend Image...${NC}"
docker build -f Dockerfile.backend -t peninsula-health-backend:latest . || {
    echo -e "${RED}Backend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Backend image built successfully${NC}"

# Display image sizes
echo ""
echo "Built Images:"
docker images | grep peninsula-health

echo ""
echo -e "${GREEN}Build completed successfully!${NC}"
echo "Run './scripts/start.sh' to start the application"