# Peninsula Health Shift Happens - Docker Deployment Guide

## Quick Start

### Prerequisites
- Docker Engine 20.10+ 
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB free disk space

### Installation Steps

1. **Build the Docker images:**
   ```bash
   ./scripts/build.sh
   ```

2. **Start the application:**
   ```bash
   ./scripts/start.sh
   ```

3. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:3001/api

## Directory Structure

```
peninsula-health/
├── docker-compose.yml      # Container orchestration
├── Dockerfile.frontend     # Frontend container definition
├── Dockerfile.backend      # Backend container definition
├── nginx.conf             # Nginx configuration
├── .dockerignore          # Files to exclude from Docker build
├── data/                  # Persistent data (created on first run)
├── logs/                  # Application logs (created on first run)
├── backups/              # Backup files (created when running backup)
└── scripts/              # Management scripts
    ├── build.sh          # Build Docker images
    ├── start.sh          # Start application
    ├── stop.sh           # Stop application
    ├── logs.sh           # View logs
    ├── backup.sh         # Create backup
    ├── restore.sh        # Restore from backup
    └── save-images.sh    # Export images for distribution
```

## Management Commands

### Starting and Stopping

```bash
# Start the application
./scripts/start.sh

# Stop the application
./scripts/stop.sh

# View logs
./scripts/logs.sh

# View specific service logs
./scripts/logs.sh frontend
./scripts/logs.sh backend
```

### Backup and Restore

```bash
# Create a backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backups/backup_20240108_120000.tar.gz
```

### Distribution

To distribute the application to another machine:

1. **Build and export images:**
   ```bash
   ./scripts/build.sh
   ./scripts/save-images.sh
   ```

2. **Copy the `dist/` folder to target machine**

3. **On target machine:**
   ```bash
   cd dist/
   ./load-images.sh
   ./scripts/start.sh
   ```

## Container Details

### Frontend Container
- **Base Image:** nginx:alpine
- **Port:** 80
- **Purpose:** Serves React application
- **Size:** ~50MB

### Backend Container
- **Base Image:** node:18-alpine with Python 3
- **Port:** 3001
- **Purpose:** Node.js API with Python roster generator
- **Size:** ~300MB
- **Includes:** Chromium for PDF generation

## Data Persistence

All application data is stored in bind-mounted volumes:
- `./data/` - Roster configurations, generated rosters
- `./logs/` - Application logs

These directories are preserved when containers are stopped/removed.

## Troubleshooting

### Container won't start
```bash
# Check if ports are in use
lsof -i :80
lsof -i :3001

# Check container status
docker-compose ps

# View detailed logs
docker-compose logs -f
```

### Build failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Permission issues
```bash
# Fix permissions on scripts
chmod +x scripts/*.sh

# Fix data directory permissions
chmod -R 755 data/ logs/
```

### Low disk space
```bash
# Remove unused Docker resources
docker system prune -a --volumes

# Check disk usage
docker system df
```

## Environment Configuration

### Default Settings
- Frontend URL: http://localhost
- Backend API: http://localhost:3001/api
- Node Environment: production

### Customization
Edit `docker-compose.yml` to change:
- Ports
- Environment variables
- Volume mappings

## Security Notes

- This setup is designed for single-user deployment
- No authentication is configured by default
- Ensure firewall rules restrict access as needed
- For production use, consider:
  - Adding SSL/TLS certificates
  - Implementing authentication
  - Setting up regular automated backups

## Performance Optimization

- Images use Alpine Linux for minimal size
- Multi-stage builds reduce final image size
- Static assets are cached by nginx
- Health checks ensure service availability

## Updates

To update the application:

1. Pull latest code changes
2. Rebuild images: `./scripts/build.sh`
3. Stop current containers: `./scripts/stop.sh`
4. Start updated containers: `./scripts/start.sh`

## Support

For issues or questions about the Docker deployment:
1. Check container logs: `./scripts/logs.sh`
2. Verify Docker installation: `docker --version`
3. Ensure sufficient resources: `docker system df`

## License

Peninsula Health Shift Happens - MIT License