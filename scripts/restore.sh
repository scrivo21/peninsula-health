#!/bin/bash

# Peninsula Health - Restore Script
# Restores application data from backup

set -e

echo "==============================================="
echo "Peninsula Health - Restore from Backup"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -la backups/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Confirm restore
echo -e "${YELLOW}Warning: This will overwrite existing data!${NC}"
read -p "Are you sure you want to restore from $BACKUP_FILE? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop containers if running
if docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}Stopping containers...${NC}"
    docker-compose down
fi

# Create backup of current data
echo -e "${YELLOW}Backing up current data...${NC}"
if [ -d "data" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mv data "data_before_restore_${TIMESTAMP}"
fi

# Restore from backup
echo -e "${YELLOW}Restoring from backup...${NC}"
tar -xzf $BACKUP_FILE

echo -e "${GREEN}✓ Restore completed successfully${NC}"
echo "Run './scripts/start.sh' to restart the application"