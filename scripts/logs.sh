#!/bin/bash

# Peninsula Health - View Logs Script
# Shows application logs

echo "==============================================="
echo "Peninsula Health - Application Logs"
echo "==============================================="

# Check if specific service is requested
if [ $# -eq 1 ]; then
    SERVICE=$1
    echo "Showing logs for: $SERVICE"
    echo "Press Ctrl+C to exit"
    echo "-----------------------------------------------"
    docker-compose logs -f $SERVICE
else
    echo "Showing all logs"
    echo "Press Ctrl+C to exit"
    echo "-----------------------------------------------"
    docker-compose logs -f
fi