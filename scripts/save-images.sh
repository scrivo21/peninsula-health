#!/bin/bash

# Peninsula Health - Docker Image Export Script
# Saves Docker images for distribution

set -e

echo "==============================================="
echo "Peninsula Health - Exporting Docker Images"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create distribution directory
DIST_DIR="dist"
mkdir -p $DIST_DIR

echo -e "${YELLOW}Saving frontend image...${NC}"
docker save peninsula-health-frontend:latest | gzip > $DIST_DIR/frontend.tar.gz
echo -e "${GREEN}✓ Frontend image saved to $DIST_DIR/frontend.tar.gz${NC}"

echo -e "${YELLOW}Saving backend image...${NC}"
docker save peninsula-health-backend:latest | gzip > $DIST_DIR/backend.tar.gz
echo -e "${GREEN}✓ Backend image saved to $DIST_DIR/backend.tar.gz${NC}"

# Copy necessary files to distribution
echo -e "${YELLOW}Copying configuration files...${NC}"
cp docker-compose.yml $DIST_DIR/
cp -r scripts $DIST_DIR/

# Create load script for target machine
cat > $DIST_DIR/load-images.sh << 'EOF'
#!/bin/bash

echo "Loading Peninsula Health Docker Images..."

docker load < frontend.tar.gz
echo "✓ Frontend image loaded"

docker load < backend.tar.gz
echo "✓ Backend image loaded"

echo "Images loaded successfully!"
echo "Run './start.sh' to start the application"
EOF

chmod +x $DIST_DIR/load-images.sh
chmod +x $DIST_DIR/scripts/*.sh

# Get sizes
FRONTEND_SIZE=$(du -h $DIST_DIR/frontend.tar.gz | cut -f1)
BACKEND_SIZE=$(du -h $DIST_DIR/backend.tar.gz | cut -f1)
TOTAL_SIZE=$(du -sh $DIST_DIR | cut -f1)

echo ""
echo "Distribution package created in '$DIST_DIR/'"
echo "  Frontend image: $FRONTEND_SIZE"
echo "  Backend image: $BACKEND_SIZE"
echo "  Total size: $TOTAL_SIZE"
echo ""
echo -e "${GREEN}✓ Ready for distribution!${NC}"