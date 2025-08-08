#!/bin/bash

# Clear the terminal
clear

# Get the script's directory and navigate to Peninsula Health root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Set up log file
LOG_FILE="test-output.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "🧪 Peninsula Health - Comprehensive Test Suite"
echo "=============================================="
echo "Test run started at: $(date)"
echo "Working directory: $(pwd)"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name=$1
    local test_command=$2
    local test_dir=$3
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    cd "$SCRIPT_DIR/$test_dir"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}\n"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ $test_name FAILED${NC}\n"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

echo "1️⃣ Backend Unit Tests"
echo "----------------------"
run_test "Backend API Tests" "npm test" "backend"

echo "2️⃣ Frontend Unit Tests"
echo "-----------------------"
run_test "Frontend Component Tests" "npm test -- --watchAll=false" "frontend"

echo "3️⃣ Integration Tests"
echo "---------------------"
cd ..
if [ -f "e2e-tests.js" ]; then
    echo -e "${YELLOW}Installing E2E dependencies...${NC}"
    npm install puppeteer --no-save
    run_test "End-to-End Tests" "node e2e-tests.js" "."
fi

echo ""
echo "📊 Test Summary"
echo "=============="
echo "Total Tests Run: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️ Some tests failed. Please review the output above.${NC}"
    exit 1
fi