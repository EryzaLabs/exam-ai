#!/bin/bash
# Debug testseries file structure

echo "=== Testseries Directory Debug ==="
echo ""

TESTSERIES_DIR="~/exam-ai/testseries"

if [ ! -d "$TESTSERIES_DIR" ]; then
    echo "ERROR: Testseries directory not found at $TESTSERIES_DIR"
    exit 1
fi

echo "✓ Testseries directory exists"
echo ""

# Check one specific test series that's failing
SERIES="71st_BPSC_CCE__Preliminary__Test_Series_2025_6808ca7ee5e918ff5a11e2b5"
SECTION="Budget___Economic_Survey__Latest__6893125e73365aef5b813891"

SECTION_PATH="$TESTSERIES_DIR/$SERIES/$SECTION"

if [ -d "$SECTION_PATH" ]; then
    echo "Section path exists: $SECTION_PATH"
    echo ""
    echo "Files in section (first 10):"
    ls -lh "$SECTION_PATH" | head -11
    echo ""
    echo "Total files:"
    ls "$SECTION_PATH" | grep "\.json" | wc -l
    echo ""
    
    # Check if _section_info.json exists
    if [ -f "$SECTION_PATH/_section_info.json" ]; then
        echo "✓ _section_info.json exists"
        echo ""
        echo "First test from _section_info.json:"
        cat "$SECTION_PATH/_section_info.json" | jq '.tests[0]' 2>/dev/null || echo "jq not installed, showing raw:"
        cat "$SECTION_PATH/_section_info.json" | head -20
    else
        echo "✗ _section_info.json not found"
    fi
else
    echo "ERROR: Section path not found: $SECTION_PATH"
    echo ""
    echo "Available sections in series:"
    ls -1 "$TESTSERIES_DIR/$SERIES" 2>/dev/null || echo "Series not found!"
fi

echo ""
echo "=== To fix the issue: ==="
echo "1. Check if filenames match the test IDs"
echo "2. Verify _section_info.json has correct test IDs"
echo "3. Make sure files are .json.gz or .json format"
echo ""
echo "Run this to see all test files:"
echo "find ~/exam-ai/testseries/$SERIES/$SECTION -name '*.json*' | head -10"
