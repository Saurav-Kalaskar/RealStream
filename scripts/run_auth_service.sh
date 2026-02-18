#!/bin/bash
cd "$(dirname "$0")/../backend/auth-service" || exit
echo "Starting Auth Service..."
# Ensure environment variables are set or prompt user
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set."
    echo "Please export them or add to application.yml before running."
    echo "Example: export GOOGLE_CLIENT_ID=..."
fi
mvn spring-boot:run
