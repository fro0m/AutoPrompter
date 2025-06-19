#!/bin/bash

# AutoPrompter Build Script
# This script handles the complete build process for the VS Code extension

set -e  # Exit on any error

echo "🚀 AutoPrompter Build Process Started"
echo "======================================="

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Make sure you're in the AutoPrompter root directory."
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
print_status "Checking required tools..."

if ! command_exists npm; then
    print_error "npm is required but not installed."
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is required but not installed."
    exit 1
fi

print_success "All required tools are available"

# Parse command line arguments
CLEAN_BUILD=false
SKIP_TESTS=false
PACKAGE_ONLY=false
WATCH_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --package-only)
            PACKAGE_ONLY=true
            shift
            ;;
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --help)
            echo "AutoPrompter Build Script"
            echo ""
            echo "Usage: ./build.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --clean         Clean build (remove out/ and node_modules/)"
            echo "  --skip-tests    Skip running tests"
            echo "  --package-only  Only create the VSIX package"
            echo "  --watch         Run in watch mode (development)"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            print_warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
    print_status "Performing clean build..."
    rm -rf out/
    rm -rf node_modules/
    rm -rf .vscode-test/
    print_success "Clean completed"
fi

# Install dependencies
print_status "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Watch mode for development
if [ "$WATCH_MODE" = true ]; then
    print_status "Starting watch mode..."
    npm run watch
    exit 0
fi

# Skip full build if package-only
if [ "$PACKAGE_ONLY" = false ]; then
    # Compile TypeScript
    print_status "Compiling TypeScript..."
    npm run compile
    print_success "TypeScript compilation completed"

    # Run linting
    print_status "Running ESLint..."
    npm run lint
    if [ $? -eq 0 ]; then
        print_success "Linting passed"
    else
        print_warning "Linting completed with warnings"
    fi

    # Run tests unless skipped
    if [ "$SKIP_TESTS" = false ]; then
        print_status "Running tests..."
        npm test
        print_success "All tests passed"
    else
        print_warning "Tests skipped"
    fi
fi

# Create VSIX package
print_status "Creating VSIX package..."
if command_exists vsce; then
    npm run package
    print_success "VSIX package created successfully"
else
    print_warning "vsce not found globally. Installing locally..."
    npx vsce package
    print_success "VSIX package created using npx"
fi

# Final success message
echo ""
echo "======================================="
print_success "🎉 Build completed successfully!"
echo ""

# Show output files
if [ -d "out" ]; then
    print_status "Output directory: out/"
    ls -la out/ | head -10
fi

# Show VSIX files
VSIX_FILES=$(find . -maxdepth 1 -name "*.vsix" -type f)
if [ -n "$VSIX_FILES" ]; then
    echo ""
    print_status "VSIX packages created:"
    echo "$VSIX_FILES"
fi

echo ""
print_status "Build process completed at $(date)" 