#!/bin/bash
cd "$(dirname "$0")/../backend/interaction-service" || exit
echo "Starting Interaction Service..."
mvn spring-boot:run
