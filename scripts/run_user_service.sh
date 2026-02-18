#!/bin/bash
cd "$(dirname "$0")/../backend/user-service" || exit
echo "Starting User Service..."
mvn spring-boot:run
