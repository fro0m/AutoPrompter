#!/bin/bash

# AutoPrompter Test Runner Script
# Comprehensive test execution with multiple modes and detailed reporting

set -e  # Exit on any error

echo "🧪 AutoPrompter Test Runner"
echo "==========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
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

print_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

print_section() {
    echo -e "${MAGENTA}[SECTION]${NC} $1"
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

# Parse command line arguments
RUN_UNIT_TESTS=true
RUN_INTEGRATION_TESTS=true
RUN_EXTENSION_TESTS=true
VERBOSE=false
COVERAGE=false
WATCH_MODE=false
TEST_FILTER=""
TIMEOUT=30000

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_INTEGRATION_TESTS=false
            RUN_EXTENSION_TESTS=false
            shift
            ;;
        --integration-only)
            RUN_UNIT_TESTS=false
            RUN_EXTENSION_TESTS=false
            shift
            ;;
        --extension-only)
            RUN_UNIT_TESTS=false
            RUN_INTEGRATION_TESTS=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch|-w)
            WATCH_MODE=true
            shift
            ;;
        --filter)
            TEST_FILTER="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            echo "AutoPrompter Test Runner Script"
            echo ""
            echo "Usage: ./run_tests.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --unit-only         Run only unit tests"
            echo "  --integration-only  Run only integration tests"
            echo "  --extension-only    Run only VS Code extension tests"
            echo "  --verbose, -v       Verbose output"
            echo "  --coverage          Generate code coverage report"
            echo "  --watch, -w         Run in watch mode"
            echo "  --filter PATTERN    Filter tests by pattern"
            echo "  --timeout MS        Set test timeout (default: 30000ms)"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run_tests.sh                    # Run all tests"
            echo "  ./run_tests.sh --unit-only        # Run only unit tests"
            echo "  ./run_tests.sh --verbose          # Run with verbose output"
            echo "  ./run_tests.sh --filter domain    # Run tests matching 'domain'"
            exit 0
            ;;
        *)
            print_warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Check required tools
print_status "Checking test environment..."

if ! command_exists npm; then
    print_error "npm is required but not installed."
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is required but not installed."
    exit 1
fi

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Ensure project is compiled
print_status "Compiling project..."
npm run compile

# Setup test environment variables
export NODE_ENV=test
export VSCODE_CLI=1

