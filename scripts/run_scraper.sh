#!/bin/bash
cd "$(dirname "$0")/../backend/scraper-service" || exit
echo "Starting Scraper Service..."
source venv/bin/activate
# Run in background and log to file
nohup uvicorn main:app --reload --port 8000 > scraper.log 2>&1 &
echo "Scraper Service running in background. Logs: backend/scraper-service/scraper.log"
