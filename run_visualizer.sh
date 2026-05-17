#!/bin/bash
# Script to run the RISC-V Web Visualizer

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Check if web-visualizer directory exists
if [ -d "$SCRIPT_DIR/web-visualizer" ]; then
    echo "Starting RISC-V Web Visualizer..."
    cd "$SCRIPT_DIR/web-visualizer" || exit
    
    # Run the dev script (starts both backend and frontend via concurrently)
    npm run dev
else
    echo "Error: web-visualizer directory not found."
    exit 1
fi