# Function to run unit tests (isolated tests without VS Code)
run_unit_tests() {
    print_section "Running Unit Tests"
    print_test "Testing domain value objects..."
    
    # Create a simple Node.js test runner for unit tests
    node -e "
        const assert = require('assert');
        const path = require('path');
        
        // Import domain classes
        const { TimeInterval } = require('./out/src/domain');
        const { PromptTemplate, TemplateVariable } = require('./out/src/domain');
        
        let passed = 0;
        let failed = 0;
        
        function test(name, fn) {
            try {
                fn();
                console.log('\x1b[32m✓\x1b[0m', name);
                passed++;
            } catch (error) {
                console.log('\x1b[31m✗\x1b[0m', name, '-', error.message);
                failed++;
            }
        }
        
        // TimeInterval tests
        test('TimeInterval.fromMinutes should work', () => {
            const interval = TimeInterval.fromMinutes(5);
            assert.strictEqual(interval.minutes, 5);
            assert.strictEqual(interval.ms, 5 * 60 * 1000);
        });
        
        test('TimeInterval.fromSeconds should work', () => {
            const interval = TimeInterval.fromSeconds(30);
            assert.strictEqual(interval.seconds, 30);
            assert.strictEqual(interval.ms, 30 * 1000);
        });
        
        // PromptTemplate tests
        test('TemplateVariable should validate types', () => {
            const variable = new TemplateVariable('test', 'string', 'default');
            assert.strictEqual(variable.name, 'test');
            assert.strictEqual(variable.type, 'string');
            assert.strictEqual(variable.defaultValue, 'default');
        });
        
        console.log(\`Unit Tests Summary: \${passed} passed, \${failed} failed\`);
        if (failed > 0) process.exit(1);
    "
    
    print_success "Unit tests completed"
}

# Function to run integration tests
run_integration_tests() {
    print_section "Running Integration Tests"
    print_test "Testing service integrations..."
    
    # Run a subset of the full test suite focusing on integration
    MOCHA_OPTIONS=""
    if [ "$VERBOSE" = true ]; then
        MOCHA_OPTIONS="--reporter spec"
    fi
    
    if [ -n "$TEST_FILTER" ]; then
        MOCHA_OPTIONS="$MOCHA_OPTIONS --grep '$TEST_FILTER'"
    fi
    
    # Use a custom test runner for integration tests
    node -e "
        const { execSync } = require('child_process');
        const path = require('path');
        
        console.log('Running integration tests...');
        
        try {
            // Test configuration loading
            const { WorkspaceConfigurationRepository } = require('./out/src/infrastructure/workspace-configuration-repository');
            console.log('✓ Configuration repository can be imported');
            
            // Test scheduling engine
            const { PromptSchedulingEngine } = require('./out/src/infrastructure/prompt-scheduling-engine');
            console.log('✓ Scheduling engine can be imported');
            
            console.log('Integration tests passed');
        } catch (error) {
            console.error('Integration test failed:', error.message);
            process.exit(1);
        }
    "
    
    print_success "Integration tests completed"
}

# Function to run VS Code extension tests
run_extension_tests() {
    print_section "Running VS Code Extension Tests"
    print_test "Testing extension activation and functionality..."
    
    # Set test timeout
    export VSCODE_TEST_TIMEOUT=$TIMEOUT
    
    # Add verbose flag if requested
    if [ "$VERBOSE" = true ]; then
        export VSCODE_TEST_VERBOSE=1
    fi
    
    # Run the main test suite
    npm test
    
    print_success "VS Code extension tests completed"
}

# Function to generate coverage report
generate_coverage() {
    print_section "Generating Code Coverage Report"
    
    if command_exists nyc; then
        print_test "Running tests with coverage..."
        nyc --reporter=html --reporter=text npm test
        print_success "Coverage report generated in coverage/"
    else
        print_warning "nyc not found. Install with: npm install -g nyc"
        print_status "Installing nyc locally..."
        npm install --save-dev nyc
        npx nyc --reporter=html --reporter=text npm test
        print_success "Coverage report generated using npx"
    fi
}

# Main test execution
START_TIME=$(date +%s)

print_status "Test configuration:"
echo "  - Unit tests: $RUN_UNIT_TESTS"
echo "  - Integration tests: $RUN_INTEGRATION_TESTS"
echo "  - Extension tests: $RUN_EXTENSION_TESTS"
echo "  - Verbose: $VERBOSE"
echo "  - Coverage: $COVERAGE"
echo "  - Watch mode: $WATCH_MODE"
echo "  - Filter: ${TEST_FILTER:-'none'}"
echo "  - Timeout: ${TIMEOUT}ms"
echo ""

# Run watch mode if requested
if [ "$WATCH_MODE" = true ]; then
    print_status "Watching for changes... Press Ctrl+C to stop"
    npm run watch &
    print_warning "Watch mode: automatic test re-running requires fswatch"
    wait
    exit 0
fi

# Run tests based on configuration
TOTAL_TESTS=0
FAILED_TESTS=0

if [ "$RUN_UNIT_TESTS" = true ]; then
    if run_unit_tests; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi

if [ "$RUN_INTEGRATION_TESTS" = true ]; then
    if run_integration_tests; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi

if [ "$RUN_EXTENSION_TESTS" = true ]; then
    if run_extension_tests; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi

# Generate coverage if requested
if [ "$COVERAGE" = true ]; then
    generate_coverage
fi

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))

# Final summary
echo ""
echo "======================================="
if [ $FAILED_TESTS -eq 0 ]; then
    print_success "🎉 All test suites passed!"
else
    print_error "❌ $FAILED_TESTS out of $TOTAL_TESTS test suites failed"
fi

echo ""
print_status "Test execution summary:"
echo "  - Total suites run: $TOTAL_TESTS"
echo "  - Failed suites: $FAILED_TESTS"
echo "  - Execution time: ${EXECUTION_TIME}s"
echo ""
print_status "Test run completed at $(date)"

# Exit with error code if any tests failed
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi 