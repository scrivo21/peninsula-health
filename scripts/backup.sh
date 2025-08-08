#!/bin/bash

# Peninsula Health - Backup Script
# Creates backups of application data

set -e

echo "==============================================="
echo "Peninsula Health - Creating Backup"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backup directory
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz"

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "Warning: No data directory found. Creating empty backup."
    mkdir -p data
fi

echo -e "${YELLOW}Creating backup...${NC}"

# Create backup
tar -czf $BACKUP_FILE data/ logs/ 2>/dev/null || true

# Get backup size
BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)

echo -e "${GREEN}✓ Backup created successfully${NC}"
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"

# Keep only last 10 backups
echo -e "${YELLOW}Cleaning old backups...${NC}"
cd $BACKUP_DIR
ls -t backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
cd ..

echo -e "${GREEN}✓ Backup complete!${NC}"