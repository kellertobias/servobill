#!/bin/bash

# Servobill Dockerized Deployment Script
# This script helps deploy Servobill using pre-built Docker images

set -e

# Default values
VERSION=${VERSION:-latest}
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-your-username/servobill}
PORT=${PORT:-3000}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -v, --version VERSION    Specify the version to deploy (default: latest)"
    echo "  -r, --repository REPO    GitHub repository (default: your-username/servobill)"
    echo "  -p, --port PORT          Port to expose the app on (default: 3000)"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  VERSION                  Version to deploy"
    echo "  GITHUB_REPOSITORY        GitHub repository"
    echo "  PORT                     Port to expose the app on"
    echo "  ALLOWED_EMAILS           Comma-separated list of allowed email addresses"
    echo "  OAUTH_CLIENT_ID          Google OAuth Client ID"
    echo "  OAUTH_CLIENT_SECRET      Google OAuth Client Secret"
    echo "  JWT_SECRET               JWT secret for session management"
    echo "  SMTP_HOST                SMTP server host"
    echo "  SMTP_PORT                SMTP server port"
    echo "  SMTP_USER                SMTP username"
    echo "  SMTP_PASSWORD            SMTP password"
    echo "  SMTP_FROM                From email address"
    echo "  SMTP_FROM_NAME           From name"
    echo "  NEXT_PUBLIC_API_URL      Public API URL"
    echo "  INSECURE_COOKIES         Set to 'true' for development (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 -v 1.0.0                    # Deploy version 1.0.0"
    echo "  $0 --version latest            # Deploy latest version"
    echo "  $0 -p 8080                     # Deploy on port 8080"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -r|--repository)
            GITHUB_REPOSITORY="$2"
            shift 2
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required environment variables
print_status "Validating environment variables..."

if [[ "$ALLOWED_EMAILS" == "please-set" || -z "$ALLOWED_EMAILS" ]]; then
    print_warning "ALLOWED_EMAILS is not set. Please set it before deploying."
fi

if [[ "$OAUTH_CLIENT_ID" == "please-set" || -z "$OAUTH_CLIENT_ID" ]]; then
    print_warning "OAUTH_CLIENT_ID is not set. Please set it before deploying."
fi

if [[ "$OAUTH_CLIENT_SECRET" == "please-set" || -z "$OAUTH_CLIENT_SECRET" ]]; then
    print_warning "OAUTH_CLIENT_SECRET is not set. Please set it before deploying."
fi

if [[ "$JWT_SECRET" == "please-set" || -z "$JWT_SECRET" ]]; then
    print_warning "JWT_SECRET is not set. Please set it before deploying."
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p ./data

print_status "Deploying Servobill version $VERSION from $GITHUB_REPOSITORY on port $PORT"

# Export variables for docker-compose
export VERSION
export GITHUB_REPOSITORY
export PORT

# Pull the latest images
print_status "Pulling Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Start the services
print_status "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_success "Servobill has been deployed successfully!"
    print_status "Application is available at: http://localhost:$PORT"
    print_status "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
    print_status "To stop: docker-compose -f docker-compose.prod.yml down"
else
    print_error "Failed to start services. Check logs with: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi 