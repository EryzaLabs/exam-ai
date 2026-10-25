#!/bin/bash
# Check Answer Generation Progress
# Usage: ./check-answer-progress.sh [testId]

TEST_ID="${1:-}"
SERVER_URL="${SERVER_URL:-https://exambc.alaotach.com}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

show_all_progress() {
    echo -e "${CYAN}\n📊 Checking answer generation tasks...${NC}"
    
    # Check completed answers
    if [ -d "./ai_generated_answers" ]; then
        echo -e "${GREEN}\n✅ Recently completed answers:${NC}"
        ls -lt ./ai_generated_answers/*.json* 2>/dev/null | head -5 | while read -r line; do
            file=$(echo "$line" | awk '{print $NF}')
            basename=$(basename "$file" | sed 's/\.json.*$//')
            echo -e "   ${GRAY}- $basename ($(basename "$file"))${NC}"
        done
    fi
    
    # Show active generation processes
    echo -e "${CYAN}\n⚙️  Active Python processes:${NC}"
    ps aux | grep "[g]enerate_ai_answers.py" | head -3 || echo -e "   ${GRAY}No active generation processes${NC}"
    
    echo -e "${YELLOW}\n💡 Tip: Check PM2 logs for live progress:${NC}"
    echo -e "   ${GRAY}pm2 logs exam-ai-server --lines 100 | grep 'Answer Gen'${NC}"
    echo -e "${YELLOW}\n   Or check specific test:${NC}"
    echo -e "   ${GRAY}./check-answer-progress.sh YOUR_TEST_ID${NC}"
}

show_test_progress() {
    local test_id="$1"
    echo -e "${CYAN}\n🔍 Checking progress for test: ${test_id}${NC}"
    
    response=$(curl -s "$SERVER_URL/api/answers/status/$test_id")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}\n❌ Failed to connect to server${NC}"
        return 1
    fi
    
    # Parse JSON (requires jq, fallback to grep if not available)
    if command -v jq &> /dev/null; then
        status=$(echo "$response" | jq -r '.status')
        progress=$(echo "$response" | jq -r '.progress // "N/A"')
        answers_available=$(echo "$response" | jq -r '.answersAvailable // false')
        error=$(echo "$response" | jq -r '.error // ""')
        started_at=$(echo "$response" | jq -r '.startedAt // ""')
        completed_at=$(echo "$response" | jq -r '.completedAt // ""')
        
        echo -e "\n${CYAN}📋 Status:${NC}"
        echo -e "   Test ID: ${GRAY}$test_id${NC}"
        
        case "$status" in
            "completed")
                echo -e "   Status: ${GREEN}✅ $status${NC}"
                ;;
            "in-progress")
                echo -e "   Status: ${YELLOW}⏳ $status${NC}"
                ;;
            "pending")
                echo -e "   Status: ${CYAN}⌛ $status${NC}"
                ;;
            "failed")
                echo -e "   Status: ${RED}❌ $status${NC}"
                ;;
            *)
                echo -e "   Status: ${GRAY}❓ $status${NC}"
                ;;
        esac
        
        if [ "$progress" != "N/A" ] && [ "$progress" != "null" ]; then
            filled=$((progress / 10))
            empty=$((10 - filled))
            bar=$(printf "█%.0s" $(seq 1 $filled))$(printf "░%.0s" $(seq 1 $empty))
            echo -e "   Progress: ${CYAN}[$bar] ${progress}%${NC}"
        fi
        
        [ "$answers_available" = "true" ] && echo -e "   ${GREEN}✅ Answers Available: Yes${NC}"
        [ -n "$error" ] && [ "$error" != "null" ] && echo -e "   ${RED}❌ Error: $error${NC}"
        [ -n "$started_at" ] && [ "$started_at" != "null" ] && echo -e "   Started: ${GRAY}$started_at${NC}"
        [ -n "$completed_at" ] && [ "$completed_at" != "null" ] && echo -e "   Completed: ${GRAY}$completed_at${NC}"
    else
        # Fallback without jq
        echo -e "\n${CYAN}Response:${NC}"
        echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4
        echo -e "\n${YELLOW}Install jq for better formatting: apt install jq${NC}"
    fi
}

# Main execution
clear
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}   AI Answer Generation Progress Checker${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"

if [ -n "$TEST_ID" ]; then
    show_test_progress "$TEST_ID"
else
    show_all_progress
fi

echo ""
