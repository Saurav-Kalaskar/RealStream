#!/bin/bash
cd "$(dirname "$0")/../backend/content-service" || exit
echo "Starting Content Service..."
mvn spring-boot:run
